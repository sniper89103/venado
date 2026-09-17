
/* ============================================================
   CREDENCIALES — client-side, no es seguridad real (ver nota
   en el mensaje del chat). Solo evita accesos casuales.
   ============================================================ */
const USERS = [
  {username:"aracely", password:"venado1", nombre:"Aracely"},
  {username:"usuario2", password:"venado2", nombre:"Usuario 2"},
];
/* La edición de stock/fotos ya no requiere clave — cualquiera con sesión iniciada puede editar */

const ICONS = {
  vender: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3h2.5l2.6 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6"/></svg>`,
  stock: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>`,
  historial: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9 3h6"/></svg>`,
  reposicion: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 14-5.2M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.2M4 20v-5h5"/></svg>`,
  dashboard: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V10"/><path d="M12 19V5"/><path d="M20 19v-7"/></svg>`,
};
/* orden de navegación — Dashboard va primero, la app abre ahí */
const TABS = [
  {id:"dashboard", label:"Dashboard"},
  {id:"vender", label:"Vender"},
  {id:"stock", label:"Stock"},
  {id:"historial", label:"Historial"},
  {id:"reposicion", label:"Reposición"},
];
const TAB_INICIAL = "dashboard";

const PRECIO_UNITARIO = 20;
const PACKS = [
  {id:"p1",  nombre:"Pack 1",  detalle:"Pudín Chocolate + Pudín Frutilla + Gelatina de Pata + Flan sabor Vainilla", dotacionInicial:100},
  {id:"p2",  nombre:"Pack 2",  detalle:"Flan Frutilla + Flan Chocolate + Flan Vainilla", dotacionInicial:100},
  {id:"p3",  nombre:"Pack 3",  detalle:"Pudín Chocolate + Pudín Frutilla + Pudín Vainilla", dotacionInicial:100},
  {id:"p4",  nombre:"Pack 4",  detalle:"Jarra 1,5 L + 3 Gelatinas Frambuesa", dotacionInicial:100},
  {id:"p5",  nombre:"Pack 5",  detalle:"Jarra 1,5 L + 5 sobres Milk Shake", dotacionInicial:100},
  {id:"p6",  nombre:"Pack 6",  detalle:"2 Displays Refresco Real (rojo y morado) + 2 Vasos", dotacionInicial:100},
  {id:"p7",  nombre:"Pack 7",  detalle:"Avena Instantánea 300 g + Gelatina Light Frutilla", dotacionInicial:100},
  {id:"p8",  nombre:"Pack 8",  detalle:"Cereal Azucaraditas 200 g + Cereal Kriskao 200 g", dotacionInicial:100},
  {id:"p9",  nombre:"Pack 9",  detalle:"2 Cereales Chocoexplosión 200 g", dotacionInicial:100},
  {id:"p10", nombre:"Pack 10", detalle:"Organizador (Tupper) + Cereal Kriskao caja 220 g", dotacionInicial:100},
];
/* Fotos por defecto — coloca estos archivos (Pack_1.png ... Pack_10.png) en la
   misma carpeta que index.html y se mostrarán solos. Si además subes una foto
   desde el panel de Stock, esa reemplaza a esta por defecto. */
const DEFAULT_IMG = {};
PACKS.forEach((p,i)=>{ DEFAULT_IMG[p.id] = `Pack_${i+1}.png`; });

/* ============================================================
   PERSISTENCIA
   ============================================================ */
const STORAGE_KEY = "venado_app_state_v3";
let memoryFallback = null;
function defaultState(){
  const overrides = {};
  PACKS.forEach(p=>{ overrides[p.id] = {dotacionInicial:p.dotacionInicial, imagen:""}; });
  return {session:null, ventas:[], movimientos:[], packOverrides:overrides, nextVentaId:1, nextMovId:1};
}
function loadState(){
  try{ const raw = localStorage.getItem(STORAGE_KEY); if(raw){ const s = JSON.parse(raw); 
    PACKS.forEach(p=>{ if(!s.packOverrides[p.id]) s.packOverrides[p.id] = {dotacionInicial:p.dotacionInicial, imagen:""}; });
    return s; } }
  catch(e){}
  return memoryFallback || defaultState();
}
function saveState(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch(e){ memoryFallback = state; }
}
let state = loadState();

/* ============================================================
   LÓGICA DE STOCK
   ============================================================ */
