import { Agent, run } from '@openai/agents';
import type { User, Team, Category, Transaction, Conversation, InsertConversation } from '../shared/schema';

interface AgentContext {
  user: User;
  team: Team;
  categories: Category[];
  recentTransactions: Transaction[];
}

class FinanceAgent {
  private agent: Agent;

  constructor() {
    this.agent = new Agent({
      name: 'Finance Assistant',
      instructions: `You are a helpful financial assistant for a family finance tracker application. 
      
      You have access to the user's financial data including:
      - Categories for organizing expenses
      - Transactions and spending history
      - Budget information
      - Team members and settings
      
      Your role is to:
      1. Help users understand their spending patterns
      2. Provide insights on budgets and financial goals
      3. Suggest categorizations for transactions
      4. Help analyze uploaded financial documents
      5. Create automated rules for transaction categorization
      6. Answer questions about their financial data
      
      Always be helpful, accurate, and focused on practical financial advice. 
      Use the context provided about their current financial situation to give personalized responses.
      Keep responses concise but informative.`,
    });
  }

  async chat(message: string, context: AgentContext): Promise<string> {
    try {
      const contextPrompt = this.buildContextPrompt(context);
      const fullMessage = `${contextPrompt}\n\nUser message: ${message}`;
      
      const result = await run(this.agent, fullMessage);
      return result.finalOutput || 'I apologize, but I was unable to process your request at this time.';
    } catch (error) {
      console.error('AI Agent error:', error);
      return 'I apologize, but I encountered an error while processing your request. Please try again.';
    }
  }

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
      
      const analysisPrompt = `Analyze this financial file content and extract transaction data:

File: ${filename}
Content: ${fileContent}

Available categories: ${categoriesContext}

Please extract transactions and suggest categories. Return a JSON response with:
{
  "transactions": [
    {
      "amount": number,
      "description": "string",  
      "date": "YYYY-MM-DD",
      "suggestedCategory": "category name",
      "confidence": 0.0-1.0
    }
  ],
  "insights": "Brief analysis of spending patterns found"
}`;

      const result = await run(this.agent, analysisPrompt);
      
      try {
        return JSON.parse(result.finalOutput || '{"transactions": [], "insights": "Unable to analyze file"}');
      } catch {
        return {
          transactions: [],
          insights: result.finalOutput || 'Unable to analyze file content'
        };
      }
    } catch (error) {
      console.error('File analysis error:', error);
      return {
        transactions: [],
        insights: 'Error analyzing file content'
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
        `ID: ${t.id}, Amount: ${t.amount}, Description: ${t.description}, Date: ${t.date}`
      ).join('\n');

      const prompt = `Analyze these transactions and suggest better categories:

Available Categories: ${categoriesContext}

Transactions:
${transactionsContext}

Return JSON array with suggestions:
[
  {
    "transactionId": "uuid",
    "suggestedCategory": "category name",
    "confidence": 0.0-1.0,
    "reason": "brief explanation"
  }
]`;

      const result = await run(this.agent, prompt);
      
      try {
        return JSON.parse(result.finalOutput || '[]');
      } catch {
        return [];
      }
    } catch (error) {
      console.error('Category suggestion error:', error);
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
        `Amount: ${t.amount}, Description: ${t.description}, Category: ${t.categoryId}`
      ).join('\n');

      const prompt = `Analyze these transaction patterns and suggest automated categorization rules:

Available Categories: ${categoriesContext}

Recent Transactions:
${transactionsContext}

Create rules that would automatically categorize similar future transactions.
Return JSON array:
[
  {
    "name": "rule name",
    "field": "description" or "amount",
    "matchText": "text to match",
    "categoryId": "uuid",
    "reason": "why this rule makes sense"
  }
]

Focus on clear patterns like merchant names, transaction types, or amount ranges.`;

      const result = await run(this.agent, prompt);
      
      try {
        return JSON.parse(result.finalOutput || '[]');
      } catch {
        return [];
      }
    } catch (error) {
      console.error('Rule creation error:', error);
      return [];
    }
  }

  private buildContextPrompt(context: AgentContext): string {
    const totalTransactions = context.recentTransactions.length;
    const totalSpent = context.recentTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const categoryNames = context.categories.map(c => c.name).join(', ');
    
    return `Context about the user's financial situation:
    
Team: ${context.team.name}
User: ${context.user.name}
Available Categories: ${categoryNames}
Recent Transactions: ${totalTransactions} transactions
Total Recent Spending: $${totalSpent.toFixed(2)}

This context should inform your responses about their financial situation.`;
  }
}

export const financeAgent = new FinanceAgent();