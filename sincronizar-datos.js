import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-audio-proxy",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const BATCH_SIZE = 500;

// Esquema de columnas permitidas por tabla
const COLUMNAS_PERMITIDAS = {
  leads: ["codigo_prospecto", "nombre", "telefono", "fecha_agendada", "hora_agendada", "fecha_creado", "hora_creado", "tipo_reunion", "asesor_nombre", "pais", "created_at"],
  llamadas_celular: ["id", "fecha", "hora", "destino", "duracion", "tipo", "linea", "usuario", "operador", "dia_consultado", "created_at"],
  llamadas_pbx: ["uniqueid", "extension", "prefijo", "destino", "duracion_minutos", "duracion_segundos", "duracion_hh_mm_ss", "estado", "nombre", "fecha_hora", "solo_fecha", "anio", "mes", "dia", "pais", "audio_url", "created_at"],
};

function filtrarColumnas(registros: any[], tabla: string): any[] {
  const permitidas = COLUMNAS_PERMITIDAS[tabla];
  if (!permitidas) return registros;

  return registros.map(registro => {
    const filtrado: any = {};
    for (const col of permitidas) {
      if (col in registro) {
        filtrado[col] = registro[col];
      }
    }
    return filtrado;
  });
}

async function upsertEnLotes(
  supabase: any,
  tabla: string,
  registros: any[],
  onConflictCol: string
) {
  const errores: any[] = [];
  let insertados = 0;

  // Filtrar columnas no permitidas
  const registrosFiltrados = filtrarColumnas(registros, tabla);

  const validos = registrosFiltrados.filter((r) => r?.[onConflictCol] != null && r?.[onConflictCol] !== "");
  const sinClave = registrosFiltrados.length - validos.length;

  for (let i = 0; i < validos.length; i += BATCH_SIZE) {
    const lote = validos.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from(tabla)
      .upsert(lote, { onConflict: onConflictCol, ignoreDuplicates: false, count: "exact" });

    if (error) {
      errores.push({ tabla, lote_desde: i, mensaje: error.message, detalles: error.details ?? null });
    } else {
      insertados += lote.length;
    }
  }

  return { tabla, insertados, sinClave, errores };
}

function dedupePorClaveMasReciente(
  registros: any[],
  columnaClave: string,
  compararFn: (a: any, b: any) => number
) {
  const porClave = new Map<string, any>();
  for (const registro of registros) {
    const clave = registro?.[columnaClave];
    if (clave == null || clave === "") continue;
    const actual = porClave.get(clave);
    if (!actual || compararFn(registro, actual) > 0) {
      porClave.set(clave, registro);
    }
  }
  return Array.from(porClave.values());
}

