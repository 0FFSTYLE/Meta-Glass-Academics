/* Landing page: server reachability + resume session shortcut. */
(async () => {
  const box = document.getElementById("apiStat");
  try {
    const h = await api("/health/");
    box.innerHTML = `Server <b class="up">● online</b> · ${esc(h.service)} · ${esc(h.time.slice(0, 16).replace("T", " "))}`;
  } catch {
    box.innerHTML = `Server <b class="down">● offline</b> — start it with <code>run-server.bat</code> in backend/`;
  }
  const u = Session.user;
  if (u) {
    const dot = document.getElementById("avatarDot");
    dot.title = `Signed in as ${u.full_name} — click to continue`;
    dot.style.background = "var(--gold)";
    dot.style.cursor = "pointer";
    dot.onclick = () => location.href = `../${u.role}/index.html`;
  }
})();
