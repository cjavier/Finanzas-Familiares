import { storage } from './storage';
import type { User, Team } from '@shared/schema';

interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

interface UserContext {
  userId: string;
  teamId: string;
  userName: string;
  teamName: string;
  userRole: string;
  banks: string[];
}

// Build user context from authenticated user
async function buildContext(user: User): Promise<UserContext> {
  const team = await storage.getTeam(user.teamId);
  if (!team) {
    throw new Error(`Team ${user.teamId} not found`);
  }

  const prefs = (user as any).preferences || {};
  const banks: string[] = Array.isArray(prefs.banks) ? prefs.banks : ['Banregio', 'BBVA'];

  return {
    userId: user.id,
    teamId: user.teamId,
    userName: user.name,
    teamName: team.name,
    userRole: user.role,
    banks,
  };
}

// Tool definitions with their schemas
export const mcpTools = [
  {
    name: 'obtener_transacciones',
    description: 'Obtiene transacciones del equipo con filtros opcionales por fechas, categoría, búsqueda de texto',
    inputSchema: {
      type: 'object',
      properties: {
        fechaInicio: { type: 'string', description: 'Fecha de inicio en formato YYYY-MM-DD' },
        fechaFin: { type: 'string', description: 'Fecha de fin en formato YYYY-MM-DD' },
        categoriaId: { type: 'string', description: 'ID de categoría para filtrar' },
        busqueda: { type: 'string', description: 'Texto a buscar en descripción' },
        banco: { type: 'string', description: 'Nombre del banco para filtrar' },
        limite: { type: 'number', description: 'Número máximo de transacciones (default: 50)' },
      },
    },
  },
  {
    name: 'crear_transacciones',
    description: 'Crea una o múltiples transacciones financieras',
    inputSchema: {
      type: 'object',
      properties: {
        transacciones: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              descripcion: { type: 'string', description: 'Descripción de la transacción' },
              monto: { type: 'number', description: 'Monto (siempre positivo)' },
              fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
              categoriaId: { type: 'string', description: 'ID de la categoría' },
              banco: { type: 'string', description: 'Nombre del banco' },
            },
            required: ['descripcion', 'monto', 'fecha', 'categoriaId'],
          },
          description: 'Array de transacciones a crear',
        },
      },
      required: ['transacciones'],
    },
  },
  {
    name: 'actualizar_transaccion',
    description: 'Actualiza una transacción existente',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID de la transacción a actualizar' },
        descripcion: { type: 'string', description: 'Nueva descripción' },
        monto: { type: 'number', description: 'Nuevo monto' },
        fecha: { type: 'string', description: 'Nueva fecha en formato YYYY-MM-DD' },
        categoriaId: { type: 'string', description: 'Nuevo ID de categoría' },
        banco: { type: 'string', description: 'Nuevo banco' },
      },
      required: ['id'],
    },
  },
  {
    name: 'eliminar_transaccion',
    description: 'Elimina (soft delete) una transacción por su ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID de la transacción a eliminar' },
      },
      required: ['id'],
    },
  },
  {
    name: 'obtener_categorias',
    description: 'Obtiene todas las categorías disponibles para el equipo',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'gestionar_categoria',
    description: 'Crea o edita una categoría. Si se proporciona ID, edita; si no, crea nueva',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID de la categoría a editar (opcional)' },
        nombre: { type: 'string', description: 'Nombre de la categoría' },
        icono: { type: 'string', description: 'Icono de la categoría' },
        color: { type: 'string', description: 'Color de la categoría' },
      },
      required: ['nombre'],
    },
  },
  {
    name: 'obtener_reglas',
    description: 'Obtiene todas las reglas de categorización automática del equipo',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'gestionar_regla',
    description: 'Crea o edita una regla de categorización automática',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID de la regla a editar (opcional)' },
        nombre: { type: 'string', description: 'Nombre descriptivo de la regla' },
        campo: { type: 'string', enum: ['description', 'amount'], description: 'Campo a evaluar' },
        textoCoincidencia: { type: 'string', description: 'Texto o patrón que debe coincidir' },
        categoriaId: { type: 'string', description: 'ID de la categoría a asignar' },
        activa: { type: 'boolean', description: 'Si la regla está activa' },
      },
      required: ['nombre', 'campo', 'textoCoincidencia', 'categoriaId'],
    },
  },
  {
    name: 'obtener_presupuestos',
    description: 'Obtiene todos los presupuestos del equipo con información de gastos actuales',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'gestionar_presupuesto',
    description: 'Crea o edita un presupuesto',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID del presupuesto a editar (opcional)' },
        categoriaId: { type: 'string', description: 'ID de la categoría' },
        monto: { type: 'number', description: 'Monto del presupuesto' },
        periodo: { type: 'string', enum: ['monthly', 'weekly', 'biweekly', 'custom'], description: 'Período' },
        fechaInicio: { type: 'string', description: 'Fecha de inicio YYYY-MM-DD' },
        fechaFin: { type: 'string', description: 'Fecha de fin YYYY-MM-DD' },
      },
      required: ['categoriaId', 'monto', 'periodo', 'fechaInicio', 'fechaFin'],
    },
  },
  {
    name: 'obtener_contexto',
    description: 'Obtiene información del contexto actual: usuario, equipo y bancos disponibles',
    inputSchema: { type: 'object', properties: {} },
  },
];

