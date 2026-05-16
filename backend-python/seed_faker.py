"""
Append 400 realistic Egyptian volunteer profiles to the database.
Safe to run multiple times — uses ON CONFLICT DO NOTHING.
Does NOT wipe existing data.
"""

import json
import random
from dotenv import load_dotenv
load_dotenv()
from database import get_db
from auth import hash_password

MALE_FIRST = [
    "Ahmed","Mohamed","Omar","Khaled","Youssef","Tamer","Hassan","Mahmoud",
    "Ibrahim","Karim","Sherif","Amr","Walid","Hossam","Mostafa","Tarek",
    "Ayman","Ramy","Samer","Nader","Zeyad","Bassem","Fares","Adam","Ziad",
    "Adel","Ashraf","Magdy","Samir","Essam","Wael","Alaa","Hazem","Nabil",
]
FEMALE_FIRST = [
    "Nadia","Sara","Fatima","Mariam","Hana","Layla","Reem","Dina","Mona",
    "Aya","Salma","Nour","Rania","Yasmin","Amira","Heba","Noha","Rana",
    "Doaa","Samar","Ghada","Eman","Neveen","Reena","Malak","Zeinab","Shaimaa",
    "Passant","Nadine","Rowan","Lina","Menna","Nermeen","Randa","Asmaa",
]
LAST = [
    "Hassan","Mohamed","Ahmed","Ibrahim","Ali","Omar","Kamal","Nasser","Farouk",
    "Mansour","Khalil","Saad","Aziz","Rashad","Gamal","Zaki","Shafik","Amin",
    "Fouad","Wahba","Ragab","Samir","Naguib","Helmy","El-Din","Badawi","Lotfy",
    "Abdallah","Yousef","Gaber","Ramadan","Saleh","Fathy","Morsi","Sharaf",
]
CITIES = [
    ("Cairo","Cairo"),("Giza","Giza"),("Alexandria","Alexandria"),
    ("Maadi","Cairo"),("Heliopolis","Cairo"),("Nasr City","Cairo"),
    ("Zamalek","Cairo"),("Shubra","Cairo"),("Dokki","Giza"),
    ("Mohandessin","Giza"),("Mansoura","Dakahlia"),("Tanta","Gharbia"),
    ("Zagazig","Sharqia"),("Aswan","Aswan"),("Luxor","Luxor"),
    ("Ismailia","Ismailia"),("Port Said","Port Said"),("Suez","Suez"),
    ("Asyut","Asyut"),("Sohag","Sohag"),("Madinaty","Cairo"),
    ("Helwan","Cairo"),("6th of October","Giza"),("New Cairo","Cairo"),
]
UNIVERSITIES = [
    ("Cairo University","Faculty of Arts"),
    ("Cairo University","Faculty of Commerce"),
    ("Cairo University","Faculty of Law"),
    ("Cairo University","Faculty of Mass Communication"),
    ("Cairo University","Faculty of Computers and AI"),
    ("Ain Shams University","Faculty of Education"),
    ("Ain Shams University","Faculty of Medicine"),
    ("Ain Shams University","Faculty of Nursing"),
    ("Alexandria University","Faculty of Engineering"),
    ("Alexandria University","Faculty of Arts"),
    ("Mansoura University","Faculty of Science"),
    ("Mansoura University","Faculty of Education"),
    ("Zagazig University","Faculty of Agriculture"),
    ("Helwan University","Faculty of Applied Arts"),
    ("Helwan University","Faculty of Fine Arts"),
    ("Tanta University","Faculty of Arts"),
    ("Assiut University","Faculty of Medicine"),
    ("The American University in Cairo","School of Business"),
    ("The American University in Cairo","School of Humanities"),
    ("German University in Cairo","Faculty of Management Technology"),
    ("British University in Egypt","Faculty of Engineering"),
    ("Nile University","Faculty of Engineering"),
]
EDU_LEVELS = [
    "University Student","University Student","University Student",
    "University Graduate","University Graduate",
    "Postgraduate (Diploma / Master / PhD)",
]
STUDY_YEARS = ["1st Year","2nd Year","3rd Year","4th Year",""]
FIELDS = [
    "Business Administration","Mass Communication","Computer Science",
    "Sociology","Law","Medicine","Nursing","Engineering","Education",
    "Graphic Design","Environmental Science","Economics","Accounting",
    "Translation Studies","Political Science","Psychology","Architecture",
    "Pharmacy","Social Work","Information Technology",
]
DEPARTMENTS = [
    "Programs","HR","Media","IT","Finance","Outreach","Medical",
    "Logistics","Field","Translation","Education","Design","Operations",
    "Legal","Partnerships","Environment","Fundraising","Content Creation",
]
SKILLS_POOL = [
    "Community Outreach","Event Planning","Photography & Videography",
    "Social Media Management","Graphic Design","Administrative Support",
    "Teaching / Tutoring","Medical / First Aid","Fundraising",
    "Software Development","Translation","Environmental Work",
]
LANGUAGES_POOL = [
    ("Arabic","Native"),("English","Fluent"),("English","Conversational"),
    ("French","Conversational"),("French","Basic"),("German","Conversational"),
    ("Spanish","Basic"),("Italian","Basic"),
]
CAUSES_ALL = [
    "Social & Humanitarian","Children & Youth","Education & Skills",
    "Health & Emergency","Environment",
]
AVAIL_OPTIONS = [
    ["Weekends"],
    ["Weekday afternoons","Weekends"],
    ["Weekday evenings","Weekends"],
    ["Weekday mornings"],
    ["Weekday afternoons"],
]
HOURS_OPTIONS = [4,6,8,10,12]

