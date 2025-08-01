import { 
  users, teams, transactions, categories, budgets, files, rules, notifications, transactionAuditLog, chatSessions, conversations,
  type User, type InsertUser, type Team, type Transaction, type InsertTransaction,
  type Category, type InsertCategory, type Budget, type InsertBudget,
  type File, type InsertFile, type Rule, type InsertRule,
  type Notification, type InsertNotification, type TransactionAuditLog, type InsertTransactionAuditLog,
  type ChatSession, type InsertChatSession, type Conversation, type InsertConversation
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, isNull, or, sum, sql, like } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { randomBytes } from "crypto";
import { randomUUID } from "crypto";
import { createDefaultCategories } from "./seed-data";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  getTeamMembers(teamId: string): Promise<User[]>;
  updateUserRole(userId: string, teamId: string, role: "admin" | "member"): Promise<User | undefined>;
  removeUserFromTeam(userId: string, teamId: string): Promise<boolean>;
  
  // Team methods
  getTeam(id: string): Promise<Team | undefined>;
  getTeamByInviteCode(inviteCode: string): Promise<Team | undefined>;
  createTeam(name: string): Promise<Team>;
  updateTeam(id: string, team: Partial<Team>): Promise<Team | undefined>;
  regenerateInviteCode(teamId: string): Promise<Team | undefined>;
  
  // Category methods
  getCategories(teamId: string): Promise<Category[]>;
  getCategory(id: string, teamId: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory & { teamId: string }): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string, teamId: string): Promise<boolean>;
  
  // Budget methods
  getBudgets(teamId: string): Promise<Budget[]>;
  getBudget(id: string, teamId: string): Promise<Budget | undefined>;
  createBudget(budget: InsertBudget & { teamId: string }): Promise<Budget>;
  updateBudget(id: string, budget: Partial<InsertBudget>): Promise<Budget | undefined>;
  deleteBudget(id: string, teamId: string): Promise<boolean>;
  getBudgetAnalytics(teamId: string, month?: number, year?: number): Promise<any[]>;
  
  // Transaction methods
  getTransactions(teamId: string, filters?: { categoryId?: string; fromDate?: string; toDate?: string; status?: string; search?: string; page?: number; limit?: number }): Promise<Transaction[]>;
  getTransaction(id: string, teamId: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction & { teamId: string; userId: string }): Promise<Transaction>;
  updateTransaction(id: string, transaction: Partial<InsertTransaction>, userId?: string): Promise<Transaction | undefined>;
  deleteTransaction(id: string, teamId: string, userId?: string): Promise<boolean>;
  
  // File methods
  getFiles(teamId: string): Promise<File[]>;
  getFile(id: string, teamId: string): Promise<File | undefined>;
  createFile(file: InsertFile & { teamId: string; userId: string }): Promise<File>;
  updateFile(id: string, file: Partial<InsertFile>): Promise<File | undefined>;
  deleteFile(id: string, teamId: string): Promise<boolean>;
  
  // Rule methods
  getRules(teamId: string): Promise<Rule[]>;
  getRule(id: string, teamId: string): Promise<Rule | undefined>;
  createRule(rule: InsertRule & { teamId: string }): Promise<Rule>;
  updateRule(id: string, rule: Partial<InsertRule>): Promise<Rule | undefined>;
  deleteRule(id: string, teamId: string): Promise<boolean>;
  applyRulesToTransactions(teamId: string, userId: string): Promise<{ categorizedCount: number; totalProcessed: number; details: any[] }>;
  
  // Notification methods
  getNotifications(teamId: string, userId?: string): Promise<Notification[]>;
  getNotification(id: string, teamId: string): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string, teamId: string): Promise<boolean>;
  deleteNotification(id: string, teamId: string): Promise<boolean>;
  
  // Audit log methods
  getTransactionAuditLog(transactionId: string): Promise<TransactionAuditLog[]>;
  createAuditLog(auditLog: InsertTransactionAuditLog): Promise<TransactionAuditLog>;
  
  // Chat session methods
  getChatSessions(teamId: string, userId: string): Promise<ChatSession[]>;
  createChatSession(chatSession: InsertChatSession & { teamId: string; userId: string }): Promise<ChatSession>;
  updateChatSession(sessionId: string, title: string): Promise<ChatSession>;
  deleteChatSession(sessionId: string): Promise<void>;
  
  // Conversation methods
  getConversations(sessionId: string, limit?: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation & { sessionId: string; teamId: string; userId: string }): Promise<Conversation>;
  
  // Notification helpers
  createTeamActivityNotification(teamId: string, activityType: string, details: { [key: string]: any }): Promise<void>;
  
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser & { passwordHash: string }): Promise<User> {
    const { teamName, inviteCode, password, passwordHash, ...userData } = insertUser;
    
    let team: Team | undefined;
    
    if (inviteCode) {
      // Join existing team using invite code
      team = await this.getTeamByInviteCode(inviteCode);
      if (!team) {
        throw new Error("Invalid invite code");
      }
      userData.role = "member"; // Invited users are members by default
    } else if (teamName) {
      // Create new team
      team = await this.createTeam(teamName);
      userData.role = "admin"; // Team creator becomes admin
    } else {
      throw new Error("Either team name or invite code is required");
    }

    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        teamId: team.id,
        passwordHash: passwordHash || password, // Handle both password and passwordHash
      })
      .returning();
    
    // Create team activity notification for new member (only if joining existing team)
    if (inviteCode) {
      await this.createTeamActivityNotification(team.id, 'member_joined', {
        memberName: user.name,
        role: user.role
      });
    }
    
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser & { passwordHash?: string }>): Promise<User | undefined> {
    // Handle password field mapping to passwordHash for database
    const updateData = { ...userData };
    if ('password' in updateData) {
      updateData.passwordHash = updateData.password;
      delete updateData.password;
    }
    
    const [user] = await db
      .update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    return user || undefined;
  }

  async getTeamMembers(teamId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.teamId, teamId), eq(users.isActive, true)))
      .orderBy(users.createdAt);
  }

  async updateUserRole(userId: string, teamId: string, role: "admin" | "member"): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.teamId, teamId)))
      .returning();
    
    // Create team activity notification for role change
    if (user) {
      await this.createTeamActivityNotification(teamId, 'member_role_changed', {
        memberName: user.name,
        newRole: role
      });
    }
    
    return user || undefined;
  }

  async removeUserFromTeam(userId: string, teamId: string): Promise<boolean> {
    // Get user info before removing for notification
    const [userToRemove] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.teamId, teamId)));

    const result = await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.teamId, teamId)));
    
    // Create team activity notification for member removal
    if ((result.rowCount ?? 0) > 0 && userToRemove) {
      await this.createTeamActivityNotification(teamId, 'member_removed', {
        memberName: userToRemove.name
      });
    }
    
    return (result.rowCount ?? 0) > 0;
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team || undefined;
  }

  async getTeamByInviteCode(inviteCode: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.inviteCode, inviteCode));
    return team || undefined;
  }

  async createTeam(name: string): Promise<Team> {
    // Generate a unique invite code (6 characters, alphanumeric)
    const inviteCode = randomBytes(3).toString('hex').toUpperCase();
    
    const [team] = await db
      .insert(teams)
      .values({
        name,
        inviteCode,
      })
      .returning();
    
    // Create default categories for the new team
    await createDefaultCategories(team.id);
    
    return team;
  }

  async updateTeam(id: string, teamData: Partial<Team>): Promise<Team | undefined> {
    const [team] = await db
      .update(teams)
      .set({ ...teamData, updatedAt: new Date() })
      .where(eq(teams.id, id))
      .returning();
    
    // Create team activity notification for team update
    if (team) {
      await this.createTeamActivityNotification(id, 'team_updated', {
        changes: teamData.name ? `Nombre cambiado a "${teamData.name}".` : ''
      });
    }
    
    return team || undefined;
  }

  async regenerateInviteCode(teamId: string): Promise<Team | undefined> {
    const newInviteCode = randomBytes(8).toString('hex').toUpperCase();
    const [team] = await db
      .update(teams)
      .set({ inviteCode: `TEAM-${newInviteCode}`, updatedAt: new Date() })
      .where(eq(teams.id, teamId))
      .returning();
    
    // Create team activity notification for invite code regeneration
    if (team) {
      await this.createTeamActivityNotification(teamId, 'invite_code_regenerated', {});
    }
    
    return team || undefined;
  }

  async getTransactions(teamId: string, filters?: { categoryId?: string; fromDate?: string; toDate?: string; status?: string; search?: string; page?: number; limit?: number }): Promise<Transaction[]> {
    const conditions = [eq(transactions.teamId, teamId)];
    
    if (filters?.categoryId) {
      conditions.push(eq(transactions.categoryId, filters.categoryId));
    }
    
    if (filters?.fromDate) {
      conditions.push(gte(transactions.date, filters.fromDate));
    }
    
    if (filters?.toDate) {
      conditions.push(lte(transactions.date, filters.toDate));
    }
    
    if (filters?.status) {
      conditions.push(eq(transactions.status, filters.status as "active" | "deleted" | "pending"));
    } else {
      // Default to showing only active transactions
      conditions.push(eq(transactions.status, "active"));
    }
    
    if (filters?.search) {
      conditions.push(like(transactions.description, `%${filters.search}%`));
    }
    
    const pageNumber = filters?.page || 1;
    const pageSize = filters?.limit || 50;
    const offsetValue = (pageNumber - 1) * pageSize;
    
    return db.select().from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.date))
      .limit(pageSize)
      .offset(offsetValue);
  }

  async getTransaction(id: string, teamId: string): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.teamId, teamId)));
    
    return transaction || undefined;
  }

  async createTransaction(transaction: InsertTransaction & { teamId: string; userId: string }): Promise<Transaction> {
    // First, try to apply rules to categorize the transaction automatically
    let finalTransaction = { ...transaction };
    
    // Get active rules for the team
    const activeRules = await db
      .select()
      .from(rules)
      .where(and(eq(rules.teamId, transaction.teamId), eq(rules.isActive, true)));

    // Apply rules to find a matching category
    for (const rule of activeRules) {
      let matches = false;

      switch (rule.field) {
        case 'description':
          matches = transaction.description.toLowerCase().includes(rule.matchText.toLowerCase());
          break;
        case 'amount':
          const ruleAmount = parseFloat(rule.matchText);
          const transactionAmount = parseFloat(transaction.amount);
          matches = Math.abs(transactionAmount) === ruleAmount;
          break;
        case 'date':
          matches = transaction.date.includes(rule.matchText);
          break;
      }

      if (matches) {
        finalTransaction.categoryId = rule.categoryId;
        finalTransaction.isAiSuggested = true;
        break; // First match wins
      }
    }

    const [newTransaction] = await db
      .insert(transactions)
      .values(finalTransaction)
      .returning();
    
    // Create audit log for transaction creation
    await this.createAuditLog({
      transactionId: newTransaction.id,
      userId: transaction.userId,
      changeType: 'created',
      newValue: newTransaction,
    });

    // Check for budget alerts after creating transaction
    await this.checkBudgetAlertsAndNotify(transaction.teamId);

    // Create transaction alert if needed
    await this.createTransactionAlert(newTransaction, transaction.userId);
    
    return newTransaction;
  }

  async updateTransaction(id: string, transactionData: Partial<InsertTransaction>, userId?: string): Promise<Transaction | undefined> {
    // Get the original transaction for audit logging
    const [originalTransaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    
    const [updatedTransaction] = await db
      .update(transactions)
      .set({ ...transactionData, updatedAt: new Date() })
      .where(eq(transactions.id, id))
      .returning();
    
    // Create audit log for transaction update
    if (updatedTransaction && originalTransaction && userId) {
      await this.createAuditLog({
        transactionId: updatedTransaction.id,
        userId: userId,
        changeType: 'updated',
        oldValue: originalTransaction,
        newValue: updatedTransaction,
      });

      // Check for budget alerts after updating transaction
      await this.checkBudgetAlertsAndNotify(updatedTransaction.teamId);
    }
    
    return updatedTransaction || undefined;
  }

  async deleteTransaction(id: string, teamId: string, userId?: string): Promise<boolean> {
    // Get the original transaction for audit logging
    const [originalTransaction] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.teamId, teamId)));
    
    const result = await db
      .update(transactions)
      .set({ status: "deleted", updatedAt: new Date() })
      .where(and(eq(transactions.id, id), eq(transactions.teamId, teamId)));
    
    // Create audit log for transaction deletion
    if (originalTransaction && userId && (result.rowCount ?? 0) > 0) {
      await this.createAuditLog({
        transactionId: originalTransaction.id,
        userId: userId,
        changeType: 'deleted',
        oldValue: originalTransaction,
      });
    }
    
    return (result.rowCount ?? 0) > 0;
  }

  // Category methods
  async getCategories(teamId: string): Promise<Category[]> {
    return db.select().from(categories)
      .where(and(eq(categories.teamId, teamId), eq(categories.isActive, true)));
  }

  async getCategory(id: string, teamId: string): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.teamId, teamId)));
    
    return category || undefined;
  }

  async createCategory(category: InsertCategory & { teamId: string }): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    
    return newCategory;
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updatedCategory] = await db
      .update(categories)
      .set({ ...category, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    
    return updatedCategory || undefined;
  }

  async deleteCategory(id: string, teamId: string): Promise<boolean> {
    // Check if category has active transactions
    const [transactionCheck] = await db
      .select({ count: transactions.id })
      .from(transactions)
      .where(and(
        eq(transactions.categoryId, id),
        eq(transactions.status, 'active')
      ))
      .limit(1);
      
    if (transactionCheck) {
      throw new Error("Cannot delete category with active transactions");
    }
    
    const result = await db
      .update(categories)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(categories.id, id), eq(categories.teamId, teamId)));
    
    return (result.rowCount ?? 0) > 0;
  }

  // Budget methods
  async getBudgets(teamId: string): Promise<Budget[]> {
    return db.select().from(budgets)
      .where(and(eq(budgets.teamId, teamId), eq(budgets.isActive, true)));
  }

  async getBudget(id: string, teamId: string): Promise<Budget | undefined> {
    const [budget] = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.teamId, teamId)));
    
    return budget || undefined;
  }

  async createBudget(budget: InsertBudget & { teamId: string }): Promise<Budget> {
    const [newBudget] = await db
      .insert(budgets)
      .values(budget)
      .returning();
    
    return newBudget;
  }

  async updateBudget(id: string, budget: Partial<InsertBudget>): Promise<Budget | undefined> {
    const [updatedBudget] = await db
      .update(budgets)
      .set({ ...budget, updatedAt: new Date() })
      .where(eq(budgets.id, id))
      .returning();
    
    return updatedBudget || undefined;
  }

  async deleteBudget(id: string, teamId: string): Promise<boolean> {
    const result = await db
      .update(budgets)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(budgets.id, id), eq(budgets.teamId, teamId)));
    
    return (result.rowCount ?? 0) > 0;
  }

  async getBudgetAnalytics(teamId: string, month?: number, year?: number): Promise<any[]> {
    // Get target date (default to current month if not specified)
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || (now.getMonth() + 1);
    
    // Calculate month boundaries
    const monthStr = targetMonth.toString().padStart(2, '0');
    const yearMonth = `${targetYear}-${monthStr}`;
    const startOfMonth = `${yearMonth}-01`;
    const endOfMonth = new Date(targetYear, targetMonth, 0).toISOString().slice(0, 10);

    // Join budgets with categories and calculate spending
    const result = await db
      .select({
        budgetId: budgets.id,
        categoryId: budgets.categoryId,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
        budgetAmount: budgets.amount,
        period: budgets.period,
        startDate: budgets.startDate,
        endDate: budgets.endDate,
        spent: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.status} = 'active' THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .leftJoin(transactions, and(
        eq(transactions.categoryId, budgets.categoryId),
        eq(transactions.teamId, teamId),
        eq(transactions.status, 'active'),
        // Filter transactions based on budget period
        sql`CASE 
          WHEN ${budgets.period} = 'monthly' THEN ${transactions.date} >= ${startOfMonth} AND ${transactions.date} <= ${endOfMonth}
          WHEN ${budgets.period} = 'weekly' THEN ${transactions.date} >= ${startOfMonth} AND ${transactions.date} <= ${endOfMonth}
          WHEN ${budgets.period} = 'biweekly' THEN ${transactions.date} >= ${startOfMonth} AND ${transactions.date} <= ${endOfMonth}
          WHEN ${budgets.period} = 'custom' THEN ${transactions.date} >= ${budgets.startDate} AND (${budgets.endDate} IS NULL OR ${transactions.date} <= ${budgets.endDate})
          ELSE TRUE
        END`
      ))
      .where(and(
        eq(budgets.teamId, teamId),
        eq(budgets.isActive, true)
      ))
      .groupBy(
        budgets.id,
        budgets.categoryId,
        categories.name,
        categories.icon,
        categories.color,
        budgets.amount,
        budgets.period,
        budgets.startDate,
        budgets.endDate
      );

    // Transform the result to include calculated fields
    return result.map(item => {
      const budgetAmount = parseFloat(item.budgetAmount);
      const spentAmount = parseFloat(item.spent || '0');
      const remaining = budgetAmount - spentAmount;
      const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
      const isOverBudget = spentAmount > budgetAmount;

      return {
        budgetId: item.budgetId,
        categoryId: item.categoryId,
        category: {
          name: item.categoryName,
          icon: item.categoryIcon,
          color: item.categoryColor
        },
        budgetAmount,
        spentAmount,
        remaining,
        percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
        isOverBudget,
        period: item.period,
        startDate: item.startDate,
        endDate: item.endDate,
        status: isOverBudget ? 'over' : percentage > 80 ? 'warning' : 'good'
      };
    });
  }

  // File methods
  async getFiles(teamId: string): Promise<File[]> {
    return db.select().from(files)
      .where(eq(files.teamId, teamId))
      .orderBy(desc(files.createdAt));
  }

  async getFile(id: string, teamId: string): Promise<File | undefined> {
    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, id), eq(files.teamId, teamId)));
    
    return file || undefined;
  }

  async createFile(file: InsertFile & { teamId: string; userId: string }): Promise<File> {
    const [newFile] = await db
      .insert(files)
      .values(file)
      .returning();
    
    return newFile;
  }

  async updateFile(id: string, file: Partial<InsertFile>): Promise<File | undefined> {
    const [updatedFile] = await db
      .update(files)
      .set({ ...file, updatedAt: new Date() })
      .where(eq(files.id, id))
      .returning();
    
    return updatedFile || undefined;
  }

  async deleteFile(id: string, teamId: string): Promise<boolean> {
    const result = await db
      .delete(files)
      .where(and(eq(files.id, id), eq(files.teamId, teamId)));
    
    return (result.rowCount ?? 0) > 0;
  }

  // Rule methods
  async getRules(teamId: string): Promise<Rule[]> {
    return db.select().from(rules)
      .where(and(eq(rules.teamId, teamId), eq(rules.isActive, true)));
  }

  async getRule(id: string, teamId: string): Promise<Rule | undefined> {
    const [rule] = await db
      .select()
      .from(rules)
      .where(and(eq(rules.id, id), eq(rules.teamId, teamId)));
    
    return rule || undefined;
  }

  async createRule(rule: InsertRule & { teamId: string }): Promise<Rule> {
    const [newRule] = await db
      .insert(rules)
      .values(rule)
      .returning();
    
    return newRule;
  }

  async updateRule(id: string, rule: Partial<InsertRule>): Promise<Rule | undefined> {
    const [updatedRule] = await db
      .update(rules)
      .set({ ...rule, updatedAt: new Date() })
      .where(eq(rules.id, id))
      .returning();
    
    return updatedRule || undefined;
  }

  async deleteRule(id: string, teamId: string): Promise<boolean> {
    const result = await db
      .update(rules)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(rules.id, id), eq(rules.teamId, teamId)));
    
    return (result.rowCount ?? 0) > 0;
  }

  async applyRulesToTransactions(teamId: string, userId: string): Promise<{ categorizedCount: number; totalProcessed: number; details: any[] }> {
    // Get active rules for the team
    const activeRules = await db
      .select()
      .from(rules)
      .where(and(eq(rules.teamId, teamId), eq(rules.isActive, true)));

    if (activeRules.length === 0) {
      return { categorizedCount: 0, totalProcessed: 0, details: [] };
    }

    // Get uncategorized transactions (or transactions that could be re-categorized)
    const uncategorizedTransactions = await db
      .select()
      .from(transactions)
      .where(and(
        eq(transactions.teamId, teamId),
        eq(transactions.status, 'active')
      ));

    let categorizedCount = 0;
    const details: any[] = [];

    for (const transaction of uncategorizedTransactions) {
      let matchedRule: Rule | null = null;

      // Apply rules in order, first match wins
      for (const rule of activeRules) {
        let matches = false;

        switch (rule.field) {
          case 'description':
            matches = transaction.description.toLowerCase().includes(rule.matchText.toLowerCase());
            break;
          case 'amount':
            // For amount matching, we expect the rule to specify a range or exact amount
            const ruleAmount = parseFloat(rule.matchText);
            const transactionAmount = parseFloat(transaction.amount);
            matches = Math.abs(transactionAmount) === ruleAmount;
            break;
          case 'date':
            // For date matching, we expect the rule to specify a date pattern
            matches = transaction.date.includes(rule.matchText);
            break;
        }

        if (matches) {
          matchedRule = rule;
          break;
        }
      }

      if (matchedRule && transaction.categoryId !== matchedRule.categoryId) {
        // Update the transaction category
        const originalCategoryId = transaction.categoryId;
        await db
          .update(transactions)
          .set({ 
            categoryId: matchedRule.categoryId, 
            updatedAt: new Date(),
            isAiSuggested: true  // Mark as auto-categorized
          })
          .where(eq(transactions.id, transaction.id));

        // Create audit log for rule-based categorization
        await this.createAuditLog({
          transactionId: transaction.id,
          userId: userId,
          changeType: 'category_changed',
          oldValue: { categoryId: originalCategoryId, source: 'manual' },
          newValue: { categoryId: matchedRule.categoryId, source: 'rule', ruleId: matchedRule.id },
        });

        categorizedCount++;
        details.push({
          transactionId: transaction.id,
          description: transaction.description,
          oldCategoryId: originalCategoryId,
          newCategoryId: matchedRule.categoryId,
          ruleName: matchedRule.name,
          rulePattern: matchedRule.matchText
        });
      }
    }

    // Create team activity notification if any transactions were categorized
    if (categorizedCount > 0) {
      await this.createTeamActivityNotification(teamId, 'rules_applied', {
        categorizedCount
      });
    }

    return {
      categorizedCount,
      totalProcessed: uncategorizedTransactions.length,
      details
    };
  }

  // Notification methods
  async getNotifications(teamId: string, userId?: string): Promise<Notification[]> {
    const conditions = [eq(notifications.teamId, teamId)];
    
    if (userId) {
      conditions.push(eq(notifications.userId, userId));
    }
    
    return db.select().from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt));
  }

  async getNotification(id: string, teamId: string): Promise<Notification | undefined> {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.teamId, teamId)));
    
    return notification || undefined;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    
    return newNotification;
  }

  async markNotificationAsRead(id: string, teamId: string): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.teamId, teamId)));
    
    return (result.rowCount ?? 0) > 0;
  }

  async deleteNotification(id: string, teamId: string): Promise<boolean> {
    const result = await db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.teamId, teamId)));
    
    return (result.rowCount ?? 0) > 0;
  }

  // Audit log methods
  async getTransactionAuditLog(transactionId: string): Promise<TransactionAuditLog[]> {
    return db.select().from(transactionAuditLog)
      .where(eq(transactionAuditLog.transactionId, transactionId))
      .orderBy(desc(transactionAuditLog.changedAt));
  }

  async createAuditLog(auditLog: InsertTransactionAuditLog): Promise<TransactionAuditLog> {
    const [newAuditLog] = await db
      .insert(transactionAuditLog)
      .values(auditLog)
      .returning();
    
    return newAuditLog;
  }

  async getChatSessions(teamId: string, userId: string): Promise<ChatSession[]> {
    const result = await db
      .select()
      .from(chatSessions)
      .where(and(
        eq(chatSessions.teamId, teamId),
        eq(chatSessions.userId, userId)
      ))
      .orderBy(desc(chatSessions.updatedAt));
    
    return result;
  }

  async createChatSession(chatSession: InsertChatSession & { teamId: string; userId: string }): Promise<ChatSession> {
    const [newChatSession] = await db
      .insert(chatSessions)
      .values(chatSession)
      .returning();
    
    return newChatSession;
  }

  async updateChatSession(sessionId: string, title: string): Promise<ChatSession> {
    const [updatedChatSession] = await db
      .update(chatSessions)
      .set({ 
        title,
        updatedAt: new Date()
      })
      .where(eq(chatSessions.id, sessionId))
      .returning();
    
    return updatedChatSession;
  }

  async deleteChatSession(sessionId: string): Promise<void> {
    // Delete all conversations in the session first
    await db
      .delete(conversations)
      .where(eq(conversations.sessionId, sessionId));
    
    // Delete the chat session
    await db
      .delete(chatSessions)
      .where(eq(chatSessions.id, sessionId));
  }

  async getConversations(sessionId: string, limit: number = 50): Promise<Conversation[]> {
    const result = await db
      .select()
      .from(conversations)
      .where(eq(conversations.sessionId, sessionId))
      .orderBy(desc(conversations.createdAt))
      .limit(limit);
    
    return result;
  }

  async createConversation(conversation: InsertConversation & { sessionId: string; teamId: string; userId: string }): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    
    return newConversation;
  }

  // Helper method to create transaction alert notifications
  async createTransactionAlert(transaction: Transaction, userId: string): Promise<void> {
    try {
      const amount = Math.abs(parseFloat(transaction.amount));
      
      // Get recent transactions to calculate average spending
      const recentTransactions = await db
        .select()
        .from(transactions)
        .where(and(
          eq(transactions.teamId, transaction.teamId),
          eq(transactions.status, 'active'),
          gte(transactions.date, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        ))
        .limit(50);

      if (recentTransactions.length > 5) {
        const amounts = recentTransactions.map(t => Math.abs(parseFloat(t.amount)));
        const averageAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
        
        // Alert for transactions significantly larger than average (3x or more)
        if (amount >= averageAmount * 3 && amount > 100) {
          await this.createNotification({
            teamId: transaction.teamId,
            userId,
            title: 'Transacción inusual detectada',
            body: `Se registró una transacción de $${amount.toFixed(2)} por "${transaction.description}", que es significativamente mayor al promedio reciente de $${averageAmount.toFixed(2)}.`,
            type: 'alert',
            isRead: false,
          });
        }
      }

      // Alert for very large transactions (over $1000)
      if (amount > 1000) {
        await this.createNotification({
          teamId: transaction.teamId,
          userId,
          title: 'Transacción de alto valor',
          body: `Se registró una transacción de alto valor: $${amount.toFixed(2)} por "${transaction.description}".`,
          type: 'alert',
          isRead: false,
        });
      }

      // Alert for AI-suggested categorizations
      if (transaction.isAiSuggested) {
        await this.createNotification({
          teamId: transaction.teamId,
          userId,
          title: 'Transacción categorizada automáticamente',
          body: `La transacción "${transaction.description}" de $${amount.toFixed(2)} fue categorizada automáticamente usando reglas inteligentes.`,
          type: 'info',
          isRead: false,
        });
      }
    } catch (error) {
      console.error('Error creating transaction alert:', error);
    }
  }

  // Helper method to create team activity notifications
  async createTeamActivityNotification(teamId: string, activityType: string, details: { [key: string]: any }): Promise<void> {
    try {
      let title = '';
      let body = '';
      
      switch (activityType) {
        case 'member_joined':
          title = 'Nuevo miembro se unió al equipo';
          body = `${details.memberName} se ha unido al equipo como ${details.role === 'admin' ? 'administrador' : 'miembro'}.`;
          break;
        case 'member_role_changed':
          title = 'Rol de miembro actualizado';
          body = `El rol de ${details.memberName} ha sido cambiado a ${details.newRole === 'admin' ? 'administrador' : 'miembro'}.`;
          break;
        case 'member_removed':
          title = 'Miembro removido del equipo';
          body = `${details.memberName} ha sido removido del equipo.`;
          break;
        case 'team_updated':
          title = 'Información del equipo actualizada';
          body = `La información del equipo ha sido actualizada. ${details.changes || ''}`;
          break;
        case 'invite_code_regenerated':
          title = 'Código de invitación regenerado';
          body = 'Se ha generado un nuevo código de invitación para el equipo por seguridad.';
          break;
        case 'file_processed':
          title = 'Archivo procesado exitosamente';
          body = `El archivo "${details.filename}" ha sido procesado. ${details.transactionCount} transacciones fueron extraídas.`;
          break;
        case 'rules_applied':
          title = 'Reglas automáticas aplicadas';
          body = `Se aplicaron reglas automáticas y se categorizaron ${details.categorizedCount} transacciones.`;
          break;
        default:
          return; // Unknown activity type
      }

      // Get all team members to notify them
      const teamMembers = await this.getTeamMembers(teamId);
      
      // Create notification for each team member
      for (const member of teamMembers) {
        await this.createNotification({
          teamId,
          userId: member.id,
          title,
          body,
          type: 'info',
          isRead: false,
        });
      }
    } catch (error) {
      console.error('Error creating team activity notification:', error);
    }
  }

  // Helper method to check for budget alerts and create notifications
  async checkBudgetAlertsAndNotify(teamId: string): Promise<void> {
    try {
      const budgetAnalytics = await this.getBudgetAnalytics(teamId);
      
      for (const budget of budgetAnalytics) {
        // Check if budget is over or at warning threshold (80%)
        if (budget.isOverBudget) {
          const overAmount = Math.abs(budget.spentAmount - budget.budgetAmount);
          
          // Check if we already sent a notification for this budget recently (within 24 hours)
          const recentNotifications = await db
            .select()
            .from(notifications)
            .where(and(
              eq(notifications.teamId, teamId),
              eq(notifications.type, 'alert'),
              gte(notifications.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
            ));

          const hasRecentNotification = recentNotifications.some(n => 
            n.body.includes(budget.category.name)
          );

          if (!hasRecentNotification) {
            await this.createNotification({
              teamId,
              title: `Presupuesto de ${budget.category.name} excedido`,
              body: `Has superado el presupuesto de $${budget.budgetAmount.toFixed(2)} en la categoría ${budget.category.name} por $${overAmount.toFixed(2)}.`,
              type: 'alert',
              isRead: false,
            });
          }
        } else if (budget.percentage >= 80) {
          // Warning threshold notification
          const recentWarnings = await db
            .select()
            .from(notifications)
            .where(and(
              eq(notifications.teamId, teamId),
              eq(notifications.type, 'alert'),
              gte(notifications.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
            ));

          const hasRecentWarning = recentWarnings.some(n => 
            n.body.includes(`${budget.category.name}`) && n.body.includes('cerca del límite')
          );

          if (!hasRecentWarning) {
            await this.createNotification({
              teamId,
              title: `Presupuesto de ${budget.category.name} cerca del límite`,
              body: `Has gastado el ${budget.percentage.toFixed(1)}% de tu presupuesto de $${budget.budgetAmount.toFixed(2)} en ${budget.category.name}. Quedan $${budget.remaining.toFixed(2)}.`,
              type: 'alert',
              isRead: false,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking budget alerts:', error);
    }
  }
}

export const storage = new DatabaseStorage();