// Tool execution handlers
export async function executeTool(
  toolName: string,
  args: Record<string, any>,
  user: User
): Promise<McpToolResult> {
  const ctx = await buildContext(user);

  try {
    switch (toolName) {
      case 'obtener_transacciones':
        return await getTransactions(ctx, args);
      case 'crear_transacciones':
        return await createTransactions(ctx, args);
      case 'actualizar_transaccion':
        return await updateTransaction(ctx, args);
      case 'eliminar_transaccion':
        return await deleteTransaction(ctx, args);
      case 'obtener_categorias':
        return await getCategories(ctx);
      case 'gestionar_categoria':
        return await manageCategory(ctx, args);
      case 'obtener_reglas':
        return await getRules(ctx);
      case 'gestionar_regla':
        return await manageRule(ctx, args);
      case 'obtener_presupuestos':
        return await getBudgets(ctx);
      case 'gestionar_presupuesto':
        return await manageBudget(ctx, args);
      case 'obtener_contexto':
        return await getContext(ctx);
      default:
        return {
          content: [{ type: 'text', text: `Herramienta desconocida: ${toolName}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error ejecutando ${toolName}: ${error}` }],
      isError: true,
    };
  }
}

// Tool implementations
async function getTransactions(ctx: UserContext, args: any): Promise<McpToolResult> {
  const { fechaInicio, fechaFin, categoriaId, busqueda, banco, limite } = args;

  const transactions = await storage.getTransactions(ctx.teamId, {
    fromDate: fechaInicio,
    toDate: fechaFin,
    categoryId: categoriaId,
    search: busqueda,
    bank: banco,
    limit: limite ?? 50,
  });

  const categories = await storage.getCategories(ctx.teamId);

  const result = transactions.map((t) => {
    const category = categories.find((c) => c.id === t.categoryId);
    return {
      id: t.id,
      fecha: t.date,
      descripcion: t.description,
      monto: t.amount,
      banco: t.bank,
      categoria: category?.name || 'Sin categoría',
      categoriaId: t.categoryId,
    };
  });

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        total: result.length,
        transacciones: result,
        resumen: {
          montoTotal: result.reduce((sum, t) => sum + parseFloat(t.monto), 0),
        },
      }, null, 2),
    }],
  };
}

