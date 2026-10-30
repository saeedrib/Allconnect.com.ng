(() => {
"use strict";
const SUPABASE_URL = "https://djnythtnrzppgxprwvyu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_IDe42Bp4DK6lqrkZcaXhpA_vdh2IA-t";
const $ = id => document.getElementById(id);
const states = ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"];
let db, user = null, busy = false;
function view(name){document.querySelectorAll(".view").forEach(x=>x.style.display="none");$(name+"-view").style.display="block";window.scrollTo(0,0);}
function message(id,text,type="error"){const el=$(id);el.textContent=text;el.className="msg show "+type;}
function clear(id){const el=$(id);el.textContent="";el.className="msg";}
function nav(){ $("nav-login").style.display=user?"none":"inline-block";$("nav-register").style.display=user?"none":"inline-block";$("nav-logout").style.display=user?"inline-block":"none";}
function escapeHTML(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function profile(u,name){if(!u||!name)return;const {error}=await db.from("profiles").upsert({id:u.id,full_name:name},{onConflict:"id"});if(error)console.warn("Profile update:",error.message);}
async function dashboard(){if(!user){view("login");return;}view("dashboard");$("user-email").textContent=user.email||"";$("welcome").textContent="Welcome"+(user.user_metadata?.full_name?", "+user.user_metadata.full_name:"");await loadApplication();}
async function loadApplication(){
clear("dash-msg");
const {data,error}=await db.from("loan_applications").select("tracking_id,status,institution_name,student_id,course_of_study,personal_details,submitted_at").eq("user_id",user.id).order("submitted_at",{ascending:false}).limit(1).maybeSingle();
if(error){message("dash-msg","Could not load application: "+error.message);return;}
if(!data){$("application-panel").style.display="block";$("status-panel").style.display="none";$("full-name").value=user.user_metadata?.full_name||"";return;}
$("application-panel").style.display="none";$("status-panel").style.display="block";
const p=data.personal_details||{}, rows=[["Tracking ID",data.tracking_id],["Status",String(data.status||"pending").replaceAll("_"," ")],["Full name",p.full_name],["Institution",data.institution_name],["Student ID / Matric Number",data.student_id],["Course of study",data.course_of_study],["State of origin",p.state_of_origin],["Submitted",data.submitted_at?new Date(data.submitted_at).toLocaleString():"—"]];
$("application-details").innerHTML=rows.map(([k,v])=>`<div class="detail"><small>${escapeHTML(k)}</small><strong>${k==="Status"?`<span class="pill">${escapeHTML(v)}</span>`:escapeHTML(v||"—")}</strong></div>`).join("");
}
async function register(e){e.preventDefault();clear("register-msg");const name=$("reg-name").value.trim(),email=$("reg-email").value.trim(),password=$("reg-password").value;if(!name||password.length<8){message("register-msg","Enter your name and a password of at least 8 characters.");return;}const b=e.submitter;b.disabled=true;b.textContent="Creating account…";try{const {data,error}=await db.auth.signUp({email,password,options:{data:{full_name:name}}});if(error)throw error;if(data.user)await profile(data.user,name);if(data.session){user=data.user;nav();dashboard();}else{message("register-msg","Account created. Check your email for the confirmation link, then log in.","success");$("register-form").reset();}}catch(err){message("register-msg",err.message||"Registration failed.");}finally{b.disabled=false;b.textContent="Create account";}}
async function login(e){e.preventDefault();clear("login-msg");const b=e.submitter;b.disabled=true;b.textContent="Logging in…";try{const {data,error}=await db.auth.signInWithPassword({email:$("login-email").value.trim(),password:$("login-password").value});if(error)throw error;user=data.user;nav();await dashboard();}catch(err){message("login-msg",err.message||"Login failed.");}finally{b.disabled=false;b.textContent="Log in";}}
async function apply(e){e.preventDefault();if(!user||busy)return;clear("dash-msg");const full=$("full-name").value.trim(),institution=$("institution").value.trim(),student=$("student-id").value.trim(),course=$("course").value.trim(),state=$("state").value;if(![full,institution,student,course,state].every(Boolean)){message("dash-msg","Please complete all five fields.");return;}busy=true;const b=$("submit-btn");b.disabled=true;b.textContent="Submitting…";try{const {data:old,error:check}=await db.from("loan_applications").select("id").eq("user_id",user.id).limit(1);if(check)throw check;if(old?.length){await loadApplication();message("dash-msg","An application already exists for this account.","success");return;}const payload={user_id:user.id,loan_type:"institutional",institution_name:institution,student_id:student,course_of_study:course,personal_details:{full_name:full,state_of_origin:state},education_details:{institution_name:institution,student_id:student,course_of_study:course},submitted_at:new Date().toISOString()};const {error}=await db.from("loan_applications").insert(payload);if(error)throw error;await profile(user,full);await loadApplication();message("dash-msg","Application submitted successfully. Keep your tracking ID.","success");}catch(err){message("dash-msg","Submission failed: "+(err.message||"Please try again."));}finally{busy=false;b.disabled=false;b.textContent="Submit application";}}
async function logout(){await db.auth.signOut();user=null;nav();view("home");}
document.addEventListener("DOMContentLoaded",()=>{
$("year").textContent=new Date().getFullYear();$("state").insertAdjacentHTML("beforeend",states.map(s=>`<option value="${s}">${s}</option>`).join(""));
$("nav-login").onclick=$("hero-login").onclick=()=>view("login");$("nav-register").onclick=$("hero-register").onclick=()=>view("register");
$("link-register").onclick=e=>{e.preventDefault();view("register")};$("link-login").onclick=e=>{e.preventDefault();view("login")};
$("brand-home").onclick=e=>{e.preventDefault();user?dashboard():view("home")};$("nav-logout").onclick=$("dash-logout").onclick=logout;
$("login-form").addEventListener("submit",login);$("register-form").addEventListener("submit",register);$("application-form").addEventListener("submit",apply);
if(!window.supabase?.createClient){message("login-msg","Supabase library failed to load. Refresh and check your connection.");return;}
db=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
db.auth.getSession().then(({data})=>{user=data.session?.user||null;nav();user?dashboard():view("home");});
db.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;nav();});
});
})();