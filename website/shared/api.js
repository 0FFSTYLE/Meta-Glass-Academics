/* Shared API client + session for Meta Glass Academics portals. */
const API_BASE = localStorage.getItem("mg_api_base") || "http://127.0.0.1:8000/api";

async function api(path, { method = "GET", body = null } = {}) {
  const res = await fetch(API_BASE + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : null,
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data.data;
}

const Session = {
  get user() {
    try { return JSON.parse(localStorage.getItem("mg_user") || "null"); } catch { return null; }
  },
  save(user) { localStorage.setItem("mg_user", JSON.stringify(user)); },
  clear() { localStorage.removeItem("mg_user"); },
  /** Redirect to login unless the stored user matches the required role. */
  require(role) {
    const u = this.user;
    if (!u || u.role !== role) {
      location.href = "../../main/login.html?role=" + role;
      throw new Error("redirecting to login");
    }
    return u;
  },
  logout() { this.clear(); location.href = "../../main/index.html"; },
};

function el(id) { return document.getElementById(id); }
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function toast(msg, bad = false) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.toggle("bad", bad);
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2600);
}
