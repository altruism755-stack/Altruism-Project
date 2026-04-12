# Figma Make Prompts — VolunteerSystem Web App
> One prompt per screen. Paste each into Figma Make individually.

---

## Global Design Tokens (apply to ALL screens)

```
Color palette:
- Primary Blue: #2563EB (buttons, active states, login header)
- Green: #16A34A (approve buttons, "Issued" badge, "Approved" badge, stat cards)
- Yellow/Amber: #EAB308 (pending stat card, "Pending" badge, volunteer card borders)
- Teal/Cyan: #06B6D4 (upcoming events stat card, "Manage Certificates" button, "Request Certificate" button)
- Dark Navy: #1E293B (top navigation bar background)
- Red: #DC2626 (reject buttons, error banners)
- White: #FFFFFF (page backgrounds, card backgrounds, form inputs)
- Light Gray Background: #F8FAFC (subtle page background)
- Border Gray: #E2E8F0 (input borders, table dividers)
- Text Dark: #1E293B (headings, primary body text)
- Text Medium: #64748B (secondary labels, nav links)
- Text Muted: #94A3B8 (email subtext, helper text)
- Link Blue: #3B82F6 (hyperlinks, breadcrumb links)
- Success Green Banner: #DCFCE7 background with #166534 text (success flash messages)
- Error Red Banner: #FEE2E2 background with #991B1B text (error flash messages)

Typography:
- Font: System sans-serif (appears to be the browser default — Inter or system-ui)
- Logo "VolunteerSystem": ~20px, bold, white
- Nav links: ~14px, medium weight, gray (#94A3B8)
- Page H1: ~28–32px, bold, dark (#1E293B)
- Section headers (table headers): ~14px, semi-bold, dark
- Body / table rows: ~14px, regular
- Subtext / helper text: ~12–13px, muted gray
- Badge labels: ~12px, bold, white

Spacing & Layout:
- Page max-width: ~1440px, full-width layout
- Top navbar height: ~52px
- Page content padding: 24px horizontal
- Card border-radius: 8px
- Input border-radius: 6px
- Button border-radius: 6px
- Gap between stat cards: 16px

Navbar (shared component):
- Background: #1E293B (dark navy)
- Left: "VolunteerSystem" in white bold text
- Center/left nav links: "Home", "Admin Dashboard" (or "Dashboard" for volunteer) — gray text, no underline
- Right: "Welcome, [Name]" in white + "Logout" link in gray
- Full-width, fixed height ~52px, no border
```

---

## SCREEN 1 — Login Page

```
Design a web login page for "VolunteerSystem".

LAYOUT:
- Full white page background
- Top navbar: dark navy (#1E293B) full-width bar. Left: "VolunteerSystem" logo in white bold. Center-left nav links: "Home" (gray). Right: "Login" and "Register" links in gray.
- Centered login card: positioned center of the page, ~480px wide. White background, subtle drop shadow (box-shadow: 0 4px 12px rgba(0,0,0,0.1)), border-radius 8px.

LOGIN CARD CONTENTS (top to bottom):
1. Card header bar: full-width solid blue (#2563EB) background, ~48px tall. Text "Login" in white, ~20px, bold, left-padded 20px.
2. Card body with 20px padding:
   - Label "Email" (dark text, ~14px) → full-width text input with value "volunteer@example.com"
   - Label "Password" (dark text) → full-width password input (dots shown), blue focus border (#2563EB)
   - Checkbox row: small unchecked checkbox + label "Remember Me" in gray text
   - Full-width blue button (#2563EB): "Login" in white bold ~15px, border-radius 6px, ~44px height
   - Centered link below button: "Forgot Password?" in blue underline text

VARIANT — Login Error State:
- Add a full-width red error banner ABOVE the login card (but below the navbar): light pink background (#FEE2E2), red text (#991B1B): "Login Unsuccessful. Please check email and password". No border, ~48px tall, padded 16px.
```

