"""Seed the database with realistic demo data.

Volunteer fields are generated to satisfy the frontend validation rules in
src/app/data/volunteerFormSchema.ts EXACTLY:

  fullName       Arabic or English, ≥ 3 words
  email          namelastname@gmail.com pattern
  nationalId     Egyptian 14-digit format: C YY MM DD GG SSSS X
                 - C: century (2 = 1900s, 3 = 2000s)
                 - YYMMDD matches dateOfBirth
                 - GG matches governorate of birth (01=Cairo, 02=Alexandria,
                   12=Giza, 24=Dakahlia, 13=Qalyubia)
                 - second-to-last digit even=female / odd=male (matches gender)
  phone          11 digits, starts with 010 / 011 / 012 / 015
  dateOfBirth    YYYY-MM-DD, age ≥ 15
  gender         "Male" | "Female"   (exact case from RegisterPage.tsx)
  governorate    one of GOVERNORATES (English casing)
  educationLevel one of EDUCATION_LEVELS
  skills         subset of SKILLS_LIST (≤ 5)
  languages      [{language, proficiency}], proficiency ∈ PROFICIENCY_LEVELS
  causeAreas     0 or exactly 5 from CAUSE_GROUPS
  status         "Active" | "Pending" | "Suspended"
"""

import json
from database import init_schema, get_db
from auth import hash_password