async function obtenerJwtPbx(redPbxHost: string, username: string, password: string) {
  try {
    const r = await fetch(`${redPbxHost}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    if (!r.ok) {
      return { token: null, error: `Login fallido: HTTP ${r.status}` };
    }

    const data = await r.json();
    return { token: data.token, error: null };
  } catch (err: any) {
    return { token: null, error: err.message };
  }
}

async function fetchApiConDiagnostico(nombre: string, url: string, opciones: RequestInit = {}) {
  try {
    const headers = {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      ...(opciones.headers || {}),
    };

    const r = await fetch(url, { ...opciones, headers });
    const textoCrudo = await r.text();

    if (!r.ok) {
      return {
        data: [],
        diagnostico: {
          fuente: nombre,
          ok: false,
          http_status: r.status,
          mensaje: `La API respondió HTTP ${r.status}`,
          cuerpo_respuesta: textoCrudo.slice(0, 500),
        },
      };
    }

    let json: any;
    try {
      json = JSON.parse(textoCrudo);
    } catch (parseErr: any) {
      return {
        data: [],
        diagnostico: {
          fuente: nombre,
          ok: false,
          http_status: r.status,
          mensaje: `Respuesta no es JSON válido: ${parseErr.message}`,
          cuerpo_respuesta: textoCrudo.slice(0, 500),
        },
      };
    }

    return {
      data: json,
      diagnostico: {
        fuente: nombre,
        ok: true,
        http_status: r.status,
        cuerpo_respuesta: textoCrudo.slice(0, 500),
      },
    };
  } catch (err: any) {
    return {
      data: [],
      diagnostico: {
        fuente: nombre,
        ok: false,
        http_status: null,
        mensaje: `Fallo de red/fetch: ${err.message}`,
        cuerpo_respuesta: null,
      },
    };
  }
}

function extraerRegistros(responseData: any) {
  if (!responseData) return [];
  if (Array.isArray(responseData)) return responseData;
  if (typeof responseData !== "object") return [];

  const posiblesClaves = ["info", "data", "records", "registros", "items", "rows", "leads"];
  for (const clave of posiblesClaves) {
    if (Array.isArray(responseData[clave])) return responseData[clave];
  }

  for (const clave of Object.keys(responseData)) {
    const valor = responseData[clave];
    if (Array.isArray(valor)) return valor;
    if (typeof valor === "object" && valor !== null) {
      for (const subclave of Object.keys(valor)) {
        if (Array.isArray(valor[subclave])) return valor[subclave];
      }
    }
  }

  return [];
}

function normalizarCallRow(registro: any) {
  if (!registro || typeof registro !== "object") return registro;

  return {
    uniqueid: registro.uniqueid || registro.uniqueId || registro.UNIQUEID || null,
    extension: registro.EXTENSION || registro.extension || registro.usuario || null,
    prefijo: registro.PREFIJO ?? registro.prefijo ?? null,
    destino: registro.DESTINO || registro.destino || null,
    duracion_minutos: registro.DURACION_MINUTOS || registro.duracion_minutos || null,
    duracion_segundos:
      registro.DURATION_SEC ?? registro.duration_sec ?? registro.duracion_segundos ?? null,
    duracion_hh_mm_ss:
      registro.DURACION_HH_MM_SS || registro.duracion_hh_mm_ss || null,
    estado: registro.ESTADO || registro.estado || null,
    nombre: registro.NOMBRE || registro.nombre || null,
    fecha_hora: registro.FECHA || registro.fecha || null,
    solo_fecha: registro.SOLO_FECHA || registro.solo_fecha || null,
    anio: registro.ANIO ?? registro.anio ?? null,
    mes: registro.MES ?? registro.mes ?? null,
    dia: registro.DIA ?? registro.dia ?? null,
    pais: registro.PAIS || registro.pais || null,
    audio_url: registro.audio_url || registro.grabacion_url || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
      status: 200,
    });
  }

  try {
    if (req.headers.get("x-audio-proxy") === "true") {
      try {
        const body = await req.json();
        const audioUrl = body?.audio_url;
        const bearer = body?.pbx_bearer_token || Deno.env.get("PBX_BEARER_TOKEN") || "";

        if (!audioUrl || !bearer) {
          return new Response(JSON.stringify({ status: "error", message: "Falta audio_url o pbx_bearer_token" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const audioRes = await fetch(audioUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${bearer}`,
            "Accept": "audio/*,*/*;q=0.8"
          }
        });

        if (!audioRes.ok) {
          return new Response(JSON.stringify({ status: "error", message: `Audio PBX no disponible: HTTP ${audioRes.status}` }), {
            status: audioRes.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const audioBlob = await audioRes.blob();
        const contentType = audioRes.headers.get("content-type") || "audio/wav";
        return new Response(audioBlob, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": contentType, "Cache-Control": "no-store" }
        });
      } catch (proxyErr: any) {
        return new Response(JSON.stringify({ status: "error", message: proxyErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseKey = serviceKey;
    
    // Leer credenciales del body del request (enviadas desde frontend)
    let pbxHostBody = "";
    let pbxUsernameBody = "";
    let pbxPasswordBody = "";
    let pbxBearerTokenBody = "";
    
    try {
      const body = await req.json();
      pbxHostBody = body.pbx_host || "";
      pbxUsernameBody = body.pbx_username || "";
      pbxPasswordBody = body.pbx_password || "";
      pbxBearerTokenBody = body.pbx_bearer_token || "";
    } catch (e) {
      // Body no es JSON válido, ignorar
    }
    
    // Usar credenciales del body si se proporcionan, si no usar variables de entorno
    const redPbxHost = pbxHostBody || Deno.env.get("RED_PBX_HOST") || "https://api.red.com.sv";
    const pbxUsername = pbxUsernameBody || Deno.env.get("PBX_USERNAME") || "";
    const pbxPassword = pbxPasswordBody || Deno.env.get("PBX_PASSWORD") || "";
    const pbxBearerToken = pbxBearerTokenBody || Deno.env.get("PBX_BEARER_TOKEN") || "";

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Faltan variables de entorno SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const hoy = new Date().toISOString().split("T")[0];
    const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Obtener JWT para PBX (siempre hacer login para token fresco)
    let jwtPbx = pbxBearerToken;
    let pbxLoginError = null;
    if (!jwtPbx && pbxUsername && pbxPassword) {
      const loginResult = await obtenerJwtPbx(redPbxHost, pbxUsername, pbxPassword);
      if (loginResult.token) {
        jwtPbx = loginResult.token;
      } else {
        pbxLoginError = loginResult.error;
      }
    } else if (!jwtPbx) {
      pbxLoginError = "PBX_USERNAME o PBX_PASSWORD no configurados";
    }

    const headersPbx: any = { method: "GET" };
    if (jwtPbx) {
      headersPbx.headers = { "Authorization": `Bearer ${jwtPbx}` };
    }

    const [leadsRes, celularRes, llamadasRes] = await Promise.all([
      fetchApiConDiagnostico(
        "leads",
        "https://prospektia.red.com.sv/api/external/leads-calificados",
        { method: "GET", headers: { "X-API-Key": "RedApi_2026_SuperSegura_9XK2" } }
      ),
      fetchApiConDiagnostico(
        "llamadas_celular",
        "https://kpi.red.com.sv/api/historial-llamadas-ejecutivos",
        { method: "GET", headers: { "X-API-KEY": "mso_papi_2026_7f2b9c4d8e6a1b3f5d7c9e0a2b4c6d8f" } }
      ),
      fetchApiConDiagnostico(
        "llamadas_pbx",
        `${redPbxHost}/pbx/api/v1/getCalls2?desde=${hace7dias}&hasta=${hoy}&pais=GT`,
        headersPbx
      ),
    ]);

    const dataLeads = extraerRegistros(leadsRes.data).map((r) => ({ ...r }));
    const dataCelular = extraerRegistros(celularRes.data).map((r) => ({ ...r }));
    const dataLlamadas = extraerRegistros(llamadasRes.data).map(normalizarCallRow);

    if (llamadasRes.diagnostico.ok && dataLlamadas.length === 0) {
      llamadasRes.diagnostico.mensaje =
        "La API PBX devolvió OK, pero no se encontró un arreglo de llamadas en la respuesta.";
    }

    const dataLeadsDedup = dedupePorClaveMasReciente(dataLeads, "codigo_prospecto", (a, b) => {
      const marcaA = `${a?.fecha_creado ?? ""}T${a?.hora_creado ?? ""}`;
      const marcaB = `${b?.fecha_creado ?? ""}T${b?.hora_creado ?? ""}`;
      return marcaA.localeCompare(marcaB);
    });
    const duplicadosLeads = dataLeads.length - dataLeadsDedup.length;

    const diagnosticoApis = {
      leads: leadsRes.diagnostico,
      llamadas_celular: celularRes.diagnostico,
      llamadas_pbx: llamadasRes.diagnostico,
    };

    const resultados = await Promise.all([
      dataLeadsDedup.length > 0
        ? upsertEnLotes(supabase, "leads", dataLeadsDedup, "codigo_prospecto")
        : { tabla: "leads", insertados: 0, sinClave: 0, errores: [] },
      dataCelular.length > 0
        ? upsertEnLotes(supabase, "llamadas_celular", dataCelular, "id")
        : { tabla: "llamadas_celular", insertados: 0, sinClave: 0, errores: [] },
      dataLlamadas.length > 0
        ? upsertEnLotes(supabase, "llamadas_pbx", dataLlamadas, "uniqueid")
        : { tabla: "llamadas_pbx", insertados: 0, sinClave: 0, errores: [] },
    ]);

    const huboFalloDeApi = Object.values(diagnosticoApis).some((d) => !d.ok);
    const huboErrores = resultados.some((r) => r.errores.length > 0) || huboFalloDeApi;

    return new Response(
      JSON.stringify({
        status: huboErrores ? "partial_error" : "success",
        pbx_bearer_token: jwtPbx || null,
        advertencia_credenciales: !serviceKey
          ? "SUPABASE_SERVICE_ROLE_KEY no está configurada."
          : null,
        advertencia_pbx_login: pbxLoginError
          ? `Error al autenticarse con PBX: ${pbxLoginError}`
          : !pbxUsername || !pbxPassword
          ? "PBX_USERNAME o PBX_PASSWORD no están configurados."
          : null,
        registros_recibidos: {
          leads: dataLeads.length,
          llamadas_celular: dataCelular.length,
          llamadas_pbx: dataLlamadas.length,
        },
        duplicados_leads_colapsados: duplicadosLeads,
        diagnostico_apis: diagnosticoApis,
        resultado_por_tabla: resultados,
      }),
      {
        status: huboErrores ? 207 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ status: "error", message: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