function dotacionInicial(id){ return state.packOverrides[id].dotacionInicial; }
function totalMovimientos(id){ return state.movimientos.filter(m=>m.packId===id).reduce((s,m)=>s+m.cantidad,0); }
function totalVendido(id){ return state.ventas.filter(v=>v.packId===id && !v.anulada).reduce((s,v)=>s+v.cantidad,0); }
function stockDisponible(id){ return dotacionInicial(id) + totalMovimientos(id) - totalVendido(id); }
function pctStock(id){ const base=dotacionInicial(id); const d=stockDisponible(id); return base===0?0:d/base; }
function estadoStock(id){
  const d = stockDisponible(id);
  if(d<=0) return {label:"Agotado",cls:"agotado"};
  const pct = pctStock(id);
  if(pct>=0.7) return {label:"Alto",cls:"alto"};
  if(pct>=0.5) return {label:"Medio",cls:"medio"};
  return {label:"Bajo",cls:"bajo"};
}
const COLOR_MAP = {alto:"var(--verde)",medio:"var(--amber)",bajo:"var(--peligro)",agotado:"var(--agotado)"};
const PILL_MAP  = {alto:"tag-alto",medio:"tag-medio",bajo:"tag-bajo",agotado:"tag-agotado"};

let toastTimer=null;
function showToast(msg, type){
  const t=document.getElementById("toast");
  t.textContent=msg; t.classList.add("show");
  t.classList.toggle("toast-alert", type==="alert");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove("show"),type==="alert"?3200:2200);
}

/* ============================================================
   LOGIN
   ============================================================ */
let ciudadSeleccionada = null;
document.querySelectorAll(".city-pill").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    ciudadSeleccionada = btn.dataset.city;
    document.querySelectorAll(".city-pill").forEach(b=>b.classList.toggle("selected", b===btn));
  });
});
document.getElementById("entrarBtn").addEventListener("click", ()=>{
  const user = document.getElementById("loginUser").value.trim().toLowerCase();
  const pass = document.getElementById("loginPass").value;
  const errEl = document.getElementById("loginError");
  if(!user || !pass || !ciudadSeleccionada){
    errEl.textContent = "Completa usuario, contraseña y ciudad.";
    errEl.classList.remove("hidden");
    return;
  }
  const found = USERS.find(u=>u.username===user && u.password===pass);
  if(!found){
    errEl.textContent = "Usuario o contraseña incorrectos.";
    errEl.classList.remove("hidden");
    return;
  }
  errEl.classList.add("hidden");
  state.session = {username:found.username, nombre:found.nombre, ciudad:ciudadSeleccionada};
  saveState();
  enterApp();
});

function showLoginScreen(){
  document.getElementById("appRoot").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("loginUser").value = "";
  document.getElementById("loginPass").value = "";
  ciudadSeleccionada = null;
  document.querySelectorAll(".city-pill").forEach(b=>b.classList.remove("selected"));
}
function enterApp(){
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("appRoot").classList.remove("hidden");
  const initials = state.session.nombre.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  [["avatarDotM"],["avatarDotD"]].forEach(([id])=>document.getElementById(id).textContent = initials);
  document.getElementById("sessionLabelM").textContent = state.session.nombre.split(" ")[0]+" · "+state.session.ciudad;
  document.getElementById("sessionNameD").textContent = state.session.nombre;
  document.getElementById("sessionCityD").textContent = state.session.ciudad;
  switchTab(TAB_INICIAL);
  renderAll();
  setTimeout(positionNavIndicator, 30);
}
document.getElementById("cambiarTurnoBtnD").addEventListener("click", ()=>{ state.session=null; saveState(); showLoginScreen(); });
document.getElementById("cambiarTurnoBtnM").addEventListener("click", ()=>{ state.session=null; saveState(); showLoginScreen(); });

/* ============================================================
   NAV
   ============================================================ */
function buildNav(){
  const dNav = document.getElementById("dNav");
  const bottomNav = document.getElementById("bottomNav");
  TABS.forEach(t=>{
    const b1 = document.createElement("button");
    b1.className = "d-navitem"; b1.dataset.tab = t.id;
    b1.innerHTML = ICONS[t.id] + "<span>"+t.label+"</span>" + (t.id==="stock" ? '<span class="nav-alert-dot hidden" data-alert="stock"></span>' : "");
    b1.onclick = ()=>switchTab(t.id);
    dNav.appendChild(b1);

    const b2 = document.createElement("button");
    b2.className = "navitem-mobile"; b2.dataset.tab = t.id;
    b2.innerHTML = ICONS[t.id] + "<span>"+t.label+"</span>" + (t.id==="stock" ? '<span class="nav-alert-dot hidden" data-alert="stock-m"></span>' : "");
    b2.onclick = ()=>switchTab(t.id);
    bottomNav.appendChild(b2);
  });
}
function updateStockAlertDot(){
  const hayCriticos = PACKS.some(p=>{const e=estadoStock(p.id);return e.cls==="bajo"||e.cls==="agotado";});
  document.querySelectorAll('[data-alert="stock"], [data-alert="stock-m"]').forEach(dot=>dot.classList.toggle("hidden", !hayCriticos));
}
function switchTab(tab){
  document.querySelectorAll(".d-navitem, .navitem-mobile").forEach(b=>b.classList.toggle("active", b.dataset.tab===tab));
  document.querySelectorAll('[id^="tabpanel-"]').forEach(p=>p.classList.add("hidden"));
  const panel = document.getElementById("tabpanel-"+tab);
  panel.classList.remove("hidden");
  const animTarget = panel.querySelector(".view") || panel;
  animTarget.classList.remove("tab-enter"); void animTarget.offsetWidth; animTarget.classList.add("tab-enter");
  positionNavIndicator();
  if(tab==="stock") renderStock();
  if(tab==="historial") renderHistorial();
  if(tab==="reposicion") renderReposicion();
  if(tab==="dashboard") renderDashboard();
  if(tab==="vender") renderVender();
}
function positionNavIndicator(){
  const active = document.querySelector(".d-navitem.active");
  const ind = document.getElementById("dNavIndicator");
  if(active){ ind.style.top = active.offsetTop + "px"; ind.style.height = active.offsetHeight + "px"; }
}
window.addEventListener("resize", positionNavIndicator);

