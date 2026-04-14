"""Seed the database with realistic demo data."""

import json
from database import init_schema, get_db
from auth import hash_password


def seed():
    init_schema()

    with get_db() as db:
        print("Seeding database...")

        # Clear all tables in dependency order
        for table in [
            "event_applications", "announcements",
            "certificates", "activities", "org_volunteers",
            "events", "supervisors", "volunteers", "organizations",
            "platform_admins", "users",
        ]:
            try:
                db.execute(f"DELETE FROM {table}")
            except Exception:
                pass  # table might not exist yet

        h = hash_password

        # ──────────── USERS ────────────
        users = [
            # platform admin (user id 100 to avoid colliding with regular accounts)
            (100, "platform@altruism.org",    h("platform"),   "org_admin"),
            # org admins
            (1,  "admin@resala.org",          h("admin"),      "org_admin"),
            (2,  "admin@redcrescent.org",     h("admin"),      "org_admin"),
            (3,  "admin@enactus.org",         h("admin"),      "org_admin"),
            # supervisors
            (4,  "amira@resala.org",          h("supervisor"), "supervisor"),
            (5,  "mahmoud@resala.org",        h("supervisor"), "supervisor"),
            (6,  "rania@resala.org",          h("supervisor"), "supervisor"),
            (7,  "ahmed@redcrescent.org",     h("supervisor"), "supervisor"),
            (8,  "sara@enactus.org",          h("supervisor"), "supervisor"),
            # volunteers
            (9,  "volunteer@example.com",     h("volunteer"),  "volunteer"),
            (10, "nadia@example.com",         h("volunteer"),  "volunteer"),
            (11, "karim@example.com",         h("volunteer"),  "volunteer"),
            (12, "sofia@example.com",         h("volunteer"),  "volunteer"),
            (13, "tarek@example.com",         h("volunteer"),  "volunteer"),
            (14, "hana@example.com",          h("volunteer"),  "volunteer"),
            (15, "yusuf@example.com",         h("volunteer"),  "volunteer"),
            (16, "dina@example.com",          h("volunteer"),  "volunteer"),
            (17, "omar@example.com",          h("volunteer"),  "volunteer"),
            (18, "layla@example.com",         h("volunteer"),  "volunteer"),
        ]
        db.executemany(
            "INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)",
            users,
        )

        # Mark the platform admin
        db.execute("INSERT INTO platform_admins (user_id) VALUES (?)", (100,))

        # ──────────── ORGANIZATIONS ────────────
        org_cols = (
            "id, name, description, category, color, secondary_color, initials, founded, admin_user_id, "
            "status, org_type, founded_year, location, official_email, submitter_name, submitter_role"
        )
        org_placeholders = ", ".join(["?"] * 16)
        insert_org = f"INSERT INTO organizations ({org_cols}) VALUES ({org_placeholders})"

        db.execute(insert_org, (
            1, "Resala",
            "Egypt's largest volunteer organization dedicated to community support, "
            "youth empowerment, food drives, and social welfare programs across all governorates.",
            "Social Welfare", "#D97706", "#F59E0B", "RS", "1999-01-01", 1,
            "approved", "NGO", "1999", "Cairo", "info@resala.org",
            "Sherif Abdel Aziz", "Executive Director",
        ))
        db.execute(insert_org, (
            2, "Egyptian Red Crescent",
            "Providing humanitarian aid, disaster relief, blood donation drives, "
            "and emergency health services across Egypt since 1912.",
            "Humanitarian Aid", "#DC2626", "#EF4444", "RC", "1912-03-15", 2,
            "approved", "NGO", "1912", "Cairo", "info@egyptianrc.org",
            "Fatima El-Sayed", "Communications Director",
        ))
        db.execute(insert_org, (
            3, "Enactus Egypt",
            "A student-run entrepreneurship organization empowering communities "
            "through innovative social projects and sustainable business solutions.",
            "Student Entrepreneurship", "#0891B2", "#06B6D4", "EN", "2004-09-01", 3,
            "approved", "Student Activity", "2004", "Giza", "contact@enactus-egypt.org",
            "Mohamed Farouk", "Country Director",
        ))

        # ──────────── SUPERVISORS ────────────
        supervisors = [
            (1, 4,  "Dr. Amira Khalil",  "amira@resala.org",      "01011223344", "Programs",    1, "Active"),
            (2, 5,  "Mahmoud Hassan",    "mahmoud@resala.org",    "01022334455", "Media",       1, "Active"),
            (3, 6,  "Rania Saleh",       "rania@resala.org",      "01033445566", "Operations",  1, "Active"),
            (4, 7,  "Ahmed El-Masry",    "ahmed@redcrescent.org", "01044556677", "Field Teams", 2, "Active"),
            (5, 8,  "Sara Nabil",        "sara@enactus.org",      "01055667788", "Projects",    3, "Active"),
        ]
        db.executemany(
            "INSERT INTO supervisors (id, user_id, name, email, phone, team, org_id, status) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            supervisors,
        )

        # ──────────── VOLUNTEERS ────────────
        volunteers = [
            # id, user_id, name, email, phone, city, skills, about_me, status, date_of_birth, governorate
            (1,  9,  "Yara Hassan",       "volunteer@example.com", "01212345678", "Alexandria",
             json.dumps(["Communication", "Event Planning", "Photography", "Public Speaking"]),
             "Passionate about community service and youth development. I have been volunteering "
             "since university and love meeting new people and making a real impact.",
             "Active", "1999-07-15", "Alexandria"),

            (2,  10, "Nadia Mahmoud",     "nadia@example.com",     "01234567890", "Cairo",
             json.dumps(["HR", "Training", "Team Management"]),
             "HR professional by day, volunteer trainer by weekend. Dedicated to capacity building.",
             "Active", "1997-03-22", "Cairo"),

            (3,  11, "Karim Mostafa",     "karim@example.com",     "01098765432", "Cairo",
             json.dumps(["Media", "Photography", "Video Editing", "Social Media"]),
             "Creative media professional who uses storytelling to amplify volunteer impact.",
             "Active", "2000-11-05", "Giza"),

            (4,  12, "Sofia Al-Hassan",   "sofia@example.com",     "01112223344", "Giza",
             json.dumps(["IT", "Web Development", "Data Analysis"]),
             "Software engineering student passionate about using technology for social good.",
             "Active", "2002-05-30", "Giza"),

            (5,  13, "Tarek Ibrahim",     "tarek@example.com",     "01556677889", "Cairo",
             json.dumps(["Finance", "Accounting", "Budgeting"]),
             "Finance graduate helping non-profits manage resources more effectively.",
             "Active", "1998-09-12", "Cairo"),

            (6,  14, "Hana Yousef",       "hana@example.com",      "01667788990", "Alexandria",
             json.dumps(["Logistics", "Operations", "Supply Chain"]),
             "Operations specialist ensuring smooth delivery of humanitarian aid.",
             "Active", "2001-02-18", "Alexandria"),

            (7,  15, "Yusuf Bakr",        "yusuf@example.com",     "01788990011", "Cairo",
             json.dumps(["Research", "Fieldwork", "Data Collection"]),
             "Social researcher focused on measuring the impact of volunteer programs.",
             "Active", "1996-06-08", "Dakahlia"),

            (8,  16, "Dina El-Sayed",     "dina@example.com",      "01899001122", "Cairo",
             json.dumps(["Graphic Design", "Digital Media", "Branding"]),
             "Visual designer creating compelling content for non-profit campaigns.",
             "Active", "2001-12-25", "Cairo"),

            (9,  17, "Omar Farouk",       "omar@example.com",      "01900112233", "Mansoura",
             json.dumps(["Teaching", "Tutoring", "Curriculum Design"]),
             "Education advocate who volunteers to teach underprivileged children.",
             "Active", "1995-04-14", "Dakahlia"),

            (10, 18, "Layla Samir",       "layla@example.com",     "01011223345", "Cairo",
             json.dumps(["First Aid", "Medical Support", "Healthcare"]),
             "Nursing student volunteering with the Red Crescent blood donation team.",
             "Active", "2003-08-09", "Cairo"),
        ]
        db.executemany(
            "INSERT INTO volunteers (id, user_id, name, email, phone, city, skills, about_me, status, date_of_birth, governorate) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            volunteers,
        )

        # ──────────── ORG-VOLUNTEER MEMBERSHIPS ────────────
        # (org_id, volunteer_id, supervisor_id, department, status, joined_date)
        org_vols = [
            # Resala members
            (1, 1,  1, "Programs",   "Active",  "2025-09-01"),
            (1, 2,  1, "HR",         "Active",  "2025-10-15"),
            (1, 3,  2, "Media",      "Active",  "2025-11-01"),
            (1, 4,  2, "IT",         "Active",  "2026-01-20"),
            (1, 5,  3, "Finance",    "Active",  "2025-08-10"),
            (1, 8,  2, "Media",      "Active",  "2026-02-05"),
            # Red Crescent members
            (2, 1,  4, "Outreach",   "Active",  "2025-09-01"),
            (2, 6,  4, "Logistics",  "Active",  "2025-12-01"),
            (2, 7,  4, "Field",      "Active",  "2026-01-05"),
            (2, 10, 4, "Medical",    "Active",  "2026-03-01"),
            # Enactus members
            (3, 2,  5, "Business",   "Active",  "2025-10-05"),
            (3, 3,  5, "Media",      "Active",  "2025-11-10"),
            (3, 9,  5, "Education",  "Active",  "2025-09-20"),
            (3, 4,  5, "Tech",       "Active",  "2026-01-15"),
        ]
        db.executemany(
            "INSERT INTO org_volunteers (org_id, volunteer_id, supervisor_id, department, status, joined_date) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            org_vols,
        )

        # ──────────── EVENTS ────────────
        # (id, org_id, name, description, location, date, time, duration, max_vol, cur_vol, required_skills, status)
        events = [
            # Resala events
            (1,  1, "Youth Leadership Forum",
             "A full-day forum with panels, workshops, and networking for emerging youth leaders. "
             "Topics include civic responsibility, team leadership, and social innovation.",
             "Bibliotheca Alexandrina, Alexandria",
             "2026-05-20", "09:00", 6, 30, 18, "Leadership, Communication, Public Speaking", "Upcoming"),

            (2,  1, "Ramadan Food Drive 2026",
             "Annual food package distribution to 500+ families in underserved neighborhoods "
             "across Greater Cairo. Volunteers assist with packing, sorting, and delivery.",
             "Resala HQ, Maadi, Cairo",
             "2026-03-15", "08:00", 8, 50, 48, "Logistics, Teamwork, Driving", "Completed"),

            (3,  1, "HR & Volunteer Onboarding Workshop",
             "Orientation and training session for new volunteers covering policies, "
             "tools, and best practices for effective community service.",
             "Resala Training Center, Cairo",
             "2026-04-08", "10:00", 5, 15, 14, "HR, Training, Facilitation", "Completed"),

            (4,  1, "Media & Content Creation Bootcamp",
             "Two-day intensive training on photography, video editing, social media strategy, "
             "and storytelling for non-profits.",
             "Creative Space, Zamalek, Cairo",
             "2026-03-22", "10:00", 8, 12, 12, "Photography, Video Editing, Social Media", "Completed"),

            (5,  1, "Digital Literacy Workshop — Senior Citizens",
             "Teaching basic smartphone and internet skills to elderly residents in care homes.",
             "Cairo Community Center, Heliopolis",
             "2026-06-10", "10:00", 4, 15, 5, "Teaching, IT, Patience", "Upcoming"),

            (6,  1, "Tree Planting Initiative — Earth Day",
             "Planting 200 trees across public parks in Giza as part of Egypt's national "
             "greening campaign. Includes guided tour and environmental awareness session.",
             "Al-Azhar Park, Cairo",
             "2026-04-22", "08:00", 5, 40, 32, "Fieldwork, Physical Fitness", "Active"),

            # Red Crescent events
            (7,  2, "National Blood Donation Drive — Spring 2026",
             "Biannual blood donation campaign across 12 governorates. Volunteers assist "
             "with donor registration, post-donation care, and logistics.",
             "Multiple Sites — Cairo, Giza, Alexandria",
             "2026-05-05", "08:00", 7, 60, 45, "Medical Support, First Aid, Communication", "Upcoming"),

            (8,  2, "Disaster Preparedness Training",
             "Comprehensive training on emergency response, first aid, disaster logistics, "
             "and evacuation procedures for field volunteers.",
             "Red Crescent HQ, Mohandiseen, Cairo",
             "2026-04-14", "09:00", 6, 25, 20, "First Aid, Emergency Response, Leadership", "Active"),

            (9,  2, "Winter Aid Distribution — Alexandria",
             "Distribution of 1,000+ winter kits (blankets, clothing, heaters) to displaced "
             "families in Alexandria and surrounding areas.",
             "Borg El-Arab, Alexandria",
             "2025-12-20", "07:00", 8, 35, 35, "Logistics, Fieldwork, Arabic", "Completed"),

            (10, 2, "Health Awareness Campaign — Mansoura",
             "Community health screening and awareness event covering diabetes, hypertension, "
             "and preventive care for rural communities near Mansoura.",
             "Mansoura University Medical Campus",
             "2026-02-28", "09:00", 5, 20, 19, "Healthcare, Communication, Data Collection", "Completed"),

            # Enactus events
            (11, 3, "Entrepreneurship Bootcamp — Spring 2026",
             "Intensive three-day bootcamp for aspiring student entrepreneurs. Workshops cover "
             "business modeling, pitching, financial planning, and social impact measurement.",
             "AUC New Cairo Campus",
             "2026-05-15", "09:00", 8, 25, 12, "Business, Presentation, Design Thinking", "Upcoming"),

            (12, 3, "Digital Skills for Women — Shubra",
             "Free digital literacy and e-commerce training program for women entrepreneurs "
             "in Shubra, helping them market products online.",
             "Shubra Community Hall, Cairo",
             "2026-04-05", "10:00", 5, 20, 18, "IT, Teaching, E-commerce", "Completed"),

            (13, 3, "Clean Energy Awareness Day",
             "Interactive exhibition and workshops on solar energy, sustainability, and "
             "green entrepreneurship for school students.",
             "Cairo International Convention Center",
             "2026-03-18", "09:00", 6, 20, 20, "Research, Communication, Teaching", "Completed"),

            (14, 3, "Social Impact Pitch Day",
             "Student teams pitch their social enterprise projects to a panel of investors, "
             "NGO leaders, and government representatives.",
             "Enactus Egypt HQ, Heliopolis, Cairo",
             "2026-06-20", "10:00", 4, 15, 3, "Presentation, Business, Leadership", "Upcoming"),
        ]
        db.executemany(
            "INSERT INTO events (id, org_id, name, description, location, date, time, duration, max_volunteers, current_volunteers, required_skills, status) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            events,
        )

        # ──────────── ACTIVITIES ────────────
        # (id, volunteer_id, event_id, org_id, date, hours, description, status)
        # Volunteer 1 (Yara) — main demo user, active in Resala & Red Crescent
        activities = [
            # Yara's Resala activities
            (1,  1, 3,  1, "2026-04-08", 5, "Facilitated two onboarding sessions for 14 new volunteers. "
             "Covered Resala's mission, code of conduct, and volunteer tools.", "Approved"),
            (2,  1, 4,  1, "2026-03-22", 8, "Led the photography workshop on Day 1 and assisted with "
             "social media strategy session on Day 2.", "Approved"),
            (3,  1, 2,  1, "2026-03-15", 8, "Coordinated a team of 6 volunteers for package sorting and "
             "distribution in the Ain Shams zone. Delivered to 80 families.", "Approved"),
            (4,  1, 6,  1, "2026-04-22", 5, "Planted 25 trees in Al-Azhar Park's eastern section. "
             "Also led a short environmental awareness talk for visiting school groups.", "Pending"),

            # Yara's Red Crescent activities
            (5,  1, 9,  2, "2025-12-20", 8, "Managed donor registration at the Borg El-Arab site. "
             "Assisted 200+ donors throughout the day and handled post-donation refreshments.", "Approved"),
            (6,  1, 10, 2, "2026-02-28", 5, "Conducted blood pressure and glucose screening for 85 community "
             "members. Referred 12 high-risk cases to the on-site medical team.", "Approved"),

            # Nadia's activities (Resala)
            (7,  2, 3,  1, "2026-04-08", 5, "Designed and delivered the 'Volunteer Rights & Responsibilities' "
             "module during onboarding.", "Approved"),
            (8,  2, 2,  1, "2026-03-15", 8, "Managed volunteer scheduling and team allocation for the food drive. "
             "Coordinated 48 volunteers across 5 distribution zones.", "Approved"),

            # Karim's activities (Resala)
            (9,  3, 4,  1, "2026-03-22", 8, "Delivered advanced photography masterclass. Produced a 3-minute "
             "highlight video of the event distributed on Resala's social channels.", "Approved"),
            (10, 3, 6,  1, "2026-04-22", 5, "Photographed and documented the entire tree planting event. "
             "Content used for Earth Day campaign.", "Pending"),

            # Sofia's activities (Resala & Enactus)
            (11, 4, 3,  1, "2026-04-08", 5, "Set up volunteer management system on tablets. Assisted with "
             "digital check-in for all 14 attendees.", "Approved"),
            (12, 4, 12, 3, "2026-04-05", 5, "Taught e-commerce basics and social media marketing to 18 women "
             "entrepreneurs. Created take-home reference guide.", "Approved"),

            # Tarek's activities (Resala)
            (13, 5, 2,  1, "2026-03-15", 8, "Handled petty cash and expense tracking for the food drive. "
             "Reconciled all receipts and submitted financial report.", "Approved"),
            (14, 5, 3,  1, "2026-04-08", 5, "Presented budgeting basics workshop for new volunteers interested "
             "in operations and financial roles.", "Approved"),

            # Hana's activities (Red Crescent)
            (15, 6, 9,  2, "2025-12-20", 8, "Coordinated truck loading and route planning for Alexandria "
             "distribution. Supervised 8 field volunteers.", "Approved"),
            (16, 6, 10, 2, "2026-02-28", 5, "Managed supply chain for medical screening kits. Ensured "
             "all stations were stocked throughout the event.", "Approved"),

            # Yusuf's activities (Red Crescent)
            (17, 7, 9,  2, "2025-12-20", 8, "Conducted post-distribution surveys with 50 recipient families "
             "to measure impact and satisfaction.", "Approved"),
            (18, 7, 10, 2, "2026-02-28", 5, "Collected health data from screening participants. Compiled "
             "findings into a 10-page impact report.", "Approved"),

            # Dina's activities (Resala)
            (19, 8, 4,  1, "2026-03-22", 8, "Designed all visual assets for the bootcamp including banners, "
             "slide templates, and social media graphics.", "Approved"),
            (20, 8, 6,  1, "2026-04-22", 5, "Designed event signage and created Instagram story series about "
             "the initiative. Reached 12,000 impressions.", "Pending"),

            # Omar's activities (Enactus)
            (21, 9, 13, 3, "2026-03-18", 6, "Facilitated interactive workshop on renewable energy for "
             "150 high school students. Q&A session lasted 45 minutes.", "Approved"),
            (22, 9, 12, 3, "2026-04-05", 5, "Taught basic computer literacy to 20 women participants. "
             "Covered email, Google Docs, and WhatsApp Business.", "Approved"),

            # Layla's activities (Red Crescent)
            (23, 10, 9,  2, "2025-12-20", 8, "Provided first aid support and monitored volunteer health "
             "during the long field operation day.", "Approved"),
            (24, 10, 10, 2, "2026-02-28", 5, "Assisted with blood pressure screenings and patient intake "
             "under supervision of registered nurses.", "Approved"),
        ]
        db.executemany(
            "INSERT INTO activities (id, volunteer_id, event_id, org_id, date, hours, description, status) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            activities,
        )

        # ──────────── CERTIFICATES ────────────
        # (id, volunteer_id, org_id, event_id, type, hours, issued_date)
        certificates = [
            # Yara's certificates
            (1,  1, 1, 3,  "Completion",    5,  "2026-04-15"),
            (2,  1, 1, 4,  "Achievement",   8,  "2026-04-01"),
            (3,  1, 1, 2,  "Participation", 8,  "2026-03-20"),
            (4,  1, 2, 9,  "Completion",    8,  "2025-12-28"),
            (5,  1, 2, 10, "Participation", 5,  "2026-03-05"),

            # Nadia's certificates
            (6,  2, 1, 3,  "Completion",    5,  "2026-04-15"),
            (7,  2, 1, 2,  "Achievement",   8,  "2026-03-20"),

            # Karim's certificates
            (8,  3, 1, 4,  "Achievement",   8,  "2026-04-01"),

            # Sofia's certificates
            (9,  4, 1, 3,  "Participation", 5,  "2026-04-15"),
            (10, 4, 3, 12, "Completion",    5,  "2026-04-12"),

            # Tarek's certificates
            (11, 5, 1, 2,  "Participation", 8,  "2026-03-20"),
            (12, 5, 1, 3,  "Completion",    5,  "2026-04-15"),

            # Hana's certificates
            (13, 6, 2, 9,  "Achievement",   8,  "2025-12-28"),
            (14, 6, 2, 10, "Completion",    5,  "2026-03-05"),

            # Yusuf's certificates
            (15, 7, 2, 9,  "Completion",    8,  "2025-12-28"),

            # Dina's certificates
            (16, 8, 1, 4,  "Achievement",   8,  "2026-04-01"),

            # Omar's certificates
            (17, 9, 3, 13, "Completion",    6,  "2026-03-25"),
            (18, 9, 3, 12, "Participation", 5,  "2026-04-12"),

            # Layla's certificates
            (19, 10, 2, 9,  "Completion",   8,  "2025-12-28"),
            (20, 10, 2, 10, "Participation", 5, "2026-03-05"),
        ]
        db.executemany(
            "INSERT INTO certificates (id, volunteer_id, org_id, event_id, type, hours, issued_date) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            certificates,
        )

        # ──────────── ANNOUNCEMENTS ────────────
        announcements = [
            (1, 1,
             "Ramadan 2026 Food Drive — Call for Volunteers",
             "We're gearing up for our biggest food drive yet! We need 200+ volunteers across 10 governorates. "
             "Register by April 20th through the Altruism platform. All volunteers will receive a Resala volunteer kit.",
             "2026-04-10 09:00:00"),

            (2, 1,
             "Youth Leadership Forum — Registration Now Open",
             "Spots are filling up fast for our Youth Leadership Forum on May 20th at Bibliotheca Alexandrina. "
             "This year's theme is 'Leading with Purpose'. Register through your dashboard.",
             "2026-04-12 11:00:00"),

            (3, 1,
             "Congratulations to Our Top Volunteers — Q1 2026",
             "We're proud to recognize our most dedicated volunteers this quarter: Yara Hassan (38 hours), "
             "Nadia Mahmoud (34 hours), and Karim Mostafa (31 hours). Thank you for your incredible commitment!",
             "2026-04-01 10:00:00"),

            (4, 2,
             "Blood Donation Drive — May 5th — Register Now",
             "The Egyptian Red Crescent's Spring Blood Donation Drive will cover 12 governorates on May 5th. "
             "We need volunteers for donor registration, medical support, and logistics. "
             "All volunteers receive training and certification.",
             "2026-04-11 08:30:00"),

            (5, 2,
             "Disaster Preparedness Training — Limited Seats",
             "Our next Disaster Preparedness & Emergency Response training starts April 14th at the Red Crescent HQ. "
             "This is a mandatory certification for all field volunteers. Only 5 seats remaining.",
             "2026-04-08 14:00:00"),

            (6, 2,
             "Winter Aid Campaign — Final Impact Report",
             "Our Winter Aid Distribution in Alexandria reached 1,247 families across 8 districts. "
             "Thanks to our 35 volunteers who braved the cold to make this possible. Full report available on request.",
             "2026-01-15 09:00:00"),

            (7, 3,
             "Spring Entrepreneurship Bootcamp — Applications Open",
             "Calling all innovators! Apply now to participate or volunteer at our Spring Entrepreneurship Bootcamp "
             "on May 15th–17th at AUC New Cairo. Mentors from 12 leading companies will be in attendance.",
             "2026-04-09 10:00:00"),

            (8, 3,
             "Enactus Egypt Wins Regional Award!",
             "We're thrilled to announce that Enactus Egypt has won the MENA Regional Impact Award 2026 for our "
             "Digital Skills for Women project. This is a testament to the hard work of every volunteer and team member!",
             "2026-04-05 16:00:00"),

            (9, 3,
             "Social Impact Pitch Day — Volunteer Judges Needed",
             "We're looking for experienced volunteers to serve as judges or audience facilitators at our "
             "Social Impact Pitch Day on June 20th. Background in business, technology, or social work preferred.",
             "2026-04-13 09:00:00"),
        ]
        db.executemany(
            "INSERT INTO announcements (id, org_id, title, content, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            announcements,
        )

        # ──────────── EVENT APPLICATIONS ────────────
        # Yara has applied to upcoming events
        event_applications = [
            (1, 1, 1,  1, "Pending",  "2026-04-13 10:00:00"),  # Youth Leadership Forum
            (2, 1, 7,  2, "Pending",  "2026-04-13 10:05:00"),  # Blood Donation Drive
            (3, 1, 5,  1, "Approved", "2026-04-11 09:00:00"),  # Digital Literacy Workshop
        ]
        db.executemany(
            "INSERT INTO event_applications (id, volunteer_id, event_id, org_id, status, applied_date) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            event_applications,
        )

    print("Database seeded successfully with realistic demo data!")
    print()
    print("Demo credentials:")
    print("  volunteer@example.com / volunteer  (Yara Hassan — active in Resala & Red Crescent)")
    print("  admin@resala.org / admin           (Resala admin)")
    print("  admin@redcrescent.org / admin      (Red Crescent admin)")
    print("  admin@enactus.org / admin          (Enactus admin)")
    print("  amira@resala.org / supervisor      (Resala supervisor)")


if __name__ == "__main__":
    seed()
