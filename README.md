# 📊 Métricas de Citas telefónicas - Reportes

## 🎯 Características

✅ **Interfaz moderna y responsiva** - Diseño bonito con gradientes y animaciones  
✅ **Filtros avanzados** - Por tabla, fecha, búsqueda libre  
✅ **Sincronización inteligente** - Solo trae datos nuevos desde el 1 de julio  
✅ **Caché local** - Datos guardados en el navegador, sin depender de conexión  
✅ **Exportación a CSV** - Descarga los datos en Excel  
✅ **Seguro para GitHub** - Credenciales guardadas localmente, nunca en el código  

---

## 🔒 Seguridad

### ¿Por qué es seguro?

```
┌─────────────────────────────────────────┐
│     Tu Navegador (Cliente)              │
│  ┌───────────────────────────────────┐  │
│  │ localStorage                      │  │
│  │ (Credenciales guardadas aquí)    │  │
│  └───────────────────────────────────┘  │
│           ↓                              │
│     Fetch → HTTPS → Supabase            │
│                                         │
│  NUNCA se envía a GitHub                │
│  NUNCA se guarda en archivos            │
└─────────────────────────────────────────┘
```

**Flujo de seguridad:**
1. Ingresas URL + Key manualmente en la UI
2. Se guardan SOLO en `localStorage` de tu navegador
3. Se usan para conectar directamente a Supabase
4. El `.env` NO se commitea gracias a `.gitignore`
5. Solo tu navegador ve las credenciales

---

## 🚀 Quick Start

### Paso 1: Clonar el repo
```bash
git clone https://github.com/tu-usuario/red-intelfon-dashboard.git
cd red-intelfon-dashboard
```

### Paso 2: Configurar Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea un proyecto nuevo
3. Ve a **Settings → API**
4. Copia:
   - **Project URL** (URL del proyecto)
   - **Anon Public Key** (NO service_role key)

### Paso 3: Configurar la base de datos

1. En Supabase, ve a **SQL Editor**
2. Copia TODO el contenido de `supabase-setup.sql`
3. Pégalo en el editor SQL
4. Presiona "Run"

✅ ¡Listo! Las tablas (leads, historiales, llamadas) se crean automáticamente.

### Paso 4: Abrir el dashboard

1. Abre `index.html` en tu navegador
2. O: `python -m http.server 8000` y ve a `http://localhost:8000`
3. Ingresa tu **URL de Supabase** y **Anon Key**
4. Presiona "🔄 Cargar Todo"

---

## 📖 Cómo Usar

### Cargar Datos

- **🔄 Cargar Todo** - Trae TODOS los datos desde el 1 de julio
- **⬆️ Sincronizar Nuevos** - Solo trae lo nuevo desde la última sincronización
- **🔍 Aplicar Filtros** - Busca por tabla, fecha o texto

### Filtros

```
Tabla:      Todas | Leads | Historiales | Llamadas
Desde:      [Date picker]
Hasta:      [Date picker]
Buscar:     Cualquier texto en cualquier campo
```

### Exportar

- **💾 Exportar CSV** - Descarga la tabla actual como Excel

### Limpiar

- **🗑️ Limpiar Caché** - Borra los datos guardados en el navegador
- **🗑️ Limpiar Credenciales** - Elimina URL + Key del localStorage

---

## 🏗️ Estructura del Proyecto

```
red-intelfon-dashboard/
├── index.html              # APP PRINCIPAL (abre en navegador)
├── supabase-setup.sql      # Script para crear tablas en Supabase
├── .env.example            # Plantilla de variables (sin valores reales)
├── .gitignore              # Protege .env y credenciales
└── README.md               # Este archivo
```

---

## 📋 Tablas de Supabase

### leads
```sql
id                UUID (autogenerado)
nombre            TEXT
email             TEXT
telefono          TEXT
empresa           TEXT
estado            TEXT (nuevo, contactado, cerrado)
origen            TEXT
descripcion       TEXT
created_at        TIMESTAMP
updated_at        TIMESTAMP (automático)
```

### historiales
```sql
id                  UUID (autogenerado)
lead_id            UUID (referencia a leads)
tipo_actividad     TEXT
descripcion        TEXT
resultado          TEXT
fecha_seguimiento  TIMESTAMP
notas              TEXT
created_at         TIMESTAMP
updated_at         TIMESTAMP (automático)
```

