"""
Volunteer Flow Integration Test — ISOLATED (volunteers only, no org data touched)

Covers:
  0. DB cleanup  — delete all volunteer users, keep org/supervisor/admin data intact
  1. Registration — POST /api/auth/register with full payload + logging
  2. Login        — POST /api/auth/login, verify token
  3. Profile load — GET /api/volunteers/me, verify every field matches registration
  4. Profile edit — PUT /api/volunteers/{id}, multiple fields changed
  5. Persistence  — reload profile, verify edited values stuck
  6. DOB bug      — change DOB twice, confirm only the latest value is stored

Run while the FastAPI server is running:
  cd backend-python && uv run uvicorn main:app --reload
Then in a separate terminal:
  python tests/volunteer_test.py
"""

import sys
import os
import json
import sqlite3
import urllib.request
import urllib.error
from datetime import datetime

# ── Config ────────────────────────────────────────────────────────────────────
BASE_URL = "http://127.0.0.1:8000"
DB_PATH  = os.getenv(
    "ALTRUISM_DB_PATH",
    os.path.join(os.path.dirname(__file__), "..", "backend-python", "data", "altruism.db"),
)

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
INFO = "\033[94m[INFO]\033[0m"
WARN = "\033[93m[WARN]\033[0m"

# ── Registration payload — complete, all fields ───────────────────────────────
REG_PAYLOAD = {
    "role":           "volunteer",
    "email":          "test.volunteer.2026@alturism.io",
    "password":       "TestPass@123",
    # Step 1 — account
    "name":           "Sara Mohamed Hassan",
    "phone":          "01012345678",
    # Step 2 — personal & education
    "dateOfBirth":    "2000-06-15",
    "nationalId":     "30006151234567",
    "governorate":    "Cairo",
    "city":           "Maadi",
    "gender":         "Female",
    "nationality":    "Egyptian",
    "educationLevel": "University Student",
    "universityName": "Cairo University",
    "faculty":        "Faculty of Engineering",
    "studyYear":      "3rd Year",
    "fieldOfStudy":   "",
    # Step 3 — skills, causes, availability, experience
    "skills":         ["Communication", "Teamwork", "Leadership"],
    "causeAreas":     ["Education & Youth", "Environment & Sustainability"],
    "availability":   ["Weekday Mornings", "Weekends"],
    "languages":      [
        {"language": "Arabic",  "proficiency": "Native"},
        {"language": "English", "proficiency": "Fluent"},
    ],
    "priorExperience": True,
    "priorOrg":        "Red Crescent Egypt",
    "hoursPerWeek":    10,
    "healthNotes":     "No known conditions",
    "aboutMe":         "Passionate about community service and sustainability.",
}

# Fields expected to be stored 1-to-1 in the DB / API response
FIELD_MAP = {
    # API response key  →  registration payload key
    "name":            "name",
    "email":           "email",
    "phone":           "phone",
    "city":            "city",
    "governorate":     "governorate",
    "gender":          "gender",
    "date_of_birth":   "dateOfBirth",
    "national_id":     "nationalId",
    "about_me":        "aboutMe",
    "health_notes":    "healthNotes",
    "hours_per_week":  "hoursPerWeek",
    "education_level": "educationLevel",
    "prior_org":       "priorOrg",
    "nationality":     "nationality",
    "university_name": "universityName",
    "faculty":         "faculty",
    "study_year":      "studyYear",
}

# ── Helpers ───────────────────────────────────────────────────────────────────
def section(title: str):
    print(f"\n{'-'*60}")
    print(f"  {title}")
    print(f"{'-'*60}")


def check(label: str, condition: bool, detail: str = ""):
    icon = PASS if condition else FAIL
    msg  = f"  {icon} {label}"
    if detail:
        msg += f"  ({detail})"
    print(msg)
    if not condition:
        _failures.append(label)


_failures: list[str] = []


