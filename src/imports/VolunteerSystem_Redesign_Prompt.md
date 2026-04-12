# VolunteerSystem — Full Redesign Prompt for Figma Make
## One master prompt covering the Design System + all 12 screens

---

# PART 1 — DESIGN SYSTEM FOUNDATION
> Establish these tokens first. Every screen below inherits them.

## Brand Identity
- **Product name:** VolunteerSystem
- **Brand personality:** Trustworthy, human, purposeful. This is a civic/NGO volunteer management platform — the design should feel warm but professional, not corporate or cold.
- **Logo treatment:** Wordmark "VolunteerSystem" — use Inter or Plus Jakarta Sans, bold weight, deep navy color on light backgrounds, white on dark backgrounds. Add a small abstract leaf/person icon to the left of the wordmark as a brand mark (deep green, rounded, simple).

## Color Palette

### Primary
- `--color-primary: #1D4ED8` — Royal blue. Main CTAs, primary buttons, links.
- `--color-primary-hover: #1E40AF` — Darker blue for hover states.
- `--color-primary-light: #EFF6FF` — Very pale blue for selected states, info backgrounds.
- `--color-primary-subtle: #DBEAFE` — Light blue for chips, badges, highlights.

### Semantic / Accent
- `--color-success: #16A34A` — Forest green. Approved, completed, credited.
- `--color-success-light: #DCFCE7` — Light green. Success banners, row highlights.
- `--color-warning: #D97706` — Amber. Pending, awaiting, in-progress.
- `--color-warning-light: #FEF3C7` — Light amber. Warning banners, pending cards.
- `--color-danger: #DC2626` — Red. Reject, delete, error actions.
- `--color-danger-light: #FEE2E2` — Light red. Error banners.
- `--color-info: #0891B2` — Cyan/teal. Certificates, open positions, browse.
- `--color-info-light: #CFFAFE` — Light teal. Info panels, note boxes.

### Neutrals
- `--color-gray-950: #0F172A` — Near black. Nav bars, deep headers.
- `--color-gray-900: #1E293B` — Very dark. Section headers, bold labels.
- `--color-gray-700: #334155` — Dark. Primary body text.
- `--color-gray-500: #64748B` — Medium. Secondary text, metadata.
- `--color-gray-400: #94A3B8` — Light. Placeholders, inactive nav.
- `--color-gray-200: #E2E8F0` — Very light. Borders, dividers.
- `--color-gray-100: #F1F5F9` — Near white. Page background tint, input bg.
- `--color-gray-50: #F8FAFC` — Almost white. Table row alternates.
- `--color-white: #FFFFFF` — Pure white. Card backgrounds, form surfaces.

### Background System
- Page background: `#F1F5F9` (light cool gray — replaces pure white)
- Card/panel surface: `#FFFFFF`
- Nav background: `#0F172A`

## Typography

- **Font family:** Inter (Google Fonts). Fallback: system-ui, sans-serif.
- **Scale:**
  - `--text-xs: 11px / 1.4` — Micro labels, helper text
  - `--text-sm: 13px / 1.5` — Secondary body, table cells, badges
  - `--text-base: 15px / 1.6` — Primary body text
  - `--text-lg: 17px / 1.5` — Subheadings, card titles
  - `--text-xl: 20px / 1.4` — Section headings
  - `--text-2xl: 24px / 1.3` — Page H2 headings
  - `--text-3xl: 30px / 1.2` — Page H1 headings
  - `--text-4xl: 36px / 1.1` — Hero headlines
  - `--text-5xl: 48px / 1.05` — Landing hero display
- **Weights:** 400 Regular, 500 Medium, 600 Semi-bold, 700 Bold
- **Letter spacing:** Headings: -0.02em. Body: 0. Labels/caps: +0.03em.

## Spacing System (8px base grid)
```
4px   — xs  (tight gaps, icon padding)
8px   — sm  (inline element gaps)
12px  — md  (compact card padding)
16px  — lg  (standard element gap)
20px  — xl  (card padding standard)
24px  — 2xl (section internal padding)
32px  — 3xl (section vertical gap)
40px  — 4xl (large section spacing)
48px  — 5xl (page section padding)
64px  — 6xl (hero padding)
80px  — 7xl (landing section height)
```