# org_id → (list of supervisor_ids)
ORG_SUPERVISORS = {1: [1,2], 2: [3,4], 3: [5,6]}
# All org_ids
ORG_IDS = [1, 2, 3]

def seed_faker():
    with get_db() as db:
        # Find the max existing user id and volunteer id
        max_uid = db.execute("SELECT COALESCE(MAX(id),100) AS m FROM users").fetchone()["m"]
        max_vid = db.execute("SELECT COALESCE(MAX(id),25) AS m FROM volunteers").fetchone()["m"]

        print(f"Starting from user_id={max_uid+1}, volunteer_id={max_vid+1}")

        N = 400
        pwd = hash_password("Vol#12345")

        users, vols, skills, langs, causes, org_vols = [], [], [], [], [], []

        used_emails = set(
            r["email"] for r in db.execute("SELECT email FROM users").fetchall()
        )

        vid = max_vid + 1
        uid = max_uid + 1
        created = 0

        male_first = MALE_FIRST.copy()
        female_first = FEMALE_FIRST.copy()

        attempts = 0
        while created < N and attempts < N * 5:
            attempts += 1
            gender = random.choice(["Male","Female"])
            first = random.choice(male_first if gender == "Male" else female_first)
            last1 = random.choice(LAST)
            last2 = random.choice(LAST)
            name = f"{first} {last1} {last2}"

            slug = first.lower().replace(" ","") + last1.lower() + str(random.randint(1,999))
            email = f"{slug}@gmail.com"
            if email in used_emails:
                continue
            used_emails.add(email)

            city, gov = random.choice(CITIES)
            uni, faculty = random.choice(UNIVERSITIES)
            edu = random.choice(EDU_LEVELS)
            study_year = random.choice(STUDY_YEARS) if "Student" in edu else ""
            field = random.choice(FIELDS)
            dept = random.choice(DEPARTMENTS)
            hours = random.choice(HOURS_OPTIONS)
            avail = random.choice(AVAIL_OPTIONS)

            # Skills: 2–3 random
            vol_skills = random.sample(SKILLS_POOL, random.randint(2, 3))

            # Languages: always Arabic, maybe English, maybe a third
            vol_langs = [("Arabic","Native")]
            if random.random() > 0.1:
                vol_langs.append(("English", random.choice(["Fluent","Conversational"])))
            if random.random() > 0.7:
                extra = random.choice([l for l in LANGUAGES_POOL if l[0] not in ("Arabic","English")])
                vol_langs.append(extra)

            # Causes: 2–5
            vol_causes = random.sample(CAUSES_ALL, random.randint(2, 5))

            # DOB: age 18–40
            year = random.randint(1985, 2007)
            month = random.randint(1, 12)
            day = random.randint(1, 28)
            dob = f"{year}-{month:02d}-{day:02d}"

            prior_exp = random.choice([0, 0, 0, 1])
            prior_org = ""
            if prior_exp:
                prior_org = random.choice([
                    "Resala","Egyptian Food Bank","Misr El-Kheir Foundation",
                    "Educate Me Foundation","Greenish Egypt","UNHCR Egypt",
                ])

            phone = f"01{random.choice([0,1,2,5])}{random.randint(10000000,99999999)}"

            users.append((uid, email, pwd, "volunteer"))

            vols.append((
                vid, uid, name, phone, city,
                json.dumps(vol_skills),
                "active", dob, gov,
                "", gender, "Egyptian",
                edu, uni, faculty, study_year, field, dept,
                hours,
                json.dumps([{"language": l, "proficiency": p} for l, p in vol_langs]),
                json.dumps(vol_causes),
                json.dumps(avail),
                prior_exp, prior_org, json.dumps([]), "",
            ))

            for s in vol_skills:
                skills.append((vid, s))
            for l, p in vol_langs:
                langs.append((vid, l))
            for c in vol_causes:
                causes.append((vid, c))

            # Join 1–2 orgs
            joined_orgs = random.sample(ORG_IDS, random.randint(1, 2))
            join_dates = ["2025-08-01","2025-09-15","2025-10-01","2025-11-20",
                          "2025-12-10","2026-01-05","2026-02-01","2026-03-10",
                          "2026-04-01","2026-04-20","2026-05-01"]
            for oid in joined_orgs:
                status = random.choices(["active","active","active","pending"], [6,6,6,1])[0]
                org_vols.append((
                    oid, vid, random.choice(DEPARTMENTS), status,
                    random.choice(join_dates), "self_registration",
                ))

            vid += 1
            uid += 1
            created += 1

        print(f"Inserting {created} users...")
        with db.cursor() as cur:
            cur.executemany(
                "INSERT INTO users (id, email, password, role) VALUES (%s,%s,%s,%s) ON CONFLICT DO NOTHING",
                users,
            )

        print(f"Inserting {created} volunteers...")
        vol_sql = (
            "INSERT INTO volunteers ("
            "id, user_id, name, phone, city, skills, status, date_of_birth, governorate, "
            "national_id, gender, nationality, education_level, university_name, faculty, study_year, "
            "field_of_study, department, hours_per_week, languages, cause_areas, availability, "
            "prior_experience, prior_org, experiences, health_notes"
            ") VALUES (" + ",".join(["%s"]*26) + ") ON CONFLICT DO NOTHING"
        )
        with db.cursor() as cur:
            cur.executemany(vol_sql, vols)

        print("Inserting skills, languages, causes...")
        with db.cursor() as cur:
            cur.executemany(
                "INSERT INTO volunteer_skills (volunteer_id, skill) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                skills,
            )
            cur.executemany(
                "INSERT INTO volunteer_languages (volunteer_id, language) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                langs,
            )
            cur.executemany(
                "INSERT INTO volunteer_cause_areas (volunteer_id, cause_area) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                causes,
            )

        print("Inserting org memberships...")
        with db.cursor() as cur:
            cur.executemany(
                "INSERT INTO org_volunteers (org_id, volunteer_id, department, status, joined_at, join_source) "
                "VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
                org_vols,
            )

    print(f"\nDone! Added {created} faker volunteers.")
    print("All passwords: Vol#12345")


if __name__ == "__main__":
    seed_faker()
