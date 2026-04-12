// ─── Types ──────────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  description: string;
  color: string;
  secondaryColor: string;
  initials: string;
  founded: string;
  category: string;
}

export interface Volunteer {
  id: number;
  name: string;
  email: string;
  phone: string;
  city: string;
  skills: string[];
  supervisor: string;
  status: "Active" | "Pending" | "Suspended";
  joinedDate: string;
  totalHours: number;
  aboutMe?: string;
}

export interface Supervisor {
  id: number;
  name: string;
  email: string;
  phone: string;
  team: string;
  assignedVolunteers: number;
  status: "Active" | "Pending";
  joinedDate: string;
}

export interface Event {
  id: number;
  name: string;
  description: string;
  location: string;
  date: string;
  time: string;
  duration: number;
  maxVolunteers: number;
  currentVolunteers: number;
  requiredSkills: string;
  status: "Upcoming" | "Active" | "Completed";
}

export interface Activity {
  id: number;
  volunteerName: string;
  volunteerId: number;
  eventName: string;
  date: string;
  hours: number;
  description: string;
  status: "Pending" | "Approved" | "Rejected";
}

export interface OrgMember {
  id: number;
  name: string;
  email: string;
  phone: string;
  dept: string;
  role: "volunteer" | "supervisor";
  status: "Active" | "Pending" | "Inactive";
  joinedDate: string;
}

export interface OrgActivity {
  id: number;
  name: string;
  date: string;
  hours: number;
  status: "Completed" | "Upcoming" | "Cancelled";
  location: string;
  description: string;
}

export interface Certificate {
  id: number;
  volunteerId: number;
  volunteerName: string;
  orgId: string;
  orgName: string;
  eventName: string;
  issuedDate: string;
  hours: number;
  type: "Participation" | "Achievement" | "Completion";
}
// ─── Organizations ───────────────────────────────────────────────────────────

export const ORGANIZATIONS: Organization[] = [
  {
    id: "org1",
    name: "Resala",
    description: "Community support, youth empowerment, and social welfare programs across Egypt.",
    color: "#D97706",
    secondaryColor: "#F59E0B",
    initials: "RS",
    founded: "1999-01-01",
    category: "Social Welfare",
  },
  {
    id: "org2",
    name: "Egyptian Red Crescent",
    description: "Humanitarian aid, disaster relief, and health services for communities in need.",
    color: "#DC2626",
    secondaryColor: "#EF4444",
    initials: "RC",
    founded: "1912-03-15",
    category: "Humanitarian Aid",
  },
  {
    id: "org3",
    name: "Enactus Egypt",
    description: "Student-led entrepreneurship and community development projects at universities.",
    color: "#0891B2",
    secondaryColor: "#06B6D4",
    initials: "EN",
    founded: "2004-09-01",
    category: "Student Entrepreneurship",
  },
];

// ─── Volunteers ──────────────────────────────────────────────────────────────