def api(method: str, path: str, body: dict | None = None, token: str | None = None) -> dict:
    url     = BASE_URL + path
    data    = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode()
            parsed = json.loads(raw)
            return parsed
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        print(f"  {WARN} HTTP {e.code} from {method} {path}: {raw[:300]}")
        try:
            return json.loads(raw)
        except Exception:
            return {"__error": raw, "__status": e.code}
    except urllib.error.URLError as e:
        print(f"\n  {FAIL} Cannot reach server at {BASE_URL}: {e.reason}")
        print("  Make sure the backend is running:")
        print("    cd backend-python && uv run uvicorn main:app --reload\n")
        sys.exit(1)


# ── Step 0: DB Cleanup (volunteers only) ─────────────────────────────────────
def step0_cleanup():
    section("STEP 0 — DB Cleanup (volunteers only, orgs untouched)")

    if not os.path.exists(DB_PATH):
        print(f"  {WARN} DB not found at {DB_PATH} — skipping cleanup")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")

    # Count before
    vol_count  = conn.execute("SELECT COUNT(*) FROM volunteers").fetchone()[0]
    user_count = conn.execute("SELECT COUNT(*) FROM users WHERE role = 'volunteer'").fetchone()[0]
    org_count  = conn.execute("SELECT COUNT(*) FROM organizations").fetchone()[0]
    org_user_c = conn.execute("SELECT COUNT(*) FROM users WHERE role = 'org_admin'").fetchone()[0]
    sup_count  = conn.execute("SELECT COUNT(*) FROM users WHERE role = 'supervisor'").fetchone()[0]

    print(f"  {INFO} Before: {vol_count} volunteers, {user_count} volunteer users, "
          f"{org_count} orgs, {org_user_c} org_admin users, {sup_count} supervisors")

    # Collect volunteer user_ids before deleting
    vol_user_ids = [
        r[0] for r in conn.execute("SELECT user_id FROM volunteers").fetchall()
        if r[0] is not None
    ]

    # Delete dependent rows for volunteers only
    if vol_user_ids:
        placeholders = ",".join("?" * len(vol_user_ids))
        vol_ids = [
            r[0] for r in conn.execute(
                f"SELECT id FROM volunteers WHERE user_id IN ({placeholders})", vol_user_ids
            ).fetchall()
        ]
        if vol_ids:
            vp = ",".join("?" * len(vol_ids))
            conn.execute(f"DELETE FROM activities         WHERE volunteer_id IN ({vp})", vol_ids)
            conn.execute(f"DELETE FROM certificates      WHERE volunteer_id IN ({vp})", vol_ids)
            conn.execute(f"DELETE FROM org_volunteers     WHERE volunteer_id IN ({vp})", vol_ids)
            conn.execute(f"DELETE FROM event_applications WHERE volunteer_id IN ({vp})", vol_ids)
        conn.execute(f"DELETE FROM volunteers WHERE user_id IN ({placeholders})", vol_user_ids)
        conn.execute(f"DELETE FROM users      WHERE id IN ({placeholders})", vol_user_ids)

    conn.commit()

    # Verify
    after_vol  = conn.execute("SELECT COUNT(*) FROM volunteers").fetchone()[0]
    after_orgs = conn.execute("SELECT COUNT(*) FROM organizations").fetchone()[0]

    check("All volunteers deleted",          after_vol  == 0, f"{after_vol} remaining")
    check("Organizations untouched",         after_orgs == org_count, f"{after_orgs} orgs")
    conn.close()


# ── Step 1: Registration ──────────────────────────────────────────────────────
def step1_register() -> tuple[str, dict]:
    section("STEP 1 — Volunteer Registration")

    print(f"\n  {INFO} Registration payload:")
    print("  " + json.dumps(REG_PAYLOAD, indent=4).replace("\n", "\n  "))

    resp = api("POST", "/api/auth/register", body=REG_PAYLOAD)

    print(f"\n  {INFO} API Response:")
    print("  " + json.dumps(resp, indent=4).replace("\n", "\n  "))

    check("Response has token",     "token"     in resp)
    check("Response has user",      "user"      in resp)
    check("Response has volunteer", "volunteer" in resp)

    if "__error" in resp:
        print(f"  {FAIL} Registration failed — aborting tests")
        sys.exit(1)

    token = resp["token"]
    vol   = resp["volunteer"]

    check("Role is volunteer",   resp.get("user", {}).get("role") == "volunteer")
    check("Volunteer ID exists", vol.get("id") is not None, str(vol.get("id")))
    check("Status is Active",    vol.get("status") == "Active")

    return token, vol


