# -*- coding: utf-8 -*-
"""
Seed: Egyptian Red Crescent - Large realistic dataset for Power BI.

Actual DB schema (migrations 001+004 applied, NOT 003/006/007):
  volunteers:        id, user_id, name, email, phone, city, skills(TEXT), about_me, status,
                     created_at, date_of_birth, governorate, profile_picture, national_id,
                     gender, health_notes, availability(TEXT), hours_per_week, languages(TEXT),
                     education_level, prior_experience, prior_org, cause_areas(TEXT), nationality,
                     university_name, faculty, study_year, field_of_study, department, experiences(TEXT)
  events:            id, org_id, name, description, location, date, time, duration, max_volunteers,
                     current_volunteers, required_skills, status, acceptance_mode, created_at,
                     created_by_supervisor_id, registration_open
  event_applications:id, volunteer_id, event_id, org_id, status, applied_date, cancelled_at, attendance_status
  org_volunteers:    id, org_id, volunteer_id, department, status, joined_date, source, join_source,
                     is_active, joined_at, channel_detail, governorate_snapshot, city_snapshot,
                     added_by_admin_id, notes, approved_at
  supervisors:       id, user_id, name, email, phone, team, org_id, status, created_at

Run:
    cd backend-python
    set PYTHONIOENCODING=utf-8
    .venv\\Scripts\\python.exe seed_hilal_ahmar.py
"""

import json
import random
from datetime import date, datetime, timedelta, timezone

from dotenv import load_dotenv
load_dotenv()

from database import get_db
from auth import hash_password


def _many(conn, sql, rows):
    """psycopg3 Connection has no executemany; use a cursor."""
    with conn.cursor() as cur:
        cur.executemany(sql, rows)

# ─── Reproducible randomness ─────────────────────────────────────────────────
random.seed(42)

# ─── Target org ───────────────────────────────────────────────────────────────
ORG_ID = 2   # Egyptian Red Crescent

# ─── ID bases (keep well above existing seed data) ───────────────────────────
USER_ID_BASE = 2000
VOL_ID_BASE  = 2000
SUP_ID_BASE  = 200
EVT_ID_BASE  = 200
APP_ID_BASE  = 2000
ACT_ID_BASE  = 2000
RAT_ID_BASE  = 200
NOT_ID_BASE  = 3000

N_VOLUNTEERS   = 400
N_SUPERVISORS  = 15
N_EVENTS       = 100
N_APPLICATIONS = 800
N_RATINGS      = 50

HASHED_VOL_PW = hash_password("Vol#12345")
HASHED_SUP_PW = hash_password("Super#1234")

DATE_START = date(2024, 1, 1)
TODAY      = date(2026, 5, 15)

# ─── Reference data ──────────────────────────────────────────────────────────

MALE_FIRST = [
    "Mohamed","Ahmed","Ali","Omar","Youssef","Khaled","Karim","Tarek","Mostafa","Hisham",
    "Ibrahim","Hossam","Maged","Sami","Adel","Fady","Bilal","Ramy","Walid","Nader",
    "Ziad","Sayed","Hamza","Yassine","Atef","Mansour","Marwan","Galal","Faris","Sherif",
    "Essam","Hazem","Louay","Tamer","Amr","Ayman","Anas","Gamal","Nabil","Selim",
]
FEMALE_FIRST = [
    "Nourhan","Sara","Mona","Dina","Rana","Hana","Layla","Aya","Iman","Mariam",
    "Nadia","Yasmine","Hoda","Amal","Fatima","Shimaa","Lamia","Rehab","Safaa","Abeer",
    "Noha","Reem","Samar","Neveen","Shorouk","Nariman","Doaa","Lara","Mayar","Salma",
    "Esraa","Ghada","Hanan","Wafaa","Azza","Arwa","Tasnim","Rawan","Heba","Walaa",
]
LAST_NAMES = [
    "Hassan","Mahmoud","Ibrahim","El-Sayed","Abdallah","Ali","Mostafa","Hussein","Gamal","Bakr",
    "Omar","Abdelaziz","El-Shafei","Ramadan","Darwish","Farouk","Mansour","El-Naggar","El-Qadi","Saleh",
    "Hamdy","Ismail","Abu El-Nil","Shaheen","Zeidan","Badawi","Awad","Khalil","Salem","Radwan",
    "El-Gendi","Eweis","Saad","Nasr","Kamel","Hanafi","Shalaby","El-Ateeq","Lotfy","Zaher",
    "Ramzy","Abdel-Hafez","Tolba","Hegazy","Moneim","Ragab","Ghoneim","El-Banna","Sarhan","Gouda",
]