export const VOLUNTEERS: Volunteer[] = [
  {
    id: 1,
    name: "Test Volunteer",
    email: "volunteer@example.com",
    phone: "01212345678",
    city: "Alexandria",
    skills: ["Communication", "Event Planning", "Photography"],
    supervisor: "Dr. Amira Khalil",
    status: "Active",
    joinedDate: "2026-02-13",
    totalHours: 26,
    aboutMe: "Passionate about community service and making a difference.",
  },
  {
    id: 2,
    name: "Nadia Mahmoud",
    email: "nadia@example.com",
    phone: "01234567890",
    city: "Cairo",
    skills: ["HR", "Training"],
    supervisor: "Dr. Amira Khalil",
    status: "Active",
    joinedDate: "2026-01-20",
    totalHours: 42,
  },
  {
    id: 3,
    name: "Karim Mostafa",
    email: "karim@example.com",
    phone: "01098765432",
    city: "Cairo",
    skills: ["Media", "Photography", "Social Media"],
    supervisor: "Mahmoud Hassan",
    status: "Active",
    joinedDate: "2026-02-01",
    totalHours: 31,
  },
  {
    id: 4,
    name: "Sofia Al-Hassan",
    email: "sofia@example.com",
    phone: "01112223344",
    city: "Giza",
    skills: ["IT", "Web Development"],
    supervisor: "Mahmoud Hassan",
    status: "Pending",
    joinedDate: "2026-03-10",
    totalHours: 0,
  },
  {
    id: 5,
    name: "Tarek Ibrahim",
    email: "tarek@example.com",
    phone: "01556677889",
    city: "Cairo",
    skills: ["Finance", "Accounting"],
    supervisor: "Rania Saleh",
    status: "Active",
    joinedDate: "2025-11-15",
    totalHours: 55,
  },
  {
    id: 6,
    name: "Hana Yousef",
    email: "hana@example.com",
    phone: "01667788990",
    city: "Alexandria",
    skills: ["Operations", "Logistics"],
    supervisor: "Dr. Amira Khalil",
    status: "Active",
    joinedDate: "2025-12-01",
    totalHours: 38,
  },
  {
    id: 7,
    name: "Yusuf Bakr",
    email: "yusuf@example.com",
    phone: "01788990011",
    city: "Cairo",
    skills: ["Fieldwork", "Research"],
    supervisor: "Rania Saleh",
    status: "Suspended",
    joinedDate: "2026-01-05",
    totalHours: 12,
  },
  {
    id: 8,
    name: "Dina El-Sayed",
    email: "dina@example.com",
    phone: "01899001122",
    city: "Cairo",
    skills: ["Digital Media", "Graphic Design"],
    supervisor: "Mahmoud Hassan",
    status: "Active",
    joinedDate: "2026-01-22",
    totalHours: 20,
  },
];

// ─── Supervisors ─────────────────────────────────────────────────────────────

export const SUPERVISORS: Supervisor[] = [
  {
    id: 101,
    name: "Dr. Amira Khalil",
    email: "supervisor@example.com",
    phone: "01011223344",
    team: "Programs",
    assignedVolunteers: 3,
    status: "Active",
    joinedDate: "2024-01-15",
  },
  {
    id: 102,
    name: "Mahmoud Hassan",
    email: "mahmoud@resala.org",
    phone: "01022334455",
    team: "Media",
    assignedVolunteers: 3,
    status: "Active",
    joinedDate: "2024-03-01",
  },
  {
    id: 103,
    name: "Rania Saleh",
    email: "rania@resala.org",
    phone: "01033445566",
    team: "Finance",
    assignedVolunteers: 2,
    status: "Active",
    joinedDate: "2024-07-20",
  },
];

// ─── Events ──────────────────────────────────────────────────────────────────

export const EVENTS: Event[] = [
  {
    id: 1,
    name: "Youth Leadership Forum",
    description: "Panel discussions and workshops empowering youth community leaders.",
    location: "Alexandria Center",
    date: "2026-05-10",
    time: "09:00",
    duration: 5,
    maxVolunteers: 20,
    currentVolunteers: 12,
    requiredSkills: "Leadership, Communication",
    status: "Upcoming",
  },
  {
    id: 2,
    name: "Tree Planting Drive",
    description: "Annual Earth Day tree planting initiative across 3 city parks.",
    location: "Giza Parks",
    date: "2026-04-22",
    time: "08:00",
    duration: 4,
    maxVolunteers: 30,
    currentVolunteers: 25,
    requiredSkills: "Fieldwork",
    status: "Active",
  },
  {
    id: 3,
    name: "HR Workshop",
    description: "Conducted HR orientation sessions and onboarding workshops for new staff.",
    location: "Cairo HQ",
    date: "2026-04-08",
    time: "10:00",
    duration: 7,
    maxVolunteers: 15,
    currentVolunteers: 15,
    requiredSkills: "HR, Training",
    status: "Completed",
  },
  {
    id: 4,
    name: "Media Training Session",
    description: "Photography and social media strategy training.",
    location: "Cairo",
    date: "2026-03-15",
    time: "10:00",
    duration: 7,
    maxVolunteers: 10,
    currentVolunteers: 10,
    requiredSkills: "Photography, Social Media",
    status: "Completed",
  },
  {
    id: 5,
    name: "Community Outreach Day",
    description: "Door-to-door awareness campaign for water conservation.",
    location: "Downtown Cairo",
    date: "2026-03-05",
    time: "09:00",
    duration: 5,
    maxVolunteers: 25,
    currentVolunteers: 18,
    requiredSkills: "Communication",
    status: "Completed",
  },
  {
    id: 6,
    name: "Digital Literacy Workshop",
    description: "Teaching basic computer and internet skills to underserved communities.",
    location: "Cairo Community Center",
    date: "2026-06-01",
    time: "10:00",
    duration: 4,
    maxVolunteers: 15,
    currentVolunteers: 3,
    requiredSkills: "IT, Teaching",
    status: "Upcoming",
  },
];

