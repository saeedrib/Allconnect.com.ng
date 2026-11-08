(() => {
"use strict";

// Browser-safe Supabase project credentials (never put a service-role key here).
const SUPABASE_URL = "https://djnythtnrzppgxprwvyu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_IDe42Bp4DK6lqrkZcaXhpA_vdh2IA-t";

const $ = (id) => document.getElementById(id);
const STATES = ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"];
let supabase = null;
let currentUser = null;
let submitting = false;
let activeDashboardTab = "overview";

function showView(name) {
  document.querySelectorAll(".view").forEach(v => { v.style.display = "none"; });
  const target = $(`${name}-view`);
  if (target) target.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function showMessage(id, text, kind = "error") {
  const el = $(id); if (!el) return;
  el.textContent = text; el.className = `msg show ${kind}`;
}
function clearMessage(id) {
  const el = $(id); if (el) { el.textContent = ""; el.className = "msg"; }
}
function setNavigation() {
  $("nav-login").style.display = currentUser ? "none" : "inline-block";
  $("nav-register").style.display = currentUser ? "none" : "inline-block";
  $("nav-logout").style.display = currentUser ? "inline-block" : "none";
}
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function statusText(value) { return String(value || "pending").replaceAll("_", " "); }

function applyStudentStatusTheme(status) {
  const key = String(status || "pending").toLowerCase().replaceAll(" ", "_");
  const allowed = ["pending","under_review","approved","rejected"];
  const theme = allowed.includes(key) ? key : "pending";
  const statusCard = $("stat-status")?.closest(".stat-card");
  const badge = $("status-badge");
  [statusCard, badge].forEach(el => {
    if (!el) return;
    el.classList.remove("status-pending","status-under-review","status-approved","status-rejected");
    el.classList.add("status-" + theme.replaceAll("_","-"));
  });
  if (badge) badge.textContent = statusText(theme);
  if ($("stat-status")) $("stat-status").textContent = statusText(theme);
}


async function saveProfile(user, fullName) {
  const name = (fullName || user?.user_metadata?.full_name || "").trim();
  if (!user || !name) return;
  // Existing project schema: profiles(id uuid, full_name text).
  const { error } = await supabase.from("profiles").upsert(
    { id: user.id, full_name: name }, { onConflict: "id" }
  );
  if (error) console.warn("Profile save warning:", error.message);
}

async function routeSignedInUser() {
  if (!currentUser) { showView("home"); return; }
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", currentUser.id).maybeSingle();
  if (error) console.warn("Role lookup failed:", error.message);
  const role = data?.role || "student";
  if (role === "admin") {
    $("admin-account-email").textContent = currentUser.email || "";
    showView("admin");
    await loadAdminDashboard();
  } else {
    openStudentDashboard();
  }
}
function openDashboard() { routeSignedInUser(); }
function openStudentDashboard() {
  if (!currentUser) { showView("login"); return; }
  if ($("account-email")) $("account-email").textContent = "";
  $("welcome-heading").textContent = currentUser.user_metadata?.full_name || "Welcome";
  activeDashboardTab = "application";
  showView("dashboard");
  loadApplication();
}
async function loadAdminDashboard() {
  const box = $("admin-applications");
  box.innerHTML = '<div class="empty">Loading applications…</div>';
  const { data, error } = await supabase.from("loan_applications").select("*").order("submitted_at", { ascending: false });
  if (error) {
    box.innerHTML = "";
    showMessage("admin-msg", "Could not load applications: " + error.message);
    return;
  }
  const rows = data || [];
  $("admin-total").textContent = String(rows.length);
  $("admin-pending").textContent = String(rows.filter(x => !x.status || x.status === "pending").length);
  $("admin-reviewed").textContent = String(rows.filter(x => ["under_review","approved","rejected"].includes(x.status)).length);
  if (!rows.length) { box.innerHTML = '<div class="empty">No applications have been submitted yet.</div>'; return; }
  box.innerHTML = '<div class="table-wrap"><table class="admin-table"><thead><tr><th>Student</th><th>Institution / Course</th><th>Matric No.</th><th>State</th><th>Tracking ID</th><th>Status</th><th>Action</th></tr></thead><tbody>' +
    rows.map(row => {
      const p = row.personal_details || {};
      const id = escapeHTML(row.id);
      const status = String(row.status || "pending");
      const options = ["pending","under_review","approved","rejected"].map(s => `<option value="${s}" ${status===s?"selected":""}>${escapeHTML(statusText(s))}</option>`).join("");
      return `<tr><td><strong>${escapeHTML(p.full_name || "—")}</strong><small>${escapeHTML(row.user_id || "")}</small></td><td>${escapeHTML(row.institution_name || "—")}<small>${escapeHTML(row.course_of_study || "—")}</small></td><td>${escapeHTML(row.student_id || "—")}</td><td>${escapeHTML(p.state_of_origin || "—")}</td><td>${escapeHTML(row.tracking_id || "—")}</td><td><select class="admin-status" id="status-${id}">${options}</select></td><td><button class="btn btn-primary admin-save" data-id="${id}" type="button">Save</button></td></tr>`;
    }).join("") + "</tbody></table></div>";
  box.querySelectorAll(".admin-save").forEach(btn => btn.addEventListener("click", () => updateApplicationStatus(btn.dataset.id, btn)));
}

async function bulkUpdateApplications(status) {
  const labels = { approved: "APPROVE ALL", under_review: "MOVE ALL TO UNDER REVIEW", rejected: "REJECT ALL", pending: "RESET ALL TO PENDING" };
  const label = labels[status] || status;
  if (!window.confirm(`Are you sure you want to ${label.toLowerCase()} applications? This changes the status of EVERY application.`)) return;
  const buttons = document.querySelectorAll(".bulk-status-btn");
  buttons.forEach(button => button.disabled = true);
  clearMessage("admin-msg");
  const { error } = await supabase.from("loan_applications")
    .update({ status })
    .neq("id", "00000000-0000-0000-0000-000000000000");
  buttons.forEach(button => button.disabled = false);
  if (error) {
    showMessage("admin-msg", "Bulk status update failed: " + error.message);
    return;
  }
  showMessage("admin-msg", `All applications have been updated to ${statusText(status)}.`, "success");
  await loadAdminDashboard();
}

async function updateApplicationStatus(id, button) {
  const select = $("status-" + id);
  if (!select) return;
  button.disabled = true; button.textContent = "Saving…";
  const { error } = await supabase.from("loan_applications").update({ status: select.value }).eq("id", id);
  button.disabled = false; button.textContent = "Save";
  if (error) { showMessage("admin-msg", "Status update failed: " + error.message); return; }
  showMessage("admin-msg", "Application status updated successfully.", "success");
  await loadAdminDashboard();
}
function setDashboardTab(tab) {
  activeDashboardTab = tab;
  const tabs = { overview: "menu-overview", application: "menu-application", settings: "menu-settings" };
  Object.entries(tabs).forEach(([key, id]) => { const button = $(id); if (button) button.classList.toggle("active", key === tab); });
  const welcome = document.querySelector("#dashboard-view .student-welcome");
  const summary = document.querySelector("#dashboard-view .student-summary-card");
  const message = $("dashboard-msg"), form = $("application-form-panel");
  const details = $("application-status-panel"), settings = $("settings-panel");
  const hasApp = details?.dataset.hasApp === "yes";
  if (welcome) welcome.style.display = tab === "settings" ? "none" : "block";
  if (summary) summary.style.display = tab === "overview" ? "block" : "none";
  if (message) message.style.display = tab === "settings" ? "none" : "block";
  if (form) form.style.display = tab === "application" && !hasApp ? "block" : "none";
  if (details) details.style.display = tab === "application" && hasApp ? "block" : "none";
  if (settings) settings.style.display = tab === "settings" ? "block" : "none";
}

async function loadApplication() {
  clearMessage("dashboard-msg");
  const { data, error } = await supabase
    .from("loan_applications")
    .select("id,tracking_id,status,institution_name,student_id,course_of_study,personal_details,submitted_at")
    .eq("user_id", currentUser.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    showMessage("dashboard-msg", `We could not load your application: ${error.message}`);
    return;
  }
  if (!data) {
    activeDashboardTab = "application";
    $("application-status-panel").dataset.hasApp = "no";
    $("application-status-panel").style.display = "none";
    $("application-form-panel").style.display = "block";
    $("stat-application").textContent = "Not submitted";
    $("stat-status").textContent = "—";
    $("stat-status").closest(".stat-card").classList.remove("status-pending","status-under-review","status-approved","status-rejected");
    $("status-badge").classList.remove("status-pending","status-under-review","status-approved","status-rejected");
    $("application-status-panel").classList.remove("status-pending","status-under-review","status-approved","status-rejected");
    $("stat-tracking").textContent = "—";
    $("tracking-copy").dataset.copy = "";
    $("app-full-name").value = currentUser.user_metadata?.full_name || "";
    setDashboardTab(activeDashboardTab);
    return;
  }

  activeDashboardTab = "overview";
  $("application-status-panel").dataset.hasApp = "yes";
  $("application-form-panel").style.display = "none";
  $("application-status-panel").style.display = "none";
  const personal = data.personal_details || {};
  const status = statusText(data.status);
  $("stat-application").textContent = "Submitted";
  applyStudentStatusTheme(data.status || "pending");
  $("stat-tracking").textContent = data.tracking_id || "—";
  $("tracking-copy").dataset.copy = data.tracking_id || "";
  const rows = [
    ["Tracking ID", data.tracking_id],
    ["Application status", status],
    ["Full name", personal.full_name || currentUser.user_metadata?.full_name],
    ["Institution", data.institution_name],
    ["Student ID / Matric Number", data.student_id],
    ["Course of study", data.course_of_study],
    ["State of origin", personal.state_of_origin],
    ["Submitted on", data.submitted_at ? new Date(data.submitted_at).toLocaleString() : "—"]
  ];
  $("application-details").innerHTML = rows.map(([label, value]) =>
    `<div class="detail"><small>${escapeHTML(label)}</small><strong>${escapeHTML(value || "—")}</strong></div>`
  ).join("");
  setDashboardTab(activeDashboardTab);
}

async function handleRegister(event) {
  event.preventDefault(); clearMessage("register-msg");
  const fullName = $("register-name").value.trim();
  const email = $("register-email").value.trim();
  const password = $("register-password").value;
  if (!fullName || password.length < 8) {
    showMessage("register-msg", "Enter your full name and a password of at least 8 characters."); return;
  }
  const button = event.submitter; button.disabled = true; button.textContent = "Creating account…";
  try {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: fullName } }
    });
    if (error) throw error;
    if (data.user) await saveProfile(data.user, fullName);
    if (data.session) {
      currentUser = data.user; setNavigation(); await routeSignedInUser();
    } else {
      showMessage("register-msg", "Your account has been created. Please check your email and confirm it, then log in. If you do not see the email, check Spam/Junk.", "success");
      $("register-form").reset();
    }
  } catch (err) {
    showMessage("register-msg", err.message || "Registration failed. Please try again.");
  } finally { button.disabled = false; button.textContent = "Create account"; }
}

