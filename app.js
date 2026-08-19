// ==================================================================
// ESTADO GLOBAL
// ==================================================================
let supabaseClient = null;
let cache = { leads: [], leads_no_calificados: [], llamadas_pbx: [], llamadas_celular: [], llamadas_whatsapp: [], catalogo: [], llamadas_teams: [] };
let cargaCompleta = { leads: false, leads_no_calificados: false, llamadas_pbx: false, llamadas_celular: false, llamadas_whatsapp: false, catalogo: false, llamadas_teams: false };
let cruceCache = null;
let vistaActual = 'config';
let contenidoModalCelda = '';
let detalleFiltro = null;
let kpi1DetalleCruce = [];
let modoDashboard = 'calificados';

let SB_URL = "https://sbopifiiyezmvsadwkpg.supabase.co";
let SB_KEY = "sb_publishable_1drMMd0cMfJLz0tlEhq1_Q_JLdfpygh";

// PBX API Configuration
let PBX_HOST = "https://api.red.com.sv";
let PBX_USERNAME = "";
let PBX_PASSWORD = "";
let PBX_BEARER_TOKEN = "";
let PBX_PAIS = "SV";

function actualizarPaisPbxDesdeUI() {
  const el = document.getElementById('pbx-pais');
  if (el && el.value) {
    PBX_PAIS = String(el.value).trim().toUpperCase() || 'SV';
  }
}

function getSupabase() {
  if (!supabaseClient) supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);
  return supabaseClient;
}

function mostrarPantallaLogin(mensaje = '') {
  document.getElementById('app-shell')?.classList.add('hidden');
  document.getElementById('login-screen')?.classList.remove('hidden');
  const error = document.getElementById('login-error');
  if (error) error.textContent = mensaje;
}

function mostrarAplicacion() {
  document.getElementById('login-screen')?.classList.add('hidden');
  document.getElementById('app-shell')?.classList.remove('hidden');
}

async function iniciarSesion(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const submit = document.getElementById('login-submit');
  const error = document.getElementById('login-error');

  submit.disabled = true;
  submit.textContent = 'Ingresando...';
  error.textContent = '';
  try {
    const { error: authError } = await getSupabase().auth.signInWithPassword({ email, password });
    if (authError) {
      const mensaje = String(authError.message || '').toLowerCase();
      error.textContent = mensaje.includes('not confirmed')
        ? 'El correo aún no está confirmado en Supabase.'
        : mensaje.includes('invalid login credentials')
          ? 'Correo o contraseña incorrectos. Verifica que uses el mismo correo creado en Supabase.'
          : mensaje.includes('invalid api key')
            ? 'API key de Supabase inválida. Abre Configuración (ícono ⚙️) y actualiza la URL y Anon Key desde tu proyecto Supabase.'
            : `No se pudo iniciar sesión: ${authError.message}`;
    }
  } catch (authError) {
    error.textContent = 'No se pudo conectar con el servicio de autenticación.';
  } finally {
    submit.disabled = false;
    submit.textContent = 'Entrar';
  }
}

async function cerrarSesion() {
  await getSupabase().auth.signOut();
  mostrarPantallaLogin();
}

function mostrarConfiguracionLogin() {
  const mensaje = `Obtén tus credenciales de Supabase:
  
1. Ve a supabase.com y abre tu proyecto
2. Haz clic en "Settings" (Configuración) en la parte inferior del menú
3. Abre "API" en la sección "Configuration"
4. Copia:
   - Project URL → Pégalo en el campo "URL de Supabase"
   - Anon Public Key → Pégalo en "Anon Key de Supabase"
5. Haz clic en "Guardar credenciales"
6. Recarga esta página (Ctrl+F5)
7. Intenta iniciar sesión nuevamente`;
  
  alert(mensaje);
}

function refrescarClienteSupabase() {
  SB_URL = document.getElementById('sb-url').value.trim();
  SB_KEY = document.getElementById('sb-key').value.trim();
  supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);
}

function refrescarCredencialesPBX() {
  const tokenInput = document.getElementById('pbx-bearer');
  if (tokenInput) PBX_BEARER_TOKEN = tokenInput.value.trim();
}

// ==================================================================
// UTILIDADES DE FECHA
// ==================================================================
function obtenerSemanaActual() {
  const hoy = new Date();
  const dia = hoy.getDay();
  const desdeEnDias = dia === 0 ? 6 : dia - 1; // Lunes es 1, domingo es 0
  
  const desde = new Date(hoy);
  desde.setDate(hoy.getDate() - desdeEnDias);
  desde.setHours(0, 0, 0, 0);
  
  const hasta = new Date(desde);
  hasta.setDate(desde.getDate() + 6);
  hasta.setHours(23, 59, 59, 999);
  
  return {
    desde: desde.toISOString().split('T')[0],
    hasta: hasta.toISOString().split('T')[0]
  };
}

function establecerFechasPorDefecto() {
  const semana = obtenerSemanaActual();
  document.getElementById('global-desde').value = semana.desde;
  document.getElementById('global-hasta').value = semana.hasta;
}

function aplicarTema(tema) {
  const esOscuro = tema === 'dark';
  document.body.classList.toggle('theme-dark', esOscuro);
  document.body.classList.toggle('theme-light', !esOscuro);
  localStorage.setItem('dashboard-theme', tema);
  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  if (icon && label) {
    if (esOscuro) {
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"></path>';
      label.textContent = 'Claro';
    } else {
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.36-6.36l-1.42 1.42M7.05 16.95l-1.42 1.42M18.36 18.36l-1.42-1.42M7.05 7.05L5.64 5.64M12 8a4 4 0 100 8 4 4 0 000-8z"></path>';
      label.textContent = 'Oscuro';
    }
  }
}

function toggleTheme() {
  const temaActual = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
  aplicarTema(temaActual === 'dark' ? 'light' : 'dark');
}

function initTheme() {
  const temaGuardado = localStorage.getItem('dashboard-theme');
  const temaPredeterminado = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  aplicarTema(temaGuardado || temaPredeterminado);
}

// ==================================================================
// NAVEGACION
// ==================================================================
function toggleSubmenu(id) { document.getElementById(id).classList.toggle('hidden'); }