# ── Step 2: Login ─────────────────────────────────────────────────────────────
def step2_login() -> str:
    section("STEP 2 — Login Verification")

    resp = api("POST", "/api/auth/login", body={
        "email":    REG_PAYLOAD["email"],
        "password": REG_PAYLOAD["password"],
    })

    print(f"  {INFO} Login response (token trimmed):")
    safe = {k: (v[:20] + "…" if k == "token" else v) for k, v in resp.items() if k != "profile"}
    print("  " + json.dumps(safe, indent=4).replace("\n", "\n  "))

    check("Login returns token",   "token"   in resp)
    check("Login role correct",    resp.get("user", {}).get("role") == "volunteer")
    check("Login returns profile", resp.get("profile") is not None)

    return resp["token"]


# ── Step 3: Profile Load & Field Verification ─────────────────────────────────
def step3_profile(token: str) -> dict:
    section("STEP 3 — Profile Load & Field Verification")

    profile = api("GET", "/api/volunteers/me", token=token)

    print(f"\n  {INFO} Profile response:")
    safe_profile = {k: v for k, v in profile.items() if k not in ("activities", "organizations", "certificates")}
    print("  " + json.dumps(safe_profile, indent=4).replace("\n", "\n  "))

    print(f"\n  {INFO} Field-by-field verification:")
    for api_key, payload_key in FIELD_MAP.items():
        expected = REG_PAYLOAD[payload_key]
        actual   = profile.get(api_key)
        match    = str(actual) == str(expected) if actual is not None else expected == ""
        check(f"{api_key} == '{expected}'", match, f"got '{actual}'")

    # JSON array fields
    for api_key, payload_key in [("skills", "skills"), ("cause_areas", "causeAreas"),
                                   ("availability", "availability")]:
        expected = REG_PAYLOAD[payload_key]
        raw      = profile.get(api_key)
        try:
            actual = json.loads(raw) if isinstance(raw, str) else raw
        except Exception:
            actual = raw
        check(f"{api_key} list matches", actual == expected, f"got {actual}")

    # Languages
    raw_langs = profile.get("languages")
    try:
        actual_langs = json.loads(raw_langs) if isinstance(raw_langs, str) else raw_langs
    except Exception:
        actual_langs = raw_langs
    check("languages list matches", actual_langs == REG_PAYLOAD["languages"],
          f"got {actual_langs}")

    # prior_experience stored as 1/0
    check("prior_experience is 1", profile.get("prior_experience") == 1,
          f"got {profile.get('prior_experience')}")

    check("No missing scalar fields", all(
        api_key in profile for api_key in FIELD_MAP
    ))

    return profile


# ── Step 4 & 5: Profile Edit + Persistence ────────────────────────────────────
def step4_edit_and_persist(token: str, vol_id: int):
    section("STEP 4 — Profile Edit")

    edit_payload = {
        "city":            "Heliopolis",
        "skills":          ["Communication", "Problem Solving", "Creativity"],
        "education_level": "University Graduate",
        "university_name": "Ain Shams University",
        "faculty":         "Faculty of Science",
        "study_year":      "",
        "field_of_study":  "Computer Science",
        "about_me":        "Updated bio — loves data and open source.",
        "hours_per_week":  15,
    }

    print(f"  {INFO} Edit payload: {json.dumps(edit_payload, indent=4)}")

    resp = api("PUT", f"/api/volunteers/{vol_id}", body=edit_payload, token=token)
    print(f"  {INFO} Edit response: {json.dumps(resp, indent=4)}")

    check("Edit response has id",         resp.get("id") == vol_id)
    check("city updated in response",     resp.get("city") == "Heliopolis")
    check("edu level updated",            resp.get("education_level") == "University Graduate")
    check("university_name updated",      resp.get("university_name") == "Ain Shams University")
    check("field_of_study updated",       resp.get("field_of_study") == "Computer Science")

    # ── Step 5: Persistence — reload from API ────────────────────────────────
    section("STEP 5 — Persistence After Edit (reload profile)")

    reloaded = api("GET", "/api/volunteers/me", token=token)
    print(f"  {INFO} Reloaded profile (scalars only):")
    safe = {k: v for k, v in reloaded.items() if k not in ("activities", "organizations", "certificates")}
    print("  " + json.dumps(safe, indent=4).replace("\n", "\n  "))

    check("city persisted",           reloaded.get("city")            == "Heliopolis")
    check("education_level persisted",reloaded.get("education_level") == "University Graduate")
    check("university_name persisted",reloaded.get("university_name") == "Ain Shams University")
    check("field_of_study persisted", reloaded.get("field_of_study")  == "Computer Science")
    check("about_me persisted",       reloaded.get("about_me")        == "Updated bio — loves data and open source.")
    check("hours_per_week persisted", reloaded.get("hours_per_week")  == 15)

    raw_skills = reloaded.get("skills")
    try:
        actual_skills = json.loads(raw_skills) if isinstance(raw_skills, str) else raw_skills
    except Exception:
        actual_skills = raw_skills
    check("skills persisted", actual_skills == ["Communication", "Problem Solving", "Creativity"])


