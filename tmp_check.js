
    // ==================================================================
    // ESTADO GLOBAL
    // ==================================================================
    let supabaseClient = null;
    let cache = { leads: [], llamadas: [], historiales: [], ejecutivos: [] };
    let cargaCompleta = { leads: false, llamadas: false, historiales: false, ejecutivos: false };
    let cruceCache = null;
    let vistaActual = 'config';

    let SB_URL = "https://sbopifiiyezmvsadwkpg.supabase.co";
    let SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNib3BpZmlpeWV6bXZzYWR3a3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MzM0OTYsImV4cCI6MjEwMDMwOTQ5Nn0.ZI5y8lroFF529Xr-Otm1fcq6H2lhbh9e3s-WU9O6I7A";

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
      if (vistaActual === 'catalogo') return renderCatalogo(main);
      if (vistaActual === 'res-pais') return renderResumenPais(main);
      if (vistaActual === 'res-ejecutivo') return renderResumenEjecutivo(main);
      if (vistaActual === 'res-detalle') return renderResumenDetalle(main);
      if (vistaActual === 'res-teams') return renderResumenTeams(main);
      if (vistaActual === 'res-detalle-teams') return renderDetalleTeams(main);
    }

    // ==================================================================
    // VISTA: CONFIGURACION
    // ==================================================================
    function renderConfig(main) {
      main.innerHTML = `
        <div class="max-w-xl bg-[#111827] p-5 rounded-lg border border-gray-800 space-y-4">
          <h2 class="text-sm font-bold text-gray-300 flex items-center gap-2">⚙️ Configuración de Supabase</h2>
          <div>
            <label class="block text-xs text-gray-400 mb-1">URL de Supabase</label>
            <input type="text" id="sb-url" value="${SB_URL}" class="w-full p-2 text-xs rounded focus:outline-none focus:border-cyan-500">
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Anon Key de Supabase</label>
            <input type="password" id="sb-key" value="${SB_KEY}" class="w-full p-2 text-xs rounded focus:outline-none focus:border-cyan-500">
          </div>
          <div class="flex gap-2">
            <button onclick="toggleKey()" class="bg-gray-800 text-xs px-3 py-1.5 rounded hover:bg-gray-700">👁️ Mostrar/Ocultar</button>
            <button onclick="refrescarClienteSupabase(); alert('Credenciales actualizadas.')" class="bg-slate-700 text-xs px-3 py-1.5 rounded hover:bg-slate-600">💾 Guardar credenciales</button>
          </div>
          <hr class="border-gray-800">
          <h3 class="text-xs font-bold text-gray-400">Sincronización con la API externa</h3>
          <button onclick="sincronizarAPI()" class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 text-xs rounded">⚡ Sincronizar API (Edge Function)</button>
          <button onclick="recargarTodoYContadores()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 text-xs rounded">🔄 Recargar todos los datos</button>
          <span id="estado-config" class="text-xs text-cyan-400 hidden">Procesando...</span>
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
          <span class="text-cyan-400 font-mono font-bold shrink-0 w-44">${nombre}</span>
          <span class="text-gray-400">${explicacion}</span>
        </div>`;

      main.innerHTML = `
        <div class="max-w-4xl space-y-4">
          <div class="bg-[#0e7490]/10 border border-cyan-900 rounded-lg p-4">
            <h2 class="text-sm font-bold text-cyan-300 mb-1">📖 Criterios de clasificación del dashboard</h2>
            <p class="text-xs text-gray-400">Esta pantalla explica los criterios del cruce, estados y columnas de los resúmenes. Sirve como referencia para entender por qué un lead cae en un grupo u otro.</p>
          </div>
          ${seccion('Estados de cumplimiento (estado_cruce)', '🚦', `
            <div class="space-y-2">
              <div class="flex items-center gap-2"><span class="badge bg-emerald-900 text-emerald-300">Cumplió</span> <span class="text-gray-400">Llamada el mismo día, ±5 minutos de la hora agendada.</span></div>
              <div class="flex items-center gap-2"><span class="badge bg-amber-900 text-amber-300">Mismo día fuera horario</span> <span class="text-gray-400">Llamada el mismo día, pero fuera de ±5 minutos.</span></div>
              <div class="flex items-center gap-2"><span class="badge bg-orange-900 text-orange-300">Llamó en otra fecha</span> <span class="text-gray-400">Llamada en fecha distinta a la agendada.</span></div>
              <div class="flex items-center gap-2"><span class="badge bg-red-900 text-red-300">Sin llamada</span> <span class="text-gray-400">No se encontró ninguna llamada coincidente.</span></div>
              <div class="flex items-center gap-2"><span class="badge bg-sky-900 text-sky-300">Pendiente</span> <span class="text-gray-400">La hora agendada aún no ha pasado.</span></div>
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
            <h2 class="text-sm font-bold text-gray-300">📇 Catálogo de Ejecutivos (CRUD)</h2>
            <div class="flex flex-wrap gap-2 items-center">
              <button onclick="abrirModalNuevo()" class="bg-teal-600 hover:bg-teal-700 text-xs px-3 py-1.5 rounded font-bold">➕ Nuevo Ejecutivo</button>
              <button onclick="recargarUnaTabla('ejecutivos','null')" class="bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1.5 rounded">🔄 Recargar</button>
              <button onclick="exportarXLSX('tabla-ejecutivos','catalogo_ejecutivos')" class="bg-emerald-600 hover:bg-emerald-700 text-xs px-3 py-1.5 rounded">⬇️ Exportar XLSX</button>
            </div>
          </div>
          <p class="text-[11px] text-gray-500 mb-3">Gestiona la base de datos de ejecutivos. Estos datos se usan para la búsqueda inteligente en los resúmenes de llamadas. Agranda, edita o elimina directamente desde aquí.</p>
          <span id="estado-tabla" class="text-xs text-cyan-400">Cargando...</span>
          <div class="overflow-auto mt-2" style="max-height: 68vh;">
            <table class="w-full text-left text-xs" id="tabla-ejecutivos"></table>
          </div>
        </div>`;

      await asegurarCache('ejecutivos', null);
      document.getElementById('estado-tabla').classList.add('hidden');
      
      // Agregar botones de acción a cada fila
      const ejecutivosConAcciones = cache.ejecutivos.map(e => ({
        ...e,
        acciones: `<div class="flex gap-1" style="white-space: nowrap;">
          <button onclick="abrirModalEditar(${e.id})" class="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1 rounded">✏️</button>
          <button onclick="confirmarEliminar(${e.id})" class="bg-red-600 hover:bg-red-700 text-xs px-2 py-1 rounded">🗑️</button>
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
      document.getElementById('modal-titulo').textContent = '➕ Nuevo Ejecutivo';
      document.getElementById('ejecutivo-id').value = '';
      document.getElementById('form-ejecutivo').reset();
      abrirModal();
    }

    async function abrirModalEditar(id) {
      const ejec = cache.ejecutivos.find(e => e.id === id);
      if (!ejec) return alert('Ejecutivo no encontrado');

      document.getElementById('modal-titulo').textContent = '✏️ Editar Ejecutivo';
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
          // Editar
          const { error } = await client.from('ejecutivos').update(datos).eq('id', parseInt(id));
          if (error) throw error;
          alert('✅ Ejecutivo actualizado');
        } else {
          // Crear
          const { error } = await client.from('ejecutivos').insert([datos]);
          if (error) throw error;
          alert('✅ Ejecutivo agregado');
        }
        
        // Recargar tabla
        cargaCompleta.ejecutivos = false;
        await cargarTablaCompleta('ejecutivos', null);
        cerrarModal();
        renderCatalogo(document.getElementById('main-content'));
      } catch (err) {
        alert('❌ Error: ' + err.message);
      }
    }

    async function confirmarEliminar(id) {
      if (!confirm('¿Estás seguro que deseas eliminar este ejecutivo?')) return;
      
      const client = getSupabase();
      try {
        const { error } = await client.from('ejecutivos').delete().eq('id', id);
        if (error) throw error;
        alert('✅ Ejecutivo eliminado');
        
        cargaCompleta.ejecutivos = false;
        await cargarTablaCompleta('ejecutivos', null);
        renderCatalogo(document.getElementById('main-content'));
      } catch (err) {
        alert('❌ Error: ' + err.message);
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

    async function actualizarContadores() {
      try {
        const client = getSupabase();
        const [rLeads, rHist, rLlam] = await Promise.all([
          client.from('leads').select('*', { count: 'exact', head: true }),
          client.from('historiales').select('*', { count: 'exact', head: true }),
          client.from('llamadas').select('*', { count: 'exact', head: true })
        ]);
        const cL = rLeads.count || 0, cH = rHist.count || 0, cLl = rLlam.count || 0;
        document.getElementById('cant-leads').innerText = cL.toLocaleString();
        document.getElementById('cant-hist').innerText = cH.toLocaleString();
        document.getElementById('cant-llam').innerText = cLl.toLocaleString();
        document.getElementById('cant-total').innerText = (cL + cH + cLl).toLocaleString();
      } catch (e) { console.error(e); }
    }

    async function recargarTodoYContadores() {
      console.log('🔄 [DEBUG] Iniciando recargarTodoYContadores...');
      cargaCompleta = { leads: false, llamadas: false, historiales: false, ejecutivos: false };
      cruceCache = null;
      try {
        await cargarTablaCompleta('leads', 'fecha_agendada');
        await cargarTablaCompleta('llamadas', 'fecha');
        await cargarTablaCompleta('historiales', 'fecha');
        await cargarTablaCompleta('ejecutivos', null);
        await actualizarContadores();
        render();
        console.log('✨ [DEBUG] ¡Recargar completado!');
      } catch (err) {
        console.error('❌ [ERROR]', err);
        alert('Error al recargar: ' + err.message);
      }
    }

    // ==================================================================
    // BADGES DE ESTADO
    // ==================================================================
    function badgeEstadoCruce(estado) {
      const map = {
        'Cumplió': 'bg-emerald-900 text-emerald-300',
        'Mismo día fuera horario': 'bg-amber-900 text-amber-300',
        'Llamó en otra fecha': 'bg-orange-900 text-orange-300',
        'Sin llamada': 'bg-red-900 text-red-300',
        'Pendiente': 'bg-sky-900 text-sky-300',
        'Sin evidencia Teams': 'bg-red-900 text-red-300',
        'Cumplió fecha y horario': 'bg-emerald-900 text-emerald-300',
        'Llamó el mismo día fuera de horario': 'bg-amber-900 text-amber-300',
        'Sin llamada encontrada': 'bg-red-900 text-red-300',
        'Pendiente de evaluar': 'bg-sky-900 text-sky-300'
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

    async function renderRegistro(main, tabla, titulo, columnaFecha) {
      main.innerHTML = `
        <div class="bg-[#111827] p-4 rounded-lg border border-gray-800">
          <div class="flex flex-wrap justify-between items-center gap-2 mb-3">
            <h2 class="text-sm font-bold text-gray-300">📂 ${titulo}</h2>
            <div class="flex flex-wrap gap-2 items-center">
              <button onclick="recargarUnaTabla('${tabla}','${columnaFecha||''}')" class="bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1.5 rounded">🔄 Recargar</button>
              <button onclick="exportarXLSX('tabla-dinamica','${tabla}')" class="bg-emerald-600 hover:bg-emerald-700 text-xs px-3 py-1.5 rounded">⬇️ Exportar XLSX</button>
            </div>
          </div>
          <span id="estado-tabla" class="text-xs text-cyan-400">Cargando...</span>
          <div class="overflow-auto mt-2" style="max-height: 68vh;">
            <table class="w-full text-left text-xs" id="tabla-dinamica"></table>
          </div>
        </div>`;

      await asegurarCache(tabla, columnaFecha);
      document.getElementById('estado-tabla').classList.add('hidden');
      pintarTablaConFiltros('tabla-dinamica', filtrarPorFechaGlobal(cache[tabla], columnaFecha));
    }

    async function recargarUnaTabla(tabla, columnaFecha) {
      cargaCompleta[tabla] = false;
      await cargarTablaCompleta(tabla, columnaFecha || null);
      await actualizarContadores();
      pintarTablaConFiltros('tabla-dinamica', filtrarPorFechaGlobal(cache[tabla], columnaFecha));
    }

    let filtroColState = {};
    window.__datosBase = {};
    window.__ultimoFiltrado = {};

    function valorMostrable(v) {
      if (v === null || v === undefined || v === '') return '(Vacío)';
      return String(v);
    }

    function stripHtml(html) {
      return String(html).replace(/<[^>]*>/g, '').trim();
    }

    function prepararDatosResumenPais(datosPorPais) {
      return datosPorPais.map(d => ({
        País: nombrePais(d.pais),
        Leads: d.leads,
        Evaluados: d.evaluados,
        Cumplieron: d.cumplieron,
        'Mismo día fuera horario': d.fuera_horario,
        'Otra fecha': d.otra_fecha,
        'Sin llamada': d.sin_llamada,
        Pendientes: d.pendientes,
        'No cumplieron': d.no_cumplieron,
        '% cumplimiento': d.pct_cumplimiento
      }));
    }

    function prepararDatosResumenEjecutivo(filasCatalogo, filasSinCatalogo) {
      return [...filasCatalogo, ...filasSinCatalogo].map(d => ({
        País: nombrePais(d.pais),
        Ejecutivo: d.ejecutivo,
        Usuario: d.usuario || '',
        Extensión: d.extension || '',
        'En catálogo': d.enCatalogo ? 'Sí' : 'No',
        Leads: d.leads,
        Evaluados: d.evaluados,
        Cumplieron: d.cumplieron,
        'Mismo día fuera horario': d.fuera_horario,
        'Otra fecha': d.otra_fecha,
        'Sin llamada': d.sin_llamada,
        Pendientes: d.pendientes,
        'No cumplieron': d.no_cumplieron,
        '% cumplimiento': d.pct_cumplimiento,
        Clasificación: stripHtml(d.clasificacion_html)
      }));
    }

    function prepararDatosResumenTeams(registros) {
      return registros.map(r => ({
        País: nombrePais(r.pais),
        Ejecutivo: r.ejecutivo,
        Leads: r.leads,
        Evaluados: r.evaluados,
        Pendientes: r.pendientes,
        Clasificación: stripHtml(r.clasificacion_html)
      }));
    }

    function pintarTablaConFiltros(contId, datosBase) {
      window.__datosBase[contId] = datosBase;
      filtroColState[contId] = filtroColState[contId] || {};
      repintar(contId);
    }

    function repintar(contId) {
      const datosBase = window.__datosBase[contId] || [];
      const filtros = filtroColState[contId] || {};
      const cont = document.getElementById(contId);
      if (!cont) return;
      if (!datosBase.length) {
        cont.innerHTML = `<tbody><tr><td class="p-4 text-center text-gray-500">No hay registros.</td></tr></tbody>`;
        return;
      }
      const columnas = Object.keys(datosBase[0]).filter(c => c !== 'created_at');

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

      const filas = filtrados.slice(0, 300).map(fila => {
        return `<tr class="hover:bg-slate-800/50">${columnas.map(c => {
          let v = fila[c];
          if (c === 'acciones') return `<td class="p-2">${v}</td>`;
          if (c === 'estado_cruce' || c === 'Resultado') return `<td class="p-2 whitespace-nowrap">${badgeEstadoCruce(v)}</td>`;
          if (c === 'Cumplió') return `<td class="p-2 whitespace-nowrap">${badgeCumplio(v)}</td>`;
          if (v === null || v === undefined || v === '') v = '<span class="text-gray-500 italic">no especificado</span>';
          return `<td class="p-2 whitespace-nowrap text-gray-300">${String(v).slice(0,120)}</td>`;
        }).join('')}</tr>`;
      }).join('');

      cont.innerHTML = thead + `<tbody>${filas || `<tr><td class="p-4 text-center text-gray-500" colspan="${columnas.length}">Sin resultados con esos filtros.</td></tr>`}</tbody>`;

      const contador = document.getElementById('estado-tabla');
      if (contador) { contador.classList.remove('hidden'); contador.innerText = `${filtrados.length.toLocaleString()} de ${datosBase.length.toLocaleString()} registros (mostrando máx. 300 en pantalla; XLSX exporta todo lo filtrado)`; }
    }

    let cfpState = null;

    function abrirFiltroColumna(contId, col, btnEl) {
      const datosBase = window.__datosBase[contId] || [];
      const valoresUnicos = Array.from(new Set(datosBase.map(f => valorMostrable(f[col])))).sort((a,b)=>a.localeCompare(b));
      const actual = filtroColState[contId][col];
      const seleccion = actual ? new Set(actual) : new Set(valoresUnicos);

      cfpState = { contId, col, valoresUnicos, seleccion };

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
      // APLICA FILTRO AUTOMÁTICAMENTE (sin esperar a "Aceptar")
      cfpAceptar();
    }

    function cfpFiltrarLista() {
      const q = document.getElementById('cfp-search').value.toLowerCase().trim();
      const filtrados = cfpState.valoresUnicos.filter(v => v.toLowerCase().includes(q));
      cfpPintarLista(filtrados);
      
      // Aplicar automáticamente sin checkboxes
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
      const { contId, col, valoresUnicos, seleccion } = cfpState;
      if (seleccion.size === valoresUnicos.length || seleccion.size === 0) {
        delete filtroColState[contId][col];
      } else {
        filtroColState[contId][col] = new Set(seleccion);
      }
      // NO cierra el popup - el usuario puede seguir filtrando
      repintar(contId);
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
      const ws = XLSX.utils.json_to_sheet(datos.map(({acciones, ...d}) => d));
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
    // MOTOR DE CRUCE (RESUMIDO PARA BREVEDAD)
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

    async function calcularCruce(forzar) {
      await Promise.all([
        asegurarCache('leads', 'fecha_agendada'),
        asegurarCache('llamadas', 'fecha'),
        asegurarCache('historiales', 'fecha'),
        asegurarCache('ejecutivos', null)
      ]);

      let leads = cache.leads.filter(l => (l.tipo_reunion || '').toLowerCase().includes('llamada'));
      leads = filtrarPorFechaGlobal(leads, 'fecha_agendada');
      const ahora = new Date();

      const resultado = leads.map(lead => {
        const telLead = normalizarTel(lead.telefono);
        const progr = parseFechaHora(lead.fecha_agendada, lead.hora_agendada);
        const ejec = cache.ejecutivos.find(e => (e.nombre_ejecutivo || '').trim().toLowerCase() === (lead.asesor_nombre || '').trim().toLowerCase());
        const usuario = ejec ? ejec.usuario : null;

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

        let estado = 'Sin llamada';
        let coincidencia = null;
        let diferenciaMin = null;

        if (progr && candidatas.length) {
          const delDia = candidatas.filter(c => mismoDia(c.fechaHora, progr));
          if (delDia.length) {
            delDia.sort((a, b) => Math.abs(a.fechaHora - progr) - Math.abs(b.fechaHora - progr));
            coincidencia = delDia[0];
            diferenciaMin = Math.round(Math.abs(coincidencia.fechaHora - progr) / 60000);
            estado = diferenciaMin <= 5 ? 'Cumplió' : 'Mismo día fuera horario';
          } else {
            candidatas.sort((a, b) => Math.abs(a.fechaHora - progr) - Math.abs(b.fechaHora - progr));
            coincidencia = candidatas[0];
            estado = 'Llamó en otra fecha';
          }
        } else if (progr) {
          const limite = new Date(progr.getTime() + 5 * 60000);
          estado = ahora < limite ? 'Pendiente' : 'Sin llamada';
        }

        const diferenciaMinFirmada = coincidencia && progr
          ? Math.round(((coincidencia.fechaHora - progr) / 60000) * 10) / 10
          : null;

        const RESULTADO_TEXTO = {
          'Cumplió': 'Cumplió fecha y horario',
          'Mismo día fuera horario': 'Llamó el mismo día fuera de horario',
          'Llamó en otra fecha': 'Llamó en otra fecha',
          'Sin llamada': 'Sin llamada encontrada',
          'Pendiente': 'Pendiente de evaluar'
        };
        const cumplioTexto = estado === 'Cumplió' ? 'Sí' : (estado === 'Pendiente' ? 'Pendiente' : 'No');

        let duracionSeg = null;
        let estadoTipo = '';
        if (coincidencia) {
          if (coincidencia.fuente === 'PBX') {
            duracionSeg = coincidencia.raw.duracion_segundos != null ? Number(coincidencia.raw.duracion_segundos) : hhmmssASegundos(coincidencia.raw.duracion_hh_mm_ss);
            estadoTipo = coincidencia.raw.estado || '';
          } else {
            duracionSeg = hhmmssASegundos(coincidencia.raw.duracion);
            estadoTipo = (coincidencia.raw.tipo || '').toUpperCase();
          }
        }

        return {
          pais: lead.pais || 'N/D',
          ejecutivo: lead.asesor_nombre || 'Sin asignar',
          codigo_prospecto: lead.codigo_prospecto,
          lead: lead.nombre_prospecto,
          telefono: lead.telefono,
          telefono_comparado: telLead || '',
          fecha_reunion: lead.fecha_agendada,
          hora_reunion: lead.hora_agendada,
          status_lead: lead.status,
          opportunity_stage: lead.opportunity_stage,
          estado_cruce: estado,
          resultado_texto: RESULTADO_TEXTO[estado] || estado,
          cumplio_texto: cumplioTexto,
          diferencia_min: diferenciaMin,
          diferencia_min_firmada: diferenciaMinFirmada,
          fuente_llamada: coincidencia ? coincidencia.fuente : '',
          fecha_llamada: coincidencia && coincidencia.fechaHora ? coincidencia.fechaHora.toISOString() : '',
          fecha_llamada_corta: coincidencia && coincidencia.fechaHora ? formatearFechaCorta(coincidencia.fechaHora) : '',
          hora_llamada_corta: coincidencia && coincidencia.fechaHora ? formatearHoraCorta(coincidencia.fechaHora) : '',
          duracion_seg: duracionSeg,
          estado_tipo: estadoTipo,
          intentos_mismo_dia: progr ? candidatas.filter(c => mismoDia(c.fechaHora, progr)).length : 0,
          intentos_totales: candidatas.length,
          catalogo_ok: ejec ? 'Sí' : 'No'
        };
      });

      cruceCache = resultado;
      return resultado;
    }

    function agregar(cruce, claveFn) {
      const grupos = {};
      cruce.forEach(r => {
        const k = claveFn(r);
        if (!grupos[k.key]) grupos[k.key] = { ...k.datos, leads: 0, evaluados: 0, cumplieron: 0, fuera_horario: 0, otra_fecha: 0, sin_llamada: 0, pendientes: 0 };
        const g = grupos[k.key];
        g.leads++;
        if (r.estado_cruce === 'Pendiente') {
          g.pendientes++;
        } else {
          g.evaluados++;
          if (r.estado_cruce === 'Cumplió') g.cumplieron++;
          else if (r.estado_cruce === 'Mismo día fuera horario') g.fuera_horario++;
          else if (r.estado_cruce === 'Llamó en otra fecha') g.otra_fecha++;
          else if (r.estado_cruce === 'Sin llamada') g.sin_llamada++;
        }
      });
      return Object.values(grupos).map(g => {
        const noCumplieron = g.fuera_horario + g.otra_fecha + g.sin_llamada;
        const base = g.evaluados;
        const pctNum = base > 0 ? (g.cumplieron / base) * 100 : 0;
        const clas = claseClasificacion(pctNum, g.evaluados);
        return {
          ...g,
          no_cumplieron: noCumplieron,
          pct_cumplimiento: base > 0 ? pctNum.toFixed(1) + '%' : '—',
          clasificacion_html: `<span class="badge ${clas.clase}">${clas.texto}</span>`
        };
      });
    }

    // ==================================================================
    // VISTA: RESUMEN POR PAIS
    // ==================================================================
    const NOMBRES_PAIS = {
      SV: 'El Salvador', GT: 'Guatemala', HN: 'Honduras', NI: 'Nicaragua',
      CR: 'Costa Rica', PA: 'Panamá', MX: 'México', US: 'Estados Unidos'
    };
    function nombrePais(codigo) {
      if (!codigo || codigo === 'N/D') return 'Sin país';
      return NOMBRES_PAIS[codigo] || codigo;
    }

    function calcularFilaTotal(datosPorPais) {
      const total = { pais: 'TOTAL', leads: 0, evaluados: 0, cumplieron: 0, fuera_horario: 0, otra_fecha: 0, sin_llamada: 0, pendientes: 0, no_cumplieron: 0 };
      datosPorPais.forEach(d => {
        total.leads += d.leads; total.evaluados += d.evaluados; total.cumplieron += d.cumplieron;
        total.fuera_horario += d.fuera_horario; total.otra_fecha += d.otra_fecha; total.sin_llamada += d.sin_llamada;
        total.pendientes += d.pendientes; total.no_cumplieron += d.no_cumplieron;
      });
      const base = total.evaluados;
      const pctNum = base > 0 ? (total.cumplieron / base) * 100 : 0;
      total.pct_num = pctNum;
      total.pct_cumplimiento = base > 0 ? pctNum.toFixed(1) + '%' : '—';
      const clas = claseClasificacion(pctNum, total.evaluados);
      total.clasificacion_html = `<span class="badge ${clas.clase}">${clas.texto}</span>`;
      return total;
    }

    function generarLecturaEjecutiva(datosPorPais, total, cruce) {
      const lineas = [];
      const baseTotal = total.evaluados;
      lineas.push({
        titulo: 'Resultado general',
        texto: baseTotal > 0
          ? `${total.cumplieron} de ${baseTotal} leads evaluados cumplieron dentro de ±5 minutos (${total.pct_cumplimiento}).`
          : `Aún no hay leads evaluados en el rango seleccionado.`
      });

      datosPorPais.forEach(p => {
        const base = p.evaluados;
        lineas.push({
          titulo: nombrePais(p.pais),
          texto: base > 0
            ? `${p.cumplieron} de ${base} evaluados cumplieron; ${p.fuera_horario} fuera de horario, ${p.otra_fecha} en otra fecha y ${p.sin_llamada} sin llamada.`
            : `Sin leads evaluados en el rango seleccionado.`
        });
      });

      const pendientes = cruce.filter(r => r.estado_cruce === 'Pendiente');
      const textoPendientes = pendientes.length
        ? pendientes.map(r => `${r.codigo_prospecto || 'Lead sin código'} de ${r.ejecutivo || 'ejecutivo sin asignar'}`).join(', ') + '.'
        : 'Ninguno.';
      lineas.push({ titulo: 'Pendientes', texto: textoPendientes });

      return lineas;
    }

    function pctBadgeClase(pctNum, evaluados) {
      return claseClasificacion(pctNum, evaluados).clase;
    }

    function pintarTablaResumenPais(datosPorPais, total, cruce) {
      const cols = [
        { key: 'pais',              label: 'País' },
        { key: 'leads',             label: 'Leads telefónicos' },
        { key: 'evaluados',         label: 'Evaluados' },
        { key: 'cumplieron',        label: 'Cumplieron fecha y horario' },
        { key: 'fuera_horario',     label: 'Mismo día fuera horario' },
        { key: 'otra_fecha',        label: 'Llamó en otra fecha' },
        { key: 'sin_llamada',       label: 'Sin llamada' },
        { key: 'pendientes',        label: 'Pendientes' },
        { key: 'no_cumplieron',     label: 'No cumplieron' },
        { key: 'pct_cumplimiento',  label: '% cumplimiento' },
      ];

      const filaHtml = (d, esTotal) => {
        const base = esTotal ? 'bg-[#0f3a4a] text-white font-bold' : 'hover:bg-slate-800/50 text-gray-200';
        return `<tr class="${base}">${cols.map(c => {
          let v = d[c.key];
          if (c.key === 'pais') v = esTotal ? 'TOTAL' : nombrePais(v);
          const align = (c.key === 'pais') ? 'text-left' : 'text-right';
          return `<td class="p-2.5 whitespace-nowrap ${align}">${v ?? ''}</td>`;
        }).join('')}</tr>`;
      };

      const thead = `<tr>${cols.map(c => `<th class="p-2.5 ${c.key==='pais'?'text-left':'text-right'} text-[10px]">${c.label}</th>`).join('')}</tr>`;
      const filas = datosPorPais.map(d => filaHtml(d, false)).join('') + filaHtml(total, true);

      const tablaHtml = `
        <div class="overflow-auto rounded-lg border border-gray-800">
          <table class="w-full text-xs border-collapse">
            <thead class="bg-[#0e7490] text-white">${thead}</thead>
            <tbody class="divide-y divide-gray-800">${filas}</tbody>
          </table>
        </div>`;

      const baseTotal = total.evaluados - total.pendientes;
      const kpiHtml = `
        <div class="grid grid-cols-4 gap-3 mt-4">
          <div class="bg-[#0e7490]/10 border border-cyan-900 rounded-lg p-4 text-center">
            <div class="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Leads telefónicos</div>
            <div class="text-3xl font-extrabold text-white mt-1">${total.leads}</div>
          </div>
          <div class="bg-[#0e7490]/10 border border-cyan-900 rounded-lg p-4 text-center">
            <div class="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Evaluados</div>
            <div class="text-3xl font-extrabold text-white mt-1">${total.evaluados}</div>
          </div>
          <div class="bg-[#0e7490]/10 border border-cyan-900 rounded-lg p-4 text-center">
            <div class="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Cumplieron</div>
            <div class="text-3xl font-extrabold text-emerald-400 mt-1">${total.cumplieron}</div>
          </div>
          <div class="bg-[#0e7490]/10 border border-cyan-900 rounded-lg p-4 text-center">
            <div class="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">% Cumplimiento</div>
            <div class="text-3xl font-extrabold ${total.pct_num >= 70 ? 'text-emerald-400' : total.pct_num > 0 ? 'text-amber-400' : 'text-red-400'} mt-1">${total.pct_cumplimiento}</div>
          </div>
        </div>`;

      const lectura = generarLecturaEjecutiva(datosPorPais, total, cruce);
      const lecturaHtml = `
        <div class="mt-4 bg-[#0d1526] border border-gray-800 rounded-lg overflow-hidden">
          <div class="bg-[#1e293b] px-3 py-2 text-[11px] font-bold text-gray-300 uppercase tracking-wider">Lectura ejecutiva</div>
          <div class="divide-y divide-gray-800">
            ${lectura.map(l => `
              <div class="flex gap-3 px-3 py-2 text-xs">
                <span class="text-cyan-400 font-bold shrink-0 w-32">${l.titulo}</span>
                <span class="text-gray-300">${l.texto}</span>
              </div>`).join('')}
          </div>
        </div>`;

      document.getElementById('tabla-resumen-pais').innerHTML = tablaHtml + kpiHtml + lecturaHtml;
    }

    async function renderResumenPais(main) {
      main.innerHTML = `<div class="bg-[#111827] p-4 rounded-lg border border-gray-800">
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-sm font-bold text-gray-300">🌎 Resumen de Cumplimiento por País</h2>
          <div class="flex gap-2">
            <button onclick="calcularCruce(true).then(()=>renderResumenPais(document.getElementById('main-content')))" class="bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1.5 rounded">🔄 Recalcular</button>
            <button id="btn-exp-pais" class="bg-emerald-600 hover:bg-emerald-700 text-xs px-3 py-1.5 rounded">⬇️ Exportar XLSX</button>
          </div>
        </div>
        <p class="text-[11px] text-gray-500 mb-3">Solo leads con tipo de reunión "Llamada Telefónica". Tolerancia ±5 min. Teléfonos comparados por los últimos 8 dígitos. Ejecutivo identificado por su extensión (PBX) o usuario (celular) según el catálogo.</p>
        <div id="tabla-resumen-pais" class="overflow-auto text-xs"><span class="text-cyan-400">Calculando cruce...</span></div>
        <div id="kpistats-resumen-pais" class="mt-4"></div>
        <div id="lectura-resumen-pais" class="mt-4"></div>
      </div>`;

      const cruce = await calcularCruce();
      const datos = agregar(cruce, r => ({ key: r.pais, datos: { pais: r.pais } }))
        .sort((a, b) => nombrePais(a.pais).localeCompare(nombrePais(b.pais)));
      const total = calcularFilaTotal(datos);

      const datosTabla = prepararDatosResumenPais(datos);
      pintarTablaConFiltros('tabla-resumen-pais', datosTabla);

      document.getElementById('kpistats-resumen-pais').innerHTML = `
        <div class="grid grid-cols-4 gap-3">
          <div class="bg-[#0e7490]/10 border border-cyan-900 rounded-lg p-4 text-center">
            <div class="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Leads telefónicos</div>
            <div class="text-3xl font-extrabold text-white mt-1">${total.leads}</div>
          </div>
          <div class="bg-[#0e7490]/10 border border-cyan-900 rounded-lg p-4 text-center">
            <div class="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Evaluados</div>
            <div class="text-3xl font-extrabold text-white mt-1">${total.evaluados}</div>
          </div>
          <div class="bg-[#0e7490]/10 border border-cyan-900 rounded-lg p-4 text-center">
            <div class="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Cumplieron</div>
            <div class="text-3xl font-extrabold text-emerald-400 mt-1">${total.cumplieron}</div>
          </div>
          <div class="bg-[#0e7490]/10 border border-cyan-900 rounded-lg p-4 text-center">
            <div class="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">% Cumplimiento</div>
            <div class="text-3xl font-extrabold ${total.pct_num >= 70 ? 'text-emerald-400' : total.pct_num > 0 ? 'text-amber-400' : 'text-red-400'} mt-1">${total.pct_cumplimiento}</div>
          </div>
        </div>`;

      const lectura = generarLecturaEjecutiva(datos, total, cruce);
      document.getElementById('lectura-resumen-pais').innerHTML = `
        <div class="mt-4 bg-[#0d1526] border border-gray-800 rounded-lg overflow-hidden">
          <div class="bg-[#1e293b] px-3 py-2 text-[11px] font-bold text-gray-300 uppercase tracking-wider">Lectura ejecutiva</div>
          <div class="divide-y divide-gray-800">
            ${lectura.map(l => `
              <div class="flex gap-3 px-3 py-2 text-xs">
                <span class="text-cyan-400 font-bold shrink-0 w-32">${l.titulo}</span>
                <span class="text-gray-300">${l.texto}</span>
              </div>`).join('')}
          </div>
        </div>`;

      document.getElementById('btn-exp-pais').onclick = () => exportarXLSXGenerico(
        [...datos, total].map(({clasificacion_html, pct_num, ...r}) => r), 'resumen_por_pais'
      );
    }

    function construirResumenPorEjecutivo(cruce) {
      const grupos = {};
      cache.ejecutivos.forEach(e => {
        const nombre = (e.nombre_ejecutivo || '').trim();
        grupos[nombre.toLowerCase()] = {
          pais: e.pais || 'N/D',
          ejecutivo: nombre,
          usuario: e.usuario || '',
          extension: e.extension || '',
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
              pais: r.pais || 'N/D', ejecutivo: nombreLead || 'Sin asignar', usuario: '', extension: '',
              leads: 0, evaluados: 0, cumplieron: 0, fuera_horario: 0, otra_fecha: 0, sin_llamada: 0, pendientes: 0,
              enCatalogo: false
            };
          }
          g = sinCatalogo[key];
        }
        g.leads++;
        if (r.estado_cruce === 'Pendiente') {
          g.pendientes++;
        } else {
          g.evaluados++;
          if (r.estado_cruce === 'Cumplió') g.cumplieron++;
          else if (r.estado_cruce === 'Mismo día fuera horario') g.fuera_horario++;
          else if (r.estado_cruce === 'Llamó en otra fecha') g.otra_fecha++;
          else if (r.estado_cruce === 'Sin llamada') g.sin_llamada++;
        }
      });

      const calcularFila = g => {
        g.no_cumplieron = g.fuera_horario + g.otra_fecha + g.sin_llamada;
        const base = g.evaluados;
        const pctNum = base > 0 ? (g.cumplieron / base) * 100 : 0;
        g.pct_num = pctNum;
        g.pct_cumplimiento = base > 0 ? pctNum.toFixed(1) + '%' : '—';
        const clas = claseClasificacion(pctNum, g.evaluados);
        g.clasificacion_html = `<span class="badge ${clas.clase}">${clas.texto}</span>`;
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
        { key: 'pais',              label: 'País' },
        { key: 'ejecutivo',         label: 'Ejecutivo' },
        { key: 'leads',             label: 'Leads' },
        { key: 'evaluados',         label: 'Evaluados' },
        { key: 'cumplieron',        label: 'Cumplieron' },
        { key: 'fuera_horario',     label: 'Mismo día fuera horario' },
        { key: 'otra_fecha',        label: 'Otra fecha' },
        { key: 'sin_llamada',       label: 'Sin llamada' },
        { key: 'pendientes',        label: 'Pendientes' },
        { key: 'no_cumplieron',     label: 'No cumplieron' },
        { key: 'pct_cumplimiento',  label: '% cumplimiento' },
        { key: 'clasificacion_html',label: 'Clasificación' },
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

      const thead = `<tr>${cols.map(c => `<th class="p-2.5 ${(c.key==='pais'||c.key==='ejecutivo')?'text-left':'text-right'} text-[10px]">${c.label}</th>`).join('')}</tr>`;
      const filas = filasCatalogo.map(d => filaHtml(d, false)).join('') + filaHtml(total, true);

      let sinCatalogoHtml = '';
      if (filasSinCatalogo.length) {
        const filasSC = filasSinCatalogo.map(d => filaHtml(d, false)).join('');
        sinCatalogoHtml = `
          <div class="mt-4 rounded-lg border border-amber-900 overflow-hidden">
            <div class="bg-amber-950 text-amber-300 text-[11px] font-bold px-3 py-2">
              ⚠️ Nombres en Leads sin coincidencia en el catálogo de ejecutivos — revisar si falta darlos de alta
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
          <h2 class="text-sm font-bold text-gray-300">🧑‍💼 Cumplimiento por Ejecutivo y País</h2>
          <div class="flex gap-2">
            <button onclick="calcularCruce(true).then(()=>renderResumenEjecutivo(document.getElementById('main-content')))" class="bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1.5 rounded">🔄 Recalcular</button>
            <button id="btn-exp-ejec" class="bg-emerald-600 hover:bg-emerald-700 text-xs px-3 py-1.5 rounded">⬇️ Exportar XLSX</button>
          </div>
        </div>
        <p class="text-[11px] text-gray-500 mb-3">El porcentaje excluye pendientes. "No cumplieron" incluye fuera de horario, otra fecha y sin registro. País y ejecutivo tomados del catálogo oficial; se listan todos aunque tengan 0 leads.</p>
        <div id="tabla-resumen-ejec" class="overflow-auto text-xs"><span class="text-cyan-400">Calculando cruce...</span></div>
        <div id="nota-resumen-ejec" class="mt-3 text-[11px] text-amber-300"></div>
      </div>`;

      const cruce = await calcularCruce();
      await asegurarCache('ejecutivos', null);
      const { filasCatalogo, filasSinCatalogo } = construirResumenPorEjecutivo(cruce);
      const datosTabla = prepararDatosResumenEjecutivo(filasCatalogo, filasSinCatalogo);
      pintarTablaConFiltros('tabla-resumen-ejec', datosTabla);

      document.getElementById('nota-resumen-ejec').innerText = filasSinCatalogo.length
        ? '⚠️ Nombres en Leads sin coincidencia en el catálogo de ejecutivos — revisar si falta darlos de alta.'
        : '';

      document.getElementById('btn-exp-ejec').onclick = () => exportarXLSXGenerico(
        [...filasCatalogo, ...filasSinCatalogo].map(({clasificacion_html, pct_num, enCatalogo, ...r}) => r),
        'resumen_por_ejecutivo'
      );
    }

    function pintarResumenSimple(contId, datos, columnas) {
      const cont = document.getElementById(contId);
      if (!datos.length) { cont.innerHTML = '<p class="text-gray-500 p-4">Sin datos.</p>'; return; }
      const thead = `<tr>${columnas.map(c => `<th class="p-2">${c==='clasificacion_html'?'clasificación':c.replace(/_/g,' ')}</th>`).join('')}</tr>`;
      const filas = datos.map(f => `<tr class="hover:bg-slate-800/50">${columnas.map(c => `<td class="p-2 whitespace-nowrap text-gray-300">${f[c]}</td>`).join('')}</tr>`).join('');
      cont.innerHTML = `<table class="w-full text-left"><thead>${thead}</thead><tbody>${filas}</tbody></table>`;
    }

    async function renderResumenDetalle(main) {
      main.innerHTML = `<div class="bg-[#111827] p-4 rounded-lg border border-gray-800">
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-sm font-bold text-gray-300">🔍 Detalle Llamadas</h2>
          <div class="flex gap-2">
            <button onclick="calcularCruce(true).then(()=>renderResumenDetalle(document.getElementById('main-content')))" class="bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1.5 rounded">🔄 Recalcular</button>
            <button onclick="exportarXLSX('tabla-detalle-cruce','detalle_llamadas')" class="bg-emerald-600 hover:bg-emerald-700 text-xs px-3 py-1.5 rounded">⬇️ Exportar XLSX</button>
          </div>
        </div>
        <p class="text-[11px] text-gray-500 mb-2">Un renglón por cada lead telefónico evaluado. Mismos datos y reglas que "Resumen Llamadas" (últimos 8 dígitos del teléfono, ejecutivo por extensión/usuario, ±5 min de tolerancia).</p>
        <span id="estado-tabla" class="text-xs text-cyan-400">Calculando cruce...</span>
        <div class="overflow-auto mt-2" style="max-height: 68vh;">
          <table class="w-full text-left text-xs" id="tabla-detalle-cruce"></table>
        </div>
      </div>`;

      const cruce = await calcularCruce();

      const detalle = cruce.map(r => ({
        'País': r.pais,
        'Ejecutivo': r.ejecutivo,
        'Lead': r.codigo_prospecto,
        'Cliente': r.lead,
        'Teléfono CRM': r.telefono,
        'Teléfono comparado': r.telefono_comparado,
        'Fecha reunión': r.fecha_reunion,
        'Hora reunión': r.hora_reunion,
        'Resultado': r.resultado_texto,
        'Cumplió': r.cumplio_texto,
        'Fuente': r.fuente_llamada,
        'Fecha llamada': r.fecha_llamada_corta,
        'Hora llamada': r.hora_llamada_corta,
        'Diferencia (min)': r.diferencia_min_firmada,
        'Duración (seg)': r.duracion_seg,
        'Estado/tipo': r.estado_tipo,
        'Intentos mismo día': r.intentos_mismo_dia,
        'Intentos totales': r.intentos_totales,
        'Datos en catálogo': r.catalogo_ok
      }));

      // NUEVO: Separar y ordenar - "Sin llamada encontrada" al final
      const conLlamada = detalle.filter(d => d.Resultado !== 'Sin llamada encontrada');
      const sinLlamada = detalle.filter(d => d.Resultado === 'Sin llamada encontrada');
      const detalleOrdenado = [...conLlamada, ...sinLlamada];

      document.getElementById('estado-tabla').classList.remove('hidden');
      pintarTablaConFiltros('tabla-detalle-cruce', detalleOrdenado);
    }

    async function calcularTeams(forzar) {
      await asegurarCache('leads', 'fecha_agendada');
      let leads = cache.leads.filter(l => !(l.tipo_reunion || '').toLowerCase().includes('llamada'));
      leads = filtrarPorFechaGlobal(leads, 'fecha_agendada');
      const ahora = new Date();
      return leads.map(lead => {
        const progr = parseFechaHora(lead.fecha_agendada, lead.hora_agendada);
        let estado = 'Sin evidencia Teams';
        if (progr) {
          const limite = new Date(progr.getTime() + 5 * 60000);
          if (ahora < limite) estado = 'Pendiente';
        }
        return {
          pais: lead.pais || 'N/D',
          ejecutivo: lead.asesor_nombre || 'Sin asignar',
          codigo_prospecto: lead.codigo_prospecto,
          lead: lead.nombre_prospecto,
          fecha_reunion: lead.fecha_agendada,
          hora_reunion: lead.hora_agendada,
          tipo_reunion: lead.tipo_reunion,
          estado_cruce: estado
        };
      });
    }

    async function renderResumenTeams(main) {
      main.innerHTML = `<div class="bg-[#111827] p-4 rounded-lg border border-gray-800">
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-sm font-bold text-gray-300">👥 Resumen de Reuniones TEAMS por Ejecutivo</h2>
          <div class="flex gap-2">
            <button onclick="renderResumenTeams(document.getElementById('main-content'))" class="bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1.5 rounded">🔄 Recalcular</button>
            <button id="btn-exp-teams" class="bg-emerald-600 hover:bg-emerald-700 text-xs px-3 py-1.5 rounded">⬇️ Exportar XLSX</button>
          </div>
        </div>
        <p class="text-[11px] text-gray-500 mb-3">Leads con reunión Presencial / Virtual (no telefónica). Aún no tenemos una fuente de datos de Teams en Supabase, por eso se listan como "Sin evidencia Teams" salvo que estén pendientes.</p>
        <div id="tabla-resumen-teams" class="overflow-auto text-xs"><span class="text-cyan-400">Calculando...</span></div>
      </div>`;

      const registros = await calcularTeams();
      const agrupado = agregarTeams(registros);
      const datosTabla = prepararDatosResumenTeams(agrupado);
      pintarTablaConFiltros('tabla-resumen-teams', datosTabla);
      document.getElementById('btn-exp-teams').onclick = () => exportarXLSXGenerico(agrupado.map(({clasificacion_html, ...r}) => r), 'resumen_teams');
    }

    function agregarTeams(registros) {
      const grupos = {};
      registros.forEach(r => {
        const key = r.pais + '|' + r.ejecutivo;
        if (!grupos[key]) grupos[key] = { pais: r.pais, ejecutivo: r.ejecutivo, leads: 0, evaluados: 0, pendientes: 0 };
        const g = grupos[key];
        g.leads++;
        if (r.estado_cruce === 'Pendiente') g.pendientes++;
        else g.evaluados++;
      });
      return Object.values(grupos).map(g => ({
        ...g,
        clasificacion_html: g.evaluados > 0
          ? `<span class="badge bg-red-900 text-red-300">Sin evidencia Teams</span>`
          : `<span class="badge bg-sky-900 text-sky-300">Solo pendientes</span>`
      }));
    }

    async function renderDetalleTeams(main) {
      main.innerHTML = `<div class="bg-[#111827] p-4 rounded-lg border border-gray-800">
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-sm font-bold text-gray-300">📋 Detalle de Reuniones vía Teams</h2>
          <div class="flex gap-2">
            <button onclick="renderDetalleTeams(document.getElementById('main-content'))" class="bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1.5 rounded">🔄 Recalcular</button>
            <button onclick="exportarXLSX('tabla-detalle-teams','detalle_teams')" class="bg-emerald-600 hover:bg-emerald-700 text-xs px-3 py-1.5 rounded">⬇️ Exportar XLSX</button>
          </div>
        </div>
        <span id="estado-tabla" class="text-xs text-cyan-400">Calculando...</span>
        <div class="overflow-auto mt-2" style="max-height: 68vh;">
          <table class="w-full text-left text-xs" id="tabla-detalle-teams"></table>
        </div>
      </div>`;

      const registros = await calcularTeams();
      document.getElementById('estado-tabla').classList.add('hidden');
      pintarTablaConFiltros('tabla-detalle-teams', registros);
    }

    // ==================================================================
    // INICIO
    // ==================================================================
    window.addEventListener('DOMContentLoaded', async () => {
      supabaseClient = window.supabase.createClient(SB_URL, SB_KEY);
      irA('catalogo');
      await actualizarContadores();
    });
  