GOVERNORATES = [
    "Cairo","Giza","Alexandria","Dakahlia","Sharqia","Qalyubia","Gharbia",
    "Monufia","Kafr El-Sheikh","Ismailia","Port Said","Suez","Damietta","Beheira",
    "Minya","Assiut","Sohag","Qena","Luxor","Aswan","Faiyum","Beni Suef",
    "Matruh","North Sinai","South Sinai","Red Sea","New Valley",
]
GOV_CITIES = {
    "Cairo":       ["Nasr City","Maadi","Mohandessin","Helwan","Ain Shams","Shubra","El-Zeitoun","Heliopolis","Zamalek","Dokki"],
    "Giza":        ["Dokki","Haram","Imbaba","6th October","Sheikh Zayed","Faisal","Mohandessin"],
    "Alexandria":  ["Montaza","Agami","Sidi Bishr","Bolkly","El-Maamoura","Raml","Bab Sharq"],
    "Dakahlia":    ["Mansoura","Talha","Mit Ghamr","Dekernes"],
    "Sharqia":     ["Zagazig","Belbeis","10th of Ramadan"],
    "Qalyubia":    ["Benha","Shubra El-Khima","Qalyub","Toukh"],
    "Gharbia":     ["Tanta","El-Mahalla El-Kubra","Kafr El-Zayat","Samannoud"],
    "Monufia":     ["Shebeen El-Kom","Menoufia","Ashmoun"],
    "Kafr El-Sheikh":["Kafr El-Sheikh","Desouk","Fouh"],
    "Ismailia":    ["Ismailia","El-Qantara"],
    "Port Said":   ["Port Said","Al-Arab"],
    "Suez":        ["Suez","El-Arbain"],
    "Damietta":    ["Damietta","Ras El-Bar"],
    "Beheira":     ["Damanhour","Kafr El-Dawar","Itay El-Barud"],
    "Minya":       ["Minya","Mallawi","Abu Qirqas"],
    "Assiut":      ["Assiut","Deyrout","Manfalut"],
    "Sohag":       ["Sohag","Akhmim","Girga"],
    "Qena":        ["Qena","Nag Hammadi","Qous"],
    "Luxor":       ["Luxor","Armant","Esna"],
    "Aswan":       ["Aswan","Kom Ombo","Edfu"],
    "Faiyum":      ["Faiyum","Ibshaway"],
    "Beni Suef":   ["Beni Suef","El-Fashn","Beba"],
    "Matruh":      ["Marsa Matruh","Siwa"],
    "North Sinai": ["Arish","Sheikh Zuweid"],
    "South Sinai": ["Sharm El-Sheikh","Dahab","Taba"],
    "Red Sea":     ["Hurghada","Safaga","Marsa Alam"],
    "New Valley":  ["Kharga","Dakhla"],
}

EDUCATION_LEVELS = ["High School","University Student","University Graduate","Postgraduate"]
EDU_WEIGHTS      = [10, 30, 45, 15]

UNIVERSITIES = [
    "Cairo University","Ain Shams University","Alexandria University","Mansoura University",
    "Al-Azhar University","Helwan University","Benha University","Zagazig University",
    "Tanta University","American University in Cairo","October 6 University",
    "Future University in Egypt","MSA University","Misr University for Science and Technology",
    "Assiut University","South Valley University","Port Said University","Sohag University",
    "Suez Canal University","Arab Academy for Science",
]

FACULTIES = [
    "Faculty of Medicine","Faculty of Engineering","Faculty of Science","Faculty of Arts",
    "Faculty of Commerce","Faculty of Pharmacy","Faculty of Education","Faculty of Mass Communication",
    "Faculty of Computers and AI","Faculty of Law","Faculty of Nursing","Faculty of Social Work",
    "Faculty of Applied Arts","Faculty of Management","Faculty of Languages","Faculty of Dentistry",
]

FIELDS_OF_STUDY = [
    "Medicine","Chemical Engineering","Computer Science","Business Administration","Journalism",
    "Psychology","Accounting","Philosophy","Nursing","Law","Physics","Biology",
    "Fine Arts","Digital Media","Sociology","Economics","Statistics","Pharmacy",
    "Architecture","Civil Engineering","Electrical Engineering","Social Work",
]

SKILLS_POOL = [
    "First Aid & Emergency Care","Healthcare Awareness","Social Care","Field Coordination",
    "Disaster Management","Aid Distribution","Medical Volunteering","Administration & Organization",
    "Documentation & Reporting","Photography & Media","Social Media Management",
    "Graphic Design","Event Management","Training & Capacity Building","Teaching & Tutoring",
    "Logistics & Supply","Blood Donation Coordination","Psychological Support","Translation",
    "Environmental Work","Support for People with Disabilities","Volunteer Recruitment",
    "Fundraising","Community Outreach","IT & Software",
]

CAUSE_AREAS = [
    "Humanitarian Relief","Healthcare","Disasters & Emergencies",
    "Children & Youth","Education & Skills","Environment & Sustainability",
    "People with Disabilities","Community Services","Social Development",
]

LANGUAGES = ["Arabic","English","French","German","Italian"]
LANG_WEIGHTS = [100, 85, 20, 8, 5]

AVAIL_OPTIONS = [
    "Weekday mornings","Weekday afternoons","Weekday evenings",
    "Weekends","Special events only",
]

TEAMS = [
    "Field Teams","Medical Support","Media & Documentation",
    "Logistics","Training & Capacity Building","Volunteer Management",
    "Community Outreach","Disaster & Emergency Response","Blood Donation",
    "Family Services","Educational Programs","Administration & Planning",
    "Public Relations","Support for People with Disabilities","Rapid Response",
]

EVENT_CATEGORIES = [
    "Blood Donation Campaign","Humanitarian Aid Distribution","First Aid Training",
    "Health Camp","Community Volunteering Event","Health Awareness Campaign",
    "Volunteer Training Program","Field Relief Mission","Volunteer Appreciation Ceremony",
    "Environmental Initiative","Support for People with Disabilities","Emergency Disaster Relief",
    "Family Support Program","Disaster Management Training","Health Workshop",
    "Volunteering Festival","Ramadan Charity Campaign","Youth Camp",
    "Health Literacy Program","Community Service Initiative",
]

