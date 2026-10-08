const API="https://kfqakkbqtczoilisoydj.supabase.co/functions/v1/sbfb-api";
const tg=window.Telegram&&window.Telegram.WebApp;
if(tg){tg.ready();tg.expand();}
const initData=tg&&tg.initData||"";
const tgUser=tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user;
const $=s=>document.querySelector(s);
const money=n=>"₹"+Number(n||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]});
function msg(s,bad){var n=$("#notice");n.textContent=s;n.classList.remove("hide");n.style.background=bad?"#a83232":"#123126";setTimeout(function(){n.classList.add("hide")},3000)}
async function api(action,body){body=body||{};var r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json","x-telegram-init-data":initData},body:JSON.stringify(Object.assign({action:action},body))});var j=await r.json();if(!r.ok||j.error)throw new Error(j.error||"Request failed");return j}
function go(id){document.querySelectorAll(".page").forEach(function(x){x.classList.toggle("active",x.id===id)});load(id)}
function fd(f){return Object.fromEntries(new FormData(f).entries())}
const cfg={
stock:["stock_entries","Stock",function(r){return "<b>#"+r.id+" · "+esc(r.material)+"</b><small>"+r.quantity+" "+esc(r.unit)+" · "+money(r.amount)+" · "+esc(r.supplier||"-")+"</small>"}],
sales:["sales_entries","Sales",function(r){return "<b>#"+r.id+" · "+esc(r.material)+"</b><small>"+r.quantity+" "+esc(r.unit)+" · "+money(r.total_amount)+" · "+esc(r.customer)+"</small>"}],
customers:["customers","Customers",function(r){return "<b>#"+r.id+" · "+esc(r.name)+"</b><small>"+esc(r.phone||"")+" · "+esc(r.address||"")+"</small>"}],
suppliers:["suppliers","Suppliers",function(r){return "<b>#"+r.id+" · "+esc(r.name)+"</b><small>"+esc(r.phone||"")+" · "+esc(r.address||"")+"</small>"}],
employees:["employees","Employees",function(r){return "<b>#"+r.id+" · "+esc(r.name)+"</b><small>"+esc(r.employee_id)+" · "+esc(r.role||"")+" · "+money(r.wage_amount)+"</small>"}],
attendance:["employee_attendance","Attendance",function(r){return "<b>#"+r.id+" · Employee "+esc(r.employee_id)+"</b><small>"+esc(r.attendance_date)+" · "+esc(r.status)+"</small>"}],
work:["employee_work","Employee Work",function(r){return "<b>#"+r.id+" · Employee "+esc(r.employee_id)+"</b><small>"+esc(r.work_date)+" · "+esc(r.task)+" · "+esc(r.status)+"</small>"}],
production:["production_entries","Production",function(r){return "<b>#"+r.id+" · "+esc(r.product)+"</b><small>"+esc(r.production_date)+" · "+r.quantity+" "+esc(r.unit)+" · "+money(r.total_cost)+"</small>"}],
rates:["rate_master","Rates",function(r){return "<b>#"+r.id+" · "+esc(r.item_name)+"</b><small>"+esc(r.rate_type)+" · "+money(r.rate)+" / "+esc(r.unit)+"</small>"}]
};
async function list(table){return api("list",{table:table,limit:50})}
async function render(key){var c=cfg[key],el=$("#"+key+"List");if(!el)return;try{var j=await list(c[0]);el.innerHTML=j.rows.length?j.rows.map(function(r){return '<div class="row"><div>'+c[2](r)+'</div><button class="danger" onclick="del(\''+c[0]+'\','+r.id+')">Delete</button></div>'}).join(""):"<p class='muted'>No records.</p>"}catch(e){el.innerHTML="<p class='muted'>"+esc(e.message)+"</p>"}}
async function load(id){try{if(id==="dashboard"){var d=await api("dashboard");$("#cards").innerHTML=[["Stock",d.stock],["Sales",d.sales],["Customers",d.customers],["Employees",d.employees]].map(function(x){return '<div class="card"><span class="muted">'+x[0]+'</span><b>'+x[1]+"</b></div>"}).join("")}if(cfg[id])await render(id);if(id==="delete")showDelete("stock_entries");if(id==="reports"){var r=await api("reports");$("#weekly").innerHTML=r.weekly.map(function(x){return '<div class="row"><span>'+x.week_start+"</span><b>"+money(x.turnover)+"</b></div>"}).join("")||"No data";$("#monthly").innerHTML=r.monthly.map(function(x){return '<div class="row"><span>'+x.month_start+"</span><b>"+money(x.turnover)+"</b></div>"}).join("")||"No data";$("#receivables").innerHTML=r.receivables.map(function(x){return '<div class="row"><span>'+esc(x.customer)+"</span><b>"+money(x.outstanding_amount)+"</b></div>"}).join("")||"No data";$("#payables").innerHTML=r.payables.map(function(x){return '<div class="row"><span>'+esc(x.supplier||"-")+"</span><b>"+money(x.outstanding_amount)+"</b></div>"}).join("")||"No data"}}catch(e){msg(e.message,true)}}
async function save(form,table,transform){try{var d=fd(form);if(transform)d=transform(d);await api("insert",{table:table,data:d});form.reset();msg("Saved");load(document.querySelector(".page.active").id)}catch(e){msg(e.message,true)}}
$("#stockForm").onsubmit=function(e){e.preventDefault();save(e.target,"stock_entries",function(d){d.quantity=+d.quantity;d.amount=+d.amount;d.paid_amount=+(d.paid_amount||0);return d})};
$("#salesForm").onsubmit=function(e){e.preventDefault();save(e.target,"sales_entries",function(d){d.quantity=+d.quantity;d.selling_price=+d.selling_price;d.paid_amount=+(d.paid_amount||0);return d})};
$("#customerForm").onsubmit=function(e){e.preventDefault();save(e.target,"customers")};
$("#supplierForm").onsubmit=function(e){e.preventDefault();save(e.target,"suppliers")};
$("#employeeForm").onsubmit=function(e){e.preventDefault();save(e.target,"employees",function(d){d.wage_amount=+(d.wage_amount||0);return d})};
$("#attendanceForm").onsubmit=function(e){e.preventDefault();save(e.target,"employee_attendance")};
$("#workForm").onsubmit=function(e){e.preventDefault();save(e.target,"employee_work",function(d){d.quantity=+(d.quantity||0);return d})};
$("#productionForm").onsubmit=function(e){e.preventDefault();save(e.target,"production_entries",function(d){["quantity","material_cost","labour_cost","electricity_cost","water_cost","other_cost"].forEach(function(k){d[k]=+(d[k]||0)});if(!d.employee_id)delete d.employee_id;return d})};
$("#rateForm").onsubmit=function(e){e.preventDefault();save(e.target,"rate_master",function(d){d.rate=+d.rate;d.active=true;return d})};
var delCats={Stock:"stock_entries",Sales:"sales_entries",Customers:"customers",Suppliers:"suppliers",Employees:"employees",Attendance:"employee_attendance","Employee Work":"employee_work",Production:"production_entries",Rates:"rate_master"};
$("#deleteCats").innerHTML=Object.keys(delCats).map(function(k){return '<button onclick="showDelete(\''+delCats[k]+'\')">🗑 '+k+"</button>"}).join("");
async function showDelete(table){try{var j=await list(table);$("#deleteList").innerHTML=j.rows.length?j.rows.map(function(r){return '<div class="row"><div><b>#'+r.id+"</b> "+esc(r.name||r.material||r.product||r.item_name||"Record")+'</div><button class="danger" onclick="del(\''+table+'\','+r.id+')">Delete</button></div>'}).join(""):"<p class='muted'>No records.</p>"}catch(e){msg(e.message,true)}}
async function del(table,id){if(!confirm("Delete ONLY record #"+id+"? This cannot be undone."))return;try{await api("delete",{table:table,id:id});msg("Record deleted");showDelete(table)}catch(e){msg(e.message,true)}}
window.go=go;window.del=del;window.showDelete=showDelete;
$("#refresh").onclick=function(){load(document.querySelector(".page.active").id)};
if(tgUser){$("#hello").textContent="Hello, "+(tgUser.first_name||"");$("#tgid").textContent="Telegram ID: "+tgUser.id+" • @"+(tgUser.username||"no username")}else{$("#hello").textContent="Open from Telegram";$("#tgid").textContent="Telegram identity not available."}
document.querySelectorAll("input[type=date]").forEach(function(x){x.value=x.value||new Date().toISOString().slice(0,10)});
load("dashboard");