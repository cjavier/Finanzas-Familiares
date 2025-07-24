import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';
import type { User, Team, Category, Transaction, Conversation, InsertConversation } from '../shared/schema';

interface AgentContext {
  user: User;
  team: Team;
  categories: Category[];
  recentTransactions: Transaction[];
}

class FinanceAgent {
  private agent: Agent;
  private context: AgentContext | null = null;

  constructor() {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required for AI agent functionality');
    }

    // Define function tools
    const analyzeFileTool = tool({
      name: 'analizar_archivo_financiero',
      description: 'Analiza documentos financieros subidos (PDF, CSV, Excel) para extraer datos de transacciones y sugerir categorías',
      parameters: z.object({
        contenidoArchivo: z.string().describe('El contenido del archivo financiero a analizar'),
        nombreArchivo: z.string().describe('El nombre del archivo que se está analizando')
      }),
      execute: async ({ contenidoArchivo, nombreArchivo }) => {
        if (!this.context) {
          return 'No hay contexto disponible para el análisis del archivo';
        }
        
        const categoriasContexto = this.context.categories.map(cat => `${cat.name} (${cat.id})`).join(', ');
        
        return `Análisis de ${nombreArchivo}:
Categorías disponibles: ${categoriasContexto}
Contenido del archivo: ${contenidoArchivo.substring(0, 1000)}...

Por favor extrae las transacciones y sugiere las categorías apropiadas de las opciones disponibles.`;
      }
    });

    const suggestCategoriesTool = tool({
      name: 'sugerir_categorias_transacciones',
      description: 'Analiza transacciones y sugiere mejores asignaciones de categorías basadas en patrones de gasto',
      parameters: z.object({
        idsTransacciones: z.array(z.string()).describe('Array de IDs de transacciones a analizar')
      }),
      execute: async ({ idsTransacciones }) => {
        if (!this.context) {
          return 'No hay contexto disponible para sugerencias de categorías';
        }
        
        const categoriasContexto = this.context.categories.map(cat => `${cat.name} - ${cat.id}`).join(', ');
        const transacciones = this.context.recentTransactions.filter(t => idsTransacciones.includes(t.id));
        
        return `Analizando ${transacciones.length} transacciones para mejor categorización:
Categorías disponibles: ${categoriasContexto}
Transacciones a analizar: ${transacciones.map(t => `${t.description} ($${t.amount})`).join(', ')}`;
      }
    });

    const createRulesTool = tool({
      name: 'crear_reglas_categorizacion',
      description: 'Crea reglas automatizadas para categorizar transacciones futuras basadas en patrones',
      parameters: z.object({
        tipoRegla: z.enum(['descripcion', 'monto']).describe('Tipo de regla a crear'),
        patron: z.string().describe('Patrón a coincidir para categorización automática')
      }),
      execute: async ({ tipoRegla, patron }) => {
        if (!this.context) {
          return 'No hay contexto disponible para la creación de reglas';
        }
        
        const categoriasContexto = this.context.categories.map(cat => `${cat.name} - ${cat.id}`).join(', ');
        
        return `Creando regla de categorización basada en ${tipoRegla}:
Patrón: ${patron}
Categorías disponibles: ${categoriasContexto}
Esta regla categorizará automáticamente las transacciones futuras que coincidan con el patrón especificado.`;
      }
    });

    const getFinancialInsightsTool = tool({
      name: 'obtener_insights_financieros',
      description: 'Proporciona análisis e insights sobre los patrones de gasto y finanzas del usuario',
      parameters: z.object({
        tipoAnalisis: z.enum(['gastos', 'presupuesto', 'tendencias', 'categorias']).describe('Tipo de análisis a realizar')
      }),
      execute: async ({ tipoAnalisis }) => {
        if (!this.context) {
          return 'No hay contexto disponible para el análisis financiero';
        }
        
        const totalGastos = this.context.recentTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const categorias = this.context.categories.map(c => c.name).join(', ');
        
        return `Análisis financiero - ${tipoAnalisis}:
Total de transacciones recientes: ${this.context.recentTransactions.length}
Total de gastos recientes: $${totalGastos.toFixed(2)}
Categorías disponibles: ${categorias}
Equipo: ${this.context.team.name}
Usuario: ${this.context.user.name}`;
      }
    });

    this.agent = new Agent({
      name: 'Asistente Financiero',
      instructions: `Eres un asistente financiero útil para una aplicación de seguimiento de finanzas familiares. 
      
      Tienes acceso a los datos financieros del usuario incluyendo:
      - Categorías para organizar gastos
      - Historial de transacciones y gastos
      - Información de presupuestos
      - Miembros del equipo y configuraciones
      
      Tu rol es:
      1. Ayudar a los usuarios a entender sus patrones de gasto
      2. Proporcionar insights sobre presupuestos y metas financieras
      3. Sugerir categorizaciones para transacciones
      4. Ayudar a analizar documentos financieros subidos
      5. Crear reglas automatizadas para categorización de transacciones
      6. Responder preguntas sobre sus datos financieros
      
      Tienes acceso a herramientas especializadas:
      - analizar_archivo_financiero: Úsala cuando los usuarios suban documentos financieros
      - sugerir_categorias_transacciones: Úsala cuando los usuarios quieran mejores sugerencias de categorías
      - crear_reglas_categorizacion: Úsala cuando los usuarios quieran automatizar la categorización
      - obtener_insights_financieros: Úsala para proporcionar análisis financieros detallados
      
      Siempre sé útil, preciso y enfocado en consejos financieros prácticos. 
      Usa el contexto proporcionado sobre su situación financiera actual para dar respuestas personalizadas.
      Mantén las respuestas concisas pero informativas.
      Responde siempre en español.`,
      tools: [analyzeFileTool, suggestCategoriesTool, createRulesTool, getFinancialInsightsTool]
    });
  }

  async chat(message: string, context: AgentContext): Promise<string> {
    try {
      this.context = context; // Set context for tools to use
      const contextPrompt = this.buildContextPrompt(context);
      const fullMessage = `${contextPrompt}\n\nMensaje del usuario: ${message}`;
      
      const result = await run(this.agent, fullMessage);
      return result.finalOutput || 'Lo siento, pero no pude procesar tu solicitud en este momento.';
    } catch (error) {
      console.error('Error del Agente AI:', error);
      return 'Lo siento, pero encontré un error al procesar tu solicitud. Por favor, inténtalo de nuevo.';
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
      const categoriesContext = context.categories.map(cat => `${cat.name} (${cat.id})`).join(', ');
      
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
    const totalTransactions = context.recentTransactions.length;
    const totalSpent = context.recentTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const categoryNames = context.categories.map(c => c.name).join(', ');
    
    return `Contexto sobre la situación financiera del usuario:
    
Equipo: ${context.team.name}
Usuario: ${context.user.name}
Categorías Disponibles: ${categoryNames}
Transacciones Recientes: ${totalTransactions} transacciones
Total de Gastos Recientes: $${totalSpent.toFixed(2)}

Este contexto debe informar tus respuestas sobre su situación financiera.`;
  }
}

export const financeAgent = new FinanceAgent();