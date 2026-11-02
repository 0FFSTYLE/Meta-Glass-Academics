"""JSON API: auth, student, parent, teacher, diary, tests, notes,
announcements, calendar, consults, ASK (Meta), glass camera, graphs.
Plain Django views returning JSON; CORS header added manually for demo.
"""
import json
from datetime import date, datetime

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from . import jsondb, meta_client
from .vision import analyze_frame


def _json(req):
    try:
        return json.loads(req.body.decode("utf-8") or "{}")
    except Exception:
        return {}


def ok(data=None, status=200):
    resp = JsonResponse({"ok": True, "data": data}, status=status)
    resp["Access-Control-Allow-Origin"] = "*"
    return resp


def err(message, status=400):
    resp = JsonResponse({"ok": False, "error": message}, status=status)
    resp["Access-Control-Allow-Origin"] = "*"
    return resp


def _today():
    return date.today().isoformat()


# ---------- health ----------

def health(req):
    return ok({"service": "meta-glass-academics", "time": datetime.now().isoformat()})


# ---------- auth ----------

@csrf_exempt
def login(req):
    if req.method == "OPTIONS":
        return ok({})
    if req.method != "POST":
        return err("POST required", 405)
    b = _json(req)
    users = jsondb.find("users", username=b.get("username", ""), password=b.get("password", ""))
    if b.get("role"):
        users = [u for u in users if u["role"] == b["role"]]
    if not users:
        return err("Invalid username, password or portal role", 401)
    u = dict(users[0])
    u.pop("password", None)
    return ok({"user": u})


@csrf_exempt
def register(req):
    if req.method == "OPTIONS":
        return ok({})
    if req.method != "POST":
        return err("POST required", 405)
    b = _json(req)
    username, password, role = b.get("username", "").strip(), b.get("password", ""), b.get("role", "")
    name = b.get("full_name", username).strip() or username
    if not username or not password or role not in ("student", "parent", "teacher"):
        return err("username, password and valid role are required")
    if jsondb.find("users", username=username):
        return err("Username already exists", 409)
    ref = jsondb.insert(
        {"student": "students", "parent": "parents", "teacher": "teachers"}[role],
        {"student": {"name": name, "grade": b.get("grade", "10"), "section": "A",
                     "school": "City Public School", "roll_no": "-", "subjects": ["Mathematics"]},
         "parent": {"name": name, "phone": b.get("phone", ""), "children_ids": []},
         "teacher": {"name": name, "subject": b.get("subject", "General"),
                     "classes": [], "phone": b.get("phone", "")}}[role],
    )
    user = jsondb.insert("users", {"username": username, "password": password, "role": role,
                                  "ref_id": ref["id"], "full_name": name,
                                  "email": b.get("email", ""), "created_at": _today()})
    jsondb.update(ref_table(role), ref["id"], {"user_id": user["id"]})
    user = dict(user)
    user.pop("password", None)
    return ok({"user": user}, 201)


def ref_table(role):
    return {"student": "students", "parent": "parents", "teacher": "teachers"}[role]


# ---------- student ----------

def student_overview(req, sid):
    st = jsondb.get("students", sid)
    if not st:
        return err("Unknown student", 404)
    sessions = jsondb.find("study_sessions", student_id=sid)
    today_s = [s for s in sessions if s["date"] == _today()]
    # fall back to latest day with data so demo graphs are never empty
    day = _today() if today_s else (max((s["date"] for s in sessions), default=_today()))
    day_s = [s for s in sessions if s["date"] == day]
    duration = sum(s["duration_min"] for s in day_s)
    subjects = sorted({s["subject"] for s in day_s})
    perf = round(sum(s["focus_score"] for s in day_s) / len(day_s), 1) if day_s else 0
    tests = jsondb.find("tests", student_id=sid)
    avg = round(sum(t["obtained"] / t["max_marks"] * 100 for t in tests), 1) / len(tests) if tests else 0
    notes = sorted(jsondb.find("notes", student_id=sid), key=lambda n: n["date"], reverse=True)[:3]
    return ok({"student": st, "day": day, "today_minutes": duration,
               "subjects_covered": subjects, "focus_avg": perf,
               "test_avg_pct": round(avg, 1), "recent_notes": notes,
               "sessions_today": day_s})