function irA(view) {
  vistaActual = view;
  document.querySelectorAll('.sidebar-btn, .sub-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`[data-view="${view}"]`);
  if (btn) btn.classList.add('active');
  render();
}

function alternarDashboard() {
  modoDashboard = modoDashboard === 'calificados' ? 'no-calificados' : 'calificados';
  actualizarMarcaDashboard();
  actualizarMenuDashboard();
  irA(modoDashboard === 'calificados' ? 'reg-leads' : 'reg-no-calificados');
}

function actualizarMarcaDashboard() {
  const titulo = document.getElementById('dashboard-brand-title');
  const subtitulo = document.getElementById('dashboard-brand-subtitle');
  if (titulo) titulo.textContent = modoDashboard === 'calificados' ? 'KPI CITAS' : 'KPI CITAS';
  if (subtitulo) subtitulo.textContent = modoDashboard === 'calificados' ? 'LEADS CALIFICADOS' : 'LEADS NO CALIFICADOS';
}

function actualizarMenuDashboard() {
  document.querySelectorAll('[data-dashboard-mode]').forEach(elemento => {
    elemento.classList.toggle('hidden', elemento.dataset.dashboardMode !== modoDashboard);
  });
}

function render() {
  actualizarPaisPbxDesdeUI();
  const main = document.getElementById('main-content');
  if (vistaActual === 'config') return renderConfig(main);
  if (vistaActual === 'criterios') return renderCriterios(main);
  if (vistaActual === 'reg-pbx') return renderRegistro(main, 'llamadas_pbx', 'Llamadas PBX', 'fecha_hora');
  if (vistaActual === 'reg-cel') return renderRegistro(main, 'llamadas_celular', 'Llamadas Celular', 'fecha');
  if (vistaActual === 'reg-whatsapp') return renderRegistro(main, 'llamadas_whatsapp', 'Llamadas WhatsApp', 'fecha_llamada');
  if (vistaActual === 'reg-leads') return renderRegistro(main, 'leads', 'Leads Calificados', 'fecha_agendada');
  if (vistaActual === 'reg-no-calificados') return renderRegistro(main, 'leads_no_calificados', 'Leads No Calificados', 'created_at');
  if (vistaActual === 'reg-teams') return renderRegistroTeams(main);
  if (vistaActual === 'catalogo') return renderCatalogo(main);
  if (vistaActual === 'res-kpis' || vistaActual === 'res-ejecutivo') return renderResumenKpis(main);
  if (vistaActual === 'res-kpi1') return renderResumenKPI1(main);
  if (vistaActual === 'res-sla') return renderResumenSLA(main);
  if (vistaActual === 'res-retro') return renderResumenRetro(main);
  if (vistaActual === 'res-detalle') return renderDetalleUnificado(main);
}

// ==================================================================
// VISTA: CONFIGURACION
// ==================================================================
function renderConfig(main) {
  main.innerHTML = `
    <div class="max-w-xl bg-[#111827] p-5 rounded-lg border border-gray-800 space-y-4">
      <h2 class="text-sm font-bold text-gray-300 flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        Configuración de Supabase
      </h2>
      <div>
        <label class="block text-xs text-gray-400 mb-1">URL de Supabase</label>
        <input type="text" id="sb-url" value="${SB_URL}" class="w-full p-2 text-xs rounded focus:outline-none focus:border-red-500">
      </div>
      <div>
        <label class="block text-xs text-gray-400 mb-1">Anon Key de Supabase</label>
        <input type="password" id="sb-key" value="${SB_KEY}" class="w-full p-2 text-xs rounded focus:outline-none focus:border-red-500">
      </div>
      <div class="flex gap-2">
        <button onclick="toggleKey()" class="bg-gray-800 text-xs px-3 py-1.5 rounded hover:bg-gray-700 flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
          Ver/Ocultar
        </button>
        <button onclick="refrescarClienteSupabase(); mostrarToast('Credenciales actualizadas.')" class="bg-slate-700 text-xs px-3 py-1.5 rounded hover:bg-slate-600 flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7a4 4 0 100 8 4 4 0 000-8zM12 7v6m3-3H9"></path></svg>
          Guardar credenciales
        </button>
      </div>
      <hr class="border-gray-800">
      <h2 class="text-sm font-bold text-gray-300 flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
        Configuración API PBX
      </h2>
      <div>
        <label class="block text-xs text-gray-400 mb-1">Bearer Token PBX</label>
        <input type="text" id="pbx-bearer" value="${PBX_BEARER_TOKEN}" class="w-full p-2 text-xs rounded bg-gray-900 focus:outline-none focus:border-red-500">
      </div>
      <div class="flex gap-2">
        <button onclick="abrirModalGeneradorToken()" class="flex-1 bg-blue-600 text-xs px-3 py-1.5 rounded hover:bg-blue-500 flex items-center justify-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v2h8z"></path></svg>
          Generar token
        </button>
        <button onclick="refrescarCredencialesPBX(); mostrarToast('Token PBX guardado.')" class="flex-1 bg-slate-700 text-xs px-3 py-1.5 rounded hover:bg-slate-600 flex items-center justify-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7a4 4 0 100 8 4 4 0 000-8zM12 7v6m3-3H9"></path></svg>
          Guardar token
        </button>
      </div>
      <p class="text-[10px] text-gray-400">Genera el JWT desde el botón anterior y luego guárdalo aquí para usarlo en la reproducción y la sincronización.</p>
      <h3 class="text-xs font-bold text-gray-400">Sincronización con la API externa</h3>
      <button onclick="sincronizarAPI()" class="w-full bg-red-700 hover:bg-red-700 text-white font-bold py-2 px-3 text-xs rounded flex items-center justify-center gap-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        Sincronizar API (Edge Function)
      </button>
      <button onclick="recargarTodoYContadores()" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 text-xs rounded flex items-center justify-center gap-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
        Recargar todos los datos
      </button>
      <span id="estado-config" class="text-xs text-red-300 hidden">Procesando...</span>
    </div>`;
}

function toggleKey() {
  const input = document.getElementById('sb-key');
  input.type = input.type === 'password' ? 'text' : 'password';
}

async function resolverAudioPbxPorUniqueid(rawAudioUrl, token) {
  try {
    let url = decodeURIComponent(rawAudioUrl || '').trim();
    if (!url) return rawAudioUrl || '';

    if (!/^https?:\/\//i.test(url)) {
      const base = (PBX_HOST || 'https://api.red.com.sv').replace(/\/$/, '');
      const path = url.startsWith('/') ? url : `/${url}`;
      url = `${base}${path}`;
    }

    const parsed = new URL(url);
    const archivoParam = parsed.searchParams.get('archivo');
    const anio = parsed.searchParams.get('anio');
    const mes = parsed.searchParams.get('mes');
    const dia = parsed.searchParams.get('dia');
    const pais = parsed.searchParams.get('pais');

    if (!archivoParam || !anio || !mes || !dia || !pais) return url;

    const uniqueid = (archivoParam.match(/(\d+\.\d+)\.wav$/i) || [])[1];
    if (!uniqueid) return url;

    const listUrl = `${(PBX_HOST || 'https://api.red.com.sv').replace(/\/$/, '')}/pbx/api/v1/rawCalls?pais=${pais}&anio=${anio}&mes=${mes}&dia=${dia}`;
    const listRes = await fetch(listUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!listRes.ok) return url;

    const listData = await listRes.json().catch(() => null);
    const items = Array.isArray(listData)
      ? listData
      : Array.isArray(listData?.info)
        ? listData.info
        : Array.isArray(listData?.data)
          ? listData.data
          : Array.isArray(listData?.files)
            ? listData.files
            : [];

    const nombreReal = items.find((item) => {
      const name = typeof item === 'string' ? item : (item?.archivo || item?.file || item?.filename || item?.name || item?.url || item?.path || '');
      const match = String(name).match(/(\d+\.\d+)\.wav$/i);
      return match && match[1] === uniqueid;
    });

    if (!nombreReal) return url;
    const nombreArchivo = typeof nombreReal === 'string'
      ? nombreReal
      : (nombreReal.archivo || nombreReal.file || nombreReal.filename || nombreReal.name || nombreReal.url || nombreReal.path || '');

    if (!nombreArchivo) return url;

    const finalUrl = new URL(listUrl);
    finalUrl.searchParams.set('archivo', nombreArchivo);
    return finalUrl.toString();
  } catch (err) {
    return rawAudioUrl || '';
  }
}

async function generarTokenPbxUsuarioPassword(username, password, host = PBX_HOST) {
  const baseHost = (host || 'https://api.red.com.sv').replace(/\/$/, '');
  const res = await fetch(`${baseHost}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.token) {
    throw new Error(data?.message || `No se pudo generar el token PBX (HTTP ${res.status})`);
  }

  return data.token;
}

function abrirModalGeneradorToken() {
  const modalId = 'pbx-token-modal';
  let modal = document.getElementById(modalId);
  if (modal) {
    modal.remove();
  }

  modal = document.createElement('div');
  modal.id = modalId;
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.background = 'rgba(2, 6, 23, 0.72)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '99999';

  modal.innerHTML = `
    <div style="width:min(500px,92vw);background:#111827;border:1px solid rgba(148,163,184,.25);border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.45);padding:24px;color:#e5e7eb;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
        <h3 style="font-size:20px;font-weight:700;">Generar Token JWT</h3>
        <button type="button" onclick="document.getElementById('pbx-token-modal').remove();" style="background:#374151;color:#fff;border:none;border-radius:8px;padding:7px 12px;cursor:pointer;">Cerrar</button>
      </div>
      <p style="font-size:12px;color:#cbd5e1;margin-bottom:16px;">Obtén un token válido con tu usuario y contraseña del PBX. El token expirará en 24 horas.</p>
      <div style="display:grid;gap:14px;">
        <div>
          <label style="display:block;font-size:11px;text-transform:uppercase;color:#9ca3af;margin-bottom:6px;">Usuario</label>
          <input id="pbx-token-user" type="text" value="${PBX_USERNAME || ''}" style="width:100%;background:#0f172a;border:1px solid #334155;border-radius:10px;padding:10px 12px;color:#f8fafc;" />
        </div>
        <div>
          <label style="display:block;font-size:11px;text-transform:uppercase;color:#9ca3af;margin-bottom:6px;">Contraseña</label>
          <input id="pbx-token-pass" type="password" value="${PBX_PASSWORD || ''}" style="width:100%;background:#0f172a;border:1px solid #334155;border-radius:10px;padding:10px 12px;color:#f8fafc;" />
        </div>
        <div id="pbx-token-status" style="display:none;padding:10px 12px;border-radius:10px;font-size:12px;">
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button type="button" id="pbx-token-submit" style="flex:1;background:#2563eb;color:white;border:none;border-radius:10px;padding:11px 14px;font-weight:700;cursor:pointer;">Generar Token</button>
          <button type="button" id="pbx-token-cancel" style="background:#374151;color:white;border:none;border-radius:10px;padding:11px 14px;cursor:pointer;">Limpiar</button>
        </div>
        <div>
          <label style="display:block;font-size:11px;text-transform:uppercase;color:#9ca3af;margin-bottom:6px;">Token JWT</label>
          <textarea id="pbx-token-output" rows="4" style="width:100%;background:#0f172a;border:1px solid #334155;border-radius:10px;padding:10px 12px;color:#f8fafc;resize:vertical;" placeholder="Token generado aparecerá aquí..."></textarea>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button type="button" id="pbx-token-copy" style="flex:1;background:#16a34a;color:white;border:none;border-radius:10px;padding:11px 14px;font-weight:700;cursor:pointer;">Copiar Token</button>
          <button type="button" id="pbx-token-apply" style="flex:1;background:#111827;color:white;border:1px solid rgba(148,163,184,.35);border-radius:10px;padding:11px 14px;font-weight:700;cursor:pointer;">Guardar en configuración</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const statusBox = document.getElementById('pbx-token-status');
  const output = document.getElementById('pbx-token-output');
  const submitBtn = document.getElementById('pbx-token-submit');
  const copyBtn = document.getElementById('pbx-token-copy');
  const applyBtn = document.getElementById('pbx-token-apply');
  const clearBtn = document.getElementById('pbx-token-cancel');

  const setStatus = (msg, ok = false) => {
    statusBox.style.display = 'block';
    statusBox.textContent = msg;
    statusBox.style.background = ok ? 'rgba(22,163,74,0.12)' : 'rgba(239,68,68,0.12)';
    statusBox.style.border = ok ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(239,68,68,0.4)';
    statusBox.style.color = ok ? '#bbf7d0' : '#fecaca';
  };

  submitBtn.addEventListener('click', async () => {
    const username = document.getElementById('pbx-token-user').value.trim();
    const password = document.getElementById('pbx-token-pass').value.trim();
    const host = PBX_HOST || 'https://api.red.com.sv';

    if (!username || !password) {
      setStatus('Debes completar usuario y contraseña.', false);
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Generando...';
      setStatus('Generando token...', false);
      const token = await generarTokenPbxUsuarioPassword(username, password, host);
      output.value = token;
      setStatus('Token generado correctamente.', true);
    } catch (err) {
      setStatus((err && err.message) ? err.message : 'No se pudo generar el token.', false);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Generar Token';
    }
  });

  copyBtn.addEventListener('click', async () => {
    if (!output.value.trim()) {
      setStatus('Primero genera un token.', false);
      return;
    }

    try {
      await navigator.clipboard.writeText(output.value.trim());
      setStatus('Token copiado al portapapeles.', true);
    } catch (err) {
      setStatus('No se pudo copiar automáticamente. Selecciona y copia manualmente.', false);
    }
  });

  applyBtn.addEventListener('click', () => {
    const token = output.value.trim();
    if (!token) {
      setStatus('No hay token generado para guardar.', false);
      return;
    }

    PBX_BEARER_TOKEN = token;
    const tokenInput = document.getElementById('pbx-bearer');
    if (tokenInput) tokenInput.value = PBX_BEARER_TOKEN;

    setStatus('Token guardado en la configuración.', true);
  });

  clearBtn.addEventListener('click', () => {
    output.value = '';
    document.getElementById('pbx-token-user').value = '';
    document.getElementById('pbx-token-pass').value = '';
    statusBox.style.display = 'none';
  });
}

async function reproducirAudioConToken(urlEncoded) {
  try {
    const rawUrl = decodeURIComponent(urlEncoded);
    let resolvedUrl = null;
    try {
      resolvedUrl = await resolverAudioPbxPorUniqueid(rawUrl, PBX_BEARER_TOKEN);
    } catch (e) {
      // Si falla la resolución por uniqueid, continúa con la URL original
    }
    const url = resolvedUrl && resolvedUrl.startsWith('http') ? resolvedUrl : (() => {
      const base = (PBX_HOST || 'https://api.red.com.sv').replace(/\/$/, '');
      const path = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
      return `${base}${path}`;
    })();

    const res = await fetch(`${SB_URL}/functions/v1/sincronizar-datos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SB_KEY}`,
        'apikey': SB_KEY,
        'x-audio-proxy': 'true'
      },
      body: JSON.stringify({
        action: 'pbx-audio',
        audio_url: url,
        pbx_host: PBX_HOST || 'https://api.red.com.sv'
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const existente = document.getElementById('pbx-audio-player');
    if (existente) existente.remove();

    const box = document.createElement('div');
    box.id = 'pbx-audio-player';
    box.style.position = 'fixed';
    box.style.left = '50%';
    box.style.top = '54%';
    box.style.transform = 'translate(-50%, -50%)';
    box.style.zIndex = '9999';
    box.style.background = 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(15,23,42,0.94))';
    box.style.border = '1px solid rgba(96,165,250,0.45)';
    box.style.borderRadius = '14px';
    box.style.padding = '14px';
    box.style.boxShadow = '0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(59,130,246,0.15)';
    box.style.minWidth = '320px';
    box.style.maxWidth = '42vw';
    box.style.width = 'min(420px, 80vw)';
    box.style.backdropFilter = 'blur(2px)';
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:10px;">
        <div style="font-size:12px;font-weight:600;color:#93c5fd;letter-spacing:0.5px;">🎵 REPRODUCCIÓN DE AUDIO</div>
        <button type="button" onclick="document.getElementById('pbx-audio-player').remove();" style="background:rgba(239,68,68,0.1);color:#fca5a5;border:1px solid rgba(239,68,68,0.3);padding:4px 8px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:bold;transition:all 0.2s;">✕</button>
      </div>
      <audio controls autoplay style="width:100%;height:36px;" src="${objectUrl}"></audio>
    `;

    document.body.appendChild(box);
  } catch (err) {
    console.warn('No se pudo reproducir el audio:', err);
  }
}

async function sincronizarAPI() {
  const estado = document.getElementById('estado-config');
  if (estado) { estado.innerText = "Sincronizando API..."; estado.classList.remove('hidden'); }
  try {
    actualizarPaisPbxDesdeUI();
    const res = await fetch(`${SB_URL}/functions/v1/sincronizar-datos`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${SB_KEY}`, 
        'apikey': SB_KEY 
      },
      body: JSON.stringify({
        pbx_host: PBX_HOST,
        pbx_pais: PBX_PAIS || 'SV'
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    mostrarToast('Sincronización completada.');
    await recargarTodoYContadores();
  } catch (err) {
    mostrarToast('Error al sincronizar: ' + err.message, 'error');
  } finally {
    if (estado) estado.classList.add('hidden');
  }
}

// ==================================================================
// VISTA: CRITERIOS
// ==================================================================
function renderCriterios(main) {
  const seccion = (titulo, icono, contenidoHtml) => `
    <div class="bg-[#111827] border border-gray-800 rounded-lg overflow-hidden">
      <div class="bg-[#1e293b] px-4 py-2.5 flex items-center gap-2">
        <span class="text-base">${icono}</span>
        <h3 class="text-xs font-bold text-gray-200 uppercase tracking-wider">${titulo}</h3>
      </div>
      <div class="p-4 text-xs text-gray-300 space-y-3 leading-relaxed">${contenidoHtml}</div>
    </div>`;

  const filaCol = (nombre, explicacion) => `
    <div class="flex gap-3 py-1.5 border-b border-gray-800/60 last:border-0">
      <span class="text-red-300 font-mono font-bold shrink-0 w-44">${nombre}</span>
      <span class="text-gray-400">${explicacion}</span>
    </div>`;

  main.innerHTML = `
    <div class="max-w-4xl space-y-4">
      <div class="bg-[#7f1d1d]/10 border border-red-900 rounded-lg p-4">
        <h2 class="text-sm font-bold text-red-300 mb-1">Criterios de clasificación del dashboard</h2>
        <p class="text-xs text-gray-400">Esta pantalla explica los criterios del cruce, estados y columnas de los resúmenes. Sirve como referencia para entender por qué un lead cae en un grupo u otro.</p>
      </div>
      ${seccion('Estados de cumplimiento (resultado)', '🎯', `
        <div class="space-y-2">
          <div class="flex items-center gap-2"><span class="badge bg-emerald-900 text-emerald-300">Cumplió en fecha y horario</span> <span class="text-gray-400">Llamada/Teams el mismo día, ±5 minutos de la hora agendada. Para Teams: con evidencia URL.</span></div>
          <div class="flex items-center gap-2"><span class="badge bg-amber-900 text-amber-300">Llamó el mismo día fuera de horario</span> <span class="text-gray-400">Llamada en el mismo día, pero fuera de ±5 minutos.</span></div>
          <div class="flex items-center gap-2"><span class="badge bg-orange-900 text-orange-300">Llamó en otra fecha</span> <span class="text-gray-400">Llamada en fecha distinta a la agendada.</span></div>
          <div class="flex items-center gap-2"><span class="badge bg-red-900 text-red-300">Sin llamada encontrada</span> <span class="text-gray-400">No se encontró ninguna llamada coincidente. Para Teams: sin evidencia URL.</span></div>
          <div class="flex items-center gap-2"><span class="badge bg-sky-900 text-sky-300">Pendiente de evaluar</span> <span class="text-gray-400">La hora agendada aún no ha pasado o fecha pendiente.</span></div>
          <div class="flex items-center gap-2"><span class="badge bg-violet-900 text-violet-300">Cumplió con evidencia en Teams</span> <span class="text-gray-400">Reunión Teams con link de evidencia registrado.</span></div>
          <div class="flex items-center gap-2"><span class="badge bg-red-900 text-red-300">Sin evidencia en Teams</span> <span class="text-gray-400">Reunión Teams pendiente de evidencia.</span></div>
        </div>
      `)}
      ${seccion('Metodología del cruce', '🔍', `
        <div class="space-y-2">
          <p><strong>Teléfono:</strong> Se comparan los últimos 8 dígitos del número de teléfono del lead con los registros de llamadas PBX/Celulares.</p>
          <p><strong>Ejecutivo:</strong> Se identifica mediante la extensión (PBX) o usuario (celular) y se valida contra el catálogo de ejecutivos.</p>
          <p><strong>Tolerancia:</strong> ±5 minutos alrededor de la hora agendada. Fuera de este rango es "mismo día fuera de horario".</p>
          <p><strong>Teams:</strong> Se valida por fecha, hora y presencia de link de evidencia (URL).</p>
        </div>
      `)}
      ${seccion('Columnas en Detalle Cumplimiento Leads', '📋', `
        <div class="space-y-2">
          <p><strong>País:</strong> País asignado al lead en el CRM.</p>
          <p><strong>Ejecutivo:</strong> Nombre del ejecutivo asignado al lead.</p>
          <p><strong>Lead / Cliente:</strong> Código y nombre del prospecto.</p>
          <p><strong>Resultado:</strong> Clasificación del estado (Cumplió en fecha y horario, Llamó el mismo día fuera de horario, etc.).</p>
          <p><strong>Fuente:</strong> De dónde se extrajo la llamada: PBX, Celular o Teams.</p>
          <p><strong>Diferencia (min):</strong> Minutos entre la hora agendada y la hora de la llamada (puede ser negativo).</p>
          <p><strong>Duración (seg):</strong> Duración de la llamada en segundos (solo para PBX y Celular).</p>
        </div>
      `)}
    </div>`;
}

// ==================================================================
// VISTA: CATALOGO CON CRUD
// ==================================================================
async function renderCatalogo(main) {
  main.innerHTML = `
    <div class="bg-[#111827] p-4 rounded-lg border border-gray-800">
      <div class="flex flex-wrap justify-between items-center gap-2 mb-3">
        <h2 class="text-sm font-bold text-gray-300 flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          Catálogo de Ejecutivos (CRUD)
        </h2>
        <div class="flex flex-wrap gap-2 items-center">
          <button onclick="abrirModalNuevo()" class="bg-red-700 hover:bg-red-700 text-xs px-3 py-1.5 rounded font-bold flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            Nuevo Ejecutivo
          </button>
          <button onclick="recargarUnaTabla('catalogo','null')" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            Recargar
          </button>
          <button onclick="exportarXLSX('tabla-catalogo','catalogo')" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Exportar XLSX
          </button>
        </div>
      </div>
      <p class="text-[11px] text-gray-500 mb-3">Gestiona la base de datos de ejecutivos. Estos datos se usan para la búsqueda inteligente en los resúmenes de llamadas. Agranda, edita o elimina directamente desde aquí.</p>
      <span id="estado-tabla" class="text-xs text-red-300">Cargando...</span>
      <div class="overflow-auto mt-2" style="max-height: 68vh;">
        <table class="w-full text-left text-xs" id="tabla-catalogo"></table>
      </div>
    </div>`;

  await asegurarCache('catalogo', null);
  document.getElementById('estado-tabla').classList.add('hidden');
  
  const ejecutivosConAcciones = cache.catalogo.map(e => ({
    ...e,
    acciones: `<div class="flex gap-1" style="white-space: nowrap;">
      <button onclick="abrirModalEditar(${e.id})" class="bg-red-600 hover:bg-red-700 text-xs px-2 py-1 rounded flex items-center gap-1">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
      </button>
      <button onclick="confirmarEliminar(${e.id})" class="bg-red-600 hover:bg-red-700 text-xs px-2 py-1 rounded flex items-center gap-1">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
      </button>
    </div>`
  }));

  pintarTablaConFiltros('tabla-catalogo', ejecutivosConAcciones);
}

// ==================================================================
// MODAL CRUD - FUNCIONES
// ==================================================================
function abrirModal() {
  document.getElementById('modal-crud').classList.remove('modal-hidden');
}

function cerrarModal() {
  document.getElementById('modal-crud').classList.add('modal-hidden');
  document.getElementById('form-ejecutivo').reset();
  document.getElementById('ejecutivo-id').value = '';
}

function abrirModalNuevo() {
  document.getElementById('modal-titulo').textContent = 'Nuevo Ejecutivo';
  document.getElementById('ejecutivo-id').value = '';
  document.getElementById('form-ejecutivo').reset();
  abrirModal();
}

async function abrirModalEditar(id) {
  const ejec = cache.catalogo.find(e => e.id === id);
  if (!ejec) return mostrarToast('Ejecutivo no encontrado', 'error');

  document.getElementById('modal-titulo').textContent = 'Editar Ejecutivo';
  document.getElementById('ejecutivo-id').value = ejec.id;
  document.getElementById('ejecutivo-pais').value = ejec.pais || '';
  document.getElementById('ejecutivo-nombre').value = ejec.nombre_ejecutivo || '';
  document.getElementById('ejecutivo-usuario').value = ejec.usuario || '';
  document.getElementById('ejecutivo-extension').value = ejec.extension || '';
  document.getElementById('ejecutivo-celular').value = ejec.celular || '';
  abrirModal();
}

async function guardarEjecutivo(e) {
  e.preventDefault();
  const client = getSupabase();
  
  const id = document.getElementById('ejecutivo-id').value;
  const datos = {
    pais: document.getElementById('ejecutivo-pais').value,
    nombre_ejecutivo: document.getElementById('ejecutivo-nombre').value,
    usuario: document.getElementById('ejecutivo-usuario').value,
    extension: document.getElementById('ejecutivo-extension').value,
    celular: document.getElementById('ejecutivo-celular').value
  };

  try {
    if (id) {
      const { error } = await client.from('catalogo').update(datos).eq('id', parseInt(id));
      if (error) throw error;
      mostrarToast('Ejecutivo actualizado');
    } else {
      const { error } = await client.from('catalogo').insert([datos]);
      if (error) throw error;
      mostrarToast('Ejecutivo agregado');
    }
    
    cargaCompleta.catalogo = false;
    await cargarTablaCompleta('catalogo', null);
    cerrarModal();
    renderCatalogo(document.getElementById('main-content'));
  } catch (err) {
    mostrarToast('Error: ' + err.message, 'error');
  }
}

async function confirmarEliminar(id) {
  if (!confirm('¿Estás seguro que deseas eliminar este ejecutivo?')) return;
  
  const client = getSupabase();
  try {
    const { error } = await client.from('catalogo').delete().eq('id', id);
    if (error) throw error;
    mostrarToast('Ejecutivo eliminado');
    
    cargaCompleta.catalogo = false;
    await cargarTablaCompleta('catalogo', null);
    renderCatalogo(document.getElementById('main-content'));
  } catch (err) {
    mostrarToast('Error: ' + err.message, 'error');
  }
}

// ==================================================================
// CARGA DE DATOS
// ==================================================================
async function cargarTablaCompleta(tabla, orden) {
  const client = getSupabase();
  let todos = [];
  let desde = 0;
  const pageSize = 1000;
  while (true) {
    let q = client.from(tabla).select('*').range(desde, desde + pageSize - 1);
    if (orden) q = q.order(orden, { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    todos = todos.concat(data || []);
    if (!data || data.length < pageSize) break;
    desde += pageSize;
  }
  cache[tabla] = todos;
  cargaCompleta[tabla] = true;
  if (tabla === 'leads_no_calificados' && todos.length === 0) {
    const { data: { session } } = await client.auth.getSession();
    if (!session) throw new Error('La sesión no está disponible para leer Leads No Calificados. Vuelve a iniciar sesión.');
  }
  return todos;
}

async function asegurarCache(tabla, orden) {
  if (tabla === 'leads' || !cargaCompleta[tabla]) await cargarTablaCompleta(tabla, orden);
  return cache[tabla];
}

async function recargarUnaTabla(tabla, columnaFecha) {
  const estado = document.getElementById('estado-tabla');
  if (estado) { estado.innerText = 'Recargando...'; estado.classList.remove('hidden'); }
  try {
    // Asegurar que los leads están cargados si vamos a renderizar PBX
    if ((tabla === 'llamadas_pbx' || tabla === 'llamadas') && (!cache.leads || cache.leads.length === 0)) {
      const sb = getSupabase();
      const { data } = await sb.from('leads').select('*');
      cache.leads = data || [];
      cargaCompleta.leads = true;
    }
    
    const sb = getSupabase();
    const { data } = await sb.from(tabla).select('*');
    cache[tabla] = data || [];
    cargaCompleta[tabla] = true;
    
    const tituloMapa = {
      'llamadas_pbx': 'Llamadas PBX',
      'llamadas_celular': 'Llamadas Celular',
      'llamadas_whatsapp': 'Llamadas WhatsApp',
      'leads_no_calificados': 'Leads No Calificados',
      'leads': 'Leads Calificados',
      'catalogo': 'Catálogo'
    };
    const titulo = tituloMapa[tabla] || tabla;
    const columna = columnaFecha && columnaFecha !== 'null' ? columnaFecha : (tabla === 'llamadas_pbx' ? 'fecha_hora' : tabla === 'llamadas_celular' ? 'fecha' : tabla === 'llamadas_whatsapp' ? 'fecha_llamada' : tabla === 'leads' ? 'fecha_agendada' : 'created_at');
    
    renderRegistro(document.getElementById('main-content'), tabla, titulo, columna);
  } catch (err) {
    const estado = document.getElementById('estado-tabla');
    if (estado) estado.innerText = 'Error: ' + err.message;
  }
}

async function recargarTodoYContadores() {
  console.log('Iniciando recargarTodoYContadores...');
  cargaCompleta = { leads: false, leads_no_calificados: false, llamadas_pbx: false, llamadas_celular: false, llamadas_whatsapp: false, catalogo: false, llamadas_teams: false };
  cruceCache = null;
  try {
    await cargarTablaCompleta('leads', 'fecha_agendada');
    await cargarTablaCompleta('leads_no_calificados', 'created_at');
    await cargarTablaCompleta('llamadas_pbx', 'fecha_hora');
    await cargarTablaCompleta('llamadas_celular', 'fecha');
    await cargarTablaCompleta('llamadas_whatsapp', 'fecha_llamada');
    await cargarTablaCompleta('catalogo', null);
    
    try {
      await cargarTablaCompleta('llamadas_teams', null);
    } catch (teamsErr) {
      console.log('Tabla llamadas_teams no disponible aún (normal si es primera vez)');
      cache.llamadas_teams = [];
      cargaCompleta.llamadas_teams = true;
    }
    
    render();
    console.log('Recargar completado!');
  } catch (err) {
    console.error('Error:', err);
    mostrarToast('Error al recargar: ' + err.message, 'error');
  }
}

// ==================================================================
// BADGES DE ESTADO
// ==================================================================
function badgeEstadoCruce(estado) {
  const map = {
    'Cumplió en fecha y horario': 'bg-emerald-900 text-emerald-300',
    'Llamó el mismo día fuera de horario': 'bg-amber-900 text-amber-300',
    'Llamó en otra fecha': 'bg-orange-900 text-orange-300',
    'Sin llamada encontrada': 'bg-red-900 text-red-300',
    'Pendiente de evaluar': 'bg-sky-900 text-sky-300',
    'Cumplió con evidencia en Teams': 'bg-violet-900 text-violet-300',
    'Sin evidencia en Teams': 'bg-red-900 text-red-300'
  };
  const cls = map[estado] || 'bg-gray-700 text-gray-300';
  return `<span class="badge ${cls}">${estado}</span>`;
}

function badgeCumplio(v) {
  const map = { 'Sí': 'bg-emerald-900 text-emerald-300', 'No': 'bg-red-900 text-red-300', 'Pendiente': 'bg-sky-900 text-sky-300' };
  return `<span class="badge ${map[v] || 'bg-gray-700 text-gray-300'}">${v}</span>`;
}

function claseClasificacion(pctNum, evaluados) {
  if (evaluados === 0) return { texto: 'Sin datos', clase: 'bg-gray-700 text-gray-300' };
  if (pctNum >= 70) return { texto: 'Buen cumplimiento', clase: 'bg-emerald-900 text-emerald-300' };
  if (pctNum > 0) return { texto: 'Cumplimiento parcial', clase: 'bg-amber-900 text-amber-300' };
  return { texto: 'Sin cumplimiento en horario', clase: 'bg-red-900 text-red-300' };
}

// ==================================================================
// TABLA GENERICA CON FILTRO ESTILO EXCEL
// ==================================================================
function obtenerFechaDesdeItem(item, columnaFecha) {
  if (!item) return '';
  const raw = item[columnaFecha]
    || item.fecha_reunion
    || item.fecha_reunión
    || item.fecha_de_reunion
    || item.fecha_de_reunión
    || item.fecha_cita
    || item.fecha
    || item.fecha_hora;
  return raw || '';
}

function filtrarPorFechaGlobal(datos, columnaFecha) {
  if (!columnaFecha) return datos;
  const desde = document.getElementById('global-desde')?.value;
  const hasta = document.getElementById('global-hasta')?.value;
  if (!desde && !hasta) return datos;
  const desdeT = desde ? new Date(desde + 'T00:00:00Z').getTime() : null;
  const hastaT = hasta ? new Date(hasta + 'T23:59:59Z').getTime() : null;
  return datos.filter(item => {
    const raw = obtenerFechaDesdeItem(item, columnaFecha);
    if (!raw) return false;
    const fechaRaw = normalizarFechaISO(String(raw).trim());
    const t = new Date(fechaRaw.includes('T') ? fechaRaw : `${fechaRaw}T00:00:00Z`).getTime();
    if (isNaN(t)) return false;
    if (desdeT !== null && t < desdeT) return false;
    if (hastaT !== null && t > hastaT) return false;
    return true;
  });
}

function obtenerUrlAudio(item) {
  if (!item || typeof item !== 'object') return '';
  const campos = ['grabacion_url', 'audio_url', 'recording_url', 'url_audio', 'link_audio', 'listen_url', 'recording', 'audio'];
  for (const campo of campos) {
    const valor = item[campo];
    if (typeof valor === 'string' && valor.trim()) {
      const texto = valor.trim();
      if (texto.startsWith('/')) return `https://api.red.com.sv${texto}`;
      if (texto.startsWith('http')) return texto;
    }
  }
  return '';
}

function normalizarTelefonoComparable(valor) {
  if (valor === null || valor === undefined) return '';
  const digits = String(valor).replace(/\D/g, '');
  return digits.slice(-8);
}

function obtenerClienteDesdeDestino(destino) {
  if (!destino) return { nombre: '', codigo: '', pais: '' };
  const target8 = normalizarTelefonoComparable(destino);
  if (!target8) return { nombre: '', codigo: '', pais: '' };
  
  const leads = cache.leads || [];

  const lead = leads.find(l => {
    if (!l) return false;
    const candidatos = [
      l.telefono,
      l.telefono_contacto,
      l.contacto,
      l.telefono_cliente,
      l.celular,
      l.numero,
      l.numero_telefonico,
      l.telefono_prospecto
    ];

    return candidatos.some(valor => {
      if (valor == null || valor === '') return false;
      const candidate8 = normalizarTelefonoComparable(valor);
      if (!candidate8) return false;
      return candidate8 === target8 || candidate8.endsWith(target8) || target8.endsWith(candidate8);
    });
  });

  if (!lead) return { nombre: '', codigo: '', pais: '' };
  
  const nombre = lead.nombre_prospecto || lead.nombre || lead.cliente || '';
  const codigo = lead.codigo_prospecto || lead.codigo || lead.lead_id || '';
  const pais = lead.pais || lead.pais_prospecto || '';
  
  return {
    nombre: nombre || '',
    codigo: codigo || '',
    pais: pais || ''
  };
}

const mapaColoresUsuario = new Map();
const paletaColoresUsuarios = [
  'bg-blue-100 dark:bg-blue-950 border-l-4 border-blue-600 dark:border-blue-400',
  'bg-red-100 dark:bg-red-950 border-l-4 border-red-600 dark:border-red-400',
  'bg-green-100 dark:bg-green-950 border-l-4 border-green-600 dark:border-green-400',
  'bg-amber-100 dark:bg-amber-950 border-l-4 border-amber-600 dark:border-amber-400',
  'bg-purple-100 dark:bg-purple-950 border-l-4 border-purple-600 dark:border-purple-400',
  'bg-pink-100 dark:bg-pink-950 border-l-4 border-pink-600 dark:border-pink-400',
  'bg-teal-100 dark:bg-teal-950 border-l-4 border-teal-600 dark:border-teal-400',
  'bg-cyan-100 dark:bg-cyan-950 border-l-4 border-cyan-600 dark:border-cyan-400',
  'bg-orange-100 dark:bg-orange-950 border-l-4 border-orange-600 dark:border-orange-400',
  'bg-indigo-100 dark:bg-indigo-950 border-l-4 border-indigo-600 dark:border-indigo-400',
  'bg-emerald-100 dark:bg-emerald-950 border-l-4 border-emerald-600 dark:border-emerald-400',
  'bg-rose-100 dark:bg-rose-950 border-l-4 border-rose-600 dark:border-rose-400'
];

function normalizarClaveUsuario(valor) {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor).trim();
  if (!texto) return '';
  const sinAcentos = texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-\s]+/g, '')
    .toLowerCase();
  return sinAcentos.replace(/[^a-z0-9]/g, '');
}

function generarColorEjecutivo(ejecutivo) {
  const clave = normalizarClaveUsuario(ejecutivo);
  if (!clave) return '';
  if (!mapaColoresUsuario.has(clave)) {
    const siguienteIndice = mapaColoresUsuario.size % paletaColoresUsuarios.length;
    mapaColoresUsuario.set(clave, paletaColoresUsuarios[siguienteIndice]);
  }
  return mapaColoresUsuario.get(clave);
}

function normalizarFuenteLlamada(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return '';
  const lower = texto.toLowerCase();
  if (lower === 'pbx' || lower === 'issabel') return 'Issabel';
  if (lower === 'celular' || lower === 'cell' || lower === 'mobile') return 'Celular';
  if (lower === 'teams') return 'Teams';
  return texto;
}

function normalizarVistaPbx(item) {
  if (!item || typeof item !== 'object') return item;
  const fechaHora = item.fecha_hora || item.fecha || '';
  const anio = item.anio ?? (fechaHora ? new Date(fechaHora).getFullYear() : '');
  const mes = item.mes ?? (fechaHora ? new Date(fechaHora).getMonth() + 1 : '');
  const dia = item.dia ?? (fechaHora ? new Date(fechaHora).getDate() : '');
  const copia = { ...item };
  const cliente = obtenerClienteDesdeDestino(item.destino);

  delete copia.pais;
  delete copia.PAIS;
  delete copia.fuente;
  delete copia.Fuente;
  delete copia['fuente'];
  delete copia['Fuente'];

  const horaSolo = (() => {
    if (!fechaHora) return '';
    const d = new Date(fechaHora);
    if (Number.isNaN(d.getTime())) return String(fechaHora).split(/[T\s]/)[1]?.slice(0, 8) || '';
    return d.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  })();

  const fechaFormateada = [dia, mes, anio].filter(v => v !== '' && v !== null && v !== undefined).map(v => String(v)).join('/');

  delete copia.audio_url;
  delete copia.grabacion_url;
  delete copia.solo_fecha;
  delete copia.anio;
  delete copia.mes;
  delete copia.dia;
  delete copia.fecha_hora;
  delete copia.fecha;
  delete copia.transcripcion;
  delete copia.resumen_qa;
  delete copia.nombre;
  delete copia.ejecutivo;

  return {
    ...copia,
    'Fuente': 'Issabel',
    'Fecha': fechaFormateada || '',
    'Hora': horaSolo,
    'Ejecutivo': item.nombre || '',
    Escuchar: obtenerUrlAudio(item) || ''
  };
}

function normalizarVistaWhatsapp(item) {
  const fecha = item?.fecha_llamada ? new Date(item.fecha_llamada) : null;
  const fechaValida = fecha && !Number.isNaN(fecha.getTime());
  return {
    'Número ejecutivo': item?.numero_ejecutivo || '',
    'Número cliente': item?.numero_cliente || '',
    'Fecha': fechaValida ? fecha.toLocaleDateString('es-SV') : '',
    'Hora': fechaValida ? fecha.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '',
    'Duración (seg)': item?.duracion_segundos ?? '',
    'Estado': item?.estado || '',
    'Dirección': item?.direccion || '',
    'Medio': item?.medio || ''
  };
}

function normalizarVistaLeadsNoCalificados(item) {
  return {
    'Número de lead': item?.client_id || '',
    'Nombre del lead': item?.client_name || '',
    'Ejecutivo asignado': item?.advisor_name || '',
    'Fecha y hora de entrada': item?.created_at_sv || item?.created_at || ''
  };
}

async function renderRegistro(main, tabla, titulo, columnaFecha) {
  main.innerHTML = `
    <div class="bg-[#111827] p-4 rounded-lg border border-gray-800">
      <div class="flex flex-wrap justify-between items-center gap-2 mb-3">
        <h2 class="text-sm font-bold text-gray-300">${titulo}</h2>
        <div class="flex flex-wrap gap-2 items-center">
          <button onclick="recargarUnaTabla('${tabla}','${columnaFecha||''}')" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            Recargar
          </button>
          <button onclick="exportarXLSX('tabla-dinamica','${tabla}')" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Exportar XLSX
          </button>
          ${tabla === 'llamadas_pbx' ? `
          <label class="text-[11px] text-gray-500">País</label>
          <select id="pbx-pais" onchange="actualizarPaisPbxDesdeUI(); render()" class="p-1.5 text-xs rounded">
            <option value="SV" ${PBX_PAIS === 'SV' ? 'selected' : ''}>SV</option>
            <option value="GT" ${PBX_PAIS === 'GT' ? 'selected' : ''}>GT</option>
          </select>` : ''}
        </div>
      </div>
      <span id="estado-tabla" class="text-xs text-red-300">Cargando...</span>
      <div class="overflow-auto mt-2" style="max-height: 68vh;">
        <table class="w-full text-left text-xs" id="tabla-dinamica"></table>
      </div>
    </div>`;

  await asegurarCache(tabla, columnaFecha);
  if (tabla === 'llamadas_pbx' || tabla === 'llamadas') {
    await asegurarCache('leads', 'fecha_agendada');
  }
  document.getElementById('estado-tabla').classList.add('hidden');
  
  let datosFiltrados = filtrarPorFechaGlobal(cache[tabla], columnaFecha);

  if (tabla === 'llamadas_pbx' || tabla === 'llamadas') {
    actualizarPaisPbxDesdeUI();
    datosFiltrados = datosFiltrados.filter(item => {
      const rawPais = item?.pais ?? item?.PAIS ?? item?.country ?? item?.pais_llamada ?? item?.['Pais'];
      if (rawPais === null || rawPais === undefined || String(rawPais).trim() === '') return true;
      const pais = String(rawPais).trim().toUpperCase();
      return pais === PBX_PAIS;
    });
  }

  if (tabla === 'leads') {
    datosFiltrados = datosFiltrados.map(item => ({
      ...item,
      KPI_ETAPAS: item.KPI_ETAPAS == null ? 0 : item.KPI_ETAPAS,
      KPI_SLA: item.KPI_SLA == null ? 0 : item.KPI_SLA
    }));
  }

  if (tabla === 'llamadas_pbx' || tabla === 'llamadas') {
    datosFiltrados = datosFiltrados.map(item => {
      const normalizado = normalizarVistaPbx(item);
      const limpio = { ...normalizado };
      const keysToDrop = new Set([
        'País', 'Pais', 'pais', 'PAIS', 'pais_llamada', 'Pais llamado',
        'Fuente', 'fuente', 'FUENTE', 'fuente_llamada', 'Fuente llamada',
        'Fuente cruda', 'fuente_cruda', 'source', 'Source'
      ]);
      Object.keys(limpio).forEach((key) => {
        const normalized = normalizarNombreColumna(key);
        if (keysToDrop.has(key) || normalized === 'pais' || normalized === 'fuente' || normalized === 'fuente_llamada' || normalized === 'pais_llamada' || normalized === 'fuente_cruda') {
          delete limpio[key];
        }
      });
      limpio.__fuente_pbx = 'Issabel';
      return limpio;
    });
  }

  if (tabla === 'llamadas_whatsapp') {
    datosFiltrados = datosFiltrados.map(normalizarVistaWhatsapp);
  }

  if (tabla === 'leads_no_calificados') {
    datosFiltrados = datosFiltrados.map(normalizarVistaLeadsNoCalificados);
  }

  if (tabla === 'leads') {
    const vistos = new Set();
    datosFiltrados = datosFiltrados.filter(item => {
      const clave = String(item.codigo_prospecto || item.telefono || item.nombre_prospecto || item.id || '').trim();
      if (!clave) return true;
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    });
    datosFiltrados = datosFiltrados.map(({ opportunity_stage, stage, opportunityStage, ...rest }) => normalizarFilaLeads(rest));
  }

  if (detalleFiltro && detalleFiltro.tabla === tabla) {
    datosFiltrados = aplicarFiltroDetalleRegistro(datosFiltrados, tabla);
    let filtroText = `Mostrando registros de ${tabla === 'llamadas_pbx' || tabla === 'llamadas' ? 'PBX' : 'Celular'}`;
    if (detalleFiltro.ejecutivo) filtroText += ` para ${detalleFiltro.ejecutivo}`;
    if (detalleFiltro.tipoResumen) filtroText += ` (${detalleFiltro.tipoResumen.toUpperCase()})`;
    if (detalleFiltro.telefono) filtroText += ` y teléfono ${detalleFiltro.telefono}`;
    if (detalleFiltro.fecha) filtroText += ` en ${detalleFiltro.fecha}`;
    const estadoEl = document.getElementById('estado-tabla');
    if (estadoEl) {
      estadoEl.classList.remove('hidden');
      estadoEl.innerText = filtroText;
    }
  }

  pintarTablaConFiltros('tabla-dinamica', datosFiltrados);
}

async function renderRegistroTeams(main) {
  main.innerHTML = `
    <div class="bg-[#111827] p-4 rounded-lg border border-gray-800">
      <div class="flex flex-wrap justify-between items-center gap-2 mb-3">
        <h2 class="text-sm font-bold text-gray-300">Reuniones Teams</h2>
        <div class="flex flex-wrap gap-2 items-center">
          <button onclick="renderRegistroTeams(document.getElementById('main-content'))" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            Recalcular
          </button>
          <button onclick="exportarXLSX('tabla-detalle-teams','detalle_teams')" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Exportar XLSX
          </button>
        </div>
      </div>
      <p class="text-[11px] text-gray-500 mb-2">Edita los campos de Fecha reunión, Hora reunión y Evidencia (link) haciendo clic en el icono editar. Se guardan automáticamente en la BD.</p>
      <span id="estado-tabla" class="text-xs text-red-300">Cargando...</span>
      <div class="overflow-auto mt-2" style="max-height: 68vh;">
        <table class="w-full text-left text-xs" id="tabla-detalle-teams"></table>
      </div>
    </div>`;

  const registros = await calcularTeams();
  document.getElementById('estado-tabla').classList.add('hidden');
  
  const detalleConAcciones = registros.map(r => ({
    'País': r.pais,
    'Ejecutivo': r.ejecutivo,
    'Lead': r.codigo_prospecto,
    'Cliente': r.cliente,
    'Fecha reunión': r.fecha_reunion,
    'Hora reunión': r.hora_reunion,
    'Evidencia': r.evidencia_url ? `<a href="${r.evidencia_url}" target="_blank" class="table-button">Revisar reunión</a>` : '(Vacío)',
    'Estado': badgeEstadoCruce(r.estado_cruce),
    'acciones': `<button onclick="abrirModalTeams('${r.teams_codigo}')" class="bg-red-600 hover:bg-red-700 text-xs px-2 py-1 rounded flex items-center gap-1">
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536M9 11l8.768-8.768a2 2 0 112.828 2.828L11.828 13.828a2 2 0 01-.878.515l-4.242 1.060a1 1 0 01-1.213-1.213l1.060-4.242a2 2 0 01.515-.878z"></path></svg>
      Editar
    </button>`
  }));

  pintarTablaConFiltros('tabla-detalle-teams', detalleConAcciones);
}

let filtroColState = {};
window.__datosBase = {};
window.__ultimoFiltrado = {};
window.__tablaRenderizadores = {};

function valorMostrable(v) {
  if (v === null || v === undefined || v === '') return '(Vacío)';
  return String(v);
}

function pintarTablaConFiltros(contId, datosBase) {
  window.__datosBase[contId] = datosBase;
  filtroColState[contId] = filtroColState[contId] || {};
  repintar(contId);
}

function filtrarDatosTabla(contId, datosBase, columnas) {
  const filtros = filtroColState[contId] || {};
  return datosBase.filter(fila => columnas.every(col => {
    const seleccion = filtros[col];
    return !seleccion || seleccion.has(valorMostrable(fila[col]));
  }));
}

function abrirModalCelda(titulo, contenido) {
  const plain = stripHtml(contenido);
  contenidoModalCelda = plain;
  document.getElementById('modal-celda-titulo').textContent = titulo;
  document.getElementById('modal-celda-contenido').textContent = plain;
  document.getElementById('modal-celda').classList.remove('modal-hidden');
}

function stripHtml(html) {
  try {
    const d = document.createElement('div');
    d.innerHTML = html || '';
    return d.textContent || d.innerText || '';
  } catch (err) {
    return String(html || '');
  }
}

function abrirModalCeldaFromEl(el) {
  try {
    const titulo = el.dataset.col || '';
    const contenido = el.dataset.val ? decodeURIComponent(el.dataset.val) : '';
    abrirModalCelda(titulo, contenido);
  } catch (err) {
    console.error('Error abriendo modal desde elemento:', err);
    abrirModalCelda('Contenido', el.textContent || '');
  }
}

function mostrarToast(mensaje, tipo = 'info') {
  const existing = document.getElementById('toast-global');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'toast-global';
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.zIndex = '99999';
  toast.style.maxWidth = '280px';
  toast.style.padding = '10px 14px';
  toast.style.borderRadius = '10px';
  toast.style.fontSize = '12px';
  toast.style.fontWeight = '600';
  toast.style.lineHeight = '1.4';
  toast.style.boxShadow = '0 10px 25px rgba(15, 23, 42, 0.28)';
  toast.style.border = '1px solid rgba(148, 163, 184, 0.3)';
  toast.style.background = tipo === 'error' ? 'rgba(127, 29, 29, 0.92)' : 'rgba(15, 23, 42, 0.9)';
  toast.style.color = '#f8fafc';
  toast.textContent = mensaje;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function abrirDetalleFuente(event, fila) {
  if (!fila) return;
  const fuente = normalizarFuenteLlamada(fila.dataset.fuente || '');
  const telefono = fila.dataset.tel || '';
  const fecha = fila.dataset.fecha || '';
  const registro = fila.dataset.registro || '';
  const registroTabla = fila.dataset.registroTabla || '';
  const fuenteLower = String(fuente || '').trim().toLowerCase();

  if (fuenteLower === 'issabel' || fuenteLower === 'pbx') {
    detalleFiltro = { tabla: 'llamadas_pbx', telefono, fecha, registroId: registro, registroTabla: registroTabla };
    irA('reg-pbx');
  } else if (fuenteLower === 'celular') {
    detalleFiltro = { tabla: 'llamadas_celular', telefono, fecha, registroId: registro, registroTabla: registroTabla };
    irA('reg-cel');
  } else {
    mostrarToast('No hay detalle directo para esta fuente: ' + fuente, 'info');
  }
}

function abrirLeadsDesdeResumen(ejecutivo, tipoResumen) {
  if (typeof ejecutivo !== 'string') ejecutivo = String(ejecutivo || '');
  detalleFiltro = {
    tabla: 'leads',
    ejecutivo: decodeURIComponent(ejecutivo),
    tipoResumen
  };
  irA('reg-leads');
}

function aplicarFiltroDetalleRegistro(datos, tabla) {
  if (!detalleFiltro || detalleFiltro.tabla !== tabla) return datos;
  const telefonoFiltro = normalizarTel(detalleFiltro.telefono);
  const fechaFiltro = detalleFiltro.fecha ? String(detalleFiltro.fecha).split('T')[0] : '';
  const registroFiltro = detalleFiltro.registroId ? String(detalleFiltro.registroId) : '';
  const ejecutivoFiltro = detalleFiltro.ejecutivo ? String(detalleFiltro.ejecutivo).trim().toLowerCase() : '';

  return datos.filter(item => {
    if (registroFiltro) {
      const idMatch = String(item.uniqueid || item.id || '').trim() === registroFiltro.trim();
      if (idMatch) return true;
    }
    if (ejecutivoFiltro) {
      const nombreEjecutivo = String(item.asesor_nombre || item.ejecutivo || '').trim().toLowerCase();
      if (nombreEjecutivo !== ejecutivoFiltro) return false;
    }
    if (telefonoFiltro) {
      const destino = normalizarTel(item.destino);
      if (!destino || destino !== telefonoFiltro) return false;
    }
    if (!fechaFiltro) return true;
    const itemFecha = tabla === 'llamadas_pbx' || tabla === 'llamadas'
      ? (item.fecha_hora || item.fecha || '').split('T')[0]
      : (item.fecha || '').split('T')[0];
    return itemFecha === fechaFiltro;
  });
}

function cerrarModalCelda() {
  document.getElementById('modal-celda').classList.add('modal-hidden');
  contenidoModalCelda = '';
}

function copiarAlPortapapeles() {
  navigator.clipboard.writeText(contenidoModalCelda).then(() => {
    mostrarToast('¡Copiado al portapapeles!');
  }).catch(err => {
    mostrarToast('Error al copiar: ' + err, 'error');
  });
}

const editableColumns = [
  'KPI SLA ETAPA 1',
  'KPI SLA ETAPA 2',
  'KPI SLA ETAPA 3',
  'KPI RETROALIMENTACION ETAPA 1',
  'KPI RETROALIMENTACION ETAPA 2',
  'KPI RETROALIMENTACION ETAPA 3',
  'KPI RETROALIMENTACION ETAPA 4'
];
const normalizeEditableCol = (col) => String(col || '').trim().replace(/[_\s]+/g, ' ').toLowerCase();
const editableColumnsSet = new Set(editableColumns.map(c => normalizeEditableCol(c)).concat(editableColumns.map(c => normalizeEditableCol(c.replace(/\s+/g, '_')))));
const colToDbField = {
  'KPI SLA ETAPA 1': 'kpi_sla_etapa_1',
  'KPI_SLA_ETAPA_1': 'kpi_sla_etapa_1',
  'kpi_sla_etapa_1': 'kpi_sla_etapa_1',
  'KPI SLA ETAPA 2': 'kpi_sla_etapa_2',
  'KPI_SLA_ETAPA_2': 'kpi_sla_etapa_2',
  'kpi_sla_etapa_2': 'kpi_sla_etapa_2',
  'KPI SLA ETAPA 3': 'kpi_sla_etapa_3',
  'KPI_SLA_ETAPA_3': 'kpi_sla_etapa_3',
  'kpi_sla_etapa_3': 'kpi_sla_etapa_3',
  'KPI RETROALIMENTACION ETAPA 1': 'kpi_retroalimentacion_etapa_1',
  'KPI_RETROALIMENTACION_ETAPA_1': 'kpi_retroalimentacion_etapa_1',
  'kpi_retroalimentacion_etapa_1': 'kpi_retroalimentacion_etapa_1',
  'KPI RETROALIMENTACION ETAPA 2': 'kpi_retroalimentacion_etapa_2',
  'KPI_RETROALIMENTACION_ETAPA_2': 'kpi_retroalimentacion_etapa_2',
  'kpi_retroalimentacion_etapa_2': 'kpi_retroalimentacion_etapa_2',
  'KPI RETROALIMENTACION ETAPA 3': 'kpi_retroalimentacion_etapa_3',
  'KPI_RETROALIMENTACION_ETAPA_3': 'kpi_retroalimentacion_etapa_3',
  'kpi_retroalimentacion_etapa_3': 'kpi_retroalimentacion_etapa_3',
  'KPI RETROALIMENTACION ETAPA 4': 'kpi_retroalimentacion_etapa_4',
  'KPI_RETROALIMENTACION_ETAPA_4': 'kpi_retroalimentacion_etapa_4',
  'kpi_retroalimentacion_etapa_4': 'kpi_retroalimentacion_etapa_4'
};

function normalizarNombreColumna(col) {
  return String(col || '').trim().replace(/\s+/g, '_').toLowerCase();
}

function parseBooleanValue(valor) {
  if (typeof valor === 'boolean') return valor;
  const raw = String(valor || '').trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'si' || raw === 'sí' || raw === 'yes';
}

function obtenerClaveFilaRegistro(registro, fallback = '') {
  if (!registro || typeof registro !== 'object') return String(fallback || '');
  const candidatos = [
    registro.__rowKey,
    registro.id,
    registro.__rowId,
    registro.codigo_prospecto,
    registro.codigo,
    registro.lead,
    registro.lead_id,
    registro.nombre_prospecto,
    registro.telefono,
    registro.telefono_contacto,
    registro.contacto,
    registro.cliente
  ];
  for (const valor of candidatos) {
    const texto = String(valor ?? '').trim();
    if (texto) return texto;
  }
  return String(fallback || '');
}

function resolverFilaPorRowId(datos, rowId) {
  if (!Array.isArray(datos)) return null;
  const target = String(rowId ?? '').trim();
  if (!target) return null;
  return datos.find(r => {
    const candidatos = [
      r.__rowKey,
      r.id,
      r.__rowId,
      r.codigo_prospecto,
      r.lead,
      r.codigo,
      r.telefono,
      r.nombre_prospecto
    ];
    return candidatos.some(v => String(v ?? '').trim() === target);
  }) || null;
}

function encontrarLeadRealPorIdentidad(lista, rowId, codigoProspecto = '', idPersistente = '') {
  if (!Array.isArray(lista)) return null;
  const candidatos = [
    String(rowId ?? '').trim(),
    String(codigoProspecto ?? '').trim(),
    String(idPersistente ?? '').trim()
  ].filter(Boolean);
  if (!candidatos.length) return null;

  return lista.find(r => {
    const compare = [
      String(r.__rowKey ?? ''),
      String(r.id ?? ''),
      String(r.__rowId ?? ''),
      String(r.codigo_prospecto ?? ''),
      String(r.lead ?? ''),
      String(r.codigo ?? ''),
      String(r.telefono ?? ''),
      String(r.nombre_prospecto ?? '')
    ].map(v => v.trim());
    return candidatos.some(c => compare.includes(c));
  }) || null;
}

function repintar(contId) {
  const renderizador = window.__tablaRenderizadores[contId];
  if (renderizador) {
    renderizador(window.__datosBase[contId] || []);
    return;
  }
  const datosBase = window.__datosBase[contId] || [];
  const filtros = filtroColState[contId] || {};
  const cont = document.getElementById(contId);
  if (!cont) return;
  if (!datosBase.length) {
    cont.innerHTML = `<tbody><tr><td class="p-4 text-center text-gray-500">No hay registros.</td></tr></tbody>`;
    return;
  }
  const columnas = Object.keys(datosBase[0]).filter(c => {
    const clave = normalizarNombreColumna(c);
    return c !== 'created_at'
      && c !== 'id'
      && !c.startsWith('__')
      && clave !== 'kpi_sla'
      && clave !== 'kpi_etapas';
  });
  const columnasUnicas = [];
  const columnasVistas = new Set();
  for (const col of columnas) {
    const clave = normalizarNombreColumna(col);
    if (columnasVistas.has(clave)) continue;
    columnasVistas.add(clave);
    columnasUnicas.push(col);
  }
  if (contId === 'tabla-dinamica') {
    const codigoColumna = columnasUnicas.find(col => normalizarNombreColumna(col) === 'codigo_prospecto');
    const leadColumna = columnasUnicas.find(col => normalizarNombreColumna(col) === 'lead');
    if (codigoColumna && leadColumna && datosBase.every(fila => String(fila[codigoColumna] ?? '') === String(fila[leadColumna] ?? ''))) {
      columnasUnicas.splice(columnasUnicas.indexOf(leadColumna), 1);
    }
  }
  // Reorder columns: prefer primary fields on the left, push KPI columns to the end
  try {
    const preferredNorm = ['uniqueid','codigo_prospecto','lead','nombre_prospecto','cliente','asesor_nombre','asesor','ejecutivo','telefono','telefono_comparado','telefono_crm','hora_reunion','hora_agendada','fecha_reunion','fecha_agendada','resultado','status','pais','vendedor'];
    const kpis = [];
    const left = [];
    const middle = [];
    const seen = new Set();
    const editableLower = new Set(editableColumns.map(c => String(c).toLowerCase()));

    for (const col of columnasUnicas) {
      const norm = normalizarNombreColumna(col);
      const isKpi = norm.includes('kpi') || editableLower.has(String(col).toLowerCase());
      if (isKpi) { kpis.push(col); continue; }
      const idx = preferredNorm.indexOf(norm);
      if (idx !== -1) {
        if (!seen.has(col)) { left.push({col, idx}); seen.add(col); }
      } else {
        middle.push(col);
      }
    }
    left.sort((a,b)=>a.idx-b.idx);
    middle.sort((a,b) => a.localeCompare(b));
    kpis.sort((a, b) => {
      const ordenKpi = col => {
        const sla = col.match(/^KPI\s+SLA\s+ETAPA\s*(\d+)/i);
        if (sla) return `1_${String(sla[1]).padStart(2,'0')}`;
        const retro = col.match(/^KPI\s+RETROALIMENTACION\s+ETAPA\s*(\d+)/i);
        if (retro) return `2_${String(retro[1]).padStart(2,'0')}`;
        return `3_${String(col).toLowerCase().replace(/\s+/g, ' ')}`;
      };
      const pa = ordenKpi(a);
      const pb = ordenKpi(b);
      if (pa < pb) return -1;
      if (pa > pb) return 1;
      return a.localeCompare(b);
    });
    const newOrder = [...left.map(x=>x.col), ...middle, ...kpis];
    // replace columnasUnicas with ordered list
    columnasUnicas.length = 0;
    columnasUnicas.push(...newOrder);
  } catch (err) {
    // if ordering fails, keep original order
  }
  const editableColumnasLower = new Set(editableColumns.map(c => String(c).toLowerCase()));

  let filtrados = datosBase.filter(fila => {
    return columnasUnicas.every(col => {
      const set = filtros[col];
      if (!set) return true;
      return set.has(valorMostrable(fila[col]));
    });
  });

  window.__ultimoFiltrado[contId] = filtrados;

  const columnDefs = columnasUnicas.map(c => {
    const slaMatch = c.match(/^KPI[_\s]*SLA[_\s]*ETAPA[_\s]*(\d+)/i);
    const retroMatch = c.match(/^KPI[_\s]*RETROALIMENTACION[_\s]*ETAPA[_\s]*(\d+)/i);
    return {
      name: c,
      isSla: Boolean(slaMatch),
      isRetro: Boolean(retroMatch),
      stage: slaMatch ? slaMatch[1] : retroMatch ? retroMatch[1] : null,
      label: c,
      filterable: c !== 'acciones'
    };
  });

  const groupedRows = [];
  const headerRow1 = [];
  const headerRow2 = [];
  for (let i = 0; i < columnDefs.length; ) {
    const col = columnDefs[i];
    if (col.isSla || col.isRetro) {
      const groupName = col.isRetro ? 'KPI RETROALIMENTACION' : 'KPI SLA';
      const groupClass = col.isRetro ? 'group-header-kpi-retro' : 'group-header-kpi-sla';
      const groupCols = [];
      while (i < columnDefs.length && columnDefs[i].isRetro === col.isRetro && columnDefs[i].isSla === col.isSla) {
        groupCols.push(columnDefs[i]);
        i += 1;
      }
      headerRow1.push(`<th class="p-2 ${groupClass}" colspan="${groupCols.length}">${groupName}</th>`);
      for (const inner of groupCols) {
        const activo = filtros[inner.name] ? 'activo' : '';
        headerRow2.push(`<th class="p-2 ${inner.isRetro ? 'col-kpi-retro' : 'col-kpi-sla'}"><div class="kpi-header"><span class="kpi-title">Etapa ${inner.stage}</span></div> <span class="filtro-icono ${activo}" onclick="abrirFiltroColumna('${contId}','${inner.name}', this)">▾</span></th>`);
      }
    } else {
      const activo = filtros[col.name] ? 'activo' : '';
      headerRow1.push(`<th class="p-2" rowspan="2">${col.name} <span class="filtro-icono ${activo}" onclick="abrirFiltroColumna('${contId}','${col.name}', this)">▾</span></th>`);
      i += 1;
    }
  }

  const thead = `<thead><tr>${headerRow1.join('')}</tr>${headerRow2.length ? `<tr>${headerRow2.join('')}</tr>` : ''}</thead>`;

  const columnasExpandibles = ['resumen_qa', 'transcripcion'];

  const filas = filtrados.slice(0, 10000).map((fila, idx) => {
    const ejecutorValue = fila.Ejecutivo || fila.ejecutivo || fila.Usuario || fila.usuario || fila.asesor_nombre || fila.asesor || fila.nombre || fila.operador || '';
    const rowColorKey = ejecutorValue || fila['__telefono_comparado'] || fila.telefono || fila.destino || fila['destino'] || fila['Lead'] || fila['codigo_prospecto'] || `row-${idx}`;
    const rowKey = obtenerClaveFilaRegistro(fila, `row-${idx}`);
    const colorEjecutivo = generarColorEjecutivo(rowColorKey);
    const fuenteFila = normalizarFuenteLlamada(fila.__fuente_pbx || fila['Fuente cruda'] || fila['Fuente'] || '');
    return `<tr class="hover:bg-slate-800/50 ${colorEjecutivo}" data-row="${rowKey}" data-fuente="${fuenteFila}" data-tel="${fila['__telefono_comparado'] || ''}" data-fecha="${fila['__fecha_llamada'] || ''}" data-registro="${fila['__registro_id'] || ''}" data-registro-tabla="${fila['__registro_tabla'] || ''}" onclick="abrirDetalleFuente(event, this)">${columnasUnicas.map(c => {
      const isSla = /^KPI[_\s]*SLA/i.test(c);
      const isRetro = /^KPI[_\s]*RETROALIMENTACION/i.test(c);
      const cellBase = isSla ? 'col-kpi-sla' : isRetro ? 'col-kpi-retro' : '';
      let v = fila[c];
      if (c === 'acciones') return `<td class="p-2 ${cellBase}">${v}</td>`;
      if (c === 'Estado' || c === 'Resultado') return `<td class="p-2 whitespace-nowrap ${cellBase}">${badgeEstadoCruce(v)}</td>`;
      if (c === 'Cumplió') return `<td class="p-2 whitespace-nowrap ${cellBase}">${badgeCumplio(v)}</td>`;
      if (columnasExpandibles.includes(c) && v && String(v).length > 50) {
        const encoded = encodeURIComponent(String(v));
        return `<td class="p-2 max-w-xs ${cellBase}"><span class="celda-expandible" data-col="${c}" data-val="${encoded}" onclick="abrirModalCeldaFromEl(this)">Ver contenido...</span></td>`;
      }
      if (v === null || v === undefined || v === '') v = '<span class="text-gray-500 italic">no especificado</span>';
      const rawValue = String(v);
      const contenidoCelda = /<[^>]+>/.test(rawValue) ? rawValue : rawValue.slice(0,120);
      if (c === 'Evidencia') {
        return `<td class="p-2 text-gray-300 align-top ${cellBase}">${contenidoCelda}</td>`;
      }
      if (c === 'Escuchar') {
        const url = String(v || '').trim();
        const esValida = /^https?:\/\//i.test(url) || /^data:/i.test(url);
        if (!url || !esValida) return `<td class="p-2 text-gray-500 italic ${cellBase}">Sin audio</td>`;
        return `<td class="p-2 whitespace-nowrap ${cellBase}" onclick="event.stopPropagation()">
          <button type="button" class="bg-red-600 hover:bg-red-700 text-[10px] px-2 py-1 rounded" onclick="event.stopPropagation(); reproducirAudioConToken('${encodeURIComponent(url)}')">Escuchar</button>
        </td>`;
      }
      if (editableColumnsSet.has(normalizeEditableCol(c))) {
        const value = (v === true || String(v).toLowerCase() === 'true' || String(v).toLowerCase() === 'si' || String(v).toLowerCase() === 'sí') ? 'true' : 'false';
        const selectedYes = value === 'true' ? 'selected' : '';
        const selectedNo = value === 'false' ? 'selected' : '';
        const rowKey = obtenerClaveFilaRegistro(fila, `row-${idx}`);
        return `<td class="p-2 max-w-[140px] ${cellBase}"><div class="kpi-cell"><select class="kpi-select ${value === 'true' ? 'kpi-yes' : 'kpi-no'}" data-cont="${contId}" data-row="${rowKey}" data-col="${c}" onchange="actualizarEditable(this.dataset.cont, this.dataset.row, this.dataset.col, this.value)" onclick="event.stopPropagation()"><option value="false" ${selectedNo}>No</option><option value="true" ${selectedYes}>Sí</option></select></div></td>`;
      }
      return `<td class="p-2 whitespace-nowrap text-gray-300 ${cellBase}">${contenidoCelda}</td>`;
    }).join('')}</tr>`;
  }).join('');

  cont.innerHTML = thead + `<tbody>${filas || `<tr><td class="p-4 text-center text-gray-500" colspan="${columnasUnicas.length}">Sin resultados con esos filtros.</td></tr>`}</tbody>`;

  const contador = document.getElementById('estado-tabla');
  if (contador) { contador.classList.remove('hidden'); contador.innerText = `${filtrados.length.toLocaleString()} de ${datosBase.length.toLocaleString()} registros (mostrando máx. 10000 en pantalla; XLSX exporta todo lo filtrado)`; }
}

let cfpState = null;

function abrirFiltroColumna(contId, col, btnEl) {
  const datosBase = window.__datosBase[contId] || [];
  const valoresUnicos = Array.from(new Set(datosBase.map(f => valorMostrable(f[col])))).sort((a,b)=>a.localeCompare(b));
  const actual = filtroColState[contId][col];
  const seleccion = actual ? new Set(actual) : new Set(valoresUnicos);

  cfpState = { contId, col, valoresUnicos, seleccion, esResumen: false };

  const popup = document.getElementById('col-filter-popup');
  const rect = btnEl.getBoundingClientRect();
  popup.style.top = (rect.bottom + window.scrollY + 4) + 'px';
  popup.style.left = Math.max(8, rect.left + window.scrollX - 200) + 'px';
  popup.classList.remove('hidden');
  document.getElementById('cfp-search').value = '';
  cfpPintarLista(valoresUnicos);
}

function cfpPintarLista(valores) {
  const lista = document.getElementById('cfp-lista');
  if (!lista || !Array.isArray(valores)) return;
  lista.innerHTML = valores.map(v => {
    const checked = cfpState && cfpState.seleccion && cfpState.seleccion.has(v) ? 'checked' : '';
    const safe = String(v || '').replace(/"/g, '&quot;');
    return `<label class="cfp-item"><input type="checkbox" data-val="${safe}" ${checked} onchange="cfpToggle(this)"> <span class="truncate">${v}</span></label>`;
  }).join('');
}

function cfpToggle(input) {
  if (!cfpState || !cfpState.seleccion) return;
  const v = input.dataset.val;
  if (input.checked) cfpState.seleccion.add(v);
  else cfpState.seleccion.delete(v);
  cfpAceptar();
}

function cfpFiltrarLista() {
  if (!cfpState || !Array.isArray(cfpState.valoresUnicos)) return;
  const q = document.getElementById('cfp-search').value.toLowerCase().trim();
  const filtrados = cfpState.valoresUnicos.filter(v => String(v || '').toLowerCase().includes(q));
  cfpPintarLista(filtrados);
  
  if (q.length > 0) {
    cfpState.seleccion.clear();
    filtrados.forEach(v => cfpState.seleccion.add(v));
  } else {
    cfpState.seleccion.clear();
    cfpState.valoresUnicos.forEach(v => cfpState.seleccion.add(v));
  }
  cfpAceptar();
}

function cfpSeleccionarTodos() {
  cfpState.valoresUnicos.forEach(v => cfpState.seleccion.add(v));
  cfpFiltrarLista();
}
function cfpBorrar() {
  cfpState.seleccion.clear();
  cfpFiltrarLista();
}
function cfpCancelar() {
  cfpCerrar();
}
function cfpAceptar() {
  if (cfpState.esResumen) {
    aplicarFiltroResumen();
  } else {
    const { contId, col, valoresUnicos, seleccion } = cfpState;
    if (seleccion.size === valoresUnicos.length || seleccion.size === 0) {
      delete filtroColState[contId][col];
    } else {
      filtroColState[contId][col] = new Set(seleccion);
    }
    repintar(contId);
  }
}

function cfpCerrar() {
  document.getElementById('col-filter-popup').classList.add('hidden');
  cfpState = null;
}
document.addEventListener('click', (e) => {
  const popup = document.getElementById('col-filter-popup');
  if (!popup.classList.contains('hidden') && !popup.contains(e.target) && !e.target.classList.contains('filtro-icono')) {
    popup.classList.add('hidden');
    cfpState = null;
  }
});

// ==================================================================
// EXPORTAR XLSX
// ==================================================================
function exportarXLSX(contId, nombre) {
  const datos = window.__ultimoFiltrado[contId] || cache[nombre] || [];
  if (!datos.length) return mostrarToast('No hay datos para exportar.', 'error');
  const ws = XLSX.utils.json_to_sheet(datos.map(({acciones, __rowId, ...d}) => d));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nombre.slice(0, 30));
  XLSX.writeFile(wb, `${nombre}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function exportarXLSXGenerico(datos, nombre) {
  if (!datos || datos.length === 0) return mostrarToast('No hay datos para exportar.', 'error');
  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nombre.slice(0, 30));
  XLSX.writeFile(wb, `${nombre}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ==================================================================
// MOTOR DE CRUCE UNIFICADO (LLAMADAS + TEAMS)
// ==================================================================
function normalizarTel(tel) {
  if (!tel) return '';
  return String(tel).replace(/\D/g, '').slice(-8);
}

function normalizarFechaISO(fecha) {
  if (!fecha) return '';
  let raw = String(fecha).trim();
  // Aceptar formatos comunes: YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY, DD-MM-YYYY
  const isoDateMatch = raw.match(/^(\d{4})[\/-](\d{2})[\/-](\d{2})$/);
  if (isoDateMatch) {
    return `${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`;
  }
  const latamMatch = raw.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (latamMatch) {
    return `${latamMatch[3]}-${latamMatch[2]}-${latamMatch[1]}`;
  }
  return raw;
}

function parseFechaHora(fecha, hora) {
  if (!fecha) return null;
  let base = normalizarFechaISO(String(fecha).trim());
  base = base.includes('T') ? base.split('T')[0] : base;
  let h = hora ? String(hora).trim() : '00:00:00';
  if (h.length === 5) h += ':00';
  const d = new Date(`${base}T${h}`);
  return isNaN(d.getTime()) ? null : d;
}

function parseFechaHoraString(fechaHora) {
  if (!fechaHora) return null;
  const raw = String(fechaHora).trim();
  const normalized = raw.replace(/\//g, '-');
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})(?:[ T])(\d{2}:\d{2}(?::\d{2})?)(?:\.\d+)?(?:\s*(?:Z|[+-]\d{2}:?\d{2}))?$/);
  if (match) {
    let time = match[2];
    if (time.length === 5) time += ':00';
    return new Date(`${match[1]}T${time}`);
  }
  const latamMatch = normalized.match(/^(\d{2})-(\d{2})-(\d{4})(?:[ T])(\d{2}:\d{2}(?::\d{2})?)(?:\.\d+)?(?:\s*(?:Z|[+-]\d{2}:?\d{2}))?$/);
  if (latamMatch) {
    let time = latamMatch[4];
    if (time.length === 5) time += ':00';
    return new Date(`${latamMatch[3]}-${latamMatch[2]}-${latamMatch[1]}T${time}`);
  }
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

function obtenerLeadTipo(lead) {
  return (lead?.tipo_reunion || lead?.tipo || lead?.tipo_de_llamada || lead?.tipo_llamada || lead?.tipo_lead || lead?.tipo_de_reunion || lead?.tipo_reunión || '').trim();
}

function obtenerLeadFecha(lead) {
  return lead?.fecha_agendada || lead?.fecha_reunion || lead?.fecha_reunión || lead?.fecha_de_reunion || lead?.fecha_de_reunión || lead?.fecha_cita || lead?.fecha || '';
}

function obtenerLeadHora(lead) {
  return lead?.hora_agendada || lead?.hora_reunion || lead?.hora_reunión || lead?.hora_de_reunion || lead?.hora_de_reunión || lead?.hora_cita || lead?.hora || '';
}

function mismoDia(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function hhmmssASegundos(str) {
  if (!str) return null;
  const partes = String(str).split(':').map(Number);
  if (partes.some(isNaN)) return null;
  if (partes.length === 3) return partes[0] * 3600 + partes[1] * 60 + partes[2];
  if (partes.length === 2) return partes[0] * 60 + partes[1];
  return null;
}

function segundosAMinutos(seg) {
  if (seg === null || seg === undefined) return null;
  return Math.round(seg / 60 * 10) / 10;
}

function segundosAHoras(seg) {
  if (seg === null || seg === undefined) return null;
  return Math.round(seg / 3600 * 10) / 10;
}

function minutosAHoras(min) {
  if (min === null || min === undefined) return null;
  return Math.round(min / 60 * 10) / 10;
}

function formatearFechaCorta(d) {
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function esFechaServidorCaido(dateLike) {
  if (!dateLike) return false;
  const fecha = parseFecha(dateLike);
  if (!fecha) return false;
  const objetivo = new Date('2026-08-03T00:00:00');
  return fecha.getFullYear() === objetivo.getFullYear()
    && fecha.getMonth() === objetivo.getMonth()
    && fecha.getDate() === objetivo.getDate();
}

function parseFecha(fecha) {
  if (!fecha) return null;
  if (fecha instanceof Date && !Number.isNaN(fecha.getTime())) return fecha;
  const valor = String(fecha).trim();
  if (!valor) return null;
  const isoCalendario = valor.match(/^(\d{4})[\/-](\d{2})[\/-](\d{2})(?:$|[T\s])/);
  if (isoCalendario) {
    const d = new Date(Number(isoCalendario[1]), Number(isoCalendario[2]) - 1, Number(isoCalendario[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = new Date(valor);
  if (!Number.isNaN(iso.getTime())) return iso;
  const partes = valor.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (partes) {
    const dia = Number(partes[1]);
    const mes = Number(partes[2]) - 1;
    const anio = Number(partes[3].length === 2 ? `20${partes[3]}` : partes[3]);
    const d = new Date(anio, mes, dia);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatearFechaValor(fecha) {
  const valor = String(fecha || '').trim();
  const isoCalendario = valor.match(/^(\d{4})[\/-](\d{2})[\/-](\d{2})(?:$|[T\s])/);
  if (isoCalendario) return `${isoCalendario[3]}/${isoCalendario[2]}/${isoCalendario[1]}`;
  const latamCalendario = valor.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})(?:$|[T\s])/);
  if (latamCalendario) return `${latamCalendario[1]}/${latamCalendario[2]}/${latamCalendario[3]}`;
  const d = parseFecha(valor);
  if (!d) return String(fecha || '');
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}
function formatearHoraCorta(d) {
  if (!d) return '';
  return d.toTimeString().slice(0, 8);
}

function claseResultado(resultado) {
  const value = String(resultado || '').toLowerCase();
  if (value.includes('cumplió en fecha y horario') || value.includes('cumplió con evidencia en teams')) return 'result-badge result-cumplio';
  if (value.includes('llamó el mismo día fuera de horario')) return 'result-badge result-fuera';
  if (value.includes('llamó en otra fecha')) return 'result-badge result-otra';
  if (value.includes('sin llamada') || value.includes('sin evidencia')) return 'result-badge result-sin';
  if (value.includes('pendiente')) return 'result-badge result-pendiente';
  return 'result-badge result-default';
}

function esReunionTeams(tipo) {
  const valor = (tipo || '').toLowerCase();
  return valor.includes('teams') || valor.includes('virtual') || valor.includes('zoom');
}

function esLlamadaTelefonica(tipo) {
  const valor = (tipo || '').toLowerCase();
  return (valor.includes('llamada') || valor.includes('telef') || valor.includes('phone')) && !valor.includes('teams');
}

async function calcularCruceUnificado() {
  await Promise.all([
    asegurarCache('leads', 'fecha_agendada'),
    asegurarCache('llamadas_pbx', 'fecha_hora'),
    asegurarCache('llamadas_celular', 'fecha'),
    asegurarCache('catalogo', null),
    asegurarCache('llamadas_teams', null)
  ]);

  let leads = cache.leads.filter(l => {
    const tipo = obtenerLeadTipo(l);
    return esLlamadaTelefonica(tipo) || esReunionTeams(tipo);
  });
  leads = filtrarPorFechaGlobal(leads, 'fecha_agendada');
  const ahora = new Date();

  const resultado = leads.map(lead => {
    const telLead = normalizarTel(lead.telefono);
    const progr = parseFechaHora(
      obtenerLeadFecha(lead),
      obtenerLeadHora(lead)
    );
    const tipoLead = obtenerLeadTipo(lead);
    const esTeams = esReunionTeams(tipoLead);
    const esLlamada = esLlamadaTelefonica(tipoLead);
    
    const ejec = cache.catalogo.find(e => (e.nombre_ejecutivo || '').trim().toLowerCase() === (lead.asesor_nombre || '').trim().toLowerCase());
    const usuario = ejec ? ejec.usuario : null;
    let usuarioNorm = '';
    let candidatas = [];
    let delDia = [];

    let estado = 'Sin llamada encontrada';
    let coincidencia = null;
    let diferenciaMin = null;
    let fuente = '';

    if (esTeams) {
      const teamsData = (cache.llamadas_teams || []).find(t => t.codigo_prospecto === lead.codigo_prospecto);
      if (teamsData && teamsData.evidencia_url) {
        estado = 'Cumplió con evidencia en Teams';
        fuente = 'Teams';
      } else {
        estado = teamsData ? 'Sin evidencia en Teams' : 'Sin llamada encontrada';
        if (!teamsData && progr) {
          const limite = new Date(progr.getTime() + 5 * 60000);
          if (ahora < limite) estado = 'Pendiente de evaluar';
        }
        fuente = 'Teams';
      }
    } else if (esLlamada) {
      const candPBX = cache.llamadas_pbx
        .filter(c => normalizarTel(c.destino) === telLead && telLead)
        .map(c => {
          const rawFechaHora = c.fecha_hora || (c.fecha && c.hora ? `${String(c.fecha).trim()}T${String(c.hora).trim()}` : '');
          return {
            fuente: 'Issabel',
            fechaHora: parseFechaHoraString(rawFechaHora),
            raw: c,
            operador: String(c.nombre || c.usuario || '').trim().toLowerCase()
          };
        });

      const candCelRaw = cache.llamadas_celular
        .filter(c => telLead && normalizarTel(c.destino) === telLead)
        .map(c => ({
          destino: c.destino,
          destinoNorm: normalizarTel(c.destino),
          tipo: c.tipo,
          usuario: c.usuario,
          fecha: c.fecha,
          hora: c.hora,
          raw: c
        }));
      const candCel = candCelRaw
        .filter(c => (c.raw.tipo || '').toLowerCase() === 'saliente')
        .map(c => {
          const fBase = c.raw.fecha ? String(c.raw.fecha).split('T')[0] : null;
          const fh = fBase && c.raw.hora ? new Date(`${fBase}T${c.raw.hora}`) : null;
          return { fuente: 'Celular', fechaHora: fh, raw: c.raw, operador: String(c.raw.usuario || '').trim().toLowerCase() };
        });

      candidatas = [...candPBX, ...candCel].filter(c => c.fechaHora && !isNaN(c.fechaHora.getTime()));
      usuarioNorm = usuario ? String(usuario).trim().toLowerCase() : '';

      if (progr && candidatas.length) {
        const delDia = candidatas.filter(c => mismoDia(c.fechaHora, progr));
        const horaProgr = progr.getHours();
        const horaCruda = c => {
          const raw = c.raw;
          if (!raw) return null;
          const valor = String(raw.fecha_hora || raw.hora || raw.fecha || '');
          const match = valor.match(/(\d{2}):(\d{2})(?::\d{2})?/);
          return match ? Number(match[1]) : null;
        };
        const obtenerHora = c => c.fechaHora ? c.fechaHora.getHours() : horaCruda(c);

        const elegirMasCercana = arr => arr.reduce((mejor, actual) => {
          if (!mejor) return actual;
          const diffMejor = Math.abs(mejor.fechaHora - progr);
          const diffActual = Math.abs(actual.fechaHora - progr);
          return diffActual < diffMejor ? actual : mejor;
        }, null);

        const elegirConPreferenciaOperador = (arr) => {
          if (!usuarioNorm) return elegirMasCercana(arr);
          const byOp = arr.filter(c => (c.operador || '').toLowerCase() === usuarioNorm);
          return byOp.length ? elegirMasCercana(byOp) : elegirMasCercana(arr);
        };

        // 1) Prefer a call on the scheduled hour, prioritizing same day first
        const sameHourDay = candidatas.filter(c => mismoDia(c.fechaHora, progr) && obtenerHora(c) === horaProgr);
        const sameHourAny = candidatas.filter(c => obtenerHora(c) === horaProgr);
        if (sameHourDay.length) {
          coincidencia = elegirConPreferenciaOperador(sameHourDay);
          diferenciaMin = Math.round(Math.abs(coincidencia.fechaHora - progr) / 60000);
          estado = diferenciaMin <= 5 ? 'Cumplió en fecha y horario' : 'Llamó el mismo día fuera de horario';
          fuente = coincidencia.fuente;
        } else if (sameHourAny.length) {
          coincidencia = elegirConPreferenciaOperador(sameHourAny);
          diferenciaMin = Math.round(Math.abs(coincidencia.fechaHora - progr) / 60000);
          estado = mismoDia(coincidencia.fechaHora, progr)
            ? (diferenciaMin <= 5 ? 'Cumplió en fecha y horario' : 'Llamó el mismo día fuera de horario')
            : 'Llamó en otra fecha';
          fuente = coincidencia.fuente;
        } else {
          // 2) Prefer any call on the same day
          if (delDia.length) {
            coincidencia = elegirConPreferenciaOperador(delDia);
            diferenciaMin = Math.round(Math.abs(coincidencia.fechaHora - progr) / 60000);
            estado = diferenciaMin <= 5 ? 'Cumplió en fecha y horario' : 'Llamó el mismo día fuera de horario';
            fuente = coincidencia.fuente;
          } else {
            // 3) fallback: closest overall
            coincidencia = elegirConPreferenciaOperador(candidatas);
            diferenciaMin = Math.round(Math.abs(coincidencia.fechaHora - progr) / 60000);
            estado = 'Llamó en otra fecha';
            fuente = coincidencia.fuente;
          }
        }
      } else if (progr) {
        const limite = new Date(progr.getTime() + 5 * 60000);
        estado = ahora < limite ? 'Pendiente de evaluar' : 'Sin llamada encontrada';
      }

    }

    const diferenciaMinFirmada = coincidencia && progr
      ? Math.round(((coincidencia.fechaHora - progr) / 60000) * 10) / 10
      : null;

    if (esFechaServidorCaido(obtenerLeadFecha(lead)) && ['Sin llamada encontrada', 'Llamó el mismo día fuera de horario', 'Llamó en otra fecha', 'Sin evidencia en Teams', 'No cumplió'].some(v => estado.includes(v))) {
      estado = 'Pendiente de evaluar';
      fuente = 'Pendiente';
    }

    const diferenciaHoras = minutosAHoras(diferenciaMinFirmada);

    const fuenteNormalizada = normalizarFuenteLlamada(coincidencia?.fuente || fuente || '');
    const rawFechaLlamada = coincidencia
      ? String(fuenteNormalizada === 'Issabel' ? coincidencia.raw.fecha_hora || '' : coincidencia.raw.fecha || '').trim()
      : '';
    const rawHoraLlamada = coincidencia
      ? fuenteNormalizada === 'Issabel'
        ? (String(coincidencia.raw.fecha_hora || '').trim().split(/T| /)[1] || '').slice(0, 8)
        : String(coincidencia.raw.hora || '').trim()
      : '';

    let duracionSeg = null;
    let duracionMin = null;
    let estadoTipo = '';
    if (coincidencia) {
      if (fuenteNormalizada === 'Issabel') {
        duracionSeg = coincidencia.raw.duracion_segundos != null ? Number(coincidencia.raw.duracion_segundos) : hhmmssASegundos(coincidencia.raw.duracion_hh_mm_ss);
        duracionMin = segundosAMinutos(duracionSeg);
        estadoTipo = coincidencia.raw.estado || '';
      } else if (fuenteNormalizada === 'Celular') {
        duracionSeg = hhmmssASegundos(coincidencia.raw.duracion);
        duracionMin = segundosAMinutos(duracionSeg);
        estadoTipo = (coincidencia.raw.tipo || '').toUpperCase();
      }
    }

    const outObj = {
      pais: lead.pais || 'N/D',
      ejecutivo: lead.asesor_nombre || 'Sin asignar',
      lead: lead.codigo_prospecto || '',
      cliente: lead.nombre_prospecto || '',
      telefono: fuente === 'Teams' ? '' : lead.telefono,
      fecha_reunion: lead.fecha_agendada,
      hora_reunion: lead.hora_agendada,
      resultado: estado,
      cumplio: estado === 'Cumplió en fecha y horario' || estado === 'Cumplió con evidencia en Teams' ? 'Sí' : 'No',
      fuente: normalizarFuenteLlamada(fuente || 'Issabel'),
      fecha_contacto: (coincidencia && coincidencia.fechaHora) ? formatearFechaCorta(coincidencia.fechaHora) : '',
      hora_contacto: (coincidencia && coincidencia.fechaHora) ? formatearHoraCorta(coincidencia.fechaHora) : '',
      diferencia_min: diferenciaMin,
      duracion_seg: duracionSeg,
      estado_llamada: estadoTipo || '',
      intentos_mismo_dia: Array.isArray(delDia) ? delDia.length : 0,
      intentos_totales: Array.isArray(candidatas) ? candidatas.length : 0,
      catalogo_ok: ejec ? 'Sí' : 'No',
      observacion: coincidencia?.raw?.observacion || coincidencia?.raw?.nota || coincidencia?.raw?.detalle || coincidencia?.raw?.comentario || '',
      vendedor_extension: fuenteNormalizada === 'Issabel' ? (coincidencia?.raw?.usuario || coincidencia?.raw?.nombre || '') : ''
    };
    return outObj;
  });

  return resultado;
}

function calcularFilaTotal(datos) {
  const total = { pais: 'TOTAL', leads: 0, evaluados: 0, cumplieron: 0, fuera_horario: 0, otra_fecha: 0, sin_llamada: 0, pendientes: 0, no_cumplieron: 0 };
  datos.forEach(d => {
    total.leads += d.leads; total.evaluados += d.evaluados; total.cumplieron += d.cumplieron;
    total.fuera_horario += d.fuera_horario; total.otra_fecha += d.otra_fecha; total.sin_llamada += d.sin_llamada;
    total.pendientes += d.pendientes; total.no_cumplieron += d.no_cumplieron;
  });
  const base = total.evaluados;
  const pctNum = base > 0 ? (total.cumplieron / base) * 100 : 0;
  total.pct_num = pctNum;
  total.pct_cumplimiento = base > 0 ? pctNum.toFixed(1) + '%' : '—';
  return total;
}

function nombrePais(codigo) {
  const NOMBRES_PAIS = {
    SV: 'El Salvador', GT: 'Guatemala', HN: 'Honduras', NI: 'Nicaragua',
    CR: 'Costa Rica', PA: 'Panamá', MX: 'México', US: 'Estados Unidos'
  };
  if (!codigo || codigo === 'N/D') return 'Sin país';
  return NOMBRES_PAIS[codigo] || codigo;
}

function crearIdEjecutivo(ejecutivo) {
  return String(ejecutivo || 'sin-asignar').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sin-asignar';
}

function construirResumenMaestra(cruce) {
  return cruce.map(r => ({
    pais: r.pais,
    ejecutivo: r.ejecutivo,
    lead: r.lead,
    resultado: r.resultado,
    telefono: r.telefono || '',
    fecha_reunion: formatearFechaValor(r.fecha_reunion || ''),
    hora_reunion: r.hora_reunion || '',
    fecha_llamada: r.fecha_llamada_corta || '',
    hora_llamada: r.hora_llamada_corta || '',
    kpi_sla_etapa_1: r.kpi_sla_etapa_1 ? 'Sí' : 'No',
    kpi_sla_etapa_2: r.kpi_sla_etapa_2 ? 'Sí' : 'No',
    kpi_sla_etapa_3: r.kpi_sla_etapa_3 ? 'Sí' : 'No',
    kpi_retroalimentacion_etapa_1: r.kpi_retroalimentacion_etapa_1 ? 'Sí' : 'No',
    kpi_retroalimentacion_etapa_2: r.kpi_retroalimentacion_etapa_2 ? 'Sí' : 'No',
    kpi_retroalimentacion_etapa_3: r.kpi_retroalimentacion_etapa_3 ? 'Sí' : 'No',
    kpi_retroalimentacion_etapa_4: r.kpi_retroalimentacion_etapa_4 ? 'Sí' : 'No',
    rowId: crearIdEjecutivo(r.ejecutivo)
  }));
}

function construirResumenPorEjecutivo(cruce) {
  const grupos = {};
  cruce.forEach(r => {
    const nombre = String(r.ejecutivo || 'Sin asignar').trim();
    const key = nombre.toLowerCase();
    if (!grupos[key]) {
      grupos[key] = {
        pais: r.pais || 'N/D',
        ejecutivo: nombre || 'Sin asignar',
        leads: 0,
        cumplidos: 0
      };
    }
    grupos[key].leads++;
    if (r.resultado === 'Cumplió en fecha y horario' || r.resultado === 'Cumplió con evidencia en Teams') {
      grupos[key].cumplidos++;
    }
  });
  return Object.values(grupos).map(g => ({
    ...g,
    pct_cumplimiento: g.leads > 0 ? Math.round((g.cumplidos / g.leads) * 100) + '%' : '0%'
  })).sort((a, b) => nombrePais(a.pais).localeCompare(nombrePais(b.pais)) || a.ejecutivo.localeCompare(b.ejecutivo));
}

function pintarTablaResumenMaestra(datos) {
  const cols = [
    { key: 'pais', label: 'País' },
    { key: 'ejecutivo', label: 'Ejecutivo' },
    { key: 'lead', label: 'Lead / Cliente' },
    { key: 'resultado', label: 'Resultado' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'fecha_reunion', label: 'Fecha reunión' },
    { key: 'hora_reunion', label: 'Hora reunión' },
    { key: 'fecha_llamada', label: 'Fecha llamada' },
    { key: 'hora_llamada', label: 'Hora llamada' },
    { key: 'kpi_sla_etapa_1', labelTitle: 'KPI 2', labelSubtitle: 'Etapa 1', kpiGroup: 'kpi2' },
    { key: 'kpi_sla_etapa_2', labelTitle: 'KPI 2', labelSubtitle: 'Etapa 2', kpiGroup: 'kpi2' },
    { key: 'kpi_sla_etapa_3', labelTitle: 'KPI 2', labelSubtitle: 'Etapa 3', kpiGroup: 'kpi2' },
    { key: 'kpi_retroalimentacion_etapa_1', labelTitle: 'KPI 3', labelSubtitle: 'Etapa 1', kpiGroup: 'kpi3' },
    { key: 'kpi_retroalimentacion_etapa_2', labelTitle: 'KPI 3', labelSubtitle: 'Etapa 2', kpiGroup: 'kpi3' },
    { key: 'kpi_retroalimentacion_etapa_3', labelTitle: 'KPI 3', labelSubtitle: 'Etapa 3', kpiGroup: 'kpi3' },
    { key: 'kpi_retroalimentacion_etapa_4', labelTitle: 'KPI 3', labelSubtitle: 'Etapa 4', kpiGroup: 'kpi3' }
  ];

  const filaHtml = d => {
    const colorEjecutivo = generarColorEjecutivo(d.ejecutivo || d.asesor_nombre || '');
    return `<tr class="hover:bg-slate-800/50 text-gray-200 ${colorEjecutivo}">${cols.map(c => {
      let v = d[c.key] ?? '';
      const align = c.kpiGroup ? 'text-center' : ['pais', 'ejecutivo', 'lead', 'resultado', 'telefono', 'fecha_reunion', 'hora_reunion', 'fecha_llamada', 'hora_llamada'].includes(c.key) ? 'text-left' : 'text-right';
      const extraClass = c.kpiGroup ? ` ${c.kpiGroup === 'kpi2' ? 'col-kpi2' : 'col-kpi3'}` : '';
      if (c.key === 'resultado') {
        v = `<span class="${claseResultado(v)}">${v}</span>`;
      }
      return `<td class="p-2.5 whitespace-nowrap ${align}${extraClass}">${v}</td>`;
    }).join('')}</tr>`;
  };

  const datosFiltrados = filtrarDatosTabla('tabla-resumen-maestra', datos, cols.map(c => c.key));
  window.__ultimoFiltrado['tabla-resumen-maestra'] = datosFiltrados;

  const thead = `<tr>${cols.map(c => {
    const align = c.kpiGroup ? 'text-center' : ['pais', 'ejecutivo', 'lead', 'resultado', 'telefono', 'fecha_reunion', 'hora_reunion', 'fecha_llamada', 'hora_llamada'].includes(c.key) ? 'text-left' : 'text-right';
    const content = c.labelTitle ? `<div class="kpi-header ${c.kpiGroup === 'kpi2' ? 'kpi-header-kpi2' : 'kpi-header-kpi3'}"><span class="kpi-title text-red-300">${c.labelTitle}</span><span class="kpi-subtitle">${c.labelSubtitle}</span></div>` : `<div class="kpi-header"><span class="kpi-title">${c.label}</span></div>`;
    const activo = filtroColState['tabla-resumen-maestra'][c.key] ? 'activo' : '';
    return `<th class="p-2.5 ${align} text-[10px] align-top">${content}<span class="filtro-icono ${activo}" onclick="abrirFiltroColumna('tabla-resumen-maestra','${c.key}',this)">▾</span></th>`;
  }).join('')}</tr>`;

  document.getElementById('tabla-resumen-maestra').innerHTML = `
    <div class="overflow-auto rounded-lg border border-gray-800">
      <table class="w-full text-xs border-collapse kpi-maestra-table">
        <thead class="bg-[#0f172a] text-white">${thead}</thead>
        <tbody class="divide-y divide-gray-800">${datosFiltrados.map(filaHtml).join('') || `<tr><td colspan="${cols.length}" class="p-4 text-center text-gray-400">Sin resultados con esos filtros.</td></tr>`}</tbody>
      </table>
    </div>`;
}

function pintarTablaResumenEjecutivo(filasCatalogo, filasSinCatalogo, total, rowIdPrefix = '') {
  const cols = [
    { key: 'pais', label: 'País' },
    { key: 'leads', label: 'Leads telefónicos' },
    { key: 'evaluados', label: 'Evaluados' },
    { key: 'cumplieron', label: 'Cumplieron' },
    { key: 'fuera_horario', label: 'Mismo día fuera horario' },
    { key: 'otra_fecha', label: 'Otra fecha' },
    { key: 'sin_llamada', label: 'Sin llamada' },
    { key: 'pendientes', label: 'Pendientes' },
    { key: 'pct_cumplimiento', label: '% cumplimiento' },
  ];

  const filaHtml = (d, esTotal) => {
    const colorEjecutivo = !esTotal ? generarColorEjecutivo(d.ejecutivo || d.asesor_nombre || '') : '';
    const base = esTotal ? 'bg-[#0f3a4a] text-white font-bold' : 'hover:bg-slate-800/50 text-gray-200 ' + colorEjecutivo;
    return `<tr class="${base}">${cols.map(c => {
      let v = d[c.key];
      if (c.key === 'pais') v = esTotal ? 'TOTAL' : nombrePais(v);
      const align = c.key === 'pais' ? 'text-left' : 'text-right';
      return `<td class="p-2.5 whitespace-nowrap ${align}">${v ?? ''}</td>`;
    }).join('')}</tr>`;
  };

  const thead = `<tr>${cols.map((c, idx) => {
    const align = c.key === 'pais' ? 'text-left' : 'text-right';
    const hasFilter = true;
    return `<th data-key="${c.key}" class="p-2.5 ${align} text-[10px]">${c.label} ${hasFilter ? '<span class="filtro-icono" onclick="abrirFiltroColumnaResumen(\'tabla-resumen-ejec\',\'' + c.key + '\', this)">▾</span>' : ''}</th>`;
  }).join('')}</tr>`;
  const filas = filasCatalogo.map(d => filaHtml(d, false)).join('') + filaHtml(total, true);

  let sinCatalogoHtml = '';
  if (filasSinCatalogo.length) {
    const filasSC = filasSinCatalogo.map(d => filaHtml(d, false)).join('');
    sinCatalogoHtml = `
      <div class="mt-4 rounded-lg border border-amber-900 overflow-hidden">
        <div class="bg-amber-950 text-amber-300 text-[11px] font-bold px-3 py-2">
          Nombres en Leads sin coincidencia en catálogo — revisar si falta darlos de alta
        </div>
        <table class="w-full text-xs border-collapse">
          <thead class="bg-[#1e293b] text-gray-400">${thead}</thead>
          <tbody class="divide-y divide-gray-800">${filasSC}</tbody>
        </table>
      </div>`;
  }

  document.getElementById('tabla-resumen-ejec').innerHTML = `
    <div class="overflow-auto rounded-lg border border-gray-800">
      <table class="w-full text-xs border-collapse">
        <thead class="bg-[#0e7490] text-white">${thead}</thead>
        <tbody class="divide-y divide-gray-800">${filas}</tbody>
      </table>
    </div>
    ${sinCatalogoHtml}`;
}

async function renderResumenKpis(main) {
  const grupos = {};
  cache.catalogo.forEach(e => {
    const nombre = (e.nombre_ejecutivo || '').trim();
    grupos[nombre.toLowerCase()] = {
      pais: e.pais || 'N/D',
      ejecutivo: nombre,
      leads: 0, evaluados: 0, cumplieron: 0, fuera_horario: 0, otra_fecha: 0, sin_llamada: 0, pendientes: 0,
      enCatalogo: true
    };
  });

  const sinCatalogo = {};

  cruce.forEach(r => {
    const nombreLead = (r.ejecutivo || '').trim();
    const key = nombreLead.toLowerCase();
    let g = grupos[key];
    if (!g) {
      if (!sinCatalogo[key]) {
        sinCatalogo[key] = {
          pais: r.pais || 'N/D', ejecutivo: nombreLead || 'Sin asignar',
          leads: 0, evaluados: 0, cumplieron: 0, fuera_horario: 0, otra_fecha: 0, sin_llamada: 0, pendientes: 0,
          enCatalogo: false
        };
      }
      g = sinCatalogo[key];
    }
    g.leads++;
    if (r.resultado === 'Pendiente de evaluar') {
      g.pendientes++;
    } else {
      g.evaluados++;
      if (r.resultado === 'Cumplió en fecha y horario' || r.resultado === 'Cumplió con evidencia en Teams') g.cumplieron++;
      else if (r.resultado === 'Llamó el mismo día fuera de horario') g.fuera_horario++;
      else if (r.resultado === 'Llamó en otra fecha') g.otra_fecha++;
      else if (r.resultado === 'Sin llamada encontrada' || r.resultado === 'Sin evidencia en Teams') g.sin_llamada++;
    }
  });

  const calcularFila = g => {
    g.no_cumplieron = g.fuera_horario + g.otra_fecha + g.sin_llamada;
    const base = g.evaluados;
    const pctNum = base > 0 ? (g.cumplieron / base) * 100 : 0;
    g.pct_num = pctNum;
    g.pct_cumplimiento = base > 0 ? pctNum.toFixed(1) + '%' : '—';
    return g;
  };

  const ordenar = arr => arr.map(calcularFila).sort((a, b) =>
    nombrePais(a.pais).localeCompare(nombrePais(b.pais)) || a.ejecutivo.localeCompare(b.ejecutivo)
  );

  return {
    filasCatalogo: ordenar(Object.values(grupos)),
    filasSinCatalogo: ordenar(Object.values(sinCatalogo))
  };
}

function pintarTablaResumenEjecutivo(filasCatalogo, filasSinCatalogo, total, rowIdPrefix = '') {
  const cols = [
    { key: 'pais', label: 'País' },
    { key: 'ejecutivo', label: 'Ejecutivo' },
    { key: 'leads', label: 'Leads' },
    { key: 'evaluados', label: 'Evaluados' },
    { key: 'cumplieron', label: 'Cumplieron' },
    { key: 'fuera_horario', label: 'Mismo día fuera horario' },
    { key: 'otra_fecha', label: 'Otra fecha' },
    { key: 'sin_llamada', label: 'Sin llamada' },
    { key: 'pendientes', label: 'Pendientes' },
    { key: 'pct_cumplimiento', label: '% cumplimiento' },
  ];

  const filaHtml = (d, esTotal) => {
    const colorEjecutivo = !esTotal ? generarColorEjecutivo(d.ejecutivo || '') : '';
    const base = esTotal ? 'bg-[#0f3a4a] text-white font-bold' : 'hover:bg-slate-800/50 text-gray-200 ' + colorEjecutivo;
    const idAttr = !esTotal ? `id="${rowIdPrefix}${crearIdEjecutivo(d.ejecutivo)}"` : '';
    return `<tr ${idAttr} class="${base}">${cols.map(c => {
      let v = d[c.key];
      if (c.key === 'pais') v = esTotal ? 'TOTAL' : nombrePais(v);
      if (c.key === 'ejecutivo' && esTotal) v = '';
      const align = (c.key === 'pais' || c.key === 'ejecutivo') ? 'text-left' : 'text-right';
      return `<td class="p-2.5 whitespace-nowrap ${align}">${v ?? ''}</td>`;
    }).join('')}</tr>`;
  };

  const thead = `<tr>${cols.map((c, idx) => {
    const align = (c.key === 'pais' || c.key === 'ejecutivo') ? 'text-left' : 'text-right';
    const hasFilter = true;
    return `<th data-key="${c.key}" class="p-2.5 ${align} text-[10px]">${c.label} ${hasFilter ? '<span class="filtro-icono" onclick="abrirFiltroColumnaResumen(\'tabla-resumen-ejec\',\'' + c.key + '\', this)">▾</span>' : ''}</th>`;
  }).join('')}</tr>`;
  const filas = filasCatalogo.map(d => filaHtml(d, false)).join('') + filaHtml(total, true);

  let sinCatalogoHtml = '';
  if (filasSinCatalogo.length) {
    const filasSC = filasSinCatalogo.map(d => filaHtml(d, false)).join('');
    sinCatalogoHtml = `
      <div class="mt-4 rounded-lg border border-amber-900 overflow-hidden">
        <div class="bg-amber-950 text-amber-300 text-[11px] font-bold px-3 py-2">
          Nombres en Leads sin coincidencia en catálogo — revisar si falta darlos de alta
        </div>
        <table class="w-full text-xs border-collapse">
          <thead class="bg-[#1e293b] text-gray-400">${thead}</thead>
          <tbody class="divide-y divide-gray-800">${filasSC}</tbody>
        </table>
      </div>`;
  }

  document.getElementById('tabla-resumen-ejec').innerHTML = `
    <div class="overflow-auto rounded-lg border border-gray-800">
      <table class="w-full text-xs border-collapse">
        <thead class="bg-[#0e7490] text-white">${thead}</thead>
        <tbody class="divide-y divide-gray-800">${filas}</tbody>
      </table>
    </div>
    ${sinCatalogoHtml}`;
}

async function renderResumenKpis(main) {
  main.innerHTML = `<div class="bg-[#111827] p-4 rounded-lg border border-gray-800 space-y-6">
    <div class="flex justify-between items-center mb-3">
      <div>
        <h2 class="text-sm font-bold text-gray-300">Resumen KPIs</h2>
        <p class="text-[11px] text-gray-500 mt-1">Vista maestra con datos por ejecutivo y un resumen compacto por país.</p>
      </div>
      <button onclick="renderResumenKpis(document.getElementById('main-content'))" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded flex items-center gap-1">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
        Recalcular
      </button>
    </div>

    <section>
      <div class="grid gap-3 sm:grid-cols-2 mb-4" id="resumen-pais-cards"></div>
      <h3 class="text-xs font-bold text-gray-300 mb-2">Tabla maestra</h3>
      <div id="tabla-resumen-maestra" class="overflow-auto text-xs"><span class="text-red-300">Calculando cruce...</span></div>
    </section>
  </div>`;

  const cruce = await calcularCruceUnificado();
  const resumenPaises = calcularResumenPorPais(cruce);
  main.querySelector('#resumen-pais-cards').innerHTML = resumenPaises.map(r => `
      <div class="bg-[#111827] border border-gray-800 rounded-lg p-3 flex items-center justify-between gap-4">
        <div>
          <div class="text-[10px] text-gray-400 uppercase tracking-[0.15em]">${r.pais}</div>
          <div class="mt-2 text-sm text-gray-400">Leads</div>
          <div class="text-2xl font-bold text-white">${r.leads}</div>
        </div>
        <div class="text-right">
          <div class="text-[10px] text-gray-400 uppercase tracking-[0.15em]">Cumplieron</div>
          <div class="text-2xl font-bold text-emerald-300">${r.cumplieron}</div>
        </div>
      </div>
    `).join('');
  const datosMaestros = construirResumenMaestra(cruce);
    window.__datosBase['tabla-resumen-maestra'] = datosMaestros;
    filtroColState['tabla-resumen-maestra'] = filtroColState['tabla-resumen-maestra'] || {};
    window.__tablaRenderizadores['tabla-resumen-maestra'] = pintarTablaResumenMaestra;
  pintarTablaResumenMaestra(datosMaestros);
}

function calcularResumenPorPais(cruce) {
  const grupo = {
    GT: { pais: 'Guatemala', leads: 0, cumplieron: 0 },
    SV: { pais: 'El Salvador', leads: 0, cumplieron: 0 }
  };
  cruce.forEach(r => {
    if (r.pais === 'GT' || r.pais === 'SV') {
      const key = r.pais;
      grupo[key].leads++;
      if (r.resultado === 'Cumplió en fecha y horario' || r.resultado === 'Cumplió con evidencia en Teams') {
        grupo[key].cumplieron++;
      }
    }
  });
  return [grupo.GT, grupo.SV];
}

async function renderResumenKPI1(main) {
  filtroColState['tabla-kpi1'] = filtroColState['tabla-kpi1'] || {};
  main.innerHTML = `<div class="bg-[#111827] p-4 rounded-lg border border-gray-800 space-y-6">
    <div class="flex justify-between items-center mb-3">
      <div>
        <h2 class="text-sm font-bold text-gray-300">KPI 1: Cumplimiento Leads</h2>
        <p class="text-[11px] text-gray-500 mt-1">Lista de ejecutivos y leads cumplidos. Haz clic en un ejecutivo para ver el detalle de cada caso.</p>
      </div>
      <button onclick="renderResumenKPI1(document.getElementById('main-content'))" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded flex items-center gap-1">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
        Recalcular
      </button>

    </div>

    <div class="overflow-auto rounded-lg border border-gray-800">
      <table class="w-full text-xs border-collapse" id="tabla-kpi1">
        <thead class="bg-[#0f172a] text-white">
          <tr>
            <th class="p-2.5 text-left text-[10px]">País <span class="filtro-icono ${filtroColState['tabla-kpi1'].pais ? 'activo' : ''}" onclick="event.stopPropagation(); abrirFiltroColumna('tabla-kpi1','pais',this)">▾</span></th>
            <th class="p-2.5 text-left text-[10px]">Ejecutivo <span class="filtro-icono ${filtroColState['tabla-kpi1'].ejecutivo ? 'activo' : ''}" onclick="event.stopPropagation(); abrirFiltroColumna('tabla-kpi1','ejecutivo',this)">▾</span></th>
            <th class="p-2.5 text-right text-[10px]">Leads <span class="filtro-icono ${filtroColState['tabla-kpi1'].leads ? 'activo' : ''}" onclick="event.stopPropagation(); abrirFiltroColumna('tabla-kpi1','leads',this)">▾</span></th>
            <th class="p-2.5 text-right text-[10px]">Cumplieron <span class="filtro-icono ${filtroColState['tabla-kpi1'].cumplidos ? 'activo' : ''}" onclick="event.stopPropagation(); abrirFiltroColumna('tabla-kpi1','cumplidos',this)">▾</span></th>
            <th class="p-2.5 text-right text-[10px]">% Cumplimiento <span class="filtro-icono ${filtroColState['tabla-kpi1'].pct_cumplimiento ? 'activo' : ''}" onclick="event.stopPropagation(); abrirFiltroColumna('tabla-kpi1','pct_cumplimiento',this)">▾</span></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-800" id="tbody-kpi1"><tr><td colspan="5" class="p-4 text-center text-red-300">Calculando cruce...</td></tr></tbody>
      </table>
    </div>

    <div id="kpi1-detalle" class="space-y-3"></div>
  </div>`;

  const cruce = await calcularCruceUnificado();
  window.kpi1DetalleCruce = cruce;
  const datosKPI1 = construirResumenPorEjecutivo(cruce);
  window.__datosBase['tabla-kpi1'] = datosKPI1;
  filtroColState['tabla-kpi1'] = filtroColState['tabla-kpi1'] || {};
  window.__tablaRenderizadores['tabla-kpi1'] = pintarTablaKPI1;
  pintarTablaKPI1(datosKPI1);
}

function pintarTablaKPI1(datos) {
  const columnas = ['pais', 'ejecutivo', 'leads', 'cumplidos', 'pct_cumplimiento'];
  const datosFiltrados = filtrarDatosTabla('tabla-kpi1', datos, columnas);
  window.__ultimoFiltrado['tabla-kpi1'] = datosFiltrados;
  const filas = datosFiltrados.map(d => {
    const colorEjecutivo = generarColorEjecutivo(d.ejecutivo || '');
    return `<tr class="hover:bg-slate-800/50 text-gray-200 cursor-pointer ${colorEjecutivo}" onclick="mostrarDetalleKPI1('${encodeURIComponent(String(d.ejecutivo || ''))}')">
      <td class="p-2.5 text-left">${nombrePais(d.pais)}</td>
      <td class="p-2.5 text-left">${d.ejecutivo}</td>
      <td class="p-2.5 text-right">${d.leads}</td>
      <td class="p-2.5 text-right">${d.cumplidos}</td>
      <td class="p-2.5 text-right">${d.pct_cumplimiento}</td>
    </tr>`;
  }).join('');
  document.getElementById('tbody-kpi1').innerHTML = filas || `<tr><td colspan="5" class="p-4 text-center text-gray-400">No hay datos disponibles para este rango.</td></tr>`;
}

function mostrarDetalleKPI1(ejecutivoEncoded) {
  const ejecutivo = decodeURIComponent(String(ejecutivoEncoded || ''));
  const registros = (window.kpi1DetalleCruce || []).filter(r => String(r.ejecutivo || '').trim() === ejecutivo);

  const filas = registros.map(r => {
    const colorEjecutivo = generarColorEjecutivo(r.ejecutivo || '');
    return `
    <tr class="hover:bg-slate-800/50 text-gray-200 ${colorEjecutivo}">
      <td class="p-2.5 text-left">${nombrePais(r.pais) || ''}</td>
      <td class="p-2.5 text-left">${r.ejecutivo || ''}</td>
      <td class="p-2.5 text-left">${r.lead || ''}</td>
      <td class="p-2.5 text-left">${r.cliente || ''}</td>
      <td class="p-2.5 text-left">${r.telefono || ''}</td>
      <td class="p-2.5 text-right">${r.fecha_reunion || ''}</td>
      <td class="p-2.5 text-right">${r.hora_reunion || ''}</td>
      <td class="p-2.5 text-left"><span class="${claseResultado(r.resultado)}">${r.resultado || ''}</span></td>
      <td class="p-2.5 text-center">${r.cumplio || 'No'}</td>
      <td class="p-2.5 text-left">${r.fuente || ''}</td>
      <td class="p-2.5 text-right">${r.fecha_contacto || ''}</td>
      <td class="p-2.5 text-right">${r.hora_contacto || ''}</td>
      <td class="p-2.5 text-right">${r.diferencia_min ?? ''}</td>
      <td class="p-2.5 text-right">${r.duracion_seg ?? ''}</td>
      <td class="p-2.5 text-left">${r.estado_llamada || ''}</td>
      <td class="p-2.5 text-right">${r.intentos_mismo_dia ?? 0}</td>
      <td class="p-2.5 text-right">${r.intentos_totales ?? 0}</td>
      <td class="p-2.5 text-center">${r.catalogo_ok || 'No'}</td>
      <td class="p-2.5 text-left">${r.observacion || ''}</td>
    </tr>`;
  }).join('');

  document.getElementById('kpi1-detalle').innerHTML = `
    <div class="bg-[#111827] border border-gray-800 rounded-lg p-4">
      <div class="flex items-center justify-between mb-3">
        <div>
          <h3 class="text-sm font-bold text-white">Detalle de ${ejecutivo}</h3>
          <p class="text-[11px] text-gray-500">Lead, ejecutivo y contacto con detalle de cumplimiento.</p>
        </div>
        <span class="text-[11px] text-gray-400">${registros.length} registros</span>
      </div>
      <div class="overflow-auto">
        <table class="w-full text-xs border-collapse">
          <thead class="bg-[#0f172a] text-white">
            <tr>
              <th class="p-2.5 text-left text-[10px]">País</th>
              <th class="p-2.5 text-left text-[10px]">Ejecutivo</th>
              <th class="p-2.5 text-left text-[10px]">Lead</th>
              <th class="p-2.5 text-left text-[10px]">Cliente</th>
              <th class="p-2.5 text-left text-[10px]">Teléfono</th>
              <th class="p-2.5 text-right text-[10px]">Fecha reunión</th>
              <th class="p-2.5 text-right text-[10px]">Hora reunión</th>
              <th class="p-2.5 text-left text-[10px]">Resultado</th>
              <th class="p-2.5 text-center text-[10px]">Cumplió</th>
              <th class="p-2.5 text-left text-[10px]">Fuente</th>
              <th class="p-2.5 text-right text-[10px]">Fecha contacto</th>
              <th class="p-2.5 text-right text-[10px]">Hora contacto</th>
              <th class="p-2.5 text-right text-[10px]">Diferencia (min)</th>
              <th class="p-2.5 text-right text-[10px]">Duración (seg)</th>
              <th class="p-2.5 text-left text-[10px]">Estado llamada</th>
              <th class="p-2.5 text-right text-[10px]">Intentos mismo día</th>
              <th class="p-2.5 text-right text-[10px]">Intentos totales</th>
              <th class="p-2.5 text-center text-[10px]">Catálogo</th>
              <th class="p-2.5 text-left text-[10px]">Observación</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800">${filas || `<tr><td colspan="19" class="p-4 text-center text-gray-400">No hay registros asociados a este ejecutivo.</td></tr>`}</tbody>
        </table>
      </div>
    </div>`;
}

function agregarPorSLA(cruce) {
  const grupos = {};
  cache.catalogo.forEach(e => {
    const nombre = (e.nombre_ejecutivo || '').trim();
    const key = nombre.toLowerCase();
    grupos[key] = {
      pais: e.pais || 'N/D',
      ejecutivo: nombre || 'Sin asignar',
      leads: 0,
      sla_etapa_1: 0,
      sla_etapa_2: 0,
      sla_etapa_3: 0,
      enCatalogo: true,
      rowId: crearIdEjecutivo(nombre)
    };
  });

  const sinCatalogo = {};

  cruce.forEach(r => {
    const nombreLead = (r.ejecutivo || '').trim();
    const key = nombreLead.toLowerCase();
    let g = grupos[key];
    if (!g) {
      if (!sinCatalogo[key]) {
        sinCatalogo[key] = {
          pais: r.pais || 'N/D',
          ejecutivo: nombreLead || 'Sin asignar',
          leads: 0,
          sla_etapa_1: 0,
          sla_etapa_2: 0,
          sla_etapa_3: 0,
          enCatalogo: false
        };
      }
      g = sinCatalogo[key];
    }
    g.leads++;
    if (r.kpi_sla_etapa_1) g.sla_etapa_1++;
    if (r.kpi_sla_etapa_2) g.sla_etapa_2++;
    if (r.kpi_sla_etapa_3) g.sla_etapa_3++;
  });

  const ordenar = arr => arr.sort((a, b) => nombrePais(a.pais).localeCompare(nombrePais(b.pais)) || a.ejecutivo.localeCompare(b.ejecutivo));
  return ordenar([...Object.values(grupos), ...Object.values(sinCatalogo)]);
}

function agregarPorRetro(cruce) {
  const grupos = {};
  cache.catalogo.forEach(e => {
    const nombre = (e.nombre_ejecutivo || '').trim();
    const key = nombre.toLowerCase();
    grupos[key] = {
      pais: e.pais || 'N/D',
      ejecutivo: nombre || 'Sin asignar',
      leads: 0,
      retro_etapa_1: 0,
      retro_etapa_2: 0,
      retro_etapa_3: 0,
      retro_etapa_4: 0,
      enCatalogo: true,
      rowId: crearIdEjecutivo(nombre)
    };
  });

  const sinCatalogo = {};

  cruce.forEach(r => {
    const nombreLead = (r.ejecutivo || '').trim();
    const key = nombreLead.toLowerCase();
    let g = grupos[key];
    if (!g) {
      if (!sinCatalogo[key]) {
        sinCatalogo[key] = {
          pais: r.pais || 'N/D',
          ejecutivo: nombreLead || 'Sin asignar',
          leads: 0,
          retro_etapa_1: 0,
          retro_etapa_2: 0,
          retro_etapa_3: 0,
          retro_etapa_4: 0,
          enCatalogo: false
        };
      }
      g = sinCatalogo[key];
    }
    g.leads++;
    if (r.kpi_retroalimentacion_etapa_1) g.retro_etapa_1++;
    if (r.kpi_retroalimentacion_etapa_2) g.retro_etapa_2++;
    if (r.kpi_retroalimentacion_etapa_3) g.retro_etapa_3++;
    if (r.kpi_retroalimentacion_etapa_4) g.retro_etapa_4++;
  });

  const ordenar = arr => arr.sort((a, b) => nombrePais(a.pais).localeCompare(nombrePais(b.pais)) || a.ejecutivo.localeCompare(b.ejecutivo));
  return ordenar([...Object.values(grupos), ...Object.values(sinCatalogo)]);
}

function pintarTablaResumenSLA(datos, rowIdPrefix = '') {
  const cols = [
    { key: 'pais', label: 'País' },
    { key: 'ejecutivo', label: 'Ejecutivo' },
    { key: 'leads', label: 'Leads' },
    { key: 'sla_etapa_1', label: '% SLA Etapa 1' },
    { key: 'sla_etapa_2', label: '% SLA Etapa 2' },
    { key: 'sla_etapa_3', label: '% SLA Etapa 3' }
  ];

  const filaHtml = (d, esTotal) => {
    const colorEjecutivo = !esTotal ? generarColorEjecutivo(d.ejecutivo || '') : '';
    const base = esTotal ? 'bg-[#0f3a4a] text-white font-bold' : 'hover:bg-slate-800/50 text-gray-200 cursor-pointer ' + colorEjecutivo;
    const idAttr = !esTotal ? `id="${rowIdPrefix}${crearIdEjecutivo(d.ejecutivo)}"` : '';
    const onclick = esTotal ? '' : `onclick="abrirLeadsDesdeResumen('${encodeURIComponent(String(d.ejecutivo || ''))}','sla')"`;
    return `<tr ${idAttr} class="${base}" ${onclick}>${cols.map(c => {
      let v = d[c.key];
      if (c.key === 'pais') v = esTotal ? 'TOTAL' : nombrePais(v);
      if (c.key === 'sla_etapa_1' || c.key === 'sla_etapa_2' || c.key === 'sla_etapa_3') {
        v = d.leads > 0 ? Math.round((v / d.leads) * 100) + '%' : '0%';
      }
      const align = c.key === 'pais' || c.key === 'ejecutivo' ? 'text-left' : 'text-right';
      return `<td class="p-2.5 whitespace-nowrap ${align}">${v ?? ''}</td>`;
    }).join('')}</tr>`;
  };

  const thead = `<tr>${cols.map((c, idx) => {
    const align = c.key === 'pais' || c.key === 'ejecutivo' ? 'text-left' : 'text-right';
    const hasFilter = true;
    return `<th data-key="${c.key}" class="p-2.5 ${align} text-[10px]">${c.label} ${hasFilter ? '<span class="filtro-icono" onclick="abrirFiltroColumnaResumen(\'tabla-resumen-sla\',\'' + c.key + '\', this)">▾</span>' : ''}</th>`;
  }).join('')}</tr>`;
  const filas = datos.map(d => filaHtml(d, false)).join('');

  document.getElementById('tabla-resumen-sla').innerHTML = `
    <div class="overflow-auto rounded-lg border border-gray-800">
      <table class="w-full text-xs border-collapse">
        <thead class="bg-[#0e7490] text-white">${thead}</thead>
        <tbody class="divide-y divide-gray-800">${filas}</tbody>
      </table>
    </div>`;
}

function pintarTablaResumenRetro(datos, rowIdPrefix = '') {
  const cols = [
    { key: 'pais', label: 'País' },
    { key: 'ejecutivo', label: 'Ejecutivo' },
    { key: 'leads', label: 'Leads' },
    { key: 'retro_etapa_1', label: '% Retroalimentación Etapa 1' },
    { key: 'retro_etapa_2', label: '% Retroalimentación Etapa 2' },
    { key: 'retro_etapa_3', label: '% Retroalimentación Etapa 3' },
    { key: 'retro_etapa_4', label: '% Retroalimentación Etapa 4' }
  ];

  const filaHtml = (d, esTotal) => {
    const colorEjecutivo = !esTotal ? generarColorEjecutivo(d.ejecutivo || '') : '';
    const base = esTotal ? 'bg-[#0f3a4a] text-white font-bold' : 'hover:bg-slate-800/50 text-gray-200 cursor-pointer ' + colorEjecutivo;
    const idAttr = !esTotal ? `id="${rowIdPrefix}${crearIdEjecutivo(d.ejecutivo)}"` : '';
    const onclick = esTotal ? '' : `onclick="abrirLeadsDesdeResumen('${encodeURIComponent(String(d.ejecutivo || ''))}','retro')"`;
    return `<tr ${idAttr} class="${base}" ${onclick}>${cols.map(c => {
      let v = d[c.key];
      if (c.key === 'pais') v = esTotal ? 'TOTAL' : nombrePais(v);
      if (c.key.startsWith('retro_etapa_')) {
        v = d.leads > 0 ? Math.round((v / d.leads) * 100) + '%' : '0%';
      }
      const align = c.key === 'pais' || c.key === 'ejecutivo' ? 'text-left' : 'text-right';
      return `<td class="p-2.5 whitespace-nowrap ${align}">${v ?? ''}</td>`;
    }).join('')}</tr>`;
  };

  const thead = `<tr>${cols.map((c, idx) => {
    const align = c.key === 'pais' || c.key === 'ejecutivo' ? 'text-left' : 'text-right';
    const hasFilter = true;
    return `<th data-key="${c.key}" class="p-2.5 ${align} text-[10px]">${c.label} ${hasFilter ? '<span class="filtro-icono" onclick="abrirFiltroColumnaResumen(\'tabla-resumen-retro\',\'' + c.key + '\', this)">▾</span>' : ''}</th>`;
  }).join('')}</tr>`;
  const filas = datos.map(d => filaHtml(d, false)).join('');

  document.getElementById('tabla-resumen-retro').innerHTML = `
    <div class="overflow-auto rounded-lg border border-gray-800">
      <table class="w-full text-xs border-collapse">
        <thead class="bg-[#0e7490] text-white">${thead}</thead>
        <tbody class="divide-y divide-gray-800">${filas}</tbody>
      </table>
    </div>`;
}

async function renderResumenSLA(main) {
  main.innerHTML = `<div class="bg-[#111827] p-4 rounded-lg border border-gray-800">
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-sm font-bold text-gray-300">KPI 2: SLA de Etapas</h2>
      <div class="flex gap-2">
        <button onclick="renderResumenSLA(document.getElementById('main-content'))" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          Recalcular
        </button>
        <button id="btn-exp-sla" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Exportar XLSX
        </button>
      </div>
    </div>
    <p class="text-[11px] text-gray-500 mb-3">Resumen de cumplimiento por ejecutivo. El % de etapa se calcula sobre el total de leads del ejecutivo. Haz click en una fila para ver los leads calificados de ese ejecutivo.</p>
    <div id="tabla-resumen-sla" class="overflow-auto text-xs"><span class="text-red-300">Calculando cruce...</span></div>
  </div>`;

  const cruce = await calcularCruceUnificado();
  const datos = agregarPorSLA(cruce);
  pintarTablaResumenSLA(datos);
  document.getElementById('btn-exp-sla').onclick = () => exportarXLSXGenerico(datos.map(r => ({
    pais: r.pais,
    ejecutivo: r.ejecutivo,
    leads: r.leads,
    pct_sla_etapa_1: r.leads > 0 ? Math.round((r.sla_etapa_1 / r.leads) * 100) + '%' : '0%',
    pct_sla_etapa_2: r.leads > 0 ? Math.round((r.sla_etapa_2 / r.leads) * 100) + '%' : '0%',
    pct_sla_etapa_3: r.leads > 0 ? Math.round((r.sla_etapa_3 / r.leads) * 100) + '%' : '0%'
  })), 'resumen_sla');
}

async function renderResumenRetro(main) {
  main.innerHTML = `<div class="bg-[#111827] p-4 rounded-lg border border-gray-800">
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-sm font-bold text-gray-300">KPI 3: Retroalimentación de Etapas</h2>
      <div class="flex gap-2">
        <button onclick="renderResumenRetro(document.getElementById('main-content'))" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          Recalcular
        </button>
        <button id="btn-exp-retro" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Exportar XLSX
        </button>
      </div>
    </div>
    <p class="text-[11px] text-gray-500 mb-3">Resumen de cumplimiento de retroalimentación por ejecutivo. El % de cada etapa se calcula sobre el total de leads del ejecutivo. Haz click en una fila para ver los leads calificados de ese ejecutivo.</p>
    <div id="tabla-resumen-retro" class="overflow-auto text-xs"><span class="text-red-300">Calculando cruce...</span></div>
  </div>`;

  const cruce = await calcularCruceUnificado();
  const datos = agregarPorRetro(cruce);
  pintarTablaResumenRetro(datos);
  document.getElementById('btn-exp-retro').onclick = () => exportarXLSXGenerico(datos.map(r => ({
    pais: r.pais,
    ejecutivo: r.ejecutivo,
    leads: r.leads,
    pct_retro_etapa_1: r.leads > 0 ? Math.round((r.retro_etapa_1 / r.leads) * 100) + '%' : '0%',
    pct_retro_etapa_2: r.leads > 0 ? Math.round((r.retro_etapa_2 / r.leads) * 100) + '%' : '0%',
    pct_retro_etapa_3: r.leads > 0 ? Math.round((r.retro_etapa_3 / r.leads) * 100) + '%' : '0%',
    pct_retro_etapa_4: r.leads > 0 ? Math.round((r.retro_etapa_4 / r.leads) * 100) + '%' : '0%'
  })), 'resumen_retro');
}

async function renderDetalleUnificado(main) {
  main.innerHTML = `<div class="bg-[#111827] p-4 rounded-lg border border-gray-800">
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-sm font-bold text-gray-300">Detalle Cumplimiento Leads</h2>
      <div class="flex gap-2">
        <button onclick="renderDetalleUnificado(document.getElementById('main-content'))" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          Recalcular
        </button>
        <button onclick="exportarXLSX('tabla-detalle-unificado','detalle_cumplimiento_leads')" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Exportar XLSX
        </button>
      </div>
    </div>
    <p class="text-[11px] text-gray-500 mb-2">Comparación unificada: Llamadas PBX, Celulares y Reuniones Teams. Un renglón por lead. Teléfono por últimos 8 dígitos. ±5 min tolerancia. Teams: con/sin evidencia. Nuevas columnas: diferencia en horas y duración en minutos.</p>
    <span id="estado-tabla" class="text-xs text-red-300">Calculando cruce...</span>
    <div class="overflow-auto mt-2" style="max-height: 68vh;">
      <table class="w-full text-left text-xs" id="tabla-detalle-unificado"></table>
    </div>
  </div>`;

  const cruce = await calcularCruceUnificado();

  const detalle = cruce.map((r, idx) => ({
    'Lead': r.codigo_prospecto,
    'País': r.pais,
    'Cliente': r.cliente,
    'Ejecutivo': r.ejecutivo,
    'Resultado': r.resultado,
    'Fecha reunión': r.fecha_reunion,
    'Hora reunión': r.hora_reunion,
    'Fecha llamada': r.fecha_llamada_corta,
    'Hora llamada': r.hora_llamada_corta,
    'Diferencia (min)': r.diferencia_min_firmada,
    'Diferencia (hs)': r.diferencia_horas,
    'Duración (seg)': r.duracion_seg,
    'Duración (min)': r.duracion_min,
    'Estado/tipo': r.estado_tipo,
    'En catálogo': r.catalogo_ok,
    'Fuente': r.fuente,
    '__rowId': idx,
    '__telefono_comparado': r.telefono_comparado,
    '__fecha_llamada': r.fecha_llamada ? String(r.fecha_llamada).split('T')[0] : '',
    '__registro_id': r.registro_origen_id || '',
    '__registro_tabla': r.registro_origen_tabla || ''
  }));

  document.getElementById('estado-tabla').classList.remove('hidden');
  pintarTablaConFiltros('tabla-detalle-unificado', detalle);
}

document.addEventListener('input', event => {
  const target = event.target;
  if (!(target instanceof HTMLElement) || !target.classList.contains('editable-cell')) return;
  const clean = target.innerText.replace(/\D/g, '').slice(0, 1);
  if (target.innerText !== clean) target.innerText = clean;
});

document.addEventListener('keydown', event => {
  const target = event.target;
  if (!(target instanceof HTMLElement) || !target.classList.contains('editable-cell')) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    target.blur();
  }
});

document.addEventListener('focusout', event => {
  const target = event.target;
  if (!(target instanceof HTMLElement) || !target.classList.contains('editable-cell')) return;
  const raw = target.innerText.trim();
  const clean = raw.replace(/\D/g, '').slice(0, 1);
  const value = clean || '0';
  if (target.innerText !== value) target.innerText = value;
  actualizarEditable(target.dataset.cont, target.dataset.row, target.dataset.col, value);
});

async function actualizarEditable(contId, rowId, col, valor) {
  console.log('🔴 actualizarEditable LLAMADA:', { contId, rowId, col, valor });
  if (!contId || !rowId || !col) {
    console.log('❌ Falta parámetro, retornando');
    return;
  }
  const datos = window.__datosBase[contId];
  console.log('🔴 Datos base:', { datosExists: !!datos, datosIsArray: Array.isArray(datos), datosLength: datos?.length });
  if (!Array.isArray(datos)) {
    console.log('❌ Datos no es array, retornando');
    return;
  }
  const parsedValue = parseBooleanValue(valor);
  console.log('🔴 Valor parseado:', parsedValue);

  const filaBase = resolverFilaPorRowId(datos, rowId)
    || encontrarLeadRealPorIdentidad(cache.leads, rowId)
    || encontrarLeadRealPorIdentidad(window.__datosBase['tabla-dinamica'], rowId);

  console.log('🔴 Fila encontrada:', !!filaBase, filaBase);
  if (!filaBase) {
    console.log('❌ No se encontró fila, retornando');
    return;
  }
  filaBase[col] = parsedValue;

  const ultimo = window.__ultimoFiltrado[contId];
  if (Array.isArray(ultimo)) {
    const fila2 = resolverFilaPorRowId(ultimo, rowId)
      || encontrarLeadRealPorIdentidad(ultimo, rowId, filaBase.codigo_prospecto || '', filaBase.id || '');
    if (fila2) fila2[col] = parsedValue;
  }

  const dbCol = colToDbField[col];
  console.log('🔴 dbCol lookup:', { col, dbCol, found: !!dbCol });
  if (!dbCol) {
    console.warn('⚠️ ADVERTENCIA: No se encontró dbCol para col:', col, '\nClaves disponibles:', Object.keys(colToDbField));
  }
  if (contId === 'tabla-dinamica' && dbCol) {
    const parsed = parsedValue;
    const codigoProspecto = String(filaBase.codigo_prospecto || filaBase.lead || filaBase.codigo || '').trim();
    const idPersistente = String(filaBase.id || filaBase.__rowId || '').trim();
    console.log('🔴 IDs extraídos:', { codigoProspecto, idPersistente });
    console.log('🔴 Llamando actualizarLeadKPI...');
    await actualizarLeadKPI(idPersistente, codigoProspecto, dbCol, parsed);

    const leadCache = encontrarLeadRealPorIdentidad(cache.leads, rowId, codigoProspecto, idPersistente);
    if (leadCache) leadCache[dbCol] = parsed;

    const leadBase = encontrarLeadRealPorIdentidad(window.__datosBase['tabla-dinamica'], rowId, codigoProspecto, idPersistente);
    if (leadBase) leadBase[dbCol] = parsed;

    if (vistaActual === 'reg-leads') {
      try {
        await cargarTablaCompleta('leads', 'fecha_agendada');
        let datosFiltrados = filtrarPorFechaGlobal(cache.leads, 'fecha_agendada');
        const vistos = new Set();
        datosFiltrados = datosFiltrados.filter(item => {
          const clave = String(item.codigo_prospecto || item.telefono || item.nombre_prospecto || item.id || '').trim();
          if (!clave) return true;
          if (vistos.has(clave)) return false;
          vistos.add(clave);
          return true;
        });
        const datatoRenderizar = datosFiltrados.map(({ opportunity_stage, stage, opportunityStage, ...rest }) => normalizarFilaLeads(rest));
        window.__datosBase['tabla-dinamica'] = datatoRenderizar;
        console.log('🔴 Repintando tabla...');
        repintar('tabla-dinamica');
        console.log('✅ Repintado completado');
      } catch (err) {
        console.warn('No se pudo recargar leads tras actualizar KPI:', err);
      }
    }
  }
  // Update select visual class if present in the DOM
  try {
    const sel = document.querySelector(`select[data-cont="${contId}"][data-row="${rowId}"][data-col="${col}"]`);
    if (sel) {
      if (parsedValue === true) {
        sel.classList.remove('kpi-no'); sel.classList.add('kpi-yes');
      } else {
        sel.classList.remove('kpi-yes'); sel.classList.add('kpi-no');
      }
      console.log('✅ Clases CSS actualizadas en el select');
    }
  } catch (e) { console.error('Error actualizando CSS:', e); }
  console.log('✅ actualizarEditable COMPLETADA');
}

function normalizarFilaLeads(item) {
  const salida = {};
  const mapAliases = {
    lead: ['codigo_prospecto', 'lead', 'nombre_prospecto'],
    pais: ['pais', 'country'],
    cliente: ['cliente', 'nombre_prospecto', 'contacto'],
    ejecutivo: ['asesor_nombre', 'ejecutivo', 'asesor', 'asesor_name'],
    resultado: ['resultado', 'status', 'status_lead'],
    tipo_reunion: ['tipo_reunion', 'tipo', 'tipo_de_llamada', 'tipo_llamada', 'tipo_lead', 'tipo_de_reunion', 'tipo_reunión'],
    fecha_agendada: ['fecha_agendada', 'fecha_reunion', 'fecha_reunión', 'fecha_de_reunion', 'fecha_de_reunión', 'fecha_cita', 'fecha'],
    hora_agendada: ['hora_agendada', 'hora_reunion', 'hora_reunión', 'hora_de_reunion', 'hora_de_reunión', 'hora_cita', 'hora'],
    telefono: ['telefono', 'contacto', 'telefono_contacto', 'telefono_cliente']
  };
  const aliasNorms = new Set(Object.values(mapAliases).flat().map(normalizarNombreColumna));

  for (const [canon, aliases] of Object.entries(mapAliases)) {
    const aliasNormsForCanon = aliases.map(normalizarNombreColumna);
    for (const key of Object.keys(item)) {
      const colNorm = normalizarNombreColumna(key);
      if (aliasNormsForCanon.includes(colNorm) && salida[canon] === undefined) {
        salida[canon] = item[key];
      }
    }
  }

  for (const key of Object.keys(item)) {
    const columna = normalizarNombreColumna(key);
    if (aliasNorms.has(columna)) continue;
    if (salida.hasOwnProperty(key)) continue;
    salida[key] = item[key];
  }

  const codigoProspectoReal = String(item.codigo_prospecto ?? item.lead ?? salida.lead ?? '').trim();
  salida.codigo_prospecto = codigoProspectoReal || '';
  delete salida.lead;
  salida.id = String(item.id ?? salida.id ?? '').trim();
  salida.__rowKey = String(salida.id || codigoProspectoReal || salida.telefono || salida.nombre_prospecto || '').trim();

  const kpis = [
    ['KPI SLA ETAPA 1', 'kpi_sla_etapa_1'],
    ['KPI SLA ETAPA 2', 'kpi_sla_etapa_2'],
    ['KPI SLA ETAPA 3', 'kpi_sla_etapa_3'],
    ['KPI RETROALIMENTACION ETAPA 1', 'kpi_retroalimentacion_etapa_1'],
    ['KPI RETROALIMENTACION ETAPA 2', 'kpi_retroalimentacion_etapa_2'],
    ['KPI RETROALIMENTACION ETAPA 3', 'kpi_retroalimentacion_etapa_3'],
    ['KPI RETROALIMENTACION ETAPA 4', 'kpi_retroalimentacion_etapa_4']
  ];
  for (const [label, col] of kpis) {
    if (item.hasOwnProperty(col)) {
      const rawVal = item[col];
      salida[label] = Boolean(parseBooleanValue(rawVal));
    } else if (salida[label] === undefined) {
      salida[label] = false;
    }
  }
  return salida;
}


async function actualizarLeadKPI(id, codigoProspecto, dbCol, valor) {
  if (!dbCol) return;
  try {
    const cliente = getSupabase();
    const valorBooleano = Boolean(parseBooleanValue(valor));
    const updateData = {};
    updateData[dbCol] = valorBooleano;

    const codigo = String(codigoProspecto ?? '').trim();
    const idReal = String(id ?? '').trim();

    console.log('🔵 ACTUALIZANDO KPI - PARAMS:', {
      idReal,
      codigo,
      dbCol,
      valorBooleano
    });

    const intentos = [];
    if (idReal) intentos.push({ campo: 'id', valor: idReal });
    if (codigo) intentos.push({ campo: 'codigo_prospecto', valor: codigo });
    
    if (!intentos.length) {
      console.error('❌ No se encontró clave para actualizar lead:', dbCol, valor);
      alert('ERROR: No se encontró ID ni código del prospecto');
      return;
    }

    console.log('🔵 Intentando actualizar con:', intentos);

    let datoActualizado = null;
    let claveUsada = null;

    for (const intento of intentos) {
      console.log(`🟡 Intento ${intento.campo}="${intento.valor}"...`);
      
      const { data, error } = await cliente
        .from('leads')
        .update(updateData)
        .eq(intento.campo, intento.valor)
        .select('id, codigo_prospecto');

      console.log(`   Response:`, { data, error });

      if (!error && data && data.length > 0) {
        datoActualizado = data[0];
        claveUsada = intento.campo;
        console.log(`✅ UPDATE exitoso con ${intento.campo}`);
        break;
      } else if (error) {
        console.warn(`   ❌ Error con ${intento.campo}:`, error.message);
      } else if (data && data.length === 0) {
        console.warn(`   ⚠️ Encontrado 0 registros con ${intento.campo}="${intento.valor}"`);
      }
    }

    if (!datoActualizado) {
      console.log('🟡 UPDATE no funcionó, intentando UPSERT...');
      const fallback = {};
      if (idReal) fallback.id = idReal;
      if (codigo) fallback.codigo_prospecto = codigo;
      if (!Object.keys(fallback).length) throw new Error('No se encontró identificador del lead para guardar');
      fallback[dbCol] = valorBooleano;
      const conflictKey = idReal ? 'id' : 'codigo_prospecto';
      
      console.log(`🟡 Ejecutando UPSERT con conflictKey="${conflictKey}":`, fallback);
      
      const { error: errorUpsert, data: dataUpsert } = await cliente
        .from('leads')
        .upsert([fallback], { onConflict: conflictKey, ignoreDuplicates: false });
        
      console.log(`   UPSERT Response:`, { data: dataUpsert, error: errorUpsert });
      
      if (errorUpsert) {
        throw new Error(`UPSERT Error: ${errorUpsert.message || JSON.stringify(errorUpsert)}`);
      }
      claveUsada = conflictKey;
    }

    cargaCompleta.leads = false;
    cache.leads = [];
    const mensaje = `✅ KPI guardado correctamente con ${claveUsada}`;
    console.log(mensaje, { dbCol, valorBooleano, id: idReal, codigoProspecto: codigo });
    alert(mensaje);
  } catch (err) {
    console.error('❌ Error guardando KPI en leads:', err);
    console.error('   Stack:', err.stack);
    alert(`ERROR: ${err.message}`);
    mostrarToast(`Error: ${err.message}`, 'error');
  }
}

async function calcularTeams() {
  await asegurarCache('leads', 'fecha_agendada');
  
  try {
    await asegurarCache('llamadas_teams', null);
  } catch (err) {
    console.log('llamadas_teams no disponible, usando array vacío');
    cache.llamadas_teams = [];
    cargaCompleta.llamadas_teams = true;
  }
  
  let leads = cache.leads.filter(l => esReunionTeams(l.tipo_reunion));
  
  leads = filtrarPorFechaGlobal(leads, 'fecha_agendada');
  
  return leads.map(lead => {
    const leadCode = lead.codigo_prospecto;
    const teamsData = (cache.llamadas_teams || []).find(t => t.codigo_prospecto === leadCode) || {};
    
    const progr = parseFechaHora(lead.fecha_agendada, lead.hora_agendada);
    const ahora = new Date();
    
    let estado = teamsData.estado_teams || 'Sin evidencia en Teams';
    if (!teamsData.estado_teams) {
      if (teamsData.evidencia_url) {
        estado = 'Cumplió con evidencia en Teams';
      } else if (progr) {
        const limite = new Date(progr.getTime() + 5 * 60000);
        if (ahora < limite) estado = 'Pendiente de evaluar';
      }
    }
    
    return {
      pais: lead.pais || 'N/D',
      ejecutivo: lead.asesor_nombre || 'Sin asignar',
      codigo_prospecto: lead.codigo_prospecto,
      lead: lead.nombre_prospecto,
      cliente: lead.nombre_prospecto,
      fecha_reunion_original: lead.fecha_agendada,
      hora_reunion_original: lead.hora_agendada,
      fecha_reunion: teamsData.fecha_reunion || lead.fecha_agendada,
      hora_reunion: teamsData.hora_reunion || lead.hora_agendada,
      evidencia_url: teamsData.evidencia_url || '',
      tipo_reunion: lead.tipo_reunion,
      estado_cruce: estado,
      teams_codigo: leadCode,
      teams_id: teamsData.id || ''
    };
  });
}

function abrirModalTeams(key) {
  let registro = cache.llamadas_teams.find(t => String(t.id) === String(key));
  let lead = null;
  if (!registro) {
    lead = cache.leads.find(l => String(l.codigo_prospecto) === String(key));
    if (!lead) return mostrarToast('Registro no encontrado', 'error');
  }

  document.getElementById('teams-id').value = registro?.id || '';
  document.getElementById('teams-pais').value = registro?.pais || lead?.pais || '';
  document.getElementById('teams-ejecutivo').value = registro?.ejecutivo || lead?.asesor_nombre || '';
  document.getElementById('teams-lead').value = registro?.codigo_prospecto || lead?.codigo_prospecto || '';
  document.getElementById('teams-cliente').value = registro?.cliente || lead?.nombre_prospecto || '';
  document.getElementById('teams-fecha').value = registro?.fecha_reunion || lead?.fecha_agendada || '';
  document.getElementById('teams-hora').value = registro?.hora_reunion || lead?.hora_agendada || '';
  document.getElementById('teams-evidencia').value = registro?.evidencia_url || '';
  document.getElementById('teams-estado').value = registro?.estado_teams || '';

  document.getElementById('modal-teams').classList.remove('modal-hidden');
}

function cerrarModalTeams() {
  document.getElementById('modal-teams').classList.add('modal-hidden');
  document.getElementById('form-teams').reset();
}

async function guardarTeamsModal(e) {
  e.preventDefault();
  const client = getSupabase();
  
  const id = document.getElementById('teams-id').value;
  const datos = {
    fecha_reunion: document.getElementById('teams-fecha').value,
    hora_reunion: document.getElementById('teams-hora').value,
    evidencia_url: document.getElementById('teams-evidencia').value,
    estado_teams: document.getElementById('teams-estado').value,
    pais: document.getElementById('teams-pais').value,
    ejecutivo: document.getElementById('teams-ejecutivo').value,
    codigo_prospecto: document.getElementById('teams-lead').value,
    cliente: document.getElementById('teams-cliente').value
  };

  try {
    if (id) {
      const { error } = await client.from('llamadas_teams').update(datos).eq('id', parseInt(id));
      if (error) throw error;
      mostrarToast('Reunión Teams actualizada');
    } else {
      const { error } = await client.from('llamadas_teams').insert([datos]);
      if (error) throw error;
      mostrarToast('Reunión Teams agregada');
    }
    
    cargaCompleta.llamadas_teams = false;
    await cargarTablaCompleta('llamadas_teams', null);
    cerrarModalTeams();
    renderRegistroTeams(document.getElementById('main-content'));
  } catch (err) {
    mostrarToast('Error: ' + err.message, 'error');
  }
}

function abrirFiltroColumnaResumen(tablaId, col, btnEl) {
  const tabla = document.getElementById(tablaId);
  if (!tabla || !col || !btnEl) return;
  
  const filas = tabla.querySelectorAll('tbody tr');
  const valoresUnicos = new Set();

  const ths = Array.from(tabla.querySelectorAll('thead th'));
  const colIndex = ths.findIndex(th => (th.dataset && th.dataset.key === col) || th.textContent.replace(/▾/, '').trim() === col);

  filas.forEach(fila => {
    const celdas = fila.querySelectorAll('td');
    if (colIndex >= 0 && celdas[colIndex]) {
      const valor = celdas[colIndex].textContent.trim();
      if (valor && valor !== 'TOTAL' && valor !== '') valoresUnicos.add(valor);
    }
  });

  const valoresOrdenados = Array.from(valoresUnicos).sort((a,b) => String(a).localeCompare(String(b)));
  cfpState = { 
    tablaId, 
    col, 
    valoresUnicos: valoresOrdenados, 
    seleccion: new Set(valoresOrdenados),
    esResumen: true
  };

  const popup = document.getElementById('col-filter-popup');
  const rect = btnEl.getBoundingClientRect();
  popup.style.top = (rect.bottom + window.scrollY + 4) + 'px';
  popup.style.left = Math.max(8, rect.left + window.scrollX - 200) + 'px';
  popup.classList.remove('hidden');
  document.getElementById('cfp-search').value = '';
  cfpPintarLista(valoresOrdenados);
}

function aplicarFiltroResumen() {
  if (!cfpState || !cfpState.esResumen) return;
  
  const { tablaId, col, seleccion } = cfpState;
  const tabla = document.getElementById(tablaId);
  if (!tabla) return;
  const filas = tabla.querySelectorAll('tbody tr');
  const ths = Array.from(tabla.querySelectorAll('thead th'));
  const colIndex = ths.findIndex(th => (th.dataset && th.dataset.key === col) || th.textContent.replace(/▾/, '').trim() === col);

  filas.forEach(fila => {
    const celdas = fila.querySelectorAll('td');
    if (colIndex >= 0 && celdas[colIndex]) {
      const valor = celdas[colIndex].textContent.trim();
      const mostrar = seleccion.size === 0 || seleccion.has(valor) || valor === 'TOTAL';
      fila.style.display = mostrar ? '' : 'none';
    }
  });

  cfpCerrar();
}

window.addEventListener('DOMContentLoaded', async () => {
  supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);
  const paisPbx = document.getElementById('pbx-pais');
  if (paisPbx) {
    paisPbx.addEventListener('change', actualizarPaisPbxDesdeUI);
  }
  initTheme();
  establecerFechasPorDefecto();
  actualizarMarcaDashboard();
  actualizarMenuDashboard();
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    mostrarAplicacion();
    irA('catalogo');
  } else {
    mostrarPantallaLogin();
  }
  supabaseClient.auth.onAuthStateChange((_event, nuevaSesion) => {
    if (nuevaSesion) {
      mostrarAplicacion();
      if (vistaActual === 'config') irA('catalogo');
    } else {
      mostrarPantallaLogin();
    }
  });
});
