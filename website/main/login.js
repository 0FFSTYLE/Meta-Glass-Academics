/* Role-tabbed sign in / sign up. Query params: ?role=student|parent|teacher &mode=signup */
const params = new URLSearchParams(location.search);
let role = params.get("role") || "student";
let signup = params.get("mode") === "signup";
if (!["student", "parent", "teacher"].includes(role)) role = "student";

const tabs = [...document.querySelectorAll(".tabs button")];
const title = el("formTitle"), sub = el("formSub"), btn = el("submitBtn");
const errBox = el("errBox");

function paint() {
  tabs.forEach((t) => t.classList.toggle("on", t.dataset.role === role));
  el("nameRow").hidden = !signup;
  title.textContent = signup ? "Create account" : "Welcome back";
  sub.textContent = signup ? `Join as a ${role}` : `Sign in to your ${role} portal`;
  btn.textContent = signup ? "Create account →" : "Sign in →";
  el("modeBtn").textContent = signup ? "Have an account? Sign in" : "New here? Create account";
  errBox.hidden = true;
}
tabs.forEach((t) => t.onclick = () => { role = t.dataset.role; paint(); });
el("modeBtn").onclick = () => { signup = !signup; paint(); };
el("forgotBtn").onclick = () => toast("Demo build: passwords reset to pass123 — contact your teacher.");
paint();

el("authForm").onsubmit = async (e) => {
  e.preventDefault();
  errBox.hidden = true;
  const username = el("username").value.trim();
  const password = el("password").value;
  try {
    const data = signup
      ? await api("/auth/register/", { method: "POST",
          body: { username, password, role, full_name: el("fullname").value.trim() || username } })
      : await api("/auth/login/", { method: "POST", body: { username, password, role } });
    Session.save(data.user);
    toast(signup ? "Account created — welcome!" : `Welcome back, ${data.user.full_name.split(" ")[0]}!`);
    setTimeout(() => location.href = `../${role}/index.html`, 500);
  } catch (err) {
    errBox.textContent = err.message + (/offline|fetch|Failed/i.test(err.message)
      ? " — is the Django server running? (backend/run-server.bat)" : "");
    errBox.hidden = false;
  }
};