---

## SCREEN 2 — Volunteer Registration Form

```
Design a volunteer registration web form for "VolunteerSystem".

LAYOUT:
- White page, top navbar (no nav links visible — unauthenticated state).
- A centered white form card, ~860px wide, with a subtle border (#E2E8F0) and padding 24px. No visible card header — content starts at the top.

FORM STRUCTURE (top to bottom, all within the card):

SECTION 1 — Account Info (no section label):
- Two-column row: "Full Name" (left, half-width input) | "Email" (right, half-width input)
- Two-column row: "Password" (left, half-width input) | "Confirm Password" (right, half-width input — label in orange-red #DC2626 to indicate required/error)

SECTION 2 — labeled heading "Personal Info" in blue (~#3B82F6), bold, ~18px:
- Two-column row: "Phone Number" (left input) | "National ID" (right input)
- Two-column row: "Age" (left input) | "Gender" (right input, pre-filled dropdown: "Male")
- Two-column row: "City" (left input, pre-filled: "Cairo") | "Department" (right input, pre-filled: "HR")

SECTION 3 — labeled heading "Education & Experience" in blue, bold ~18px:
- Full-width label "Educational Level" + dropdown/input below (value: "Graduated" or "Undergraduate")
- Full-width label "Faculty" + text input
- Conditional row (if Undergraduate): "Academic Year" full-width text input
- Full-width label "Skills (Comma separated)" + multi-line textarea (~80px tall)
- Checkbox row: unchecked checkbox + "Do you have previous volunteering experience?"
- Full-width green CTA button (#16A34A): "Sign Up" in white bold, ~48px height, border-radius 6px

INPUT STYLE:
- All inputs: white background, 1px solid #E2E8F0 border, 6px border-radius, ~38px height, 10px padding
- Focused input: blue border (#2563EB)
- Labels: ~13px, dark gray or colored (blue for section fields like Phone, National ID etc.)
```

---

## SCREEN 3 — Admin Dashboard

```
Design a full admin dashboard page for "VolunteerSystem".

NAVBAR: Dark navy bar. Left: "VolunteerSystem" white bold. Nav links: "Home" + "Admin Dashboard" in gray. Right: "Welcome, Second Admin" white + "Logout" gray.

PAGE CONTENT (24px horizontal padding, white background):

ROW 1 — Stat Cards (4 cards, equal width, ~16px gap):
1. "Volunteers" — blue background (#2563EB), title "Volunteers" white ~14px bold, value "1501" white ~48px bold
2. "Pending" — amber/yellow background (#EAB308), title "Pending" white, value "430" white large
3. "Events" — dark green background (#16A34A), title "Events" white, value "4" white large
4. "Upcoming events" — cyan/teal background (#06B6D4), title "Upcoming events" white, value "0" white large
All cards: ~180px tall, border-radius 8px, no border, white text throughout.

ROW 2 — Utility button:
- Right-aligned button: "Manage Certificates" — teal/cyan background (#06B6D4), white text, border-radius 6px, ~36px height

ROW 3 — Search Bar (full-width card with border):
- Card with light border and ~16px padding
- Title "Search Volunteers" in dark text, ~15px semi-bold
- Single row of filters: 
  a) Wide text input: placeholder "Search by name or email..."
  b) Dropdown: "Education Level" with caret
  c) Dropdown: "Department" with caret
  d) Text input: placeholder "Min Experience (Years)"
  e) Blue button (#2563EB): "Search" in white, ~36px height

ROW 4 — Two-column layout:
LEFT COLUMN (~65% width): "Pending Approvals (430)" — dark bold heading ~20px
  - Volunteer cards stacked vertically, each with:
    - Yellow/amber border (#EAB308), 2px, border-radius 8px, white background, ~80px tall, padding 16px
    - Top line: name bold (e.g. "Catherine Nelson") in dark text ~15px
    - Second line: email in blue link style + " | " + phone number in dark text, ~13px
    - Third line: "Edu: Graduated | Dept: Fr" in muted gray ~12px
    - Right side: two action buttons side by side: "Approve" (green #16A34A, white text) + "Reject" (red #DC2626, white text), each ~70px wide, 6px border-radius

RIGHT COLUMN (~35% width): "Recent Events" heading + two button row: "Manage Positions" (outlined teal, white bg) + "Create Event" (solid blue #2563EB white text)
  - Event list items (no card border, just rows with thin dividers):
    - Event name (bold, ~15px) + date right-aligned (gray)
    - Status badge: small rounded pill "completed" — green background white text, ~12px
    - Two small outline buttons: "Edit" (gray border) + "Apps" (gray border), ~28px height

Show 3 volunteer cards and 3 event rows in this design.
```