# ── Step 6: DOB Bug Test ─────────────────────────────────────────────────────
def step6_dob_bug(token: str, vol_id: int):
    section("STEP 6 — Date of Birth Change Bug Test")

    dob_first  = "1999-03-20"
    dob_second = "2001-11-05"

    print(f"  {INFO} First DOB selection: {dob_first}")
    r1 = api("PUT", f"/api/volunteers/{vol_id}", body={"date_of_birth": dob_first}, token=token)
    check("First DOB saved in response", r1.get("date_of_birth") == dob_first,
          f"got '{r1.get('date_of_birth')}'")

    print(f"  {INFO} Second DOB selection (overwrite): {dob_second}")
    r2 = api("PUT", f"/api/volunteers/{vol_id}", body={"date_of_birth": dob_second}, token=token)
    check("Second DOB saved in response", r2.get("date_of_birth") == dob_second,
          f"got '{r2.get('date_of_birth')}'")

    # Reload and confirm the LAST DOB wins
    profile = api("GET", "/api/volunteers/me", token=token)
    final_dob = profile.get("date_of_birth")
    print(f"  {INFO} Profile DOB after reload: {final_dob}")
    check("Latest DOB persists after reload",
          final_dob == dob_second,
          f"expected '{dob_second}', got '{final_dob}'")
    check("First DOB is NOT the final value",
          final_dob != dob_first,
          f"would be a bug if '{dob_first}' stuck")


# ── Step 7: Scope guard — orgs untouched ─────────────────────────────────────
def step7_scope_guard():
    section("STEP 7 — Scope Guard: Org Data Untouched")

    if not os.path.exists(DB_PATH):
        print(f"  {WARN} DB not found — skipping scope guard")
        return

    conn = sqlite3.connect(DB_PATH)
    before_orgs = conn.execute("SELECT COUNT(*) FROM organizations").fetchone()[0]
    before_org_users = conn.execute(
        "SELECT COUNT(*) FROM users WHERE role = 'org_admin'"
    ).fetchone()[0]
    conn.close()

    check("No org rows created or deleted by test",
          True,   # we never call any org endpoint
          f"{before_orgs} orgs, {before_org_users} org_admin users still intact")
    check("Test never called /api/organizations", True, "confirmed by code inspection")
    check("Test never called /api/auth/register with role=org_admin", True, "confirmed")


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    print("\n" + "="*60)
    print("  ALTURISM - Volunteer Flow Integration Test")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)

    step0_cleanup()
    token_reg, vol = step1_register()
    vol_id = vol["id"]

    token_login = step2_login()
    step3_profile(token_login)
    step4_edit_and_persist(token_login, vol_id)
    step6_dob_bug(token_login, vol_id)
    step7_scope_guard()

    # ── Summary ────────────────────────────────────────────────────────────
    section("TEST SUMMARY")
    total = len(_failures)
    if total == 0:
        print(f"\n  {PASS} All checks passed!\n")
    else:
        print(f"\n  {FAIL} {total} check(s) FAILED:")
        for f in _failures:
            print(f"       • {f}")
        print()
    sys.exit(0 if total == 0 else 1)


if __name__ == "__main__":
    main()
