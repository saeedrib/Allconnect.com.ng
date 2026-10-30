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

async function saveProfile(user, fullName) {
  const name = (fullName || user?.user_metadata?.full_name || "").trim();
  if (!user || !name) return;
  // Existing project schema: profiles(id uuid, full_name text).
  const { error } = await supabase.from("profiles").upsert(
    { id: user.id, full_name: name }, { onConflict: "id" }
  );
  if (error) console.warn("Profile save warning:", error.message);
}

function openDashboard() {
  if (!currentUser) { showView("login"); return; }
  $("account-email").textContent = currentUser.email || "";
  $("welcome-heading").textContent = `Welcome${currentUser.user_metadata?.full_name ? ", " + currentUser.user_metadata.full_name : ""}`;
  showView("dashboard");
  loadApplication();
}
function setDashboardTab(tab) {
  $("menu-overview").classList.toggle("active", tab === "overview");
  $("menu-application").classList.toggle("active", tab === "application");
  $("menu-privacy").classList.toggle("active", tab === "privacy");
  if (tab === "privacy") {
    $("privacy-panel").style.display = "block";
    $("application-form-panel").style.display = "none";
    if ($("application-status-panel").dataset.hasApp === "yes") $("application-status-panel").style.display = "block";
    else $("application-status-panel").style.display = "none";
  } else {
    $("privacy-panel").style.display = "none";
    if (tab === "application" && $("application-status-panel").dataset.hasApp === "yes") {
      $("application-status-panel").style.display = "block";
      $("application-form-panel").style.display = "none";
    } else if ($("application-status-panel").dataset.hasApp === "yes") {
      $("application-status-panel").style.display = "block";
      $("application-form-panel").style.display = "none";
    } else {
      $("application-status-panel").style.display = "none";
      $("application-form-panel").style.display = "block";
    }
  }
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
    $("application-status-panel").dataset.hasApp = "no";
    $("application-status-panel").style.display = "none";
    $("application-form-panel").style.display = "block";
    $("stat-application").textContent = "Not submitted";
    $("stat-status").textContent = "—";
    $("stat-tracking").textContent = "—";
    $("app-full-name").value = currentUser.user_metadata?.full_name || "";
    return;
  }

  $("application-status-panel").dataset.hasApp = "yes";
  $("application-form-panel").style.display = "none";
  $("application-status-panel").style.display = "block";
  const personal = data.personal_details || {};
  const status = statusText(data.status);
  $("stat-application").textContent = "Submitted";
  $("stat-status").textContent = status;
  $("stat-tracking").textContent = data.tracking_id || "—";
  $("status-badge").textContent = status;
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
      currentUser = data.user; setNavigation(); openDashboard();
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
    currentUser = data.user; setNavigation(); await saveProfile(currentUser); openDashboard();
  } catch (err) {
    showMessage("login-msg", err.message || "Login failed. Check your email and password.");
  } finally { button.disabled = false; button.textContent = "Log in securely"; }
}

async function handleApplication(event) {
  event.preventDefault();
  if (!currentUser || submitting) return;
  clearMessage("dashboard-msg");
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
  $("dash-logout").addEventListener("click", logout);
  $("menu-overview").addEventListener("click", () => setDashboardTab("overview"));
  $("menu-application").addEventListener("click", () => setDashboardTab("application"));
  $("menu-privacy").addEventListener("click", () => setDashboardTab("privacy"));
  $("login-form").addEventListener("submit", handleLogin);
  $("register-form").addEventListener("submit", handleRegister);
  $("application-form").addEventListener("submit", handleApplication);

  if (!window.supabase?.createClient) {
    showMessage("login-msg", "Supabase could not load. Check your internet connection and refresh the page."); return;
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) console.warn(error.message);
    currentUser = data.session?.user || null;
    setNavigation();
    if (currentUser) openDashboard(); else showView("home");
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    setNavigation();
  });
}

document.addEventListener("DOMContentLoaded", init);
})();