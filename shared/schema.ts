import { pgTable, text, uuid, boolean, decimal, date, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "member"] }).default("member").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  name: text("name").notNull(),
  icon: text("icon"),
  color: text("color"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const budgets = pgTable("budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  categoryId: uuid("category_id").references(() => categories.id).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  period: text("period", { enum: ["monthly", "weekly", "biweekly", "custom"] }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  filename: text("filename").notNull(),
  mimetype: text("mimetype").notNull(),
  size: text("size").notNull(),
  path: text("path").notNull(),
  status: text("status", { enum: ["uploaded", "processing", "completed", "error"] }).default("uploaded").notNull(),
  processedAt: timestamp("processed_at"),
  transactionCount: text("transaction_count"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  categoryId: uuid("category_id").references(() => categories.id).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  date: date("date").notNull(),
  source: text("source", { enum: ["manual", "statement", "ticket", "ocr", "file"] }).default("manual").notNull(),
  status: text("status", { enum: ["active", "deleted", "pending"] }).default("active").notNull(),
  fileId: uuid("file_id").references(() => files.id),
  isAiSuggested: boolean("is_ai_suggested").default(false).notNull(),
  aiConfidence: decimal("ai_confidence", { precision: 5, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rules = pgTable("rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  name: text("name").notNull(),
  matchText: text("match_text").notNull(),
  field: text("field", { enum: ["description", "amount", "date"] }).notNull(),
  categoryId: uuid("category_id").references(() => categories.id).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: text("type", { enum: ["alert", "info", "reminder"] }).notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  readAt: timestamp("read_at"),
  relatedTransactionId: uuid("related_transaction_id").references(() => transactions.id),
  relatedCategoryId: uuid("related_category_id").references(() => categories.id),
});

export const transactionAuditLog = pgTable("transaction_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id").references(() => transactions.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  changeType: text("change_type", { enum: ["created", "updated", "deleted", "category_changed"] }).notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => chatSessions.id).notNull(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  response: text("response").notNull(),
  context: jsonb("context"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const teamsRelations = relations(teams, ({ many }) => ({
  users: many(users),
  categories: many(categories),
  budgets: many(budgets),
  transactions: many(transactions),
  files: many(files),
  rules: many(rules),
  notifications: many(notifications),
  chatSessions: many(chatSessions),
  conversations: many(conversations),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  team: one(teams, {
    fields: [users.teamId],
    references: [teams.id],
  }),
  transactions: many(transactions),
  files: many(files),
  notifications: many(notifications),
  auditLogs: many(transactionAuditLog),
  chatSessions: many(chatSessions),
  conversations: many(conversations),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  team: one(teams, {
    fields: [categories.teamId],
    references: [teams.id],
  }),
  transactions: many(transactions),
  budgets: many(budgets),
  rules: many(rules),
  notifications: many(notifications),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  team: one(teams, {
    fields: [budgets.teamId],
    references: [teams.id],
  }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  team: one(teams, {
    fields: [files.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  team: one(teams, {
    fields: [transactions.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  file: one(files, {
    fields: [transactions.fileId],
    references: [files.id],
  }),
  auditLogs: many(transactionAuditLog),
}));

export const rulesRelations = relations(rules, ({ one }) => ({
  team: one(teams, {
    fields: [rules.teamId],
    references: [teams.id],
  }),
  category: one(categories, {
    fields: [rules.categoryId],
    references: [categories.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  team: one(teams, {
    fields: [notifications.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  relatedTransaction: one(transactions, {
    fields: [notifications.relatedTransactionId],
    references: [transactions.id],
  }),
  relatedCategory: one(categories, {
    fields: [notifications.relatedCategoryId],
    references: [categories.id],
  }),
}));

export const transactionAuditLogRelations = relations(transactionAuditLog, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionAuditLog.transactionId],
    references: [transactions.id],
  }),
  user: one(users, {
    fields: [transactionAuditLog.userId],
    references: [users.id],
  }),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  team: one(teams, {
    fields: [chatSessions.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one }) => ({
  session: one(chatSessions, {
    fields: [conversations.sessionId],
    references: [chatSessions.id],
  }),
  team: one(teams, {
    fields: [conversations.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  teamId: true,
  passwordHash: true,
}).extend({
  teamName: z.string().optional(),
  inviteCode: z.string().optional(),
  password: z.string().min(6),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  teamId: true,
});

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  teamId: true,
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  teamId: true,
  userId: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  teamId: true,
  userId: true,
}).extend({
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, {
    message: "Amount must be a positive number",
  }),
});

export const insertRuleSchema = createInsertSchema(rules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  teamId: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionAuditLogSchema = createInsertSchema(transactionAuditLog).omit({
  id: true,
  changedAt: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  teamId: true,
  userId: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  teamId: true,
  userId: true,
});

// Types
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type File = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Rule = typeof rules.$inferSelect;
export type InsertRule = z.infer<typeof insertRuleSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type TransactionAuditLog = typeof transactionAuditLog.$inferSelect;
export type InsertTransactionAuditLog = z.infer<typeof insertTransactionAuditLogSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
