/* Student portal: stats, calendar, previous, diary, Ask Meta AI, Glass Studio, profile. */
const user = Session.require("student");
const sid = user.ref_id;
el("sideUser").textContent = `${user.full_name} · ${user.username}`;
el("logoutBtn").onclick = () => Session.logout();

document.querySelectorAll(".navbtn[data-view]").forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll(".navbtn[data-view]").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    el("v-" + b.dataset.view).classList.add("active");
  };
});

let chart = null;
async function loadOverview() {
  const o = await api(`/student/${sid}/overview/`);
  el("hello").textContent = `Hello, ${o.student.name.split(" ")[0]}`;
  el("dayLine").textContent = `Grade ${o.student.grade}-${o.student.section} · showing ${o.day}`;
  el("cMins").textContent = o.today_minutes + " min";
  el("cMinsD").textContent = `${o.sessions_today.length} session(s) · avg focus ${o.focus_avg}`;
  el("cSub").textContent = o.subjects_covered.length;
  el("cSubD").textContent = o.subjects_covered.join(", ") || "—";
  el("cPerf").textContent = o.test_avg_pct + "%";
  el("cPerfD").textContent = "average across all tests";
  el("notesBox").innerHTML = o.recent_notes.length
    ? o.recent_notes.map((n) => `<div class="note">${esc(n.text)}<div class="who">${esc(n.date)} · ${esc(n.tag)}</div></div>`).join("")
    : "<p>No teacher notes yet.</p>";
  const g = await api(`/graph/compare/?student_id=${sid}&days=7`);
  const ctx = el("compareChart");
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    data: { labels: g.labels, datasets: [
      { type: "bar", label: "Study minutes", data: g.minutes, backgroundColor: "#1f6feb" },
      { type: "line", label: "Focus score", data: g.focus, borderColor: "#b3541e", tension: .3 },
    ]},
    options: { responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } } },
  });
  el("gSubject").innerHTML = o.student.subjects.map((s) => `<option>${esc(s)}</option>`).join("");
}

async function loadCalendar() {
  const { events } = await api(`/calendar/?owner_role=student&owner_id=${sid}`);
  el("calBody").innerHTML = events.map((e) =>
    `<tr><td>${esc(e.date)}</td><td>${esc(e.time || "—")}</td><td>${esc(e.title)}</td><td><span class="pill info">${esc(e.kind)}</span></td></tr>`).join("")
    || `<tr><td colspan="4">No events yet.</td></tr>`;
}
el("evAdd").onclick = async () => {
  if (!el("evTitle").value.trim() || !el("evDate").value) return toast("Title and date required", true);
  await api("/calendar/", { method: "POST", body: {
    owner_role: "student", owner_id: sid, title: el("evTitle").value.trim(),
    date: el("evDate").value, time: el("evTime").value, kind: el("evKind").value } });
  el("evTitle").value = "";
  toast("Event added");
  loadCalendar();
};

async function loadPrevious() {
  const { sessions } = await api(`/student/${sid}/previous/`);
  el("prevBody").innerHTML = sessions.map((s) =>
    `<tr><td>${esc(s.date)}</td><td>${esc(s.subject)}</td><td>${s.duration_min}</td>
     <td><span class="pill ${s.focus_score >= 80 ? "good" : s.focus_score >= 65 ? "warn" : ""}">${s.focus_score}</span></td>
     <td>${esc((s.topics || []).join(", "))}</td><td>${esc(s.source)}</td></tr>`).join("")
    || `<tr><td colspan="6">No sessions yet — record one in Glass Studio.</td></tr>`;
}

async function loadDiary() {
  const { entries } = await api(`/diary/?student_id=${sid}`);
  el("diaryBox").innerHTML = entries.map((d) =>
    `<div class="note"><b>${esc(d.date)}</b> · <span class="pill">${esc(d.mood)}</span><br>${esc(d.entry)}
     ${d.learnings?.length ? `<br><b>Learned:</b> ${esc(d.learnings.join(", "))}` : ""}
     ${d.tomorrow_plan ? `<br><b>Tomorrow:</b> ${esc(d.tomorrow_plan)}` : ""}</div>`).join("")
    || "<p>No entries yet.</p>";
}
el("dDate").value = new Date().toISOString().slice(0, 10);
el("dSave").onclick = async () => {
  if (!el("dEntry").value.trim()) return toast("Write something first", true);
  await api("/diary/", { method: "POST", body: { student_id: sid, date: el("dDate").value,
    mood: el("dMood").value, entry: el("dEntry").value.trim(),
    learnings: el("dLearn").value.split(",").map((s) => s.trim()).filter(Boolean),
    tomorrow_plan: el("dPlan").value.trim() } });
  el("dEntry").value = el("dLearn").value = el("dPlan").value = "";
  toast("Diary saved");
  loadDiary();
};