---

## SCREEN 4 — Create / Edit Event Form

```
Design an event creation form for "VolunteerSystem" admin.

NAVBAR: Dark navy. Left: "VolunteerSystem" + nav links "Home" "Admin Dashboard". Right: "Welcome, Second Admin" + "Logout".

FORM CARD: Centered, ~860px wide, white background, subtle border (#E2E8F0), padding 24px.

CARD HEADER: Light gray background (#F1F5F9), ~40px height, text "Create New Event" (or "Edit Event") in dark gray ~14px, left-padded 16px. Thin bottom border.

FORM FIELDS (top to bottom, all full-width unless noted):
1. Label "Event Name" → full-width text input (empty or filled with "HR")
2. Label "Description" → full-width multi-line textarea, ~100px height (empty or value "kh")
3. Label "Location" → full-width text input (empty or value "jj")
4. Two-column row:
   - Left: "Event Date" label → date input with calendar icon on right side, placeholder "mm/dd/yyyy" (or value "04/08/2026")
   - Right: "Event Time" label → time input with clock icon on right side, placeholder "--:-- --" (or value "12:46 AM")
5. Two-column row:
   - Left: "Duration (Hours)" label → number input (empty or value "7.00")
   - Right: "Volunteers Required" label → number spinner input with up/down arrows (empty or value "1")
6. Label "Skills Required (Comma separated)" → full-width textarea ~80px (empty or value "khk")
7. Label "Status" → full-width select/input showing "Upcoming" or "Completed"
8. Full-width blue submit button (#2563EB): "Create Event" in white bold, ~48px height, border-radius 6px

INPUT STYLE: white bg, 1px #E2E8F0 border, 6px radius, 38px height, 10px padding. Calendar/clock icons are small gray icons inside the right side of the input.
```

---

## SCREEN 5 — Manage Positions Page

```
Design a "Manage Positions" admin page for "VolunteerSystem".

NAVBAR: Dark navy, same as other screens. "Welcome, Second Admin" + "Logout" on right.

TWO-COLUMN LAYOUT (side by side, starting ~80px from top):

LEFT COLUMN (~38% width): "Add New Position" card
- Card header: dark navy (#1E293B) full-width background, ~44px, text "Add New Position" in white bold ~15px, left-padded 16px, border-radius top corners 8px
- Card body (white background, 1px gray border on sides and bottom, padding 20px):
  - Label "Position Title" (brown-orange label color ~#92400E) → full-width text input
  - Label "Department" (brown-orange) → text input pre-filled "HR"
  - Label "Description" (brown-orange) → multi-line textarea ~120px height
  - Helper text below textarea: "Describe the role, responsibilities, and requirements." in muted gray ~12px
  - Full-width blue button (#2563EB): "Add Position" white bold, ~44px height, border-radius 6px

RIGHT COLUMN (~60% width): "Open Positions" section
- Heading "Open Positions" dark bold ~24px
- Top-right badge: small dark gray rounded pill "1 Active" with white text, ~13px

Table with headers and rows:
  HEADERS (bold ~14px): "Title" | "Department" | "Posted Date" | "Apps" | "Actions"
  DIVIDER LINE below headers
  
  DATA ROW:
  - "HR assistant" bold, second line "ajsnca..." muted gray ~12px | (Department empty) | "2026-02-13" gray | Cyan badge circle "1" (#06B6D4 bg, white text, ~24px circle) | Two buttons: "Apps" (outlined teal #06B6D4 border + text) + "Delete" (outlined red #DC2626 border + text), ~28px height

Row background: very light gray (#F8FAFC) alternating or subtle divider line at bottom.
```

