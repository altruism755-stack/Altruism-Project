"""Seed the database with realistic demo data.

Layout (small + meaningful, easy to debug):
    - 3 organizations
    - 4 org admins  (Resala 2, Red Crescent 1, Enactus 1)
    - 6 supervisors (2 per org)
    - 12 volunteers (overlapping memberships → 6-8 per org)
    - 7 events       (3 / 2 / 2)
    - ~25 event applications (3-5 per event, mixed statuses)
    - ~30 activities (2-4 per volunteer, mixed statuses)
    - certificates, announcements, notifications
"""

import json
from database import init_schema, get_db
from auth import hash_password


def seed():
    init_schema()

    with get_db() as db:
        print("Seeding database...")

        # Clear in dependency order
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
        # id, email, password, role
        users = [
            # platform admin
            (100, "platform@altruism.org",       h("platform"),   "org_admin"),

            # org admins (4)
            (1,   "sherif.aziz@resala.org",      h("admin"),      "org_admin"),
            (2,   "mona.kamal@resala.org",       h("admin"),      "org_admin"),
            (3,   "fatima.elsayed@redcrescent.org", h("admin"),   "org_admin"),
            (4,   "mohamed.farouk@enactus-egypt.org", h("admin"), "org_admin"),

            # supervisors (6 — 2 per org)
            (10,  "amira.khalil@resala.org",     h("supervisor"), "supervisor"),
            (11,  "mahmoud.hassan@resala.org",   h("supervisor"), "supervisor"),
            (12,  "ahmed.elmasry@redcrescent.org", h("supervisor"), "supervisor"),
            (13,  "nourhan.ali@redcrescent.org", h("supervisor"), "supervisor"),
            (14,  "sara.nabil@enactus-egypt.org", h("supervisor"),"supervisor"),
            (15,  "youssef.gamal@enactus-egypt.org", h("supervisor"),"supervisor"),

            # volunteers (12)
            (20,  "yara.hassan@gmail.com",       h("volunteer"),  "volunteer"),
            (21,  "nadia.mahmoud@gmail.com",     h("volunteer"),  "volunteer"),
            (22,  "karim.mostafa@outlook.com",   h("volunteer"),  "volunteer"),
            (23,  "sofia.alhassan@gmail.com",    h("volunteer"),  "volunteer"),
            (24,  "tarek.ibrahim@gmail.com",     h("volunteer"),  "volunteer"),
            (25,  "hana.yousef@outlook.com",     h("volunteer"),  "volunteer"),
            (26,  "yusuf.bakr@gmail.com",        h("volunteer"),  "volunteer"),
            (27,  "dina.elsayed@gmail.com",      h("volunteer"),  "volunteer"),
            (28,  "omar.farouk@outlook.com",     h("volunteer"),  "volunteer"),
            (29,  "layla.samir@gmail.com",       h("volunteer"),  "volunteer"),
            (30,  "hossam.adel@gmail.com",       h("volunteer"),  "volunteer"),
            (31,  "menna.tarek@outlook.com",     h("volunteer"),  "volunteer"),
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

        # ──────────── ORG ADMINS (junction) ────────────
        # (user_id, org_id, role)
        org_admins = [
            (1, 1, "creator"),  # Sherif — Resala
            (2, 1, "admin"),    # Mona  — Resala
            (3, 2, "creator"),  # Fatima — Red Crescent
            (4, 3, "creator"),  # Mohamed — Enactus
        ]
        db.executemany(
            "INSERT INTO org_admins (user_id, org_id, role) VALUES (?, ?, ?)",
            org_admins,
        )

        # ──────────── SUPERVISORS ────────────
        # (id, user_id, name, email, phone, team, org_id, status)
        supervisors = [
            (1, 10, "Dr. Amira Khalil",  "amira.khalil@resala.org",     "01011223344", "Programs",   1, "Active"),
            (2, 11, "Mahmoud Hassan",    "mahmoud.hassan@resala.org",   "01022334455", "Media",      1, "Active"),
            (3, 12, "Ahmed El-Masry",    "ahmed.elmasry@redcrescent.org","01044556677","Field Teams",2, "Active"),
            (4, 13, "Nourhan Ali",       "nourhan.ali@redcrescent.org", "01045566778", "Medical",    2, "Active"),
            (5, 14, "Sara Nabil",        "sara.nabil@enactus-egypt.org","01055667788", "Projects",   3, "Active"),
            (6, 15, "Youssef Gamal",     "youssef.gamal@enactus-egypt.org","01056677889","Mentorship",3, "Active"),
        ]
        db.executemany(
            "INSERT INTO supervisors (id, user_id, name, email, phone, team, org_id, status) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            supervisors,
        )

        # ──────────── VOLUNTEERS ────────────
        # (id, user_id, name, email, phone, city, skills, about_me, status, dob, governorate)
        volunteers = [
            (1,  20, "Yara Hassan",      "yara.hassan@gmail.com",     "01212345678", "Alexandria",
             json.dumps(["Communication", "Event Planning", "Photography"]),
             "Community service enthusiast since university. Loves building youth programs.",
             "Active", "1999-07-15", "Alexandria"),
            (2,  21, "Nadia Mahmoud",    "nadia.mahmoud@gmail.com",   "01234567890", "Cairo",
             json.dumps(["HR", "Training", "Team Management"]),
             "HR professional and weekend volunteer trainer focused on capacity building.",
             "Active", "1997-03-22", "Cairo"),
            (3,  22, "Karim Mostafa",    "karim.mostafa@outlook.com", "01098765432", "Giza",
             json.dumps(["Photography", "Video Editing", "Social Media"]),
             "Creative media professional amplifying volunteer impact through storytelling.",
             "Active", "2000-11-05", "Giza"),
            (4,  23, "Sofia Al-Hassan",  "sofia.alhassan@gmail.com",  "01112223344", "Giza",
             json.dumps(["Web Development", "Data Analysis"]),
             "Software engineering student using technology for social good.",
             "Active", "2002-05-30", "Giza"),
            (5,  24, "Tarek Ibrahim",    "tarek.ibrahim@gmail.com",   "01556677889", "Cairo",
             json.dumps(["Finance", "Accounting", "Budgeting"]),
             "Finance graduate helping non-profits manage resources effectively.",
             "Active", "1998-09-12", "Cairo"),
            (6,  25, "Hana Yousef",      "hana.yousef@outlook.com",   "01667788990", "Alexandria",
             json.dumps(["Logistics", "Operations", "Supply Chain"]),
             "Operations specialist ensuring smooth delivery of humanitarian aid.",
             "Active", "2001-02-18", "Alexandria"),
            (7,  26, "Yusuf Bakr",       "yusuf.bakr@gmail.com",      "01788990011", "Mansoura",
             json.dumps(["Research", "Fieldwork", "Data Collection"]),
             "Social researcher measuring impact of volunteer programs.",
             "Active", "1996-06-08", "Dakahlia"),
            (8,  27, "Dina El-Sayed",    "dina.elsayed@gmail.com",    "01899001122", "Cairo",
             json.dumps(["Graphic Design", "Branding"]),
             "Visual designer creating compelling content for non-profit campaigns.",
             "Active", "2001-12-25", "Cairo"),
            (9,  28, "Omar Farouk",      "omar.farouk@outlook.com",   "01900112233", "Mansoura",
             json.dumps(["Teaching", "Tutoring"]),
             "Education advocate teaching underprivileged children on weekends.",
             "Active", "1995-04-14", "Dakahlia"),
            (10, 29, "Layla Samir",      "layla.samir@gmail.com",     "01011223345", "Cairo",
             json.dumps(["First Aid", "Healthcare"]),
             "Nursing student volunteering with the Red Crescent blood donation team.",
             "Active", "2003-08-09", "Cairo"),
            (11, 30, "Hossam Adel",      "hossam.adel@gmail.com",     "01123344556", "Cairo",
             json.dumps(["Public Speaking", "Mentorship"]),
             "Business student passionate about youth entrepreneurship.",
             "Active", "2000-01-20", "Cairo"),
            (12, 31, "Menna Tarek",      "menna.tarek@outlook.com",   "01234455667", "Giza",
             json.dumps(["Translation", "Writing", "Arabic-English"]),
             "Linguistics student helping NGOs reach bilingual audiences.",
             "Pending", "2002-10-03", "Giza"),
        ]
        db.executemany(
            "INSERT INTO volunteers (id, user_id, name, email, phone, city, skills, about_me, status, date_of_birth, governorate) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            volunteers,
        )

        # ──────────── ORG-VOLUNTEER MEMBERSHIPS ────────────
        # 7 in Resala, 6 in Red Crescent, 6 in Enactus  (overlap is intentional)
        # (org_id, volunteer_id, supervisor_id, department, status, joined_date, source, join_source, is_active)
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
        # 3 Resala, 2 Red Crescent, 2 Enactus = 7 total
        # (id, org_id, name, description, location, date, time, duration, max_vol, cur_vol, required_skills, status)
        events = [
            (1, 1, "Ramadan Food Drive 2026",
             "Annual food package distribution to 500+ families in Greater Cairo. "
             "Volunteers handle packing, sorting, and delivery.",
             "Resala HQ, Maadi, Cairo", "2026-03-15", "08:00", 8, 50, 48,
             "Logistics, Teamwork", "Completed"),
            (2, 1, "Youth Leadership Forum",
             "Day-long forum with panels and workshops for emerging youth leaders. "
             "Topics: civic responsibility, team leadership, social innovation.",
             "Bibliotheca Alexandrina, Alexandria", "2026-05-20", "09:00", 6, 30, 18,
             "Leadership, Communication", "Upcoming"),
            (3, 1, "Volunteer Onboarding Workshop — April",
             "Orientation for new volunteers: policies, tools, and best practices.",
             "Resala Training Center, Cairo", "2026-04-08", "10:00", 5, 15, 14,
             "HR, Training", "Completed"),

            (4, 2, "National Blood Donation Drive — Spring",
             "Biannual blood donation campaign across 12 governorates. Volunteers "
             "manage donor registration, post-donation care, and logistics.",
             "Multiple Sites — Cairo, Giza, Alexandria", "2026-05-05", "08:00", 7, 60, 45,
             "Medical Support, First Aid", "Upcoming"),
            (5, 2, "Winter Aid Distribution — Alexandria",
             "Distribution of 1,000+ winter kits (blankets, clothing, heaters) to "
             "displaced families in Alexandria and surrounding areas.",
             "Borg El-Arab, Alexandria", "2025-12-20", "07:00", 8, 35, 35,
             "Logistics, Fieldwork", "Completed"),

            (6, 3, "Entrepreneurship Bootcamp — Spring",
             "Three-day bootcamp for student entrepreneurs. Workshops on business "
             "modeling, pitching, and social impact measurement.",
             "AUC New Cairo Campus", "2026-05-15", "09:00", 8, 25, 12,
             "Business, Presentation", "Upcoming"),
            (7, 3, "Digital Skills for Women — Shubra",
             "Free digital literacy and e-commerce training for women entrepreneurs "
             "in Shubra, helping them market products online.",
             "Shubra Community Hall, Cairo", "2026-04-05", "10:00", 5, 20, 18,
             "IT, Teaching", "Completed"),
        ]
        db.executemany(
            "INSERT INTO events (id, org_id, name, description, location, date, time, duration, "
            "max_volunteers, current_volunteers, required_skills, status) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            events,
        )

        # ──────────── EVENT APPLICATIONS ────────────
        # 3-5 per event, mixed statuses
        # (id, volunteer_id, event_id, org_id, status, applied_date)
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
        # 2-4 per volunteer, mix of Approved/Pending. (Vol 12 is Pending member → no activities.)
        # (id, volunteer_id, event_id, org_id, date, hours, description, status)
        activities = [
            # Yara (vol 1) — 4 activities
            (1,  1, 1, 1, "2026-03-15", 8, "Coordinated 6 volunteers for package sorting in Ain Shams; delivered to 80 families.", "Approved"),
            (2,  1, 3, 1, "2026-04-08", 5, "Facilitated two onboarding sessions for 14 new volunteers.", "Approved"),
            (3,  1, 5, 2, "2025-12-20", 8, "Managed donor registration at Borg El-Arab; assisted 200+ donors.", "Approved"),
            (4,  1, 2, 1, "2026-04-25", 3, "Pre-event planning session for the Youth Leadership Forum.", "Pending"),

            # Nadia (vol 2) — 3
            (5,  2, 1, 1, "2026-03-15", 8, "Volunteer scheduling across 5 distribution zones for 48 volunteers.", "Approved"),
            (6,  2, 3, 1, "2026-04-08", 5, "Delivered 'Volunteer Rights & Responsibilities' module.", "Approved"),
            (7,  2, 6, 3, "2026-04-20", 4, "Mentor-prep session for the upcoming Entrepreneurship Bootcamp.", "Pending"),

            # Karim (vol 3) — 2
            (8,  3, 6, 3, "2026-04-22", 4, "Filmed promo video for Entrepreneurship Bootcamp recruitment.", "Approved"),
            (9,  3, 7, 3, "2026-04-05", 5, "Photographed Digital Skills workshop; produced highlight reel.", "Approved"),

            # Sofia (vol 4) — 3
            (10, 4, 3, 1, "2026-04-08", 5, "Set up volunteer management system on tablets for digital check-in.", "Approved"),
            (11, 4, 7, 3, "2026-04-05", 5, "Taught e-commerce basics to 18 women entrepreneurs.", "Approved"),
            (12, 4, 6, 3, "2026-04-28", 3, "Tech-prep for bootcamp: setup of demo accounts and projector tests.", "Pending"),

            # Tarek (vol 5) — 2
            (13, 5, 1, 1, "2026-03-15", 8, "Petty cash and expense tracking for the food drive; reconciled receipts.", "Approved"),
            (14, 5, 3, 1, "2026-04-08", 5, "Budgeting basics workshop for new volunteers.", "Approved"),

            # Hana (vol 6) — 2
            (15, 6, 5, 2, "2025-12-20", 8, "Truck loading and route planning; supervised 8 field volunteers.", "Approved"),
            (16, 6, 4, 2, "2026-04-15", 4, "Pre-event logistics planning for blood donation sites.", "Pending"),

            # Yusuf (vol 7) — 2
            (17, 7, 5, 2, "2025-12-20", 8, "Post-distribution surveys with 50 recipient families.", "Approved"),
            (18, 7, 4, 2, "2026-04-20", 3, "Survey design for upcoming blood drive impact measurement.", "Pending"),

            # Dina (vol 8) — 2
            (19, 8, 1, 1, "2026-03-14", 4, "Designed banners and social posts for the food drive launch.", "Approved"),
            (20, 8, 2, 1, "2026-04-30", 3, "Visual identity drafts for Youth Leadership Forum.", "Pending"),

            # Omar (vol 9) — 3
            (21, 9, 7, 3, "2026-04-05", 5, "Taught computer literacy to 20 women: email, Docs, WhatsApp Business.", "Approved"),
            (22, 9, 4, 2, "2026-04-22", 3, "Outreach session at local university to recruit blood donors.", "Approved"),
            (23, 9, 6, 3, "2026-05-02", 4, "Curriculum prep for entrepreneurship workshop modules.", "Pending"),

            # Layla (vol 10) — 3
            (24, 10, 5, 2, "2025-12-20", 8, "First aid support during long field day; monitored volunteer health.", "Approved"),
            (25, 10, 4, 2, "2026-04-25", 3, "Training session for new medical-support volunteers.", "Approved"),
            (26, 10, 4, 2, "2026-05-01", 2, "Inventory check on first-aid kits for blood drive sites.", "Pending"),

            # Hossam (vol 11) — 2
            (27, 11, 6, 3, "2026-04-15", 4, "Pitch coaching for student teams preparing bootcamp submissions.", "Approved"),
            (28, 11, 2, 1, "2026-04-28", 3, "Volunteer outreach on campus for Youth Leadership Forum.", "Pending"),
        ]
        db.executemany(
            "INSERT INTO activities (id, volunteer_id, event_id, org_id, date, hours, description, status) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            activities,
        )

        # ──────────── CERTIFICATES ────────────
        # (id, volunteer_id, org_id, event_id, type, hours, issued_date)
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
             "Thanks to 48 volunteers, we delivered food packages to 500+ families across Greater Cairo. "
             "Special recognition to our top contributors this season.",
             "2026-03-18 09:00:00"),
            (2, 1, "Youth Leadership Forum — Registration Open",
             "Spots are filling fast for our May 20th forum at Bibliotheca Alexandrina. "
             "This year's theme: 'Leading with Purpose'. Apply via your dashboard.",
             "2026-04-12 11:00:00"),
            (3, 2, "Spring Blood Donation Drive — Volunteers Needed",
             "Our May 5th drive covers 12 governorates. We need volunteers for donor registration, "
             "medical support, and logistics. Training and certification provided.",
             "2026-04-11 08:30:00"),
            (4, 2, "Winter Aid Campaign — Final Impact Report",
             "Our Alexandria distribution reached 1,247 families across 8 districts. "
             "Thanks to our 35 volunteers who made this possible.",
             "2026-01-15 09:00:00"),
            (5, 3, "Spring Entrepreneurship Bootcamp — Apply Now",
             "Three days of business modeling, pitching, and impact measurement at AUC New Cairo, "
             "May 15-17. Mentors from 12 leading companies confirmed.",
             "2026-04-09 10:00:00"),
            (6, 3, "Digital Skills for Women — Wrap Report",
             "18 women completed our Shubra workshop on e-commerce and online marketing. "
             "Three have already launched online stores. Congratulations!",
             "2026-04-08 16:00:00"),
        ]
        db.executemany(
            "INSERT INTO announcements (id, org_id, title, content, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            announcements,
        )

        # ──────────── NOTIFICATIONS ────────────
        # In-app alerts for org admins (drives the bell icon in the UI).
        notifications = [
            (1, "application", "New Event Application",
             "Yara Hassan applied to 'Youth Leadership Forum'.", 0, "/admin/applications", "2026-04-13 10:01:00"),
            (2, "application", "New Event Application",
             "Hossam Adel applied to 'Youth Leadership Forum'.", 0, "/admin/applications", "2026-04-14 09:01:00"),
            (3, "membership",  "Pending Volunteer",
             "Hossam Adel is pending approval as a Resala volunteer.", 0, "/admin/volunteers", "2026-04-01 12:00:00"),
            (4, "application", "New Event Application",
             "Yara Hassan applied to 'Blood Donation Drive'.", 0, "/admin/applications", "2026-04-13 10:06:00"),
            (5, "membership",  "Pending Volunteer",
             "Menna Tarek is pending approval as a Red Crescent volunteer.", 1, "/admin/volunteers", "2026-04-05 13:00:00"),
        ]
        # Map notifications to org-admin user IDs:
        #   1, 2, 3 → Resala admins (users 1 and 2 each get one of {1,2,3})
        #   4, 5    → Red Crescent admin (user 3)
        db.execute("INSERT INTO notifications (user_id, type, title, message, is_read, action_url, created_at) "
                   "VALUES (?, ?, ?, ?, ?, ?, ?)", (1,) + notifications[0][1:])
        db.execute("INSERT INTO notifications (user_id, type, title, message, is_read, action_url, created_at) "
                   "VALUES (?, ?, ?, ?, ?, ?, ?)", (2,) + notifications[1][1:])
        db.execute("INSERT INTO notifications (user_id, type, title, message, is_read, action_url, created_at) "
                   "VALUES (?, ?, ?, ?, ?, ?, ?)", (1,) + notifications[2][1:])
        db.execute("INSERT INTO notifications (user_id, type, title, message, is_read, action_url, created_at) "
                   "VALUES (?, ?, ?, ?, ?, ?, ?)", (3,) + notifications[3][1:])
        db.execute("INSERT INTO notifications (user_id, type, title, message, is_read, action_url, created_at) "
                   "VALUES (?, ?, ?, ?, ?, ?, ?)", (3,) + notifications[4][1:])

    print("Database seeded successfully!")
    print()
    print("Demo credentials:")
    print("  platform@altruism.org / platform                 (platform admin)")
    print("  sherif.aziz@resala.org / admin                   (Resala admin — creator)")
    print("  mona.kamal@resala.org / admin                    (Resala admin)")
    print("  fatima.elsayed@redcrescent.org / admin           (Red Crescent admin)")
    print("  mohamed.farouk@enactus-egypt.org / admin         (Enactus admin)")
    print("  amira.khalil@resala.org / supervisor             (Resala supervisor)")
    print("  yara.hassan@gmail.com / volunteer                (volunteer — active in Resala & Red Crescent)")


if __name__ == "__main__":
    seed()