// ─── Activities (logged by volunteers, reviewed by supervisors) ──────────────

export const ACTIVITIES: Activity[] = [
  {
    id: 1,
    volunteerName: "Test Volunteer",
    volunteerId: 1,
    eventName: "HR Workshop",
    date: "2026-04-08",
    hours: 7,
    description: "Conducted HR orientation sessions and onboarding workshops for new staff.",
    status: "Approved",
  },
  {
    id: 2,
    volunteerName: "Test Volunteer",
    volunteerId: 1,
    eventName: "Media Training Session",
    date: "2026-03-15",
    hours: 7,
    description: "Photography and social media strategy training for the communications team.",
    status: "Approved",
  },
  {
    id: 3,
    volunteerName: "Test Volunteer",
    volunteerId: 1,
    eventName: "Community Outreach Day",
    date: "2026-03-05",
    hours: 5,
    description: "Door-to-door awareness campaign for water conservation in urban areas.",
    status: "Approved",
  },
  {
    id: 4,
    volunteerName: "Test Volunteer",
    volunteerId: 1,
    eventName: "Tree Planting Drive",
    date: "2026-04-22",
    hours: 4,
    description: "Planted saplings in Giza parks as part of Earth Day initiative.",
    status: "Pending",
  },
  {
    id: 5,
    volunteerName: "Nadia Mahmoud",
    volunteerId: 2,
    eventName: "HR Workshop",
    date: "2026-04-08",
    hours: 7,
    description: "Assisted with HR orientation workshops.",
    status: "Approved",
  },
  {
    id: 6,
    volunteerName: "Karim Mostafa",
    volunteerId: 3,
    eventName: "Media Training Session",
    date: "2026-03-15",
    hours: 7,
    description: "Led photography training segment.",
    status: "Pending",
  },
  {
    id: 7,
    volunteerName: "Tarek Ibrahim",
    volunteerId: 5,
    eventName: "Community Outreach Day",
    date: "2026-03-05",
    hours: 5,
    description: "Managed financial tracking for the outreach campaign.",
    status: "Approved",
  },
  {
    id: 8,
    volunteerName: "Hana Yousef",
    volunteerId: 6,
    eventName: "Tree Planting Drive",
    date: "2026-04-22",
    hours: 4,
    description: "Coordinated logistics for the planting drive.",
    status: "Pending",
  },
  {
    id: 9,
    volunteerName: "Dina El-Sayed",
    volunteerId: 8,
    eventName: "Media Training Session",
    date: "2026-03-15",
    hours: 3,
    description: "Created social media content during the session.",
    status: "Rejected",
  },
];

// ─── Members per Organization ────────────────────────────────────────────────

