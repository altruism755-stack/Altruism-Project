import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from docx import Document
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from copy import deepcopy

doc = Document(r'C:\Users\vvmar\Downloads\Graduation_Project_Filled (5).docx')
body = doc.element.body


def ptxt(el):
    return ''.join(t.text or '' for t in el.iter(qn('w:t')))


def set_para_text(para_el, new_text):
    runs = para_el.findall('.//' + qn('w:r'))
    if not runs:
        r = OxmlElement('w:r')
        t_el = OxmlElement('w:t')
        t_el.text = new_text
        r.append(t_el)
        para_el.append(r)
        return
    first = runs[0]
    ts = first.findall(qn('w:t'))
    if ts:
        ts[0].text = new_text
        for t in ts[1:]:
            first.remove(t)
    else:
        t_el = OxmlElement('w:t')
        t_el.text = new_text
        first.append(t_el)
    for run in runs[1:]:
        para_el.remove(run)


def change_style(para_el, new_style_val):
    pPr = para_el.find(qn('w:pPr'))
    if pPr is None:
        pPr = OxmlElement('w:pPr')
        para_el.insert(0, pPr)
    ps = pPr.find(qn('w:pStyle'))
    if ps is None:
        ps = OxmlElement('w:pStyle')
        pPr.insert(0, ps)
    ps.set(qn('w:val'), new_style_val)


def make_heading_para(text, style_val):
    p = OxmlElement('w:p')
    pPr = OxmlElement('w:pPr')
    pStyle = OxmlElement('w:pStyle')
    pStyle.set(qn('w:val'), style_val)
    pPr.append(pStyle)
    p.append(pPr)
    r = OxmlElement('w:r')
    t_el = OxmlElement('w:t')
    t_el.text = text
    r.append(t_el)
    p.append(r)
    return p


def make_normal_para(text):
    p = OxmlElement('w:p')
    r = OxmlElement('w:r')
    t_el = OxmlElement('w:t')
    t_el.text = text
    r.append(t_el)
    p.append(r)
    return p


# ── 1. Swap TOC entries: List of Tables <-> List of Figures ──────────────────
children = list(body)
toc_tables_el  = next(c for c in children if c.tag == qn('w:p') and ptxt(c).strip() == 'List of Tablesvii')
toc_figures_el = next(c for c in children if c.tag == qn('w:p') and ptxt(c).strip() == 'List of Figuresviii')

idx_tt = list(body).index(toc_tables_el)
idx_tf = list(body).index(toc_figures_el)

toc_tables_copy  = deepcopy(toc_tables_el)
toc_figures_copy = deepcopy(toc_figures_el)

body.remove(toc_tables_el)
body.remove(toc_figures_el)

# After removal, find the element now at the position where tables was
# Re-insert figures first, then tables at those positions
children = list(body)
# Find the element that was just before Abbreviations in TOC
toc_abbrev_el = next(c for c in children if c.tag == qn('w:p') and 'Abbreviations' in ptxt(c) and 'ix' in ptxt(c))
ins_idx = list(body).index(toc_abbrev_el)

body.insert(ins_idx, toc_tables_copy)
body.insert(ins_idx, toc_figures_copy)
print("OK 1: Swapped TOC entries List of Figures/Tables")

# ── 2. Fix TOC: Chapter 3 Requirements Analysis -> System Analysis ────────────
children = list(body)
for c in children:
    if c.tag == qn('w:p') and 'Requirements Analysis' in ptxt(c):
        txt = ptxt(c)
        set_para_text(c, txt.replace('Requirements Analysis', 'System Analysis'))
        print("OK 2: TOC Chapter 3 -> System Analysis")
        break

# ── 3. Swap body sections: List of Figures before List of Tables ──────────────
children = list(body)
idx_bt = next(i for i, c in enumerate(children)
              if c.tag == qn('w:p') and ptxt(c).strip() == 'List of Tables')
idx_bf = next(i for i, c in enumerate(children)
              if c.tag == qn('w:p') and ptxt(c).strip() == 'List of Figures')
idx_ba = next(i for i, c in enumerate(children)
              if c.tag == qn('w:p') and 'List of Abbreviations' in ptxt(c))

tables_sec  = [deepcopy(c) for c in children[idx_bt:idx_bf]]
figures_sec = [deepcopy(c) for c in children[idx_bf:idx_ba]]

for c in children[idx_bt:idx_ba]:
    body.remove(c)

children = list(body)
abbrev_el = next(c for c in children if c.tag == qn('w:p') and 'List of Abbreviations' in ptxt(c))
ins_pos = list(body).index(abbrev_el)

for el in reversed(tables_sec):
    body.insert(ins_pos, el)
for el in reversed(figures_sec):
    body.insert(ins_pos, el)
print("OK 3: Swapped body sections List of Figures/Tables")

# ── 4. Chapter 4: Remove 4.4 Class Diagram and 4.5 Data Flow Diagrams ─────────
children = list(body)
idx_44 = next(i for i, c in enumerate(children)
              if c.tag == qn('w:p') and '4.4 Class Diagram' in ptxt(c))