async function createTransactions(ctx: UserContext, args: any): Promise<McpToolResult> {
  const { transacciones } = args;
  const categories = await storage.getCategories(ctx.teamId);
  const created: any[] = [];
  const errors: string[] = [];

  for (let i = 0; i < transacciones.length; i++) {
    const tx = transacciones[i];
    try {
      const category = categories.find((c) => c.id === tx.categoriaId);
      if (!category) {
        errors.push(`Transacción ${i + 1}: Categoría ${tx.categoriaId} no existe`);
        continue;
      }

      const selectedBank = tx.banco || ctx.banks[0] || 'Banregio';
      if (!ctx.banks.includes(selectedBank)) {
        errors.push(`Transacción ${i + 1}: Banco "${selectedBank}" no válido. Opciones: ${ctx.banks.join(', ')}`);
        continue;
      }

      const newTx = await storage.createTransaction({
        description: tx.descripcion,
        amount: Math.abs(tx.monto).toString(),
        date: tx.fecha,
        categoryId: tx.categoriaId,
        bank: selectedBank,
        status: 'active',
        teamId: ctx.teamId,
        userId: ctx.userId,
      });

      created.push({
        id: newTx.id,
        descripcion: tx.descripcion,
        monto: tx.monto,
        categoria: category.name,
      });
    } catch (error) {
      errors.push(`Transacción ${i + 1}: ${error}`);
    }
  }

  let result = '';
  if (created.length > 0) {
    result += `${created.length} transacciones creadas:\n`;
    created.forEach((t, i) => {
      result += `${i + 1}. "${t.descripcion}" - $${t.monto} (${t.categoria})\n`;
    });
  }
  if (errors.length > 0) {
    result += `\n${errors.length} errores:\n${errors.join('\n')}`;
  }

  return { content: [{ type: 'text', text: result || 'No se crearon transacciones' }] };
}

async function updateTransaction(ctx: UserContext, args: any): Promise<McpToolResult> {
  const { id, descripcion, monto, fecha, categoriaId, banco } = args;

  const existing = await storage.getTransaction(id, ctx.teamId);
  if (!existing) {
    return { content: [{ type: 'text', text: `Transacción ${id} no encontrada` }], isError: true };
  }

  if (categoriaId) {
    const category = await storage.getCategory(categoriaId, ctx.teamId);
    if (!category) {
      return { content: [{ type: 'text', text: `Categoría ${categoriaId} no encontrada` }], isError: true };
    }
  }

  if (banco && !ctx.banks.includes(banco)) {
    return { content: [{ type: 'text', text: `Banco "${banco}" no válido` }], isError: true };
  }

  const updateData: any = {};
  if (descripcion) updateData.description = descripcion;
  if (monto !== undefined) updateData.amount = Math.abs(monto).toString();
  if (fecha) updateData.date = fecha;
  if (categoriaId) updateData.categoryId = categoriaId;
  if (banco) updateData.bank = banco;

  await storage.updateTransaction(id, updateData, ctx.userId);

  return { content: [{ type: 'text', text: 'Transacción actualizada exitosamente' }] };
}

async function deleteTransaction(ctx: UserContext, args: any): Promise<McpToolResult> {
  const { id } = args;

  const existing = await storage.getTransaction(id, ctx.teamId);
  if (!existing) {
    return { content: [{ type: 'text', text: `Transacción ${id} no encontrada` }], isError: true };
  }

  await storage.deleteTransaction(id, ctx.teamId, ctx.userId);

  return { content: [{ type: 'text', text: `Transacción "${existing.description}" eliminada` }] };
}

async function getCategories(ctx: UserContext): Promise<McpToolResult> {
  const categories = await storage.getCategories(ctx.teamId);

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        total: categories.length,
        categorias: categories.map((c) => ({
          id: c.id,
          nombre: c.name,
          icono: c.icon,
          color: c.color,
        })),
      }, null, 2),
    }],
  };
}

async function manageCategory(ctx: UserContext, args: any): Promise<McpToolResult> {
  const { id, nombre, icono, color } = args;

  if (id) {
    const updated = await storage.updateCategory(id, {
      name: nombre,
      icon: icono,
      color: color,
    });
    return {
      content: [{
        type: 'text',
        text: updated ? `Categoría "${nombre}" actualizada` : 'Error actualizando categoría',
      }],
    };
  } else {
    const newCategory = await storage.createCategory({
      name: nombre,
      icon: icono || '📝',
      color: color || '#6366f1',
      teamId: ctx.teamId,
    });
    return {
      content: [{ type: 'text', text: `Categoría "${nombre}" creada con ID: ${newCategory.id}` }],
    };
  }
}

async function getRules(ctx: UserContext): Promise<McpToolResult> {
  const rules = await storage.getRules(ctx.teamId);
  const categories = await storage.getCategories(ctx.teamId);

  const result = rules.map((r) => {
    const category = categories.find((c) => c.id === r.categoryId);
    return {
      id: r.id,
      nombre: r.name,
      campo: r.field,
      textoCoincidencia: r.matchText,
      categoria: category?.name || 'No encontrada',
      categoriaId: r.categoryId,
      activa: r.isActive,
    };
  });

  return {
    content: [{ type: 'text', text: JSON.stringify({ total: result.length, reglas: result }, null, 2) }],
  };
}