---

## SCREEN 6 — Applicants for Position Page

```
Design an "Applicants for: HR assistant" admin page for "VolunteerSystem".

NAVBAR: Dark navy. "VolunteerSystem" left, "Home" + "Admin Dashboard" nav links. Right: "Welcome, Second Admin" + "Logout".

BREADCRUMB (below navbar, ~16px top margin):
"Admin Dashboard / Manage Positions / Applicants: HR assistant"
- "Admin Dashboard" and "Manage Positions" are blue links (#3B82F6), separated by " / " gray text
- "Applicants: HR assistant" plain dark gray text

PAGE HEADING: "Applicants for: HR assistant" — bold, ~28px, dark text
Subtext below: "ajsnca..." in muted gray ~13px

Top-right corner: small dark gray pill badge "Hr" in rounded rectangle, ~30px wide, white text.

TABLE (full width, ~40px top margin from heading):
HEADER ROW: dark navy background (#1E293B or #334155), ~44px height, white text bold ~14px
Columns: "Volunteer Info" (~40% width) | "Member Since" | "Status" | "Actions"

DATA ROW (light gray background #F8FAFC):
- "Test Volunteer" bold dark ~14px, below it "volunteer@example.com | 01212345678" in muted gray ~12px
- "2026-02-13" in gray text
- "Pending" badge: amber/yellow (#EAB308) background, white text bold, ~26px height, border-radius 20px, padded 8px 14px
- Three buttons side by side: "View Stats" (blue #2563EB bg white text) + "Approve" (green #16A34A bg white text) + "Reject" (red #DC2626 bg white text), each ~80px wide, ~32px height, 6px border-radius

Empty state below the row (large empty white space).
```

---

## SCREEN 7 — Volunteer Stats (Admin View)

```
Design a "Volunteer Stats" admin detail page for "VolunteerSystem".

LAYOUT: White page, same dark navbar ("Welcome, Second Admin").

PAGE HEADING: "Volunteer Stats: Test Volunteer" — bold ~28px, dark text, left-aligned
Subtext: "volunteer@example.com | 01212345678" — muted gray ~13px
Top-right: green badge (#16A34A bg, white text): "Status: Approved", border-radius 6px, ~32px height

ROW 1 — Three equal stat cards (~24px gap):
1. Green card (#16A34A): Title "Total Volunteer Hours" white ~14px centered, value "19.0" white ~52px bold centered, subtitle "Credited from completed events" white ~12px centered
2. Blue card (#2563EB): Title "Events Attended" white, value "3" white large, subtitle "Total participations recorded" white small
3. Cyan/Teal card (#06B6D4): Title "Total Applications" white, value "3" white large, subtitle "Including pending and rejected" white small
All cards: ~200px tall, border-radius 8px.

SECTION 1 — "Application History (Full Record)":
- Section header bar: blue gradient or solid blue (#3B82F6), ~44px, text "Application History (Full Record)" in white bold ~15px, left-padded 16px
- Table below header:
  Columns: "Event Name" | "Date Applied" | "Result"
  3 data rows:
  Row 1: "HR" | "2026-03-03" | Green "Approved" badge
  Row 2: "media" | "2026-02-13" | Green "Approved" badge
  Row 3: "media" | "2026-02-13" | Green "Approved" badge
  Row alternating: white and very light gray
  "Approved" badge: green (#16A34A) bg, white text, border-radius 4px, ~24px height, padded 4px 10px

SECTION 2 — "Attendance Record (Work Completed)":
- Section header bar: DARK NAVY (#1E293B) background, ~44px, text "Attendance Record (Work Completed)" in white bold ~15px
- Table below:
  Columns: "Event Name" | "Date" | "Check-in Time" | "Status" | "Hours Credited"
  2 visible rows:
  Row 1: "HR" | "2026-04-08" | "N/A" | "confirmed" red badge (#DC2626 bg white text, border-radius 20px) | "7.00 hrs"
  Row 2: "media" | "2026-03-05" | "N/A" | "confirmed" red badge | "7.00 hrs"
```