## Component Library

### Navbar
- Height: 64px
- Background: `#0F172A`
- Left: brand icon + "VolunteerSystem" wordmark in white, 16px bold
- Center: primary nav links, 14px medium, color `#94A3B8`, hover → white transition
- Right: "Welcome, [Name]" in `#CBD5E1` size 13px + vertical divider + "Logout" button (ghost, white border, white text, 32px height, 8px border-radius)
- Active nav link: white text + 2px white bottom underline

### Buttons
All buttons: Inter 14px semi-bold, border-radius 8px, height 40px, px 20px, transition 150ms

| Variant | Background | Text | Border | Hover |
|---|---|---|---|---|
| Primary | `#1D4ED8` | white | none | `#1E40AF` |
| Success | `#16A34A` | white | none | `#15803D` |
| Danger | `#DC2626` | white | none | `#B91C1C` |
| Outline | white | `#1D4ED8` | `#1D4ED8` 1.5px | `#EFF6FF` bg |
| Ghost | transparent | `#334155` | `#E2E8F0` 1px | `#F1F5F9` bg |
| Teal | `#0891B2` | white | none | `#0E7490` |

Small button variant: height 32px, px 14px, text 13px
Large button variant: height 48px, px 28px, text 15px, full-width on mobile

### Form Inputs
- Height: 42px (single line), auto height (textarea)
- Background: `#FFFFFF`
- Border: 1.5px solid `#E2E8F0`
- Border-radius: 8px
- Padding: 0 14px
- Font: 14px, color `#1E293B`
- Placeholder: `#94A3B8`
- Focus state: border `#1D4ED8`, box-shadow `0 0 0 3px rgba(29,78,216,0.12)`
- Error state: border `#DC2626`, box-shadow `0 0 0 3px rgba(220,38,38,0.12)`
- Label: 13px, semi-bold, `#374151`, mb-6px
- Helper text below: 12px, `#6B7280`
- Section heading within form: 15px, semi-bold, `#1E293B`, with a 2px left border accent in brand primary, pl-12px, mb-20px, mt-32px

### Badges / Status Chips
All badges: border-radius 20px, height 24px, px 10px, font 12px 600

| Label | Background | Text color |
|---|---|---|
| Approved | `#DCFCE7` | `#15803D` |
| Pending | `#FEF3C7` | `#B45309` |
| Rejected | `#FEE2E2` | `#B91C1C` |
| Issued | `#DCFCE7` | `#15803D` |
| Completed | `#DBEAFE` | `#1D4ED8` |
| Confirmed | `#CFFAFE` | `#0E7490` |
| Active | `#DCFCE7` | `#15803D` |

> Note: All badges are now soft (light bg + dark colored text) instead of solid-color filled pills. This is a key upgrade from the current design.

### Cards
- Background: `#FFFFFF`
- Border: 1px solid `#E2E8F0`
- Border-radius: 12px
- Box-shadow: `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`
- Padding: 20px or 24px

### Stat Cards (Dashboard)
- Border-radius: 12px
- Height: ~120px
- No border
- Subtle box-shadow: `0 4px 12px rgba(0,0,0,0.08)`
- Icon: 40x40 white/translucent circle with emoji or line icon inside, top-left
- Label: 13px medium, translucent white (0.8 opacity)
- Value: 36px bold, white
- Sub-label: 11px, translucent white (0.7 opacity)
- Color variants: blue, amber, green, teal (matching current color coding, but refined shades)

### Tables
- Header row: background `#F8FAFC`, border-bottom 2px solid `#E2E8F0`, text 12px uppercase letter-spaced semi-bold `#64748B`
- Data rows: white bg, 52px height, border-bottom 1px solid `#F1F5F9`
- Hover row: `#F8FAFC` background
- Cell text: 14px, `#334155`
- No external table border — borderless style

