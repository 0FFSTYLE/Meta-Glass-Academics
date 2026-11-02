# Meta Glass Academics

A demo academic platform for school & college students, designed around the
flow in `working plan.png`:

```
Meta Glasses Record ─┐
                     ├─→ Phone for Processing ─→ Database record ─→ Website ─→ Student / Teacher / Parent panels
Ask Meta AI (stuck) ─┘
```

**No glasses? No problem.** The external/laptop webcam acts as the glasses
camera (Glass Studio in the student portal). The Django server is the "phone"
processing layer, the JSON folder is the database, and Ask Meta AI runs on the
Meta Llama API with an offline study fallback.

## Quick start (Windows)

1. Start the server — double-click or run:
   ```
   backend\run-server.bat
   ```
   Everything serves from one URL (project venv lives in `backend\.venv`).
2. Open `http://127.0.0.1:8000/` in Chrome/Edge and sign in:
   - `student1` / `pass123` → student portal
   - `parent1` / `pass123` → parent portal
   - `teacher1` / `pass123` → teacher portal
3. In the student portal, open **Glass Studio → Start recording** (allow camera),
   then ask something in **Ask Meta AI**.

macOS/Linux: `bash backend/run-server.sh`.

## Project layout

```
website/
  main/      landing (Default.png) + aesthetic login (Login.png) — index/main/login files
  student/   student portal — stats, calendar, previous, diary, ASK, glass studio, profile
  parent/    parent portal — child, record, teacher consult, settings
  teacher/   teacher portal — students, marks, progress, calendar, announcements, parents
  shared/    api.js (client+session) · glass.js (camera module) · theme.css
backend/
  config/    Django settings/urls/wsgi
  core/      jsondb.py · meta_client.py · vision.py · views.py · urls.py
  database/  JSON tables + main_record.json index + SCHEMA.md
```

Each website folder has its own HTML/CSS/JS; `shared/` holds the two extra
modules (API client, Glass camera). Every sidebar label from the mockups is a
working icon button wired to a real endpoint.

## Enabling live Meta AI answers

```bat
set META_API_KEY=your_llama_api_key
backend\run-server.bat
```

Optional: `META_API_URL` (default `https://api.llama.com/v1/chat/completions`),
`META_MODEL` (default `Llama-4-Maverick-17B-128E-Instruct-FP8`).
Without a key, ASK answers from the built-in study guide and labels itself
`offline-fallback` so you always know which provider served you.

## Notes & limits (demo)

- Passwords are plain text in `users.json` — demo only, never ship this.
- Camera frames are analysed for brightness/sharpness/focus; only the metadata
  is stored (`glass_captures.json`), no video is retained.
- Camera needs Chrome/Edge on `localhost`/HTTPS; `file://` pages can use the
  camera in Chrome but the Django server must still be running for data.
