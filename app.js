// SUPABASE CREDENTIALS PLACEHOLDERS
// Sauya wadannan zuwa na ainihi na Supabase account dinka
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

let supabase = null;
if (SUPABASE_URL !== 'YOUR_SUPABASE_PROJECT_URL') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// CONTROL PAGE SWITCHES
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(section => {
        section.style.display = 'none';
    });
    const activeSection = document.getElementById(viewId);
    if (activeSection) {
        activeSection.style.display = 'block';
    }
}

// NAVIGATION EVENT BINDINGS
document.getElementById('nav-home').addEventListener('click', (e) => { e.preventDefault(); switchView('home-view'); });
document.getElementById('nav-login').addEventListener('click', (e) => { e.preventDefault(); switchView('login-view'); });
document.getElementById('nav-register').addEventListener('click', (e) => { e.preventDefault(); switchView('register-view'); });

// SUBMIT REGISTRATION FORMS
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    if (!supabase) {
        alert("Local Run Mode: Account data will not be persisted to Supabase yet.");
        loginAndSetupDashboard(name, email);
        return;
    }

    try {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
        if (error) throw error;
        alert("Registration successful! Logging you in...");
        loginAndSetupDashboard(name, email);
    } catch (error) {
        alert("Registration Error: " + error.message);
    }
});

// SUBMIT LOGIN FORMS (No forced redirection tunnels)
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!supabase) {
        alert("Local Run Mode: Redirecting to clean dashboard workspace.");
        loginAndSetupDashboard("Test Student", email);
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const userFullName = data.user.user_metadata.full_name || "Valued Student";
        loginAndSetupDashboard(userFullName, email);
    } catch (error) {
        alert("Authentication failed: " + error.message);
    }
});

// OPEN DASHBOARD SECURELY AND NATURALLY
function loginAndSetupDashboard(fullName, email) {
    document.getElementById('app-name').value = fullName;
    switchView('dashboard-view');
    console.log(`Session authenticated for dashboard workflow: ${email}`);
}

// SEND LOAN APPLICATIONS TO DATABASE WITHOUT SENSITIVE INFORMATION
document.getElementById('loan-application-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const applicationData = {
        full_name: document.getElementById('app-name').value,
        institution: document.getElementById('app-institution').value,
        student_id: document.getElementById('app-studentid').value,
        course_of_study: document.getElementById('app-course').value,
        state_of_origin: document.getElementById('app-state').value,
        status: 'Under Review',
        submitted_at: new Date().toISOString()
    };

    if (!supabase) {
        document.getElementById('application-status').innerText = 'Under Review';
        alert("Application simulated locally! Setup your configuration keys to write data.");
        return;
    }

    try {
        const { error } = await supabase.from('loan_applications').insert([applicationData]);
        if (error) throw error;
        
        document.getElementById('application-status').innerText = 'Under Review';
        alert("Your interest-free tuition aid loan request has been securely logged.");
    } catch (error) {
        alert("Database Submission Failed: " + error.message);
    }
});

// ACCOUNT DISCONNECT
function handleLogout() {
    if (supabase) {
        supabase.auth.signOut();
    }
    switchView('home-view');
    alert("Logged out safely.");
}