### Alert / Flash Banners
- Border-radius: 10px
- Padding: 14px 20px
- 4px left accent border (colored)
- Icon on left (check circle for success, x circle for error, info for note)
- Dismiss button (×) on far right
- Success: bg `#F0FDF4`, border `#16A34A`, text `#15803D`
- Error: bg `#FFF5F5`, border `#DC2626`, text `#991B1B`
- Info: bg `#F0F9FF`, border `#0891B2`, text `#0E7490`

### Page Layout Shell
- Max content width: 1280px, centered with auto horizontal margins
- Content padding: 0 32px on desktop, 0 16px on mobile
- Page top padding (below navbar): 32px
- Section gap: 28px

---

# PART 2 — LANDING PAGE (NEW — Does Not Exist Currently)

Design a fully responsive public landing page for VolunteerSystem. This is the first thing visitors see before logging in. It must communicate the platform's value clearly and drive signups.

## Section 1 — Navbar (Public / Unauthenticated)
- Same dark navy (`#0F172A`) full-width navbar, 64px height
- Left: brand icon + "VolunteerSystem" in white
- Right: Ghost "Login" button + Primary "Sign Up Free" button (blue, 40px height, 8px radius)

## Section 2 — Hero Section
- Full-width, min-height 640px
- Background: deep navy-to-blue diagonal gradient: `linear-gradient(135deg, #0F172A 0%, #1E3A5F 60%, #1D4ED8 100%)`
- Layout: two columns, 60/40 split
  - LEFT COLUMN: Text content, vertically centered
    - Eyebrow text: small teal chip/badge "🌍 Community-Powered Volunteering Platform" — teal background `#CFFAFE`, teal text, 12px, rounded, mb-16px
    - H1: "Organize. Volunteer. Make an Impact." — 48px bold white, line-height 1.1, mb-20px
    - Subtext paragraph (16px, `#94A3B8`, max-width 480px, mb-32px): "VolunteerSystem helps organizations manage volunteers, track hours, run events, and issue certificates — all in one place."
    - CTA buttons row (gap 12px):
      - Primary large button: "Get Started Free" — blue `#1D4ED8`, white text, 48px height, 10px radius
      - Ghost button: "See How It Works →" — transparent, white border, white text, 48px height
    - Trust strip below buttons (mt-32px): Three small items inline with check icons: "✓ Free for nonprofits" · "✓ No credit card needed" · "✓ Setup in 5 minutes" — all 13px, `#94A3B8`
  - RIGHT COLUMN: Browser mockup / dashboard screenshot illustration
    - Rounded rectangle (16px radius) with subtle shadow showing a stylized mini version of the Admin Dashboard stat cards and a pending approval card — use the actual design system colors

## Section 3 — Stats Strip
- White background, 80px height, full width
- Single row of 4 stats, centered, divided by 1px vertical `#E2E8F0` lines:
  - "10,000+ Volunteers Managed" · "500+ Organizations" · "50,000+ Hours Tracked" · "98% Satisfaction Rate"
  - Each: value in `#1D4ED8` 22px bold, label in `#64748B` 13px

## Section 4 — Features Section
- Background: `#F8FAFC`
- Top label: "PLATFORM FEATURES" — 11px uppercase letter-spaced `#1D4ED8` centered, mb-12px
- H2: "Everything you need to run your volunteer program" — 32px bold `#0F172A` centered, max-width 560px centered, mb-48px
- 3-column card grid (gap 24px):

  **Card 1 — Volunteer Management**
  Icon: 48x48 rounded square with blue gradient bg, white 👥 icon inside
  Title: "Volunteer Management" — 17px semi-bold `#1E293B`
  Body: "Approve or reject volunteer applications, search by skills, education, and department, and review full volunteer stats in seconds." — 14px `#64748B`, line-height 1.6

  **Card 2 — Event Coordination**
  Icon: 48x48 rounded square with green gradient bg, white 📅 icon
  Title: "Event Coordination"
  Body: "Create and manage volunteering events with full details — date, time, location, duration, required skills, and volunteer capacity."

  **Card 3 — Hours & Certificates**
  Icon: 48x48 teal gradient, white 📜 icon
  Title: "Hours Tracking & Certificates"
  Body: "Automatically credit volunteer hours on completion. Volunteers can request official certificates reviewed and issued by admins."

  **Card 4 — Open Positions**
  Icon: 48x48 amber gradient, white 💼 icon
  Title: "Open Positions"
  Body: "Post long-term volunteer roles by department. Volunteers browse and apply. Admins manage applicants from a single panel."

  **Card 5 — Volunteer Dashboard**
  Icon: 48x48 purple gradient, white 📊 icon
  Title: "Personal Dashboard"
  Body: "Each volunteer gets a profile showing their total hours, application history, attendance record, and participation stats."

  **Card 6 — Admin Control Panel**
  Icon: 48x48 rose gradient, white 🛡️ icon
  Title: "Full Admin Control"
  Body: "Dedicated admin dashboard with a live overview of all volunteers, pending approvals, events, and certificate requests."

  Cards: white bg, 1px `#E2E8F0` border, 12px radius, 24px padding, hover lift shadow.
  Display as 3 columns on desktop, 2 on tablet, 1 on mobile.