/* ============================================================
   VENDER
   ============================================================ */
let packSeleccionado = PACKS[0].id;
let metodoPagoSeleccionado = "efectivo";
document.querySelectorAll(".pago-pill").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    metodoPagoSeleccionado = btn.dataset.metodo;
    document.querySelectorAll(".pago-pill").forEach(b=>b.classList.toggle("selected", b===btn));
  });
});
function renderVender(){
  const grid = document.getElementById("packGrid");
  grid.innerHTML = "";
  PACKS.forEach((pack,i)=>{
    const est = estadoStock(pack.id);
    const img = state.packOverrides[pack.id].imagen || DEFAULT_IMG[pack.id];
    const card = document.createElement("button");
    card.className = "pack-card" + (pack.id===packSeleccionado ? " selected":"");
    card.style.animationDelay = (i*35)+"ms";
    card.innerHTML = `
      <div class="pack-thumb" style="${img?`background-image:url('${img}');`:''}">${img?'':'Foto pack'}</div>
      <div class="pack-name">${pack.nombre}</div>
      <div class="pack-detail">${pack.detalle}</div>
      <span class="pack-stock-tag ${PILL_MAP[est.cls]}">${est.label}</span>
    `;
    card.onclick = ()=>{ packSeleccionado = pack.id; document.getElementById("qtyInput").value=1; renderVender(); updateSaleBar(); };
    grid.appendChild(card);
  });
  updateSaleBar();
}
function updateSaleBar(){
  const pack = PACKS.find(p=>p.id===packSeleccionado);
  document.getElementById("saleBarPackName").textContent = pack.nombre;
  const qty = parseInt(document.getElementById("qtyInput").value)||0;
  document.getElementById("cashPreview").textContent = "Bs " + (qty*PRECIO_UNITARIO);
  const disp = stockDisponible(pack.id);
  const warnEl = document.getElementById("stockWarning");
  const regBtn = document.getElementById("registrarBtn");
  if(qty > disp){
    warnEl.textContent = disp<=0 ? `${pack.nombre} está agotado — no se puede registrar la venta.` : `Solo quedan ${disp} unidades de ${pack.nombre}.`;
    warnEl.classList.remove("hidden"); regBtn.disabled = true;
  } else {
    warnEl.classList.add("hidden"); regBtn.disabled = qty<=0;
  }
}
document.getElementById("qtyMinus").addEventListener("click", ()=>{ const el=document.getElementById("qtyInput"); el.value=Math.max(1,(parseInt(el.value)||1)-1); updateSaleBar(); });
document.getElementById("qtyPlus").addEventListener("click", ()=>{ const el=document.getElementById("qtyInput"); el.value=(parseInt(el.value)||1)+1; updateSaleBar(); });
document.getElementById("qtyInput").addEventListener("input", updateSaleBar);
document.getElementById("registrarBtn").addEventListener("click", ()=>{
  const qty = parseInt(document.getElementById("qtyInput").value)||0;
  const pack = PACKS.find(p=>p.id===packSeleccionado);
  if(qty<=0 || qty>stockDisponible(pack.id)) return;
  state.ventas.push({id:state.nextVentaId++, fecha:new Date().toISOString(), rep:state.session.nombre, ciudad:state.session.ciudad, packId:pack.id, cantidad:qty, efectivo:qty*PRECIO_UNITARIO, metodoPago:metodoPagoSeleccionado, anulada:false});
  saveState();
  document.getElementById("qtyInput").value = 1;
  metodoPagoSeleccionado = "efectivo";
  document.querySelectorAll(".pago-pill").forEach(b=>b.classList.toggle("selected", b.dataset.metodo==="efectivo"));
  const est = estadoStock(pack.id);
  if(est.cls==="agotado"){ showToast(`⚫ ${pack.nombre} se agotó`, "alert"); }
  else if(est.cls==="bajo"){ showToast(`⚠️ ${pack.nombre} con stock bajo — quedan ${stockDisponible(pack.id)}`, "alert"); }
  else{ showToast(`Venta registrada — ${pack.nombre} x${qty}`); }
  renderVender();
  updateStockAlertDot();
});

