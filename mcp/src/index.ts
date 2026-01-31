#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, desc, gte, lte, like } from 'drizzle-orm';
import {
  users,
  teams,
  categories,
  transactions,
  budgets,
  rules,
  transactionAuditLog,
} from './schema.js';

// Environment validation
const DATABASE_URL = process.env.DATABASE_URL;
const MCP_USER_EMAIL = process.env.MCP_USER_EMAIL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

if (!MCP_USER_EMAIL) {
  console.error('MCP_USER_EMAIL environment variable is required');
  process.exit(1);
}

// Database setup
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const db = drizzle({ client: pool });

// Context types
interface UserContext {
  userId: string;
  teamId: string;
  userName: string;
  teamName: string;
  userRole: string;
  banks: string[];
}

let userContext: UserContext | null = null;

// Initialize user context
async function initializeContext(): Promise<UserContext> {
  if (userContext) return userContext;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, MCP_USER_EMAIL!));

  if (!user) {
    throw new Error(`User with email ${MCP_USER_EMAIL} not found`);
  }

  const [team] = await db.select().from(teams).where(eq(teams.id, user.teamId));

  if (!team) {
    throw new Error(`Team ${user.teamId} not found`);
  }

  const prefs = (user as any).preferences || {};
  const banks: string[] = Array.isArray(prefs.banks) ? prefs.banks : ['Banregio', 'BBVA'];

  userContext = {
    userId: user.id,
    teamId: user.teamId,
    userName: user.name,
    teamName: team.name,
    userRole: user.role,
    banks,
  };

  return userContext;
}

// Create MCP Server
const server = new McpServer({
  name: 'finanzas-familiares',
  version: '1.0.0',
});

// ========== TOOLS ==========