LOCATIONS = [
    "Egyptian Red Crescent HQ - Cairo","Nile Hotel Conference Hall - Cairo",
    "Egyptian Red Crescent Hospital - Cairo","Youth Center - Giza",
    "City Hall - Alexandria","Social Services Center - Mansoura",
    "Government School - Assiut","Elderly Care Center - Tanta",
    "Station Square - Suez","Giza Zoological Gardens",
    "Ain Shams University Hospital - Cairo","Celebrations Hall - Shubra",
    "Vocational Training Center - Port Said","Al-Ahly Stadium - Cairo",
    "Social Activity Center - Luxor","Cairo International Fair - Cairo",
    "Mansoura University Hospital","Orphanage - Alexandria",
    "Hurghada Emergency Center","Hope School - Aswan",
    "Al-Rahma Village - Faiyum","Child Care Home - Cairo",
    "Red Crescent Branch - Zagazig","Beni Suef General Hospital",
    "Family Support Center - Minya",
]

REQUIRED_SKILLS_MAP = {
    "Blood Donation Campaign":              "Blood Donation Coordination, Healthcare Awareness, Field Coordination",
    "Humanitarian Aid Distribution":        "Logistics & Supply, Documentation & Reporting, Field Coordination",
    "First Aid Training":                   "First Aid & Emergency Care, Training & Capacity Building",
    "Health Camp":                          "First Aid & Emergency Care, Medical Volunteering, Healthcare Awareness",
    "Community Volunteering Event":         "Community Outreach, Event Management, Administration & Organization",
    "Health Awareness Campaign":            "Healthcare Awareness, Community Outreach, Social Media Management",
    "Volunteer Training Program":           "Training & Capacity Building, Administration & Organization",
    "Field Relief Mission":                 "Field Coordination, Disaster Management, Logistics & Supply",
    "Volunteer Appreciation Ceremony":      "Event Management, Photography & Media, Administration & Organization",
    "Environmental Initiative":             "Environmental Work, Community Outreach",
    "Support for People with Disabilities": "Support for People with Disabilities, Psychological Support, Social Care",
    "Emergency Disaster Relief":            "Disaster Management, First Aid & Emergency Care, Logistics & Supply",
    "Family Support Program":               "Psychological Support, Social Care, Community Outreach",
    "Disaster Management Training":         "Disaster Management, Training & Capacity Building",
    "Health Workshop":                      "Healthcare Awareness, Training & Capacity Building",
    "Volunteering Festival":                "Event Management, Photography & Media, Volunteer Recruitment",
    "Ramadan Charity Campaign":             "Fundraising, Community Outreach, Logistics & Supply",
    "Youth Camp":                           "Training & Capacity Building, Event Management, Teaching & Tutoring",
    "Health Literacy Program":              "Teaching & Tutoring, Healthcare Awareness",
    "Community Service Initiative":         "Community Outreach, Administration & Organization, Social Care",
}

POSITIVE_FEEDBACK = [
    "Excellent organization and a truly meaningful experience. Highly recommend to all volunteers.",
    "The team was professional and dedicated. I felt I was making a real difference.",
    "Well-structured event with outstanding supervision from the team leaders.",
    "I gained valuable new skills and left with memories I'll treasure.",
    "The volunteering atmosphere was motivating and uplifting. I'll definitely join again.",
    "Outstanding impact on beneficiaries. Thank you for the opportunity to serve.",
    "Everything was clear from the start; logistics support was excellent.",
    "A fulfilling day serving those in need. Proud to be part of this team.",
]
NEUTRAL_FEEDBACK = [
    "Good event overall, but communication with volunteers before the day could improve.",
    "Acceptable organization, though there was some delay at the start.",
    "Nice initiative, but I wish more pre-event training had been provided.",
    "Great concept and noble goal; execution needs some refinement.",
    "The allotted time for certain tasks was not quite enough.",
    "Reasonable event, but coordination between teams could be stronger.",
]
NEGATIVE_FEEDBACK = [
    "Organization was weak and information was inconsistent. Hoping for improvement next time.",
    "The delays affected the quality of service delivered to beneficiaries.",
    "There were not enough resources for volunteers; I felt disappointed.",
    "The supervisor was not sufficiently available. I felt unsupported.",
    "The event did not meet expectations; the team needs to reassess its goals.",
]
MIXED_FEEDBACK = [
    "Great event overall, but some organizational aspects need review.",
    "The experience was useful, though I wish better transportation had been arranged.",
    "Noble goal and acceptable execution, but follow-up mechanisms need improvement.",
    "I enjoyed working with the team but expected more pre-event training.",
    "Organization was good in some areas and weak in others; what matters is we served those in need.",
]

# ─── Helpers ─────────────────────────────────────────────────────────────────

def rand_date(start: date, end: date) -> date:
    return start + timedelta(days=random.randint(0, (end - start).days))

def rand_ts(start: date, end: date) -> str:
    d = rand_date(start, end)
    h = random.randint(7, 22)
    m = random.choice([0, 15, 30, 45])
    return f"{d.isoformat()} {h:02d}:{m:02d}:00+02"

def weighted_choice(choices, weights):
    return random.choices(choices, weights=weights, k=1)[0]

def gen_name(gender: str) -> tuple:
    first = random.choice(MALE_FIRST if gender == "Male" else FEMALE_FIRST)
    last  = random.choice(LAST_NAMES)
    return first, last