/* ============================================================
   STOCK
   ============================================================ */
let stockUnlocked = false;
function toggleStockUnlock(){
  stockUnlocked = !stockUnlocked;
  if(stockUnlocked) showToast("Edición de stock activada");
  renderStock();
}
function resizeImageFile(file, maxWidth, quality){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = (e)=>{
      const img = new Image();
      img.onload = ()=>{
        const scale = Math.min(1, maxWidth/img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width*scale; canvas.height = img.height*scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function renderStock(){
  const list = document.getElementById("stockList");
  list.innerHTML = "";
  const btn = document.getElementById("stockUnlockBtn");
  if(btn) btn.textContent = stockUnlocked ? "Listo, terminar edición" : "✎ Editar stock y fotos";
  PACKS.forEach((pack,i)=>{
    const disp = stockDisponible(pack.id);
    const pct = Math.max(0,Math.min(1,pctStock(pack.id)));
    const est = estadoStock(pack.id);
    const ov = state.packOverrides[pack.id];
    const imgStock = ov.imagen || DEFAULT_IMG[pack.id];
    const row = document.createElement("div");
    row.className = "stock-row" + (stockUnlocked ? " editing":"");
    row.style.animationDelay = (i*30)+"ms";
    row.innerHTML = `
      <div class="stock-main-line">
        <div class="stock-thumb-mini" style="${imgStock?`background-image:url('${imgStock}');`:''}">${imgStock?'':'Sin foto'}</div>
        <div style="flex:1;min-width:0;"><div class="stock-row-name">${pack.nombre}</div><div class="stock-row-detail">${pack.detalle}</div></div>
        <div class="stock-bar-wrap"><div class="stock-bar-fill" style="width:${pct*100}%;background:${COLOR_MAP[est.cls]};"></div></div>
        <div class="stock-num">${disp}</div>
        <span class="status-pill ${PILL_MAP[est.cls]}">${est.label}</span>
      </div>
      ${stockUnlocked ? `
      <div class="stock-edit-line">
        <input type="number" class="admin-num-input" value="${disp}" data-role="dotacion" data-pack="${pack.id}" title="Stock actual (reemplaza el número que hay ahora)">
        <button class="admin-mini-btn primary" data-role="save-dotacion" data-pack="${pack.id}">Guardar</button>
        <button class="admin-mini-btn" data-role="ajuste-menos" data-pack="${pack.id}">−10</button>
        <button class="admin-mini-btn" data-role="ajuste-mas" data-pack="${pack.id}">+10</button>
        <label class="admin-file-label">${ov.imagen?'Cambiar foto':'Subir foto'}<input type="file" accept="image/*" class="hidden" data-role="upload" data-pack="${pack.id}"></label>
        ${ov.imagen?`<button class="admin-mini-btn danger" data-role="remove-photo" data-pack="${pack.id}">Quitar foto</button>`:''}
      </div>` : ''}
    `;
    list.appendChild(row);
  });
  if(!stockUnlocked) return;
  list.querySelectorAll('[data-role="remove-photo"]').forEach(b=>b.addEventListener("click", ()=>{
    state.packOverrides[b.dataset.pack].imagen = ""; saveState(); showToast("Foto eliminada"); renderStock(); renderVender();
  }));
  list.querySelectorAll('[data-role="save-dotacion"]').forEach(b=>b.addEventListener("click", ()=>{
    const pid = b.dataset.pack;
    const val = parseInt(list.querySelector(`[data-role="dotacion"][data-pack="${pid}"]`).value);
    if(isNaN(val) || val<0) return;
    const actual = stockDisponible(pid);
    const delta = val - actual;
    if(delta !== 0){
      state.movimientos.push({id:state.nextMovId++, fecha:new Date().toISOString(), packId:pid, cantidad:delta, tipo:"ajuste"});
    }
    state.packOverrides[pid].dotacionInicial = val;
    saveState();
    showToast(`Stock de ${PACKS.find(p=>p.id===pid).nombre} fijado en ${val}`);
    renderStock(); renderVender(); updateStockAlertDot();
  }));
  list.querySelectorAll('[data-role="ajuste-menos"], [data-role="ajuste-mas"]').forEach(b=>b.addEventListener("click", ()=>{
    const pid = b.dataset.pack; const delta = b.dataset.role==="ajuste-mas" ? 10 : -10;
    state.movimientos.push({id:state.nextMovId++, fecha:new Date().toISOString(), packId:pid, cantidad:delta, tipo:"ajuste"});
    saveState(); showToast(`Ajuste de ${delta>0?'+':''}${delta} aplicado`); renderStock(); renderVender(); updateStockAlertDot();
  }));
  list.querySelectorAll('[data-role="upload"]').forEach(input=>input.addEventListener("change", async (e)=>{
    const file = e.target.files[0]; if(!file) return;
    try{
      const dataUrl = await resizeImageFile(file, 480, 0.72);
      state.packOverrides[input.dataset.pack].imagen = dataUrl;
      saveState(); showToast("Foto actualizada"); renderStock(); renderVender();
    }catch(err){ showToast("No se pudo procesar la imagen"); }
  }));
}
document.getElementById("stockUnlockBtn").addEventListener("click", toggleStockUnlock);

/* ============================================================
   HISTORIAL
   ============================================================ */
function populateFiltroRep(){
  const sel = document.getElementById("filtroRep");
  if(sel.options.length>1) return;
  USERS.forEach(u=>{ const o=document.createElement("option"); o.value=u.nombre; o.textContent=u.nombre; sel.appendChild(o); });
}
function renderHistorial(){
  populateFiltroRep();
  const filtroRep = document.getElementById("filtroRep").value;
  const filtroCiudad = document.getElementById("filtroCiudad").value;
  const body = document.getElementById("histBody");
  body.innerHTML = "";
  const ventasOrdenadas = [...state.ventas].sort((a,b)=>b.id-a.id);
  let mostrado = 0;
  ventasOrdenadas.forEach(v=>{
    if(filtroRep && v.rep!==filtroRep) return;
    if(filtroCiudad && v.ciudad!==filtroCiudad) return;
    mostrado++;
    const pack = PACKS.find(p=>p.id===v.packId);
    const tr = document.createElement("tr");
    if(v.anulada) tr.className = "row-void";
    const fecha = new Date(v.fecha);
    tr.innerHTML = `
      <td>${v.id}</td><td>${fecha.toLocaleDateString('es-BO')} ${fecha.toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'})}</td>
      <td>${v.rep}</td><td>${v.ciudad}</td><td>${pack.nombre}</td><td>${v.cantidad}</td>
      <td>${(v.metodoPago||'efectivo')==='qr'?'📱 QR':'💵 Efectivo'}</td><td>Bs ${v.efectivo}</td>
      <td><button class="btn-void" data-id="${v.id}" ${v.anulada?'disabled':''}>${v.anulada?'Anulada':'Anular'}</button></td>
    `;
    body.appendChild(tr);
  });
  if(mostrado===0){ body.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--ink-soft);padding:24px;">Todavía no hay ventas registradas.</td></tr>`; }
  body.querySelectorAll(".btn-void").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const venta = state.ventas.find(v=>v.id===parseInt(btn.dataset.id));
      if(venta && confirm(`¿Anular la venta #${venta.id} (${PACKS.find(p=>p.id===venta.packId).nombre} x${venta.cantidad})? Esto devuelve el stock.`)){
        venta.anulada = true; saveState(); renderHistorial();
        showToast("Venta anulada — stock devuelto"); updateStockAlertDot();
      }
    });
  });
}
document.getElementById("filtroRep").addEventListener("change", renderHistorial);
document.getElementById("filtroCiudad").addEventListener("change", renderHistorial);
/* ============================================================
   EXPORTAR — Excel detallado (.xlsx), Word (.doc), PDF
   ============================================================ */