// Tool: obtener_transacciones
server.tool(
  'obtener_transacciones',
  'Obtiene transacciones del equipo con filtros opcionales por fechas, categoría, búsqueda de texto',
  {
    fechaInicio: z.string().nullable().optional().describe('Fecha de inicio en formato YYYY-MM-DD'),
    fechaFin: z.string().nullable().optional().describe('Fecha de fin en formato YYYY-MM-DD'),
    categoriaId: z.string().nullable().optional().describe('ID de categoría para filtrar'),
    busqueda: z.string().nullable().optional().describe('Texto a buscar en descripción de transacciones'),
    banco: z.string().nullable().optional().describe('Nombre del banco para filtrar'),
    limite: z.number().nullable().optional().describe('Número máximo de transacciones a obtener (default: 50)'),
  },
  async ({ fechaInicio, fechaFin, categoriaId, busqueda, banco, limite }) => {
    try {
      const ctx = await initializeContext();
      const conditions: any[] = [
        eq(transactions.teamId, ctx.teamId),
        eq(transactions.status, 'active'),
      ];

      if (fechaInicio) {
        conditions.push(gte(transactions.date, fechaInicio));
      }
      if (fechaFin) {
        conditions.push(lte(transactions.date, fechaFin));
      }
      if (categoriaId) {
        conditions.push(eq(transactions.categoryId, categoriaId));
      }
      if (busqueda) {
        conditions.push(like(transactions.description, `%${busqueda}%`));
      }
      if (banco) {
        conditions.push(eq(transactions.bank as any, banco));
      }

      const txList = await db
        .select()
        .from(transactions)
        .where(and(...conditions))
        .orderBy(desc(transactions.date))
        .limit(limite ?? 50);

      const categoryList = await db
        .select()
        .from(categories)
        .where(and(eq(categories.teamId, ctx.teamId), eq(categories.isActive, true)));

      const transactionsWithCategories = txList.map((t) => {
        const category = categoryList.find((c) => c.id === t.categoryId);
        return {
          id: t.id,
          fecha: t.date,
          descripcion: t.description,
          monto: t.amount,
          banco: t.bank,
          categoria: category?.name || 'Sin categoría',
          categoriaId: t.categoryId,
          estado: t.status,
        };
      });

      const result = {
        total: transactionsWithCategories.length,
        transacciones: transactionsWithCategories,
        resumen: {
          montoTotal: transactionsWithCategories.reduce(
            (sum, t) => sum + parseFloat(t.monto),
            0
          ),
          filtrosAplicados: { fechaInicio, fechaFin, categoriaId, busqueda, banco },
        },
      };

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error obteniendo transacciones: ${error}` }],
        isError: true,
      };
    }
  }
);

// Tool: crear_transacciones
server.tool(
  'crear_transacciones',
  'Crea una o múltiples transacciones financieras para el equipo. El campo "banco" debe ser uno de los bancos configurados del usuario.',
  {
    transacciones: z
      .array(
        z.object({
          descripcion: z.string().describe('Descripción de la transacción'),
          monto: z.number().describe('Monto de la transacción (siempre positivo)'),
          fecha: z.string().describe('Fecha de la transacción en formato YYYY-MM-DD'),
          categoriaId: z.string().describe('ID de la categoría para la transacción'),
          banco: z.string().nullable().optional().describe('Nombre del banco'),
        })
      )
      .describe('Array de transacciones a crear'),
  },
  async ({ transacciones }) => {
    try {
      const ctx = await initializeContext();
      const categoryList = await db
        .select()
        .from(categories)
        .where(and(eq(categories.teamId, ctx.teamId), eq(categories.isActive, true)));

      const createdTransactions: any[] = [];
      const errors: string[] = [];

      for (let index = 0; index < transacciones.length; index++) {
        const tx = transacciones[index];
        try {
          const category = categoryList.find((c) => c.id === tx.categoriaId);
          if (!category) {
            errors.push(`Transacción ${index + 1}: La categoría con ID ${tx.categoriaId} no existe`);
            continue;
          }

          const selectedBank = tx.banco || ctx.banks[0] || 'Banregio';
          if (!ctx.banks.includes(selectedBank)) {
            errors.push(
              `Transacción ${index + 1}: El banco "${selectedBank}" no es válido. Opciones: ${ctx.banks.join(', ')}`
            );
            continue;
          }

          const [newTransaction] = await db
            .insert(transactions)
            .values({
              description: tx.descripcion,
              amount: Math.abs(tx.monto).toString(),
              date: tx.fecha,
              categoryId: tx.categoriaId,
              bank: selectedBank,
              status: 'active',
              teamId: ctx.teamId,
              userId: ctx.userId,
            })
            .returning();

          // Create audit log
          await db.insert(transactionAuditLog).values({
            transactionId: newTransaction.id,
            userId: ctx.userId,
            changeType: 'created',
            newValue: newTransaction,
          });

          createdTransactions.push({
            id: newTransaction.id,
            descripcion: tx.descripcion,
            monto: tx.monto,
            fecha: tx.fecha,
            categoria: category.name,
            banco: selectedBank,
          });
        } catch (error) {
          errors.push(`Transacción ${index + 1} ("${tx.descripcion}"): ${error}`);
        }
      }

      let result = '';
      if (createdTransactions.length > 0) {
        result += `${createdTransactions.length} transacciones creadas exitosamente:\n`;
        createdTransactions.forEach((t, i) => {
          result += `${i + 1}. "${t.descripcion}" - $${Math.abs(t.monto)} (${t.categoria}) - ${t.fecha}\n`;
        });
      }
      if (errors.length > 0) {
        result += `\n${errors.length} errores encontrados:\n`;
        errors.forEach((error, i) => {
          result += `${i + 1}. ${error}\n`;
        });
      }

      return { content: [{ type: 'text', text: result || 'No se proporcionaron transacciones válidas' }] };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error creando transacciones: ${error}` }],
        isError: true,
      };
    }
  }
);

// Tool: obtener_categorias
server.tool(
  'obtener_categorias',
  'Obtiene todas las categorías disponibles para el equipo',
  {},
  async () => {
    try {
      const ctx = await initializeContext();
      const categoryList = await db
        .select()
        .from(categories)
        .where(and(eq(categories.teamId, ctx.teamId), eq(categories.isActive, true)));

      const result = {
        total: categoryList.length,
        categorias: categoryList.map((c) => ({
          id: c.id,
          nombre: c.name,
          icono: c.icon,
          color: c.color,
        })),
      };

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error obteniendo categorías: ${error}` }],
        isError: true,
      };
    }
  }
);

// Tool: gestionar_categoria
server.tool(
  'gestionar_categoria',
  'Crea o edita una categoría. Si se proporciona ID, edita la categoría existente; si no, crea una nueva',
  {
    id: z.string().nullable().optional().describe('ID de la categoría a editar (opcional para crear nueva)'),
    nombre: z.string().describe('Nombre de la categoría'),
    icono: z.string().nullable().optional().describe('Icono de la categoría'),
    color: z.string().nullable().optional().describe('Color de la categoría'),
  },
  async ({ id, nombre, icono, color }) => {
    try {
      const ctx = await initializeContext();

      if (id) {
        // Edit existing category
        const [updated] = await db
          .update(categories)
          .set({
            name: nombre,
            icon: icono ?? undefined,
            color: color ?? undefined,
            updatedAt: new Date(),
          })
          .where(and(eq(categories.id, id), eq(categories.teamId, ctx.teamId)))
          .returning();

        return {
          content: [
            {
              type: 'text',
              text: updated
                ? `Categoría "${nombre}" actualizada exitosamente`
                : 'Error actualizando categoría',
            },
          ],
        };
      } else {
        // Create new category
        const [newCategory] = await db
          .insert(categories)
          .values({
            name: nombre,
            icon: icono || '📝',
            color: color || '#6366f1',
            teamId: ctx.teamId,
          })
          .returning();

        return {
          content: [
            {
              type: 'text',
              text: `Nueva categoría "${nombre}" creada exitosamente con ID: ${newCategory.id}`,
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error gestionando categoría: ${error}` }],
        isError: true,
      };
    }
  }
);