## Section 5 — How It Works
- White background, 80px vertical padding
- H2: "Up and running in three steps" — 28px bold centered, mb-48px
- Three large numbered steps in a horizontal row (gap 40px), connected by a dashed line:

  Step 1: Circle "01" in blue outline. Title: "Create your organization". Body: "Sign up, set up your admin account, and post your first event or open position in minutes."
  
  Step 2: Circle "02" in blue filled. Title: "Volunteers apply & get approved". Body: "Volunteers register, complete their profiles, browse events or open positions, and submit applications."
  
  Step 3: Circle "03" in blue outline. Title: "Track, credit & certify". Body: "Log attendance, auto-credit hours, and issue official volunteer certificates with one click."

## Section 6 — Dual CTA (Split)
- Background: deep navy `#0F172A`
- Two-column layout:
  - LEFT: "Are you a volunteer?" — 24px bold white. Subtext: "Join thousands of volunteers making a difference. Sign up in under 2 minutes." — 14px `#94A3B8`. Button: "Sign Up as Volunteer" — large green `#16A34A`
  - RIGHT: "Are you an organization?" — 24px bold white. Subtext: "Start managing your volunteer program smarter. Free for nonprofits." — 14px `#94A3B8`. Button: "Request Admin Access" — large blue `#1D4ED8` outline (white border, white text)
  - Divider: 1px vertical line `#334155` between columns

## Section 7 — Footer
- Background: `#0F172A`
- Four columns: Brand col (logo + tagline + social icons) · Product links · Organization links · Legal links
- Bottom bar: "© 2026 VolunteerSystem. All rights reserved." — centered, 12px, `#475569`
- Top border: 1px `#1E293B`

---

# PART 3 — REDESIGNED APP SCREENS

Apply the full design system above to every screen. General rules for ALL screens:
- All pages use `#F1F5F9` as page background (not white)
- All cards/panels are `#FFFFFF` with `12px` radius and subtle shadow
- Form cards are max-width centered with generous internal padding (28px)
- All typography follows the Inter scale above
- All interactive elements use proper hover/focus states
- Add breadcrumbs to all deep pages (2+ levels from dashboard)
- Page titles: 28–30px bold `#0F172A`, mt-32px mb-4px from top
- Page subtitles: 15px `#64748B`, mt-4px mb-28px

---

## SCREEN A — Login Page (Redesigned)

### Layout
- Page background: `#F1F5F9`
- Navbar: standard unauthenticated nav (Login active + Register)
- Content: perfectly vertically and horizontally centered login card

### Login Card
- Width: 440px, white bg, 16px border-radius, shadow `0 8px 32px rgba(0,0,0,0.10)`, padding 40px
- Top of card (before fields): centered brand icon (40px) + "VolunteerSystem" wordmark in `#1E293B` 20px bold — acts as card header, mb-28px
- Thin divider, then form fields below

### Form Fields
- "Email address" label (13px semi-bold) → 42px input, full width, placeholder "you@example.com"
- "Password" label → 42px input, full width, placeholder "Enter your password", eye-toggle icon on right
- Row: checkbox "Remember me" left + "Forgot password?" blue link right
- Large full-width primary button: "Sign In" — 48px, blue `#1D4ED8`, white text
- Divider: "— or —" in gray
- Text: "Don't have an account? " + "Sign up free →" blue link, centered

