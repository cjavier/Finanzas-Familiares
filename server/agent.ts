import { Agent, run, tool } from '@openai/agents';
import { OpenAI } from 'openai';
import { z } from 'zod';
import fs from 'fs';
import { readFile } from 'fs/promises';
import type { User, Team, Category, Transaction, Budget, Rule, InsertCategory, InsertBudget, InsertRule } from '../shared/schema';
import type { IStorage } from './storage';

interface AgentContext {
  user: User;
  team: Team;
  storage: IStorage;
}

class FinanceAgent {
  private agent: Agent;
  private openai: OpenAI;
  private context: AgentContext | null = null;
  private currentToolsUsed: Set<string> = new Set();

  constructor() {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required for AI agent functionality');
    }

    // Initialize OpenAI client for vision API
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Define comprehensive financial management tools
    const getTransactionsTool = tool({
      name: 'obtener_transacciones',
      description: 'Obtiene transacciones del equipo con filtros opcionales por fechas, categoría, búsqueda de texto',
      parameters: z.object({
        fechaInicio: z.string().nullable().optional().describe('Fecha de inicio en formato YYYY-MM-DD'),
        fechaFin: z.string().nullable().optional().describe('Fecha de fin en formato YYYY-MM-DD'),
        categoriaId: z.string().nullable().optional().describe('ID de categoría para filtrar'),
        busqueda: z.string().nullable().optional().describe('Texto a buscar en descripción de transacciones'),
        limite: z.number().nullable().optional().describe('Número máximo de transacciones a obtener (default: 50)')
      }),
      execute: async ({ fechaInicio, fechaFin, categoriaId, busqueda, limite }) => {
        if (!this.context) {
          return 'No hay contexto disponible';
        }
        
        this.currentToolsUsed.add('obtener_transacciones');
        
        try {
          const filters = {
            fromDate: fechaInicio ?? undefined,
            toDate: fechaFin ?? undefined,
            categoryId: categoriaId ?? undefined,
            search: busqueda ?? undefined,
            limit: limite ?? 50
          };
          
          const transactions = await this.context.storage.getTransactions(this.context.team.id, filters);
          const categories = await this.context.storage.getCategories(this.context.team.id);
          
          const transactionsWithCategories = transactions.map(t => {
            const category = categories.find(c => c.id === t.categoryId);
            return {
              id: t.id,
              fecha: t.date,
              descripcion: t.description,
              monto: t.amount,
              categoria: category?.name || 'Sin categoría',
              estado: t.status
            };
          });
          
          return JSON.stringify({
            total: transactionsWithCategories.length,
            transacciones: transactionsWithCategories,
            resumen: {
              montoTotal: transactionsWithCategories.reduce((sum, t) => sum + parseFloat(t.monto), 0),
              filtrosAplicados: { fechaInicio, fechaFin, categoriaId, busqueda }
            }
          }, null, 2);
        } catch (error) {
          return `Error obteniendo transacciones: ${error}`;
        }
      }
    });

    const getCategoriesTool = tool({
      name: 'obtener_categorias',
      description: 'Obtiene todas las categorías disponibles para el equipo',
      parameters: z.object({}),
      execute: async () => {
        if (!this.context) {
          return 'No hay contexto disponible';
        }
        
        this.currentToolsUsed.add('obtener_categorias');
        
        try {
          const categories = await this.context.storage.getCategories(this.context.team.id);
          return JSON.stringify({
            total: categories.length,
            categorias: categories.map(c => ({
              id: c.id,
              nombre: c.name,
              icono: c.icon,
              color: c.color
            }))
          }, null, 2);
        } catch (error) {
          return `Error obteniendo categorías: ${error}`;
        }
      }
    });