export const ORG_MEMBERS: Record<string, { volunteers: OrgMember[]; supervisors: OrgMember[] }> = {
  org1: {
    volunteers: [
      { id: 1, name: "Test Volunteer", email: "volunteer@example.com", phone: "01212345678", dept: "HR", role: "volunteer", status: "Active", joinedDate: "2026-02-13" },
      { id: 2, name: "Nadia Mahmoud", email: "nadia@example.com", phone: "01234567890", dept: "HR", role: "volunteer", status: "Active", joinedDate: "2026-01-20" },
      { id: 3, name: "Karim Mostafa", email: "karim@example.com", phone: "01098765432", dept: "Media", role: "volunteer", status: "Active", joinedDate: "2026-02-01" },
      { id: 4, name: "Sofia Al-Hassan", email: "sofia@example.com", phone: "01112223344", dept: "IT", role: "volunteer", status: "Pending", joinedDate: "2026-03-10" },
      { id: 5, name: "Tarek Ibrahim", email: "tarek@example.com", phone: "01556677889", dept: "Finance", role: "volunteer", status: "Active", joinedDate: "2025-11-15" },
    ],
    supervisors: [
      { id: 101, name: "Dr. Amira Khalil", email: "supervisor@example.com", phone: "01011223344", dept: "Programs", role: "supervisor", status: "Active", joinedDate: "2024-01-15" },
      { id: 102, name: "Mahmoud Hassan", email: "mahmoud@resala.org", phone: "01022334455", dept: "Media", role: "supervisor", status: "Active", joinedDate: "2024-03-01" },
      { id: 103, name: "Rania Saleh", email: "rania@resala.org", phone: "01033445566", dept: "Finance", role: "supervisor", status: "Active", joinedDate: "2024-07-20" },
    ],
  },
  org2: {
    volunteers: [
      { id: 1, name: "Test Volunteer", email: "volunteer@example.com", phone: "01212345678", dept: "Humanitarian", role: "volunteer", status: "Active", joinedDate: "2026-02-13" },
      { id: 6, name: "Hana Yousef", email: "hana@example.com", phone: "01667788990", dept: "Operations", role: "volunteer", status: "Active", joinedDate: "2025-12-01" },
      { id: 7, name: "Yusuf Bakr", email: "yusuf@example.com", phone: "01788990011", dept: "Field", role: "volunteer", status: "Active", joinedDate: "2026-01-05" },
    ],
    supervisors: [
      { id: 201, name: "Laila Abdel-Rahman", email: "laila@redcrescent.org", phone: "01200112233", dept: "Operations", role: "supervisor", status: "Active", joinedDate: "2024-06-10" },
      { id: 202, name: "Omar Farid", email: "omar@redcrescent.org", phone: "01200223344", dept: "Field Research", role: "supervisor", status: "Active", joinedDate: "2025-01-18" },
    ],
  },
  org3: {
    volunteers: [
      { id: 2, name: "Nadia Mahmoud", email: "nadia@example.com", phone: "01234567890", dept: "Media", role: "volunteer", status: "Active", joinedDate: "2025-10-05" },
      { id: 3, name: "Karim Mostafa", email: "karim@example.com", phone: "01098765432", dept: "Media", role: "volunteer", status: "Active", joinedDate: "2025-11-01" },
      { id: 8, name: "Dina El-Sayed", email: "dina@example.com", phone: "01899001122", dept: "Digital", role: "volunteer", status: "Active", joinedDate: "2026-01-22" },
    ],
    supervisors: [
      { id: 301, name: "Sherif Naguib", email: "sherif@enactus.org", phone: "01300112233", dept: "Content", role: "supervisor", status: "Active", joinedDate: "2025-01-20" },
      { id: 302, name: "Noura El-Masri", email: "noura@enactus.org", phone: "01300223344", dept: "Communications", role: "supervisor", status: "Active", joinedDate: "2025-02-15" },
    ],
  },
};

// ─── Volunteer ↔ Organization Activities ────────────────────────────────────

// ─── Certificates ────────────────────────────────────────────────────────────