def seed():
    init_schema()

    with get_db() as db:
        print("Seeding database...")

        for table in [
            "notifications", "org_profile_change_requests",
            "event_applications", "announcements",
            "certificates", "activities", "org_volunteers",
            "events", "supervisors", "volunteers",
            "org_admins", "platform_admins",
            "organizations", "users",
        ]:
            try:
                db.execute(f"DELETE FROM {table}")
            except Exception:
                pass

        h = hash_password

        # ──────────── USERS ────────────
        users = [
            (100, "platform@altruism.org",            h("Platform#1"),   "org_admin"),

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
        db.executemany(
            "INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)",
            users,
        )

        db.execute("INSERT INTO platform_admins (user_id) VALUES (?)", (100,))

        # ──────────── ORGANIZATIONS ────────────
        org_cols = (
            "id, name, description, category, color, secondary_color, initials, founded, "
            "admin_user_id, status, org_type, founded_year, location, official_email, "
            "submitter_name, submitter_role"
        )
        ph = ", ".join(["?"] * 16)
        insert_org = f"INSERT INTO organizations ({org_cols}) VALUES ({ph})"

        db.execute(insert_org, (
            1, "Resala",
            "Egypt's largest volunteer organization dedicated to community support, "
            "youth empowerment, and food drives across all governorates.",
            "Social Welfare", "#D97706", "#F59E0B", "RS", "1999-01-01", 1,
            "approved", "NGO", "1999", "Cairo", "info@resala.org",
            "Sherif Abdel Aziz", "Executive Director",
        ))
        db.execute(insert_org, (
            2, "Egyptian Red Crescent",
            "Humanitarian aid, disaster relief, and emergency health services across Egypt since 1912.",
            "Humanitarian Aid", "#DC2626", "#EF4444", "RC", "1912-03-15", 3,
            "approved", "NGO", "1912", "Cairo", "info@egyptianrc.org",
            "Fatima El-Sayed", "Communications Director",
        ))
        db.execute(insert_org, (
            3, "Enactus Egypt",
            "Student-run entrepreneurship organization empowering communities through "
            "social projects and sustainable business solutions.",
            "Student Entrepreneurship", "#0891B2", "#06B6D4", "EN", "2004-09-01", 4,
            "approved", "Student Activity", "2004", "Giza", "contact@enactus-egypt.org",
            "Mohamed Farouk", "Country Director",
        ))

        # ──────────── ORG ADMINS ────────────
        org_admins = [
            (1, 1, "creator"),
            (2, 1, "admin"),
            (3, 2, "creator"),
            (4, 3, "creator"),
        ]
        db.executemany(
            "INSERT INTO org_admins (user_id, org_id, role) VALUES (?, ?, ?)",
            org_admins,
        )

        # ──────────── SUPERVISORS ────────────
        supervisors = [
            (1, 10, "Dr. Amira Khalil",  "amirakhalil@resala.org",        "01011223344", "Programs",   1, "Active"),
            (2, 11, "Mahmoud Hassan",    "mahmoudhassan@resala.org",      "01122334455", "Media",      1, "Active"),
            (3, 12, "Ahmed El-Masry",    "ahmedelmasry@redcrescent.org",  "01044556677", "Field Teams",2, "Active"),
            (4, 13, "Nourhan Ali",       "nourhanali@redcrescent.org",    "01245566778", "Medical",    2, "Active"),
            (5, 14, "Sara Nabil",        "saranabil@enactus-egypt.org",   "01055667788", "Projects",   3, "Active"),
            (6, 15, "Youssef Gamal",     "youssefgamal@enactus-egypt.org","01556677889", "Mentorship", 3, "Active"),
        ]
        db.executemany(
            "INSERT INTO supervisors (id, user_id, name, email, phone, team, org_id, status) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            supervisors,
        )

        # ──────────── VOLUNTEERS ────────────
        # Each row: form-compliant. Names are Arabic or English (≥ 3 words each);
        # NID encodes DOB + governorate of birth + gender (digit 13 even=F / odd=M);
        # phones use 010/011/012/015.
        # (id, user_id, name, email, phone, city, skills, about_me, status, dob, governorate,
        #  national_id, gender, nationality, education_level, university_name, faculty,
        #  study_year, field_of_study, department, hours_per_week, languages,
        #  cause_areas, availability, prior_experience, prior_org, experiences, health_notes)
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
            (1,  20, "Yara Hassan Mohamed",      "yarahassan@gmail.com",     "01212345678", "Alexandria",
             json.dumps(SKILLS["comm"]),
             "Passionate about community service and youth development since university.",
             "Active", "1999-07-15", "Alexandria",
             "29907150201245", "Female", "Egyptian",
             "University Graduate", "Alexandria University", "Faculty of Arts", "", "Mass Communication", "Media",
             10, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}]),
             json.dumps(CAUSES_FULL), json.dumps(AVAIL),
             0, "", json.dumps([]), ""),

            (2,  21, "نادية محمود علي",         "nadiamahmoud@gmail.com",   "01234567891", "Cairo",
             json.dumps(SKILLS["hr"]),
             "HR professional and weekend volunteer trainer focused on capacity building.",
             "Active", "1997-03-22", "Cairo",
             "29703220101226", "Female", "Egyptian",
             "University Graduate", "Cairo University", "Faculty of Commerce", "", "Business Administration", "HR",
             8, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}]),
             json.dumps(CAUSES_FULL), json.dumps(["Weekends"]),
             1, "Misr El-Kheir Foundation",
             json.dumps([{"orgName": "Misr El-Kheir Foundation", "department": "HR", "role": "HR Trainer", "duration": "2022-2024", "description": "Designed onboarding curriculum for 60+ volunteers."}]),
             ""),

            (3,  22, "كريم مصطفى إبراهيم",      "karimmostafa@gmail.com",   "01098765432", "Giza",
             json.dumps(SKILLS["media"]),
             "Creative media professional amplifying volunteer impact through storytelling.",
             "Active", "2000-11-05", "Giza",
             "30011051201137", "Male", "Egyptian",
             "University Graduate", "Cairo University", "Faculty of Mass Communication", "", "Public Relations", "Media",
             12, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}]),
             json.dumps(CAUSES_FULL), json.dumps(AVAIL),
             0, "", json.dumps([]), ""),

            (4,  23, "Sofia Ahmed Hassan",       "sofiaahmed@gmail.com",     "01112223344", "Giza",
             json.dumps(SKILLS["tech"]),
             "Software engineering student passionate about technology for social good.",
             "Active", "2002-05-30", "Giza",
             "30205301201248", "Female", "Egyptian",
             "University Student", "Cairo University", "Faculty of Computers and AI", "3rd Year", "Computer Science", "Content Creation",
             6, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}, {"language": "French", "proficiency": "Conversational"}]),
             json.dumps(CAUSES_FULL), json.dumps(["Weekday evenings", "Weekends"]),
             0, "", json.dumps([]), ""),

            (5,  24, "طارق إبراهيم سالم",        "tarekibrahim@gmail.com",   "01556677889", "Cairo",
             json.dumps(SKILLS["fin"]),
             "Finance graduate helping non-profits manage resources effectively.",
             "Active", "1998-09-12", "Cairo",
             "29809120101159", "Male", "Egyptian",
             "University Graduate", "Ain Shams University", "Faculty of Commerce", "", "Accounting", "Fundraising",
             8, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}]),
             json.dumps(CAUSES_FULL), json.dumps(["Weekends"]),
             0, "", json.dumps([]), ""),

            (6,  25, "Hana Youssef Abdullah",    "hanayoussef@gmail.com",    "01667788991", "Alexandria",
             json.dumps(SKILLS["ops"]),
             "Operations specialist ensuring smooth delivery of humanitarian aid.",
             "Active", "2001-02-18", "Alexandria",
             "30102180201264", "Female", "Egyptian",
             "University Graduate", "Alexandria University", "Faculty of Engineering", "", "Industrial Engineering", "Logistics",
             10, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}]),
             json.dumps(CAUSES_FULL), json.dumps(AVAIL),
             0, "", json.dumps([]), ""),

            (7,  26, "يوسف بكر حسن",            "youssefbakr@gmail.com",    "01122334456", "Mansoura",
             json.dumps(SKILLS["rsrch"]),
             "Social researcher measuring impact of volunteer programs.",
             "Active", "1996-06-08", "Dakahlia",
             "29606082401171", "Male", "Egyptian",
             "Postgraduate (Diploma / Master / PhD)", "Mansoura University", "Faculty of Arts", "", "Sociology", "General",
             6, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}]),
             json.dumps(CAUSES_FULL), json.dumps(["Weekday mornings"]),
             1, "Egyptian Foundation for Refugee Rights",
             json.dumps([{"orgName": "Egyptian Foundation for Refugee Rights", "department": "Research", "role": "Field Researcher", "duration": "2021-2023", "description": "Led impact studies across 3 governorates."}]),
             ""),

            (8,  27, "دينا السيد محمد",          "dinaelsayed@gmail.com",    "01899001122", "Cairo",
             json.dumps(SKILLS["design"]),
             "Visual designer creating compelling content for non-profit campaigns.",
             "Active", "2001-12-25", "Cairo",
             "30112250101282", "Female", "Egyptian",
             "University Graduate", "Helwan University", "Faculty of Applied Arts", "", "Graphic Design", "Content Creation",
             8, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}]),
             json.dumps(CAUSES_FULL), json.dumps(AVAIL),
             0, "", json.dumps([]), ""),

            (9,  28, "Omar Farouk Ali",          "omarfarouk@gmail.com",     "01500112233", "Mansoura",
             json.dumps(SKILLS["edu"]),
             "Education advocate teaching underprivileged children on weekends.",
             "Active", "1995-04-14", "Dakahlia",
             "29504142401193", "Male", "Egyptian",
             "University Graduate", "Mansoura University", "Faculty of Education", "", "Curriculum & Instruction", "General",
             10, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Conversational"}]),
             json.dumps(CAUSES_FULL), json.dumps(["Weekends"]),
             1, "Educate Me Foundation",
             json.dumps([{"orgName": "Educate Me Foundation", "department": "Education", "role": "Volunteer Tutor", "duration": "2020-2024", "description": "Tutored under-served children in Arabic, math, and English."}]),
             ""),

            (10, 29, "ليلى سمير حسن",            "laylasamir@gmail.com",     "01011223345", "Maadi",
             json.dumps(SKILLS["med"]),
             "Nursing student volunteering with the Red Crescent blood donation team.",
             "Active", "2003-08-09", "Cairo",
             "30308090101204", "Female", "Egyptian",
             "University Student", "Ain Shams University", "Faculty of Nursing", "3rd Year", "Critical Care Nursing", "Emergencies",
             8, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}]),
             json.dumps(CAUSES_FULL), json.dumps(["Weekday afternoons", "Weekends"]),
             0, "", json.dumps([]),
             "Mild dust allergy."),

            (11, 30, "Hossam Adel Mohamed",      "hossamadel@gmail.com",     "01123344557", "Cairo",
             json.dumps(SKILLS["lead"]),
             "Business student passionate about youth entrepreneurship.",
             "Active", "2000-01-20", "Cairo",
             "30001200101115", "Male", "Egyptian",
             "University Student", "The American University in Cairo", "School of Business", "4th Year", "Entrepreneurship", "Partnerships",
             6, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Native"}]),
             json.dumps(CAUSES_FULL), json.dumps(["Weekends"]),
             0, "", json.dumps([]), ""),

            (12, 31, "منة طارق أحمد",            "mennatarek@gmail.com",     "01234455668", "Giza",
             json.dumps(SKILLS["tr"]),
             "Linguistics student helping NGOs reach bilingual audiences.",
             "Pending", "2002-10-03", "Giza",
             "30210031201226", "Female", "Egyptian",
             "University Student", "Cairo University", "Faculty of Al-Alsun", "3rd Year", "Translation Studies", "Content Creation",
             5, json.dumps([{"language": "Arabic", "proficiency": "Native"}, {"language": "English", "proficiency": "Fluent"}, {"language": "French", "proficiency": "Conversational"}]),
             json.dumps(CAUSES_FULL), json.dumps(["Weekday evenings", "Weekends"]),
             0, "", json.dumps([]), ""),
        ]
        db.executemany(
            "INSERT INTO volunteers ("
            "id, user_id, name, email, phone, city, skills, about_me, status, date_of_birth, governorate, "
            "national_id, gender, nationality, education_level, university_name, faculty, study_year, "
            "field_of_study, department, hours_per_week, languages, cause_areas, availability, "
            "prior_experience, prior_org, experiences, health_notes"
            ") VALUES (" + ", ".join(["?"] * 28) + ")",
            volunteers,
        )

        # ──────────── ORG-VOLUNTEER MEMBERSHIPS ────────────
        org_vols = [
            # Resala (sup 1, 2)
            (1, 1,  1, "Programs",  "Active",  "2025-09-01", "self_registration", "website",  1),
            (1, 2,  1, "HR",        "Active",  "2025-10-15", "self_registration", "referral", 1),
            (1, 3,  2, "Media",     "Active",  "2025-11-01", "self_registration", "campaign", 1),
            (1, 4,  2, "IT",        "Active",  "2026-01-20", "manual_import",     "website",  1),
            (1, 5,  1, "Finance",   "Active",  "2025-08-10", "self_registration", "referral", 1),
            (1, 8,  2, "Media",     "Active",  "2026-02-05", "self_registration", "website",  1),
            (1, 11, 1, "Programs",  "Pending", "2026-04-01", "self_registration", "campaign", 0),
            # Red Crescent (sup 3, 4)
            (2, 1,  3, "Outreach",  "Active",  "2025-09-20", "self_registration", "referral", 1),
            (2, 6,  3, "Logistics", "Active",  "2025-12-01", "manual_import",     "website",  1),
            (2, 7,  3, "Field",     "Active",  "2026-01-05", "self_registration", "campaign", 1),
            (2, 10, 4, "Medical",   "Active",  "2026-03-01", "self_registration", "website",  1),
            (2, 9,  4, "Outreach",  "Active",  "2026-02-10", "self_registration", "referral", 1),
            (2, 12, 4, "Translation","Pending","2026-04-05", "self_registration", "website",  0),
            # Enactus (sup 5, 6)
            (3, 2,  5, "Business",  "Active",  "2025-10-05", "self_registration", "website",  1),
            (3, 3,  5, "Media",     "Active",  "2025-11-10", "self_registration", "referral", 1),
            (3, 4,  6, "Tech",      "Active",  "2026-01-15", "self_registration", "campaign", 1),
            (3, 9,  6, "Education", "Active",  "2025-09-25", "self_registration", "website",  1),
            (3, 11, 5, "Mentorship","Active",  "2026-02-12", "self_registration", "referral", 1),
            (3, 12, 6, "Translation","Active", "2026-03-08", "self_registration", "campaign", 1),
        ]
        db.executemany(
            "INSERT INTO org_volunteers "
            "(org_id, volunteer_id, supervisor_id, department, status, joined_date, source, join_source, is_active) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            org_vols,
        )

        # ──────────── EVENTS ────────────
        events = [
            (1, 1, "Ramadan Food Drive 2026",
             "Annual food package distribution to 500+ families in Greater Cairo.",
             "Resala HQ, Maadi, Cairo", "2026-03-15", "08:00", 8, 50, 48,
             "Community Outreach, Event Planning", "Completed"),
            (2, 1, "Youth Leadership Forum",
             "Day-long forum for emerging youth leaders covering civic responsibility and social innovation.",
             "Bibliotheca Alexandrina, Alexandria", "2026-05-20", "09:00", 6, 30, 18,
             "Community Outreach, Event Planning", "Upcoming"),
            (3, 1, "Volunteer Onboarding Workshop — April",
             "Orientation for new volunteers: policies, tools, and best practices.",
             "Resala Training Center, Cairo", "2026-04-08", "10:00", 5, 15, 14,
             "Administrative Support, Teaching / Tutoring", "Completed"),

            (4, 2, "National Blood Donation Drive — Spring",
             "Biannual blood donation campaign across 12 governorates.",
             "Multiple Sites — Cairo, Giza, Alexandria", "2026-05-05", "08:00", 7, 60, 45,
             "Medical / First Aid, Community Outreach", "Upcoming"),
            (5, 2, "Winter Aid Distribution — Alexandria",
             "Distribution of 1,000+ winter kits to displaced families in Alexandria.",
             "Borg El-Arab, Alexandria", "2025-12-20", "07:00", 8, 35, 35,
             "Community Outreach, Event Planning", "Completed"),

            (6, 3, "Entrepreneurship Bootcamp — Spring",
             "Three-day bootcamp for student entrepreneurs covering business modeling and pitching.",
             "AUC New Cairo Campus", "2026-05-15", "09:00", 8, 25, 12,
             "Teaching / Tutoring, Event Planning", "Upcoming"),
            (7, 3, "Digital Skills for Women — Shubra",
             "Free digital literacy and e-commerce training for women entrepreneurs in Shubra.",
             "Shubra Community Hall, Cairo", "2026-04-05", "10:00", 5, 20, 18,
             "Teaching / Tutoring, Software Development", "Completed"),
        ]
        db.executemany(
            "INSERT INTO events (id, org_id, name, description, location, date, time, duration, "
            "max_volunteers, current_volunteers, required_skills, status) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            events,
        )

        # ──────────── EVENT APPLICATIONS ────────────
        apps = [
            # Event 1 — Ramadan Food Drive (5)
            (1,  1, 1, 1, "Approved", "2026-02-20 10:00:00"),
            (2,  2, 1, 1, "Approved", "2026-02-21 11:30:00"),
            (3,  5, 1, 1, "Approved", "2026-02-22 09:15:00"),
            (4, 11, 1, 1, "Rejected", "2026-02-25 14:00:00"),
            (5,  8, 1, 1, "Approved", "2026-02-23 16:45:00"),
            # Event 2 — Youth Leadership Forum (4)
            (6,  1, 2, 1, "Pending",  "2026-04-13 10:00:00"),
            (7,  2, 2, 1, "Approved", "2026-04-10 12:00:00"),
            (8, 11, 2, 1, "Pending",  "2026-04-14 09:00:00"),
            (9,  4, 2, 1, "Approved", "2026-04-11 17:30:00"),
            # Event 3 — Onboarding Workshop (3)
            (10, 1, 3, 1, "Approved", "2026-03-30 10:00:00"),
            (11, 4, 3, 1, "Approved", "2026-03-31 11:00:00"),
            (12, 5, 3, 1, "Approved", "2026-04-01 09:30:00"),
            # Event 4 — Blood Donation Drive (5)
            (13,  1, 4, 2, "Pending",  "2026-04-13 10:05:00"),
            (14, 10, 4, 2, "Approved", "2026-04-08 14:00:00"),
            (15,  6, 4, 2, "Approved", "2026-04-09 09:00:00"),
            (16,  9, 4, 2, "Pending",  "2026-04-15 11:00:00"),
            (17, 12, 4, 2, "Rejected", "2026-04-16 12:30:00"),
            # Event 5 — Winter Aid (4)
            (18,  6, 5, 2, "Approved", "2025-12-01 09:00:00"),
            (19,  7, 5, 2, "Approved", "2025-12-02 10:00:00"),
            (20, 10, 5, 2, "Approved", "2025-12-03 11:00:00"),
            (21,  1, 5, 2, "Approved", "2025-12-05 14:00:00"),
            # Event 6 — Entrepreneurship Bootcamp (4)
            (22,  2, 6, 3, "Approved", "2026-04-10 09:00:00"),
            (23, 11, 6, 3, "Pending",  "2026-04-13 12:00:00"),
            (24,  3, 6, 3, "Approved", "2026-04-11 10:30:00"),
            (25,  4, 6, 3, "Pending",  "2026-04-14 16:00:00"),
            # Event 7 — Digital Skills for Women (3)
            (26,  4, 7, 3, "Approved", "2026-03-25 10:00:00"),
            (27,  9, 7, 3, "Approved", "2026-03-26 11:00:00"),
            (28, 12, 7, 3, "Approved", "2026-03-28 09:30:00"),
        ]
        db.executemany(
            "INSERT INTO event_applications (id, volunteer_id, event_id, org_id, status, applied_date) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            apps,
        )

        # ──────────── ACTIVITIES ────────────
        activities = [
            (1,  1, 1, 1, "2026-03-15", 8, "Coordinated 6 volunteers for package sorting in Ain Shams; delivered to 80 families.", "Approved"),
            (2,  1, 3, 1, "2026-04-08", 5, "Facilitated two onboarding sessions for 14 new volunteers.", "Approved"),
            (3,  1, 5, 2, "2025-12-20", 8, "Managed donor registration at Borg El-Arab; assisted 200+ donors.", "Approved"),
            (4,  1, 2, 1, "2026-04-25", 3, "Pre-event planning session for the Youth Leadership Forum.", "Pending"),

            (5,  2, 1, 1, "2026-03-15", 8, "Volunteer scheduling across 5 distribution zones for 48 volunteers.", "Approved"),
            (6,  2, 3, 1, "2026-04-08", 5, "Delivered 'Volunteer Rights & Responsibilities' module.", "Approved"),
            (7,  2, 6, 3, "2026-04-20", 4, "Mentor-prep session for the upcoming Entrepreneurship Bootcamp.", "Pending"),

            (8,  3, 6, 3, "2026-04-22", 4, "Filmed promo video for Entrepreneurship Bootcamp recruitment.", "Approved"),
            (9,  3, 7, 3, "2026-04-05", 5, "Photographed Digital Skills workshop; produced highlight reel.", "Approved"),

            (10, 4, 3, 1, "2026-04-08", 5, "Set up volunteer management system on tablets for digital check-in.", "Approved"),
            (11, 4, 7, 3, "2026-04-05", 5, "Taught e-commerce basics to 18 women entrepreneurs.", "Approved"),
            (12, 4, 6, 3, "2026-04-28", 3, "Tech-prep for bootcamp: setup of demo accounts and projector tests.", "Pending"),

            (13, 5, 1, 1, "2026-03-15", 8, "Petty cash and expense tracking for the food drive; reconciled receipts.", "Approved"),
            (14, 5, 3, 1, "2026-04-08", 5, "Budgeting basics workshop for new volunteers.", "Approved"),

            (15, 6, 5, 2, "2025-12-20", 8, "Truck loading and route planning; supervised 8 field volunteers.", "Approved"),
            (16, 6, 4, 2, "2026-04-15", 4, "Pre-event logistics planning for blood donation sites.", "Pending"),

            (17, 7, 5, 2, "2025-12-20", 8, "Post-distribution surveys with 50 recipient families.", "Approved"),
            (18, 7, 4, 2, "2026-04-20", 3, "Survey design for upcoming blood drive impact measurement.", "Pending"),

            (19, 8, 1, 1, "2026-03-14", 4, "Designed banners and social posts for the food drive launch.", "Approved"),
            (20, 8, 2, 1, "2026-04-30", 3, "Visual identity drafts for Youth Leadership Forum.", "Pending"),

            (21, 9, 7, 3, "2026-04-05", 5, "Taught computer literacy to 20 women: email, Docs, WhatsApp Business.", "Approved"),
            (22, 9, 4, 2, "2026-04-22", 3, "Outreach session at local university to recruit blood donors.", "Approved"),
            (23, 9, 6, 3, "2026-05-02", 4, "Curriculum prep for entrepreneurship workshop modules.", "Pending"),

            (24, 10, 5, 2, "2025-12-20", 8, "First aid support during long field day; monitored volunteer health.", "Approved"),
            (25, 10, 4, 2, "2026-04-25", 3, "Training session for new medical-support volunteers.", "Approved"),
            (26, 10, 4, 2, "2026-05-01", 2, "Inventory check on first-aid kits for blood drive sites.", "Pending"),

            (27, 11, 6, 3, "2026-04-15", 4, "Pitch coaching for student teams preparing bootcamp submissions.", "Approved"),
            (28, 11, 2, 1, "2026-04-28", 3, "Volunteer outreach on campus for Youth Leadership Forum.", "Pending"),
        ]
        db.executemany(
            "INSERT INTO activities (id, volunteer_id, event_id, org_id, date, hours, description, status) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            activities,
        )

        # ──────────── CERTIFICATES ────────────
        certificates = [
            (1,  1, 1, 1, "Achievement",   8, "2026-03-20"),
            (2,  1, 1, 3, "Completion",    5, "2026-04-15"),
            (3,  1, 2, 5, "Completion",    8, "2025-12-28"),
            (4,  2, 1, 1, "Achievement",   8, "2026-03-20"),
            (5,  2, 1, 3, "Completion",    5, "2026-04-15"),
            (6,  4, 3, 7, "Completion",    5, "2026-04-12"),
            (7,  5, 1, 1, "Participation", 8, "2026-03-20"),
            (8,  6, 2, 5, "Achievement",   8, "2025-12-28"),
            (9,  7, 2, 5, "Completion",    8, "2025-12-28"),
            (10, 9, 3, 7, "Completion",    5, "2026-04-12"),
            (11,10, 2, 5, "Completion",    8, "2025-12-28"),
        ]
        db.executemany(
            "INSERT INTO certificates (id, volunteer_id, org_id, event_id, type, hours, issued_date) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
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
        db.executemany(
            "INSERT INTO announcements (id, org_id, title, content, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            announcements,
        )

        # ──────────── NOTIFICATIONS ────────────
        notifs = [
            (1, "application", "New Event Application",
             "Yara Hassan applied to 'Youth Leadership Forum'.", 0, "/admin/applications", "2026-04-13 10:01:00"),
            (2, "application", "New Event Application",
             "Hossam Adel applied to 'Youth Leadership Forum'.", 0, "/admin/applications", "2026-04-14 09:01:00"),
            (1, "membership",  "Pending Volunteer",
             "Hossam Adel is pending approval as a Resala volunteer.", 0, "/admin/volunteers", "2026-04-01 12:00:00"),
            (3, "application", "New Event Application",
             "Yara Hassan applied to 'Blood Donation Drive'.", 0, "/admin/applications", "2026-04-13 10:06:00"),
            (3, "membership",  "Pending Volunteer",
             "Menna Tarek is pending approval as a Red Crescent volunteer.", 1, "/admin/volunteers", "2026-04-05 13:00:00"),
        ]
        db.executemany(
            "INSERT INTO notifications (user_id, type, title, message, is_read, action_url, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
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