---

## SCREEN 8 — Volunteer Dashboard (My Applications)

```
Design the volunteer's personal dashboard page for "VolunteerSystem".

NAVBAR: Dark navy. "VolunteerSystem" left, "Home" + "Dashboard" nav links in gray. Right: "Welcome, Test Volunteer" white + "Logout" gray.

TWO-COLUMN LAYOUT:

LEFT COLUMN (~35% width): "Volunteer Profile" card
- Card header: dark navy (#1E293B) background, "Volunteer Profile" white bold text, border-radius top 8px
- Card body: white background, 1px #E2E8F0 border on sides and bottom, padding 20px:
  - Name "Test Volunteer" in bold cyan/teal (#06B6D4), ~18px
  - Two small pill badges side-by-side below name: "Beginner Volunteer" (teal/cyan background, white or dark text, small ~12px) + "None" (gray background, dark text)
  - Thin divider line
  - Info rows with label (gray ~12px) and value (dark ~13px) right-aligned:
    "Total Hours:" → "19.0"
    "Member Since:" → "2026-02-13"
    "City:" → "Alexandria"
  - Full-width outlined button: "Edit Profile" — white bg, teal/cyan (#06B6D4) border and text, border-radius 6px, ~38px
  - Thin divider
  - "Explore Opportunities" heading centered, gray ~13px
  - Full-width blue button (#2563EB): "View Open Positions" white bold
  - Centered helper text: "Long-term roles & leadership" muted gray ~12px

RIGHT COLUMN (~65% width):
  HEADER ROW: "My Applications" bold dark ~24px + two buttons top-right:
  - "Request Certificate" teal/cyan outlined button (#06B6D4 border and text)
  - "Browse Events" green button (#16A34A bg, white text)

  APPLICATION CARDS (stacked, each card with light border and padding ~16px, border-radius 8px):
  Card 1:
  - Title "HR" bold ~16px + "Applied: 2026-03-03" right-aligned gray ~12px
  - "Date: 2026-04-08 | Time: 00:46:00" gray ~13px
  - "Location: jj | Hours: 7.00" gray ~13px
  - "kh..." muted text
  - Bottom row: "Status: Approved" green badge (#16A34A) + "Completed & Credited" green badge right-aligned

  Card 2:
  - Title "media" bold + "Applied: 2026-02-13" right-aligned
  - Date/time/location/hours row
  - Description truncated
  - "Status: Approved" green badge + "Completed & Credited" green badge right-aligned

  Card 3: Same pattern as Card 2 with different date.

  BELOW CARDS — "Participation History" section heading bold ~20px:
  Rows with event name + date, right side shows hours in green rounded badge (e.g. "7.00 hrs" in green) + "Confirmed" in gray.
```

---

## SCREEN 9 — Edit Profile (Volunteer)

