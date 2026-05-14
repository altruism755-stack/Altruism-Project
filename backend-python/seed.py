"""Seed the database with realistic demo data.

Schema: post-006_schema_refactor migration.
- volunteers.email dropped  → email lives only in users
- supervisors.email dropped → email lives only in users
- org_volunteers.joined_date/is_active/source dropped → joined_at, status
- events.date + events.time merged → events.starts_at TIMESTAMPTZ
- event_applications.org_id dropped → derivable via events
- event_applications.applied_date → created_at
- platform_admins table dropped → users.role = 'platform_admin'
- organizations: category/color/secondary_color/initials/founded/location dropped
  → org_theme table; categories JSONB; hq_city
- status values all lowercase
- certificate.type lowercase
"""

import json
from dotenv import load_dotenv
load_dotenv()
from database import init_schema, get_db
from auth import hash_password


def _executemany(conn, sql, params_list):
    """psycopg3 connections don't have executemany; use a cursor instead."""
    with conn.cursor() as cur:
        cur.executemany(sql, params_list)


def seed():
    init_schema()

    with get_db() as db:
        print("Seeding database...")

        for table in [
            "notifications", "org_profile_change_requests",
            "event_applications", "announcements",
            "certificates", "activities", "org_volunteers",
            "events", "supervisors", "volunteers",
            "org_admins", "org_theme",
            "organizations", "users",
        ]:
            try:
                db.execute(f"DELETE FROM {table}")
            except Exception:
                pass

        h = hash_password

        # ──────────── USERS ────────────
        users = [
            (100, "platform@altruism.org",            h("Platform#1"),   "platform_admin"),

            (1,   "sherifaziz@resala.org",           h("Admin#1234"),   "org_admin"),
            (2,   "monakamal@resala.org",            h("Admin#1234"),   "org_admin"),
            (3,   "fatimaelsayed@redcrescent.org",   h("Admin#1234"),   "org_admin"),
            (4,   "mohamedfarouk@enactus-egypt.org", h("Admin#1234"),   "org_admin"),

            (10,  "amirakhalil@resala.org",          h("Super#1234"),   "supervisor"),
            (11,  "mahmoudhassan@resala.org",        h("Super#1234"),   "supervisor"),
            (12,  "ahmedelmasry@redcrescent.org",    h("Super#1234"),   "supervisor"),
            (13,  "nourhanali@redcrescent.org",      h("Super#1234"),   "supervisor"),
            (14,  "saranabil@enactus-egypt.org",     h("Super#1234"),   "supervisor"),
            (15,  "youssefgamal@enactus-egypt.org",  h("Super#1234"),   "supervisor"),

            (20,  "yarahassan@gmail.com",            h("Vol#12345"),    "volunteer"),
            (21,  "nadiamahmoud@gmail.com",          h("Vol#12345"),    "volunteer"),
            (22,  "karimmostafa@gmail.com",          h("Vol#12345"),    "volunteer"),
            (23,  "sofiaahmed@gmail.com",            h("Vol#12345"),    "volunteer"),
            (24,  "tarekibrahim@gmail.com",          h("Vol#12345"),    "volunteer"),
            (25,  "hanayoussef@gmail.com",           h("Vol#12345"),    "volunteer"),
            (26,  "youssefbakr@gmail.com",           h("Vol#12345"),    "volunteer"),
            (27,  "dinaelsayed@gmail.com",           h("Vol#12345"),    "volunteer"),
            (28,  "omarfarouk@gmail.com",            h("Vol#12345"),    "volunteer"),
            (29,  "laylasamir@gmail.com",            h("Vol#12345"),    "volunteer"),
            (30,  "hossamadel@gmail.com",            h("Vol#12345"),    "volunteer"),
            (31,  "mennatarek@gmail.com",            h("Vol#12345"),    "volunteer"),
        ]
        _executemany(db,
            "INSERT INTO users (id, email, password, role) VALUES (%s, %s, %s, %s)",
            users,
        )

        # ──────────── ORGANIZATIONS ────────────
        org_cols = (
            "id, name, description, website, phone, admin_user_id, status, org_type, founded_year, "
            "official_email, submitter_name, submitter_role, student_only, "
            "org_size, hq_city, branches, categories"
        )
        ph = ", ".join(["%s"] * 17)
        insert_org = f"INSERT INTO organizations ({org_cols}) VALUES ({ph})"

        db.execute(insert_org, (
            1, "Resala",
            "Egypt's largest volunteer organization dedicated to community support, "
            "youth empowerment, and food drives across all governorates.",
            "https://resala.org", "+20 2 2516 8888", 1,
            "approved", "NGO", "1999",
            "info@resala.org", "Sherif Abdel Aziz", "Executive Director", False,
            "501-1000", "Maadi",
            json.dumps(["Cairo", "Alexandria", "Giza", "Mansoura", "Aswan"]),
            json.dumps(["Social Welfare", "Food Security", "Youth Empowerment", "Community Outreach"]),
        ))
        db.execute(insert_org, (
            2, "Egyptian Red Crescent",
            "Humanitarian aid, disaster relief, and emergency health services across Egypt since 1912.",
            "https://egyptianrc.org", "+20 2 2575 0399", 3,
            "approved", "NGO", "1912",
            "info@egyptianrc.org", "Fatima El-Sayed", "Communications Director", False,
            "1000+", "Nasr City",
            json.dumps(["Cairo", "Alexandria", "Luxor", "Aswan", "Sharm El Sheikh", "Hurghada"]),
            json.dumps(["Humanitarian Aid", "Disaster Relief", "Healthcare", "Blood Donation"]),
        ))
        db.execute(insert_org, (
            3, "Enactus Egypt",
            "Student-run entrepreneurship organization empowering communities through "
            "social projects and sustainable business solutions.",
            "https://enactus-egypt.org", "+20 2 3760 1234", 4,
            "approved", "Student Activity", "2004",
            "contact@enactus-egypt.org", "Mohamed Farouk", "Country Director", True,
            "201-500", "Dokki",
            json.dumps(["Cairo", "Giza", "Alexandria", "Mansoura"]),
            json.dumps(["Student Entrepreneurship", "Education", "Sustainability", "Innovation"]),
        ))

        # ──────────── ORG THEME ────────────
        org_themes = [
            (1, "RS", "#D97706", "#F59E0B"),
            (2, "RC", "#DC2626", "#EF4444"),
            (3, "EN", "#0891B2", "#06B6D4"),
        ]
        _executemany(db,
            "INSERT INTO org_theme (org_id, initials, color, secondary_color) VALUES (%s, %s, %s, %s)",
            org_themes,
        )

        # ──────────── ORG ADMINS ────────────
        org_admins = [
            (1, 1, "creator"),
            (2, 1, "admin"),
            (3, 2, "creator"),
            (4, 3, "creator"),
        ]
        _executemany(db,
            "INSERT INTO org_admins (user_id, org_id, role) VALUES (%s, %s, %s)",
            org_admins,
        )

        # ──────────── SUPERVISORS ────────────
        # No email column — email is in users table
        supervisors = [
            (1, 10, "Dr. Amira Khalil",  "01011223344", "Programs",   1, "active"),
            (2, 11, "Mahmoud Hassan",    "01122334455", "Media",      1, "active"),
            (3, 12, "Ahmed El-Masry",    "01044556677", "Field Teams",2, "active"),
            (4, 13, "Nourhan Ali",       "01245566778", "Medical",    2, "active"),
            (5, 14, "Sara Nabil",        "01055667788", "Projects",   3, "active"),
            (6, 15, "Youssef Gamal",     "01556677889", "Mentorship", 3, "active"),
        ]
        _executemany(db,
            "INSERT INTO supervisors (id, user_id, name, phone, team, org_id, status) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            supervisors,
        )

        # ──────────── VOLUNTEERS ────────────
        # No email column — email is in users table
        SKILLS = {
            "comm":   ["Community Outreach", "Event Planning", "Photography & Videography"],
            "hr":     ["Administrative Support", "Event Planning", "Community Outreach"],
            "media":  ["Photography & Videography", "Social Media Management", "Graphic Design"],
            "tech":   ["Software Development", "Administrative Support"],
            "fin":    ["Administrative Support", "Fundraising"],
            "ops":    ["Administrative Support", "Event Planning", "Environmental Work"],
            "rsrch":  ["Administrative Support", "Community Outreach"],
            "design": ["Graphic Design", "Social Media Management"],
            "edu":    ["Teaching / Tutoring", "Community Outreach"],
            "med":    ["Medical / First Aid", "Community Outreach"],
            "lead":   ["Community Outreach", "Event Planning", "Fundraising"],
            "tr":     ["Translation", "Administrative Support"],
        }
        CAUSES_FULL = [
            "Social & Humanitarian", "Children & Youth", "Education & Skills",
            "Health & Emergency", "Environment",
        ]
        AVAIL = ["Weekday afternoons", "Weekends"]

        volunteers = [
            (1,  20, "Yara Hassan Mohamed",      "01212345678", "Alexandria",
             json.dumps(SKILLS["comm"]),
             "active", "1999-07-15", "Alexandria",
             "29907150201245", "Female", "Egyptian",
             "University Graduate", "Alexandria University", "Faculty of Arts", "", "Mass Communication", "Media",
             10, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}]),
             json.dumps(CAUSES_FULL), json.dumps(AVAIL),
             0, "", json.dumps([]), ""),

            (2,  21, "نادية محمود علي",         "01234567891", "Heliopolis",
             json.dumps(SKILLS["hr"]),
             "active", "1997-03-22", "Cairo",
             "29703220101226", "Female", "Egyptian",
             "University Graduate", "Cairo University", "Faculty of Commerce", "", "Business Administration", "HR",
             8, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}]),
             json.dumps(CAUSES_FULL), json.dumps(["Weekends"]),
             1, "Misr El-Kheir Foundation",
             json.dumps([{"orgName": "Misr El-Kheir Foundation", "department": "HR", "role": "HR Trainer", "duration": "2022-2024", "description": "Designed onboarding curriculum for 60+ volunteers."}]),
             ""),

            (3,  22, "كريم مصطفى إبراهيم",      "01098765432", "Giza",
             json.dumps(SKILLS["media"]),
             "active", "2000-11-05", "Giza",
             "30011051201137", "Male", "Egyptian",
             "University Graduate", "Cairo University", "Faculty of Mass Communication", "", "Public Relations", "Media",
             12, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}]),
             json.dumps(CAUSES_FULL), json.dumps(AVAIL),
             0, "", json.dumps([]), ""),

            (4,  23, "Sofia Ahmed Hassan",       "01112223344", "Giza",
             json.dumps(SKILLS["tech"]),
             "active", "2002-05-30", "Giza",
             "30205301201248", "Female", "Egyptian",
             "University Student", "Cairo University", "Faculty of Computers and AI", "3rd Year", "Computer Science", "Content Creation",
             6, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}, {"language": "French", "proficiency": "Conversational"}]),
             json.dumps(CAUSES_FULL), json.dumps(["Weekday evenings", "Weekends"]),
             0, "", json.dumps([]), ""),

            (5,  24, "طارق إبراهيم سالم",        "01556677889", "Cairo",
             json.dumps(SKILLS["fin"]),
             "active", "1998-09-12", "Cairo",
             "29809120101159", "Male", "Egyptian",
             "University Graduate", "Ain Shams University", "Faculty of Commerce", "", "Accounting", "Fundraising",
             8, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}]),
             json.dumps(CAUSES_FULL), json.dumps(["Weekends"]),
             0, "", json.dumps([]), ""),

            (6,  25, "Hana Youssef Abdullah",    "01667788991", "Alexandria",
             json.dumps(SKILLS["ops"]),
             "active", "2001-02-18", "Alexandria",
             "30102180201264", "Female", "Egyptian",
             "University Graduate", "Alexandria University", "Faculty of Engineering", "", "Industrial Engineering", "Logistics",
             10, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}]),
             json.dumps(CAUSES_FULL), json.dumps(AVAIL),
             0, "", json.dumps([]), ""),

            (7,  26, "يوسف بكر حسن",            "01122334456", "Mansoura",
             json.dumps(SKILLS["rsrch"]),
             "active", "1996-06-08", "Dakahlia",
             "29606082401171", "Male", "Egyptian",
             "Postgraduate (Diploma / Master / PhD)", "Mansoura University", "Faculty of Arts", "", "Sociology", "General",
             6, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}]),
             json.dumps(CAUSES_FULL), json.dumps(["Weekday mornings"]),
             1, "Egyptian Foundation for Refugee Rights",
             json.dumps([{"orgName": "Egyptian Foundation for Refugee Rights", "department": "Research", "role": "Field Researcher", "duration": "2021-2023", "description": "Led impact studies across 3 governorates."}]),
             ""),

            (8,  27, "دينا السيد محمد",          "01899001122", "Cairo",
             json.dumps(SKILLS["design"]),
             "active", "2001-12-25", "Cairo",
             "30112250101282", "Female", "Egyptian",
             "University Graduate", "Helwan University", "Faculty of Applied Arts", "", "Graphic Design", "Content Creation",
             8, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}]),
             json.dumps(CAUSES_FULL), json.dumps(AVAIL),
             0, "", json.dumps([]), ""),

            (9,  28, "Omar Farouk Ali",          "01500112233", "Mansoura",
             json.dumps(SKILLS["edu"]),
             "active", "1995-04-14", "Dakahlia",
             "29504142401193", "Male", "Egyptian",
             "University Graduate", "Mansoura University", "Faculty of Education", "", "Curriculum & Instruction", "General",
             10, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Conversational"}]),
             json.dumps(CAUSES_FULL), json.dumps(["Weekends"]),
             1, "Educate Me Foundation",
             json.dumps([{"orgName": "Educate Me Foundation", "department": "Education", "role": "Volunteer Tutor", "duration": "2020-2024", "description": "Tutored under-served children in Arabic, math, and English."}]),
             ""),

            (10, 29, "ليلى سمير حسن",            "01011223345", "Maadi",
             json.dumps(SKILLS["med"]),
             "active", "2003-08-09", "Cairo",
             "30308090101204", "Female", "Egyptian",
             "University Student", "Ain Shams University", "Faculty of Nursing", "3rd Year", "Critical Care Nursing", "Emergencies",
             8, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}]),
             json.dumps(CAUSES_FULL), json.dumps(["Weekday afternoons", "Weekends"]),
             0, "", json.dumps([]),
             "Mild dust allergy."),

            (11, 30, "Hossam Adel Mohamed",      "01123344557", "Cairo",
             json.dumps(SKILLS["lead"]),
             "active", "2000-01-20", "Cairo",
             "30001200101115", "Male", "Egyptian",
             "University Student", "The American University in Cairo", "School of Business", "4th Year", "Entrepreneurship", "Partnerships",
             6, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Native"}]),
             json.dumps(CAUSES_FULL), json.dumps(["Weekends"]),
             0, "", json.dumps([]), ""),

            (12, 31, "منة طارق أحمد",            "01234455668", "Giza",
             json.dumps(SKILLS["tr"]),
             "pending", "2002-10-03", "Giza",
             "30210031201226", "Female", "Egyptian",
             "University Student", "Cairo University", "Faculty of Al-Alsun", "3rd Year", "Translation Studies", "Content Creation",
             5, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}, {"language": "French", "proficiency": "Conversational"}]),
             json.dumps(CAUSES_FULL), json.dumps(["Weekday evenings", "Weekends"]),
             0, "", json.dumps([]), ""),
        ]
        _executemany(db,
            "INSERT INTO volunteers ("
            "id, user_id, name, phone, city, skills, status, date_of_birth, governorate, "
            "national_id, gender, nationality, education_level, university_name, faculty, study_year, "
            "field_of_study, department, hours_per_week, languages, cause_areas, availability, "
            "prior_experience, prior_org, experiences, health_notes"
            ") VALUES (" + ", ".join(["%s"] * 26) + ")",
            volunteers,
        )

        # ──────────── ORG-VOLUNTEER MEMBERSHIPS ────────────
        # Columns: org_id, volunteer_id, supervisor_id, department, status, joined_at, join_source, channel_detail
        org_vols = [
            # Resala (sup 1, 2)
            (1, 1,  1, "Programs",  "active",  "2025-09-01", "self_registration", "website"),
            (1, 2,  1, "HR",        "active",  "2025-10-15", "self_registration", "referral"),
            (1, 3,  2, "Media",     "active",  "2025-11-01", "self_registration", "campaign"),
            (1, 4,  2, "IT",        "active",  "2026-01-20", "manual_import",     "website"),
            (1, 5,  1, "Finance",   "active",  "2025-08-10", "self_registration", "referral"),
            (1, 8,  2, "Media",     "active",  "2026-02-05", "self_registration", "website"),
            (1, 11, 1, "Programs",  "pending", "2026-04-01", "self_registration", "campaign"),
            # Red Crescent (sup 3, 4)
            (2, 1,  3, "Outreach",  "active",  "2025-09-20", "self_registration", "referral"),
            (2, 6,  3, "Logistics", "active",  "2025-12-01", "manual_import",     "website"),
            (2, 7,  3, "Field",     "active",  "2026-01-05", "self_registration", "campaign"),
            (2, 10, 4, "Medical",   "active",  "2026-03-01", "self_registration", "website"),
            (2, 9,  4, "Outreach",  "active",  "2026-02-10", "self_registration", "referral"),
            (2, 12, 4, "Translation","pending","2026-04-05", "self_registration", "website"),
            # Enactus (sup 5, 6)
            (3, 4,  6, "Tech",        "active",  "2026-01-15", "self_registration", "campaign"),
            (3, 10, 5, "Health",      "active",  "2026-03-10", "self_registration", "website"),
            (3, 11, 5, "Mentorship",  "active",  "2026-02-12", "self_registration", "referral"),
            (3, 12, 6, "Translation", "active",  "2026-03-08", "self_registration", "campaign"),
        ]
        _executemany(db,
            "INSERT INTO org_volunteers "
            "(org_id, volunteer_id, supervisor_id, department, status, joined_at, join_source, channel_detail) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            org_vols,
        )

        # ──────────── EVENTS ────────────
        # starts_at replaces separate date + time columns; status lowercase
        events = [
            (1, 1, "Ramadan Food Drive 2026",
             "Annual food package distribution to 500+ families in Greater Cairo.",
             "Resala HQ, Maadi, Cairo", "2026-03-15 08:00:00+02", 8, 50,
             "Community Outreach, Event Planning", "completed", 1),
            (2, 1, "Youth Leadership Forum",
             "Day-long forum for emerging youth leaders covering civic responsibility and social innovation.",
             "Bibliotheca Alexandrina, Alexandria", "2026-05-20 09:00:00+02", 6, 30,
             "Community Outreach, Event Planning", "upcoming", 1),
            (3, 1, "Volunteer Onboarding Workshop — April",
             "Orientation for new volunteers: policies, tools, and best practices.",
             "Resala Training Center, Cairo", "2026-04-08 10:00:00+02", 5, 15,
             "Administrative Support, Teaching / Tutoring", "completed", 1),

            (4, 2, "National Blood Donation Drive — Spring",
             "Biannual blood donation campaign across 12 governorates.",
             "Multiple Sites — Cairo, Giza, Alexandria", "2026-05-05 08:00:00+02", 7, 60,
             "Medical / First Aid, Community Outreach", "upcoming", 3),
            (5, 2, "Winter Aid Distribution — Alexandria",
             "Distribution of 1,000+ winter kits to displaced families in Alexandria.",
             "Borg El-Arab, Alexandria", "2025-12-20 07:00:00+02", 8, 35,
             "Community Outreach, Event Planning", "completed", 3),

            (6, 3, "Entrepreneurship Bootcamp — Spring",
             "Three-day bootcamp for student entrepreneurs covering business modeling and pitching.",
             "AUC New Cairo Campus", "2026-05-15 09:00:00+02", 8, 25,
             "Teaching / Tutoring, Event Planning", "upcoming", 5),
            (7, 3, "Digital Skills for Women — Shubra",
             "Free digital literacy and e-commerce training for women entrepreneurs in Shubra.",
             "Shubra Community Hall, Cairo", "2026-04-05 10:00:00+02", 5, 20,
             "Teaching / Tutoring, Software Development", "completed", 5),
        ]
        _executemany(db,
            "INSERT INTO events (id, org_id, name, description, location, starts_at, duration, "
            "max_volunteers, required_skills, status, created_by_supervisor_id) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            events,
        )

        # ──────────── EVENT APPLICATIONS ────────────
        # org_id dropped; applied_date → created_at; status lowercase
        apps = [
            # Event 1 — Ramadan Food Drive
            (1,  1, 1, "approved", "2026-02-20 10:00:00"),
            (2,  2, 1, "approved", "2026-02-21 11:30:00"),
            (3,  5, 1, "approved", "2026-02-22 09:15:00"),
            (4, 11, 1, "rejected", "2026-02-25 14:00:00"),
            (5,  8, 1, "approved", "2026-02-23 16:45:00"),
            # Event 2 — Youth Leadership Forum
            (6,  1, 2, "pending",  "2026-04-13 10:00:00"),
            (7,  2, 2, "approved", "2026-04-10 12:00:00"),
            (8, 11, 2, "pending",  "2026-04-14 09:00:00"),
            (9,  4, 2, "approved", "2026-04-11 17:30:00"),
            # Event 3 — Onboarding Workshop
            (10, 1, 3, "approved", "2026-03-30 10:00:00"),
            (11, 4, 3, "approved", "2026-03-31 11:00:00"),
            (12, 5, 3, "approved", "2026-04-01 09:30:00"),
            # Event 4 — Blood Donation Drive
            (13,  1, 4, "pending",  "2026-04-13 10:05:00"),
            (14, 10, 4, "approved", "2026-04-08 14:00:00"),
            (15,  6, 4, "approved", "2026-04-09 09:00:00"),
            (16,  9, 4, "pending",  "2026-04-15 11:00:00"),
            (17, 12, 4, "rejected", "2026-04-16 12:30:00"),
            # Event 5 — Winter Aid
            (18,  6, 5, "approved", "2025-12-01 09:00:00"),
            (19,  7, 5, "approved", "2025-12-02 10:00:00"),
            (20, 10, 5, "approved", "2025-12-03 11:00:00"),
            (21,  1, 5, "approved", "2025-12-05 14:00:00"),
            # Event 6 — Entrepreneurship Bootcamp
            (22, 10, 6, "approved", "2026-04-10 09:00:00"),
            (23, 11, 6, "pending",  "2026-04-13 12:00:00"),
            (24, 12, 6, "approved", "2026-04-11 10:30:00"),
            (25,  4, 6, "pending",  "2026-04-14 16:00:00"),
            # Event 7 — Digital Skills for Women
            (26,  4, 7, "approved", "2026-03-25 10:00:00"),
            (27, 10, 7, "approved", "2026-03-26 11:00:00"),
            (28, 12, 7, "approved", "2026-03-28 09:30:00"),
        ]
        _executemany(db,
            "INSERT INTO event_applications (id, volunteer_id, event_id, status, created_at) "
            "VALUES (%s, %s, %s, %s, %s)",
            apps,
        )

        # ──────────── ACTIVITIES ────────────
        # status lowercase
        activities = [
            (1,  1, 1, 1, "2026-03-15", 8, "Coordinated 6 volunteers for package sorting in Ain Shams; delivered to 80 families.", "approved"),
            (2,  1, 3, 1, "2026-04-08", 5, "Facilitated two onboarding sessions for 14 new volunteers.", "approved"),
            (3,  1, 5, 2, "2025-12-20", 8, "Managed donor registration at Borg El-Arab; assisted 200+ donors.", "approved"),
            (4,  1, 2, 1, "2026-04-25", 3, "Pre-event planning session for the Youth Leadership Forum.", "pending"),

            (5,  2, 1, 1, "2026-03-15", 8, "Volunteer scheduling across 5 distribution zones for 48 volunteers.", "approved"),
            (6,  2, 3, 1, "2026-04-08", 5, "Delivered 'Volunteer Rights & Responsibilities' module.", "approved"),
            (7, 10, 6, 3, "2026-04-20", 4, "Mentor-prep session for the upcoming Entrepreneurship Bootcamp.", "pending"),

            (8, 12, 6, 3, "2026-04-22", 4, "Filmed promo video for Entrepreneurship Bootcamp recruitment.", "approved"),
            (9, 12, 7, 3, "2026-04-05", 5, "Assisted Digital Skills workshop coordination and documentation.", "approved"),

            (10, 4, 3, 1, "2026-04-08", 5, "Set up volunteer management system on tablets for digital check-in.", "approved"),
            (11, 4, 7, 3, "2026-04-05", 5, "Taught e-commerce basics to 18 women entrepreneurs.", "approved"),
            (12, 4, 6, 3, "2026-04-28", 3, "Tech-prep for bootcamp: setup of demo accounts and projector tests.", "pending"),

            (13, 5, 1, 1, "2026-03-15", 8, "Petty cash and expense tracking for the food drive; reconciled receipts.", "approved"),
            (14, 5, 3, 1, "2026-04-08", 5, "Budgeting basics workshop for new volunteers.", "approved"),

            (15, 6, 5, 2, "2025-12-20", 8, "Truck loading and route planning; supervised 8 field volunteers.", "approved"),
            (16, 6, 4, 2, "2026-04-15", 4, "Pre-event logistics planning for blood donation sites.", "pending"),

            (17, 7, 5, 2, "2025-12-20", 8, "Post-distribution surveys with 50 recipient families.", "approved"),
            (18, 7, 4, 2, "2026-04-20", 3, "Survey design for upcoming blood drive impact measurement.", "pending"),

            (19, 8, 1, 1, "2026-03-14", 4, "Designed banners and social posts for the food drive launch.", "approved"),
            (20, 8, 2, 1, "2026-04-30", 3, "Visual identity drafts for Youth Leadership Forum.", "pending"),

            (21, 10, 7, 3, "2026-04-05", 5, "Taught computer literacy to 20 women: email, Docs, WhatsApp Business.", "approved"),
            (22,  9, 4, 2, "2026-04-22", 3, "Outreach session at local university to recruit blood donors.", "approved"),
            (23, 11, 6, 3, "2026-05-02", 4, "Curriculum prep for entrepreneurship workshop modules.", "pending"),

            (24, 10, 5, 2, "2025-12-20", 8, "First aid support during long field day; monitored volunteer health.", "approved"),
            (25, 10, 4, 2, "2026-04-25", 3, "Training session for new medical-support volunteers.", "approved"),
            (26, 10, 4, 2, "2026-05-01", 2, "Inventory check on first-aid kits for blood drive sites.", "pending"),

            (27, 11, 6, 3, "2026-04-15", 4, "Pitch coaching for student teams preparing bootcamp submissions.", "approved"),
            (28, 11, 2, 1, "2026-04-28", 3, "Volunteer outreach on campus for Youth Leadership Forum.", "pending"),
        ]
        _executemany(db,
            "INSERT INTO activities (id, volunteer_id, event_id, org_id, date, hours, description, status) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT DO NOTHING",
            activities,
        )

        # ──────────── CERTIFICATES ────────────
        # type lowercase
        certificates = [
            (1,  1, 1, 1, "achievement",   8, "2026-03-20"),
            (2,  1, 1, 3, "completion",    5, "2026-04-15"),
            (3,  1, 2, 5, "completion",    8, "2025-12-28"),
            (4,  2, 1, 1, "achievement",   8, "2026-03-20"),
            (5,  2, 1, 3, "completion",    5, "2026-04-15"),
            (6,  4, 3, 7, "completion",    5, "2026-04-12"),
            (7,  5, 1, 1, "participation", 8, "2026-03-20"),
            (8,  6, 2, 5, "achievement",   8, "2025-12-28"),
            (9,  7, 2, 5, "completion",    8, "2025-12-28"),
            (10,10, 3, 7, "completion",    5, "2026-04-12"),
            (11,10, 2, 5, "completion",    8, "2025-12-28"),
        ]
        _executemany(db,
            "INSERT INTO certificates (id, volunteer_id, org_id, event_id, type, hours, issued_date) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            certificates,
        )

        # ──────────── ANNOUNCEMENTS ────────────
        announcements = [
            (1, 1, "Ramadan 2026 Food Drive — Thank You",
             "Thanks to 48 volunteers, we delivered food packages to 500+ families across Greater Cairo.",
             "2026-03-18 09:00:00"),
            (2, 1, "Youth Leadership Forum — Registration Open",
             "Spots are filling fast for our May 20th forum at Bibliotheca Alexandrina.",
             "2026-04-12 11:00:00"),
            (3, 2, "Spring Blood Donation Drive — Volunteers Needed",
             "Our May 5th drive covers 12 governorates. Training and certification provided.",
             "2026-04-11 08:30:00"),
            (4, 2, "Winter Aid Campaign — Final Impact Report",
             "Our Alexandria distribution reached 1,247 families across 8 districts.",
             "2026-01-15 09:00:00"),
            (5, 3, "Spring Entrepreneurship Bootcamp — Apply Now",
             "Three days of business modeling, pitching, and impact measurement at AUC New Cairo, May 15-17.",
             "2026-04-09 10:00:00"),
            (6, 3, "Digital Skills for Women — Wrap Report",
             "18 women completed our Shubra workshop on e-commerce and online marketing.",
             "2026-04-08 16:00:00"),
        ]
        _executemany(db,
            "INSERT INTO announcements (id, org_id, title, content, created_at) "
            "VALUES (%s, %s, %s, %s, %s)",
            announcements,
        )

        # ──────────── NOTIFICATIONS ────────────
        notifs = [
            (1, "application", "New Event Application",
             "Yara Hassan applied to 'Youth Leadership Forum'.", False, "/admin/applications", "2026-04-13 10:01:00"),
            (2, "application", "New Event Application",
             "Hossam Adel applied to 'Youth Leadership Forum'.", False, "/admin/applications", "2026-04-14 09:01:00"),
            (1, "membership",  "Pending Volunteer",
             "Hossam Adel is pending approval as a Resala volunteer.", False, "/admin/volunteers", "2026-04-01 12:00:00"),
            (3, "application", "New Event Application",
             "Yara Hassan applied to 'Blood Donation Drive'.", False, "/admin/applications", "2026-04-13 10:06:00"),
            (3, "membership",  "Pending Volunteer",
             "Menna Tarek is pending approval as a Red Crescent volunteer.", True, "/admin/volunteers", "2026-04-05 13:00:00"),
        ]
        _executemany(db,
            "INSERT INTO notifications (user_id, type, title, message, is_read, action_url, created_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            notifs,
        )

    print("Database seeded successfully!")
    print()
    print("Demo credentials:")
    print("  platform@altruism.org / Platform#1                 (platform admin)")
    print("  sherifaziz@resala.org / Admin#1234                 (Resala admin)")
    print("  amirakhalil@resala.org / Super#1234                (Resala supervisor)")
    print("  yarahassan@gmail.com / Vol#12345                   (volunteer demo)")


if __name__ == "__main__":
    seed()