def gen_email(first: str, last: str, uid: int) -> str:
    f = first.lower().replace(" ", "").replace("-", "")[:8]
    l = last.lower().replace(" ", "").replace("-", "")[:8]
    return f"{f}.{l}{uid}@gmail.com"

def gen_phone() -> str:
    prefix = random.choice(["010","011","012","015"])
    return prefix + "".join([str(random.randint(0,9)) for _ in range(8)])

def gen_national_id(gender: str, dob: date, gov_code: int) -> str:
    century    = "2" if dob.year < 2000 else "3"
    yy         = str(dob.year)[-2:]
    mm         = f"{dob.month:02d}"
    dd         = f"{dob.day:02d}"
    gc         = f"{gov_code:02d}"
    seq        = f"{random.randint(1,999):03d}"
    gd         = str(random.choice([1,3,5,7,9]) if gender == "Male" else random.choice([2,4,6,8]))
    check      = str(random.randint(0,9))
    return f"{century}{yy}{mm}{dd}{gc}{seq}{gd}{check}"

# ─── Main seed ────────────────────────────────────────────────────────────────

def seed():
    with get_db() as db:
        print("Starting seed for Egyptian Red Crescent ...")

        row = db.execute("SELECT id FROM organizations WHERE id = %s", (ORG_ID,)).fetchone()
        if row is None:
            print(f"ERROR: org id={ORG_ID} not found. Run main seed first.")
            return
        print(f"  Org id={ORG_ID} confirmed.")

        # ── Clean previous generated data ──────────────────────────────────────
        print("  Cleaning previous generated data ...")
        db.execute("DELETE FROM event_ratings      WHERE id >= %s", (RAT_ID_BASE,))
        db.execute("DELETE FROM notifications       WHERE id >= %s", (NOT_ID_BASE,))
        db.execute("DELETE FROM activities          WHERE id >= %s", (ACT_ID_BASE,))
        db.execute("DELETE FROM event_applications  WHERE id >= %s", (APP_ID_BASE,))
        db.execute("DELETE FROM events              WHERE id >= %s AND org_id = %s", (EVT_ID_BASE, ORG_ID))
        db.execute("DELETE FROM org_volunteers      WHERE org_id = %s AND volunteer_id >= %s", (ORG_ID, VOL_ID_BASE))
        db.execute("DELETE FROM volunteers          WHERE id >= %s", (VOL_ID_BASE,))
        db.execute("DELETE FROM supervisors         WHERE id >= %s AND org_id = %s", (SUP_ID_BASE, ORG_ID))
        db.execute("DELETE FROM users               WHERE id >= %s", (USER_ID_BASE,))
        print("  Cleaned.")

        # ══════════════════════════════════════════════════════════════════════
        # 1. SUPERVISORS (15)
        # ══════════════════════════════════════════════════════════════════════
        print(f"  Inserting {N_SUPERVISORS} supervisors ...")
        sup_ids     = []
        u_rows_sup  = []
        s_rows      = []

        for i in range(N_SUPERVISORS):
            uid    = USER_ID_BASE + i
            sid    = SUP_ID_BASE  + i
            gender = random.choice(["Male","Female"])
            first, last = gen_name(gender)
            name   = f"{first} {last}"
            email  = gen_email(first, last, uid)
            phone  = gen_phone()
            team   = TEAMS[i % len(TEAMS)]
            status = "Active" if i < 13 else "Pending"
            created = rand_ts(date(2023, 1, 1), date(2025, 6, 1))

            sup_ids.append(sid)
            u_rows_sup.append((uid, email, HASHED_SUP_PW, "supervisor", created))
            s_rows.append((sid, uid, name, email, phone, team, ORG_ID, status, created))

        _many(db, 
            "INSERT INTO users (id, email, password, role, created_at) VALUES (%s,%s,%s,%s,%s)",
            u_rows_sup,
        )
        _many(db, 
            "INSERT INTO supervisors (id, user_id, name, email, phone, team, org_id, status, created_at) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            s_rows,
        )
        print(f"    Supervisors: {N_SUPERVISORS}")

        # ══════════════════════════════════════════════════════════════════════
        # 2. VOLUNTEERS (400)
        # ══════════════════════════════════════════════════════════════════════
        print(f"  Inserting {N_VOLUNTEERS} volunteers ...")
        vol_ids     = []
        u_rows_vol  = []
        v_rows      = []
        ov_rows     = []

        status_pool = (
            ["Active"] * 310 +
            ["Pending"] * 60 +
            ["Suspended"] * 30
        )
        random.shuffle(status_pool)

        gov_list = list(GOV_CITIES.keys())

        for i in range(N_VOLUNTEERS):
            uid    = USER_ID_BASE + N_SUPERVISORS + i
            vid    = VOL_ID_BASE  + i
            gender = weighted_choice(["Male","Female"], [52, 48])
            first, last = gen_name(gender)
            name   = f"{first} {last}"
            email  = gen_email(first, last, uid)
            phone  = gen_phone()

            gov    = random.choice(gov_list)
            city   = random.choice(GOV_CITIES.get(gov, [gov]))
            edu    = weighted_choice(EDUCATION_LEVELS, EDU_WEIGHTS)
            uni    = random.choice(UNIVERSITIES) if edu != "High School" else None
            fac    = random.choice(FACULTIES)    if uni else None
            study_year = (
                random.choice(["1st Year","2nd Year","3rd Year","4th Year"])
                if edu == "University Student" else ""
            )
            field  = random.choice(FIELDS_OF_STUDY) if uni else ""
            dept   = random.choice([
                "Field Teams","Medical Support","Logistics","Training","Media",
                "Administration","Community Outreach","Blood Donation","Family Services",
                "Emergency Response","Public Relations","Volunteer Management",
            ])

            age    = random.randint(18, 55)
            dob    = date(TODAY.year - age, random.randint(1,12), random.randint(1,28))
            gov_code = (gov_list.index(gov) + 1) if gov in gov_list else 1
            nid    = gen_national_id(gender, dob, gov_code)

            hours_pw  = random.choice([2,4,5,6,8,10,12,15,20])
            prior_exp = random.randint(0, 8)
            prior_org = random.choice([
                "Another NGO","International Red Cross","UNICEF","Independent Volunteer",
                "Local Association","Youth Initiative","UN Agency","Resala","Misr El-Kheir",
                "","","",
            ])

            n_skills = random.randint(2, 5)
            skills   = random.sample(SKILLS_POOL, n_skills)
            skills_json = json.dumps(skills)

            langs = ["Arabic"]
            for lang, wt in zip(LANGUAGES[1:], LANG_WEIGHTS[1:]):
                if random.randint(1,100) <= wt:
                    langs.append(lang)
            langs_json = json.dumps([{"language": l, "proficiency": "Native" if l == "Arabic" else "Good"} for l in langs])

            causes = random.sample(CAUSE_AREAS, random.randint(2, 4))
            causes_json = json.dumps(causes)

            avails = random.sample(AVAIL_OPTIONS, random.randint(1, 3))
            avail_json  = json.dumps(avails)

            health = random.choice([
                "","","","","",
                "Dust allergy","Wears prescription glasses","Mild asthma",
                "Low blood pressure","No health restrictions",
            ])
            about  = f"Volunteer with {prior_exp} years of experience in humanitarian work."

            vol_status = status_pool[i]
            created_ts = rand_ts(date(2023, 6, 1), date(2026, 4, 30))

            # org_volunteers row
            ov_status = "Active" if vol_status == "Active" else ("Pending" if vol_status == "Pending" else "Inactive")
            joined_date = rand_date(date(2023, 6, 1), date(2026, 4, 30))
            approved_at = (
                rand_ts(joined_date, min(joined_date + timedelta(days=14), TODAY))
                if ov_status == "Active" else None
            )
            join_src = weighted_choice(
                ["self_registration","manual_import","referral","social_media","event"],
                [50, 20, 15, 10, 5],
            )

            vol_ids.append(vid)
            u_rows_vol.append((uid, email, HASHED_VOL_PW, "volunteer", created_ts))
            v_rows.append((
                vid, uid, name, email, phone, city,
                skills_json, about, vol_status, created_ts,
                dob.isoformat(), gov, nid, gender, health,
                avail_json, hours_pw, langs_json, edu,
                prior_exp, prior_org, causes_json, "Egyptian",
                uni or "", fac or "", study_year, field, dept,
                json.dumps([]),  # experiences
            ))
            ov_rows.append((
                ORG_ID, vid, dept, ov_status,
                joined_date.isoformat(),
                join_src, join_src,          # source, join_source
                1 if ov_status == "Active" else 0,
                created_ts,                  # joined_at
                None,                        # channel_detail
                gov,                         # governorate_snapshot
                city,                        # city_snapshot
                None,                        # added_by_admin_id
                None,                        # notes
                approved_at,
            ))

        _many(db, 
            "INSERT INTO users (id, email, password, role, created_at) VALUES (%s,%s,%s,%s,%s)",
            u_rows_vol,
        )
        _many(db, 
            "INSERT INTO volunteers (id, user_id, name, email, phone, city, skills, about_me, "
            "status, created_at, date_of_birth, governorate, national_id, gender, health_notes, "
            "availability, hours_per_week, languages, education_level, prior_experience, prior_org, "
            "cause_areas, nationality, university_name, faculty, study_year, field_of_study, "
            "department, experiences) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            v_rows,
        )
        _many(db, 
            "INSERT INTO org_volunteers "
            "(org_id, volunteer_id, department, status, joined_date, source, join_source, "
            " is_active, joined_at, channel_detail, governorate_snapshot, city_snapshot, "
            " added_by_admin_id, notes, approved_at) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            ov_rows,
        )
        print(f"    Volunteers: {N_VOLUNTEERS}")

        # ══════════════════════════════════════════════════════════════════════
        # 3. EVENTS (100)
        # ══════════════════════════════════════════════════════════════════════
        print(f"  Inserting {N_EVENTS} events ...")
        evt_rows    = []
        evt_records = []

        for i in range(N_EVENTS):
            eid      = EVT_ID_BASE + i
            cat      = random.choice(EVENT_CATEGORIES)
            # spread events from Jan 2024 to Aug 2026 for trend analysis
            span_days = (date(2026, 8, 1) - DATE_START).days
            evt_date  = DATE_START + timedelta(days=random.randint(0, span_days))
            hour      = random.choice([7, 8, 9, 10, 14, 16])
            time_str  = f"{hour:02d}:00"

            if evt_date < TODAY - timedelta(days=3):
                status = "Completed"
            elif evt_date <= TODAY:
                status = "Active"
            else:
                status = "Upcoming"

            duration   = random.choice([2, 3, 4, 5, 6, 7, 8, 10, 12])
            max_vol    = random.choice([10, 15, 20, 25, 30, 40, 50, 60, 75, 100])
            location   = random.choice(LOCATIONS)
            req_skills = REQUIRED_SKILLS_MAP.get(cat, "Community Outreach, Administration & Organization")
            sup_id     = random.choice(sup_ids)
            accept_mode = weighted_choice(["manual","auto"], [70, 30])
            reg_open   = status != "Completed" or random.random() < 0.3

            created_offset = random.randint(7, 60)
            created_date   = evt_date - timedelta(days=created_offset)
            if created_date < date(2023, 1, 1):
                created_date = date(2023, 1, 1)
            created_ts = f"{created_date.isoformat()} 10:00:00+02"

            name = f"{cat} — {evt_date.strftime('%B %Y')}" if i % 4 != 0 else f"{cat} #{i+1}"
            desc = (
                f"A volunteering event organized by the Egyptian Red Crescent under its ongoing "
                f"humanitarian programs. Focus: {cat}. Held at {location}, targeting community service. "
                f"Open to all registered volunteers."
            )

            evt_rows.append((
                eid, ORG_ID, name, desc, location,
                evt_date.isoformat(), time_str,
                duration, max_vol, 0,  # current_volunteers starts at 0
                req_skills, status, accept_mode,
                created_ts, sup_id, reg_open,
            ))
            evt_records.append({
                "id": eid, "cat": cat, "date": evt_date,
                "max_vol": max_vol, "status": status, "duration": duration,
                "sup_id": sup_id,
            })

        _many(db, 
            "INSERT INTO events (id, org_id, name, description, location, date, time, duration, "
            "max_volunteers, current_volunteers, required_skills, status, acceptance_mode, "
            "created_at, created_by_supervisor_id, registration_open) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            evt_rows,
        )
        print(f"    Events: {N_EVENTS}")

        # ══════════════════════════════════════════════════════════════════════
        # 4. EVENT APPLICATIONS (800)
        # ══════════════════════════════════════════════════════════════════════
        print(f"  Inserting {N_APPLICATIONS} event applications ...")
        app_rows    = []
        app_id      = APP_ID_BASE
        used_pairs  : set = set()
        approved_count: dict = {e["id"]: 0 for e in evt_records}

        completed_eids = {e["id"] for e in evt_records if e["status"] == "Completed"}
        evt_map        = {e["id"]: e for e in evt_records}

        # Active volunteers for realistic pool
        active_vids = [VOL_ID_BASE + i for i in range(N_VOLUNTEERS) if v_rows[i][8] == "Active"]
        all_vids    = vol_ids[:]

        # Per-event application targets
        popularity = {}
        for e in evt_records:
            if e["status"] == "Completed":
                target = min(e["max_vol"], random.randint(4, 22))
            else:
                target = random.randint(1, min(e["max_vol"], 15))
            popularity[e["id"]] = target

        # Scale to hit ~800
        total = sum(popularity.values())
        scale = N_APPLICATIONS / total
        for eid in popularity:
            popularity[eid] = max(1, round(popularity[eid] * scale))

        for evt in evt_records:
            eid        = evt["id"]
            evt_status = evt["status"]
            evt_date   = evt["date"]
            max_vol    = evt["max_vol"]

            for _ in range(popularity[eid]):
                if len(app_rows) >= N_APPLICATIONS:
                    break

                pool = active_vids if random.random() < 0.8 else all_vids
                vid  = None
                for _r in range(30):
                    candidate = random.choice(pool)
                    if (candidate, eid) not in used_pairs:
                        vid = candidate
                        break
                if vid is None:
                    continue
                used_pairs.add((vid, eid))

                # Application status
                if evt_status == "Completed":
                    if approved_count[eid] < max_vol:
                        st = weighted_choice(["Approved","Rejected","Waitlisted"], [75,20,5])
                    else:
                        st = weighted_choice(["Rejected","Waitlisted"], [60,40])
                elif evt_status == "Active":
                    st = weighted_choice(["Approved","Pending","Rejected"], [60,30,10])
                else:
                    st = weighted_choice(["Pending","Approved","Rejected","Waitlisted"], [50,30,15,5])

                if st == "Approved":
                    approved_count[eid] += 1

                # Attendance (only approved on completed)
                attendance = None
                if st == "Approved" and evt_status == "Completed":
                    attendance = weighted_choice(["Attended","Absent"], [85,15])

                offset_days = random.randint(3, 45)
                apply_date  = evt_date - timedelta(days=offset_days)
                if apply_date < DATE_START:
                    apply_date = DATE_START
                apply_ts = f"{apply_date.isoformat()} {random.randint(8,22):02d}:{random.choice([0,15,30,45]):02d}:00+02"

                cancelled_at = None
                if random.random() < 0.03:
                    c_date = apply_date + timedelta(days=random.randint(1,5))
                    cancelled_at = f"{c_date.isoformat()} 12:00:00+02"

                app_rows.append((
                    app_id, vid, eid, ORG_ID, st, apply_ts, cancelled_at, attendance,
                ))
                app_id += 1

        _many(db, 
            "INSERT INTO event_applications "
            "(id, volunteer_id, event_id, org_id, status, applied_date, cancelled_at, attendance_status) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            app_rows,
        )
        print(f"    Applications: {len(app_rows)}")

        # ══════════════════════════════════════════════════════════════════════
        # 5. ACTIVITIES (one per approved application on completed events)
        # ══════════════════════════════════════════════════════════════════════
        print("  Inserting activities ...")
        act_rows = []
        act_id   = ACT_ID_BASE

        ACTIVITY_DESCS = [
            "Active participation in the event, providing support to beneficiaries.",
            "Led a group of volunteers and coordinated field operations.",
            "Media documentation and coverage of the event.",
            "Provided first aid and necessary medical support during the event.",
            "Supervised aid distribution and verified receipt by beneficiaries.",
            "Conducted a training session for new volunteers.",
            "Managed registration and data entry throughout the event.",
            "Provided translation services for non-Arabic-speaking beneficiaries.",
            "Handled logistical preparation before and after the event.",
            "Led the awareness campaign and addressed the public.",
            "Supported people with disabilities throughout the event.",
            "Recorded donations and managed financial records.",
            "Facilitated a workshop and delivered specialized training content.",
            "Monitored attendance and submitted reports to the supervisor.",
            "Assisted with beneficiary transport and coordination with external parties.",
        ]

        approved_completed_apps = [
            r for r in app_rows
            if r[4] == "Approved" and r[1] in {
                VOL_ID_BASE + i for i in range(N_VOLUNTEERS)
            } and r[2] in completed_eids
        ]

        for app in approved_completed_apps:
            _aid, vid, eid, org_id, st, apply_ts, *_ = app
            evt      = evt_map[eid]
            act_date = evt["date"]
            hours    = round(evt["duration"] * random.choice([0.5, 0.75, 1.0]), 1)
            desc     = random.choice(ACTIVITY_DESCS)
            reviewer = random.choice(sup_ids)
            a_status = weighted_choice(
                ["Approved","Completed","Rejected","Pending"],
                [65, 20, 10, 5],
            )

            reviewed_at = None
            if a_status in ("Approved","Rejected","Completed"):
                rv = act_date + timedelta(days=random.randint(1, 10))
                reviewed_at = f"{rv.isoformat()} 10:00:00+02"

            act_rows.append((
                act_id, vid, eid, ORG_ID,
                act_date.isoformat(), hours, desc,
                a_status, reviewer, reviewed_at,
            ))
            act_id += 1

        _many(db, 
            "INSERT INTO activities "
            "(id, volunteer_id, event_id, org_id, date, hours, description, "
            " status, reviewed_by, reviewed_at) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
            act_rows,
        )
        print(f"    Activities: {len(act_rows)}")

        # ══════════════════════════════════════════════════════════════════════
        # 6. EVENT RATINGS (50)
        # ══════════════════════════════════════════════════════════════════════
        print(f"  Inserting {N_RATINGS} event ratings ...")
        rat_rows    = []
        rat_id      = RAT_ID_BASE
        rated_pairs : set = set()

        attended_apps = [
            r for r in app_rows
            if r[4] == "Approved" and r[7] == "Attended" and r[2] in completed_eids
        ]
        random.shuffle(attended_apps)

        rating_dist = [5]*20 + [4]*15 + [3]*8 + [2]*4 + [1]*3

        for app in attended_apps:
            if rat_id - RAT_ID_BASE >= N_RATINGS:
                break
            _aid, vid, eid, *_ = app
            if (eid, vid) in rated_pairs:
                continue
            rated_pairs.add((eid, vid))

            idx    = rat_id - RAT_ID_BASE
            rating = rating_dist[idx] if idx < len(rating_dist) else random.randint(1, 5)
            if rating >= 4:
                feedback = random.choice(POSITIVE_FEEDBACK)
            elif rating == 3:
                feedback = random.choice(MIXED_FEEDBACK + NEUTRAL_FEEDBACK)
            else:
                feedback = random.choice(NEGATIVE_FEEDBACK)

            evt_date = evt_map[eid]["date"]
            rated_date = evt_date + timedelta(days=random.randint(1, 7))
            if rated_date > TODAY:
                rated_date = TODAY
            rated_ts = f"{rated_date.isoformat()} {random.randint(9,21):02d}:00:00+02"

            rat_rows.append((rat_id, eid, vid, rating, feedback, rated_ts))
            rat_id += 1

        # Fill remaining from non-attended approved
        if len(rat_rows) < N_RATINGS:
            extra = [
                r for r in app_rows
                if r[4] == "Approved" and r[7] != "Attended" and r[2] in completed_eids
            ]
            random.shuffle(extra)
            for app in extra:
                if rat_id - RAT_ID_BASE >= N_RATINGS:
                    break
                _aid, vid, eid, *_ = app
                if (eid, vid) in rated_pairs:
                    continue
                rated_pairs.add((eid, vid))
                rating   = random.randint(1, 5)
                feedback = (
                    random.choice(POSITIVE_FEEDBACK) if rating >= 4 else
                    random.choice(MIXED_FEEDBACK)    if rating == 3 else
                    random.choice(NEGATIVE_FEEDBACK)
                )
                evt_date   = evt_map[eid]["date"]
                rated_date = evt_date + timedelta(days=random.randint(1, 7))
                if rated_date > TODAY:
                    rated_date = TODAY
                rated_ts   = f"{rated_date.isoformat()} {random.randint(9,21):02d}:00:00+02"
                rat_rows.append((rat_id, eid, vid, rating, feedback, rated_ts))
                rat_id += 1

        _many(db, 
            "INSERT INTO event_ratings (id, event_id, volunteer_id, rating, feedback, created_at) "
            "VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
            rat_rows,
        )
        print(f"    Ratings: {len(rat_rows)}")

        # ══════════════════════════════════════════════════════════════════════
        # 7. NOTIFICATIONS
        # ══════════════════════════════════════════════════════════════════════
        print("  Inserting notifications ...")
        not_rows = []
        not_id   = NOT_ID_BASE

        # vid -> user_id mapping
        vid_uid = {
            VOL_ID_BASE + i: USER_ID_BASE + N_SUPERVISORS + i
            for i in range(N_VOLUNTEERS)
        }

        for app in app_rows:
            _aid, vid, eid, org_id, st, apply_ts, *_ = app
            uid = vid_uid.get(vid)
            if not uid:
                continue

            if st == "Approved":
                title   = "Application Accepted!"
                message = "Congratulations! Your application to participate in the event has been accepted."
                ntype   = "application_approved"
            elif st == "Rejected":
                title   = "Application Status Update"
                message = "We regret that your application was not accepted this time. We encourage you to apply for other events."
                ntype   = "application_rejected"
            elif st == "Waitlisted":
                title   = "You have been Waitlisted"
                message = "You have been placed on the waitlist. You will be notified if a spot becomes available."
                ntype   = "application_waitlisted"
            else:
                continue  # Pending = no notification yet

            not_rows.append((
                not_id, uid, ntype, title, message,
                random.choice([True, False]),
                f"/events/{eid}",
                apply_ts,
            ))
            not_id += 1

        _many(db, 
            "INSERT INTO notifications (id, user_id, type, title, message, is_read, action_url, created_at) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            not_rows,
        )
        print(f"    Notifications: {len(not_rows)}")

        # ══════════════════════════════════════════════════════════════════════
        # 8. ANNOUNCEMENTS
        # ══════════════════════════════════════════════════════════════════════
        print("  Inserting announcements ...")
        ann_rows = [
            (ORG_ID,"Launch of Winter Volunteering Season 2024",
             "We are pleased to announce the start of the Winter Volunteering Season 2024. Register now and join thousands of volunteers.",
             "2024-11-01 09:00:00+02"),
            (ORG_ID,"National Blood Donation Campaign - December 2024",
             "The Egyptian Red Crescent organizes its National Blood Donation Campaign throughout December 2024, with multiple sites available.",
             "2024-12-01 08:00:00+02"),
            (ORG_ID,"Thank You to Our Volunteers in 2024",
             "Thanks to your efforts, we served over 50,000 beneficiaries in 2024. Thank you to every volunteer who showed commitment.",
             "2025-01-05 10:00:00+02"),
            (ORG_ID,"First Aid Training Program - January 2025",
             "The comprehensive first aid training program begins on January 15, 2025, across various governorates.",
             "2025-01-10 09:00:00+02"),
            (ORG_ID,"Ramadan 2025 Events - Register Now",
             "We are preparing an intensive schedule of events during Ramadan. We need 500 volunteers nationwide.",
             "2025-02-15 10:00:00+02"),
            (ORG_ID,"Summer Youth Volunteering Camp - Registration Closed",
             "Registration for the Summer Youth Camp is now closed. Thank you for the overwhelming response. Accepted list coming soon.",
             "2025-06-20 11:00:00+02"),
            (ORG_ID,"Annual Impact Report 2025",
             "We are pleased to share the Annual Impact Report of the Egyptian Red Crescent for 2025. Numbers reflecting your achievements.",
             "2026-01-10 09:00:00+02"),
            (ORG_ID,"Invitation to Join the Family Support Program 2026",
             "We are launching a new Family Support Program for 2026 with 200 volunteers across the country.",
             "2026-02-01 10:00:00+02"),
        ]
        _many(db, 
            "INSERT INTO announcements (org_id, title, content, created_at) VALUES (%s,%s,%s,%s)",
            ann_rows,
        )
        print(f"    Announcements: {len(ann_rows)}")

        # ══════════════════════════════════════════════════════════════════════
        # 9. Summary
        # ══════════════════════════════════════════════════════════════════════
        c_sup  = db.execute("SELECT COUNT(*) FROM supervisors WHERE org_id=%s AND id>=%s", (ORG_ID, SUP_ID_BASE)).fetchone()
        c_vol  = db.execute("SELECT COUNT(*) FROM volunteers WHERE id>=%s", (VOL_ID_BASE,)).fetchone()
        c_evt  = db.execute("SELECT COUNT(*) FROM events WHERE org_id=%s AND id>=%s", (ORG_ID, EVT_ID_BASE)).fetchone()
        c_app  = db.execute("SELECT COUNT(*) FROM event_applications WHERE id>=%s", (APP_ID_BASE,)).fetchone()
        c_act  = db.execute("SELECT COUNT(*) FROM activities WHERE id>=%s", (ACT_ID_BASE,)).fetchone()
        c_rat  = db.execute("SELECT COUNT(*) FROM event_ratings WHERE id>=%s", (RAT_ID_BASE,)).fetchone()
        c_not  = db.execute("SELECT COUNT(*) FROM notifications WHERE id>=%s", (NOT_ID_BASE,)).fetchone()

        def _n(row):
            v = list(row.values())[0] if hasattr(row, "values") else row[0]
            return v

        print("\n-- Seed complete ----------------------------------")
        print(f"  supervisors     {_n(c_sup):>5}")
        print(f"  volunteers      {_n(c_vol):>5}")
        print(f"  events          {_n(c_evt):>5}")
        print(f"  applications    {_n(c_app):>5}")
        print(f"  activities      {_n(c_act):>5}")
        print(f"  ratings         {_n(c_rat):>5}")
        print(f"  notifications   {_n(c_not):>5}")
        print("--------------------------------------------------")


if __name__ == "__main__":
    seed()

