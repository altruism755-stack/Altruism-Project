import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
from matplotlib.lines import Line2D
import matplotlib.patheffects as pe

# ── Canvas ────────────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(22, 13))
ax.set_xlim(0, 22)
ax.set_ylim(0, 13)
ax.axis('off')
fig.patch.set_facecolor('#ffffff')

# ── Helpers ───────────────────────────────────────────────────────────────────
def section_box(x, y, w, h, label, bg, border, lbl_color='#1a1a1a'):
    rect = FancyBboxPatch((x, y), w, h,
                          boxstyle='round,pad=0.12',
                          facecolor=bg, edgecolor=border, linewidth=2.2, zorder=2)
    ax.add_patch(rect)
    ax.text(x + w / 2, y + h - 0.28, label,
            fontsize=10.5, fontweight='bold', ha='center', va='top',
            color=lbl_color, fontfamily='monospace', zorder=3)


def inner_box(x, y, w, h, title, subs=(), bg='#ffffff', border='#aaaaaa', title_size=9):
    rect = FancyBboxPatch((x, y), w, h,
                          boxstyle='round,pad=0.06',
                          facecolor=bg, edgecolor=border, linewidth=1.5, zorder=4)
    ax.add_patch(rect)
    cy = y + h / 2 + (len(subs) * 0.14) if subs else y + h / 2
    ax.text(x + w / 2, cy, title,
            fontsize=title_size, fontweight='bold', ha='center', va='center',
            color='#111111', zorder=5)
    for i, s in enumerate(subs):
        ax.text(x + w / 2, cy - 0.30 - i * 0.28, s,
                fontsize=7.2, ha='center', va='center', color='#555555', zorder=5)


def arrow(x1, y1, x2, y2, label='', bidirectional=False,
          color='#444444', lw=1.8, rad=0.0, label_offset=(0, 0.18)):
    style = '<->' if bidirectional else '->'
    ax.annotate('',
                xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle=style, color=color, lw=lw,
                                connectionstyle=f'arc3,rad={rad}'),
                zorder=6)
    if label:
        mx = (x1 + x2) / 2 + label_offset[0]
        my = (y1 + y2) / 2 + label_offset[1]
        ax.text(mx, my, label, fontsize=7.8, ha='center', va='bottom',
                color=color, fontweight='bold', zorder=7)


# ══════════════════════════════════════════════════════════════════════════════
#  TITLE
# ══════════════════════════════════════════════════════════════════════════════
ax.text(11, 12.65, 'Altruism System Architecture',
        fontsize=22, fontweight='bold', ha='center', va='top',
        color='#1a1a1a', fontfamily='DejaVu Sans', zorder=3)

# ══════════════════════════════════════════════════════════════════════════════
#  USER_ROLES  (x=0.15, y=2.2, w=2.7, h=9.8)
# ══════════════════════════════════════════════════════════════════════════════
section_box(0.15, 2.2, 2.7, 9.8, 'USER_ROLES', '#f5f5f5', '#9e9e9e')

roles = [
    ('Volunteer',       '#e8f5e9', '#43a047'),
    ('Supervisor',      '#e3f2fd', '#1e88e5'),
    ('Org Admin',       '#fff3e0', '#ef6c00'),
    ('Platform\nAdmin', '#fce4ec', '#c62828'),
]
for i, (name, bg, bd) in enumerate(roles):
    inner_box(0.32, 9.6 - i * 2.25, 2.36, 1.9, name, bg=bg, border=bd, title_size=9.5)


# ══════════════════════════════════════════════════════════════════════════════
#  DATA_LAYER  (x=3.1, y=0.5, w=4.1, h=11.5)
# ══════════════════════════════════════════════════════════════════════════════
section_box(3.1, 0.5, 4.1, 11.5, 'DATA_LAYER', '#e3f2fd', '#1565c0')

inner_box(3.28, 9.2, 3.74, 2.3, 'PostgreSQL 18',
          subs=('20 tables  ·  1 computed view',
                'users · volunteers · supervisors',
                'organizations · events · activities',
                'certificates · audit_logs · notifications'),
          bg='#ffffff', border='#1565c0', title_size=9.5)

inner_box(3.28, 7.0, 3.74, 2.0, 'psycopg 3.2.4  +  psycopg-pool',
          subs=('Connection pool: min=2  max=10',
                'SERIALIZABLE transactions (exclusive_db)',
                'get_db() context manager'),
          bg='#ffffff', border='#1976d2')

