# Database Schema — Meta Glass Academics (JSON demo store)

All tables live in `backend/database/*.json`. Each file is a JSON array of records.
`main_record.json` is the index: table counts + last updated + demo credentials pointer.

## Tables

### users.json
| field | type | notes |
|---|---|---|
| id | string `u_…` | primary key |
| username | string unique | login id |
| password | string | PLAIN TEXT demo only — never in production |
| role | student\|parent\|teacher | portal selector |
| ref_id | string | id into students/parents/teachers table |
| full_name, email | string | |
| created_at | ISO date | |

### students.json
`{id, user_id, name, grade, section, school, roll_no, parent_id, subjects[string], joined}`

### parents.json
`{id, user_id, name, phone, children_ids[]}`

### teachers.json
`{id, user_id, name, subject, classes[], phone}`

### study_sessions.json
`{id, student_id, date:YYYY-MM-DD, subject, duration_min, topics[], focus_score:0-100, source:glass|webcam|manual}`

### subjects.json
`{id, name, code, teacher_id, syllabus_total, color}`

### tests.json
`{id, student_id, subject, title, max_marks, obtained, date, teacher_note}`

### notes.json (Note by Teacher)
`{id, student_id, teacher_id, text, date, tag}`

### announcements.json
`{id, teacher_id, title, body, audience:all|grade, date}`

### diary.json (Student diary)
`{id, student_id, date, mood, entry, learnings[], tomorrow_plan}`

### calendar_events.json
`{id, owner_role, owner_id, title, date, time, kind:class|exam|event|meeting}`

### consults.json (Parent ↔ Teacher)
`{id, parent_id, teacher_id, student_id, message, reply, status:open|answered, date}`

### ask_history.json (Meta ASK)
`{id, user_id, role, question, answer, subject_guess, provider:meta-llama|offline-fallback, latency_ms, date}`

### glass_sessions.json + glass_captures.json
Session: `{id, student_id, started_at, ended_at, duration_min, captures:int, avg_focus}`
Capture: `{id, session_id, student_id, timestamp, brightness, sharpness, focus_score, ocr_hint, note}`
Images are NOT stored as blobs — only analysis metadata (demo). Snapshots stay in-browser unless `SAVE_SNAPSHOTS=1`.

## Integrity rules (enforced in `core/jsondb.py`)
- Every write rewrites the whole file atomically (tmp + rename).
- `id` auto-generated as `<prefix>_<shortuuid>` when missing.
- Foreign keys are soft-checked; unknown student_id on session/test insert returns 400.
- Dates must be `YYYY-MM-DD` or ISO datetime where noted.
