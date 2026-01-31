# Finanzas Familiares MCP Server

Servidor MCP (Model Context Protocol) que permite a agentes de IA gestionar las finanzas familiares usando las mismas herramientas disponibles en el agente interno de la aplicación.

## Herramientas Disponibles

| Herramienta | Descripción |
|-------------|-------------|
| `obtener_transacciones` | Obtiene transacciones con filtros por fecha, categoría, búsqueda, banco |
| `crear_transacciones` | Crea una o múltiples transacciones |
| `actualizar_transaccion` | Actualiza una transacción existente |
| `eliminar_transaccion` | Elimina (soft delete) una transacción |
| `obtener_categorias` | Lista todas las categorías del equipo |
| `gestionar_categoria` | Crea o edita categorías |
| `obtener_reglas` | Lista reglas de categorización automática |
| `gestionar_regla` | Crea o edita reglas de categorización |
| `obtener_presupuestos` | Lista presupuestos con gastos actuales |
| `gestionar_presupuesto` | Crea o edita presupuestos |
| `obtener_contexto` | Obtiene información del usuario, equipo y bancos disponibles |

## Requisitos

- Node.js 18+
- Base de datos PostgreSQL (la misma que usa la aplicación principal)
- Usuario registrado en la aplicación

## Variables de Entorno

```bash
# URL de conexión a la base de datos PostgreSQL
DATABASE_URL=postgresql://user:password@host:port/database

# Email del usuario que usará el MCP
MCP_USER_EMAIL=usuario@ejemplo.com
```

## Instalación

```bash
cd mcp
npm install
```

## Uso con Claude Code

### Opción 1: Configuración del proyecto (`.mcp.json`)

El archivo `.mcp.json` en la raíz del proyecto ya está configurado. Solo necesitas:

1. Exportar las variables de entorno:
   ```bash
   export DATABASE_URL="tu-url-de-base-de-datos"
   export MCP_USER_EMAIL="tu-email@ejemplo.com"
   ```

2. Reiniciar Claude Code y verificar con `/mcp`

### Opción 2: Agregar manualmente

```bash
claude mcp add --transport stdio finanzas \
  --env DATABASE_URL="$DATABASE_URL" \
  --env MCP_USER_EMAIL="$MCP_USER_EMAIL" \
  -- npx tsx mcp/src/index.ts
```

## Testing con MCP Inspector

```bash
cd mcp
npm run inspect
```

Esto abrirá el inspector en el navegador donde puedes probar cada herramienta.

## Ejemplos de Uso

### Obtener transacciones recientes
```
Herramienta: obtener_transacciones
Parámetros: { "limite": 10 }
```

### Crear una transacción
```
Herramienta: crear_transacciones
Parámetros: {
  "transacciones": [{
    "descripcion": "Compra en supermercado",
    "monto": 500,
    "fecha": "2025-01-31",
    "categoriaId": "uuid-de-categoria"
  }]
}
```

### Obtener categorías
```
Herramienta: obtener_categorias
Parámetros: {}
```

### Crear una regla de categorización
```
Herramienta: gestionar_regla
Parámetros: {
  "nombre": "Uber Eats",
  "campo": "description",
  "textoCoincidencia": "uber eats",
  "categoriaId": "uuid-categoria-comida"
}
```

## Arquitectura

```
mcp/
├── src/
│   ├── index.ts      # Servidor MCP principal con todas las herramientas
│   └── schema.ts     # Definiciones de tablas de Drizzle ORM
├── package.json
├── tsconfig.json
└── README.md
```

## Seguridad

- El MCP usa las mismas credenciales de base de datos que la aplicación principal
- La autenticación se realiza mediante el email del usuario (`MCP_USER_EMAIL`)
- Todas las operaciones están limitadas al equipo del usuario autenticado
- Se mantiene un log de auditoría de todas las transacciones creadas/modificadas/eliminadas
