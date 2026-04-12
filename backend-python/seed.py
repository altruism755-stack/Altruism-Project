"""Seed the database with demo data — identical to the Node.js seed.js."""

import json
from database import init_schema, get_db
from auth import hash_password


def seed():
    init_schema()

    with get_db() as db:
        print("Seeding database...")

        # Clear tables in dependency order
        for table in [
            "certificates", "activities", "org_volunteers",
            "events", "supervisors", "volunteers", "organizations", "users",
        ]:
            db.execute(f"DELETE FROM {table}")

        h = hash_password

        # Users (12)
        users = [
            (1, "admin@example.com", h("admin"), "org_admin"),
            (2, "supervisor@example.com", h("supervisor"), "supervisor"),
            (3, "volunteer@example.com", h("volunteer"), "volunteer"),
            (4, "nadia@example.com", h("volunteer"), "volunteer"),
            (5, "karim@example.com", h("volunteer"), "volunteer"),
            (6, "sofia@example.com", h("volunteer"), "volunteer"),
            (7, "tarek@example.com", h("volunteer"), "volunteer"),
            (8, "hana@example.com", h("volunteer"), "volunteer"),
            (9, "yusuf@example.com", h("volunteer"), "volunteer"),
            (10, "dina@example.com", h("volunteer"), "volunteer"),
            (11, "mahmoud@resala.org", h("supervisor"), "supervisor"),
            (12, "rania@resala.org", h("supervisor"), "supervisor"),
        ]
        db.executemany("INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)", users)

        # Organizations (3)
        db.execute(
            "INSERT INTO organizations (id, name, description, category, color, secondary_color, initials, founded, admin_user_id) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (1, "Resala", "Community support, youth empowerment, and social welfare programs across Egypt.",
             "Social Welfare", "#D97706", "#F59E0B", "RS", "1999-01-01", 1),
        )
        db.execute(
            "INSERT INTO organizations (id, name, description, category, color, secondary_color, initials, founded) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (2, "Egyptian Red Crescent", "Humanitarian aid, disaster relief, and health services.",
             "Humanitarian Aid", "#DC2626", "#EF4444", "RC", "1912-03-15"),
        )
        db.execute(
            "INSERT INTO organizations (id, name, description, category, color, secondary_color, initials, founded) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (3, "Enactus Egypt", "Student-led entrepreneurship and community development.",
             "Student Entrepreneurship", "#0891B2", "#06B6D4", "EN", "2004-09-01"),
        )

        # Volunteers (8)
        volunteers = [
            (1, 3, "Test Volunteer", "volunteer@example.com", "01212345678", "Alexandria",
             json.dumps(["Communication", "Event Planning", "Photography"]),
             "Passionate about community service.", "Active"),
            (2, 4, "Nadia Mahmoud", "nadia@example.com", "01234567890", "Cairo",
             json.dumps(["HR", "Training"]), None, "Active"),
            (3, 5, "Karim Mostafa", "karim@example.com", "01098765432", "Cairo",
             json.dumps(["Media", "Photography", "Social Media"]), None, "Active"),
            (4, 6, "Sofia Al-Hassan", "sofia@example.com", "01112223344", "Giza",
             json.dumps(["IT", "Web Development"]), None, "Pending"),
            (5, 7, "Tarek Ibrahim", "tarek@example.com", "01556677889", "Cairo",
             json.dumps(["Finance", "Accounting"]), None, "Active"),
            (6, 8, "Hana Yousef", "hana@example.com", "01667788990", "Alexandria",
             json.dumps(["Operations", "Logistics"]), None, "Active"),
            (7, 9, "Yusuf Bakr", "yusuf@example.com", "01788990011", "Cairo",
             json.dumps(["Fieldwork", "Research"]), None, "Suspended"),
            (8, 10, "Dina El-Sayed", "dina@example.com", "01899001122", "Cairo",
             json.dumps(["Digital Media", "Graphic Design"]), None, "Active"),
        ]
        db.executemany(
            "INSERT INTO volunteers (id, user_id, name, email, phone, city, skills, about_me, status) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            volunteers,
        )

        # Supervisors (3)
        supervisors = [
            (1, 2, "Dr. Amira Khalil", "supervisor@example.com", "01011223344", "Programs", 1, "Active"),
            (2, 11, "Mahmoud Hassan", "mahmoud@resala.org", "01022334455", "Media", 1, "Active"),
            (3, 12, "Rania Saleh", "rania@resala.org", "01033445566", "Finance", 1, "Active"),
        ]
        db.executemany(
            "INSERT INTO supervisors (id, user_id, name, email, phone, team, org_id, status) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            supervisors,
        )

        # Org-Volunteer assignments (11)
        org_vols = [
            (1, 1, 1, "HR", "Active", "2026-02-13"),
            (1, 2, 1, "HR", "Active", "2026-01-20"),
            (1, 3, 2, "Media", "Active", "2026-02-01"),
            (1, 4, 2, "IT", "Pending", "2026-03-10"),
            (1, 5, 3, "Finance", "Active", "2025-11-15"),
            (2, 1, None, "Humanitarian", "Active", "2026-02-13"),
            (2, 6, None, "Operations", "Active", "2025-12-01"),
            (2, 7, None, "Field", "Active", "2026-01-05"),
            (3, 2, None, "Media", "Active", "2025-10-05"),
            (3, 3, None, "Media", "Active", "2025-11-01"),
            (3, 8, None, "Digital", "Active", "2026-01-22"),
        ]
        db.executemany(
            "INSERT INTO org_volunteers (org_id, volunteer_id, supervisor_id, department, status, joined_date) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            org_vols,
        )

        # Events (6)
        events = [
            (1, 1, "Youth Leadership Forum", "Panel discussions and workshops.", "Alexandria Center",
             "2026-05-10", "09:00", 5, 20, 12, "Leadership, Communication", "Upcoming"),
            (2, 1, "Tree Planting Drive", "Annual Earth Day tree planting.", "Giza Parks",
             "2026-04-22", "08:00", 4, 30, 25, "Fieldwork", "Active"),
            (3, 1, "HR Workshop", "HR orientation sessions.", "Cairo HQ",
             "2026-04-08", "10:00", 7, 15, 15, "HR, Training", "Completed"),
            (4, 1, "Media Training Session", "Photography and social media training.", "Cairo",
             "2026-03-15", "10:00", 7, 10, 10, "Photography, Social Media", "Completed"),
            (5, 1, "Community Outreach Day", "Awareness campaign for water conservation.", "Downtown Cairo",
             "2026-03-05", "09:00", 5, 25, 18, "Communication", "Completed"),
            (6, 1, "Digital Literacy Workshop", "Teaching basic computer skills.", "Cairo Community Center",
             "2026-06-01", "10:00", 4, 15, 3, "IT, Teaching", "Upcoming"),
        ]
        db.executemany(
            "INSERT INTO events (id, org_id, name, description, location, date, time, duration, max_volunteers, current_volunteers, required_skills, status) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            events,
        )

        # Activities (9)
        activities = [
            (1, 1, 3, 1, "2026-04-08", 7, "Conducted HR orientation sessions.", "Approved"),
            (2, 1, 4, 1, "2026-03-15", 7, "Photography and social media strategy training.", "Approved"),
            (3, 1, 5, 1, "2026-03-05", 5, "Door-to-door awareness campaign.", "Approved"),
            (4, 1, 2, 1, "2026-04-22", 4, "Planted saplings in Giza parks.", "Pending"),
            (5, 2, 3, 1, "2026-04-08", 7, "Assisted with HR orientation workshops.", "Approved"),
            (6, 3, 4, 1, "2026-03-15", 7, "Led photography training segment.", "Pending"),
            (7, 5, 5, 1, "2026-03-05", 5, "Managed financial tracking.", "Approved"),
            (8, 6, 2, 1, "2026-04-22", 4, "Coordinated logistics.", "Pending"),
            (9, 8, 4, 1, "2026-03-15", 3, "Created social media content.", "Rejected"),
        ]
        db.executemany(
            "INSERT INTO activities (id, volunteer_id, event_id, org_id, date, hours, description, status) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            activities,
        )

        # Certificates (6)
        certificates = [
            (1, 1, 1, 3, "Completion", 7, "2026-04-10"),
            (2, 1, 1, 4, "Participation", 7, "2026-03-18"),
            (3, 1, 2, 5, "Achievement", 5, "2026-03-08"),
            (4, 2, 1, 3, "Completion", 7, "2026-04-10"),
            (5, 5, 1, 5, "Participation", 5, "2026-03-08"),
            (6, 3, 3, 4, "Achievement", 7, "2026-03-18"),
        ]
        db.executemany(
            "INSERT INTO certificates (id, volunteer_id, org_id, event_id, type, hours, issued_date) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            certificates,
        )

    print("Database seeded successfully!")


if __name__ == "__main__":
    seed()