### Error State
- Insert alert banner ABOVE the card (not above navbar): soft red bg `#FFF5F5`, red left border, "⚠ Login failed — please check your email and password." with dismiss X

### Success/Info
- On focus of email field, show small floating tooltip: "Use the email you registered with"

---

## SCREEN B — Volunteer Registration Form (Redesigned)

### Layout
- Unauthenticated navbar
- Page background: `#F1F5F9`
- Centered white card, max-width 780px, padding 40px, 16px radius, shadow

### Card Header
- Remove the green colored bar. Replace with: page-style heading "Create Your Account" 28px bold `#0F172A` + subtext "Join our volunteering community — takes less than 2 minutes." 14px `#64748B`, mb-32px

### Form Sections (use left-bordered section headings as per design system)
**Section 1 — Account Info**
- Blue left-border section label: "Account Info"
- 2-column grid: Full Name | Email
- 2-column grid: Password | Confirm Password
- Password fields: show strength meter below (3-step colored bar: red/amber/green)

**Section 2 — Personal Info**
- Blue left-border section label: "Personal Info"
- 2-column: Phone Number | National ID
- 2-column: Age | Gender (styled select dropdown with caret)
- 2-column: City | Department (styled select)

**Section 3 — Education & Experience**
- Blue left-border section label: "Education & Experience"
- Full-width styled select: Educational Level (options: Undergraduate, Graduated, Postgraduate, Other)
- Conditional fields (show/hide based on Educational Level selection):
  - If Undergraduate: Faculty (text) + Academic Year (text)
  - If Graduated/Postgraduate: Faculty (text) only
- Full-width textarea: Skills (Comma separated) — 4-row height
- Checkbox with label: "I have previous volunteering experience"

### Submit
- Full-width large green button: "Create My Account" — 48px, `#16A34A`, white, bold
- Text below: "Already have an account? Log in here →" — centered, 13px, blue link

---

## SCREEN C — Admin Dashboard (Redesigned)

### Navbar
- Authenticated admin nav: "Home" · "Admin Dashboard" (active) — white text + underline
- Right: "Welcome, Second Admin" + Logout ghost button

### Page Header Row
- Left: H1 "Admin Dashboard" 30px bold `#0F172A`
- Right: teal "Manage Certificates" button

### Stat Cards Row (4 equal cards, 16px gap, mt-24px)
Redesign stat cards:
- **Volunteers:** Blue gradient `linear-gradient(135deg, #1D4ED8, #3B82F6)`. Icon: 👥 in white translucent circle top-right. Label "Total Volunteers" 13px. Value "1,501" 36px bold. Sub: "Registered members" 11px.
- **Pending:** Amber gradient `linear-gradient(135deg, #D97706, #F59E0B)`. Icon: ⏳. Label "Pending Approval". Value "430". Sub: "Awaiting review".
- **Events:** Green gradient `linear-gradient(135deg, #16A34A, #22C55E)`. Icon: 📅. Label "Total Events". Value "4". Sub: "All time".
- **Upcoming:** Teal gradient `linear-gradient(135deg, #0891B2, #06B6D4)`. Icon: 🗓. Label "Upcoming Events". Value "0". Sub: "Scheduled ahead".

### Search Panel (white card, 12px radius, 20px padding, mt-24px)
- Section label: "Search Volunteers" 15px semi-bold `#1E293B`
- Single filter row (gap 12px):
  - Text input (flex-grow): placeholder "Search by name or email…" with search 🔍 icon prefix
  - Styled select: "Education Level" with caret
  - Styled select: "Department" with caret
  - Number input: placeholder "Min Experience (Years)"
  - Primary button "Search" — blue, 40px

### Main Two-Column Layout (mt-28px, gap 24px)

