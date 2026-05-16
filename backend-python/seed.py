"""Seed the database with realistic demo data.

Schema: post-007_clean_schema migration.
- volunteers.email dropped  → email lives only in users
- supervisors.email dropped → email lives only in users
- org_theme table removed entirely
- org_admins.role column removed
- org_volunteers: supervisor_id, channel_detail, governorate_snapshot, city_snapshot dropped
- events.date + events.time merged → events.starts_at TIMESTAMPTZ
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
            "event_ratings", "event_applications", "announcements",
            "certificates", "activities", "org_volunteers",
            "volunteer_availability", "volunteer_experiences",
            "volunteer_cause_areas", "volunteer_languages", "volunteer_skills",
            "events", "supervisors", "volunteers",
            "org_admins", "organizations", "platform_admins", "users",
        ]:
            db.execute(f"DELETE FROM {table} WHERE TRUE")

        h = hash_password

        # ──────────── USERS ────────────
        users = [
            (100, "platform@altruism.org",            h("Platform#1"),   "platform_admin"),

            # Org admins
            (1,   "sherifaziz@resala.org",            h("Admin#1234"),   "org_admin"),
            (2,   "monakamal@resala.org",             h("Admin#1234"),   "org_admin"),
            (3,   "fatimaelsayed@redcrescent.org",    h("Admin#1234"),   "org_admin"),
            (4,   "mohamedfarouk@enactus-egypt.org",  h("Admin#1234"),   "org_admin"),

            # Supervisors — Resala (org 1)
            (10,  "amirakhalil@resala.org",           h("Super#1234"),   "supervisor"),
            (11,  "mahmoudhassan@resala.org",         h("Super#1234"),   "supervisor"),
            (16,  "raniafouad@resala.org",            h("Super#1234"),   "supervisor"),
            (17,  "khaledsalem@resala.org",           h("Super#1234"),   "supervisor"),
            # Supervisors — Red Crescent (org 2)
            (12,  "ahmedelmasry@redcrescent.org",     h("Super#1234"),   "supervisor"),
            (13,  "nourhanali@redcrescent.org",       h("Super#1234"),   "supervisor"),
            (18,  "doaahamed@redcrescent.org",        h("Super#1234"),   "supervisor"),
            (50,  "samermansour@redcrescent.org",     h("Super#1234"),   "supervisor"),
            (51,  "hebafathy@redcrescent.org",        h("Super#1234"),   "supervisor"),
            (52,  "walideldin@redcrescent.org",       h("Super#1234"),   "supervisor"),
            (53,  "noharamadan@redcrescent.org",      h("Super#1234"),   "supervisor"),
            (54,  "karimabdallah@redcrescent.org",    h("Super#1234"),   "supervisor"),
            (55,  "yasminelshafei@redcrescent.org",   h("Super#1234"),   "supervisor"),
            (56,  "adelsaad@redcrescent.org",         h("Super#1234"),   "supervisor"),
            # Supervisors — Enactus (org 3)
            (14,  "saranabil@enactus-egypt.org",      h("Super#1234"),   "supervisor"),
            (15,  "youssefgamal@enactus-egypt.org",   h("Super#1234"),   "supervisor"),
            (19,  "tarekzaki@enactus-egypt.org",      h("Super#1234"),   "supervisor"),

            # Volunteers (20–49)
            (20,  "yarahassan@gmail.com",             h("Vol#12345"),    "volunteer"),
            (21,  "nadiamahmoud@gmail.com",           h("Vol#12345"),    "volunteer"),
            (22,  "karimmostafa@gmail.com",           h("Vol#12345"),    "volunteer"),
            (23,  "sofiaahmed@gmail.com",             h("Vol#12345"),    "volunteer"),
            (24,  "tarekibrahim@gmail.com",           h("Vol#12345"),    "volunteer"),
            (25,  "hanayoussef@gmail.com",            h("Vol#12345"),    "volunteer"),
            (26,  "youssefbakr@gmail.com",            h("Vol#12345"),    "volunteer"),
            (27,  "dinaelsayed@gmail.com",            h("Vol#12345"),    "volunteer"),
            (28,  "omarfarouk@gmail.com",             h("Vol#12345"),    "volunteer"),
            (29,  "laylasamir@gmail.com",             h("Vol#12345"),    "volunteer"),
            (30,  "hossamadel@gmail.com",             h("Vol#12345"),    "volunteer"),
            (31,  "mennatarek@gmail.com",             h("Vol#12345"),    "volunteer"),
            (32,  "alihashem@gmail.com",              h("Vol#12345"),    "volunteer"),
            (33,  "salmaibrahim@gmail.com",           h("Vol#12345"),    "volunteer"),
            (34,  "mostafanasser@gmail.com",          h("Vol#12345"),    "volunteer"),
            (35,  "nourelhoda@gmail.com",             h("Vol#12345"),    "volunteer"),
            (36,  "ahmedwael@gmail.com",              h("Vol#12345"),    "volunteer"),
            (37,  "reenasaad@gmail.com",              h("Vol#12345"),    "volunteer"),
            (38,  "khaledmansour@gmail.com",          h("Vol#12345"),    "volunteer"),
            (39,  "malakmaher@gmail.com",             h("Vol#12345"),    "volunteer"),
            (40,  "zeyadfouad@gmail.com",             h("Vol#12345"),    "volunteer"),
            (41,  "randarashad@gmail.com",            h("Vol#12345"),    "volunteer"),
            (42,  "bassemkamal@gmail.com",            h("Vol#12345"),    "volunteer"),
            (43,  "nermineashraf@gmail.com",          h("Vol#12345"),    "volunteer"),
            (44,  "ibrahimyasser@gmail.com",          h("Vol#12345"),    "volunteer"),
        ]
        _executemany(db,
            "INSERT INTO users (id, email, password, role) VALUES (%s, %s, %s, %s)",
            users,
        )

        # ──────────── ORGANIZATIONS ────────────
        org_cols = (
            "id, name, description, website, phone, admin_user_id, status, org_type, founded_year, "
            "official_email, submitter_name, submitter_role, student_only, "
            "org_size, hq_city, location, branches, categories"
        )
        ph = ", ".join(["%s"] * 18)
        insert_org = f"INSERT INTO organizations ({org_cols}) VALUES ({ph})"

        db.execute(insert_org, (
            1, "Resala",
            "Egypt's largest volunteer organization dedicated to community support, "
            "youth empowerment, and food drives across all governorates.",
            "https://resala.org", "+20 2 2516 8888", 1,
            "approved", "NGO", "1999",
            "info@resala.org", "Sherif Abdel Aziz", "Executive Director", False,
            "501-1000", "Maadi", "Cairo",
            json.dumps(["Cairo", "Alexandria", "Giza", "Mansoura", "Aswan"]),
            json.dumps(["Social Welfare", "Food Security", "Youth Empowerment", "Community Outreach"]),
        ))
        db.execute(insert_org, (
            2, "Egyptian Red Crescent",
            "Humanitarian aid, disaster relief, and emergency health services across Egypt since 1912.",
            "https://egyptianrc.org", "+20 2 2575 0399", 3,
            "approved", "NGO", "1912",
            "info@egyptianrc.org", "Fatima El-Sayed", "Communications Director", False,
            "1000+", "Nasr City", "Cairo",
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
            "201-500", "Dokki", "Giza",
            json.dumps(["Cairo", "Giza", "Alexandria", "Mansoura"]),
            json.dumps(["Student Entrepreneurship", "Education", "Sustainability", "Innovation"]),
        ))

        # ──────────── ORG ADMINS ────────────
        org_admins = [
            (1, 1),   # sherifaziz   → Resala
            (2, 1),   # monakamal    → Resala
            (3, 2),   # fatima       → Red Crescent
            (4, 3),   # mohamedfarouk → Enactus
        ]
        _executemany(db,
            "INSERT INTO org_admins (user_id, org_id) VALUES (%s, %s)",
            org_admins,
        )

        # ──────────── SUPERVISORS ────────────
        supervisors = [
            # Resala (org 1)
            (1,  10, "Dr. Amira Khalil",  "01011223344", "Programs",   1, "active"),
            (2,  11, "Mahmoud Hassan",    "01122334455", "Media",      1, "active"),
            (7,  16, "Rania Fouad",       "01067889900", "Outreach",   1, "active"),
            (8,  17, "Khaled Salem",      "01178990011", "Logistics",  1, "active"),
            # Red Crescent (org 2)
            (3,  12, "Ahmed El-Masry",    "01044556677", "Field Teams",2, "active"),
            (4,  13, "Nourhan Ali",       "01245566778", "Medical",    2, "active"),
            (9,  18, "Doaa Hamed",        "01289001122", "Education",  2, "active"),
            (11, 50, "Samer Mansour",     "01100223344", "Outreach",   2, "active"),
            (12, 51, "Heba Fathy",        "01211334455", "Nursing",    2, "active"),
            (13, 52, "Walid El-Din",      "01322445566", "Logistics",  2, "active"),
            (14, 53, "Noha Ramadan",      "01433556677", "Field",      2, "active"),
            (15, 54, "Karim Abdallah",    "01544667788", "Training",   2, "active"),
            (16, 55, "Yasmin El-Shafei", "01655778899", "Programs",   2, "active"),
            (17, 56, "Adel Saad",         "01766889900", "Emergency",  2, "active"),
            # Enactus (org 3)
            (5,  14, "Sara Nabil",        "01055667788", "Projects",   3, "active"),
            (6,  15, "Youssef Gamal",     "01556677889", "Mentorship", 3, "active"),
            (10, 19, "Tarek Zaki",        "01390112233", "Finance",    3, "active"),
        ]
        _executemany(db,
            "INSERT INTO supervisors (id, user_id, name, phone, team, org_id, status) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            supervisors,
        )

        # ──────────── VOLUNTEERS ────────────
        CAUSES_ALL = json.dumps([
            "Social & Humanitarian", "Children & Youth", "Education & Skills",
            "Health & Emergency", "Environment",
        ])
        CAUSES_HUM  = json.dumps(["Social & Humanitarian", "Health & Emergency"])
        CAUSES_EDU  = json.dumps(["Education & Skills", "Children & Youth"])
        CAUSES_ENV  = json.dumps(["Environment", "Social & Humanitarian"])
        AVAIL_WE    = json.dumps(["Weekends"])
        AVAIL_BOTH  = json.dumps(["Weekday afternoons", "Weekends"])
        AVAIL_EVE   = json.dumps(["Weekday evenings", "Weekends"])
        AVAIL_AM    = json.dumps(["Weekday mornings"])

        def langs(*l): return json.dumps([{"language": x, "proficiency": p} for x, p in l])
        def skills(*s): return json.dumps(list(s))
        def exp(org, dept, role, dur, desc): return json.dumps([{"orgName": org, "department": dept, "role": role, "duration": dur, "description": desc}])
        NO_EXP = json.dumps([])

        # (id, user_id, name, phone, city, skills_json, status, dob, governorate,
        #  national_id, gender, nationality, education_level, university_name, faculty,
        #  study_year, field_of_study, department, hours_per_week, languages_json,
        #  cause_areas_json, availability_json, prior_experience, prior_org, experiences_json, health_notes)
        volunteers = [
            (1,  20, "Yara Hassan Mohamed",      "01212345678", "Alexandria",
             skills("Community Outreach","Event Planning","Photography & Videography"),
             "active","1999-07-15","Alexandria","29907150201245","Female","Egyptian",
             "University Graduate","Alexandria University","Faculty of Arts","","Mass Communication","Media",
             10, langs(("Arabic","Native"),("English","Fluent")),
             CAUSES_ALL, AVAIL_BOTH, 0,"",NO_EXP,""),

            (2,  21, "Nadia Mahmoud Ali",         "01234567891", "Heliopolis",
             skills("Administrative Support","Event Planning","Community Outreach"),
             "active","1997-03-22","Cairo","29703220101226","Female","Egyptian",
             "University Graduate","Cairo University","Faculty of Commerce","","Business Administration","HR",
             8, langs(("Arabic","Native"),("English","Fluent")),
             CAUSES_ALL, AVAIL_WE, 1,"Misr El-Kheir Foundation",
             exp("Misr El-Kheir Foundation","HR","HR Trainer","2022-2024","Designed onboarding curriculum for 60+ volunteers."),""),

            (3,  22, "Karim Mostafa Ibrahim",     "01098765432", "Giza",
             skills("Photography & Videography","Social Media Management","Graphic Design"),
             "active","2000-11-05","Giza","30011051201137","Male","Egyptian",
             "University Graduate","Cairo University","Faculty of Mass Communication","","Public Relations","Media",
             12, langs(("Arabic","Native"),("English","Fluent")),
             CAUSES_ALL, AVAIL_BOTH, 0,"",NO_EXP,""),

            (4,  23, "Sofia Ahmed Hassan",        "01112223344", "Giza",
             skills("Software Development","Administrative Support","Graphic Design"),
             "active","2002-05-30","Giza","30205301201248","Female","Egyptian",
             "University Student","Cairo University","Faculty of Computers and AI","3rd Year","Computer Science","Content Creation",
             6, langs(("Arabic","Native"),("English","Fluent"),("French","Conversational")),
             CAUSES_EDU, AVAIL_EVE, 0,"",NO_EXP,""),

            (5,  24, "Tarek Ibrahim Salem",       "01556677889", "Cairo",
             skills("Administrative Support","Fundraising","Event Planning"),
             "active","1998-09-12","Cairo","29809120101159","Male","Egyptian",
             "University Graduate","Ain Shams University","Faculty of Commerce","","Accounting","Fundraising",
             8, langs(("Arabic","Native"),("English","Fluent")),
             CAUSES_ALL, AVAIL_WE, 0,"",NO_EXP,""),

            (6,  25, "Hana Youssef Abdullah",     "01667788991", "Alexandria",
             skills("Administrative Support","Event Planning","Environmental Work"),
             "active","2001-02-18","Alexandria","30102180201264","Female","Egyptian",
             "University Graduate","Alexandria University","Faculty of Engineering","","Industrial Engineering","Logistics",
             10, langs(("Arabic","Native"),("English","Fluent")),
             CAUSES_ALL, AVAIL_BOTH, 0,"",NO_EXP,""),

            (7,  26, "Youssef Bakr Hassan",       "01122334456", "Mansoura",
             skills("Administrative Support","Community Outreach","Translation"),
             "active","1996-06-08","Dakahlia","29606082401171","Male","Egyptian",
             "Postgraduate (Diploma / Master / PhD)","Mansoura University","Faculty of Arts","","Sociology","General",
             6, langs(("Arabic","Native"),("English","Fluent")),
             CAUSES_HUM, AVAIL_AM, 1,"Egyptian Foundation for Refugee Rights",
             exp("Egyptian Foundation for Refugee Rights","Research","Field Researcher","2021-2023","Led impact studies across 3 governorates."),""),

            (8,  27, "Dina El-Sayed Mohamed",     "01899001122", "Cairo",
             skills("Graphic Design","Social Media Management","Photography & Videography"),
             "active","2001-12-25","Cairo","30112250101282","Female","Egyptian",
             "University Graduate","Helwan University","Faculty of Applied Arts","","Graphic Design","Content Creation",
             8, langs(("Arabic","Native"),("English","Fluent")),
             CAUSES_ALL, AVAIL_BOTH, 0,"",NO_EXP,""),

            (9,  28, "Omar Farouk Ali",            "01500112233", "Mansoura",
             skills("Teaching / Tutoring","Community Outreach","Administrative Support"),
             "active","1995-04-14","Dakahlia","29504142401193","Male","Egyptian",
             "University Graduate","Mansoura University","Faculty of Education","","Curriculum & Instruction","General",
             10, langs(("Arabic","Native"),("English","Conversational")),
             CAUSES_EDU, AVAIL_WE, 1,"Educate Me Foundation",
             exp("Educate Me Foundation","Education","Volunteer Tutor","2020-2024","Tutored under-served children in Arabic, math, and English."),""),

            (10, 29, "Layla Samir Hassan",         "01011223345", "Maadi",
             skills("Medical / First Aid","Community Outreach","Event Planning"),
             "active","2003-08-09","Cairo","30308090101204","Female","Egyptian",
             "University Student","Ain Shams University","Faculty of Nursing","3rd Year","Critical Care Nursing","Emergencies",
             8, langs(("Arabic","Native"),("English","Fluent")),
             CAUSES_HUM, AVAIL_BOTH, 0,"",NO_EXP,"Mild dust allergy."),

            (11, 30, "Hossam Adel Mohamed",        "01123344557", "Cairo",
             skills("Community Outreach","Event Planning","Fundraising"),
             "active","2000-01-20","Cairo","30001200101115","Male","Egyptian",
             "University Student","The American University in Cairo","School of Business","4th Year","Entrepreneurship","Partnerships",
             6, langs(("Arabic","Native"),("English","Native")),
             CAUSES_ALL, AVAIL_WE, 0,"",NO_EXP,""),

            (12, 31, "Menna Tarek Ahmed",          "01234455668", "Giza",
             skills("Translation","Administrative Support","Social Media Management"),
             "active","2002-10-03","Giza","30210031201226","Female","Egyptian",
             "University Student","Cairo University","Faculty of Al-Alsun","3rd Year","Translation Studies","Content Creation",
             5, langs(("Arabic","Native"),("English","Fluent"),("French","Conversational")),
             CAUSES_EDU, AVAIL_EVE, 0,"",NO_EXP,""),

            (13, 32, "Ali Hashem Ragab",           "01311223344", "Shubra",
             skills("Community Outreach","Fundraising","Event Planning"),
             "active","1998-04-17","Cairo","29804170101167","Male","Egyptian",
             "University Graduate","Ain Shams University","Faculty of Arts","","Sociology","Outreach",
             10, langs(("Arabic","Native"),("English","Fluent")),
             CAUSES_HUM, AVAIL_BOTH, 1,"Resala Charity Organization",
             exp("Resala","Outreach","Field Coordinator","2020-2023","Coordinated 200+ food drive volunteers across Cairo."),""),

            (14, 33, "Salma Ibrahim Khalil",       "01411334455", "Zamalek",
             skills("Teaching / Tutoring","Graphic Design","Social Media Management"),
             "active","2001-06-25","Cairo","30106250101148","Female","Egyptian",
             "University Student","Cairo University","Faculty of Fine Arts","2nd Year","Visual Arts","Education",
             6, langs(("Arabic","Native"),("English","Fluent"),("Spanish","Basic")),
             CAUSES_EDU, AVAIL_EVE, 0,"",NO_EXP,""),

            (15, 34, "Mostafa Nasser El-Din",      "01511445566", "Dokki",
             skills("Software Development","Administrative Support","Teaching / Tutoring"),
             "active","1999-12-02","Giza","29912021201132","Male","Egyptian",
             "University Graduate","Cairo University","Faculty of Computers and AI","","Software Engineering","Tech",
             12, langs(("Arabic","Native"),("English","Fluent")),
             CAUSES_EDU, AVAIL_BOTH, 1,"Nafham",
             exp("Nafham","Tech","Backend Developer (Volunteer)","2021-2022","Built exam question bank for 50k+ students."),""),

            (16, 35, "Nour El-Hoda Mahmoud",       "01611556677", "Helwan",
             skills("Medical / First Aid","Community Outreach","Teaching / Tutoring"),
             "active","2000-08-14","Cairo","30008140101163","Female","Egyptian",
             "University Student","Cairo University","Faculty of Medicine","4th Year","Medicine","Medical Support",
             8, langs(("Arabic","Native"),("English","Fluent")),
             CAUSES_HUM, AVAIL_WE, 0,"",NO_EXP,""),

            (17, 36, "Ahmed Wael Shafik",          "01711667788", "Nasr City",
             skills("Photography & Videography","Social Media Management","Event Planning"),
             "active","2001-03-19","Cairo","30103190101178","Male","Egyptian",
             "University Student","American University in Cairo","School of Humanities","3rd Year","Media Studies","Media",
             8, langs(("Arabic","Native"),("English","Native")),
             CAUSES_ALL, AVAIL_BOTH, 0,"",NO_EXP,""),

            (18, 37, "Reena Saad Bishara",         "01811778899", "Maadi",
             skills("Administrative Support","Event Planning","Fundraising"),
             "active","1997-11-28","Cairo","29711280101195","Female","Egyptian",
             "University Graduate","German University in Cairo","Faculty of Management Technology","","Business Informatics","Operations",
             10, langs(("Arabic","Native"),("English","Fluent"),("German","Conversational")),
             CAUSES_ALL, AVAIL_BOTH, 1,"Save the Children Egypt",
             exp("Save the Children Egypt","Programs","Program Coordinator","2019-2023","Managed volunteer programs reaching 5,000+ children."),""),

            (19, 38, "Khaled Mansour Fadl",        "01911889900", "Alexandria",
             skills("Community Outreach","Environmental Work","Event Planning"),
             "active","1996-07-07","Alexandria","29607070201187","Male","Egyptian",
             "University Graduate","Alexandria University","Faculty of Science","","Environmental Science","Environment",
             8, langs(("Arabic","Native"),("English","Fluent")),
             CAUSES_ENV, AVAIL_WE, 1,"Greenish Egypt",
             exp("Greenish Egypt","Environment","Campaign Lead","2018-2022","Ran coastal clean-up campaigns with 300+ volunteers."),""),

            (20, 39, "Malak Maher Samir",          "01012334456", "Nasr City",
             skills("Graphic Design","Social Media Management","Photography & Videography"),
             "active","2003-01-15","Cairo","30301150101207","Female","Egyptian",
             "University Student","Helwan University","Faculty of Applied Arts","2nd Year","Graphic Design","Design",
             6, langs(("Arabic","Native"),("English","Fluent")),
             CAUSES_ALL, AVAIL_EVE, 0,"",NO_EXP,""),

            (21, 40, "Zeyad Fouad Zaki",           "01113445567", "Giza",
             skills("Fundraising","Community Outreach","Administrative Support"),
             "active","1998-02-22","Giza","29802221201198","Male","Egyptian",
             "University Graduate","Cairo University","Faculty of Economics and Political Science","","Economics","Fundraising",
             10, langs(("Arabic","Native"),("English","Fluent")),
             CAUSES_ALL, AVAIL_BOTH, 1,"Egyptian Food Bank",
             exp("Egyptian Food Bank","Fundraising","Fundraising Officer","2020-2024","Raised EGP 2M+ in annual campaigns."),""),

            (22, 41, "Randa Rashad Amin",          "01214556678", "Zagazig",
             skills("Teaching / Tutoring","Community Outreach","Administrative Support"),
             "active","2000-05-10","Sharqia","30005100112201","Female","Egyptian",
             "University Graduate","Zagazig University","Faculty of Education","","Primary Education","Education",
             8, langs(("Arabic","Native"),("English","Conversational")),
             CAUSES_EDU, AVAIL_WE, 0,"",NO_EXP,""),

            (23, 42, "Bassem Kamal Naguib",        "01315667789", "Mohandessin",
             skills("Administrative Support","Event Planning","Fundraising"),
             "active","1995-09-30","Giza","29509301201134","Male","Egyptian",
             "Postgraduate (Diploma / Master / PhD)","Cairo University","Faculty of Law","","Law","Legal & Admin",
             6, langs(("Arabic","Native"),("English","Fluent"),("French","Conversational")),
             CAUSES_HUM, AVAIL_AM, 1,"UNHCR Egypt",
             exp("UNHCR Egypt","Legal","Legal Aid Volunteer","2017-2021","Provided legal assistance to 800+ asylum seekers."),""),

            (24, 43, "Nermine Ashraf Helmy",       "01416778890", "Madinaty",
             skills("Medical / First Aid","Teaching / Tutoring","Community Outreach"),
             "active","2002-04-05","Cairo","30204050101244","Female","Egyptian",
             "University Student","Ain Shams University","Faculty of Pharmacy","3rd Year","Clinical Pharmacy","Medical Support",
             8, langs(("Arabic","Native"),("English","Fluent")),
             CAUSES_HUM, AVAIL_BOTH, 0,"",NO_EXP,""),

            (25, 44, "Ibrahim Yasser Gamal",       "01517889901", "Tanta",
             skills("Community Outreach","Event Planning","Photography & Videography"),
             "active","1999-10-21","Gharbia","29910210181195","Male","Egyptian",
             "University Graduate","Tanta University","Faculty of Arts","","Media & Journalism","Media",
             10, langs(("Arabic","Native"),("English","Fluent")),
             CAUSES_ALL, AVAIL_BOTH, 0,"",NO_EXP,""),
        ]

        vol_insert = (
            "INSERT INTO volunteers ("
            "id, user_id, name, phone, city, skills, status, date_of_birth, governorate, "
            "national_id, gender, nationality, education_level, university_name, faculty, study_year, "
            "field_of_study, department, hours_per_week, languages, cause_areas, availability, "
            "prior_experience, prior_org, experiences, health_notes"
            ") VALUES (" + ", ".join(["%s"] * 26) + ")"
        )
        _executemany(db, vol_insert, volunteers)

        # ──────────── VOLUNTEER SKILLS ────────────
        vol_skills = [
            (1,"Community Outreach"),(1,"Event Planning"),(1,"Photography & Videography"),
            (2,"Administrative Support"),(2,"Event Planning"),(2,"Community Outreach"),
            (3,"Photography & Videography"),(3,"Social Media Management"),(3,"Graphic Design"),
            (4,"Software Development"),(4,"Administrative Support"),(4,"Graphic Design"),
            (5,"Administrative Support"),(5,"Fundraising"),(5,"Event Planning"),
            (6,"Administrative Support"),(6,"Event Planning"),(6,"Environmental Work"),
            (7,"Administrative Support"),(7,"Community Outreach"),(7,"Translation"),
            (8,"Graphic Design"),(8,"Social Media Management"),(8,"Photography & Videography"),
            (9,"Teaching / Tutoring"),(9,"Community Outreach"),(9,"Administrative Support"),
            (10,"Medical / First Aid"),(10,"Community Outreach"),(10,"Event Planning"),
            (11,"Community Outreach"),(11,"Event Planning"),(11,"Fundraising"),
            (12,"Translation"),(12,"Administrative Support"),(12,"Social Media Management"),
            (13,"Community Outreach"),(13,"Fundraising"),(13,"Event Planning"),
            (14,"Teaching / Tutoring"),(14,"Graphic Design"),(14,"Social Media Management"),
            (15,"Software Development"),(15,"Administrative Support"),(15,"Teaching / Tutoring"),
            (16,"Medical / First Aid"),(16,"Community Outreach"),(16,"Teaching / Tutoring"),
            (17,"Photography & Videography"),(17,"Social Media Management"),(17,"Event Planning"),
            (18,"Administrative Support"),(18,"Event Planning"),(18,"Fundraising"),
            (19,"Community Outreach"),(19,"Environmental Work"),(19,"Event Planning"),
            (20,"Graphic Design"),(20,"Social Media Management"),(20,"Photography & Videography"),
            (21,"Fundraising"),(21,"Community Outreach"),(21,"Administrative Support"),
            (22,"Teaching / Tutoring"),(22,"Community Outreach"),(22,"Administrative Support"),
            (23,"Administrative Support"),(23,"Event Planning"),(23,"Fundraising"),
            (24,"Medical / First Aid"),(24,"Teaching / Tutoring"),(24,"Community Outreach"),
            (25,"Community Outreach"),(25,"Event Planning"),(25,"Photography & Videography"),
        ]
        _executemany(db,
            "INSERT INTO volunteer_skills (volunteer_id, skill) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            vol_skills,
        )

        # ──────────── VOLUNTEER LANGUAGES ────────────
        vol_langs = [
            (1,"Arabic"),(1,"English"),
            (2,"Arabic"),(2,"English"),
            (3,"Arabic"),(3,"English"),
            (4,"Arabic"),(4,"English"),(4,"French"),
            (5,"Arabic"),(5,"English"),
            (6,"Arabic"),(6,"English"),
            (7,"Arabic"),(7,"English"),
            (8,"Arabic"),(8,"English"),
            (9,"Arabic"),(9,"English"),
            (10,"Arabic"),(10,"English"),
            (11,"Arabic"),(11,"English"),
            (12,"Arabic"),(12,"English"),(12,"French"),
            (13,"Arabic"),(13,"English"),
            (14,"Arabic"),(14,"English"),(14,"Spanish"),
            (15,"Arabic"),(15,"English"),
            (16,"Arabic"),(16,"English"),
            (17,"Arabic"),(17,"English"),
            (18,"Arabic"),(18,"English"),(18,"German"),
            (19,"Arabic"),(19,"English"),
            (20,"Arabic"),(20,"English"),
            (21,"Arabic"),(21,"English"),
            (22,"Arabic"),(22,"English"),
            (23,"Arabic"),(23,"English"),(23,"French"),
            (24,"Arabic"),(24,"English"),
            (25,"Arabic"),(25,"English"),
        ]
        _executemany(db,
            "INSERT INTO volunteer_languages (volunteer_id, language) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            vol_langs,
        )

        # ──────────── VOLUNTEER CAUSE AREAS ────────────
        all_causes = [
            "Social & Humanitarian","Children & Youth","Education & Skills",
            "Health & Emergency","Environment",
        ]
        vol_causes = [(vid, cause) for vid in range(1, 26) for cause in all_causes]
        _executemany(db,
            "INSERT INTO volunteer_cause_areas (volunteer_id, cause_area) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            vol_causes,
        )

        # ──────────── ORG-VOLUNTEER MEMBERSHIPS ────────────
        # (org_id, volunteer_id, department, status, joined_at, join_source)
        org_vols = [
            # ── Resala (org 1) — 14 members ──
            (1,  1, "Programs",   "active",  "2025-09-01", "self_registration"),
            (1,  2, "HR",         "active",  "2025-10-15", "self_registration"),
            (1,  3, "Media",      "active",  "2025-11-01", "self_registration"),
            (1,  4, "IT",         "active",  "2026-01-20", "manual_import"),
            (1,  5, "Finance",    "active",  "2025-08-10", "self_registration"),
            (1,  8, "Media",      "active",  "2026-02-05", "self_registration"),
            (1, 11, "Programs",   "active",  "2026-03-01", "self_registration"),
            (1, 13, "Outreach",   "active",  "2025-07-15", "self_registration"),
            (1, 17, "Media",      "active",  "2026-01-10", "self_registration"),
            (1, 18, "Operations", "active",  "2025-12-20", "manual_import"),
            (1, 21, "Finance",    "active",  "2026-02-18", "self_registration"),
            (1, 25, "Media",      "active",  "2026-03-05", "self_registration"),
            (1, 20, "Design",     "active",  "2026-04-01", "self_registration"),
            (1, 14, "Education",  "pending",   "2026-04-20", "self_registration"),
            # Resala — rejected
            (1,  6, "Media",      "rejected",  "2025-11-10", "self_registration"),
            (1,  7, "Programs",   "rejected",  "2026-01-08", "self_registration"),
            (1, 10, "Outreach",   "rejected",  "2026-02-15", "self_registration"),
            (1, 22, "Finance",    "rejected",  "2026-03-22", "self_registration"),

            # ── Red Crescent (org 2) — 12 members ──
            (2,  1, "Outreach",     "active",    "2025-09-20", "self_registration"),
            (2,  6, "Logistics",    "active",    "2025-12-01", "manual_import"),
            (2,  7, "Field",        "active",    "2026-01-05", "self_registration"),
            (2, 10, "Medical",      "active",    "2026-03-01", "self_registration"),
            (2,  9, "Outreach",     "active",    "2026-02-10", "self_registration"),
            (2, 16, "Medical",      "active",    "2026-01-25", "self_registration"),
            (2, 19, "Environment",  "active",    "2026-02-28", "manual_import"),
            (2, 23, "Legal",        "active",    "2025-11-15", "manual_import"),
            (2, 24, "Medical",      "active",    "2026-03-20", "self_registration"),
            (2, 13, "Outreach",     "active",    "2026-01-30", "self_registration"),
            (2, 25, "Media",        "active",    "2026-04-10", "self_registration"),
            (2, 12, "Translation",  "pending",   "2026-04-05", "self_registration"),
            # Red Crescent — rejected
            (2,  2, "Medical",      "rejected",  "2026-01-12", "self_registration"),
            (2,  3, "Field",        "rejected",  "2026-02-03", "self_registration"),
            (2, 15, "Outreach",     "rejected",  "2026-03-11", "self_registration"),
            (2, 17, "Legal",        "rejected",  "2026-03-25", "self_registration"),
            (2, 22, "Media",        "rejected",  "2026-04-02", "self_registration"),

            # ── Enactus (org 3) — 10 members ──
            (3,  4, "Tech",         "active",    "2026-01-15", "self_registration"),
            (3, 10, "Health",       "active",    "2026-03-10", "self_registration"),
            (3, 11, "Mentorship",   "active",    "2026-02-12", "self_registration"),
            (3, 12, "Translation",  "active",    "2026-03-08", "self_registration"),
            (3, 14, "Education",    "active",    "2026-01-20", "self_registration"),
            (3, 15, "Tech",         "active",    "2025-12-01", "self_registration"),
            (3, 18, "Operations",   "active",    "2026-02-01", "manual_import"),
            (3, 21, "Finance",      "active",    "2026-03-15", "self_registration"),
            (3, 22, "Education",    "active",    "2026-02-25", "self_registration"),
            (3, 20, "Design",       "pending",   "2026-04-18", "self_registration"),
            # Enactus — rejected
            (3,  3, "Tech",         "rejected",  "2026-01-28", "self_registration"),
            (3,  5, "Finance",      "rejected",  "2026-02-14", "self_registration"),
            (3, 13, "Education",    "rejected",  "2026-03-30", "self_registration")
        ]
        _executemany(db,
            "INSERT INTO org_volunteers "
            "(org_id, volunteer_id, department, status, joined_at, join_source) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            org_vols,
        )

        # ──────────── EVENTS ────────────
        # (id, org_id, name, description, location, starts_at, duration, max_volunteers,
        #  required_skills, status, created_by_supervisor_id)
        events = [
            # ── Resala (org 1, supervisors 1 & 2) ──
            (1,  1, "Ramadan Food Drive 2026",
             "Annual food package distribution to 500+ families in Greater Cairo.",
             "Resala HQ, Maadi, Cairo","2026-03-15 08:00:00+02",8,50,
             "Community Outreach, Event Planning","completed",1),
            (2,  1, "Youth Leadership Forum",
             "Day-long forum for emerging youth leaders covering civic responsibility.",
             "Bibliotheca Alexandrina, Alexandria","2026-05-20 09:00:00+02",6,30,
             "Community Outreach, Event Planning","upcoming",1),
            (3,  1, "Volunteer Onboarding Workshop — April",
             "Orientation for new volunteers: policies, tools, and best practices.",
             "Resala Training Center, Cairo","2026-04-08 10:00:00+02",5,15,
             "Administrative Support, Teaching / Tutoring","completed",1),
            (10, 1, "Summer Literacy Camp",
             "Two-week intensive literacy camp for children aged 8–14 in underserved districts.",
             "Ain Shams Community School, Cairo","2026-07-01 08:30:00+02",6,20,
             "Teaching / Tutoring, Community Outreach","upcoming",2),
            (11, 1, "Social Media Volunteer Day",
             "Content creation sprint to document Resala's impact across platforms.",
             "Resala HQ, Maadi, Cairo","2026-05-10 10:00:00+02",4,10,
             "Photography & Videography, Social Media Management, Graphic Design","completed",2),
            (12, 1, "Eid Clothes Drive — Greater Cairo",
             "Collection and distribution of new children's clothing before Eid El-Adha.",
             "Multiple Drop Points — Cairo and Giza","2026-06-15 08:00:00+02",5,40,
             "Community Outreach, Event Planning","upcoming",1),

            # ── Red Crescent (org 2, supervisors 3 & 4) ──
            (4,  2, "National Blood Donation Drive — Spring",
             "Biannual blood donation campaign across 12 governorates.",
             "Multiple Sites — Cairo, Giza, Alexandria","2026-05-05 08:00:00+02",7,60,
             "Medical / First Aid, Community Outreach","upcoming",3),
            (5,  2, "Winter Aid Distribution — Alexandria",
             "Distribution of 1,000+ winter kits to displaced families.",
             "Borg El-Arab, Alexandria","2025-12-20 07:00:00+02",8,35,
             "Community Outreach, Event Planning","completed",3),
            (8,  2, "Medical Volunteer Training — Cairo",
             "Hands-on first-aid and triage skills workshop for new medical volunteers.",
             "Egyptian Red Crescent HQ, Nasr City","2026-04-12 09:00:00+02",6,20,
             "Medical / First Aid, Community Outreach","completed",4),
            (9,  2, "Emergency Response Drill — June",
             "Full-scale emergency simulation training across four field teams in Greater Cairo.",
             "Maadi Civil Defence Training Ground","2026-06-08 07:30:00+02",8,40,
             "Medical / First Aid, Community Outreach","upcoming",4),
            (13, 2, "Refugee Support Day — Ain Shams",
             "Legal support, health screening, and psychosocial sessions for urban refugees.",
             "Ain Shams Community Centre, Cairo","2026-05-28 09:00:00+02",6,25,
             "Community Outreach, Medical / First Aid, Translation","upcoming",3),
            (34, 2, "Field Volunteer Induction — Batch 4",
             "Full-day onboarding for 20 new field volunteers: Red Crescent protocols, safety, and team roles.",
             "Egyptian Red Crescent HQ, Nasr City","2026-03-18 09:00:00+02",7,20,
             "Community Outreach, Administrative Support","completed",3),
            (35, 2, "Mobile Medical Unit — Beni Suef",
             "Three-day mobile clinic providing free consultations, dressings, and medication to rural communities.",
             "Beni Suef Governorate — 5-village circuit","2026-02-10 07:00:00+02",9,18,
             "Medical / First Aid, Community Outreach","completed",3),
            (36, 2, "International Humanitarian Law Workshop",
             "Half-day workshop on IHL principles for Red Crescent field staff and senior volunteers.",
             "Egyptian Red Crescent HQ, Nasr City","2026-07-05 09:00:00+02",4,25,
             "Teaching / Tutoring, Administrative Support","upcoming",3),
            (14, 2, "First Aid Awareness Week — Schools Tour",
             "5-school tour delivering first-aid awareness sessions to secondary students.",
             "Various Schools — Nasr City & Heliopolis","2026-03-02 09:00:00+02",4,15,
             "Medical / First Aid, Teaching / Tutoring","completed",4),
            (18, 2, "Community Health Screening — Shubra",
             "Free health screening and consultation for 300+ residents including blood pressure, diabetes, and BMI checks.",
             "Shubra El-Kheima Community Center, Cairo","2026-05-22 08:00:00+02",6,30,
             "Medical / First Aid, Community Outreach","upcoming",11),
            (19, 2, "Flood Relief — Aswan Response",
             "Emergency relief operations providing water, food, and hygiene kits to flood-affected families.",
             "Aswan Governorate Relief Depot","2026-05-16 06:00:00+02",10,50,
             "Community Outreach, Event Planning","active",12),
            (20, 2, "Mental Health Awareness Campaign",
             "Awareness sessions and resource distribution across 8 university campuses in Cairo.",
             "Multiple Campuses — Cairo University, Ain Shams, AUC","2026-06-15 10:00:00+02",5,20,
             "Community Outreach, Teaching / Tutoring","upcoming",13),
            (21, 2, "Ramadan Medical Convoy — Sohag",
             "Mobile clinic providing free medical consultations and medication to 500+ villagers.",
             "Sohag Governorate — Rural Villages Circuit","2026-02-28 07:00:00+02",9,25,
             "Medical / First Aid, Community Outreach","completed",14),
            (22, 2, "Volunteer Skills Development — Triage & CPR",
             "Certified CPR and triage training workshop for Red Crescent field volunteers.",
             "Egyptian Red Crescent Training Centre, Maadi","2026-05-18 09:00:00+02",6,18,
             "Medical / First Aid","active",15),
            (23, 2, "Child Protection Awareness Day",
             "Interactive sessions for schools on child rights, safety, and reporting mechanisms.",
             "Various Primary Schools — Heliopolis & Nasr City","2026-04-20 09:00:00+02",5,12,
             "Teaching / Tutoring, Community Outreach","completed",16),
            (24, 2, "Water Sanitation Drive — Fayoum",
             "Installation of clean water filtration units and hygiene kits for 200 households in rural Fayoum.",
             "Fayoum Governorate — El Agameya Village","2026-07-10 07:00:00+02",8,30,
             "Community Outreach, Environmental Work","upcoming",11),
            (25, 2, "Psychosocial Support Training — Field Staff",
             "Specialized training for Red Crescent field staff on trauma-informed support and stress management.",
             "Egyptian Red Crescent HQ, Nasr City","2026-07-22 09:00:00+02",7,20,
             "Teaching / Tutoring, Medical / First Aid","upcoming",12),
            (26, 2, "Elderly Care Home Visits — Ramadan",
             "Weekly visits to 5 elder care facilities providing meals, companionship, and medical checks.",
             "Multiple Care Homes — Cairo and Giza","2026-03-10 10:00:00+02",4,15,
             "Medical / First Aid, Community Outreach","completed",13),
            (27, 2, "Disaster Preparedness Fair — Port Said",
             "Public awareness fair on earthquake, flood, and fire preparedness for 1,000+ attendees.",
             "Port Said Cultural Palace","2026-06-28 09:00:00+02",6,25,
             "Community Outreach, Event Planning","upcoming",14),
            (28, 2, "Mobile Blood Bank — Mansoura University",
             "On-campus mobile blood donation unit targeting 500 student donors.",
             "Mansoura University Main Campus","2026-05-16 08:00:00+02",5,20,
             "Medical / First Aid","active",15),
            (29, 2, "Nutrition Awareness Campaign — Assiut",
             "Educational sessions on maternal and child nutrition in collaboration with local clinics.",
             "Assiut Governorate Health Directorate","2026-04-03 09:00:00+02",5,18,
             "Medical / First Aid, Teaching / Tutoring","completed",16),
            (30, 2, "Search & Rescue Skills Camp — Suez",
             "Three-day residential training on search and rescue techniques for advanced volunteers.",
             "Suez Canal Authority Training Facility","2026-08-05 07:00:00+02",24,35,
             "Medical / First Aid, Community Outreach","upcoming",3),
            (31, 2, "Vaccination Support Drive — Greater Cairo",
             "Logistical and outreach support for Ministry of Health vaccination campaign across 10 districts.",
             "Multiple Health Units — Cairo and Giza","2026-05-16 08:30:00+02",6,40,
             "Medical / First Aid, Community Outreach","active",4),
            (32, 2, "Legal Aid Clinic — Refugees — Zamalek",
             "Free legal consultation sessions for registered refugees on residency and documentation.",
             "UNHCR Partner Office, Zamalek, Cairo","2026-01-18 10:00:00+02",4,10,
             "Translation, Community Outreach","completed",9),
            (33, 2, "Annual Volunteer Appreciation Gala",
             "Ceremony recognising top-performing volunteers with certificates, awards, and networking.",
             "Cairo Marriott Hotel, Zamalek","2026-09-12 18:00:00+02",5,30,
             "Event Planning, Administrative Support","upcoming",11),
            (37, 2, "Mass Casualty Simulation — October",
             "Realistic mass-casualty incident drill testing triage, evacuation, and inter-team coordination for 60 volunteers.",
             "Egyptian Red Crescent Training Centre, Maadi","2025-10-14 07:00:00+02",8,30,
             "Medical / First Aid, Community Outreach","completed",3),
            (38, 2, "Winter Blood Drive — Mansoura & Tanta",
             "Multi-city blood donation campaign coordinated with Delta region hospitals to address winter shortages.",
             "Mansoura University Hospital & Tanta Blood Bank","2025-11-22 08:00:00+02",6,45,
             "Medical / First Aid, Community Outreach","completed",3),

            # ── Enactus (org 3, supervisors 5 & 6) ──
            (6,  3, "Entrepreneurship Bootcamp — Spring",
             "Three-day bootcamp for student entrepreneurs: business modeling and pitching.",
             "AUC New Cairo Campus","2026-05-15 09:00:00+02",8,25,
             "Teaching / Tutoring, Event Planning","upcoming",5),
            (7,  3, "Digital Skills for Women — Shubra",
             "Free digital literacy and e-commerce training for women entrepreneurs.",
             "Shubra Community Hall, Cairo","2026-04-05 10:00:00+02",5,20,
             "Teaching / Tutoring, Software Development","completed",5),
            (15, 3, "Social Innovation Hackathon",
             "48-hour hackathon challenging student teams to solve local community problems.",
             "GrEEK Campus, Maadi, Cairo","2026-06-20 09:00:00+02",10,30,
             "Software Development, Event Planning, Community Outreach","upcoming",6),
            (16, 3, "Micro-Enterprise Fair — Dokki",
             "Showcasing 20 student-led micro-enterprises to potential investors and mentors.",
             "Cairo Chamber of Commerce, Dokki","2026-04-25 10:00:00+02",5,15,
             "Event Planning, Fundraising, Administrative Support","completed",6),
            (17, 3, "Financial Literacy Workshop — Mansoura",
             "Day workshop on personal finance and budgeting for university students.",
             "Mansoura University Student Union","2026-05-08 09:00:00+02",4,10,
             "Teaching / Tutoring, Administrative Support","completed",5),
        ]
        _executemany(db,
            "INSERT INTO events (id, org_id, name, description, location, starts_at, duration, "
            "max_volunteers, required_skills, status, created_by_supervisor_id) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            events,
        )

        # ──────────── EVENT APPLICATIONS ────────────
        # (id, volunteer_id, event_id, status, created_at)
        apps = [
            # Event 1 — Ramadan Food Drive (completed)
            (1,  1,1,"approved","2026-02-20 10:00:00"),
            (2,  2,1,"approved","2026-02-21 11:30:00"),
            (3,  5,1,"approved","2026-02-22 09:15:00"),
            (4, 13,1,"approved","2026-02-23 14:00:00"),
            (5,  8,1,"approved","2026-02-23 16:45:00"),
            (6, 18,1,"approved","2026-02-24 09:00:00"),
            (7, 21,1,"approved","2026-02-25 10:30:00"),
            (8, 11,1,"rejected","2026-02-25 14:00:00"),

            # Event 2 — Youth Leadership Forum (upcoming)
            (9,  1,2,"pending", "2026-04-13 10:00:00"),
            (10, 2,2,"approved","2026-04-10 12:00:00"),
            (11,11,2,"pending", "2026-04-14 09:00:00"),
            (12, 4,2,"approved","2026-04-11 17:30:00"),
            (13,17,2,"approved","2026-04-12 08:00:00"),
            (14,25,2,"pending", "2026-04-15 11:00:00"),

            # Event 3 — Onboarding Workshop (completed)
            (15, 1,3,"approved","2026-03-30 10:00:00"),
            (16, 4,3,"approved","2026-03-31 11:00:00"),
            (17, 5,3,"approved","2026-04-01 09:30:00"),
            (18,13,3,"approved","2026-04-01 10:00:00"),
            (19,18,3,"approved","2026-04-02 08:30:00"),

            # Event 4 — Blood Donation Drive (upcoming)
            (20,  1,4,"pending", "2026-04-13 10:05:00"),
            (21, 10,4,"approved","2026-04-08 14:00:00"),
            (22,  6,4,"approved","2026-04-09 09:00:00"),
            (23,  9,4,"pending", "2026-04-15 11:00:00"),
            (24, 16,4,"approved","2026-04-10 08:00:00"),
            (25, 24,4,"approved","2026-04-11 09:30:00"),
            (26, 12,4,"rejected","2026-04-16 12:30:00"),

            # Event 5 — Winter Aid (completed)
            (27,  6,5,"approved","2025-12-01 09:00:00"),
            (28,  7,5,"approved","2025-12-02 10:00:00"),
            (29, 10,5,"approved","2025-12-03 11:00:00"),
            (30,  1,5,"approved","2025-12-05 14:00:00"),
            (31, 19,5,"approved","2025-12-04 09:00:00"),
            (32, 23,5,"approved","2025-12-06 10:00:00"),

            # Event 6 — Entrepreneurship Bootcamp (upcoming)
            (33, 10,6,"approved","2026-04-10 09:00:00"),
            (34, 11,6,"pending", "2026-04-13 12:00:00"),
            (35, 12,6,"approved","2026-04-11 10:30:00"),
            (36,  4,6,"pending", "2026-04-14 16:00:00"),
            (37, 15,6,"approved","2026-04-09 08:00:00"),
            (38, 22,6,"approved","2026-04-10 10:00:00"),

            # Event 7 — Digital Skills (completed)
            (39,  4,7,"approved","2026-03-25 10:00:00"),
            (40, 10,7,"approved","2026-03-26 11:00:00"),
            (41, 12,7,"approved","2026-03-28 09:30:00"),
            (42, 14,7,"approved","2026-03-27 14:00:00"),
            (43, 22,7,"approved","2026-03-29 09:00:00"),

            # Event 8 — Medical Training (completed)
            (44,  1,8,"approved","2026-03-20 10:00:00"),
            (45, 10,8,"approved","2026-03-21 09:30:00"),
            (46,  6,8,"approved","2026-03-22 11:00:00"),
            (47,  9,8,"approved","2026-03-23 14:00:00"),
            (48,  7,8,"approved","2026-03-24 09:00:00"),
            (49, 16,8,"approved","2026-03-22 08:00:00"),
            (50, 24,8,"approved","2026-03-23 10:00:00"),

            # Event 9 — Emergency Response Drill (upcoming)
            (51,  1,9,"pending", "2026-05-10 10:00:00"),
            (52, 10,9,"approved","2026-05-08 09:00:00"),
            (53,  6,9,"approved","2026-05-09 11:00:00"),
            (54,  9,9,"pending", "2026-05-11 14:00:00"),
            (55,  7,9,"pending", "2026-05-12 10:30:00"),
            (56,  2,9,"approved","2026-05-07 15:00:00"),
            (57, 19,9,"approved","2026-05-08 12:00:00"),
            (58, 23,9,"approved","2026-05-09 08:30:00"),

            # Event 10 — Summer Literacy Camp (upcoming)
            (59,  9,10,"pending", "2026-05-20 10:00:00"),
            (60, 22,10,"approved","2026-05-18 09:00:00"),
            (61, 14,10,"approved","2026-05-19 11:00:00"),
            (62,  1,10,"pending", "2026-05-21 14:00:00"),

            # Event 11 — Social Media Day (completed)
            (63,  3,11,"approved","2026-04-28 10:00:00"),
            (64,  8,11,"approved","2026-04-29 09:00:00"),
            (65, 17,11,"approved","2026-04-28 12:00:00"),
            (66, 20,11,"approved","2026-04-30 08:00:00"),

            # Event 12 — Eid Clothes Drive (upcoming)
            (67, 13,12,"approved","2026-05-25 10:00:00"),
            (68,  5,12,"approved","2026-05-26 09:00:00"),
            (69, 18,12,"pending", "2026-05-27 11:00:00"),
            (70, 21,12,"pending", "2026-05-28 14:00:00"),

            # Event 13 — Refugee Support Day (upcoming)
            (71,  7,13,"approved","2026-05-10 09:00:00"),
            (72, 16,13,"approved","2026-05-11 10:00:00"),
            (73, 24,13,"approved","2026-05-12 08:30:00"),
            (74, 23,13,"pending", "2026-05-13 11:00:00"),
            (75, 19,13,"pending", "2026-05-14 14:00:00"),

            # Event 14 — First Aid Schools Tour (completed)
            (76, 10,14,"approved","2026-02-20 09:00:00"),
            (77, 16,14,"approved","2026-02-21 10:00:00"),
            (78, 24,14,"approved","2026-02-22 08:30:00"),
            (79,  9,14,"approved","2026-02-23 09:00:00"),

            # Event 30 — Search & Rescue Camp (upcoming, supervisor 3 = Ahmed El-Masry)
            (91,  1,30,"approved","2026-06-10 09:00:00"),
            (92,  6,30,"approved","2026-06-11 10:00:00"),
            (93, 10,30,"pending", "2026-06-12 11:00:00"),
            (94,  7,30,"approved","2026-06-13 09:30:00"),
            (95, 16,30,"pending", "2026-06-14 14:00:00"),
            (96, 24,30,"approved","2026-06-15 08:00:00"),
            (97, 19,30,"pending", "2026-06-16 10:00:00"),
            (98,  9,30,"approved","2026-06-17 11:30:00"),
            (99, 13,30,"pending", "2026-06-18 08:00:00"),
            (100,25,30,"approved","2026-06-19 09:30:00"),

            # Event 34 — Field Volunteer Induction (completed, supervisor 3)
            (101, 1,34,"approved","2026-03-05 09:00:00"),
            (102, 6,34,"approved","2026-03-06 10:00:00"),
            (103, 7,34,"approved","2026-03-07 11:00:00"),
            (104,10,34,"approved","2026-03-08 09:30:00"),
            (105,16,34,"approved","2026-03-08 14:00:00"),
            (106,19,34,"approved","2026-03-09 08:00:00"),
            (107,23,34,"approved","2026-03-09 10:00:00"),
            (108,24,34,"approved","2026-03-10 09:00:00"),
            (109,25,34,"rejected","2026-03-10 11:00:00"),

            # Event 35 — Mobile Medical Unit (completed, supervisor 3)
            (110, 6,35,"approved","2026-01-28 09:00:00"),
            (111,10,35,"approved","2026-01-29 10:00:00"),
            (112,16,35,"approved","2026-01-30 08:30:00"),
            (113, 9,35,"approved","2026-01-30 11:00:00"),
            (114,24,35,"approved","2026-01-31 09:00:00"),
            (115,19,35,"approved","2026-01-31 14:00:00"),

            # Event 36 — IHL Workshop (upcoming, supervisor 3)
            (116, 1,36,"pending", "2026-06-20 09:00:00"),
            (117, 6,36,"approved","2026-06-21 10:00:00"),
            (118, 7,36,"pending", "2026-06-22 11:00:00"),
            (119,10,36,"approved","2026-06-23 09:30:00"),
            (120,13,36,"approved","2026-06-24 14:00:00"),
            (121,16,36,"pending", "2026-06-25 08:00:00"),

            # Event 15 — Social Innovation Hackathon (upcoming)
            (80, 15,15,"approved","2026-05-22 10:00:00"),
            (81,  4,15,"pending", "2026-05-23 09:00:00"),
            (82, 11,15,"approved","2026-05-24 11:00:00"),
            (83, 21,15,"pending", "2026-05-25 14:00:00"),

            # Event 16 — Micro-Enterprise Fair (completed)
            (84, 11,16,"approved","2026-04-10 09:00:00"),
            (85, 18,16,"approved","2026-04-11 10:00:00"),
            (86, 21,16,"approved","2026-04-12 08:30:00"),
            (87, 15,16,"approved","2026-04-13 09:00:00"),

            # Event 17 — Financial Literacy (completed)
            (88, 22,17,"approved","2026-04-25 09:00:00"),
            (89,  9,17,"approved","2026-04-26 10:00:00"),
            (90, 12,17,"approved","2026-04-27 08:30:00"),

            # Event 37 — Mass Casualty Simulation (completed, supervisor 3 Ahmed El-Masry)
            (122, 1,37,"approved","2025-09-20 09:00:00"),
            (123, 6,37,"approved","2025-09-21 10:00:00"),
            (124, 7,37,"approved","2025-09-22 11:00:00"),
            (125,10,37,"approved","2025-09-23 09:30:00"),
            (126,16,37,"approved","2025-09-24 14:00:00"),
            (127,19,37,"approved","2025-09-25 08:00:00"),
            (128,23,37,"approved","2025-09-26 10:00:00"),
            (129,24,37,"approved","2025-09-27 09:00:00"),
            (130,25,37,"approved","2025-09-28 11:00:00"),
            (131, 9,37,"approved","2025-09-28 13:00:00"),
            (132,13,37,"rejected","2025-09-29 09:00:00"),

            # Event 38 — Winter Blood Drive (completed, supervisor 3 Ahmed El-Masry)
            (133, 1,38,"approved","2025-10-15 08:00:00"),
            (134, 6,38,"approved","2025-10-16 09:00:00"),
            (135, 7,38,"approved","2025-10-17 10:00:00"),
            (136,10,38,"approved","2025-10-18 08:30:00"),
            (137,16,38,"approved","2025-10-19 09:00:00"),
            (138,19,38,"approved","2025-10-20 11:00:00"),
            (139,23,38,"approved","2025-10-21 08:00:00"),
            (140,24,38,"approved","2025-10-22 10:00:00"),
            (141,25,38,"approved","2025-10-23 09:00:00"),
            (142, 9,38,"approved","2025-10-24 11:30:00"),
            (143,13,38,"approved","2025-10-25 08:00:00"),
            (144,15,38,"approved","2025-10-26 09:00:00"),
        ]
        _executemany(db,
            "INSERT INTO event_applications (id, volunteer_id, event_id, status, created_at) "
            "VALUES (%s, %s, %s, %s, %s)",
            apps,
        )

        # ──────────── ACTIVITIES ────────────
        # (id, volunteer_id, event_id, org_id, date, hours, description, status)
        activities = [
            # Event 1 — Ramadan Food Drive
            (1,  1,1,1,"2026-03-15",8,"Coordinated 6 volunteers for package sorting in Ain Shams; delivered to 80 families.","approved"),
            (2,  2,1,1,"2026-03-15",8,"Volunteer scheduling across 5 distribution zones for 48 volunteers.","approved"),
            (3,  5,1,1,"2026-03-15",8,"Petty cash and expense tracking; reconciled all receipts.","approved"),
            (4, 13,1,1,"2026-03-15",8,"Led outreach zone in Shubra; managed 8 field volunteers.","approved"),
            (5,  8,1,1,"2026-03-14",4,"Designed banners and social posts for the food drive launch.","approved"),
            (6, 18,1,1,"2026-03-15",8,"Operations coordination across 3 distribution warehouses.","approved"),
            (7, 21,1,1,"2026-03-15",8,"Fundraising collection stand at Resala HQ gate.","approved"),

            # Event 3 — Onboarding Workshop
            (8,  1,3,1,"2026-04-08",5,"Facilitated two onboarding sessions for 14 new volunteers.","approved"),
            (9,  4,3,1,"2026-04-08",5,"Set up digital check-in system on tablets.","approved"),
            (10, 5,3,1,"2026-04-08",5,"Budgeting basics workshop for new volunteers.","approved"),
            (11,13,3,1,"2026-04-08",5,"Welcome desk management and registration support.","approved"),
            (12,18,3,1,"2026-04-08",5,"Delivered 'Volunteer Rights & Responsibilities' module.","approved"),

            # Event 2 — Youth Leadership Forum (pending/upcoming prep)
            (13, 2,2,1,"2026-04-25",3,"Pre-event planning session for the Youth Leadership Forum.","pending"),
            (14,17,2,1,"2026-04-28",3,"Visual identity drafts and print materials for the Forum.","pending"),

            # Event 11 — Social Media Day
            (15, 3,11,1,"2026-05-10",4,"Filmed recap video and managed live Instagram coverage.","approved"),
            (16, 8,11,1,"2026-05-10",4,"Designed 12 branded social graphics for campaign launch.","approved"),
            (17,17,11,1,"2026-05-10",4,"Photographed all sessions and published 80+ edited images.","approved"),
            (18,20,11,1,"2026-05-10",4,"Social media scheduling and analytics reporting.","approved"),

            # Event 12 — Eid Clothes Drive (upcoming prep)
            (19,13,12,1,"2026-05-30",3,"Coordination meeting for drop-point volunteers.","pending"),
            (20,18,12,1,"2026-06-01",4,"Logistics planning: truck routing and collection schedule.","pending"),

            # Event 5 — Winter Aid
            (21, 6,5,2,"2025-12-20",8,"Truck loading and route planning; supervised 8 field volunteers.","approved"),
            (22, 7,5,2,"2025-12-20",8,"Post-distribution surveys with 50 recipient families.","approved"),
            (23,10,5,2,"2025-12-20",8,"First aid support during long field day.","approved"),
            (24, 1,5,2,"2025-12-20",8,"Managed donor registration at Borg El-Arab.","approved"),
            (25,19,5,2,"2025-12-20",8,"Coordinated loading teams and waste sorting at distribution site.","approved"),
            (26,23,5,2,"2025-12-20",8,"Legal documentation and family registration for aid recipients.","approved"),

            # Event 8 — Medical Training
            (27, 1,8,2,"2026-04-12",6,"Led triage simulation station; assessed 25 trainees.","approved"),
            (28,10,8,2,"2026-04-12",6,"Ran CPR and AED demo sessions for 20 medical volunteers.","approved"),
            (29, 6,8,2,"2026-04-12",6,"Coordinated equipment setup and managed supply checklist.","approved"),
            (30, 9,8,2,"2026-04-12",6,"Conducted post-training evaluations and skills report.","approved"),
            (31, 7,8,2,"2026-04-12",6,"Assisted logistics; transported and stocked medical kits.","approved"),
            (32,16,8,2,"2026-04-12",6,"Observed and assisted in all four first-aid stations.","approved"),
            (33,24,8,2,"2026-04-12",6,"Supported CPR station; completed pharmacy triage checklist.","approved"),

            # Event 14 — First Aid Schools Tour
            (34,10,14,2,"2026-03-02",4,"Delivered first-aid session to 120 students at Nasr City school.","approved"),
            (35,16,14,2,"2026-03-03",4,"Ran choking and bandaging demos at Heliopolis school.","approved"),
            (36,24,14,2,"2026-03-04",4,"Health screening and Q&A at two Nasr City secondary schools.","approved"),
            (37, 9,14,2,"2026-03-05",4,"Facilitated interactive first-aid quiz sessions.","approved"),

            # Event 4 — Blood Donation (upcoming prep)
            (38,10,4,2,"2026-04-25",3,"Training session for new medical-support volunteers.","approved"),
            (39, 6,4,2,"2026-04-15",4,"Pre-event logistics planning for blood donation sites.","approved"),
            (40, 9,4,2,"2026-04-22",3,"University outreach to recruit blood donors.","approved"),

            # Event 9 — Emergency Response Drill (upcoming prep)
            (41,10,9,2,"2026-05-20",4,"Pre-drill briefing: team assignments and protocol review.","pending"),
            (42, 6,9,2,"2026-05-22",3,"Site preparation: zone marking and equipment distribution.","pending"),
            (43, 1,9,2,"2026-05-25",3,"Volunteer coordination and role confirmations.","pending"),

            # Event 13 — Refugee Support Day (upcoming prep)
            (44, 7,13,2,"2026-05-15",3,"Translation briefing for three language support teams.","approved"),
            (45,16,13,2,"2026-05-16",3,"Health screening protocol walkthrough with medical team.","approved"),
            (46,23,13,2,"2026-05-17",2,"Legal intake form preparation for refugee clients.","approved"),

            # Event 7 — Digital Skills for Women
            (47, 4,7,3,"2026-04-05",5,"Taught e-commerce basics to 18 women entrepreneurs.","approved"),
            (48,10,7,3,"2026-04-05",5,"Computer literacy: email, Docs, WhatsApp Business.","approved"),
            (49,12,7,3,"2026-04-05",5,"Assisted coordination and Arabic translation of materials.","approved"),
            (50,14,7,3,"2026-04-05",5,"Graphic design module: Canva for small business owners.","approved"),
            (51,22,7,3,"2026-04-05",5,"Classroom management and participant registration.","approved"),

            # Event 16 — Micro-Enterprise Fair
            (52,11,16,3,"2026-04-25",5,"Pitch coaching for 5 student teams on fair day.","approved"),
            (53,18,16,3,"2026-04-25",5,"Managed investor registration and welcome desk.","approved"),
            (54,21,16,3,"2026-04-25",5,"Fundraising pitches and donor relationship management.","approved"),
            (55,15,16,3,"2026-04-25",5,"Tech demo setup and troubleshooting for student exhibitors.","approved"),

            # Event 17 — Financial Literacy
            (56,22,17,3,"2026-05-08",4,"Delivered budgeting module to 30 university students.","approved"),
            (57, 9,17,3,"2026-05-08",4,"Facilitated savings and investment Q&A session.","approved"),
            (58,12,17,3,"2026-05-08",4,"Translation of workshop materials into English.","approved"),

            # Event 30 — Search & Rescue Camp (Ahmed El-Masry, upcoming prep — auto-approved)
            (64, 1,30,2,"2026-07-20",4,"Pre-camp volunteer briefing and equipment allocation.","approved"),
            (65, 6,30,2,"2026-07-22",3,"Site reconnaissance at Suez facility; mapped four training zones.","approved"),
            (66,10,30,2,"2026-07-24",4,"CPR and rescue technique pre-assessment for camp participants.","approved"),
            (67, 7,30,2,"2026-07-25",3,"Admin: liability forms, ID collection, and attendance roster.","approved"),

            # Event 4 — Blood Donation (extra activities, Ahmed El-Masry)
            (68,19,4,2,"2026-04-18",3,"University outreach at Heliopolis campus; signed up 60 donors.","approved"),
            (69,23,4,2,"2026-04-20",3,"Translated donor consent forms into French for expat donors.","approved"),
            (70,24,4,2,"2026-04-22",4,"Pre-event medical readiness check across 3 donation sites.","approved"),

            # Event 13 — Refugee Support Day (extra activities, Ahmed El-Masry — auto-approved)
            (71,25,13,2,"2026-05-20",3,"Community outreach to refugee families for event registration.","approved"),
            (72,13,13,2,"2026-05-21",2,"Venue setup: signage, flow plan, and translator station prep.","approved"),

            # Event 34 — Field Volunteer Induction (completed, Ahmed El-Masry)
            (73, 1,34,2,"2026-03-18",7,"Facilitated orientation module on Red Crescent field protocols.","approved"),
            (74, 6,34,2,"2026-03-18",7,"Led safety briefing and emergency evacuation drill.","approved"),
            (75, 7,34,2,"2026-03-18",7,"Ran Q&A session on volunteer rights and code of conduct.","approved"),
            (76,10,34,2,"2026-03-18",7,"Delivered first-aid readiness assessment to 20 inductees.","approved"),
            (77,16,34,2,"2026-03-18",7,"Coordinated catering, venue logistics, and attendance records.","approved"),
            (78,19,34,2,"2026-03-18",7,"Managed ID verification and badge distribution.","approved"),
            (79,23,34,2,"2026-03-18",7,"Assisted with Arabic–English translation of training materials.","approved"),
            (80,24,34,2,"2026-03-18",7,"Conducted post-induction skills survey and compiled report.","approved"),

            # Event 35 — Mobile Medical Unit (completed, Ahmed El-Masry)
            (81, 6,35,2,"2026-02-10",9,"Triaged patients and administered wound care across 3 villages.","approved"),
            (82,10,35,2,"2026-02-10",9,"Ran diabetes and blood pressure screening for 200+ patients.","approved"),
            (83,16,35,2,"2026-02-11",9,"Dispensed medications and managed pharmacy supply log.","approved"),
            (84, 9,35,2,"2026-02-11",9,"Conducted maternal health consultations at two village clinics.","approved"),
            (85,24,35,2,"2026-02-12",9,"Administered vaccinations and updated health record cards.","approved"),
            (86,19,35,2,"2026-02-12",9,"Logistics: cold-chain transport and supply restocking.","approved"),

            # Event 36 — IHL Workshop (upcoming prep, Ahmed El-Masry — auto-approved)
            (87, 6,36,2,"2026-06-28",3,"Compiled IHL case studies and prepared printed materials.","approved"),
            (88,10,36,2,"2026-06-30",2,"Coordinated speaker schedule and venue logistics.","approved"),

            # Event 37 — Mass Casualty Simulation (completed, Ahmed El-Masry — auto-approved)
            (89, 1,37,2,"2025-10-14",8,"Led triage station Alpha; processed 18 simulated casualties.","approved"),
            (90, 6,37,2,"2025-10-14",8,"Ran CPR and airway management drills at casualty station Bravo.","approved"),
            (91, 7,37,2,"2025-10-14",8,"Coordinated evacuation relay and transport simulation logistics.","approved"),
            (92,10,37,2,"2025-10-14",8,"Managed medical supply inventory and restocking during drill.","approved"),
            (93,16,37,2,"2025-10-14",8,"Communications relay officer between field teams and command.","approved"),
            (94,19,37,2,"2025-10-14",8,"Documented all casualty tags and final debrief report.","approved"),
            (95,23,37,2,"2025-10-14",8,"Provided translation support for international observer team.","approved"),
            (96,24,37,2,"2025-10-14",8,"First-aid station lead: wound dressing and vital monitoring.","approved"),
            (97,25,37,2,"2025-10-14",8,"Logistics: equipment transport, tent setup, and teardown.","approved"),
            (98, 9,37,2,"2025-10-14",8,"Acted as simulated patient and post-drill scenario analyst.","approved"),

            # Event 38 — Winter Blood Drive (completed, Ahmed El-Masry — auto-approved)
            (99, 1,38,2,"2025-11-22",6,"Registration desk management and donor ID verification — Mansoura site.","approved"),
            (100, 6,38,2,"2025-11-22",6,"Pre-donation health screening and blood pressure checks.","approved"),
            (101, 7,38,2,"2025-11-22",6,"Donor recruitment outreach on Mansoura University campus.","approved"),
            (102,10,38,2,"2025-11-22",6,"Medical oversight of donation process; monitored 40 donors.","approved"),
            (103,16,38,2,"2025-11-23",6,"Coordinated Tanta Blood Bank site logistics and volunteer schedule.","approved"),
            (104,19,38,2,"2025-11-23",6,"Post-donation refreshment and recovery area management.","approved"),
            (105,23,38,2,"2025-11-23",6,"Data entry: donor records, blood units collected, hospital dispatch.","approved"),
            (106,24,38,2,"2025-11-23",6,"Liaised with hospital procurement team on collection targets.","approved"),
            (107,25,38,2,"2025-11-23",6,"Social media coverage and real-time updates during drive.","approved"),
            (108, 9,38,2,"2025-11-23",6,"Phlebotomy assistance under medical supervision.","approved"),
            (109,13,38,2,"2025-11-23",6,"Volunteer coordination and shift handover documentation.","approved"),
            (110,15,38,2,"2025-11-22",6,"Event planning and pre-drive logistics coordination.","approved"),

            # Event 6 — Entrepreneurship Bootcamp (upcoming prep)
            (59,15,6,3,"2026-05-01",4,"Tech infrastructure setup for bootcamp demo stations.","pending"),
            (60,10,6,3,"2026-04-20",4,"Mentor-prep session for the upcoming bootcamp.","pending"),
            (61,11,6,3,"2026-05-02",4,"Curriculum prep for entrepreneurship workshop modules.","pending"),

            # Event 15 — Social Innovation Hackathon (upcoming prep)
            (62,15,15,3,"2026-06-10",4,"Platform setup and team registration portal development.","pending"),
            (63,11,15,3,"2026-06-12",3,"Mentor coordination and judging criteria prep.","pending"),
        ]
        _executemany(db,
            "INSERT INTO activities (id, volunteer_id, event_id, org_id, date, hours, description, status) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT DO NOTHING",
            activities,
        )

        # ──────────── CERTIFICATES ────────────
        # (id, volunteer_id, org_id, event_id, type, hours, issued_date)
        certificates = [
            # Resala certificates
            (1,  1,1,1,"achievement",  8,"2026-03-20"),
            (2,  2,1,1,"achievement",  8,"2026-03-20"),
            (3,  5,1,1,"participation",8,"2026-03-20"),
            (4, 13,1,1,"achievement",  8,"2026-03-20"),
            (5, 18,1,1,"completion",   8,"2026-03-20"),
            (6, 21,1,1,"completion",   8,"2026-03-20"),
            (7,  1,1,3,"completion",   5,"2026-04-15"),
            (8,  4,1,3,"completion",   5,"2026-04-15"),
            (9,  5,1,3,"completion",   5,"2026-04-15"),
            (10, 3,1,11,"achievement", 4,"2026-05-12"),
            (11, 8,1,11,"achievement", 4,"2026-05-12"),
            (12,17,1,11,"completion",  4,"2026-05-12"),
            (13,20,1,11,"completion",  4,"2026-05-12"),

            # Red Crescent certificates
            (14, 1,2,5,"completion",   8,"2025-12-28"),
            (15, 6,2,5,"achievement",  8,"2025-12-28"),
            (16, 7,2,5,"completion",   8,"2025-12-28"),
            (17,10,2,5,"completion",   8,"2025-12-28"),
            (18,19,2,5,"completion",   8,"2025-12-28"),
            (19,23,2,5,"participation",8,"2025-12-28"),
            (20, 1,2,8,"achievement",  6,"2026-04-18"),
            (21,10,2,8,"achievement",  6,"2026-04-18"),
            (22, 6,2,8,"completion",   6,"2026-04-18"),
            (23, 9,2,8,"completion",   6,"2026-04-18"),
            (24, 7,2,8,"completion",   6,"2026-04-18"),
            (25,16,2,8,"completion",   6,"2026-04-18"),
            (26,24,2,8,"completion",   6,"2026-04-18"),
            (27,10,2,14,"achievement", 4,"2026-03-08"),
            (28,16,2,14,"achievement", 4,"2026-03-08"),
            (29,24,2,14,"completion",  4,"2026-03-08"),
            (30, 9,2,14,"completion",  4,"2026-03-08"),

            # Red Crescent — Event 34: Field Volunteer Induction (Ahmed El-Masry)
            (43, 1,2,34,"completion",  7,"2026-03-22"),
            (44, 6,2,34,"achievement", 7,"2026-03-22"),
            (45, 7,2,34,"completion",  7,"2026-03-22"),
            (46,10,2,34,"achievement", 7,"2026-03-22"),
            (47,16,2,34,"completion",  7,"2026-03-22"),
            (48,19,2,34,"completion",  7,"2026-03-22"),
            (49,23,2,34,"completion",  7,"2026-03-22"),
            (50,24,2,34,"completion",  7,"2026-03-22"),

            # Red Crescent — Event 35: Mobile Medical Unit (Ahmed El-Masry)
            (51, 6,2,35,"achievement", 9,"2026-02-18"),
            (52,10,2,35,"achievement", 9,"2026-02-18"),
            (53,16,2,35,"completion",  9,"2026-02-18"),
            (54, 9,2,35,"completion",  9,"2026-02-18"),
            (55,24,2,35,"completion",  9,"2026-02-18"),
            (56,19,2,35,"completion",  9,"2026-02-18"),

            # Red Crescent — Event 37: Mass Casualty Simulation (Ahmed El-Masry)
            (57, 1,2,37,"achievement", 8,"2025-10-20"),
            (58, 6,2,37,"achievement", 8,"2025-10-20"),
            (59, 7,2,37,"completion",  8,"2025-10-20"),
            (60,10,2,37,"achievement", 8,"2025-10-20"),
            (61,16,2,37,"completion",  8,"2025-10-20"),
            (62,19,2,37,"completion",  8,"2025-10-20"),
            (63,23,2,37,"completion",  8,"2025-10-20"),
            (64,24,2,37,"completion",  8,"2025-10-20"),
            (65,25,2,37,"completion",  8,"2025-10-20"),
            (66, 9,2,37,"completion",  8,"2025-10-20"),

            # Red Crescent — Event 38: Winter Blood Drive (Ahmed El-Masry)
            (67, 1,2,38,"completion",  6,"2025-11-28"),
            (68, 6,2,38,"achievement", 6,"2025-11-28"),
            (69, 7,2,38,"completion",  6,"2025-11-28"),
            (70,10,2,38,"achievement", 6,"2025-11-28"),
            (71,16,2,38,"completion",  6,"2025-11-28"),
            (72,19,2,38,"completion",  6,"2025-11-28"),
            (73,23,2,38,"completion",  6,"2025-11-28"),
            (74,24,2,38,"completion",  6,"2025-11-28"),
            (75,25,2,38,"completion",  6,"2025-11-28"),
            (76, 9,2,38,"completion",  6,"2025-11-28"),
            (77,13,2,38,"completion",  6,"2025-11-28"),
            (78,15,2,38,"completion",  6,"2025-11-28"),

            # Enactus certificates
            (31, 4,3,7,"achievement",  5,"2026-04-10"),
            (32,10,3,7,"achievement",  5,"2026-04-10"),
            (33,12,3,7,"completion",   5,"2026-04-10"),
            (34,14,3,7,"completion",   5,"2026-04-10"),
            (35,22,3,7,"completion",   5,"2026-04-10"),
            (36,11,3,16,"achievement", 5,"2026-04-28"),
            (37,18,3,16,"completion",  5,"2026-04-28"),
            (38,21,3,16,"completion",  5,"2026-04-28"),
            (39,15,3,16,"achievement", 5,"2026-04-28"),
            (40,22,3,17,"completion",  4,"2026-05-10"),
            (41, 9,3,17,"completion",  4,"2026-05-10"),
            (42,12,3,17,"completion",  4,"2026-05-10"),
        ]
        _executemany(db,
            "INSERT INTO certificates (id, volunteer_id, org_id, event_id, type, hours, issued_date) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            certificates,
        )

        # ──────────── ANNOUNCEMENTS ────────────
        announcements = [
            # Resala
            (1,1,"Ramadan 2026 Food Drive — Thank You",
             "Thanks to 48 volunteers, we delivered food packages to 500+ families across Greater Cairo. "
             "A record-breaking year for our community program.",
             "2026-03-18 09:00:00"),
            (2,1,"Youth Leadership Forum — Registration Open",
             "Spots are filling fast for our May 20th forum at Bibliotheca Alexandrina. "
             "Apply through your volunteer dashboard before May 10th.",
             "2026-04-12 11:00:00"),
            (3,1,"Summer Literacy Camp — Volunteer Call",
             "We're looking for 20 passionate tutors for our July literacy camp in Ain Shams. "
             "Priority given to Education & Teaching volunteers.",
             "2026-05-05 10:00:00"),

            # Red Crescent
            (4,2,"Spring Blood Donation Drive — Volunteers Needed",
             "Our May 5th drive covers 12 governorates. Training and certification provided for all participants.",
             "2026-04-11 08:30:00"),
            (5,2,"Winter Aid Campaign — Final Impact Report",
             "Our Alexandria distribution reached 1,247 families across 8 districts. "
             "Thank you to all 35 volunteers who made it possible.",
             "2026-01-15 09:00:00"),
            (6,2,"First Aid Schools Tour — Wrap Up",
             "We reached 600+ secondary students across 5 Nasr City and Heliopolis schools. "
             "Certificates issued to all 4 volunteer trainers.",
             "2026-03-10 10:00:00"),
            (7,2,"Emergency Response Drill — Registration Open",
             "June 8th full-scale drill at the Maadi Civil Defence Training Ground. "
             "Limited to 40 volunteers — first come, first served.",
             "2026-05-12 09:00:00"),

            # Enactus
            (8,3,"Spring Entrepreneurship Bootcamp — Apply Now",
             "Three days of business modeling, pitching, and impact measurement at AUC New Cairo, May 15–17. "
             "Apply through your volunteer dashboard.",
             "2026-04-09 10:00:00"),
            (9,3,"Digital Skills for Women — Wrap Report",
             "18 women completed our Shubra workshop on e-commerce and online marketing. "
             "Full impact report available on our website.",
             "2026-04-08 16:00:00"),
            (10,3,"Social Innovation Hackathon — Team Registration Open",
             "48-hour hackathon at GrEEK Campus, June 20th. "
             "Register your team of 3–5 through the volunteer dashboard.",
             "2026-05-15 11:00:00"),
        ]
        _executemany(db,
            "INSERT INTO announcements (id, org_id, title, content, created_at) "
            "VALUES (%s, %s, %s, %s, %s)",
            announcements,
        )

        # ──────────── NOTIFICATIONS ────────────
        # (user_id, type, title, message, is_read, action_url, created_at)
        notifs = [
            # Resala admin (user 1 — sherifaziz)
            (1,"application","New Event Application","Yara Hassan applied to 'Youth Leadership Forum'.",False,"/admin/applications","2026-04-13 10:01:00"),
            (1,"application","New Event Application","Hossam Adel applied to 'Youth Leadership Forum'.",False,"/admin/applications","2026-04-14 09:01:00"),
            (1,"application","New Event Application","Ibrahim Yasser applied to 'Youth Leadership Forum'.",False,"/admin/applications","2026-04-15 11:01:00"),
            (1,"membership","Pending Volunteer","Salma Ibrahim is pending approval as a Resala volunteer.",False,"/admin/volunteers","2026-04-20 12:00:00"),
            (1,"membership","New Volunteer Joined","Malak Maher joined Resala as a Design volunteer.",True,"/admin/volunteers","2026-04-01 09:00:00"),
            (1,"activity","Activity Pending Review","Mona Kamal submitted a prep log for 'Youth Leadership Forum'.",False,"/admin/activities","2026-04-25 15:00:00"),
            (1,"application","New Event Application","Zeyad Fouad applied to 'Eid Clothes Drive'.",False,"/admin/applications","2026-05-28 14:01:00"),

            # Red Crescent admin (user 3 — fatima)
            (3,"application","New Event Application","Yara Hassan applied to 'National Blood Donation Drive — Spring'.",False,"/admin/applications","2026-04-13 10:06:00"),
            (3,"application","New Event Application","Omar Farouk applied to 'National Blood Donation Drive — Spring'.",False,"/admin/applications","2026-04-15 11:01:00"),
            (3,"application","New Event Application","Yara Hassan applied to 'Emergency Response Drill — June'.",False,"/admin/applications","2026-05-10 10:01:00"),
            (3,"application","New Event Application","Hana Youssef applied to 'Refugee Support Day — Ain Shams'.",False,"/admin/applications","2026-05-14 14:01:00"),
            (3,"membership","Pending Volunteer","Menna Tarek is pending approval as a Red Crescent volunteer.",False,"/admin/volunteers","2026-04-05 13:00:00"),
            (3,"membership","New Volunteer Joined","Layla Samir joined Red Crescent as a Medical volunteer.",True,"/admin/volunteers","2026-03-01 10:00:00"),
            (3,"membership","New Volunteer Joined","Nermine Ashraf joined Red Crescent as a Medical Support volunteer.",True,"/admin/volunteers","2026-03-20 11:00:00"),
            (3,"activity","Activity Pending Review","Hana Youssef submitted a prep log for 'Emergency Response Drill — June'.",False,"/admin/activities","2026-05-22 09:31:00"),
            (3,"activity","Activity Pending Review","Layla Samir submitted a prep log for 'Emergency Response Drill — June'.",False,"/admin/activities","2026-05-20 16:00:00"),

            # Enactus admin (user 4 — mohamedfarouk)
            (4,"application","New Event Application","Hossam Adel applied to 'Entrepreneurship Bootcamp — Spring'.",False,"/admin/applications","2026-04-13 12:01:00"),
            (4,"application","New Event Application","Sofia Ahmed applied to 'Entrepreneurship Bootcamp — Spring'.",False,"/admin/applications","2026-04-14 16:01:00"),
            (4,"application","New Event Application","Zeyad Fouad applied to 'Social Innovation Hackathon'.",False,"/admin/applications","2026-05-25 14:01:00"),
            (4,"membership","New Volunteer Joined","Mostafa Nasser joined Enactus as a Tech volunteer.",True,"/admin/volunteers","2025-12-01 09:00:00"),
            (4,"membership","Pending Volunteer","Malak Maher is pending approval as an Enactus volunteer.",False,"/admin/volunteers","2026-04-18 11:00:00"),
            (4,"activity","Activity Pending Review","Mostafa Nasser submitted a prep log for 'Entrepreneurship Bootcamp'.",False,"/admin/activities","2026-05-01 10:00:00"),

            # Supervisor notifications — Amira Khalil (user 10, Resala)
            (10,"application","New Event Application","Yara Hassan applied to 'Youth Leadership Forum'.",True,"/supervisor/applications","2026-04-13 10:02:00"),
            (10,"application","New Event Application","Ibrahim Yasser applied to 'Youth Leadership Forum'.",False,"/supervisor/applications","2026-04-15 11:02:00"),
            (10,"activity","Activity Pending Review","Mona Kamal submitted a prep log for 'Youth Leadership Forum'.",False,"/supervisor/activities","2026-04-25 15:01:00"),

            # Supervisor notifications — Ahmed El-Masry (user 12, Red Crescent)
            (12,"application","New Event Application","Yara Hassan applied to 'National Blood Donation Drive — Spring'.",False,"/supervisor/applications","2026-04-13 10:05:00"),
            (12,"application","New Event Application","Hossam Adel applied to 'National Blood Donation Drive — Spring'.",False,"/supervisor/applications","2026-04-14 09:15:00"),
            (12,"application","New Event Application","Layla Samir applied to 'National Blood Donation Drive — Spring'.",True,"/supervisor/applications","2026-04-15 11:00:00"),
            (12,"application","New Event Application","Yara Hassan applied to 'Search & Rescue Skills Camp — Suez'.",False,"/supervisor/applications","2026-06-10 09:05:00"),
            (12,"application","New Event Application","Hana Youssef applied to 'Search & Rescue Skills Camp — Suez'.",False,"/supervisor/applications","2026-06-11 10:10:00"),
            (12,"application","New Event Application","Omar Farouk applied to 'Search & Rescue Skills Camp — Suez'.",False,"/supervisor/applications","2026-06-13 09:35:00"),
            (12,"application","New Event Application","Nermine Ashraf applied to 'Refugee Support Day — Ain Shams'.",True,"/supervisor/applications","2026-05-13 11:05:00"),
            (12,"activity","Activity Hours Approved","Yara Hassan's prep log for 'National Blood Donation Drive' — 4 hrs approved.",False,"/supervisor/activities","2026-04-18 14:00:00"),
            (12,"activity","Activity Hours Approved","Menna Tarek's prep log for 'Search & Rescue Skills Camp' — 4 hrs approved.",False,"/supervisor/activities","2026-07-20 09:30:00"),
            (12,"activity","Activity Hours Approved","Layla Samir's field report for 'Refugee Support Day' — 3 hrs approved.",False,"/supervisor/activities","2026-05-21 10:00:00"),
            (12,"membership","New Volunteer Joined","Nermine Ashraf joined Red Crescent as a Medical Support volunteer.",True,"/supervisor/volunteers","2026-03-20 11:00:00"),
            (12,"activity","Activity Hours Approved","Omar Farouk's field report for 'Field Volunteer Induction' — 7 hrs approved.",False,"/supervisor/activities","2026-03-18 17:00:00"),
            (12,"activity","Activity Hours Approved","Hossam Adel's prep log for 'Mobile Medical Unit — Beni Suef' — 9 hrs approved.",False,"/supervisor/activities","2026-02-10 20:00:00"),
            (12,"application","New Event Application","Salma Ibrahim applied to 'Field Volunteer Induction — Batch 4'.",True,"/supervisor/applications","2026-03-07 10:00:00"),
            (12,"application","New Event Application","Ibrahim Yasser applied to 'Mobile Medical Unit — Beni Suef'.",True,"/supervisor/applications","2026-01-30 09:00:00"),
            (12,"application","New Event Application","Khalid Mansour applied to 'International Humanitarian Law Workshop'.",False,"/supervisor/applications","2026-06-22 11:00:00"),
            (12,"application","New Event Application","Reem Saad applied to 'International Humanitarian Law Workshop'.",False,"/supervisor/applications","2026-06-24 14:30:00"),
            (12,"certificate","Certificates Issued","14 certificates issued for 'Field Volunteer Induction — Batch 4'.",True,"/supervisor/activities","2026-03-22 09:00:00"),
            (12,"certificate","Certificates Issued","12 certificates issued for 'Mobile Medical Unit — Beni Suef'.",True,"/supervisor/activities","2026-02-18 09:00:00"),
            (12,"application","New Event Application","Yara Hassan applied to 'Mass Casualty Simulation — October'.",True,"/supervisor/applications","2025-09-20 09:10:00"),
            (12,"application","New Event Application","Hossam Adel applied to 'Mass Casualty Simulation — October'.",False,"/supervisor/applications","2025-09-21 10:15:00"),
            (12,"application","New Event Application","Layla Samir applied to 'Mass Casualty Simulation — October'.",True,"/supervisor/applications","2025-09-22 11:00:00"),
            (12,"application","New Event Application","Yara Hassan applied to 'Winter Blood Drive — Mansoura & Tanta'.",False,"/supervisor/applications","2025-10-15 08:30:00"),
            (12,"application","New Event Application","Omar Farouk applied to 'Winter Blood Drive — Mansoura & Tanta'.",True,"/supervisor/applications","2025-10-16 09:15:00"),
            (12,"activity","Attendance Approved","10 volunteers' attendance at 'Mass Casualty Simulation' approved — hours recorded automatically.",True,"/supervisor/activities","2025-10-14 18:00:00"),
            (12,"activity","Attendance Approved","12 volunteers' attendance at 'Winter Blood Drive' approved — hours recorded automatically.",True,"/supervisor/activities","2025-11-23 17:00:00"),
            (12,"certificate","Certificates Issued","10 certificates issued for 'Mass Casualty Simulation — October'.",True,"/supervisor/activities","2025-10-20 09:00:00"),
            (12,"certificate","Certificates Issued","12 certificates issued for 'Winter Blood Drive — Mansoura & Tanta'.",True,"/supervisor/activities","2025-11-28 09:00:00"),

            # Supervisor notifications — Nourhan Ali (user 13, Red Crescent)
            (13,"application","New Event Application","Yara Hassan applied to 'Emergency Response Drill — June'.",False,"/supervisor/applications","2026-05-10 10:01:00"),
            (13,"application","New Event Application","Omar Farouk applied to 'Emergency Response Drill — June'.",False,"/supervisor/applications","2026-05-11 14:01:00"),
            (13,"application","New Event Application","Youssef Bakr applied to 'Emergency Response Drill — June'.",False,"/supervisor/applications","2026-05-12 10:31:00"),
            (13,"activity","Activity Pending Review","Layla Samir submitted a prep log for 'Emergency Response Drill — June'.",False,"/supervisor/activities","2026-05-20 16:00:00"),
            (13,"activity","Activity Pending Review","Hana Youssef submitted a prep log for 'Emergency Response Drill — June'.",False,"/supervisor/activities","2026-05-22 09:30:00"),

            # Volunteer notifications — Yara Hassan (user 20)
            (20,"application","Application Approved","Your application for 'Ramadan Food Drive 2026' was approved.",True,"/dashboard/feed","2026-02-22 09:00:00"),
            (20,"application","Application Approved","Your application for 'Medical Volunteer Training — Cairo' was approved.",True,"/dashboard/feed","2026-03-22 10:00:00"),
            (20,"certificate","Certificate Issued","Your achievement certificate for 'Ramadan Food Drive 2026' is ready.",True,"/dashboard/profile","2026-03-20 12:00:00"),
            (20,"application","Application Pending","Your application for 'Youth Leadership Forum' is under review.",False,"/dashboard/feed","2026-04-13 10:05:00"),
        ]
        _executemany(db,
            "INSERT INTO notifications (user_id, type, title, message, is_read, action_url, created_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            notifs,
        )

    # Reset sequences so auto-increment inserts don't collide with explicit seeded IDs
    for _tbl, _col in [("events","id"),("event_applications","id"),("activities","id"),
                       ("certificates","id"),("volunteers","id"),("supervisors","id"),
                       ("org_admins","id"),("notifications","id"),("users","id"),("organizations","id")]:
        db.execute(f"SELECT setval(pg_get_serial_sequence('{_tbl}', '{_col}'), COALESCE((SELECT MAX({_col}) FROM {_tbl}), 1))")

    print("Database seeded successfully!")
    print()
    print("Demo credentials:")
    print("  platform@altruism.org / Platform#1                 (platform admin)")
    print("  sherifaziz@resala.org / Admin#1234                 (Resala admin — 14 members, 6 events)")
    print("  fatimaelsayed@redcrescent.org / Admin#1234         (Red Crescent admin — 12 members, 6 events)")
    print("  mohamedfarouk@enactus-egypt.org / Admin#1234       (Enactus admin — 10 members, 5 events)")
    print("  amirakhalil@resala.org / Super#1234                (Resala supervisor)")
    print("  nourhanali@redcrescent.org / Super#1234            (Red Crescent supervisor)")
    print("  yarahassan@gmail.com / Vol#12345                   (volunteer — member of Resala + Red Crescent)")


if __name__ == "__main__":
    seed()