inner_box(3.28, 5.1, 3.74, 1.7, 'Static File Storage',
          subs=('/uploads/profiles/   (profile pics)',
                '/uploads/certificates/   (PDFs)',
                'Served via Starlette StaticFiles'),
          bg='#ffffff', border='#42a5f5')

inner_box(3.28, 3.35, 3.74, 1.55, 'SQL Migrations',
          subs=('backend-python/migrations/',
                '001 → 007  (versioned, idempotent)',
                'init_schema() on startup'),
          bg='#ffffff', border='#64b5f6')

inner_box(3.28, 1.1, 3.74, 2.05, 'Audit & Notification Tables',
          subs=('audit_logs  (actor_id · action · metadata)',
                'notifications  (user_id · type · is_read)',
                'org_profile_change_requests'),
          bg='#ffffff', border='#64b5f6')


# ══════════════════════════════════════════════════════════════════════════════
#  BACKEND_LAYER  (x=7.5, y=0.5, w=7.0, h=11.5)
# ══════════════════════════════════════════════════════════════════════════════
section_box(7.5, 0.5, 7.0, 11.5, 'BACKEND_LAYER', '#fffde7', '#f9a825')

# FastAPI
inner_box(7.7, 10.1, 6.6, 1.5, 'FastAPI  ⚡  (REST API)',
          subs=('uvicorn · redirect_slashes=False · /api/health',
                'Global error handler  ·  Request logging middleware'),
          bg='#fffff8', border='#f9a825', title_size=10)

# 15 Route Modules
inner_box(7.7, 7.6, 6.6, 2.3, '15 Route Modules  ( /api/* )',
          subs=('auth  ·  volunteers  ·  supervisors  ·  events  ·  activities',
                'certificates  ·  reports  ·  organizations  ·  event_applications',
                'announcements  ·  admin  ·  notifications  ·  lifecycle',
                'audit  ·  event_ratings'),
          bg='#fffff0', border='#fbc02d', title_size=9.5)

# Auth & RBAC
inner_box(7.7, 5.85, 3.15, 1.55, 'JWT Authentication',
          subs=('python-jose  ·  HS256  ·  7-day expiry',
                'get_current_user dependency',
                'generate_token / verify_token'),
          bg='#ffffff', border='#888888')

inner_box(11.05, 5.85, 3.25, 1.55, 'RBAC  (require_roles)',
          subs=('4 roles: volunteer · supervisor',
                'org_admin · platform_admin',
                'get_org_for_admin  (2-path lookup)'),
          bg='#ffffff', border='#888888')

# Password & Rate Limit
inner_box(7.7, 4.25, 3.15, 1.4, 'Password Security',
          subs=('passlib + bcrypt',
                'hash_password / verify_password',
                'RuntimeError if JWT_SECRET unset'),
          bg='#ffffff', border='#888888')

inner_box(11.05, 4.25, 3.25, 1.4, 'Rate Limiting  (slowapi)',
          subs=('/register: 20 req/min/IP',
                '/login:    10 req/min/IP',
                'key_func=get_remote_address'),
          bg='#ffffff', border='#888888')

# Lifecycle Engine
inner_box(7.7, 2.5, 6.6, 1.55, 'Lifecycle Engine  ( /api/lifecycle )',
          subs=('compute_volunteer_lifecycle  ·  compute_org_lifecycle  ·  compute_supervisor_lifecycle',
                '5 states: APPLICATION_PENDING → APPROVED → ACTIVITY_LOGGED → APPROVED → CERTIFICATE_ISSUED'),
          bg='#ffffff', border='#888888')

# Reports & Certificates
inner_box(7.7, 1.05, 3.15, 1.25, 'Reports Module',
          subs=('/summary  ·  /volunteer-hours',
                '/export-csv  ·  /star-schema (ZIP)'),
          bg='#ffffff', border='#888888')

inner_box(11.05, 1.05, 3.25, 1.25, 'Certificate Module',
          subs=('POST /api/certificates  (issue)',
                'POST /{id}/upload  (PDF only, 10 MB)'),
          bg='#ffffff', border='#888888')


# ══════════════════════════════════════════════════════════════════════════════
#  FRONTEND_LAYER  (x=14.8, y=4.8, w=6.8, h=7.2)
# ══════════════════════════════════════════════════════════════════════════════
section_box(14.8, 4.8, 6.8, 7.2, 'FRONTEND_LAYER', '#fce4ec', '#c62828')