async function handleLogin(event) {
  event.preventDefault(); clearMessage("login-msg");
  const button = event.submitter; button.disabled = true; button.textContent = "Signing in…";
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: $("login-email").value.trim(), password: $("login-password").value
    });
    if (error) throw error;
    currentUser = data.user; setNavigation(); await saveProfile(currentUser); await routeSignedInUser();
  } catch (err) {
    showMessage("login-msg", err.message || "Login failed. Check your email and password.");
  } finally { button.disabled = false; button.textContent = "Log in securely"; }
}

async function handlePasswordChange(event) {
  event.preventDefault(); clearMessage("password-msg");
  const currentPassword = $("current-password").value, newPassword = $("new-password").value, confirmPassword = $("confirm-password").value;
  if (newPassword.length < 8) return showMessage("password-msg", "New password must contain at least 8 characters.");
  if (newPassword !== confirmPassword) return showMessage("password-msg", "The new passwords do not match.");
  if (!currentUser?.email) return showMessage("password-msg", "Please log in again before changing your password.");
  const button = $("change-password-btn"); button.disabled = true; button.textContent = "Updating…";
  try {
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: currentUser.email, password: currentPassword });
    if (verifyError) throw new Error("Your current password is incorrect.");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    $("password-form").reset(); showMessage("password-msg", "Your password has been changed successfully.", "success");
  } catch (err) { showMessage("password-msg", err.message || "Could not update password. Please try again."); }
  finally { button.disabled = false; button.textContent = "Update password"; }
}