function construirDatosReporte(){
  const ventasActivas = state.ventas.filter(v=>!v.anulada);
  const totalUnidades = ventasActivas.reduce((s,v)=>s+v.cantidad,0);
  const totalEfectivo = ventasActivas.reduce((s,v)=>s+v.efectivo,0);
  const totalPagoEfectivo = ventasActivas.filter(v=>(v.metodoPago||'efectivo')==='efectivo').reduce((s,v)=>s+v.efectivo,0);
  const totalPagoQr = ventasActivas.filter(v=>v.metodoPago==='qr').reduce((s,v)=>s+v.efectivo,0);
  const filasVentas = [...state.ventas].sort((a,b)=>a.id-b.id).map(v=>{
    const pack = PACKS.find(p=>p.id===v.packId); const f = new Date(v.fecha);
    return {ID:v.id, Fecha:f.toLocaleDateString('es-BO'), Hora:f.toLocaleTimeString('es-BO'), Vendedor:v.rep, Ciudad:v.ciudad, Pack:pack.nombre, Cantidad:v.cantidad, "Método de pago":(v.metodoPago||'efectivo')==='qr'?'QR':'Efectivo', "Monto (Bs)":v.efectivo, Anulada:v.anulada?"Sí":"No"};
  });
  const filasStock = PACKS.map(p=>{
    const disp = stockDisponible(p.id); const est = estadoStock(p.id);
    return {Pack:p.nombre, Detalle:p.detalle, "Dotación Inicial":dotacionInicial(p.id), "Total Repuesto/Ajustado":totalMovimientos(p.id), "Vendido":totalVendido(p.id), "Stock Disponible":disp, "% Stock":Math.round(pctStock(p.id)*100)+"%", Estado:est.label, "Valor en stock (Bs)":disp*PRECIO_UNITARIO};
  });
  const filasMovimientos = [...state.movimientos].sort((a,b)=>a.id-b.id).map(m=>{
    const pack = PACKS.find(p=>p.id===m.packId); const f = new Date(m.fecha);
    return {Fecha:f.toLocaleDateString('es-BO'), Hora:f.toLocaleTimeString('es-BO'), Pack:pack.nombre, Tipo:m.tipo==='ajuste'?'Ajuste manual':'Reposición', Cantidad:m.cantidad};
  });
  const resumen = [
    {Indicador:"Unidades vendidas", Valor:totalUnidades},
    {Indicador:"Efectivo total recaudado (Bs)", Valor:totalEfectivo},
    {Indicador:"  — pagado en Efectivo (Bs)", Valor:totalPagoEfectivo},
    {Indicador:"  — pagado en QR (Bs)", Valor:totalPagoQr},
    {Indicador:"Valor total de stock restante (Bs)", Valor: PACKS.reduce((s,p)=>s+stockDisponible(p.id)*PRECIO_UNITARIO,0)},
    {Indicador:"Packs con stock bajo o agotado", Valor: PACKS.filter(p=>{const e=estadoStock(p.id);return e.cls==="bajo"||e.cls==="agotado";}).length},
    {Indicador:"Fecha de generación del reporte", Valor: new Date().toLocaleString('es-BO')},
  ];
  return {filasVentas, filasStock, filasMovimientos, resumen, totalUnidades, totalEfectivo};
}