**LEFT COLUMN (63% width)**
- Row: "Pending Approvals" 20px bold + count badge `(430)` in amber chip, inline
- Volunteer cards (gap 12px, mt-16px):
  Each card: white bg, 12px radius, 1px `#E2E8F0` border, 20px padding, 4px left accent border in amber `#D97706`
  - Top row: Name 15px semi-bold `#1E293B` + right-aligned action buttons
  - Second row: 📧 email in `#3B82F6` small + · + 📞 phone in `#64748B` small
  - Third row: chips: "Edu: Graduated" (gray chip) + "Dept: Finance" (gray chip) — small 11px rounded chips
  - Action buttons: "Approve" (success small) + "Reject" (danger small) — both 32px height

**RIGHT COLUMN (37% width)**
- Row: "Recent Events" 20px bold + "Manage Positions" ghost small button + "Create Event" primary small button — right-aligned
- Event list (white card, 12px radius, 0 internal padding, mt-16px):
  Each event row: 64px height, 16px side padding, border-bottom `#F1F5F9`
  - Left: event name 14px semi-bold + date 12px `#94A3B8`
  - Below name: status badge (soft pill)
  - Right: "Edit" ghost small + "Apps" teal small

---

## SCREEN D — Create / Edit Event Form (Redesigned)

### Layout
- Authenticated admin nav
- Page background: `#F1F5F9`
- Breadcrumb: "Admin Dashboard / Create New Event"
- Page title: "Create New Event" (or "Edit Event: [Name]")

### Form Card
- White, 780px max-width, 16px radius, shadow, 36px padding
- Remove the gray card header bar. Use inline page title instead.

### Form Fields
- "Event Name" — full-width input
- "Description" — textarea, 5 rows, resize-vertical
- "Location" — full-width input with map pin 📍 icon prefix
- 2-column: "Event Date" (date picker input with calendar icon) | "Event Time" (time picker with clock icon)
- 2-column: "Duration (Hours)" (number input, step 0.5) | "Volunteers Required" (number stepper with +/- inline buttons)
- "Skills Required" — textarea 3 rows with tag-style helper: "Enter skills separated by commas"
- "Status" — styled segmented control (3 pills: Upcoming · Ongoing · Completed) instead of plain dropdown

### Submit Row
- Left-aligned ghost "Cancel" button + right-aligned primary "Create Event" (or "Save Changes") button
- Full-width on mobile

---

## SCREEN E — Manage Positions Page (Redesigned)

### Layout
- Authenticated admin nav
- Breadcrumb: "Admin Dashboard / Manage Positions"
- Page title: "Manage Positions"

### Two-Column Layout (gap 28px)

**LEFT (38%): "Add New Position" card**
- White card, 12px radius, no dark header bar
- Card internal title: "Add New Position" 17px semi-bold `#1E293B`, mb-20px, with a small + icon left
- Fields: Position Title input, Department input, Description textarea (5 rows), helper text
- Green "Add Position" button — full-width, 44px

**RIGHT (62%): Open Positions table**
- Header row: "Open Positions" 20px bold + "1 Active" success chip (right aligned)
- White card table (12px radius, overflow hidden)
  - Header row: `#F8FAFC` bg, uppercase 11px letter-spaced `#64748B` labels — Title · Department · Posted Date · Apps · Actions
  - Data row: HR assistant | HR | Feb 13, 2026 | cyan circle badge "1" | "View Apps" teal outline small + "Delete" danger ghost small

---

## SCREEN F — Applicants for Position (Redesigned)

### Layout
- Authenticated admin nav
- Breadcrumb: "Admin Dashboard / Manage Positions / HR assistant"
- Page title: "Applicants for: HR assistant"
- Page subtitle: truncated description text
- Top-right: department badge chip "HR Dept" — gray chip

### Table
- White card, 12px radius, overflow hidden
- Header: `#1E293B` bg, 48px, white text, columns: Volunteer Info · Member Since · Status · Actions
- Data row (64px): Name bold + email+phone subtext | date | Pending amber badge | "View Stats" primary small + "Approve" success small + "Reject" danger small

---

## SCREEN G — Volunteer Stats — Admin View (Redesigned)

### Layout
- Authenticated admin nav
- Breadcrumb: "Admin Dashboard / Manage Positions / Applicants / Test Volunteer Stats"
- Page title: "Volunteer Stats: Test Volunteer"
- Page subtitle: email | phone
- Top-right: "Status: Approved" — success badge chip

