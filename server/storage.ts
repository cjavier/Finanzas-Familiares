import { 
  users, teams, transactions, categories, budgets, files, rules, notifications, transactionAuditLog,
  type User, type InsertUser, type Team, type Transaction, type InsertTransaction,
  type Category, type InsertCategory, type Budget, type InsertBudget,
  type File, type InsertFile, type Rule, type InsertRule,
  type Notification, type InsertNotification, type TransactionAuditLog, type InsertTransactionAuditLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, isNull, or, sum, sql } from "drizzle-orm";
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
  getBudgetAnalytics(teamId: string): Promise<any[]>;
  
  // Transaction methods
  getTransactions(teamId: string, filters?: { categoryId?: string; fromDate?: string; toDate?: string; status?: string }): Promise<Transaction[]>;
  getTransaction(id: string, teamId: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction & { teamId: string; userId: string }): Promise<Transaction>;
  updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: string, teamId: string): Promise<boolean>;
  
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
  
  // Notification methods
  getNotifications(teamId: string, userId?: string): Promise<Notification[]>;
  getNotification(id: string, teamId: string): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string, teamId: string): Promise<boolean>;
  deleteNotification(id: string, teamId: string): Promise<boolean>;
  
  // Audit log methods
  getTransactionAuditLog(transactionId: string): Promise<TransactionAuditLog[]>;
  createAuditLog(auditLog: InsertTransactionAuditLog): Promise<TransactionAuditLog>;
  
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
    
    return user || undefined;
  }

  async removeUserFromTeam(userId: string, teamId: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.teamId, teamId)));
    
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
    
    return team || undefined;
  }

  async regenerateInviteCode(teamId: string): Promise<Team | undefined> {
    const newInviteCode = randomBytes(8).toString('hex').toUpperCase();
    const [team] = await db
      .update(teams)
      .set({ inviteCode: `TEAM-${newInviteCode}`, updatedAt: new Date() })
      .where(eq(teams.id, teamId))
      .returning();
    
    return team || undefined;
  }

  async getTransactions(teamId: string, filters?: { categoryId?: string; fromDate?: string; toDate?: string; status?: string }): Promise<Transaction[]> {
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
    }
    
    return db.select().from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.date));
  }

  async getTransaction(id: string, teamId: string): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.teamId, teamId)));
    
    return transaction || undefined;
  }

  async createTransaction(transaction: InsertTransaction & { teamId: string; userId: string }): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    
    return newTransaction;
  }

  async updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const [updatedTransaction] = await db
      .update(transactions)
      .set({ ...transaction, updatedAt: new Date() })
      .where(eq(transactions.id, id))
      .returning();
    
    return updatedTransaction || undefined;
  }

  async deleteTransaction(id: string, teamId: string): Promise<boolean> {
    const result = await db
      .update(transactions)
      .set({ status: "deleted", updatedAt: new Date() })
      .where(and(eq(transactions.id, id), eq(transactions.teamId, teamId)));
    
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

  async getBudgetAnalytics(teamId: string): Promise<any[]> {
    // Get current date to calculate periods
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM format
    const startOfMonth = `${currentMonth}-01`;
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

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
}

export const storage = new DatabaseStorage();