// Tool: obtener_reglas
server.tool(
  'obtener_reglas',
  'Obtiene todas las reglas de categorización automática del equipo',
  {},
  async () => {
    try {
      const ctx = await initializeContext();
      const ruleList = await db
        .select()
        .from(rules)
        .where(and(eq(rules.teamId, ctx.teamId), eq(rules.isActive, true)));

      const categoryList = await db
        .select()
        .from(categories)
        .where(and(eq(categories.teamId, ctx.teamId), eq(categories.isActive, true)));

      const rulesWithCategories = ruleList.map((r) => {
        const category = categoryList.find((c) => c.id === r.categoryId);
        return {
          id: r.id,
          nombre: r.name,
          campo: r.field,
          textoCoincidencia: r.matchText,
          categoria: category?.name || 'Categoría no encontrada',
          categoriaId: r.categoryId,
          activa: r.isActive,
        };
      });

      const result = {
        total: rulesWithCategories.length,
        reglas: rulesWithCategories,
      };

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error obteniendo reglas: ${error}` }],
        isError: true,
      };
    }
  }
);

// Tool: gestionar_regla
server.tool(
  'gestionar_regla',
  'Crea o edita una regla de categorización automática. Si se proporciona ID, edita la regla existente; si no, crea una nueva',
  {
    id: z.string().nullable().optional().describe('ID de la regla a editar (opcional para crear nueva)'),
    nombre: z.string().describe('Nombre descriptivo de la regla'),
    campo: z.enum(['description', 'amount']).describe('Campo a evaluar: description o amount'),
    textoCoincidencia: z.string().describe('Texto o patrón que debe coincidir'),
    categoriaId: z.string().describe('ID de la categoría a asignar cuando coincida'),
    activa: z.boolean().nullable().optional().describe('Si la regla está activa (default: true)'),
  },
  async ({ id, nombre, campo, textoCoincidencia, categoriaId, activa }) => {
    try {
      const ctx = await initializeContext();

      // Verify category exists
      const [category] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.id, categoriaId), eq(categories.teamId, ctx.teamId)));

      if (!category) {
        return {
          content: [{ type: 'text', text: `Error: La categoría con ID ${categoriaId} no existe` }],
          isError: true,
        };
      }

      if (id) {
        // Edit existing rule
        const [updated] = await db
          .update(rules)
          .set({
            name: nombre,
            field: campo,
            matchText: textoCoincidencia,
            categoryId: categoriaId,
            isActive: activa ?? true,
            updatedAt: new Date(),
          })
          .where(and(eq(rules.id, id), eq(rules.teamId, ctx.teamId)))
          .returning();

        return {
          content: [
            {
              type: 'text',
              text: updated ? `Regla "${nombre}" actualizada exitosamente` : 'Error actualizando regla',
            },
          ],
        };
      } else {
        // Create new rule
        const [newRule] = await db
          .insert(rules)
          .values({
            name: nombre,
            field: campo,
            matchText: textoCoincidencia,
            categoryId: categoriaId,
            isActive: activa ?? true,
            teamId: ctx.teamId,
          })
          .returning();

        return {
          content: [
            {
              type: 'text',
              text: `Nueva regla "${nombre}" creada exitosamente con ID: ${newRule.id}`,
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error gestionando regla: ${error}` }],
        isError: true,
      };
    }
  }
);

