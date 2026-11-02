/* Parent portal: child overview, full record, teacher consult, settings. */
const user = Session.require("parent");
const pid = user.ref_id;
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

let kids = [], chart = null;
const cur = () => el("childSel").value;

async function init() {
  const o = await api(`/parent/${pid}/overview/`);
  el("hello").textContent = `Hello, ${o.parent.name.split(" ")[0]}`;
  kids = o.children;
  el("childSel").innerHTML = kids.map((k) => `<option value="${k.student.id}">${esc(k.student.name)} · Grade ${esc(k.student.grade)}</option>`).join("");
  el("cSel2").innerHTML = el("childSel").innerHTML;
  el("profileBox").innerHTML =
    `<table class="grid"><tr><th>Name</th><td>${esc(o.parent.name)}</td></tr>
     <tr><th>Phone</th><td>${esc(o.parent.phone || "—")}</td></tr>
     <tr><th>Children</th><td>${kids.map((k) => esc(k.student.name)).join(", ")}</td></tr></table>`;
  // teacher list = known teachers (demo: fixed two ids via overview fallback)
  el("tSel").innerHTML = `<option value="t_001">Kavita Rao · Mathematics</option><option value="t_002">Arjun Nair · Physics</option>`;
  await refreshChild();
  loadConsults();
}
el("childSel").onchange = refreshChild;

async function refreshChild() {
  const k = kids.find((x) => x.student.id === cur());
  if (!k) return;
  el("cProg").textContent = k.test_avg_pct + "%";
  el("cProgD").textContent = `${k.student.name} · Grade ${k.student.grade}`;
  const last = k.latest_tests[k.latest_tests.length - 1];
  el("cMarks").textContent = last ? `${last.obtained}/${last.max_marks}` : "—";
  el("cMarksD").textContent = last ? `${last.subject} · ${last.title}` : "no tests yet";
  const n0 = k.teacher_notes[0];
  el("cNote").textContent = n0 ? (n0.text.length > 90 ? n0.text.slice(0, 90) + "…" : n0.text) : "—";
  el("cNoteD").textContent = n0 ? n0.date : "";
  el("notesBox").innerHTML = k.teacher_notes.map((n) =>
    `<div class="note">${esc(n.text)}<div class="who">${esc(n.date)} · ${esc(n.tag)}</div></div>`).join("") || "<p>No notes yet.</p>";

  const g = await api(`/graph/compare/?student_id=${cur()}&days=7`);
  if (chart) chart.destroy();
  chart = new Chart(el("compareChart"), {
    data: { labels: g.labels, datasets: [
      { type: "bar", label: "Study minutes", data: g.minutes, backgroundColor: "#2e7d4f" },
      { type: "line", label: "Focus score", data: g.focus, borderColor: "#b3541e", tension: .3 },
    ]},
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } },
  });

  const r = await api(`/parent/${pid}/records/?child_id=${cur()}`);
  el("sessBody").innerHTML = r.sessions.map((s) =>
    `<tr><td>${esc(s.date)}</td><td>${esc(s.subject)}</td><td>${s.duration_min}</td>
     <td><span class="pill ${s.focus_score >= 80 ? "good" : "warn"}">${s.focus_score}</span></td>
     <td>${esc((s.topics || []).join(", "))}</td></tr>`).join("") || `<tr><td colspan="5">No sessions.</td></tr>`;
  el("testBody").innerHTML = r.tests.map((t) =>
    `<tr><td>${esc(t.date)}</td><td>${esc(t.subject)}</td><td>${esc(t.title)}</td>
     <td><b>${t.obtained}/${t.max_marks}</b></td><td>${esc(t.teacher_note || "—")}</td></tr>`).join("")
    || `<tr><td colspan="5">No tests.</td></tr>`;
}

async function loadConsults() {
  const { consults } = await api(`/consults/?parent_id=${pid}`);
  el("consultBox").innerHTML = consults.map((c) =>
    `<div class="note"><span class="pill ${c.status === "answered" ? "good" : "warn"}">${esc(c.status)}</span>
     <b> You → teacher:</b> ${esc(c.message)}
     ${c.reply ? `<br><b>Teacher:</b> ${esc(c.reply)}` : "<br><i>Awaiting reply…</i>"}
     <div class="who">${esc(c.date)}</div></div>`).join("") || "<p>No consults yet.</p>";
}
el("cSend").onclick = async () => {
  if (!el("cMsg").value.trim()) return toast("Write a message first", true);
  await api("/consults/", { method: "POST", body: { parent_id: pid,
    teacher_id: el("tSel").value, student_id: el("cSel2").value || cur(),
    message: el("cMsg").value.trim() } });
  el("cMsg").value = "";
  toast("Request sent to teacher");
  loadConsults();
};

el("apiBase").value = API_BASE;
el("apiSave").onclick = () => {
  localStorage.setItem("mg_api_base", el("apiBase").value.trim());
  toast("Saved — reload the page to use the new server");
};

init().catch(() => toast("Cannot reach server — start backend/run-server.bat", true));