export const CERTIFICATES: Certificate[] = [
  { id: 1, volunteerId: 1, volunteerName: "Test Volunteer", orgId: "org1", orgName: "Resala", eventName: "HR Workshop", issuedDate: "2026-04-10", hours: 7, type: "Completion" },
  { id: 2, volunteerId: 1, volunteerName: "Test Volunteer", orgId: "org1", orgName: "Resala", eventName: "Media Training Session", issuedDate: "2026-03-18", hours: 7, type: "Participation" },
  { id: 3, volunteerId: 1, volunteerName: "Test Volunteer", orgId: "org2", orgName: "Egyptian Red Crescent", eventName: "Community Outreach Day", issuedDate: "2026-03-08", hours: 5, type: "Achievement" },
  { id: 4, volunteerId: 2, volunteerName: "Nadia Mahmoud", orgId: "org1", orgName: "Resala", eventName: "HR Workshop", issuedDate: "2026-04-10", hours: 7, type: "Completion" },
  { id: 5, volunteerId: 5, volunteerName: "Tarek Ibrahim", orgId: "org1", orgName: "Resala", eventName: "Community Outreach Day", issuedDate: "2026-03-08", hours: 5, type: "Participation" },
  { id: 6, volunteerId: 3, volunteerName: "Karim Mostafa", orgId: "org3", orgName: "Enactus Egypt", eventName: "Media Training Session", issuedDate: "2026-03-18", hours: 7, type: "Achievement" },
];

export function getVolunteerCertificates(volunteerId: number): Certificate[] {
  return CERTIFICATES.filter((c) => c.volunteerId === volunteerId);
}

export const VOLUNTEER_ORG_ACTIVITIES: Record<string, OrgActivity[]> = {
  org1: [
    { id: 1, name: "HR Workshop", date: "2026-04-08", hours: 7.0, status: "Completed", location: "Cairo HQ", description: "Conducted HR orientation sessions and onboarding workshops for new staff." },
    { id: 2, name: "Media Training Session", date: "2026-03-15", hours: 7.0, status: "Completed", location: "Cairo", description: "Photography and social media strategy training for the communications team." },
    { id: 3, name: "Youth Leadership Forum", date: "2026-05-10", hours: 5.0, status: "Upcoming", location: "Alexandria Center", description: "Panel discussions and workshops empowering youth community leaders." },
  ],
  org2: [
    { id: 4, name: "Community Outreach", date: "2026-03-05", hours: 5.0, status: "Completed", location: "Cairo", description: "Door-to-door awareness campaign for water conservation in urban areas." },
    { id: 5, name: "Tree Planting Drive", date: "2026-04-22", hours: 4.0, status: "Upcoming", location: "Giza Parks", description: "Annual Earth Day tree planting initiative across 3 city parks." },
    { id: 6, name: "Recycling Awareness Day", date: "2026-02-18", hours: 3.0, status: "Completed", location: "Downtown Cairo", description: "Public awareness campaign on waste sorting and recycling best practices." },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getVolunteerOrgs(volunteerId: number): Organization[] {
  return ORGANIZATIONS.filter((org) => {
    const members = ORG_MEMBERS[org.id];
    return (
      members.volunteers.some((v) => v.id === volunteerId) ||
      members.supervisors.some((s) => s.id === volunteerId)
    );
  });
}

export function getVolunteerOrgTotalHours(orgId: string): number {
  const activities = VOLUNTEER_ORG_ACTIVITIES[orgId] ?? [];
  return activities
    .filter((a) => a.status === "Completed")
    .reduce((sum, a) => sum + a.hours, 0);
}

// Get volunteers assigned to a specific supervisor
export function getSupervisorVolunteers(supervisorName: string): Volunteer[] {
  return VOLUNTEERS.filter((v) => v.supervisor === supervisorName);
}

// Get pending activities for supervisor's volunteers
export function getSupervisorPendingActivities(supervisorName: string): Activity[] {
  const volunteerIds = getSupervisorVolunteers(supervisorName).map((v) => v.id);
  return ACTIVITIES.filter((a) => volunteerIds.includes(a.volunteerId) && a.status === "Pending");
}