// Tool: obtener_presupuestos
server.tool(
  'obtener_presupuestos',
  'Obtiene todos los presupuestos del equipo con información de gastos actuales',
  {},
  async () => {
    try {
      const ctx = await initializeContext();
      const budgetList = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.teamId, ctx.teamId), eq(budgets.isActive, true)));

      const categoryList = await db
        .select()
        .from(categories)
        .where(and(eq(categories.teamId, ctx.teamId), eq(categories.isActive, true)));

      const budgetsWithDetails = await Promise.all(
        budgetList.map(async (b) => {
          const category = categoryList.find((c) => c.id === b.categoryId);

          // Get transactions for this category within the budget period
          const conditions: any[] = [
            eq(transactions.teamId, ctx.teamId),
            eq(transactions.categoryId, b.categoryId),
            eq(transactions.status, 'active'),
          ];
          if (b.startDate) {
            conditions.push(gte(transactions.date, b.startDate));
          }
          if (b.endDate) {
            conditions.push(lte(transactions.date, b.endDate));
          }

          const txList = await db
            .select()
            .from(transactions)
            .where(and(...conditions));

          const montoGastado = txList.reduce((sum, t) => sum + parseFloat(t.amount), 0);
          const budgetAmount = parseFloat(b.amount);

          return {
            id: b.id,
            categoria: category?.name || 'Categoría no encontrada',
            categoriaId: b.categoryId,
            monto: budgetAmount,
            periodo: b.period,
            fechaInicio: b.startDate,
            fechaFin: b.endDate,
            montoGastado,
            porcentajeUsado: budgetAmount > 0 ? (montoGastado / budgetAmount) * 100 : 0,
            restante: budgetAmount - montoGastado,
          };
        })
      );

      const result = {
        total: budgetsWithDetails.length,
        presupuestos: budgetsWithDetails,
        resumen: {
          presupuestoTotal: budgetsWithDetails.reduce((sum, b) => sum + b.monto, 0),
          gastadoTotal: budgetsWithDetails.reduce((sum, b) => sum + b.montoGastado, 0),
        },
      };

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error obteniendo presupuestos: ${error}` }],
        isError: true,
      };
    }
  }
);

// Tool: gestionar_presupuesto
server.tool(
  'gestionar_presupuesto',
  'Crea o edita un presupuesto. Si se proporciona ID, edita el presupuesto existente; si no, crea uno nuevo',
  {
    id: z.string().nullable().optional().describe('ID del presupuesto a editar (opcional para crear nuevo)'),
    categoriaId: z.string().describe('ID de la categoría para el presupuesto'),
    monto: z.number().describe('Monto del presupuesto'),
    periodo: z.enum(['monthly', 'weekly', 'biweekly', 'custom']).describe('Período del presupuesto'),
    fechaInicio: z.string().describe('Fecha de inicio en formato YYYY-MM-DD'),
    fechaFin: z.string().describe('Fecha de fin en formato YYYY-MM-DD'),
  },
  async ({ id, categoriaId, monto, periodo, fechaInicio, fechaFin }) => {
    try {
      const ctx = await initializeContext();

      // Verify category exists
      const [category] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.id, categoriaId), eq(categories.teamId, ctx.teamId)));

      if (!category) {
        return {
          content: [{ type: 'text', text: `Error: La categoría con ID ${categoriaId} no existe` }],
          isError: true,
        };
      }

      if (id) {
        // Edit existing budget
        const [updated] = await db
          .update(budgets)
          .set({
            categoryId: categoriaId,
            amount: monto.toString(),
            period: periodo,
            startDate: fechaInicio,
            endDate: fechaFin,
            updatedAt: new Date(),
          })
          .where(and(eq(budgets.id, id), eq(budgets.teamId, ctx.teamId)))
          .returning();

        return {
          content: [
            {
              type: 'text',
              text: updated
                ? `Presupuesto para "${category.name}" actualizado exitosamente`
                : 'Error actualizando presupuesto',
            },
          ],
        };
      } else {
        // Create new budget
        const [newBudget] = await db
          .insert(budgets)
          .values({
            categoryId: categoriaId,
            amount: monto.toString(),
            period: periodo,
            startDate: fechaInicio,
            endDate: fechaFin,
            teamId: ctx.teamId,
          })
          .returning();

        return {
          content: [
            {
              type: 'text',
              text: `Nuevo presupuesto para "${category.name}" creado exitosamente con ID: ${newBudget.id}`,
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error gestionando presupuesto: ${error}` }],
        isError: true,
      };
    }
  }
);