async function handleApplication(event) {
  event.preventDefault();
  if (!currentUser || submitting) return;
  clearMessage("dashboard-msg");
  const deadline = new Date("2026-12-16T00:00:00+01:00");
  if (new Date() >= deadline) {
    showMessage("dashboard-msg", "The application deadline (15 December 2026) has passed. New applications are closed.");
    return;
  }
  const fullName = $("app-full-name").value.trim();
  const institution = $("app-institution").value.trim();
  const studentId = $("app-student-id").value.trim();
  const course = $("app-course").value.trim();
  const state = $("app-state").value;
  if (![fullName, institution, studentId, course, state].every(Boolean)) {
    showMessage("dashboard-msg", "Please complete all five application fields."); return;
  }

  submitting = true;
  const button = $("submit-application"); button.disabled = true; button.textContent = "Submitting…";
  try {
    const { data: existing, error: checkError } = await supabase
      .from("loan_applications").select("id").eq("user_id", currentUser.id).limit(1);
    if (checkError) throw checkError;
    if (existing?.length) {
      await loadApplication();
      showMessage("dashboard-msg", "An application already exists for this account. Its details are shown above.", "success");
      return;
    }

    // Uses the existing table columns and RLS policy: user_id must equal auth.uid().
    // No BVN, bank account, bank name, guardian, or payment information is collected.
    const payload = {
      user_id: currentUser.id,
      loan_type: "institutional",
      institution_name: institution,
      student_id: studentId,
      course_of_study: course,
      personal_details: { full_name: fullName, state_of_origin: state },
      education_details: {
        institution_name: institution,
        student_id: studentId,
        course_of_study: course
      },
      submitted_at: new Date().toISOString()
    };
    const { error } = await supabase.from("loan_applications").insert(payload);
    if (error) throw error;
    await saveProfile(currentUser, fullName);
    await loadApplication();
    showMessage("dashboard-msg", "Application submitted successfully. Please keep your tracking ID.", "success");
  } catch (err) {
    showMessage("dashboard-msg", `We could not submit your application: ${err.message || "Please try again."}`);
  } finally {
    submitting = false; button.disabled = false; button.textContent = "Submit application";
  }
}