### Stat Cards (3 equal, mt-24px)
- Green: "Total Volunteer Hours" / "19.0" / "Credited from completed events"
- Blue: "Events Attended" / "3" / "Total participations recorded"
- Teal: "Total Applications" / "3" / "Including pending and rejected"

### Application History Table (mt-32px)
- Section heading: "Application History" — 17px semi-bold `#1E293B` with blue left border
- White card table: columns Event Name · Date Applied · Result
- Result: soft badge (approved = soft green)

### Attendance Record Table (mt-24px)
- Section heading: "Attendance Record — Work Completed" — dark `#1E293B` with dark left border
- White card table: columns Event Name · Date · Check-in Time · Status · Hours Credited
- Status: "confirmed" → soft teal badge. Hours: "7.00 hrs" in green semi-bold.

---

## SCREEN H — Volunteer Dashboard (Redesigned)

### Layout
- Authenticated volunteer nav: "Home" · "Dashboard" (active)
- Right: "Welcome, Test Volunteer" + Logout

### Two-Column Layout (gap 24px, mt-24px)

**LEFT COLUMN (32% width): Profile Card**
- White card, 12px radius, 24px padding
- Avatar placeholder: 56px circle with initials "TV" on gradient blue bg, centered
- Name: "Test Volunteer" 18px semi-bold `#1E293B`, centered, mt-12px
- Tags row (centered, gap 8px, mt-8px): "Beginner Volunteer" teal soft chip + "No Dept." gray chip
- Divider
- Stats rows (label left, value right):
  - Total Hours: **19.0** (blue semi-bold value)
  - Member Since: 2026-02-13
  - City: Alexandria
- Divider
- "Edit Profile" full-width ghost outline button
- Divider
- "Explore Opportunities" 12px uppercase `#64748B` centered
- "View Open Positions" full-width primary button
- "Long-term roles & leadership" 12px `#94A3B8` centered

**RIGHT COLUMN (68% width)**
- Header row: "My Applications" 22px bold + "Request Certificate" teal outline + "Browse Events" success solid — right-aligned buttons
- Application cards (gap 12px, mt-16px):
  White card, 12px radius, 20px padding, 1px `#E2E8F0` border, hover lift
  - Title row: event name 16px bold + "Applied: date" right-aligned 12px `#94A3B8`
  - Details row: 📅 date · 🕐 time · 📍 location · ⏱ X.XX hrs — all 13px `#64748B` with icons
  - Description excerpt: 13px `#94A3B8` truncated to 1 line
  - Status row: left "Status: Approved" soft green badge + right "Completed & Credited" soft teal badge
- Participation History section (mt-32px):
  "Participation History" 18px semi-bold bold
  White card table — event · date · hrs badge (green) · Confirmed gray text

---

## SCREEN I — Edit Profile — Volunteer (Redesigned)

### Layout
- Authenticated volunteer nav
- Breadcrumb: "Dashboard / Edit Profile"
- Page title: "Edit Profile"

### Form Card
- White, max-width 640px, centered, 16px radius, 36px padding

### Fields
- "Full Name" label → input, value "Test Volunteer"
- "Phone Number" label → input, value "01212345678"
- "City" label → input, value "Alexandria"
- "Skills" label → textarea, 4 rows, placeholder "e.g. Photography, Teaching, Event Planning"
- Helper text: "Separate skills with commas"
- Row: ghost "Cancel" left + primary "Update Profile" right

---

## SCREEN J — Request Certificate (Redesigned)

### Layout
- Authenticated volunteer nav
- Breadcrumb: "Dashboard / Request Certificate"
- Page title: "Request a Certificate"

### Form Card
- White, max-width 560px, centered, 16px radius, 36px padding

### Fields
- "Request Type" — styled select: "Total Volunteer Hours" / "Specific Event"
- Conditional: if Specific Event selected → "Select Event" dropdown (only confirmed events listed)
- Helper text: "Only events with confirmed attendance are listed." — 12px `#64748B`
- Info alert box: bg `#F0F9FF`, left border teal, icon ℹ️
  "Certificates are generated after admin review and approval. You'll be notified once yours is ready."