inner_box(14.98, 10.45, 6.44, 1.2, 'React 18  +  Vite  (SPA)',
          subs=('pnpm dev  →  HMR on :5173'),
          bg='#ffffff', border='#e53935', title_size=10)

inner_box(14.98, 9.0, 6.44, 1.2, 'shadcn/ui  +  Tailwind CSS 4',
          subs=('Radix UI primitives  ·  utility-first styling'),
          bg='#ffffff', border='#e57373')

inner_box(14.98, 7.55, 6.44, 1.2, 'TanStack Query  +  React Router 7',
          subs=('useActivities · useEvents · useVolunteer hooks'),
          bg='#ffffff', border='#e57373')

inner_box(14.98, 6.1, 3.1, 1.2, 'Recharts',
          subs=('AreaChart · PieChart · BarChart',),
          bg='#ffffff', border='#e57373')

inner_box(18.28, 6.1, 3.14, 1.2, 'React Hook Form',
          subs=('Multi-step registration forms',),
          bg='#ffffff', border='#e57373')

inner_box(14.98, 5.0, 6.44, 0.9, 'AuthContext  ·  ProtectedRoute  ·  localStorage JWT',
          bg='#fff5f5', border='#ef9a9a')


# ══════════════════════════════════════════════════════════════════════════════
#  INFRA  (x=14.8, y=0.5, w=6.8, h=4.0)
# ══════════════════════════════════════════════════════════════════════════════
section_box(14.8, 0.5, 6.8, 4.0, 'INFRA', '#f3e5f5', '#7b1fa2')

inner_box(14.98, 1.9, 3.0, 1.9, 'GitHub',
          subs=('Version Control',
                'Source repository'),
          bg='#ffffff', border='#7b1fa2')

inner_box(18.2, 1.9, 3.2, 1.9, 'Render',
          subs=('Cloud Deployment',
                'uvicorn  ·  PORT env var'),
          bg='#ffffff', border='#7b1fa2')

inner_box(14.98, 0.72, 6.44, 1.0, 'Environment Variables',
          subs=('DATABASE_URL  ·  JWT_SECRET  ·  CORS_ORIGINS  ·  PLATFORM_ADMIN_EMAIL/PASSWORD',),
          bg='#fdf6ff', border='#ba68c8')


# ══════════════════════════════════════════════════════════════════════════════
#  ARROWS / CONNECTIONS
# ══════════════════════════════════════════════════════════════════════════════

# USER_ROLES → FRONTEND  (browser)
arrow(2.85, 9.3, 14.8, 9.3, label='HTTP Browser', bidirectional=True,
      color='#37474f', lw=1.8, rad=0.12, label_offset=(0, 0.22))

# FRONTEND ↔ BACKEND  (JSON REST)
arrow(14.8, 8.1, 14.5, 8.1, label='JSON / REST', bidirectional=True,
      color='#bf360c', lw=2.2, label_offset=(0, 0.22))

# DATA_LAYER ↔ BACKEND  (SQL)
arrow(7.2, 6.5, 7.5, 6.5, label='SQL (psycopg 3)', bidirectional=True,
      color='#1565c0', lw=2.2, label_offset=(0, 0.22))

# DATA Static ↔ BACKEND
arrow(7.2, 5.3, 7.5, 5.3, label='File I/O', bidirectional=True,
      color='#1565c0', lw=1.5, label_offset=(0, 0.22))

# BACKEND ↔ Audit/Notif
arrow(7.2, 2.0, 7.5, 2.0, label='DB write', bidirectional=False,
      color='#1565c0', lw=1.3, label_offset=(0, 0.18))

# INFRA → BACKEND (deploy)
arrow(17.2, 4.8, 13.2, 2.8, label='Deploy', bidirectional=False,
      color='#7b1fa2', lw=1.5, rad=-0.2, label_offset=(0, 0.18))


# ══════════════════════════════════════════════════════════════════════════════
#  Legend / version stamp
# ══════════════════════════════════════════════════════════════════════════════
ax.text(21.8, 0.12, 'Python 3.14 · FastAPI 0.115 · PostgreSQL 18 · React 18 · psycopg 3.2.4',
        fontsize=6.8, ha='right', va='bottom', color='#999999', style='italic')

plt.tight_layout(pad=0.3)
out = r'C:\Users\vvmar\Downloads\Altruism_Architecture.png'
plt.savefig(out, dpi=160, bbox_inches='tight', facecolor='white')
plt.close()
print(f'Saved -> {out}')
