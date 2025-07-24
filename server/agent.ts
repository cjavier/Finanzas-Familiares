import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';
import type { User, Team, Category, Transaction, Budget, Rule, InsertCategory, InsertBudget, InsertRule } from '../shared/schema';
import type { IStorage } from './storage';

interface AgentContext {
  user: User;
  team: Team;
  storage: IStorage;
}

class FinanceAgent {
  private agent: Agent;
  private context: AgentContext | null = null;
  private currentToolsUsed: Set<string> = new Set();

  constructor() {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required for AI agent functionality');
    }

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


    this.agent = new Agent({
      name: 'Asistente Financiero',
      instructions: `Eres un asistente financiero experto para una aplicación de seguimiento de finanzas familiares.
      
      IMPORTANTE: Tienes acceso al historial completo de la conversación cuando se proporciona. Utiliza este contexto para:
      - Recordar información previa discutida
      - Mantener continuidad en las recomendaciones
      - Hacer referencia a datos previamente consultados
      - Evitar repetir consultas innecesarias de herramientas
      
      CAPACIDADES PRINCIPALES:
      Puedes consultar y gestionar todos los aspectos financieros del equipo familiar:
      
      📊 TRANSACCIONES:
      - Consultar transacciones con filtros por fecha, categoría, búsqueda de texto
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
      - obtener_categorias: Ve todas las categorías del equipo
      - gestionar_categoria: Crea o edita categorías
      - obtener_reglas: Ve reglas de categorización automática
      - gestionar_regla: Crea o edita reglas de categorización
      - obtener_presupuestos: Ve presupuestos con estado actual
      - gestionar_presupuesto: Crea o edita presupuestos
      
      INSTRUCCIONES DE USO:
      1. Usa las herramientas proactivamente para responder preguntas específicas
      2. Al gestionar datos, siempre confirma los cambios realizados
      3. Proporciona análisis útiles basados en los datos reales del usuario
      4. Sugiere mejoras y optimizaciones financieras
      5. Mantén respuestas concisas pero informativas
      6. Siempre responde en español
      
      Cuando el usuario haga preguntas sobre transacciones, categorías, reglas o presupuestos, usa las herramientas correspondientes para obtener información actualizada y precisa.`,
      tools: [
        getTransactionsTool,
        getCategoriesTool,
        manageCategoryTool,
        getRulesTool,
        manageRuleTool,
        getBudgetsTool,
        manageBudgetTool
      ]
    });
  }

  async chat(message: string, context: AgentContext, conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []): Promise<{ response: string; toolsUsed: string[] }> {
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
  async analyzeFile(fileContent: string, filename: string, context: AgentContext): Promise<{
    transactions: Array<{
      amount: number;
      description: string;
      date: string;
      suggestedCategory?: string;
      confidence?: number;
    }>;
    insights: string;
  }> {
    try {
      this.context = context;
      const categories = await context.storage.getCategories(context.team.id);
      const categoriesContext = categories.map(cat => `${cat.name} (${cat.id})`).join(', ');
      
      const analysisPrompt = `Analiza este contenido de archivo financiero y extrae datos de transacciones:

Archivo: ${filename}
Contenido: ${fileContent}

Categorías disponibles: ${categoriesContext}

Por favor extrae transacciones y sugiere categorías. Retorna una respuesta JSON con:
{
  "transactions": [
    {
      "amount": number,
      "description": "string",  
      "date": "YYYY-MM-DD",
      "suggestedCategory": "nombre de categoría",
      "confidence": 0.0-1.0
    }
  ],
  "insights": "Análisis breve de patrones de gasto encontrados"
}`;

      const result = await run(this.agent, analysisPrompt);
      
      try {
        return JSON.parse(result.finalOutput || '{"transactions": [], "insights": "No se pudo analizar el archivo"}');
      } catch {
        return {
          transactions: [],
          insights: result.finalOutput || 'No se pudo analizar el contenido del archivo'
        };
      }
    } catch (error) {
      console.error('Error de análisis de archivo:', error);
      return {
        transactions: [],
        insights: 'Error analizando el contenido del archivo'
      };
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
    return `CONTEXTO DEL EQUIPO FINANCIERO:
    
🏥 Equipo: ${context.team.name}
👤 Usuario Actual: ${context.user.name}
🏢 ID del Equipo: ${context.team.id}
👑 Rol del Usuario: ${context.user.role}

📋 INSTRUCCIONES IMPORTANTES:
- Tienes acceso completo a todas las herramientas de gestión financiera
- Usa las herramientas proactivamente para obtener información actualizada
- Todos los datos están limitados al contexto de este equipo familiar
- Proporciona análisis prácticos y accionables
- Confirma siempre los cambios realizados

¡Usa las herramientas disponibles para responder con datos precisos y actualizados!`;
  }
}

export const financeAgent = new FinanceAgent();