def student_previous(req, sid):
    sessions = sorted(jsondb.find("study_sessions", student_id=sid),
                      key=lambda s: s["date"], reverse=True)
    return ok({"sessions": sessions[:30]})


def compare_graph(req):
    sid = req.GET.get("student_id", "")
    days = int(req.GET.get("days", "7"))
    sessions = jsondb.find("study_sessions", student_id=sid)
    by_day = {}
    for s in sessions:
        d = by_day.setdefault(s["date"], {"minutes": 0, "focus": [], "subjects": set()})
        d["minutes"] += s["duration_min"]
        d["focus"].append(s["focus_score"])
        d["subjects"].add(s["subject"])
    labels = sorted(by_day)[-days:]
    return ok({
        "labels": labels,
        "minutes": [by_day[d]["minutes"] for d in labels],
        "focus": [round(sum(by_day[d]["focus"]) / len(by_day[d]["focus"]), 1) for d in labels],
        "subjects": [len(by_day[d]["subjects"]) for d in labels],
    })


# ---------- diary ----------

@csrf_exempt
def diary(req):
    if req.method == "OPTIONS":
        return ok({})
    if req.method == "GET":
        sid = req.GET.get("student_id", "")
        entries = sorted(jsondb.find("diary", student_id=sid),
                         key=lambda d: d["date"], reverse=True)
        return ok({"entries": entries})
    b = _json(req)
    if not jsondb.get("students", b.get("student_id", "")):
        return err("Unknown student_id", 400)
    rec = jsondb.insert("diary", {
        "student_id": b["student_id"], "date": b.get("date") or _today(),
        "mood": b.get("mood", "okay"), "entry": b.get("entry", ""),
        "learnings": b.get("learnings", []), "tomorrow_plan": b.get("tomorrow_plan", "")})
    return ok({"entry": rec}, 201)


# ---------- ASK (Meta API) ----------

@csrf_exempt
def ask(req):
    if req.method == "OPTIONS":
        return ok({})
    if req.method == "GET":
        uid = req.GET.get("user_id", "")
        hist = sorted(jsondb.find("ask_history", user_id=uid),
                      key=lambda a: a.get("date", ""), reverse=True)[:20]
        return ok({"history": hist})
    b = _json(req)
    q = b.get("question", "").strip()
    if not q:
        return err("question is required")
    answer, provider, ms = meta_client.ask_meta(q, b.get("context", ""))
    rec = jsondb.insert("ask_history", {
        "user_id": b.get("user_id", ""), "role": b.get("role", "student"),
        "question": q, "answer": answer, "subject_guess": meta_client.guess_subject(q),
        "provider": provider, "latency_ms": ms,
        "date": datetime.now().isoformat(timespec="seconds")})
    return ok({"answer": answer, "provider": provider,
               "subject": rec["subject_guess"], "latency_ms": ms})


# ---------- glass camera (external webcam stand-in) ----------

@csrf_exempt
def glass_start(req):
    if req.method == "OPTIONS":
        return ok({})
    b = _json(req)
    if not jsondb.get("students", b.get("student_id", "")):
        return err("Unknown student_id", 400)
    rec = jsondb.insert("glass_sessions", {
        "student_id": b["student_id"],
        "started_at": datetime.now().isoformat(timespec="seconds"),
        "ended_at": "", "duration_min": 0, "captures": 0, "avg_focus": 0})
    return ok({"session": rec}, 201)