function bubble(text, cls, src = "") {
  const d = document.createElement("div");
  d.className = "bubble " + cls;
  d.innerHTML = esc(text) + (src ? `<span class="src">${esc(src)}</span>` : "");
  el("chatLog").appendChild(d);
  d.scrollIntoView({ behavior: "smooth", block: "end" });
}
async function loadAskHistory() {
  const { history } = await api(`/ask/?user_id=${user.id}`);
  el("askHist").innerHTML = history.map((h) =>
    `<div class="note"><b>Q:</b> ${esc(h.question)}<br><b>A:</b> ${esc(h.answer.slice(0, 220))}${h.answer.length > 220 ? "…" : ""}
     <div class="who">${esc(h.subject_guess)} · ${esc(h.provider)} · ${esc(h.date)}</div></div>`).join("")
    || "<p>No questions yet — ask your first one above.</p>";
}
el("askSend").onclick = sendAsk;
el("askInput").onkeydown = (e) => { if (e.key === "Enter") sendAsk(); };
async function sendAsk() {
  const q = el("askInput").value.trim();
  if (!q) return;
  el("askInput").value = "";
  bubble(q, "q");
  bubble("Thinking…", "a");
  try {
    const r = await api("/ask/", { method: "POST", body: { user_id: user.id, role: "student", question: q } });
    el("chatLog").lastChild.remove();
    bubble(r.answer, "a", `${r.subject} · ${r.provider} · ${r.latency_ms}ms`);
    el("askProvider").textContent = `— served by ${r.provider}`;
    loadAskHistory();
  } catch (e) {
    el("chatLog").lastChild.remove();
    bubble("Server unreachable — is Django running? " + e.message, "a");
  }
}

/* ---- Glass Studio ---- */
function gLog(msg) { el("gStatus").innerHTML = msg; }
el("gStart").onclick = async () => {
  try {
    gLog("Starting camera…");
    await GlassCam.start(el("glassVideo"), { studentId: sid,
      subject: el("gSubject").value,
      onCapture: (d) => {
        const c = d.capture;
        gLog(`Recording… session <b>${esc(c.session_id)}</b> · last focus <b>${c.focus_score}</b> · ${esc(c.note)}`);
        prependCapture(c);
      } });
    gLog(`Recording… session <b>${GlassCam.sessionId}</b> · snapshots every 15s + manual.`);
    toast("Glass session started");
  } catch (e) { gLog("Camera error: " + esc(e.message)); }
};
el("gSnap").onclick = () => GlassCam.snap(sid, (d) => {
  prependCapture(d.capture);
  gLog(`Snapshot saved · focus <b>${d.capture.focus_score}</b> · ${esc(d.capture.note)}`);
});
function prependCapture(c) {
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${esc((c.timestamp || "").slice(11, 19))}</td><td><span class="pill good">${c.focus_score}</span></td>
    <td>${c.brightness}</td><td>${c.sharpness}</td><td>${esc(c.note)}</td>`;
  el("glassBody").prepend(tr);
}
el("gStop").onclick = async () => {
  if (!GlassCam.sessionId) return toast("No active session", true);
  const s = await GlassCam.stop({ subject: el("gSubject").value, topic: el("gTopic").value.trim() });
  gLog(`Session saved: <b>${s.duration_min} min</b> · ${s.captures} captures · avg focus <b>${s.avg_focus}</b>. Added to today's study time.`);
  toast("Session saved to dashboard");
  loadOverview();
  loadPrevious();
};
async function loadGlass() {
  const { sessions } = await api(`/glass/sessions/?student_id=${sid}`);
  const caps = sessions.flatMap((s) => s.captures_list || []).slice(0, 12);
  el("glassBody").innerHTML = caps.map((c) =>
    `<tr><td>${esc((c.timestamp || "").slice(0, 16).replace("T", " "))}</td><td>${c.focus_score}</td>
     <td>${c.brightness}</td><td>${c.sharpness}</td><td>${esc(c.note)}</td></tr>`).join("")
    || `<tr><td colspan="5">No captures yet.</td></tr>`;
}

async function loadProfile() {
  const o = await api(`/student/${sid}/overview/`);
  const s = o.student;
  el("profileBox").innerHTML =
    `<table class="grid"><tr><th>Name</th><td>${esc(s.name)}</td></tr>
     <tr><th>Grade</th><td>${esc(s.grade)}-${esc(s.section)} · Roll ${esc(s.roll_no)}</td></tr>
     <tr><th>School</th><td>${esc(s.school)}</td></tr>
     <tr><th>Subjects</th><td>${esc(s.subjects.join(", "))}</td></tr></table>`;
  const { tests } = await api(`/tests/?student_id=${sid}`);
  el("marksBody").innerHTML = tests.map((t) =>
    `<tr><td>${esc(t.date)}</td><td>${esc(t.subject)}</td><td>${esc(t.title)}</td>
     <td><b>${t.obtained}/${t.max_marks}</b> (${Math.round(t.obtained / t.max_marks * 100)}%)</td>
     <td>${esc(t.teacher_note || "—")}</td></tr>`).join("") || `<tr><td colspan="5">No tests yet.</td></tr>`;
}

(async () => {
  try {
    await Promise.all([loadOverview(), loadCalendar(), loadPrevious(), loadDiary(), loadAskHistory(), loadGlass(), loadProfile()]);
  } catch (e) { toast("Cannot reach server — start backend/run-server.bat", true); }
})();
