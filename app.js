// ==================================================================
// ESTADO GLOBAL
// ==================================================================
let supabaseClient = null;
let cache = { leads: [], llamadas: [], historiales: [], ejecutivos: [], teams_registro: [] };
let cargaCompleta = { leads: false, llamadas: false, historiales: false, ejecutivos: false, teams_registro: false };
let cruceCache = null;
let vistaActual = 'config';
let contenidoModalCelda = '';

let SB_URL = "https://sbopifiiyezmvsadwkpg.supabase.co";
let SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNib3BpZmlieWV6bXZzYWR3c3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MzM0OTYsImV4cCI6MjEwMDMwOTQ5Nn0.ZI5y8lroFF529Xr-Otm1fcq6H2lhbh9e3s-WU9O6I7A";

function getSupabase() {
  if (!supabaseClient) supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);
  return supabaseClient;
}

function refrescarClienteSupabase() {
  SB_URL = document.getElementById('sb-url').value.trim();
  SB_KEY = document.getElementById('sb-key').value.trim();
  supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);
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

function render() {
  const main = document.getElementById('main-content');
  if (vistaActual === 'config') return renderConfig(main);
  if (vistaActual === 'criterios') return renderCriterios(main);
  if (vistaActual === 'reg-pbx') return renderRegistro(main, 'llamadas', 'Llamadas PBX', 'fecha');
  if (vistaActual === 'reg-cel') return renderRegistro(main, 'historiales', 'Llamadas Celular', 'fecha');
  if (vistaActual === 'reg-leads') return renderRegistro(main, 'leads', 'Leads Calificados', 'fecha_agendada');
  if (vistaActual === 'reg-teams') return renderRegistroTeams(main);
  if (vistaActual === 'catalogo') return renderCatalogo(main);
  if (vistaActual === 'res-pais') return renderResumenPais(main);
  if (vistaActual === 'res-ejecutivo') return renderResumenEjecutivo(main);
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
        <button onclick="refrescarClienteSupabase(); alert('Credenciales actualizadas.')" class="bg-slate-700 text-xs px-3 py-1.5 rounded hover:bg-slate-600 flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7a4 4 0 100 8 4 4 0 000-8zM12 7v6m3-3H9"></path></svg>
          Guardar credenciales
        </button>
      </div>
      <hr class="border-gray-800">
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

async function sincronizarAPI() {
  const estado = document.getElementById('estado-config');
  if (estado) { estado.innerText = "Sincronizando API..."; estado.classList.remove('hidden'); }
  try {
    const res = await fetch(`${SB_URL}/functions/v1/sincronizar-datos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SB_KEY}`, 'apikey': SB_KEY }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    alert("¡Sincronización completada!");
    await recargarTodoYContadores();
  } catch (err) {
    alert("Error al sincronizar: " + err.message);
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
          <button onclick="recargarUnaTabla('ejecutivos','null')" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            Recargar
          </button>
          <button onclick="exportarXLSX('tabla-ejecutivos','catalogo_ejecutivos')" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Exportar XLSX
          </button>
        </div>
      </div>
      <p class="text-[11px] text-gray-500 mb-3">Gestiona la base de datos de ejecutivos. Estos datos se usan para la búsqueda inteligente en los resúmenes de llamadas. Agranda, edita o elimina directamente desde aquí.</p>
      <span id="estado-tabla" class="text-xs text-red-300">Cargando...</span>
      <div class="overflow-auto mt-2" style="max-height: 68vh;">
        <table class="w-full text-left text-xs" id="tabla-ejecutivos"></table>
      </div>
    </div>`;

  await asegurarCache('ejecutivos', null);
  document.getElementById('estado-tabla').classList.add('hidden');
  
  const ejecutivosConAcciones = cache.ejecutivos.map(e => ({
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

  pintarTablaConFiltros('tabla-ejecutivos', ejecutivosConAcciones);
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
  const ejec = cache.ejecutivos.find(e => e.id === id);
  if (!ejec) return alert('Ejecutivo no encontrado');

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
      const { error } = await client.from('ejecutivos').update(datos).eq('id', parseInt(id));
      if (error) throw error;
      alert('Ejecutivo actualizado');
    } else {
      const { error } = await client.from('ejecutivos').insert([datos]);
      if (error) throw error;
      alert('Ejecutivo agregado');
    }
    
    cargaCompleta.ejecutivos = false;
    await cargarTablaCompleta('ejecutivos', null);
    cerrarModal();
    renderCatalogo(document.getElementById('main-content'));
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function confirmarEliminar(id) {
  if (!confirm('¿Estás seguro que deseas eliminar este ejecutivo?')) return;
  
  const client = getSupabase();
  try {
    const { error } = await client.from('ejecutivos').delete().eq('id', id);
    if (error) throw error;
    alert('Ejecutivo eliminado');
    
    cargaCompleta.ejecutivos = false;
    await cargarTablaCompleta('ejecutivos', null);
    renderCatalogo(document.getElementById('main-content'));
  } catch (err) {
    alert('Error: ' + err.message);
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
  return todos;
}

async function asegurarCache(tabla, orden) {
  if (!cargaCompleta[tabla]) await cargarTablaCompleta(tabla, orden);
  return cache[tabla];
}

async function recargarTodoYContadores() {
  console.log('Iniciando recargarTodoYContadores...');
  cargaCompleta = { leads: false, llamadas: false, historiales: false, ejecutivos: false, teams_registro: false };
  cruceCache = null;
  try {
    await cargarTablaCompleta('leads', 'fecha_agendada');
    await cargarTablaCompleta('llamadas', 'fecha');
    await cargarTablaCompleta('historiales', 'fecha');
    await cargarTablaCompleta('ejecutivos', null);
    
    try {
      await cargarTablaCompleta('teams_registro', null);
    } catch (teamsErr) {
      console.log('Tabla teams_registro no disponible aún (normal si es primera vez)');
      cache.teams_registro = [];
      cargaCompleta.teams_registro = true;
    }
    
    render();
    console.log('Recargar completado!');
  } catch (err) {
    console.error('Error:', err);
    alert('Error al recargar: ' + err.message);
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
function filtrarPorFechaGlobal(datos, columnaFecha) {
  if (!columnaFecha) return datos;
  const desde = document.getElementById('global-desde')?.value;
  const hasta = document.getElementById('global-hasta')?.value;
  if (!desde && !hasta) return datos;
  const desdeT = desde ? new Date(desde + 'T00:00:00Z').getTime() : null;
  const hastaT = hasta ? new Date(hasta + 'T23:59:59Z').getTime() : null;
  return datos.filter(item => {
    const raw = item[columnaFecha];
    if (!raw) return false;
    const t = new Date(raw).getTime();
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
    if (typeof valor === 'string' && valor.trim()) return valor.trim();
  }
  return '';
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
        </div>
      </div>
      <span id="estado-tabla" class="text-xs text-red-300">Cargando...</span>
      <div class="overflow-auto mt-2" style="max-height: 68vh;">
        <table class="w-full text-left text-xs" id="tabla-dinamica"></table>
      </div>
    </div>`;

  await asegurarCache(tabla, columnaFecha);
  document.getElementById('estado-tabla').classList.add('hidden');
  
  let datosFiltrados = filtrarPorFechaGlobal(cache[tabla], columnaFecha);

  if (tabla === 'leads') {
    datosFiltrados = datosFiltrados.map(item => ({
      ...item,
      KPI_ETAPAS: item.KPI_ETAPAS == null ? 0 : item.KPI_ETAPAS,
      KPI_SLA: item.KPI_SLA == null ? 0 : item.KPI_SLA
    }));
  }

  if (tabla === 'llamadas') {
    datosFiltrados = datosFiltrados.map(item => ({
      ...item,
      Escuchar: obtenerUrlAudio(item) || ''
    }));
  }

  if (tabla === 'leads') {
    datosFiltrados = datosFiltrados.map(({ opportunity_stage, stage, opportunityStage, ...rest }) => rest);
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

function valorMostrable(v) {
  if (v === null || v === undefined || v === '') return '(Vacío)';
  return String(v);
}

function pintarTablaConFiltros(contId, datosBase) {
  window.__datosBase[contId] = datosBase;
  filtroColState[contId] = filtroColState[contId] || {};
  repintar(contId);
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

function cerrarModalCelda() {
  document.getElementById('modal-celda').classList.add('modal-hidden');
  contenidoModalCelda = '';
}

function copiarAlPortapapeles() {
  navigator.clipboard.writeText(contenidoModalCelda).then(() => {
    alert('¡Copiado al portapapeles!');
  }).catch(err => {
    alert('Error al copiar: ' + err);
  });
}

const editableColumns = ['KPI_ETAPAS', 'KPI_SLA'];

function repintar(contId) {
  const datosBase = window.__datosBase[contId] || [];
  const filtros = filtroColState[contId] || {};
  const cont = document.getElementById(contId);
  if (!cont) return;
  if (!datosBase.length) {
    cont.innerHTML = `<tbody><tr><td class="p-4 text-center text-gray-500">No hay registros.</td></tr></tbody>`;
    return;
  }
  const columnas = Object.keys(datosBase[0]).filter(c => c !== 'created_at' && c !== 'id' && !c.startsWith('__'));

  let filtrados = datosBase.filter(fila => {
    return columnas.every(col => {
      const set = filtros[col];
      if (!set) return true;
      return set.has(valorMostrable(fila[col]));
    });
  });

  window.__ultimoFiltrado[contId] = filtrados;

  const thead = `<thead><tr>${columnas.map(c => {
    const activo = filtros[c] ? 'activo' : '';
    return c === 'acciones' 
      ? `<th class="p-2">${c}</th>`
      : `<th class="p-2">${c} <span class="filtro-icono ${activo}" onclick="abrirFiltroColumna('${contId}','${c}', this)">▾</span></th>`;
  }).join('')}</tr></thead>`;

  const columnasExpandibles = ['resumen_qa', 'transcripcion'];

  const filas = filtrados.slice(0, 10000).map(fila => {
    return `<tr class="hover:bg-slate-800/50">${columnas.map(c => {
      let v = fila[c];
      if (c === 'acciones') return `<td class="p-2">${v}</td>`;
      if (c === 'Estado' || c === 'Resultado') return `<td class="p-2 whitespace-nowrap">${badgeEstadoCruce(v)}</td>`;
      if (c === 'Cumplió') return `<td class="p-2 whitespace-nowrap">${badgeCumplio(v)}</td>`;
      if (columnasExpandibles.includes(c) && v && String(v).length > 50) {
        const encoded = encodeURIComponent(String(v));
        return `<td class="p-2 max-w-xs"><span class="celda-expandible" data-col="${c}" data-val="${encoded}" onclick="abrirModalCeldaFromEl(this)">Ver contenido...</span></td>`;
      }
      if (v === null || v === undefined || v === '') v = '<span class="text-gray-500 italic">no especificado</span>';
      const rawValue = String(v);
      const contenidoCelda = /<[^>]+>/.test(rawValue) ? rawValue : rawValue.slice(0,120);
      if (c === 'Evidencia') {
        return `<td class="p-2 text-gray-300 align-top">${contenidoCelda}</td>`;
      }
      if (c === 'Escuchar') {
        if (!v) return `<td class="p-2 text-gray-500 italic">Sin audio</td>`;
        const url = String(v).trim();
        return `<td class="p-2 whitespace-nowrap">
          <audio controls preload="metadata" class="h-8 max-w-[240px]" src="${url}">Tu navegador no soporta audio.</audio>
          <div class="text-[11px] mt-1"><a href="${url}" target="_blank" rel="noopener noreferrer" class="text-red-300 hover:text-red-200">Ver link</a></div>
        </td>`;
      }
      if (editableColumns.includes(c)) {
        const rawValue = v === null || v === undefined || v === '' ? '0' : String(v).replace(/\D/g, '').slice(0, 1) || '0';
        return `<td class="p-2 whitespace-nowrap"><div contenteditable="true" spellcheck="false" class="editable-cell rounded bg-slate-900 px-2 py-1 text-right" data-cont="${contId}" data-row="${fila.id || fila.__rowId || ''}" data-col="${c}">${rawValue}</div></td>`;
      }
      return `<td class="p-2 whitespace-nowrap text-gray-300">${contenidoCelda}</td>`;
    }).join('')}</tr>`;
  }).join('');

  cont.innerHTML = thead + `<tbody>${filas || `<tr><td class="p-4 text-center text-gray-500" colspan="${columnas.length}">Sin resultados con esos filtros.</td></tr>`}</tbody>`;

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
  lista.innerHTML = valores.map(v => {
    const checked = cfpState.seleccion.has(v) ? 'checked' : '';
    const safe = v.replace(/"/g, '&quot;');
    return `<label class="cfp-item"><input type="checkbox" data-val="${safe}" ${checked} onchange="cfpToggle(this)"> <span class="truncate">${v}</span></label>`;
  }).join('');
}

function cfpToggle(input) {
  const v = input.dataset.val;
  if (input.checked) cfpState.seleccion.add(v);
  else cfpState.seleccion.delete(v);
  cfpAceptar();
}

function cfpFiltrarLista() {
  const q = document.getElementById('cfp-search').value.toLowerCase().trim();
  const filtrados = cfpState.valoresUnicos.filter(v => v.toLowerCase().includes(q));
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
  if (!datos.length) return alert("No hay datos para exportar.");
  const ws = XLSX.utils.json_to_sheet(datos.map(({acciones, __rowId, ...d}) => d));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nombre.slice(0, 30));
  XLSX.writeFile(wb, `${nombre}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function exportarXLSXGenerico(datos, nombre) {
  if (!datos || datos.length === 0) return alert("No hay datos para exportar.");
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

function parseFechaHora(fecha, hora) {
  if (!fecha) return null;
  let base = String(fecha).trim();
  base = base.includes('T') ? base.split('T')[0] : base;
  let h = hora ? String(hora).trim() : '00:00:00';
  if (h.length === 5) h += ':00';
  const d = new Date(`${base}T${h}`);
  return isNaN(d.getTime()) ? null : d;
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
function formatearHoraCorta(d) {
  if (!d) return '';
  return d.toTimeString().slice(0, 8);
}

function esReunionTeams(tipo) {
  const valor = (tipo || '').toLowerCase();
  return valor.includes('teams') || valor.includes('virtual');
}

function esLlamadaTelefonica(tipo) {
  const valor = (tipo || '').toLowerCase();
  return valor.includes('llamada') && !valor.includes('teams');
}

async function calcularCruceUnificado() {
  await Promise.all([
    asegurarCache('leads', 'fecha_agendada'),
    asegurarCache('llamadas', 'fecha'),
    asegurarCache('historiales', 'fecha'),
    asegurarCache('ejecutivos', null),
    asegurarCache('teams_registro', null)
  ]);

  let leads = cache.leads.filter(l => esLlamadaTelefonica(l.tipo_reunion) || esReunionTeams(l.tipo_reunion));
  leads = filtrarPorFechaGlobal(leads, 'fecha_agendada');
  const ahora = new Date();

  const resultado = leads.map(lead => {
    const telLead = normalizarTel(lead.telefono);
    const progr = parseFechaHora(lead.fecha_agendada, lead.hora_agendada);
    const esTeams = esReunionTeams(lead.tipo_reunion);
    const esLlamada = esLlamadaTelefonica(lead.tipo_reunion);
    
    const ejec = cache.ejecutivos.find(e => (e.nombre_ejecutivo || '').trim().toLowerCase() === (lead.asesor_nombre || '').trim().toLowerCase());
    const usuario = ejec ? ejec.usuario : null;

    let estado = 'Sin llamada encontrada';
    let coincidencia = null;
    let diferenciaMin = null;
    let fuente = '';

    if (esTeams) {
      const teamsData = (cache.teams_registro || []).find(t => t.codigo_prospecto === lead.codigo_prospecto);
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
      const candPBX = cache.llamadas
        .filter(c => normalizarTel(c.destino) === telLead && telLead && (!usuario || c.nombre === usuario))
        .map(c => ({ fuente: 'PBX', fechaHora: c.fecha_hora ? new Date(c.fecha_hora) : null, raw: c }));

      const candCel = cache.historiales
        .filter(c => normalizarTel(c.destino) === telLead && telLead && (!usuario || c.usuario === usuario) && (c.tipo || '').toLowerCase() === 'saliente')
        .map(c => {
          const fBase = c.fecha ? String(c.fecha).split('T')[0] : null;
          const fh = fBase && c.hora ? new Date(`${fBase}T${c.hora}`) : null;
          return { fuente: 'Celular', fechaHora: fh, raw: c };
        });

      const candidatas = [...candPBX, ...candCel].filter(c => c.fechaHora && !isNaN(c.fechaHora.getTime()));

      if (progr && candidatas.length) {
        const delDia = candidatas.filter(c => mismoDia(c.fechaHora, progr));
        if (delDia.length) {
          delDia.sort((a, b) => Math.abs(a.fechaHora - progr) - Math.abs(b.fechaHora - progr));
          coincidencia = delDia[0];
          diferenciaMin = Math.round(Math.abs(coincidencia.fechaHora - progr) / 60000);
          estado = diferenciaMin <= 5 ? 'Cumplió en fecha y horario' : 'Llamó el mismo día fuera de horario';
          fuente = coincidencia.fuente;
        } else {
          candidatas.sort((a, b) => Math.abs(a.fechaHora - progr) - Math.abs(b.fechaHora - progr));
          coincidencia = candidatas[0];
          estado = 'Llamó en otra fecha';
          fuente = coincidencia.fuente;
        }
      } else if (progr) {
        const limite = new Date(progr.getTime() + 5 * 60000);
        estado = ahora < limite ? 'Pendiente de evaluar' : 'Sin llamada encontrada';
      }
    }

    const diferenciaMinFirmada = coincidencia && progr
      ? Math.round(((coincidencia.fechaHora - progr) / 60000) * 10) / 10
      : null;

    const diferenciaHoras = minutosAHoras(diferenciaMinFirmada);

    let duracionSeg = null;
    let duracionMin = null;
    let estadoTipo = '';
    if (coincidencia) {
      if (coincidencia.fuente === 'PBX') {
        duracionSeg = coincidencia.raw.duracion_segundos != null ? Number(coincidencia.raw.duracion_segundos) : hhmmssASegundos(coincidencia.raw.duracion_hh_mm_ss);
        duracionMin = segundosAMinutos(duracionSeg);
        estadoTipo = coincidencia.raw.estado || '';
      } else if (coincidencia.fuente === 'Celular') {
        duracionSeg = hhmmssASegundos(coincidencia.raw.duracion);
        duracionMin = segundosAMinutos(duracionSeg);
        estadoTipo = (coincidencia.raw.tipo || '').toUpperCase();
      }
    }

    return {
      pais: lead.pais || 'N/D',
      ejecutivo: lead.asesor_nombre || 'Sin asignar',
      codigo_prospecto: lead.codigo_prospecto,
      lead: lead.nombre_prospecto,
      cliente: lead.nombre_prospecto,
      telefono: fuente === 'Teams' ? '' : lead.telefono,
      telefono_comparado: fuente === 'Teams' ? '' : telLead || '',
      fecha_reunion: lead.fecha_agendada,
      hora_reunion: lead.hora_agendada,
      status_lead: lead.status,
      resultado: estado,
      fuente: fuente,
      fecha_llamada: coincidencia && coincidencia.fechaHora ? coincidencia.fechaHora.toISOString() : '',
      fecha_llamada_corta: coincidencia && coincidencia.fechaHora ? formatearFechaCorta(coincidencia.fechaHora) : '',
      hora_llamada_corta: coincidencia && coincidencia.fechaHora ? formatearHoraCorta(coincidencia.fechaHora) : '',
      diferencia_min: diferenciaMin,
      diferencia_min_firmada: diferenciaMinFirmada,
      diferencia_horas: diferenciaHoras,
      duracion_seg: duracionSeg,
      duracion_min: duracionMin,
      estado_tipo: estadoTipo,
      catalogo_ok: ejec ? 'Sí' : 'No'
    };
  });

  return resultado;
}

function agregarPorPais(datos) {
  const grupos = {};
  datos.forEach(r => {
    const k = r.pais;
    if (!grupos[k]) grupos[k] = { pais: k, leads: 0, evaluados: 0, cumplieron: 0, fuera_horario: 0, otra_fecha: 0, sin_llamada: 0, pendientes: 0 };
    const g = grupos[k];
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
  return Object.values(grupos).map(g => {
    g.no_cumplieron = g.fuera_horario + g.otra_fecha + g.sin_llamada;
    const base = g.evaluados;
    const pctNum = base > 0 ? (g.cumplieron / base) * 100 : 0;
    g.pct_cumplimiento = base > 0 ? pctNum.toFixed(1) + '%' : '—';
    g.pct_num = pctNum;
    return g;
  }).sort((a, b) => nombrePais(a.pais).localeCompare(nombrePais(b.pais)));
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

function pintarTablaResumenPais(datos, total) {
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
    const base = esTotal ? 'bg-[#0f3a4a] text-white font-bold' : 'hover:bg-slate-800/50 text-gray-200';
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
    return `<th data-key="${c.key}" class="p-2.5 ${align} text-[10px]">${c.label} ${hasFilter ? '<span class="filtro-icono" onclick="abrirFiltroColumnaResumen(\'tabla-resumen-pais\',\'' + c.key + '\', this)">▾</span>' : ''}</th>`;
  }).join('')}</tr>`;
  const filas = datos.map(d => filaHtml(d, false)).join('') + filaHtml(total, true);

  document.getElementById('tabla-resumen-pais').innerHTML = `
    <div class="overflow-auto rounded-lg border border-gray-800">
      <table class="w-full text-xs border-collapse">
        <thead class="bg-[#0e7490] text-white">${thead}</thead>
        <tbody class="divide-y divide-gray-800">${filas}</tbody>
      </table>
    </div>`;
}

async function renderResumenPais(main) {
  main.innerHTML = `<div class="bg-[#111827] p-4 rounded-lg border border-gray-800">
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-sm font-bold text-gray-300">Resumen de Cumplimiento por País</h2>
      <div class="flex gap-2">
        <button onclick="renderResumenPais(document.getElementById('main-content'))" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          Recalcular
        </button>
        <button id="btn-exp-pais" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Exportar XLSX
        </button>
      </div>
    </div>
    <p class="text-[11px] text-gray-500 mb-3">Incluye Llamadas PBX, Celulares y Teams. Teléfonos comparados por últimos 8 dígitos. ±5 min de tolerancia. Ejecutivo identificado por extensión/usuario según catálogo.</p>
    <div id="tabla-resumen-pais" class="overflow-auto text-xs"><span class="text-red-300">Calculando cruce...</span></div>
  </div>`;

  const cruce = await calcularCruceUnificado();
  const datos = agregarPorPais(cruce);
  const total = calcularFilaTotal(datos);
  pintarTablaResumenPais(datos, total);
  document.getElementById('btn-exp-pais').onclick = () => exportarXLSXGenerico(
    [...datos, total].map(({pct_num, ...r}) => r), 'resumen_por_pais'
  );
}

function construirResumenPorEjecutivo(cruce) {
  const grupos = {};
  cache.ejecutivos.forEach(e => {
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

function pintarTablaResumenEjecutivo(filasCatalogo, filasSinCatalogo, total) {
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
    const base = esTotal ? 'bg-[#0f3a4a] text-white font-bold' : 'hover:bg-slate-800/50 text-gray-200';
    return `<tr class="${base}">${cols.map(c => {
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

async function renderResumenEjecutivo(main) {
  main.innerHTML = `<div class="bg-[#111827] p-4 rounded-lg border border-gray-800">
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-sm font-bold text-gray-300">Resumen Cumplimiento</h2>
      <div class="flex gap-2">
        <button onclick="renderResumenEjecutivo(document.getElementById('main-content'))" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          Recalcular
        </button>
        <button id="btn-exp-ejec" class="bg-red-600 hover:bg-red-700 text-xs px-3 py-1.5 rounded flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Exportar XLSX
        </button>
      </div>
    </div>
    <p class="text-[11px] text-gray-500 mb-3">Evaluación por ejecutivo. El % excluye pendientes. Todos los ejecutivos en catálogo se listan aunque tengan 0 leads. Incluye Llamadas y Teams.</p>
    <div id="tabla-resumen-ejec" class="overflow-auto text-xs"><span class="text-red-300">Calculando cruce...</span></div>
  </div>`;

  const cruce = await calcularCruceUnificado();
  const { filasCatalogo, filasSinCatalogo } = construirResumenPorEjecutivo(cruce);
  const total = calcularFilaTotal([...filasCatalogo, ...filasSinCatalogo]);
  pintarTablaResumenEjecutivo(filasCatalogo, filasSinCatalogo, total);
  document.getElementById('btn-exp-ejec').onclick = () => exportarXLSXGenerico(
    [...filasCatalogo, ...filasSinCatalogo, total].map(({pct_num, enCatalogo, ...r}) => r),
    'resumen_cumplimiento'
  );
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
    'País': r.pais,
    'Ejecutivo': r.ejecutivo,
    'Lead': r.codigo_prospecto,
    'Cliente': r.cliente,
    'Teléfono CRM': r.telefono,
    'Teléfono comparado': r.telefono_comparado,
    'Fecha reunión': r.fecha_reunion,
    'Hora reunión': r.hora_reunion,
    'Resultado': r.resultado,
    'Fuente': r.fuente,
    'Fecha llamada': r.fecha_llamada_corta,
    'Hora llamada': r.hora_llamada_corta,
    'Diferencia (min)': r.diferencia_min_firmada,
    'Diferencia (hs)': r.diferencia_horas,
    'Duración (seg)': r.duracion_seg,
    'Duración (min)': r.duracion_min,
    'Estado/tipo': r.estado_tipo,
    'KPI_ETAPAS': 0,
    'KPI_SLA': 0,
    'En catálogo': r.catalogo_ok,
    __rowId: idx
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

document.addEventListener('focusout', event => {
  const target = event.target;
  if (!(target instanceof HTMLElement) || !target.classList.contains('editable-cell')) return;
  const raw = target.innerText.trim();
  const clean = raw.replace(/\D/g, '').slice(0, 1);
  const value = clean || '0';
  if (target.innerText !== value) target.innerText = value;
  actualizarEditable(target.dataset.cont, target.dataset.row, target.dataset.col, value);
});

function actualizarEditable(contId, rowId, col, valor) {
  if (!contId || !rowId || !col) return;
  const datos = window.__datosBase[contId];
  if (!Array.isArray(datos)) return;
  const fila = datos.find(r => String(r.id || r.__rowId) === String(rowId));
  if (!fila) return;
  fila[col] = valor;

  const ultimo = window.__ultimoFiltrado[contId];
  if (Array.isArray(ultimo)) {
    const fila2 = ultimo.find(r => String(r.id || r.__rowId) === String(rowId));
    if (fila2) fila2[col] = valor;
  }

  if (contId === 'tabla-dinamica' && editableColumns.includes(col) && fila.id) {
    actualizarLeadKPI(fila.id, col, Number(valor));
  }
}

async function actualizarLeadKPI(id, col, valor) {
  if (!id || !editableColumns.includes(col)) return;
  try {
    const cliente = getSupabase();
    const updateData = {};
    updateData[col] = Number.isNaN(valor) ? 0 : valor;
    const { error } = await cliente.from('leads').update(updateData).eq('id', id);
    if (error) {
      console.error('Error guardando KPI en leads:', error.message);
    }
  } catch (err) {
    console.error('Error guardando KPI en leads:', err);
  }
}

async function calcularTeams() {
  await asegurarCache('leads', 'fecha_agendada');
  
  try {
    await asegurarCache('teams_registro', null);
  } catch (err) {
    console.log('teams_registro no disponible, usando array vacío');
    cache.teams_registro = [];
    cargaCompleta.teams_registro = true;
  }
  
  let leads = cache.leads.filter(l => esReunionTeams(l.tipo_reunion));
  
  leads = filtrarPorFechaGlobal(leads, 'fecha_agendada');
  
  return leads.map(lead => {
    const leadCode = lead.codigo_prospecto;
    const teamsData = (cache.teams_registro || []).find(t => t.codigo_prospecto === leadCode) || {};
    
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
  let registro = cache.teams_registro.find(t => String(t.id) === String(key));
  let lead = null;
  if (!registro) {
    lead = cache.leads.find(l => String(l.codigo_prospecto) === String(key));
    if (!lead) return alert('Registro no encontrado');
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
      const { error } = await client.from('teams_registro').update(datos).eq('id', parseInt(id));
      if (error) throw error;
      alert('Reunión Teams actualizada');
    } else {
      const { error } = await client.from('teams_registro').insert([datos]);
      if (error) throw error;
      alert('Reunión Teams agregada');
    }
    
    cargaCompleta.teams_registro = false;
    await cargarTablaCompleta('teams_registro', null);
    cerrarModalTeams();
    renderRegistroTeams(document.getElementById('main-content'));
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function abrirFiltroColumnaResumen(tablaId, col, btnEl) {
  const tabla = document.getElementById(tablaId);
  if (!tabla) return;
  
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

  const valoresOrdenados = Array.from(valoresUnicos).sort((a,b) => a.localeCompare(b));
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
  initTheme();
  establecerFechasPorDefecto();
  irA('catalogo');
});