@csrf_exempt
def glass_stop(req):
    if req.method == "OPTIONS":
        return ok({})
    b = _json(req)
    sess = jsondb.get("glass_sessions", b.get("session_id", ""))
    if not sess:
        return err("Unknown session_id", 404)
    caps = jsondb.find("glass_captures", session_id=sess["id"])
    avg = round(sum(c["focus_score"] for c in caps) / len(caps), 1) if caps else 0
    try:
        t0 = datetime.fromisoformat(sess["started_at"])
        mins = max(1, int((datetime.now() - t0).total_seconds() // 60))
    except Exception:
        mins = len(caps) * 2 or 1
    upd = jsondb.update("glass_sessions", sess["id"], {
        "ended_at": datetime.now().isoformat(timespec="seconds"),
        "duration_min": mins, "captures": len(caps), "avg_focus": avg})
    # a stopped capture session becomes study time on the dashboard
    if b.get("subject"):
        jsondb.insert("study_sessions", {
            "student_id": sess["student_id"], "date": _today(), "subject": b["subject"],
            "duration_min": mins, "topics": [b.get("topic", "Glass capture session")],
            "focus_score": int(avg) if avg else 70, "source": "webcam"})
    return ok({"session": upd})


@csrf_exempt
def glass_capture(req):
    if req.method == "OPTIONS":
        return ok({})
    b = _json(req)
    if not jsondb.get("students", b.get("student_id", "")):
        return err("Unknown student_id", 400)
    now = datetime.now().isoformat(timespec="seconds")
    analysis = analyze_frame(b.get("image", ""), seed_hint=now)
    rec = jsondb.insert("glass_captures", {
        "session_id": b.get("session_id", ""), "student_id": b["student_id"],
        "timestamp": now, "brightness": analysis["brightness"],
        "sharpness": analysis["sharpness"], "focus_score": analysis["focus_score"],
        "ocr_hint": b.get("ocr_hint", ""), "note": b.get("note") or analysis["note"]})
    return ok({"capture": rec, "analysis": analysis}, 201)


def glass_sessions(req):
    sid = req.GET.get("student_id", "")
    sessions = sorted(jsondb.find("glass_sessions", student_id=sid),
                      key=lambda s: s.get("started_at", ""), reverse=True)[:10]
    for s in sessions:
        s["captures_list"] = jsondb.find("glass_captures", session_id=s["id"])[:12]
    return ok({"sessions": sessions})


# ---------- parent ----------

def parent_overview(req, pid):
    p = jsondb.get("parents", pid)
    if not p:
        return err("Unknown parent", 404)
    kids = [jsondb.get("students", cid) for cid in p.get("children_ids", [])]
    kids = [k for k in kids if k]
    out = []
    for k in kids:
        tests = jsondb.find("tests", student_id=k["id"])
        avg = round(sum(t["obtained"] / t["max_marks"] * 100 for t in tests), 1) / len(tests) if tests else 0
        notes = sorted(jsondb.find("notes", student_id=k["id"]),
                       key=lambda n: n["date"], reverse=True)[:3]
        out.append({"student": k, "test_avg_pct": round(avg, 1), "latest_tests": tests[-3:],
                    "teacher_notes": notes})
    return ok({"parent": p, "children": out})


def parent_records(req, pid):
    child = req.GET.get("child_id", "")
    p = jsondb.get("parents", pid)
    if not p or (p.get("children_ids") and child not in p["children_ids"]):
        return err("Child not linked to this parent", 403)
    sessions = sorted(jsondb.find("study_sessions", student_id=child),
                      key=lambda s: s["date"], reverse=True)[:20]
    tests = sorted(jsondb.find("tests", student_id=child),
                   key=lambda t: t["date"], reverse=True)
    notes = sorted(jsondb.find("notes", student_id=child),
                   key=lambda n: n["date"], reverse=True)
    return ok({"sessions": sessions, "tests": tests, "notes": notes})


@csrf_exempt
def consults(req, cid=None):
    if req.method == "OPTIONS":
        return ok({})
    if req.method == "GET":
        rows = jsondb.read("consults")
        for f in ("parent_id", "teacher_id", "student_id"):
            if req.GET.get(f):
                rows = [r for r in rows if r.get(f) == req.GET[f]]
        return ok({"consults": sorted(rows, key=lambda r: r.get("date", ""), reverse=True)})
    b = _json(req)
    if cid:  # teacher reply
        rec = jsondb.update("consults", cid, {"reply": b.get("reply", ""), "status": "answered"})
        if not rec:
            return err("Unknown consult id", 404)
        return ok({"consult": rec})
    rec = jsondb.insert("consults", {
        "parent_id": b.get("parent_id", ""), "teacher_id": b.get("teacher_id", ""),
        "student_id": b.get("student_id", ""), "message": b.get("message", ""),
        "reply": "", "status": "open", "date": _today()})
    return ok({"consult": rec}, 201)


# ---------- teacher ----------

def teacher_overview(req, tid):
    t = jsondb.get("teachers", tid)
    if not t:
        return err("Unknown teacher", 404)
    students = jsondb.read("students")
    tests = jsondb.read("tests")
    avg = round(sum(x["obtained"] / x["max_marks"] * 100 for x in tests), 1) / len(tests) if tests else 0
    pending = [c for c in jsondb.find("consults", teacher_id=tid) if c["status"] == "open"]
    anns = sorted(jsondb.find("announcements", teacher_id=tid),
                  key=lambda a: a["date"], reverse=True)[:5]
    return ok({"teacher": t, "student_count": len(students),
               "class_avg_pct": round(avg, 1), "pending_consults": pending,
               "announcements": anns, "students": students})


@csrf_exempt
def tests(req):
    if req.method == "OPTIONS":
        return ok({})
    if req.method == "GET":
        rows = jsondb.read("tests")
        if req.GET.get("student_id"):
            rows = [r for r in rows if r["student_id"] == req.GET["student_id"]]
        return ok({"tests": sorted(rows, key=lambda t: t["date"], reverse=True)})
    b = _json(req)
    if not jsondb.get("students", b.get("student_id", "")):
        return err("Unknown student_id", 400)
    rec = jsondb.insert("tests", {
        "student_id": b["student_id"], "subject": b.get("subject", ""),
        "title": b.get("title", ""), "max_marks": int(b.get("max_marks", 100)),
        "obtained": float(b.get("obtained", 0)), "date": b.get("date") or _today(),
        "teacher_note": b.get("teacher_note", "")})
    return ok({"test": rec}, 201)


@csrf_exempt
def notes(req):
    if req.method == "OPTIONS":
        return ok({})
    if req.method == "GET":
        rows = jsondb.read("notes")
        if req.GET.get("student_id"):
            rows = [r for r in rows if r["student_id"] == req.GET["student_id"]]
        return ok({"notes": sorted(rows, key=lambda n: n["date"], reverse=True)})
    b = _json(req)
    rec = jsondb.insert("notes", {
        "student_id": b.get("student_id", ""), "teacher_id": b.get("teacher_id", ""),
        "text": b.get("text", ""), "date": b.get("date") or _today(),
        "tag": b.get("tag", "note")})
    return ok({"note": rec}, 201)


@csrf_exempt
def announcements(req):
    if req.method == "OPTIONS":
        return ok({})
    if req.method == "GET":
        return ok({"announcements": sorted(jsondb.read("announcements"),
                                           key=lambda a: a["date"], reverse=True)})
    b = _json(req)
    rec = jsondb.insert("announcements", {
        "teacher_id": b.get("teacher_id", ""), "title": b.get("title", ""),
        "body": b.get("body", ""), "audience": b.get("audience", "all"),
        "date": b.get("date") or _today()})
    return ok({"announcement": rec}, 201)


@csrf_exempt
def calendar(req):
    if req.method == "OPTIONS":
        return ok({})
    if req.method == "GET":
        rows = jsondb.read("calendar_events")
        for f in ("owner_role", "owner_id"):
            if req.GET.get(f):
                rows = [r for r in rows if r.get(f) == req.GET[f]]
        return ok({"events": sorted(rows, key=lambda e: (e["date"], e.get("time", "")))})
    b = _json(req)
    rec = jsondb.insert("calendar_events", {
        "owner_role": b.get("owner_role", "student"), "owner_id": b.get("owner_id", ""),
        "title": b.get("title", ""), "date": b.get("date") or _today(),
        "time": b.get("time", ""), "kind": b.get("kind", "event")})
    return ok({"event": rec}, 201)