idx_46 = next(i for i, c in enumerate(children)
              if c.tag == qn('w:p') and '4.6 Security Design' in ptxt(c))

removed = children[idx_44:idx_46]
for c in removed:
    body.remove(c)
print(f"OK 4: Removed {len(removed)} elements (4.4 Class Diagram + 4.5 DFDs)")

# ── 5. Rename 4.6 Security Design -> 4.4 Design Principles ───────────────────
renames_ch4 = [
    ('4.6 Security Design',   '4.4 Design Principles'),
    ('4.6.1 Authentication',  '4.4.1 Authentication'),
    ('4.6.2 Authorization',   '4.4.2 Authorization'),
    ('4.6.3 Data Validation', '4.4.3 Data Validation'),
    ('4.6.4 Rate Limiting',   '4.4.4 Rate Limiting'),
]
children = list(body)
for old, new in renames_ch4:
    for c in children:
        if c.tag == qn('w:p') and old in ptxt(c):
            set_para_text(c, new)
            print(f"OK 5: '{old}' -> '{new}'")
            break

# ── 6. Demote 5.4 and 5.5 to Heading3 sub-sections of 5.3 ───────────────────
children = list(body)
for c in children:
    if c.tag == qn('w:p') and '5.4 Authentication and Authorization' in ptxt(c):
        change_style(c, 'Heading3')
        set_para_text(c, '5.3.5 Authentication and Authorization')
        print("OK 6a: 5.4 Auth -> 5.3.5 (Heading3)")
    elif c.tag == qn('w:p') and '5.5 Technical Challenges' in ptxt(c):
        change_style(c, 'Heading3')
        set_para_text(c, '5.3.6 Technical Challenges and Solutions')
        print("OK 6b: 5.5 Technical Challenges -> 5.3.6 (Heading3)")

# ── 7. Add 5.4 Screenshots and 5.5 Code Samples before Chapter 6 ─────────────
def get_style(c):
    pPr = c.find(qn('w:pPr'))
    if pPr is None:
        return ''
    ps = pPr.find(qn('w:pStyle'))
    return ps.get(qn('w:val'), '') if ps is not None else ''

children = list(body)
ch6_el = next(c for c in children
              if c.tag == qn('w:p') and 'Chapter 6:' in ptxt(c) and 'Heading1' in get_style(c))
ch6_idx = list(body).index(ch6_el)

screenshots_h = make_heading_para('5.4 Screenshots', 'Heading2')
screenshots_p = make_normal_para(
    'Screenshots illustrating the key user interfaces of the Altruism platform are provided below. '
    'These include the volunteer dashboard, organization admin panel, supervisor activity review screen, '
    'and the lifecycle progress indicator. Each screenshot is annotated with the corresponding '
    'system feature and user role.')

code_h = make_heading_para('5.5 Code Samples', 'Heading2')
code_p = make_normal_para(
    'Representative code samples from the backend and frontend implementation are included in '
    'Appendix A. Key excerpts cover the authentication module (auth.py), the lifecycle computation '
    'function (lifecycle.py), and the activity logging endpoint (activities.py).')

body.insert(ch6_idx, code_p)
body.insert(ch6_idx, code_h)
body.insert(ch6_idx, screenshots_p)
body.insert(ch6_idx, screenshots_h)
print("OK 7: Inserted 5.4 Screenshots and 5.5 Code Samples")

# ── 8. Chapter 6 heading and sub-heading renames ─────────────────────────────
ch6_renames = [
    ('Chapter 6: Testing and Performance', 'Chapter 6: Testing and Evaluation'),
    ('6.1 Test Plan',              '6.1 Testing Strategy'),
    ('6.3 Integration Testing',    '6.3 Results'),
    ('6.4 Performance Evaluation', '6.4 Performance'),
]
children = list(body)
for old, new in ch6_renames:
    for c in children:
        if c.tag == qn('w:p') and old in ptxt(c):
            set_para_text(c, new)
            print(f"OK 8: '{old}' -> '{new}'")
            break

# ── 9. Add 6.5 User Feedback before Chapter 7 ────────────────────────────────
children = list(body)
ch7_el = next(c for c in children
              if c.tag == qn('w:p') and 'Chapter 7:' in ptxt(c) and 'Heading1' in get_style(c))
ch7_idx = list(body).index(ch7_el)

uf_h = make_heading_para('6.5 User Feedback', 'Heading2')
uf_p = make_normal_para(
    'User feedback was gathered informally from a sample of four test users '
    '(one per role: volunteer, supervisor, organization administrator, and platform administrator) '
    'following a structured walkthrough of the system. Feedback indicated that the role-based '
    'dashboards were intuitive, the lifecycle progress indicator was clearly understood, and the '
    'notification system effectively communicated status changes. Areas noted for improvement '
    'include adding email notifications and a richer mobile-responsive layout.')

body.insert(ch7_idx, uf_p)
body.insert(ch7_idx, uf_h)
print("OK 9: Inserted 6.5 User Feedback")

# ── Save ──────────────────────────────────────────────────────────────────────
out_path = r'C:\Users\vvmar\Downloads\Graduation_Project_Filled_Reordered.docx'
doc.save(out_path)
print(f"\nSaved -> {out_path}")