async function manageRule(ctx: UserContext, args: any): Promise<McpToolResult> {
  const { id, nombre, campo, textoCoincidencia, categoriaId, activa } = args;

  const category = await storage.getCategory(categoriaId, ctx.teamId);
  if (!category) {
    return { content: [{ type: 'text', text: `Categoría ${categoriaId} no existe` }], isError: true };
  }

  if (id) {
    const updated = await storage.updateRule(id, {
      name: nombre,
      field: campo,
      matchText: textoCoincidencia,
      categoryId: categoriaId,
      isActive: activa ?? true,
    });
    return {
      content: [{ type: 'text', text: updated ? `Regla "${nombre}" actualizada` : 'Error actualizando regla' }],
    };
  } else {
    const newRule = await storage.createRule({
      name: nombre,
      field: campo,
      matchText: textoCoincidencia,
      categoryId: categoriaId,
      isActive: activa ?? true,
      teamId: ctx.teamId,
    });
    return {
      content: [{ type: 'text', text: `Regla "${nombre}" creada con ID: ${newRule.id}` }],
    };
  }
}

async function getBudgets(ctx: UserContext): Promise<McpToolResult> {
  const budgets = await storage.getBudgets(ctx.teamId);
  const categories = await storage.getCategories(ctx.teamId);

  const result = await Promise.all(
    budgets.map(async (b) => {
      const category = categories.find((c) => c.id === b.categoryId);
      const transactions = await storage.getTransactions(ctx.teamId, {
        categoryId: b.categoryId,
        fromDate: b.startDate,
        toDate: b.endDate || undefined,
      });

      const gastado = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const monto = parseFloat(b.amount);

      return {
        id: b.id,
        categoria: category?.name || 'No encontrada',
        categoriaId: b.categoryId,
        monto,
        periodo: b.period,
        fechaInicio: b.startDate,
        fechaFin: b.endDate,
        gastado,
        porcentaje: monto > 0 ? (gastado / monto) * 100 : 0,
        restante: monto - gastado,
      };
    })
  );

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        total: result.length,
        presupuestos: result,
        resumen: {
          presupuestoTotal: result.reduce((sum, b) => sum + b.monto, 0),
          gastadoTotal: result.reduce((sum, b) => sum + b.gastado, 0),
        },
      }, null, 2),
    }],
  };
}

async function manageBudget(ctx: UserContext, args: any): Promise<McpToolResult> {
  const { id, categoriaId, monto, periodo, fechaInicio, fechaFin } = args;

  const category = await storage.getCategory(categoriaId, ctx.teamId);
  if (!category) {
    return { content: [{ type: 'text', text: `Categoría ${categoriaId} no existe` }], isError: true };
  }

  if (id) {
    const updated = await storage.updateBudget(id, {
      categoryId: categoriaId,
      amount: monto.toString(),
      period: periodo,
      startDate: fechaInicio,
      endDate: fechaFin,
    });
    return {
      content: [{
        type: 'text',
        text: updated ? `Presupuesto para "${category.name}" actualizado` : 'Error actualizando presupuesto',
      }],
    };
  } else {
    const newBudget = await storage.createBudget({
      categoryId: categoriaId,
      amount: monto.toString(),
      period: periodo,
      startDate: fechaInicio,
      endDate: fechaFin,
      teamId: ctx.teamId,
    });
    return {
      content: [{ type: 'text', text: `Presupuesto para "${category.name}" creado con ID: ${newBudget.id}` }],
    };
  }
}

async function getContext(ctx: UserContext): Promise<McpToolResult> {
  const now = new Date();

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        usuario: { id: ctx.userId, nombre: ctx.userName, rol: ctx.userRole },
        equipo: { id: ctx.teamId, nombre: ctx.teamName },
        bancosDisponibles: ctx.banks,
        fechaActual: now.toISOString().split('T')[0],
        horaActual: now.toLocaleTimeString('es-ES', { timeZone: 'America/Mexico_City' }),
      }, null, 2),
    }],
  };
}
