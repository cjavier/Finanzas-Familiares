import { users, teams, transactions, type User, type InsertUser, type Team, type Transaction, type InsertTransaction } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { randomBytes } from "crypto";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getTeamByInviteCode(inviteCode: string): Promise<Team | undefined>;
  createTeam(name: string): Promise<Team>;
  getTransactions(teamId: number, filters?: { category?: string; fromDate?: string; toDate?: string }): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction & { teamId: number; userId: number }): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number, teamId: number): Promise<boolean>;
  getTransaction(id: number, teamId: number): Promise<Transaction | undefined>;
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const { teamName, inviteCode, ...userData } = insertUser;
    
    let team: Team;
    
    if (inviteCode) {
      // Join existing team
      const existingTeam = await this.getTeamByInviteCode(inviteCode);
      if (!existingTeam) {
        throw new Error("Invalid invitation code");
      }
      team = existingTeam;
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
      })
      .returning();
    
    return user;
  }

  async getTeamByInviteCode(inviteCode: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.inviteCode, inviteCode));
    return team || undefined;
  }

  async createTeam(name: string): Promise<Team> {
    const inviteCode = randomBytes(8).toString("hex").toUpperCase();
    
    const [team] = await db
      .insert(teams)
      .values({
        name,
        inviteCode,
      })
      .returning();
    
    return team;
  }

  async getTransactions(teamId: number, filters?: { category?: string; fromDate?: string; toDate?: string }): Promise<Transaction[]> {
    let query = db.select().from(transactions).where(eq(transactions.teamId, teamId));
    
    const conditions = [eq(transactions.teamId, teamId)];
    
    if (filters?.category) {
      conditions.push(eq(transactions.category, filters.category));
    }
    
    if (filters?.fromDate) {
      conditions.push(gte(transactions.date, filters.fromDate));
    }
    
    if (filters?.toDate) {
      conditions.push(lte(transactions.date, filters.toDate));
    }
    
    return db.select().from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.date));
  }

  async createTransaction(transaction: InsertTransaction & { teamId: number; userId: number }): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    
    return newTransaction;
  }

  async updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const [updatedTransaction] = await db
      .update(transactions)
      .set(transaction)
      .where(eq(transactions.id, id))
      .returning();
    
    return updatedTransaction || undefined;
  }

  async deleteTransaction(id: number, teamId: number): Promise<boolean> {
    const result = await db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.teamId, teamId)));
    
    return result.rowCount > 0;
  }

  async getTransaction(id: number, teamId: number): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.teamId, teamId)));
    
    return transaction || undefined;
  }
}

export const storage = new DatabaseStorage();