    const manageCategoryTool = tool({
      name: 'gestionar_categoria',
      description: 'Crea o edita una categoría. Si se proporciona ID, edita la categoría existente; si no, crea una nueva',
      parameters: z.object({
        id: z.string().nullable().optional().describe('ID de la categoría a editar (opcional para crear nueva)'),
        nombre: z.string().describe('Nombre de la categoría'),
        icono: z.string().nullable().optional().describe('Icono de la categoría'),
        color: z.string().nullable().optional().describe('Color de la categoría')
      }),
      execute: async ({ id, nombre, icono, color }) => {
        if (!this.context) {
          return 'No hay contexto disponible';
        }
        
        this.currentToolsUsed.add('gestionar_categoria');
        
        try {
          if (id) {
            // Editar categoría existente
            const updated = await this.context.storage.updateCategory(id, {
              name: nombre,
              icon: icono,
              color: color
            });
            return updated ? `Categoría "${nombre}" actualizada exitosamente` : 'Error actualizando categoría';
          } else {
            // Crear nueva categoría
            const newCategory = await this.context.storage.createCategory({
              name: nombre,
              icon: icono || '📝',
              color: color || '#6366f1',
              teamId: this.context.team.id
            });
            return `Nueva categoría "${nombre}" creada exitosamente con ID: ${newCategory.id}`;
          }
        } catch (error) {
          return `Error gestionando categoría: ${error}`;
        }
      }
    });

    const getRulesTool = tool({
      name: 'obtener_reglas',
      description: 'Obtiene todas las reglas de categorización automática del equipo',
      parameters: z.object({}),
      execute: async () => {
        if (!this.context) {
          return 'No hay contexto disponible';
        }
        
        this.currentToolsUsed.add('obtener_reglas');
        
        try {
          const rules = await this.context.storage.getRules(this.context.team.id);
          const categories = await this.context.storage.getCategories(this.context.team.id);
          
          const rulesWithCategories = rules.map(r => {
            const category = categories.find(c => c.id === r.categoryId);
            return {
              id: r.id,
              nombre: r.name,
              campo: r.field,
              textoCoincidencia: r.matchText,
              categoria: category?.name || 'Categoría no encontrada',
              categoriaId: r.categoryId,
              activa: r.isActive
            };
          });
          
          return JSON.stringify({
            total: rulesWithCategories.length,
            reglas: rulesWithCategories
          }, null, 2);
        } catch (error) {
          return `Error obteniendo reglas: ${error}`;
        }
      }
    });

    const manageRuleTool = tool({
      name: 'gestionar_regla',
      description: 'Crea o edita una regla de categorización automática. Si se proporciona ID, edita la regla existente; si no, crea una nueva',
      parameters: z.object({
        id: z.string().nullable().optional().describe('ID de la regla a editar (opcional para crear nueva)'),
        nombre: z.string().describe('Nombre descriptivo de la regla'),
        campo: z.enum(['description', 'amount']).describe('Campo a evaluar: description o amount'),
        textoCoincidencia: z.string().describe('Texto o patrón que debe coincidir'),
        categoriaId: z.string().describe('ID de la categoría a asignar cuando coincida'),
        activa: z.boolean().nullable().optional().describe('Si la regla está activa (default: true)')
      }),
      execute: async ({ id, nombre, campo, textoCoincidencia, categoriaId, activa }) => {
        if (!this.context) {
          return 'No hay contexto disponible';
        }
        
        this.currentToolsUsed.add('gestionar_regla');
        
        try {
          // Verificar que la categoría existe
          const category = await this.context.storage.getCategory(categoriaId, this.context.team.id);
          if (!category) {
            return `Error: La categoría con ID ${categoriaId} no existe`;
          }
          
          if (id) {
            // Editar regla existente
            const updated = await this.context.storage.updateRule(id, {
              name: nombre,
              field: campo,
              matchText: textoCoincidencia,
              categoryId: categoriaId,
              isActive: activa ?? true
            });
            return updated ? `Regla "${nombre}" actualizada exitosamente` : 'Error actualizando regla';
          } else {
            // Crear nueva regla
            const newRule = await this.context.storage.createRule({
              name: nombre,
              field: campo,
              matchText: textoCoincidencia,
              categoryId: categoriaId,
              isActive: activa ?? true,
              teamId: this.context.team.id
            });
            return `Nueva regla "${nombre}" creada exitosamente con ID: ${newRule.id}`;
          }
        } catch (error) {
          return `Error gestionando regla: ${error}`;
        }
      }
    });