document.getElementById("exportXlsxBtn").addEventListener("click", ()=>{
  if(typeof XLSX === "undefined"){
    showToast("Sin conexión — el Excel detallado necesita internet un momento para generarse", "alert");
    return;
  }
  const {filasVentas, filasStock, filasMovimientos, resumen} = construirDatosReporte();
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), "Resumen");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasStock), "Stock");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasVentas), "Ventas");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasMovimientos), "Movimientos");
  XLSX.writeFile(wb, `venado_reporte_${new Date().toISOString().slice(0,10)}.xlsx`);
  showToast("Excel detallado exportado");
});

document.getElementById("exportWordBtn").addEventListener("click", ()=>{
  const {filasVentas, filasStock, resumen} = construirDatosReporte();
  const filaHtml = (obj)=>`<tr>${Object.values(obj).map(v=>`<td style="border:1px solid #ccc;padding:6px;">${v}</td>`).join("")}</tr>`;
  const headerHtml = (obj)=>`<tr>${Object.keys(obj).map(k=>`<th style="border:1px solid #ccc;padding:6px;background:#182450;color:#fff;">${k}</th>`).join("")}</tr>`;
  const html = `
    <html><head><meta charset="utf-8"></head><body style="font-family:Arial;">
    <h1 style="color:#182450;">Reporte de Actividad — Venado</h1>
    <p>Generado el ${new Date().toLocaleString('es-BO')}</p>
    <h2>Resumen</h2>
    <table style="border-collapse:collapse;width:100%;">${headerHtml(resumen[0])}${resumen.map(filaHtml).join("")}</table>
    <h2>Stock</h2>
    <table style="border-collapse:collapse;width:100%;">${headerHtml(filasStock[0])}${filasStock.map(filaHtml).join("")}</table>
    <h2>Ventas</h2>
    <table style="border-collapse:collapse;width:100%;">${headerHtml(filasVentas[0]||{})}${filasVentas.map(filaHtml).join("")}</table>
    </body></html>`;
  const blob = new Blob(['\ufeff', html], {type:"application/msword"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=`venado_reporte_${new Date().toISOString().slice(0,10)}.doc`; a.click();
  URL.revokeObjectURL(url);
  showToast("Documento Word exportado");
});

document.getElementById("exportPdfBtn").addEventListener("click", ()=>{
  const {filasVentas, filasStock, resumen} = construirDatosReporte();
  const filaHtml = (obj)=>`<tr>${Object.values(obj).map(v=>`<td>${v}</td>`).join("")}</tr>`;
  const headerHtml = (obj)=>`<tr>${Object.keys(obj).map(k=>`<th>${k}</th>`).join("")}</tr>`;
  const win = window.open("", "_blank");
  win.document.write(`
    <html><head><title>Reporte Venado</title><style>
      body{font-family:Arial,sans-serif;color:#111;padding:24px;}
      h1{color:#182450;} h2{color:#182450;margin-top:28px;}
      table{border-collapse:collapse;width:100%;margin-bottom:20px;font-size:12px;}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;}
      th{background:#182450;color:#fff;}
    </style></head><body>
    <h1>Reporte de Actividad — Venado</h1>
    <p>Generado el ${new Date().toLocaleString('es-BO')}</p>
    <h2>Resumen</h2><table>${headerHtml(resumen[0])}${resumen.map(filaHtml).join("")}</table>
    <h2>Stock</h2><table>${headerHtml(filasStock[0])}${filasStock.map(filaHtml).join("")}</table>
    <h2>Ventas</h2><table>${headerHtml(filasVentas[0]||{})}${filasVentas.map(filaHtml).join("")}</table>
    <script>window.onload=()=>window.print();<\/script>
    </body></html>`);
  win.document.close();
});

/* ============================================================
   REPOSICIÓN (+ ajustes de admin, mismo libro de movimientos)
   ============================================================ */
function renderReposicion(){
  const sel = document.getElementById("repoPack");
  if(sel.options.length===0){ PACKS.forEach(p=>{ const o=document.createElement("option"); o.value=p.id; o.textContent=p.nombre; sel.appendChild(o); }); }
  const body = document.getElementById("repoBody");
  body.innerHTML = "";
  const movs = [...state.movimientos].sort((a,b)=>b.id-a.id);
  movs.forEach(m=>{
    const pack = PACKS.find(p=>p.id===m.packId); const f = new Date(m.fecha);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${f.toLocaleDateString('es-BO')} ${f.toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'})}</td><td>${pack.nombre}</td><td>${m.tipo==='ajuste'?'Ajuste (admin)':'Reposición'}</td><td>${m.cantidad>0?'+':''}${m.cantidad}</td>`;
    body.appendChild(tr);
  });
  if(movs.length===0){ body.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--ink-soft);padding:20px;">Sin movimientos registrados.</td></tr>`; }
}
document.getElementById("repoSubmitBtn").addEventListener("click", ()=>{
  const packId = document.getElementById("repoPack").value;
  const cantidad = parseInt(document.getElementById("repoCantidad").value);
  if(!cantidad || cantidad<=0){ showToast("Ingresa una cantidad válida"); return; }
  state.movimientos.push({id:state.nextMovId++, fecha:new Date().toISOString(), packId, cantidad, tipo:"reposicion"});
  saveState();
  document.getElementById("repoCantidad").value = "";
  showToast("Reposición registrada");
  renderReposicion(); renderStock(); updateStockAlertDot();
});

/* ============================================================
   DASHBOARD
   ============================================================ */
function animateNumber(el, target, prefix){
  const start = parseInt(el.dataset.rawValue || "0") || 0;
  const duration = 500;
  const t0 = performance.now();
  function tick(now){
    const p = Math.min(1, (now-t0)/duration);
    const eased = 1 - Math.pow(1-p, 3);
    const val = Math.round(start + (target-start)*eased);
    el.textContent = prefix + val.toLocaleString('es-BO');
    if(p<1) requestAnimationFrame(tick); else el.dataset.rawValue = target;
  }
  requestAnimationFrame(tick);
}
function renderDashboard(){
  const ventasActivas = state.ventas.filter(v=>!v.anulada);
  const totalUnidades = ventasActivas.reduce((s,v)=>s+v.cantidad,0);
  const totalEfectivo = ventasActivas.reduce((s,v)=>s+v.efectivo,0);
  const hoy = new Date().toDateString();
  const ventasHoy = ventasActivas.filter(v=>new Date(v.fecha).toDateString()===hoy);
  const efectivoHoy = ventasHoy.reduce((s,v)=>s+v.efectivo,0);
  const entry = Object.entries(ventasActivas.reduce((acc,v)=>{acc[v.packId]=(acc[v.packId]||0)+v.cantidad;return acc;},{})).sort((a,b)=>b[1]-a[1])[0];
  const packMasVendido = entry ? PACKS.find(p=>p.id===entry[0]).nombre : "—";
  animateNumber(document.getElementById("kpiHeroValue"), totalEfectivo, "Bs ");
  document.getElementById("kpiHeroSub").textContent = totalUnidades + " unidades vendidas";
  animateNumber(document.getElementById("kpiHoy"), efectivoHoy, "Bs ");
  document.getElementById("kpiTop").textContent = packMasVendido;
  const ranking = PACKS.map(p=>({nombre:p.nombre,unidades:totalVendido(p.id)})).sort((a,b)=>b.unidades-a.unidades).slice(0,6);
  const maxUnid = Math.max(1,...ranking.map(r=>r.unidades));
  document.getElementById("rankList").innerHTML = ranking.map(r=>`
    <div class="rank-row"><span class="rank-name">${r.nombre}</span><div class="rank-bar-wrap"><div class="rank-bar" style="width:${(r.unidades/maxUnid)*100}%;"></div></div><span class="rank-val">${r.unidades}</span></div>
  `).join("") || `<p style="color:var(--ink-soft);font-size:13px;">Sin ventas todavía.</p>`;
  const criticos = PACKS.filter(p=>{const e=estadoStock(p.id);return e.cls==="bajo"||e.cls==="agotado";});
  document.getElementById("alertList").innerHTML = criticos.length ? criticos.map(p=>{
    const est = estadoStock(p.id); const icon = est.cls==="agotado"?"⚫":"🔴";
    return `<div class="alert-item">${icon} <b>${p.nombre}</b> — ${stockDisponible(p.id)} unidades (${est.label})</div>`;
  }).join("") : `<p style="color:var(--ink-soft);font-size:13px;">Ningún pack en estado crítico.</p>`;

  const efvo = ventasActivas.filter(v=>(v.metodoPago||'efectivo')==='efectivo').reduce((s,v)=>s+v.efectivo,0);
  const qr = ventasActivas.filter(v=>v.metodoPago==='qr').reduce((s,v)=>s+v.efectivo,0);
  const totalPago = Math.max(1, efvo+qr);
  document.getElementById("pagoBreakdown").innerHTML = `
    <div class="rank-row"><span class="rank-name">💵 Efectivo</span><div class="rank-bar-wrap"><div class="rank-bar" style="width:${(efvo/totalPago)*100}%;"></div></div><span class="rank-val">Bs ${efvo}</span></div>
    <div class="rank-row"><span class="rank-name">📱 QR</span><div class="rank-bar-wrap"><div class="rank-bar" style="width:${(qr/totalPago)*100}%;"></div></div><span class="rank-val">Bs ${qr}</span></div>
  `;
}


/* ============================================================
   BACKUP / RESTORE
   ============================================================ */
document.getElementById("backupBtn").addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=`venado_respaldo_${new Date().toISOString().slice(0,10)}.json`; a.click();
  URL.revokeObjectURL(url);
  showToast("Respaldo descargado");
});
document.getElementById("restoreBtn").addEventListener("click", ()=>document.getElementById("restoreFile").click());
document.getElementById("restoreFile").addEventListener("change", (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev)=>{
    try{
      const restored = JSON.parse(ev.target.result);
      if(!restored.ventas || !restored.movimientos || !restored.packOverrides) throw new Error("formato inválido");
      state = restored; saveState();
      showToast("Respaldo restaurado"); renderAll();
    }catch(err){ showToast("El archivo no es un respaldo válido"); }
  };
  reader.readAsText(file);
});