- Full-width primary button: "Submit Certificate Request" — blue, 48px

---

## SCREEN K — Detail Certificate Requests — Admin (Redesigned)

### Layout
- Authenticated admin nav
- Breadcrumb: "Admin Dashboard / Certificate Requests"
- Page title: "Certificate Requests"
- Success flash banner (when applicable): soft green, left accent, with dismiss

### Table Card
- White, 12px radius, overflow hidden
- Columns: Volunteer · Type · Event / Details · Hours · Status · Actions
- Data row: Name + email subtext | Total Hours | Cumulative Total | 0.00 | "Issued" soft green badge | "Download (Mock)" ghost small button
- Empty state (no requests): centered illustration placeholder + "No certificate requests yet." 15px `#64748B`

---

## SCREEN L — Upcoming Events — Browse (Redesigned)

### Layout
- Authenticated volunteer nav
- Page title: "Browse Upcoming Events"

### Content
- Filter bar: search input + category filter dropdown + date range
- Empty state (when no events):
  - Centered 120px illustration (calendar with a sparkle — SVG or emoji large 64px)
  - "No upcoming events right now." — 18px semi-bold `#1E293B`
  - "Check back soon or explore open volunteer positions." — 14px `#64748B`
  - "View Open Positions →" primary button — centered

### Populated State (for when events exist — design this too)
- Event cards in a 3-column responsive grid
- Each card: event name bold, date chip, location, hours badge, brief description, "Apply" button bottom-right

---

# PART 4 — RESPONSIVE BREAKPOINTS

All screens must be designed responsively:

| Breakpoint | Width | Changes |
|---|---|---|
| Desktop | 1280px+ | Full layout as described |
| Tablet | 768–1279px | Two-column → single column where noted; nav collapses |
| Mobile | < 768px | All columns stack; full-width buttons; hamburger menu |

Mobile navbar: hamburger icon right side, slides out a full-height drawer with nav links stacked vertically.

---

# PART 5 — MICRO-INTERACTIONS & STATES

Define these for all interactive elements:

- **Button hover:** 150ms ease background darken + subtle translateY(-1px) lift
- **Button active/pressed:** translateY(0) + slightly darker background
- **Input focus:** 200ms border color transition + glow ring appear
- **Card hover (clickable cards):** box-shadow intensify + translateY(-2px) — 200ms ease
- **Badge:** no interaction states needed
- **Table row hover:** background `#F8FAFC` — 100ms
- **Flash banners:** slide-in from top + fade — 300ms. Dismiss: fade-out + collapse height — 250ms
- **Page transitions:** fade-in 200ms on page load
- **Stat card numbers:** count-up animation on initial load (optional enhancement)

---

# PART 6 — WHAT TO IMPROVE vs. CURRENT DESIGN

| Current Problem | New Design Solution |
|---|---|
| Pure white `#FFFFFF` page backgrounds feel flat | Use `#F1F5F9` tinted page bg for depth |
| Stat cards are flat solid-color blocks with no depth | Gradient stat cards + icon + shadow |
| Hard-colored solid badges (green/red/yellow filled) feel harsh | Soft badges: light bg + colored text |
| Inconsistent label colors (some orange-red, some blue) | Unified 13px semi-bold `#374151` labels |
| Form cards have abrupt colored header bars | Clean card with inline heading, no bar |
| Dark navy table headers mid-page feel heavy | Light `#F8FAFC` table headers with uppercase small text |
| No page background — everything flat white | Layered card-on-background system |
| No breadcrumbs on deep pages | Breadcrumb trail on all 2+ level pages |
| Buttons have mixed styles with no system | Unified 6-variant button library |
| No visual hierarchy on dashboards | Clear section headings, spacing, dividers |
| Empty states are plain one-liner text | Illustrated empty states with guidance |
| Yellow pending card borders feel jarring | Soft amber left-accent-only border |
| No landing/marketing page | Full 7-section landing page |
| No mobile responsiveness shown | Full responsive breakpoint system |
| Typography inconsistent across screens | Unified Inter type scale, 9 sizes |

---

*End of Figma Make Redesign Prompt for VolunteerSystem*
