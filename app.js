// Student Loan Found frontend. Public publishable/anon key is intended for browser use; never add a service-role key here.
const SUPABASE_URL = "https://djnythtnrzppgxprwvyu.supabase.co";
const SUPABASE_KEY = "sb_publishable_IDe42Bp4DK6lqrkZcaXhpA_vdh2IA-t";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let currentUser = null, currentProfile = null, currentRole = "student", currentApps = [];
const $ = (id) => document.getElementById(id);
function toast(msg, error=false){const t=$("toast");t.textContent=msg;t.className="toast show"+(error?" error":"");clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.className="toast",5000)}
function showPage(id){document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));$(id)?.classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"});document.querySelector(".nav-actions").classList.toggle("hidden",id==="dashboard"||id==="adGate");document.querySelector("#topnav").classList.toggle("hidden",id==="dashboard"||id==="adGate");}
function fillForm(form, data){Object.entries(data||{}).forEach(([k,v])=>{const el=form.elements.namedItem(k);if(el&&v!==null&&v!==undefined)el.value=v})}
function initials(s){return (s||"S").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()}
function statusLabel(s){return ({pending:"Pending",under_review:"Under review",approved:"Approved",declined:"Declined",needs_information:"Needs information"})[s]||s}
function appCard(a,admin=false){return `<article class="app-card"><div><h3>${esc(a.institution_name||"Student loan application")}</h3><p>Tracking ID: <b>${esc(a.tracking_id||"—")}</b> · ${esc(a.course_of_study||"Course not entered")}</p><small>Submitted ${a.submitted_at?new Date(a.submitted_at).toLocaleDateString():"recently"}</small>${admin?`<small>Student account: ${esc(a.user_id)}</small>`:""}</div><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span class="status ${esc(a.status)}">${statusLabel(a.status)}</span>${admin?`<select aria-label="Update status" onchange="adminUpdateStatus('${a.id}',this.value)"><option value="">Update status</option><option value="pending">Pending</option><option value="under_review">Under review</option><option value="approved">Approved</option><option value="declined">Declined</option><option value="needs_information">Needs information</option></select>`:""}</div></article>`}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function loadDashboard(){
  const {data:{user},error}=await supabaseClient.auth.getUser();if(error||!user){showPage("login");return}
  currentUser=user;
  const [{data:profile},{data:role},{data:apps,error:appsErr}]=await Promise.all([
    supabaseClient.from("profiles").select("*").eq("id",user.id).maybeSingle(),
    supabaseClient.from("user_roles").select("role").eq("user_id",user.id).maybeSingle(),
    supabaseClient.from("loan_applications").select("*").order("submitted_at",{ascending:false})
  ]);
  currentProfile=profile||{id:user.id,full_name:user.user_metadata?.full_name||"",phone:""};
  currentRole=role?.role||"student";currentApps=apps||[];
  const name=currentProfile.full_name||user.email||"Student";
  ["sideName","topName"].forEach(id=>$(id).textContent=name);["sideAvatar","topAvatar"].forEach(id=>$(id).textContent=initials(name));$("welcomeName").textContent="Welcome, "+name.split(" ")[0];$("dashDate").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"});
  $("statTotal").textContent=currentApps.length;$("statReview").textContent=currentApps.filter(a=>a.status==="under_review"||a.status==="pending").length;$("statApproved").textContent=currentApps.filter(a=>a.status==="approved").length;
  const newAppBtn=document.querySelector('#tab-loans .page-intro .btn');
  const applicationPanel=$("applicationPanel");
  if(currentApps.length){if(newAppBtn){newAppBtn.disabled=true;newAppBtn.textContent="Application already submitted";}applicationPanel.classList.add("hidden");}
  else if(newAppBtn){newAppBtn.disabled=false;newAppBtn.textContent="+ New application";}
  $("recentApps").innerHTML=currentApps.length?currentApps.slice(0,3).map(a=>appCard(a)).join(""):`<div class="empty-state"><div class="empty-icon">▤</div><b>No applications yet</b><p>When you submit a loan application, it will appear here.</p><button class="btn btn-green" onclick="openTab('loans')">Start an application</button></div>`;
  $("allApps").innerHTML=currentApps.length?currentApps.map(a=>appCard(a)).join(""):`<div class="panel empty-state"><div class="empty-icon">▤</div><b>No applications yet</b><p>Start a new application when you're ready.</p></div>`;
  fillForm($("profileForm"),{full_name:currentProfile.full_name,phone:currentProfile.phone,date_of_birth:currentProfile.date_of_birth,gender:currentProfile.gender,address:currentProfile.address});
  fillForm($("applicationForm"),{full_name:currentProfile.full_name,phone:currentProfile.phone,date_of_birth:currentProfile.date_of_birth,gender:currentProfile.gender,address:currentProfile.address});
  if(currentRole==="admin"){document.querySelector('[data-tab="admin"]')?.remove();const b=document.createElement("button");b.className="side-link";b.dataset.tab="admin";b.innerHTML='▣ <span>Admin</span>';b.onclick=()=>openTab("admin");document.querySelector(".sidebar .side-label").after(b);$("adminApps").innerHTML=currentApps.length?currentApps.map(a=>appCard(a,true)).join(""):`<div class="panel">No applications submitted yet.</div>`}
  if(sessionStorage.getItem("slf_ad_opened")!=="yes"){showPage("adGate");return;}
  showPage("dashboard");openTab("overview");
  if(appsErr)toast("Could not load applications: "+appsErr.message,true);
}
function openTab(tab){document.querySelectorAll(".tab-content").forEach(e=>e.classList.add("hidden"));$("tab-"+tab)?.classList.remove("hidden");$("adminArea").classList.toggle("hidden",tab!=="admin");document.querySelectorAll(".side-link[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));$("dashTitle").textContent=({overview:"Dashboard",loans:"Loans",profile:"Profile",settings:"Settings",admin:"Admin dashboard"})[tab]||"Dashboard";if(tab==="loans")$("allApps").innerHTML=currentApps.length?currentApps.map(a=>appCard(a)).join(""):`<div class="panel empty-state"><div class="empty-icon">▤</div><b>No applications yet</b><p>Start a new application when you're ready.</p></div>`}
document.querySelectorAll(".side-link[data-tab]").forEach(b=>b.addEventListener("click",()=>openTab(b.dataset.tab)));

const NIGERIAN_STATES=["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT Abuja","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"];
const stateSelect=document.getElementById("stateSelect");if(stateSelect)NIGERIAN_STATES.forEach(state=>{const option=document.createElement("option");option.value=state;option.textContent=state;stateSelect.appendChild(option)});
$("signupForm").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.target),name=f.get("full_name").trim(),email=f.get("email").trim(),password=f.get("password"),confirm=f.get("confirm");if(password!==confirm)return toast("Passwords do not match.",true);if(password.length<8)return toast("Use at least 8 characters for your password.",true);const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{full_name:name,phone:f.get("phone")||""}}});if(error)return toast(error.message,true);if(data.session){toast("Account created successfully.");await loadDashboard()}else{toast("Account created. Check your email for the verification link, then log in.");showPage("login")}});
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.target);const {error}=await supabaseClient.auth.signInWithPassword({email:f.get("email").trim(),password:f.get("password")});if(error)return toast(error.message,true);await loadDashboard()});
$("showLoginPass").addEventListener("change",e=>{$("loginForm").elements.password.type=e.target.checked?"text":"password"});
$("profileForm").addEventListener("submit",async e=>{e.preventDefault();if(!currentUser)return;const f=new FormData(e.target);const payload={full_name:f.get("full_name").trim(),phone:f.get("phone")||null,date_of_birth:f.get("date_of_birth")||null,gender:f.get("gender")?.toLowerCase()||null,address:f.get("address")||null,updated_at:new Date().toISOString()};const {error}=await supabaseClient.from("profiles").update(payload).eq("id",currentUser.id);if(error)return toast(error.message,true);currentProfile={...currentProfile,...payload};toast("Profile saved.");await loadDashboard()});
$("applicationForm").addEventListener("submit",async e=>{e.preventDefault();if(!currentUser)return toast("Please log in again.",true);const f=new FormData(e.target);const get=k=>f.get(k)?.toString().trim()||null;
const accountNumber=get("account_number");if(!accountNumber||!/^[0-9]{10}$/.test(accountNumber))return toast("Bank account number must contain exactly 10 digits.",true);if(!get("account_name")||!get("bank_name"))return toast("Please complete all bank account details.",true);
const {data:existing,error:existingError}=await supabaseClient.from("loan_applications").select("id").eq("user_id",currentUser.id).limit(1);
if(existingError)return toast("Could not verify existing application: "+existingError.message,true);
if(existing?.length){toast("You have already submitted an application. Please check your Loans page.",true);await loadDashboard();openTab("loans");return;}
let docPaths=[];const file=f.get("document");if(file&&file.size){toast("Document upload is not enabled yet. Submit the form without the file for now.",true);return}
const personal={full_name:get("full_name"),date_of_birth:get("date_of_birth"),gender:get("gender"),phone:get("phone"),contact_email:get("contact_email"),nationality:get("nationality"),state:get("state"),lga:get("lga"),ward:get("ward"),address:get("address")};const education={institution_name:get("institution_name"),student_id:get("student_id"),course_of_study:get("course_of_study"),study_level:get("study_level"),year_of_study:get("year_of_study")};const parent={guardian_name:get("guardian_name"),guardian_relationship:get("guardian_relationship"),guardian_phone:get("guardian_phone"),guardian_address:get("guardian_address")};const payment={account_name:get("account_name"),account_number:get("account_number"),bank_name:get("bank_name")};
const payload={user_id:currentUser.id,loan_type:"institutional",academic_session:get("academic_session"),institution_name:get("institution_name"),student_id:get("student_id"),course_of_study:get("course_of_study"),study_level:get("study_level"),year_of_study:get("year_of_study"),personal_details:personal,education_details:education,parent_details:parent,payment_details:payment,document_paths:docPaths};
const {data,error}=await supabaseClient.from("loan_applications").insert(payload).select().single();if(error)return toast(error.message,true);toast("Application submitted. Tracking ID: "+data.tracking_id);$("applicationPanel").classList.add("hidden");await loadDashboard();openTab("loans")});
async function forgotPassword(){const email= currentUser?.email || $("loginForm").elements.email.value.trim();if(!email)return toast("Enter your email address first.",true);const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+window.location.pathname});if(error)return toast(error.message,true);toast("If the account exists, a password reset link has been sent to "+email)}
async function logout(){await supabaseClient.auth.signOut();sessionStorage.removeItem("slf_ad_opened");currentUser=null;currentProfile=null;currentApps=[];showPage("home");toast("You have been logged out.")}
async function adminUpdateStatus(id,status){if(!status)return;const {error}=await supabaseClient.from("loan_applications").update({status,updated_at:new Date().toISOString()}).eq("id",id);if(error){toast("Status update failed. Admin database permission may need configuration: "+error.message,true);return}toast("Application status updated.");await loadDashboard();openTab("admin")}

$("openAdLink").addEventListener("click",()=>{sessionStorage.setItem("slf_ad_opened","yes");$("continueDashboard").disabled=false;});
$("continueDashboard").addEventListener("click",()=>{if(sessionStorage.getItem("slf_ad_opened")!=="yes")return toast("Please open the ad before continuing.",true);loadDashboard();});
$("year").textContent=new Date().getFullYear();
supabaseClient.auth.getSession().then(({data:{session}})=>{if(session)loadDashboard()});
supabaseClient.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_IN"&&session&&!currentUser)loadDashboard()});