```
Design a volunteer "Edit Profile" page for "VolunteerSystem".

NAVBAR: Dark navy. "VolunteerSystem" left, "Home" + "Dashboard" nav links. Right: "Welcome, Test Volunteer" + "Logout".

FORM CARD: Centered, ~860px wide, white background, 1px #E2E8F0 border, border-radius 8px.

CARD HEADER: Light gray background (#F1F5F9), ~40px, text "Edit Profile" dark gray ~14px, left-padded 16px, thin bottom border.

FORM FIELDS (all full-width, 20px padding inside card):
1. Label "Full Name" (blue/teal label color) → text input, value "Test Volunteer"
2. Label "Phone Number" (blue/teal) → text input, value "01212345678"
3. Label "City" (blue/teal) → text input, value "Alexandria"
4. Label "Skills (Comma separated)" (blue/teal) → multi-line textarea ~100px height (empty)
5. Helper text below textarea: "Comma separated values" in muted gray ~12px
6. Full-width blue button (#2563EB): "Update Profile" white bold, ~48px height, border-radius 6px

INPUT STYLE: 1px #E2E8F0 border, 6px radius, 38px height, white background, 10px padding.
Label color: blue-teal (~#0EA5E9 or #3B82F6).
```

---

## SCREEN 10 — Detail Certificate Requests (Admin)

```
Design a "Detail Certificate Requests" admin page for "VolunteerSystem".

NAVBAR: Dark navy. "VolunteerSystem" + "Home" + "Admin Dashboard". Right: "Welcome, Second Admin" + "Logout".

SUCCESS BANNER (below navbar, full width): light green background (#DCFCE7), text "Certificate marked as issued." in dark green (#166534), ~48px height, no border, padded 16px.

PAGE HEADING: "Detail Certificate Requests" — bold ~28px, dark text
Blue link below: "← Back to Dashboard" in blue (#3B82F6) underline, ~14px.

TABLE (~32px below the link):
COLUMN HEADERS (plain text, no background, bold ~14px dark, bottom border line):
"Volunteer" | "Type" | "Event / Details" | "Hours" | "Status" | "Actions"

DATA ROW (light gray #F8FAFC background, ~72px tall):
- "Test Volunteer" bold dark ~14px, below it "volunteer@example.com" in muted gray ~12px
- "Total Hours"
- "Cumulative Total" — blue link text (#3B82F6)
- "0.00"
- "Issued" badge: green (#16A34A) background, white text, bold, border-radius 20px, padded 6px 14px
- "Download (Mock)" — outlined button: white bg, gray (#6B7280) border and text, border-radius 6px, ~32px height

Table has a thin bottom border on each row. No additional rows shown.
```

---

## SCREEN 11 — Browse Events / Upcoming Events (Volunteer)

```
Design an "Upcoming Events" page for a logged-in volunteer on "VolunteerSystem".

NAVBAR: Dark navy. "VolunteerSystem" left, "Home" + "Dashboard" nav links in gray. Right: "Welcome, Test Volunteer" white + "Logout" gray.

PAGE BODY (white background, 24px padding):
- Page heading: "Upcoming Events" — bold ~28px, dark text (#1E293B)
- Below heading (16px margin): Text "No upcoming events found." in muted orange-red (~#B45309 or dark amber), ~14px.
- Rest of page: empty white space.

This is the empty state. Keep the layout clean and minimal — no cards, no table.
```

---

## Notes for All Screens

- All pages use a consistent **dark navy top navbar** (#1E293B) — this is the only persistent dark element.
- Page backgrounds are **pure white** (#FFFFFF).
- Form inputs throughout use a **thin 1px light gray border** (#E2E8F0) with **6px border-radius**.
- Active/focused inputs show a **blue ring** (#2563EB).
- The design language is **clean, minimal, functional** — no decorative elements, no gradients (except where noted), no icons except calendar/clock in date inputs.
- Button hierarchy: Primary = solid blue (#2563EB). Secondary/positive = solid green (#16A34A). Destructive = solid red (#DC2626). Utility = solid/outlined cyan (#06B6D4). Neutral = outlined gray.
- Badges are **pill-shaped** (high border-radius ~20px) for status indicators.
- All section header bars on tables use either dark navy or solid blue fills.