document.getElementById("resetAllBtn").addEventListener("click", ()=>{
  const paso1 = confirm("¿Seguro que quieres borrar TODOS los registros? Ventas, historial y movimientos de stock se perderán para siempre. Esto no se puede deshacer.\n\nConsejo: usa primero 'Respaldar datos (.json)' si quieres guardar una copia.");
  if(!paso1) return;
  const escrito = prompt('Para confirmar, escribe la clave de acceso: ');
  if(escrito !== "BORRAR"){ showToast("Cancelado — no se borró nada"); return; }
  state = defaultState();
  saveState();
  showToast("Todos los registros fueron borrados");
  showLoginScreen();
});

/* ============================================================
   INIT
   ============================================================ */
function actualizarFechaHoy(){
  const hoy = new Date();
  const opciones = {day:'numeric', month:'long', year:'numeric'};
  const texto = hoy.toLocaleDateString('es-BO', opciones);
  const elLogin = document.getElementById("dateStampLogin");
  const elApp = document.getElementById("dateStampApp");
  if(elLogin) elLogin.textContent = "Hoy " + texto + " · x Grupo Lucky";
  if(elApp) elApp.textContent = "Hoy " + texto;
}
actualizarFechaHoy();

function renderAll(){ renderVender(); renderStock(); renderHistorial(); renderReposicion(); renderDashboard(); updateStockAlertDot(); }

/* parallax sutil de los halos de fondo en el login (solo escritorio, se desactiva tras iniciar sesión) */
if(window.matchMedia("(min-width:1024px) and (hover:hover)").matches){
  document.addEventListener("mousemove", (e)=>{
    if(!document.getElementById("loginScreen") || document.getElementById("loginScreen").classList.contains("hidden")) return;
    const x = (e.clientX/window.innerWidth - 0.5) * 2;
    const y = (e.clientY/window.innerHeight - 0.5) * 2;
    document.querySelectorAll(".glow").forEach((g,i)=>{
      const depth = (i+1)*6;
      g.style.marginLeft = (x*depth)+"px";
      g.style.marginTop = (y*depth)+"px";
    });
  });
}
buildNav();
if(state.session){ enterApp(); } else { showLoginScreen(); }
