/* Teacher portal: students, marks, progress, calendar, announcements, parent consults. */
const user = Session.require("teacher");
const tid = user.ref_id;
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

let students = [], chart = null;
const sname = (id) => (students.find((s) => s.id === id) || {}).name || id;

async function init() {
  const o = await api(`/teacher/${tid}/overview/`);
  el("hello").textContent = `Hello, ${o.teacher.name.split(" ")[0]}`;
  students = o.students;
  el("cStu").textContent = o.student_count;
  el("cAvg").textContent = o.class_avg_pct + "%";
  el("cProg").textContent = o.announcements.length;
  el("cProgD").textContent = "announcements live";
  el("cConn").textContent = o.pending_consults.length;
  el("profileBox").innerHTML =
    `<table class="grid"><tr><th>Name</th><td>${esc(o.teacher.name)}</td></tr>
     <tr><th>Subject</th><td>${esc(o.teacher.subject)}</td></tr>
     <tr><th>Classes</th><td>${esc((o.teacher.classes || []).join(", ") || "—")}</td></tr></table>`;
  const opts = students.map((s) => `<option value="${s.id}">${esc(s.name)} · ${esc(s.grade)}</option>`).join("");
  el("nStu").innerHTML = opts; el("tStu").innerHTML = opts; el("pStu").innerHTML = opts;
  el("tDate").value = new Date().toISOString().slice(0, 10);
  await Promise.all([loadStudents(), loadMarks(), loadCal(), loadAnn(), loadConsults(), loadProgress()]);
}
el("pStu").onchange = loadProgress;

async function loadStudents() {
  const { tests } = await api("/tests/");
  el("stuBody").innerHTML = students.map((s) => {
    const mine = tests.filter((t) => t.student_id === s.id);
    const avg = mine.length ? Math.round(mine.reduce((a, t) => a + t.obtained / t.max_marks * 100, 0) / mine.length) + "%" : "—";
    return `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.grade)}-${esc(s.section)}</td><td>${esc(s.roll_no)}</td>
      <td>${esc(s.subjects.join(", "))}</td><td>${avg}</td>
      <td><button class="btn small ghost" data-s="${s.id}" data-act="view">View</button></td></tr>`;
  }).join("");
  el("stuBody").querySelectorAll("button").forEach((b) => b.onclick = () => {
    el("pStu").value = b.dataset.s;
    document.querySelector('[data-view="progress"]').click();
    loadProgress();
  });
}
el("nSave").onclick = async () => {
  if (!el("nText").value.trim()) return toast("Write the note first", true);
  await api("/notes/", { method: "POST", body: { student_id: el("nStu").value,
    teacher_id: tid, text: el("nText").value.trim(), tag: el("nTag").value } });
  el("nText").value = "";
  toast("Note published to student & parent");
};

async function loadMarks() {
  const { tests } = await api("/tests/");
  el("marksBody").innerHTML = tests.map((t) =>
    `<tr><td>${esc(t.date)}</td><td>${esc(sname(t.student_id))}</td><td>${esc(t.subject)}</td>
     <td>${esc(t.title)}</td><td><b>${t.obtained}/${t.max_marks}</b></td></tr>`).join("")
    || `<tr><td colspan="5">No marks yet.</td></tr>`;
}
el("tSave").onclick = async () => {
  await api("/tests/", { method: "POST", body: { student_id: el("tStu").value,
    subject: el("tSub").value.trim() || "General", title: el("tTitle").value.trim() || "Test",
    max_marks: +el("tMax").value || 100, obtained: +el("tObt").value || 0,
    date: el("tDate").value, teacher_note: el("tNote").value.trim() } });
  toast("Marks saved");
  loadMarks(); loadStudents();
};

async function loadProgress() {
  const g = await api(`/graph/compare/?student_id=${el("pStu").value}&days=7`);
  if (chart) chart.destroy();
  chart = new Chart(el("compareChart"), {
    data: { labels: g.labels, datasets: [
      { type: "bar", label: "Study minutes", data: g.minutes, backgroundColor: "#b3541e" },
      { type: "line", label: "Focus score", data: g.focus, borderColor: "#1f6feb", tension: .3 },
    ]},
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } },
  });
}

async function loadCal() {
  const { events } = await api(`/calendar/?owner_role=teacher&owner_id=${tid}`);
  el("calBody").innerHTML = events.map((e) =>
    `<tr><td>${esc(e.date)}</td><td>${esc(e.time || "—")}</td><td>${esc(e.title)}</td><td><span class="pill info">${esc(e.kind)}</span></td></tr>`).join("")
    || `<tr><td colspan="4">No events yet.</td></tr>`;
}
el("evAdd").onclick = async () => {
  if (!el("evTitle").value.trim() || !el("evDate").value) return toast("Title and date required", true);
  await api("/calendar/", { method: "POST", body: { owner_role: "teacher", owner_id: tid,
    title: el("evTitle").value.trim(), date: el("evDate").value, time: el("evTime").value, kind: el("evKind").value } });
  el("evTitle").value = "";
  toast("Event added");
  loadCal();
};

async function loadAnn() {
  const { announcements } = await api("/announcements/");
  el("annBox").innerHTML = announcements.map((a) =>
    `<div class="note"><b>${esc(a.title)}</b> <span class="pill">${esc(a.audience)}</span><br>${esc(a.body)}
     <div class="who">${esc(a.date)}</div></div>`).join("") || "<p>None yet.</p>";
}
el("aSave").onclick = async () => {
  if (!el("aTitle").value.trim()) return toast("Title required", true);
  await api("/announcements/", { method: "POST", body: { teacher_id: tid,
    title: el("aTitle").value.trim(), body: el("aBody").value.trim(), audience: el("aAud").value.trim() || "all" } });
  el("aTitle").value = el("aBody").value = el("aAud").value = "";
  toast("Announcement published");
  loadAnn();
};

async function loadConsults() {
  const { consults } = await api(`/consults/?teacher_id=${tid}`);
  el("consultBox").innerHTML = consults.map((c) =>
    `<div class="note"><span class="pill ${c.status === "answered" ? "good" : "warn"}">${esc(c.status)}</span>
     <b> Parent (${esc(sname(c.student_id))}):</b> ${esc(c.message)}
     ${c.reply ? `<br><b>Your reply:</b> ${esc(c.reply)}`
       : `<div class="replyrow"><input id="rp-${c.id}" placeholder="Type your reply…">
          <button class="btn small" data-rp="${c.id}">Reply</button></div>`}
     <div class="who">${esc(c.date)}</div></div>`).join("") || "<p>No consults.</p>";
  el("consultBox").querySelectorAll("[data-rp]").forEach((b) => b.onclick = async () => {
    const v = el("rp-" + b.dataset.rp).value.trim();
    if (!v) return toast("Write a reply first", true);
    await api(`/consults/${b.dataset.rp}/reply/`, { method: "POST", body: { reply: v } });
    toast("Reply sent");
    loadConsults();
  });
}

init().catch(() => toast("Cannot reach server — start backend/run-server.bat", true));