### llamadas
```sql
id                UUID (autogenerado)
lead_id          UUID (referencia a leads)
numero_marcado   TEXT
numero_origen    TEXT
duracion_segundos INTEGER
estado_llamada   TEXT
grabacion_url    TEXT
transcripcion    TEXT
resultado        TEXT
created_at       TIMESTAMP
updated_at       TIMESTAMP (automático)
```

---

## 🔑 Obtener las Credenciales de Supabase

### 1. Project URL
```
https://app.supabase.com/project/[PROJECT_ID]/settings/api
↓
Busca "Project URL"
```

### 2. Anon Public Key
```
https://app.supabase.com/project/[PROJECT_ID]/settings/api
↓
Busca "Anon" (con una llave pública 🔓)
⚠️  NO uses "Service Role" key
```

---

## ⚙️ Configuración Avanzada

### Cambiar fecha mínima (actualmente: 1 de julio 2024)

En `index.html`, busca:
```javascript
const MIN_DATE = new Date('2024-07-01');
```

Cambia la fecha según necesites.

### Agregar más tablas

1. Crea la tabla en Supabase
2. En `index.html`, en `cachedData`, agrega:
   ```javascript
   cachedData.nueva_tabla = [];
   ```
3. En `filterTable` select, agrega:
   ```html
   <option value="nueva_tabla">Nueva Tabla</option>
   ```
4. En `loadAllData()`, agrega:
   ```javascript
   const nuevaTablaData = await supabaseQuery('nueva_tabla');
   ```

---

## 🔐 Preguntas de Seguridad Frecuentes

### P: ¿Es seguro subir esto a GitHub?
**R:** Sí. El código NO contiene credenciales. El `.gitignore` protege el `.env`. Las credenciales se guardan solo en localStorage.

### P: ¿Alguien puede ver mis credenciales?
**R:** No. Solo tu navegador las ve. No se envían a ningún servidor externo. Se guardan localmente en tu computadora.

### P: ¿Puedo compartir este repo?
**R:** Sí. Otros usuarios ingresarán sus propias credenciales al abrir la app. Cada uno tiene sus propios datos en localStorage.

### P: ¿Qué pasa si reinicio el navegador?
**R:** Las credenciales se mantienen en localStorage. Los datos en caché también. Solo tienes que presionar "⬆️ Sincronizar Nuevos".

### P: ¿Puedo usar esto en un servidor?
**R:** Sí. Sube los archivos a cualquier hosting (Netlify, Vercel, GitHub Pages). Abre el `.html` en el navegador. Funciona igual.

---

## 🐛 Troubleshooting

### Error: "No se pueden cargar los datos"
- Verifica que la URL de Supabase sea correcta
- Verifica que la Anon Key sea correcta (no service_role)
- Abre DevTools (F12) → Console para ver el error exacto

### Error: "No tienes permiso"
- Probablemente usaste la Service Role Key (que no funciona para clientes)
- Usa la **Anon Public Key** en su lugar

### Los datos no se actualizan
- Presiona "⬆️ Sincronizar Nuevos" después de insertar datos en Supabase
- O presiona "🔄 Cargar Todo" para forzar recarga

### El CSV se descarga vacío
- Asegúrate de haber cargado datos primero
- Presiona "🔄 Cargar Todo" antes de exportar

---

## 📈 Estadísticas

El dashboard muestra:
- **Total de Leads**
- **Total de Historiales**
- **Total de Llamadas**
- **Total General**
- **Última sincronización**

---

## 🛠️ Tech Stack

- **Frontend:** HTML5 + CSS3 + Vanilla JavaScript
- **Backend:** Supabase (PostgreSQL)
- **Almacenamiento:** localStorage (navegador)
- **Seguridad:** RLS (Row Level Security en Supabase)

---

## 📝 Licencia

Libre para usar en tus proyectos.

---

## 💡 Tips

1. **Sync incremental:** Usa "⬆️ Sincronizar Nuevos" diariamente
2. **Backup:** Exporta a CSV regularmente
3. **Filtros:** Los filtros se aplican en tiempo real sin recargar
4. **Móvil:** Funciona en celular (responsive design)
5. **Sin conexión:** Los datos cacheados funcionan sin internet

---

## 📞 Soporte

Si tienes dudas:
1. Revisa la consola (F12 → Console) para errores
2. Verifica que Supabase esté online
3. Confirma que los datos existan en las tablas

---

**Hecho con ❤️ para RED Intelfon**