async function logout() {
  await supabase.auth.signOut();
  currentUser = null; setNavigation(); showView("home");
}

function init() {
  $("year").textContent = new Date().getFullYear();
  $("app-state").insertAdjacentHTML("beforeend", STATES.map(s => `<option value="${s}">${s}</option>`).join(""));

  $("nav-login").addEventListener("click", () => showView("login"));
  $("nav-register").addEventListener("click", () => showView("register"));
  $("hero-login").addEventListener("click", () => showView("login"));
  $("hero-register").addEventListener("click", () => showView("register"));
  $("to-register").addEventListener("click", e => { e.preventDefault(); showView("register"); });
  $("to-login").addEventListener("click", e => { e.preventDefault(); showView("login"); });
  $("brand-home").addEventListener("click", e => { e.preventDefault(); currentUser ? openDashboard() : showView("home"); });
  $("nav-logout").addEventListener("click", logout);
  if ($("dash-logout")) $("dash-logout").addEventListener("click", logout);
  $("admin-logout").addEventListener("click", logout);
  $("admin-refresh").addEventListener("click", loadAdminDashboard);
  document.querySelectorAll(".bulk-status-btn").forEach(button => {
    button.addEventListener("click", () => bulkUpdateApplications(button.dataset.status));
  });
  $("menu-overview").addEventListener("click", () => setDashboardTab("overview"));
  $("menu-application").addEventListener("click", () => setDashboardTab("application"));
  $("menu-settings").addEventListener("click", () => setDashboardTab("settings"));
  if ($("student-brand-home")) $("student-brand-home").addEventListener("click", e => { e.preventDefault(); setDashboardTab("overview"); });
  $("tracking-copy").addEventListener("click", async () => {
    const value = $("stat-tracking").textContent.trim();
    if (!value || value === "—" || value === "Not available yet") return;
    try { await navigator.clipboard.writeText(value); $("tracking-copy").textContent = "Copied"; setTimeout(() => $("tracking-copy").textContent = "Copy", 1500); }
    catch { showMessage("dashboard-msg", "Could not copy automatically. Please select the tracking ID and copy it."); }
  });
  $("login-form").addEventListener("submit", handleLogin);
  $("register-form").addEventListener("submit", handleRegister);
  $("application-form").addEventListener("submit", handleApplication);
  $("password-form").addEventListener("submit", handlePasswordChange);

  if (!window.supabase?.createClient) {
    showMessage("login-msg", "Supabase could not load. Check your internet connection and refresh the page."); return;
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  supabase.auth.getSession().then(async ({ data, error }) => {
    if (error) console.warn(error.message);
    currentUser = data.session?.user || null;
    setNavigation();
    if (currentUser) await routeSignedInUser(); else showView("home");
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    setNavigation();
  });
}

document.addEventListener("DOMContentLoaded", init);
})();