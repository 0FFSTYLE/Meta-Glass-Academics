"""Atomic JSON-file store used as the demo database."""
import json
import tempfile
import uuid
from pathlib import Path

from django.conf import settings

TABLES = [
    "users", "students", "parents", "teachers", "subjects", "study_sessions",
    "tests", "notes", "announcements", "diary", "calendar_events", "consults",
    "ask_history", "glass_sessions", "glass_captures",
]

PREFIX = {
    "users": "u", "students": "s", "parents": "p", "teachers": "t",
    "subjects": "sub", "study_sessions": "ss", "tests": "tst", "notes": "n",
    "announcements": "a", "diary": "d", "calendar_events": "c",
    "consults": "cs", "ask_history": "ask",
    "glass_sessions": "gs", "glass_captures": "gc",
}


def _path(table):
    return Path(settings.JSON_DB_DIR) / f"{table}.json"


def read(table):
    p = _path(table)
    if not p.exists():
        return []
    with open(p, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
            return data if isinstance(data, list) else []
        except json.JSONDecodeError:
            return []


def _atomic_write(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    with open(fd, "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=1, ensure_ascii=False)
    Path(tmp).replace(path)


def write(table, rows):
    _atomic_write(_path(table), rows)
    return rows


def insert(table, record):
    rows = read(table)
    if not record.get("id"):
        record["id"] = f"{PREFIX.get(table, 'r')}_{uuid.uuid4().hex[:6]}"
    rows.append(record)
    write(table, rows)
    return record


def update(table, rid, patch):
    rows = read(table)
    for r in rows:
        if r.get("id") == rid:
            r.update(patch)
            write(table, rows)
            return r
    return None


def find(table, **kw):
    out = []
    for r in read(table):
        if all(r.get(k) == v for k, v in kw.items()):
            out.append(r)
    return out


def get(table, rid):
    for r in read(table):
        if r.get("id") == rid:
            return r
    return None