// Tool: obtener_contexto
server.tool(
  'obtener_contexto',
  'Obtiene información del contexto actual: usuario, equipo y bancos disponibles',
  {},
  async () => {
    try {
      const ctx = await initializeContext();
      const now = new Date();

      const result = {
        usuario: {
          id: ctx.userId,
          nombre: ctx.userName,
          rol: ctx.userRole,
        },
        equipo: {
          id: ctx.teamId,
          nombre: ctx.teamName,
        },
        bancosDisponibles: ctx.banks,
        fechaActual: now.toISOString().split('T')[0],
        horaActual: now.toLocaleTimeString('es-ES', { timeZone: 'America/Mexico_City' }),
      };

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error obteniendo contexto: ${error}` }],
        isError: true,
      };
    }
  }
);

// Tool: eliminar_transaccion
server.tool(
  'eliminar_transaccion',
  'Elimina (soft delete) una transacción por su ID',
  {
    id: z.string().describe('ID de la transacción a eliminar'),
  },
  async ({ id }) => {
    try {
      const ctx = await initializeContext();

      // Get original transaction for audit log
      const [original] = await db
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.teamId, ctx.teamId)));

      if (!original) {
        return {
          content: [{ type: 'text', text: `Transacción con ID ${id} no encontrada` }],
          isError: true,
        };
      }

      // Soft delete
      await db
        .update(transactions)
        .set({ status: 'deleted', updatedAt: new Date() })
        .where(eq(transactions.id, id));

      // Create audit log
      await db.insert(transactionAuditLog).values({
        transactionId: id,
        userId: ctx.userId,
        changeType: 'deleted',
        oldValue: original,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Transacción "${original.description}" eliminada exitosamente`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error eliminando transacción: ${error}` }],
        isError: true,
      };
    }
  }
);

// Tool: actualizar_transaccion
server.tool(
  'actualizar_transaccion',
  'Actualiza una transacción existente',
  {
    id: z.string().describe('ID de la transacción a actualizar'),
    descripcion: z.string().nullable().optional().describe('Nueva descripción'),
    monto: z.number().nullable().optional().describe('Nuevo monto'),
    fecha: z.string().nullable().optional().describe('Nueva fecha en formato YYYY-MM-DD'),
    categoriaId: z.string().nullable().optional().describe('Nuevo ID de categoría'),
    banco: z.string().nullable().optional().describe('Nuevo banco'),
  },
  async ({ id, descripcion, monto, fecha, categoriaId, banco }) => {
    try {
      const ctx = await initializeContext();

      // Get original transaction
      const [original] = await db
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.teamId, ctx.teamId)));

      if (!original) {
        return {
          content: [{ type: 'text', text: `Transacción con ID ${id} no encontrada` }],
          isError: true,
        };
      }

      // Validate category if provided
      if (categoriaId) {
        const [category] = await db
          .select()
          .from(categories)
          .where(and(eq(categories.id, categoriaId), eq(categories.teamId, ctx.teamId)));

        if (!category) {
          return {
            content: [{ type: 'text', text: `Categoría con ID ${categoriaId} no encontrada` }],
            isError: true,
          };
        }
      }

      // Validate bank if provided
      if (banco && !ctx.banks.includes(banco)) {
        return {
          content: [
            {
              type: 'text',
              text: `Banco "${banco}" no válido. Opciones: ${ctx.banks.join(', ')}`,
            },
          ],
          isError: true,
        };
      }

      const updateData: any = { updatedAt: new Date() };
      if (descripcion) updateData.description = descripcion;
      if (monto !== undefined && monto !== null) updateData.amount = Math.abs(monto).toString();
      if (fecha) updateData.date = fecha;
      if (categoriaId) updateData.categoryId = categoriaId;
      if (banco) updateData.bank = banco;

      const [updated] = await db
        .update(transactions)
        .set(updateData)
        .where(eq(transactions.id, id))
        .returning();

      // Create audit log
      await db.insert(transactionAuditLog).values({
        transactionId: id,
        userId: ctx.userId,
        changeType: 'updated',
        oldValue: original,
        newValue: updated,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Transacción actualizada exitosamente`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error actualizando transacción: ${error}` }],
        isError: true,
      };
    }
  }
);

// ========== RESOURCES ==========

// Resource: Team context
server.resource(
  'contexto-equipo',
  'context://team',
  { mimeType: 'application/json', description: 'Información del equipo y usuario actual' },
  async () => {
    const ctx = await initializeContext();
    return {
      contents: [
        {
          uri: 'context://team',
          text: JSON.stringify(
            {
              usuario: { id: ctx.userId, nombre: ctx.userName, rol: ctx.userRole },
              equipo: { id: ctx.teamId, nombre: ctx.teamName },
              bancosDisponibles: ctx.banks,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// ========== START SERVER ==========

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Finanzas Familiares MCP Server running');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
