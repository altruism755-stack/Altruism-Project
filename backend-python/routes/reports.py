import csv
import io
import re
import zipfile
from datetime import date as dt_date, timedelta

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import PlainTextResponse, Response
from typing import Optional

from database import get_db, dict_row, dict_rows
from auth import require_roles


def _to_csv(rows) -> str:
    if not rows:
        return ""
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows([dict(r) for r in rows])
    return out.getvalue()


def _build_dim_date(date_range: dict | None) -> str:
    headers = ["date_key", "full_date", "year", "quarter", "month_num", "month_name",
               "week_of_year", "day_of_month", "day_of_week_num", "day_name", "is_weekend"]
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=headers)
    writer.writeheader()
    if not date_range or not date_range.get("min_d"):
        return out.getvalue()

    MONTHS = ["January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December"]
    DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    current = dt_date.fromisoformat(date_range["min_d"])
    end = dt_date.fromisoformat(date_range["max_d"])
    while current <= end:
        writer.writerow({
            "date_key": int(current.strftime("%Y%m%d")),
            "full_date": current.isoformat(),
            "year": current.year,
            "quarter": (current.month - 1) // 3 + 1,
            "month_num": current.month,
            "month_name": MONTHS[current.month - 1],
            "week_of_year": current.isocalendar()[1],
            "day_of_month": current.day,
            "day_of_week_num": current.weekday(),
            "day_name": DAYS[current.weekday()],
            "is_weekend": 1 if current.weekday() >= 5 else 0,
        })
        current += timedelta(days=1)
    return out.getvalue()

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/summary")
def report_summary(current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        org = dict_row(db.execute(
            "SELECT id FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
        ).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")

        oid = org["id"]
        total_volunteers = db.execute(
            "SELECT COUNT(*) as c FROM org_volunteers WHERE org_id = ?", (oid,)
        ).fetchone()["c"]
        active_volunteers = db.execute(
            "SELECT COUNT(*) as c FROM org_volunteers WHERE org_id = ? AND status = 'Active'", (oid,)
        ).fetchone()["c"]
        total_hours = db.execute(
            "SELECT COALESCE(SUM(hours), 0) as h FROM activities WHERE org_id = ? AND status = 'Approved'", (oid,)
        ).fetchone()["h"]
        pending_activities = db.execute(
            "SELECT COUNT(*) as c FROM activities WHERE org_id = ? AND status = 'Pending'", (oid,)
        ).fetchone()["c"]
        pending_members = db.execute(
            "SELECT COUNT(*) as c FROM org_volunteers WHERE org_id = ? AND status = 'Pending'", (oid,)
        ).fetchone()["c"]
        completed_events = db.execute(
            "SELECT COUNT(*) as c FROM events WHERE org_id = ? AND status = 'Completed'", (oid,)
        ).fetchone()["c"]
        total_events = db.execute(
            "SELECT COUNT(*) as c FROM events WHERE org_id = ?", (oid,)
        ).fetchone()["c"]
        active_events = db.execute(
            "SELECT COUNT(*) as c FROM events WHERE org_id = ? AND status IN ('Active','Upcoming')", (oid,)
        ).fetchone()["c"]

        return {
            "totalVolunteers": total_volunteers,
            "activeVolunteers": active_volunteers,
            "totalHours": total_hours,
            "pendingActivities": pending_activities,
            "pendingMembers": pending_members,
            "completedEvents": completed_events,
            "totalEvents": total_events,
            "activeEvents": active_events,
        }


@router.get("/volunteer-hours")
def volunteer_hours(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(require_roles("org_admin")),
):
    with get_db() as db:
        org = dict_row(db.execute(
            "SELECT id FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
        ).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")

        oid = org["id"]
        query = (
            "SELECT v.id, v.name, v.email, v.status, "
            "COALESCE(SUM(CASE WHEN a.status = 'Approved' THEN a.hours ELSE 0 END), 0) as total_hours, "
            "COUNT(CASE WHEN a.status = 'Approved' THEN 1 END) as events_attended, "
            "MAX(CASE WHEN a.status = 'Approved' THEN a.date END) as last_activity "
            "FROM volunteers v "
            "JOIN org_volunteers ov ON v.id = ov.volunteer_id AND ov.org_id = ? "
            "LEFT JOIN activities a ON v.id = a.volunteer_id AND a.org_id = ?"
        )
        params: list = [oid, oid]

        if date_from:
            query += " AND a.date >= ?"
            params.append(date_from)
        if date_to:
            query += " AND a.date <= ?"
            params.append(date_to)

        query += " GROUP BY v.id ORDER BY total_hours DESC"

        report = dict_rows(db.execute(query, params).fetchall())
        total_hours = sum(r["total_hours"] for r in report)
        total_events = sum(r["events_attended"] for r in report)

        return {"report": report, "totalHours": total_hours, "totalEvents": total_events}


@router.get("/export-csv")
def export_csv(current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        org = dict_row(db.execute(
            "SELECT id FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
        ).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")

        oid = org["id"]
        rows = dict_rows(db.execute(
            "SELECT v.name, v.email, v.status, "
            "COALESCE(SUM(CASE WHEN a.status='Approved' THEN a.hours ELSE 0 END),0) as total_hours, "
            "COUNT(CASE WHEN a.status='Approved' THEN 1 END) as events "
            "FROM volunteers v JOIN org_volunteers ov ON v.id=ov.volunteer_id AND ov.org_id=? "
            "LEFT JOIN activities a ON v.id=a.volunteer_id AND a.org_id=? "
            "GROUP BY v.id ORDER BY total_hours DESC",
            (oid, oid),
        ).fetchall())

        csv = "Name,Email,Status,Total Hours,Events Attended\n"
        for r in rows:
            csv += f'"{r["name"]}","{r["email"]}","{r["status"]}",{r["total_hours"]},{r["events"]}\n'

        return PlainTextResponse(
            content=csv,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=volunteer_report.csv"},
        )


@router.get("/star-schema")
def export_star_schema(current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        org = dict_row(db.execute(
            "SELECT id, name FROM organizations WHERE admin_user_id = ?", (current_user["id"],)
        ).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")

        oid = org["id"]
        slug = re.sub(r"[^a-z0-9]+", "_", org["name"].lower())[:30].strip("_")

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:

            # fact_activity_log
            rows = db.execute("""
                SELECT
                    a.id                                                             AS activity_id,
                    a.volunteer_id,
                    a.org_id                                                         AS organization_id,
                    COALESCE(a.event_id, -1)                                         AS event_id,
                    COALESCE(a.reviewed_by, -1)                                      AS reviewing_supervisor_id,
                    a.date                                                           AS activity_date,
                    date(a.created_at)                                               AS submitted_date,
                    COALESCE(date(a.reviewed_at), '')                                AS reviewed_date,
                    a.hours                                                          AS hours_logged,
                    CASE WHEN a.status='Approved' THEN a.hours ELSE 0 END            AS hours_approved,
                    CASE WHEN a.status='Approved' THEN 1 ELSE 0 END                  AS is_approved,
                    CASE WHEN a.status='Rejected' THEN 1 ELSE 0 END                  AS is_rejected,
                    CASE WHEN a.status='Pending'  THEN 1 ELSE 0 END                  AS is_pending,
                    CASE WHEN a.event_id IS NOT NULL THEN 1 ELSE 0 END               AS is_event_linked,
                    COALESCE(
                        ROUND(julianday(a.reviewed_at) - julianday(a.created_at), 2),
                        ''
                    )                                                                AS days_to_review
                FROM activities a
                WHERE a.org_id = ?
            """, (oid,)).fetchall()
            zf.writestr("fact_activity_log.csv", _to_csv(rows))

            # dim_volunteer
            rows = db.execute("""
                SELECT
                    v.id                                                             AS volunteer_id,
                    v.name,
                    v.email,
                    COALESCE(v.gender, '')                                           AS gender,
                    COALESCE(v.date_of_birth, '')                                    AS date_of_birth,
                    CASE
                        WHEN v.date_of_birth IS NULL OR v.date_of_birth = '' THEN ''
                        WHEN (CAST(strftime('%Y','now') AS INT)
                              - CAST(strftime('%Y', v.date_of_birth) AS INT)) < 18 THEN '<18'
                        WHEN (CAST(strftime('%Y','now') AS INT)
                              - CAST(strftime('%Y', v.date_of_birth) AS INT)) < 25 THEN '18-24'
                        WHEN (CAST(strftime('%Y','now') AS INT)
                              - CAST(strftime('%Y', v.date_of_birth) AS INT)) < 35 THEN '25-34'
                        ELSE '35+'
                    END                                                              AS age_band,
                    COALESCE(v.city, '')                                             AS city,
                    COALESCE(v.governorate, '')                                      AS governorate,
                    COALESCE(v.nationality, '')                                      AS nationality,
                    COALESCE(v.education_level, '')                                  AS education_level,
                    COALESCE(v.university_name, '')                                  AS university_name,
                    COALESCE(v.faculty, '')                                          AS faculty,
                    COALESCE(v.study_year, '')                                       AS study_year,
                    COALESCE(v.field_of_study, '')                                   AS field_of_study,
                    CASE WHEN v.university_name IS NOT NULL
                              AND v.university_name != '' THEN 1 ELSE 0 END          AS is_student,
                    COALESCE(v.skills, '')                                           AS skills,
                    COALESCE(v.cause_areas, '')                                      AS cause_areas,
                    COALESCE(v.languages, '')                                        AS languages,
                    COALESCE(v.availability, '')                                     AS availability,
                    COALESCE(v.hours_per_week, 0)                                    AS hours_per_week_capacity,
                    COALESCE(v.prior_experience, 0)                                  AS prior_experience,
                    COALESCE(v.prior_org, '')                                        AS prior_org,
                    v.status                                                         AS volunteer_status,
                    v.created_at                                                     AS registered_at
                FROM volunteers v
                JOIN org_volunteers ov ON v.id = ov.volunteer_id
                WHERE ov.org_id = ?
            """, (oid,)).fetchall()
            zf.writestr("dim_volunteer.csv", _to_csv(rows))

            # dim_organization
            rows = db.execute("""
                SELECT
                    o.id                                                             AS organization_id,
                    o.name,
                    COALESCE(o.org_type, '')                                         AS org_type,
                    COALESCE(o.categories, '')                                       AS categories,
                    COALESCE(o.hq_city, '')                                          AS hq_city,
                    COALESCE(o.location, '')                                         AS hq_governorate,
                    COALESCE(o.branches, '')                                         AS branches,
                    COALESCE(o.org_size, '')                                         AS org_size,
                    COALESCE(o.founded_year, '')                                     AS founded_year,
                    o.student_only,
                    o.status                                                         AS approval_status,
                    o.created_at                                                     AS registered_at,
                    COALESCE(o.reviewed_at, '')                                      AS approved_at
                FROM organizations o
                WHERE o.id = ?
            """, (oid,)).fetchall()
            zf.writestr("dim_organization.csv", _to_csv(rows))

            # dim_event
            rows = db.execute("""
                SELECT
                    e.id                                                             AS event_id,
                    e.org_id                                                         AS organization_id,
                    e.name,
                    COALESCE(e.location, '')                                         AS location,
                    e.date                                                           AS event_date,
                    CAST(strftime('%Y', e.date) AS INTEGER)                          AS event_year,
                    CASE
                        WHEN CAST(strftime('%m', e.date) AS INT) <= 3  THEN 1
                        WHEN CAST(strftime('%m', e.date) AS INT) <= 6  THEN 2
                        WHEN CAST(strftime('%m', e.date) AS INT) <= 9  THEN 3
                        ELSE 4
                    END                                                              AS event_quarter,
                    CAST(strftime('%m', e.date) AS INTEGER)                          AS event_month,
                    CASE strftime('%w', e.date)
                        WHEN '0' THEN 'Sunday'   WHEN '1' THEN 'Monday'
                        WHEN '2' THEN 'Tuesday'  WHEN '3' THEN 'Wednesday'
                        WHEN '4' THEN 'Thursday' WHEN '5' THEN 'Friday'
                        ELSE 'Saturday'
                    END                                                              AS day_of_week,
                    COALESCE(e.time, '')                                             AS start_time,
                    COALESCE(e.duration, 0)                                          AS planned_duration_hours,
                    COALESCE(e.max_volunteers, 0)                                    AS max_volunteers,
                    COALESCE(e.required_skills, '')                                  AS required_skills,
                    e.status                                                         AS event_status,
                    e.created_at
                FROM events e
                WHERE e.org_id = ?
            """, (oid,)).fetchall()
            zf.writestr("dim_event.csv", _to_csv(rows))

            # dim_supervisor
            rows = db.execute("""
                SELECT
                    s.id                                                             AS supervisor_id,
                    s.org_id                                                         AS organization_id,
                    s.name,
                    s.email,
                    COALESCE(s.team, '')                                             AS team,
                    s.status                                                         AS supervisor_status,
                    s.created_at
                FROM supervisors s
                WHERE s.org_id = ?
            """, (oid,)).fetchall()
            zf.writestr("dim_supervisor.csv", _to_csv(rows))

            # dim_date — calendar spanning the full activity date range
            date_range = dict_row(db.execute(
                "SELECT min(date) as min_d, max(date) as max_d FROM activities WHERE org_id = ?",
                (oid,),
            ).fetchone())
            zf.writestr("dim_date.csv", _build_dim_date(date_range))

            # dim_volunteer_org_membership
            rows = db.execute("""
                SELECT
                    ov.id                                                            AS membership_id,
                    ov.volunteer_id,
                    ov.org_id                                                        AS organization_id,
                    COALESCE(ov.supervisor_id, -1)                                   AS supervisor_id,
                    COALESCE(ov.department, '')                                      AS department,
                    ov.status                                                        AS membership_status,
                    ov.join_source,
                    COALESCE(ov.channel_detail, '')                                  AS channel_detail,
                    ov.joined_date,
                    COALESCE(ov.joined_at, '')                                       AS joined_at,
                    COALESCE(ov.governorate_snapshot, '')                            AS governorate_at_join,
                    COALESCE(ov.city_snapshot, '')                                   AS city_at_join,
                    ov.is_active
                FROM org_volunteers ov
                WHERE ov.org_id = ?
            """, (oid,)).fetchall()
            zf.writestr("dim_volunteer_org_membership.csv", _to_csv(rows))

        buf.seek(0)
        filename = f"star_schema_{slug}.zip"
        return Response(
            content=buf.read(),
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "X-Table-Count": "7",
            },
        )
