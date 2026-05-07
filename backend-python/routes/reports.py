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

    current = dt_date.fromisoformat(str(date_range["min_d"]))
    end = dt_date.fromisoformat(str(date_range["max_d"]))
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
            "SELECT id FROM organizations WHERE admin_user_id = %s", (current_user["id"],)
        ).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")

        oid = org["id"]
        row = db.execute(
            """
            SELECT
                COUNT(ov.id)                                                          AS total_volunteers,
                COUNT(ov.id) FILTER (WHERE ov.status = 'Active')                     AS active_volunteers,
                COUNT(ov.id) FILTER (WHERE ov.status = 'Pending')                    AS pending_members,
                COALESCE(SUM(a.hours) FILTER (WHERE a.status = 'Approved'), 0)       AS total_hours,
                COUNT(a.id)  FILTER (WHERE a.status = 'Pending')                     AS pending_activities,
                COUNT(e.id)                                                           AS total_events,
                COUNT(e.id)  FILTER (WHERE e.status = 'Completed')                   AS completed_events,
                COUNT(e.id)  FILTER (WHERE e.status IN ('Active','Upcoming'))        AS active_events
            FROM organizations o
            LEFT JOIN org_volunteers ov ON ov.org_id = o.id
            LEFT JOIN activities a ON a.org_id = o.id
            LEFT JOIN events e ON e.org_id = o.id
            WHERE o.id = %s
            """,
            (oid,),
        ).fetchone()

        return {
            "totalVolunteers": row["total_volunteers"],
            "activeVolunteers": row["active_volunteers"],
            "totalHours": float(row["total_hours"]),
            "pendingActivities": row["pending_activities"],
            "pendingMembers": row["pending_members"],
            "completedEvents": row["completed_events"],
            "totalEvents": row["total_events"],
            "activeEvents": row["active_events"],
        }


@router.get("/volunteer-hours")
def volunteer_hours(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(require_roles("org_admin")),
):
    with get_db() as db:
        org = dict_row(db.execute(
            "SELECT id FROM organizations WHERE admin_user_id = %s", (current_user["id"],)
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
            "JOIN org_volunteers ov ON v.id = ov.volunteer_id AND ov.org_id = %s "
            "LEFT JOIN activities a ON v.id = a.volunteer_id AND a.org_id = %s"
        )
        params: list = [oid, oid]

        if date_from:
            query += " AND a.date >= %s"
            params.append(date_from)
        if date_to:
            query += " AND a.date <= %s"
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
            "SELECT id FROM organizations WHERE admin_user_id = %s", (current_user["id"],)
        ).fetchone())
        if not org:
            raise HTTPException(404, "Organization not found")

        oid = org["id"]
        rows = dict_rows(db.execute(
            "SELECT v.name, v.email, v.status, "
            "COALESCE(SUM(CASE WHEN a.status='Approved' THEN a.hours ELSE 0 END),0) as total_hours, "
            "COUNT(CASE WHEN a.status='Approved' THEN 1 END) as events "
            "FROM volunteers v JOIN org_volunteers ov ON v.id=ov.volunteer_id AND ov.org_id=%s "
            "LEFT JOIN activities a ON v.id=a.volunteer_id AND a.org_id=%s "
            "GROUP BY v.id ORDER BY total_hours DESC",
            (oid, oid),
        ).fetchall())

        csv_content = "Name,Email,Status,Total Hours,Events Attended\n"
        for r in rows:
            csv_content += f'"{r["name"]}","{r["email"]}","{r["status"]}",{r["total_hours"]},{r["events"]}\n'

        return PlainTextResponse(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=volunteer_report.csv"},
        )


@router.get("/star-schema")
def export_star_schema(current_user: dict = Depends(require_roles("org_admin"))):
    with get_db() as db:
        org = dict_row(db.execute(
            "SELECT id, name FROM organizations WHERE admin_user_id = %s", (current_user["id"],)
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
                    (a.created_at::date)::text                                       AS submitted_date,
                    COALESCE((a.reviewed_at::date)::text, '')                        AS reviewed_date,
                    a.hours                                                          AS hours_logged,
                    CASE WHEN a.status='Approved' THEN a.hours ELSE 0 END            AS hours_approved,
                    CASE WHEN a.status='Approved' THEN 1 ELSE 0 END                  AS is_approved,
                    CASE WHEN a.status='Rejected' THEN 1 ELSE 0 END                  AS is_rejected,
                    CASE WHEN a.status='Pending'  THEN 1 ELSE 0 END                  AS is_pending,
                    CASE WHEN a.event_id IS NOT NULL THEN 1 ELSE 0 END               AS is_event_linked,
                    COALESCE(
                        ROUND(EXTRACT(EPOCH FROM (a.reviewed_at - a.created_at)) / 86400.0, 2)::text,
                        ''
                    )                                                                AS days_to_review
                FROM activities a
                WHERE a.org_id = %s
            """, (oid,)).fetchall()
            zf.writestr("fact_activity_log.csv", _to_csv(rows))

            # dim_volunteer
            rows = db.execute("""
                SELECT
                    v.id                                                             AS volunteer_id,
                    v.name,
                    v.email,
                    COALESCE(v.gender, '')                                           AS gender,
                    COALESCE(v.date_of_birth::text, '')                              AS date_of_birth,
                    CASE
                        WHEN v.date_of_birth IS NULL THEN ''
                        WHEN EXTRACT(YEAR FROM AGE(v.date_of_birth)) < 18 THEN '<18'
                        WHEN EXTRACT(YEAR FROM AGE(v.date_of_birth)) < 25 THEN '18-24'
                        WHEN EXTRACT(YEAR FROM AGE(v.date_of_birth)) < 35 THEN '25-34'
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
                WHERE ov.org_id = %s
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
                    COALESCE(o.reviewed_at::text, '')                                AS approved_at
                FROM organizations o
                WHERE o.id = %s
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
                    EXTRACT(YEAR FROM e.date::date)::int                             AS event_year,
                    CASE
                        WHEN EXTRACT(MONTH FROM e.date::date) <= 3  THEN 1
                        WHEN EXTRACT(MONTH FROM e.date::date) <= 6  THEN 2
                        WHEN EXTRACT(MONTH FROM e.date::date) <= 9  THEN 3
                        ELSE 4
                    END                                                              AS event_quarter,
                    EXTRACT(MONTH FROM e.date::date)::int                            AS event_month,
                    TO_CHAR(e.date::date, 'Day')                                     AS day_of_week,
                    COALESCE(e.time, '')                                             AS start_time,
                    COALESCE(e.duration, 0)                                          AS planned_duration_hours,
                    COALESCE(e.max_volunteers, 0)                                    AS max_volunteers,
                    COALESCE(e.required_skills, '')                                  AS required_skills,
                    e.status                                                         AS event_status,
                    e.created_at
                FROM events e
                WHERE e.org_id = %s
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
                WHERE s.org_id = %s
            """, (oid,)).fetchall()
            zf.writestr("dim_supervisor.csv", _to_csv(rows))

            # dim_date — calendar spanning the full activity date range
            date_range = dict_row(db.execute(
                "SELECT MIN(date)::text as min_d, MAX(date)::text as max_d FROM activities WHERE org_id = %s",
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
                    COALESCE(ov.joined_at::text, '')                                 AS joined_at,
                    COALESCE(ov.governorate_snapshot, '')                            AS governorate_at_join,
                    COALESCE(ov.city_snapshot, '')                                   AS city_at_join,
                    ov.is_active
                FROM org_volunteers ov
                WHERE ov.org_id = %s
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