    const getBudgetsTool = tool({
      name: 'obtener_presupuestos',
      description: 'Obtiene todos los presupuestos del equipo con información de gastos actuales',
      parameters: z.object({}),
      execute: async () => {
        if (!this.context) {
          return 'No hay contexto disponible';
        }
        
        this.currentToolsUsed.add('obtener_presupuestos');
        
        try {
          const budgets = await this.context.storage.getBudgets(this.context.team.id);
          const categories = await this.context.storage.getCategories(this.context.team.id);
          
          // Calculate spent amounts for each budget
          const budgetsWithDetails = await Promise.all(budgets.map(async (b) => {
            const category = categories.find(c => c.id === b.categoryId);
            
            // Get transactions for this category within the budget period
            const transactions = await this.context!.storage.getTransactions(this.context!.team.id, {
              categoryId: b.categoryId,
              fromDate: b.startDate,
              toDate: b.endDate || undefined
            });
            
            const montoGastado = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
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
              porcentajeUsado: budgetAmount > 0 ? (montoGastado / budgetAmount) * 100 : 0
            };
          }));
          
          return JSON.stringify({
            total: budgetsWithDetails.length,
            presupuestos: budgetsWithDetails,
            resumen: {
              presupuestoTotal: budgetsWithDetails.reduce((sum, b) => sum + b.monto, 0),
              gastadoTotal: budgetsWithDetails.reduce((sum, b) => sum + b.montoGastado, 0)
            }
          }, null, 2);
        } catch (error) {
          return `Error obteniendo presupuestos: ${error}`;
        }
      }
    });

    const manageBudgetTool = tool({
      name: 'gestionar_presupuesto',
      description: 'Crea o edita un presupuesto. Si se proporciona ID, edita el presupuesto existente; si no, crea uno nuevo',
      parameters: z.object({
        id: z.string().nullable().optional().describe('ID del presupuesto a editar (opcional para crear nuevo)'),
        categoriaId: z.string().describe('ID de la categoría para el presupuesto'),
        monto: z.number().describe('Monto del presupuesto'),
        periodo: z.enum(['monthly', 'weekly', 'biweekly', 'custom']).describe('Período del presupuesto'),
        fechaInicio: z.string().describe('Fecha de inicio en formato YYYY-MM-DD'),
        fechaFin: z.string().describe('Fecha de fin en formato YYYY-MM-DD')
      }),
      execute: async ({ id, categoriaId, monto, periodo, fechaInicio, fechaFin }) => {
        if (!this.context) {
          return 'No hay contexto disponible';
        }
        
        this.currentToolsUsed.add('gestionar_presupuesto');
        
        try {
          // Verificar que la categoría existe
          const category = await this.context.storage.getCategory(categoriaId, this.context.team.id);
          if (!category) {
            return `Error: La categoría con ID ${categoriaId} no existe`;
          }
          
          if (id) {
            // Editar presupuesto existente
            const updated = await this.context.storage.updateBudget(id, {
              categoryId: categoriaId,
              amount: monto.toString(),
              period: periodo,
              startDate: fechaInicio,
              endDate: fechaFin
            });
            return updated ? `Presupuesto para "${category.name}" actualizado exitosamente` : 'Error actualizando presupuesto';
          } else {
            // Crear nuevo presupuesto
            const newBudget = await this.context.storage.createBudget({
              categoryId: categoriaId,
              amount: monto.toString(),
              period: periodo,
              startDate: fechaInicio,
              endDate: fechaFin,
              teamId: this.context.team.id
            });
            return `Nuevo presupuesto para "${category.name}" creado exitosamente con ID: ${newBudget.id}`;
          }
        } catch (error) {
          return `Error gestionando presupuesto: ${error}`;
        }
      }
    });

    const createTransactionsTool = tool({
      name: 'crear_transacciones',
      description: 'Crea una o múltiples transacciones financieras para el equipo. IMPORTANTE: El campo "banco" debe ser uno de los bancos configurados por el usuario en sus preferencias. Usa /api/banks para obtener opciones actuales.',
      parameters: z.object({
        transacciones: z.array(z.object({
          descripcion: z.string().describe('Descripción de la transacción'),
          monto: z.number().describe('Monto de la transacción (positivo para ingresos, negativo para gastos)'),
          fecha: z.string().describe('Fecha de la transacción en formato YYYY-MM-DD'),
          categoriaId: z.string().describe('ID de la categoría para la transacción'),
          banco: z.string().nullable().optional().describe('Nombre del banco. Debe ser una opción válida de preferencias del usuario'),
          estado: z.enum(['active', 'deleted', 'pending']).nullable().optional().describe('Estado de la transacción (default: active)')
        })).describe('Array de transacciones a crear')
      }),
      execute: async ({ transacciones }) => {
        if (!this.context) {
          return 'No hay contexto disponible';
        }
        
        this.currentToolsUsed.add('crear_transacciones');
        
        try {
          const categories = await this.context.storage.getCategories(this.context.team.id);
          // Obtener bancos disponibles desde preferencias del usuario
          const userBanks = Array.isArray((this.context.user as any).preferences?.banks)
            ? (this.context.user as any).preferences.banks as string[]
            : ['Banregio', 'BBVA'];
          const createdTransactions = [];
          const errors = [];
          
          for (let index = 0; index < transacciones.length; index++) {
            const transaccion = transacciones[index];
            try {
              // Validar que la categoría existe
              const category = categories.find(c => c.id === transaccion.categoriaId);
              if (!category) {
                errors.push(`Transacción ${index + 1}: La categoría con ID ${transaccion.categoriaId} no existe`);
                continue;
              }

              // Validar banco
              const selectedBank = transaccion.banco || userBanks[0] || 'Banregio';
              if (!userBanks.includes(selectedBank)) {
                errors.push(`Transacción ${index + 1}: El banco "${selectedBank}" no es válido. Opciones disponibles: ${userBanks.join(', ')}`);
                continue;
              }
              
              // Crear la transacción
              const newTransaction = await this.context.storage.createTransaction({
                description: transaccion.descripcion,
                amount: transaccion.monto.toString(),
                date: transaccion.fecha,
                categoryId: transaccion.categoriaId,
                bank: selectedBank,
                status: transaccion.estado || 'active',
                teamId: this.context.team.id,
                userId: this.context.user.id
              });
              
              createdTransactions.push({
                id: newTransaction.id,
                descripcion: transaccion.descripcion,
                monto: transaccion.monto,
                fecha: transaccion.fecha,
                categoria: category.name,
                banco: selectedBank,
                estado: transaccion.estado || 'active'
              });
            } catch (error) {
              errors.push(`Transacción ${index + 1} ("${transaccion.descripcion}"): ${error}`);
            }
          }
          
          let result = '';
          
          if (createdTransactions.length > 0) {
            result += `✅ ${createdTransactions.length} transacciones creadas exitosamente:\n`;
            createdTransactions.forEach((t, i) => {
              const tipoTransaccion = t.monto >= 0 ? 'Ingreso' : 'Gasto';
              result += `${i + 1}. ${tipoTransaccion}: "${t.descripcion}" - $${Math.abs(t.monto)} (${t.categoria}) - ${t.fecha}\n`;
            });
          }
          
          if (errors.length > 0) {
            result += `\n❌ ${errors.length} errores encontrados:\n`;
            errors.forEach((error, i) => {
              result += `${i + 1}. ${error}\n`;
            });
          }
          
          if (createdTransactions.length === 0 && errors.length === 0) {
            result = 'No se proporcionaron transacciones válidas para crear';
          }
          
          return result;
        } catch (error) {
          return `Error creando transacciones: ${error}`;
        }
      }
    });


    this.agent = new Agent({
      name: 'Asistente Financiero',
      model: 'gpt-4.1',
      instructions: `Eres un asistente financiero experto para una aplicación de seguimiento de finanzas familiares.
      
      ⏰ CONTEXTO TEMPORAL:
      Considera siempre la fecha actual y las horas de los mensajes para interpretar correctamente referencias temporales como "el próximo lunes", "la semana pasada", "ayer", "mañana", etc. La información de fechas y horas se proporcionará en el contexto del equipo.
      
      CAPACIDADES PRINCIPALES:
      Puedes consultar y gestionar todos los aspectos financieros del equipo familiar:
      
      📊 TRANSACCIONES:
      - Consultar transacciones con filtros por fecha, categoría, búsqueda de texto
      - Crear nuevas transacciones individuales o en lote
      - Analizar patrones de gasto y tendencias
      - Proporcionar insights sobre gastos específicos
      
      🏷️ CATEGORÍAS:
      - Ver todas las categorías disponibles
      - Crear nuevas categorías con iconos y colores personalizados
      - Editar categorías existentes
      
      ⚙️ REGLAS DE CATEGORIZACIÓN:
      - Consultar reglas automatizadas existentes
      - Crear nuevas reglas para categorización automática
      - Editar reglas existentes para mejorar la precisión
      
      💰 PRESUPUESTOS:
      - Ver todos los presupuestos con estado actual de gastos
      - Crear nuevos presupuestos para categorías específicas
      - Editar presupuestos existentes
      - Analizar cumplimiento de presupuestos
      
      HERRAMIENTAS DISPONIBLES:
      - obtener_transacciones: Consulta transacciones con filtros avanzados
      - crear_transacciones: Crea una o múltiples transacciones financieras
      - obtener_categorias: Ve todas las categorías del equipo
      - gestionar_categoria: Crea o edita categorías
      - obtener_reglas: Ve reglas de categorización automática
      - gestionar_regla: Crea o edita reglas de categorización
      - obtener_presupuestos: Ve presupuestos con estado actual
      - gestionar_presupuesto: Crea o edita presupuestos
      
      INSTRUCCIONES PARA REGISTRAR TRANSACCIONES:
      1. Usa la herramienta OBTENER_CATEGORIAS para entender las categorías disponibles.
      2. Usa la herramienta de OBTENER_REGLAS para entender las reglas de categorización que se tienen disponibles
      3. Antes de registrar las transacciones muestra al usuario una tabla en formato markdown con la forma en como vas a clasificar las transacciones
      4. Al terminas de registrar las transacciones, sugiere al usuario nuevas reglas para categorizar las transacciones
      5. Solo si el usuario lo aprueba, usa la herramienta de CREAR_REGLAS para crear las reglas

      BANCOS DISPONIBLES (desde preferencias del usuario): ${'${Array.isArray(context.user.preferences?.banks) ? context.user.preferences.banks.join(", ") : "Banregio, BBVA"}'}
      - Al crear transacciones, añade el campo "banco" usando una de las opciones disponibles.
      - Si el usuario no especifica banco, usa el primer banco disponible.
      
      MANEJO DE FECHAS:
      - Usa la fecha actual ("today") y las horas de mensajes para interpretar referencias temporales relativas
      - Cuando el usuario mencione fechas relativas como "el próximo lunes", "ayer", "la semana pasada", calcula las fechas exactas basándote en la información temporal proporcionada
      - No dependas de tu fecha de entrenamiento, usa siempre la información temporal del contexto
      
      Cuando el usuario haga preguntas sobre transacciones, categorías, reglas o presupuestos, usa las herramientas correspondientes para obtener información actualizada y precisa.`,
      tools: [
        getTransactionsTool,
        createTransactionsTool,
        getCategoriesTool,
        manageCategoryTool,
        getRulesTool,
        manageRuleTool,
        getBudgetsTool,
        manageBudgetTool
      ]
    });
  }

  async chat(message: string, context: AgentContext, conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [], images?: string[]): Promise<{ response: string; toolsUsed: string[] }> {
    try {
      this.context = context; // Set context for tools to use
      this.currentToolsUsed.clear(); // Reset tools tracking
      
      const contextPrompt = this.buildContextPrompt(context);
      
      // Build the conversation context for the agent
      // For OpenAI Agents, we need to pass the conversation as a single string with context
      let fullConversation = contextPrompt + '\n\n';
      
      // Add conversation history
      if (conversationHistory.length > 0) {
        fullConversation += 'HISTORIAL DE CONVERSACIÓN:\n';
        conversationHistory.forEach(msg => {
          const roleLabel = msg.role === 'user' ? 'Usuario' : 'Asistente';
          fullConversation += `${roleLabel}: ${msg.content}\n\n`;
        });
        fullConversation += 'MENSAJE ACTUAL:\n';
      }
      
      fullConversation += `Usuario: ${message}`;
      
      // If images are provided, analyze them first and include context
      if (images && images.length > 0) {
        const imageAnalysis = await this.analyzeImages(images);
        if (imageAnalysis) {
          fullConversation += `\n\nAnálisis de imágenes adjuntas: ${imageAnalysis}`;
        }
      }
      
      const result = await run(this.agent, fullConversation);
      
      return {
        response: result.finalOutput || 'Lo siento, pero no pude procesar tu solicitud en este momento.',
        toolsUsed: Array.from(this.currentToolsUsed)
      };
    } catch (error) {
      console.error('Error del Agente AI:', error);
      return {
        response: 'Lo siento, pero encontré un error al procesar tu solicitud. Por favor, inténtalo de nuevo.',
        toolsUsed: Array.from(this.currentToolsUsed)
      };
    }
  }

  // Métodos legacy para compatibilidad hacia atrás - pueden ser removidos gradualmente
  async analyzeFile(fileContent: string, filename: string, context: AgentContext): Promise<string> {
    try {
      this.context = context;
      const categories = await context.storage.getCategories(context.team.id);
      const categoriesContext = categories.map(cat => `${cat.name} (${cat.id})`).join(', ');
      
      const analysisPrompt = `Analiza este contenido de archivo financiero y proporciona un análisis conversacional útil:

Archivo: ${filename}
Contenido: ${fileContent}

Categorías disponibles para este equipo: ${categoriesContext}

Como asistente financiero, analiza este archivo y proporciona:
1. Un resumen de lo que contiene el archivo
2. Extrae las transacciones más importantes que encuentres
3. Sugiere categorías apropiadas para las transacciones
4. Identifica patrones de gasto interesantes
5. Ofrece recomendaciones o insights útiles

Responde de manera conversacional y amigable, como si fueras un asesor financiero personal explicando a un cliente lo que encontraste en su archivo.`;

      const result = await run(this.agent, analysisPrompt);
      
      return result.finalOutput || 'He recibido el archivo pero no pude analizarlo completamente. ¿Podrías describir qué tipo de información contiene para poder ayudarte mejor?';
    } catch (error) {
      console.error('Error de análisis de archivo:', error);
      return 'Hubo un error al analizar el archivo. ¿Podrías intentar subirlo nuevamente o describir qué tipo de información contiene?';
    }
  }

  async suggestCategories(transactions: Transaction[], existingCategories: Category[]): Promise<Array<{
    transactionId: string;
    suggestedCategory: string;
    confidence: number;
    reason: string;
  }>> {
    try {
      const categoriesContext = existingCategories.map(cat => 
        `${cat.name} - ${cat.id}`
      ).join(', ');
      
      const transactionsContext = transactions.map(t => 
        `ID: ${t.id}, Monto: ${t.amount}, Descripción: ${t.description}, Fecha: ${t.date}`
      ).join('\n');

      const prompt = `Analiza estas transacciones y sugiere mejores categorías:

Categorías Disponibles: ${categoriesContext}

Transacciones:
${transactionsContext}

Retorna array JSON con sugerencias:
[
  {
    "transactionId": "uuid",
    "suggestedCategory": "nombre de categoría",
    "confidence": 0.0-1.0,
    "reason": "explicación breve"
  }
]`;

      const result = await run(this.agent, prompt);
      
      try {
        return JSON.parse(result.finalOutput || '[]');
      } catch {
        return [];
      }
    } catch (error) {
      console.error('Error de sugerencia de categorías:', error);
      return [];
    }
  }

  async createRules(transactions: Transaction[], categories: Category[]): Promise<Array<{
    name: string;
    field: 'description' | 'amount';
    matchText: string;
    categoryId: string;
    reason: string;
  }>> {
    try {
      const categoriesContext = categories.map(cat => 
        `${cat.name} - ${cat.id}`
      ).join(', ');
      
      const transactionsContext = transactions.slice(0, 50).map(t => 
        `Monto: ${t.amount}, Descripción: ${t.description}, Categoría: ${t.categoryId}`
      ).join('\n');

      const prompt = `Analiza estos patrones de transacciones y sugiere reglas de categorización automatizadas:

Categorías Disponibles: ${categoriesContext}

Transacciones Recientes:
${transactionsContext}

Crea reglas que categorizarían automáticamente transacciones similares futuras.
Retorna array JSON:
[
  {
    "name": "nombre de regla",
    "field": "description" o "amount",
    "matchText": "texto a coincidir",
    "categoryId": "uuid",
    "reason": "por qué esta regla tiene sentido"
  }
]

Enfócate en patrones claros como nombres de comercios, tipos de transacciones, o rangos de montos.`;

      const result = await run(this.agent, prompt);
      
      try {
        return JSON.parse(result.finalOutput || '[]');
      } catch {
        return [];
      }
    } catch (error) {
      console.error('Error de creación de reglas:', error);
      return [];
    }
  }

  private buildContextPrompt(context: AgentContext): string {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentTime = now.toLocaleTimeString('es-ES', { 
      timeZone: 'America/Mexico_City',
      hour12: false 
    });
    const currentDateTime = now.toLocaleString('es-ES', {
      timeZone: 'America/Mexico_City',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `CONTEXTO DEL EQUIPO FINANCIERO:
    
🏥 Equipo: ${context.team.name}
👤 Usuario Actual: ${context.user.name}
🏢 ID del Equipo: ${context.team.id}
👑 Rol del Usuario: ${context.user.role}

⏰ INFORMACIÓN TEMPORAL:
📅 Fecha actual (today): ${currentDate}
🕐 Hora actual: ${currentTime}
📆 Fecha y hora completa: ${currentDateTime}

📋 INSTRUCCIONES IMPORTANTES:
- Tienes acceso completo a todas las herramientas de gestión financiera
- Usa las herramientas proactivamente para obtener información actualizada
- Todos los datos están limitados al contexto de este equipo familiar
- Proporciona análisis prácticos y accionables
- Confirma siempre los cambios realizados
- Si recibes imágenes, analízalas en detalle para extraer información financiera
- Usa la información temporal para interpretar fechas relativas correctamente

¡Usa las herramientas disponibles para responder con datos precisos y actualizados!`;
  }

  async analyzeImages(imagePaths: string[]): Promise<string | null> {
    try {
      const imageAnalyses: string[] = [];
      
      for (const imagePath of imagePaths) {
        // Read image file as base64
        const imageBuffer = await readFile(imagePath);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = imagePath.endsWith('.png') ? 'image/png' : 
                        imagePath.endsWith('.gif') ? 'image/gif' :
                        imagePath.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

        // Use vision API to analyze the image
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analiza esta imagen financiera. Identifica y extrae: transacciones, recibos, facturas, estados de cuenta, presupuestos, o cualquier información financiera relevante. Proporciona detalles específicos como montos, fechas, comercios, categorías posibles, y cualquier dato financiero que puedas identificar.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`
                  }
                }
              ]
            }
          ]
        });

        const analysis = response.choices[0]?.message?.content;
        if (analysis) {
          imageAnalyses.push(`Imagen ${imagePaths.indexOf(imagePath) + 1}: ${analysis}`);
        }
      }
      
      return imageAnalyses.length > 0 ? imageAnalyses.join('\n\n') : null;
    } catch (error) {
      console.error('Error analyzing images:', error);
      return null;
    }
  }

  async analyzeImageWithFile(imagePath: string, message: string, context: AgentContext): Promise<string> {
    try {
      this.context = context;
      
      // Read image file as base64
      const imageBuffer = await readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = imagePath.endsWith('.png') ? 'image/png' : 
                      imagePath.endsWith('.gif') ? 'image/gif' :
                      imagePath.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

      // Get categories for context
      const categories = await context.storage.getCategories(context.team.id);
      const categoriesContext = categories.map(cat => `${cat.name} (${cat.id})`).join(', ');

      // Use vision API to analyze the image with context
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analiza esta imagen financiera. El usuario dice: "${message}"

Categorías disponibles para este equipo: ${categoriesContext}

Como asistente financiero, analiza esta imagen y:
1. Identifica qué tipo de documento financiero es (recibo, factura, estado de cuenta, etc.)
2. Extrae todas las transacciones, montos, fechas y detalles relevantes
3. Sugiere categorías apropiadas para las transacciones encontradas
4. Proporciona un análisis útil y recomendaciones
5. Si es apropiado, sugiere crear las transacciones automáticamente

Responde de manera conversacional y práctica.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ]
      });

      const analysis = response.choices[0]?.message?.content;
      
      return analysis || 'He recibido la imagen pero no pude analizarla completamente. ¿Podrías describir qué tipo de información financiera contiene para poder ayudarte mejor?';
    } catch (error) {
      console.error('Error analyzing image with file:', error);
      return 'Hubo un error al analizar la imagen. ¿Podrías intentar subirla nuevamente o describir qué tipo de información contiene?';
    }
  }
}

export const financeAgent = new FinanceAgent();