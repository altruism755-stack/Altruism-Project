const bcrypt = require("bcryptjs");
const { getDb } = require("./models/db");

function seed() {
  const db = getDb();
  console.log("Seeding database...");

  const hash = (pw) => bcrypt.hashSync(pw, 10);

  db.exec("DELETE FROM certificates; DELETE FROM activities; DELETE FROM org_volunteers; DELETE FROM events; DELETE FROM supervisors; DELETE FROM volunteers; DELETE FROM organizations; DELETE FROM users;");

  // Users
  const insertUser = db.prepare("INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)");
  insertUser.run(1, "admin@example.com", hash("admin"), "org_admin");
  insertUser.run(2, "supervisor@example.com", hash("supervisor"), "supervisor");
  insertUser.run(3, "volunteer@example.com", hash("volunteer"), "volunteer");
  insertUser.run(4, "nadia@example.com", hash("volunteer"), "volunteer");
  insertUser.run(5, "karim@example.com", hash("volunteer"), "volunteer");
  insertUser.run(6, "sofia@example.com", hash("volunteer"), "volunteer");
  insertUser.run(7, "tarek@example.com", hash("volunteer"), "volunteer");
  insertUser.run(8, "hana@example.com", hash("volunteer"), "volunteer");
  insertUser.run(9, "yusuf@example.com", hash("volunteer"), "volunteer");
  insertUser.run(10, "dina@example.com", hash("volunteer"), "volunteer");
  insertUser.run(11, "mahmoud@resala.org", hash("supervisor"), "supervisor");
  insertUser.run(12, "rania@resala.org", hash("supervisor"), "supervisor");

  // Organizations
  db.prepare(
    "INSERT INTO organizations (id, name, description, category, color, secondary_color, initials, founded, admin_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(1, "Resala", "Community support, youth empowerment, and social welfare programs across Egypt.", "Social Welfare", "#D97706", "#F59E0B", "RS", "1999-01-01", 1);
  db.prepare(
    "INSERT INTO organizations (id, name, description, category, color, secondary_color, initials, founded) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(2, "Egyptian Red Crescent", "Humanitarian aid, disaster relief, and health services.", "Humanitarian Aid", "#DC2626", "#EF4444", "RC", "1912-03-15");
  db.prepare(
    "INSERT INTO organizations (id, name, description, category, color, secondary_color, initials, founded) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(3, "Enactus Egypt", "Student-led entrepreneurship and community development.", "Student Entrepreneurship", "#0891B2", "#06B6D4", "EN", "2004-09-01");

  // Volunteers
  const insertVol = db.prepare("INSERT INTO volunteers (id, user_id, name, email, phone, city, skills, about_me, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
  insertVol.run(1, 3, "Test Volunteer", "volunteer@example.com", "01212345678", "Alexandria", '["Communication","Event Planning","Photography"]', "Passionate about community service.", "Active");
  insertVol.run(2, 4, "Nadia Mahmoud", "nadia@example.com", "01234567890", "Cairo", '["HR","Training"]', null, "Active");
  insertVol.run(3, 5, "Karim Mostafa", "karim@example.com", "01098765432", "Cairo", '["Media","Photography","Social Media"]', null, "Active");
  insertVol.run(4, 6, "Sofia Al-Hassan", "sofia@example.com", "01112223344", "Giza", '["IT","Web Development"]', null, "Pending");
  insertVol.run(5, 7, "Tarek Ibrahim", "tarek@example.com", "01556677889", "Cairo", '["Finance","Accounting"]', null, "Active");
  insertVol.run(6, 8, "Hana Yousef", "hana@example.com", "01667788990", "Alexandria", '["Operations","Logistics"]', null, "Active");
  insertVol.run(7, 9, "Yusuf Bakr", "yusuf@example.com", "01788990011", "Cairo", '["Fieldwork","Research"]', null, "Suspended");
  insertVol.run(8, 10, "Dina El-Sayed", "dina@example.com", "01899001122", "Cairo", '["Digital Media","Graphic Design"]', null, "Active");

  // Supervisors
  const insertSup = db.prepare("INSERT INTO supervisors (id, user_id, name, email, phone, team, org_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  insertSup.run(1, 2, "Dr. Amira Khalil", "supervisor@example.com", "01011223344", "Programs", 1, "Active");
  insertSup.run(2, 11, "Mahmoud Hassan", "mahmoud@resala.org", "01022334455", "Media", 1, "Active");
  insertSup.run(3, 12, "Rania Saleh", "rania@resala.org", "01033445566", "Finance", 1, "Active");

  // Org-Volunteer assignments
  const insertOV = db.prepare("INSERT INTO org_volunteers (org_id, volunteer_id, supervisor_id, department, status, joined_date) VALUES (?, ?, ?, ?, ?, ?)");
  insertOV.run(1, 1, 1, "HR", "Active", "2026-02-13");
  insertOV.run(1, 2, 1, "HR", "Active", "2026-01-20");
  insertOV.run(1, 3, 2, "Media", "Active", "2026-02-01");
  insertOV.run(1, 4, 2, "IT", "Pending", "2026-03-10");
  insertOV.run(1, 5, 3, "Finance", "Active", "2025-11-15");
  insertOV.run(2, 1, null, "Humanitarian", "Active", "2026-02-13");
  insertOV.run(2, 6, null, "Operations", "Active", "2025-12-01");
  insertOV.run(2, 7, null, "Field", "Active", "2026-01-05");
  insertOV.run(3, 2, null, "Media", "Active", "2025-10-05");
  insertOV.run(3, 3, null, "Media", "Active", "2025-11-01");
  insertOV.run(3, 8, null, "Digital", "Active", "2026-01-22");

  // Events
  const insertEv = db.prepare("INSERT INTO events (id, org_id, name, description, location, date, time, duration, max_volunteers, current_volunteers, required_skills, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  insertEv.run(1, 1, "Youth Leadership Forum", "Panel discussions and workshops.", "Alexandria Center", "2026-05-10", "09:00", 5, 20, 12, "Leadership, Communication", "Upcoming");
  insertEv.run(2, 1, "Tree Planting Drive", "Annual Earth Day tree planting.", "Giza Parks", "2026-04-22", "08:00", 4, 30, 25, "Fieldwork", "Active");
  insertEv.run(3, 1, "HR Workshop", "HR orientation sessions.", "Cairo HQ", "2026-04-08", "10:00", 7, 15, 15, "HR, Training", "Completed");
  insertEv.run(4, 1, "Media Training Session", "Photography and social media training.", "Cairo", "2026-03-15", "10:00", 7, 10, 10, "Photography, Social Media", "Completed");
  insertEv.run(5, 1, "Community Outreach Day", "Awareness campaign for water conservation.", "Downtown Cairo", "2026-03-05", "09:00", 5, 25, 18, "Communication", "Completed");
  insertEv.run(6, 1, "Digital Literacy Workshop", "Teaching basic computer skills.", "Cairo Community Center", "2026-06-01", "10:00", 4, 15, 3, "IT, Teaching", "Upcoming");

  // Activities
  const insertAct = db.prepare("INSERT INTO activities (id, volunteer_id, event_id, org_id, date, hours, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  insertAct.run(1, 1, 3, 1, "2026-04-08", 7, "Conducted HR orientation sessions.", "Approved");
  insertAct.run(2, 1, 4, 1, "2026-03-15", 7, "Photography and social media strategy training.", "Approved");
  insertAct.run(3, 1, 5, 1, "2026-03-05", 5, "Door-to-door awareness campaign.", "Approved");
  insertAct.run(4, 1, 2, 1, "2026-04-22", 4, "Planted saplings in Giza parks.", "Pending");
  insertAct.run(5, 2, 3, 1, "2026-04-08", 7, "Assisted with HR orientation workshops.", "Approved");
  insertAct.run(6, 3, 4, 1, "2026-03-15", 7, "Led photography training segment.", "Pending");
  insertAct.run(7, 5, 5, 1, "2026-03-05", 5, "Managed financial tracking.", "Approved");
  insertAct.run(8, 6, 2, 1, "2026-04-22", 4, "Coordinated logistics.", "Pending");
  insertAct.run(9, 8, 4, 1, "2026-03-15", 3, "Created social media content.", "Rejected");

  // Certificates
  const insertCert = db.prepare("INSERT INTO certificates (id, volunteer_id, org_id, event_id, type, hours, issued_date) VALUES (?, ?, ?, ?, ?, ?, ?)");
  insertCert.run(1, 1, 1, 3, "Completion", 7, "2026-04-10");
  insertCert.run(2, 1, 1, 4, "Participation", 7, "2026-03-18");
  insertCert.run(3, 1, 2, 5, "Achievement", 5, "2026-03-08");
  insertCert.run(4, 2, 1, 3, "Completion", 7, "2026-04-10");
  insertCert.run(5, 5, 1, 5, "Participation", 5, "2026-03-08");
  insertCert.run(6, 3, 3, 4, "Achievement", 7, "2026-03-18");

  console.log("Database seeded successfully!");
}

seed();
