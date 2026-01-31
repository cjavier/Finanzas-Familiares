import { pgTable, text, uuid, boolean, decimal, date, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  inviteCode: text('invite_code').unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id')
    .references(() => teams.id)
    .notNull(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'member'] })
    .default('member')
    .notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  preferences: jsonb('preferences').$type<{ banks?: string[] }>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id')
    .references(() => teams.id)
    .notNull(),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id')
    .references(() => teams.id)
    .notNull(),
  categoryId: uuid('category_id')
    .references(() => categories.id)
    .notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  period: text('period', { enum: ['monthly', 'weekly', 'biweekly', 'custom'] }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id')
    .references(() => teams.id)
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  categoryId: uuid('category_id')
    .references(() => categories.id)
    .notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  description: text('description').notNull(),
  date: date('date').notNull(),
  bank: text('bank').default('Banregio').notNull(),
  source: text('source', { enum: ['manual', 'statement', 'ticket', 'ocr', 'file'] })
    .default('manual')
    .notNull(),
  status: text('status', { enum: ['active', 'deleted', 'pending'] })
    .default('active')
    .notNull(),
  fileId: uuid('file_id'),
  isAiSuggested: boolean('is_ai_suggested').default(false).notNull(),
  aiConfidence: decimal('ai_confidence', { precision: 5, scale: 4 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const rules = pgTable('rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id')
    .references(() => teams.id)
    .notNull(),
  name: text('name').notNull(),
  matchText: text('match_text').notNull(),
  field: text('field', { enum: ['description', 'amount', 'date'] }).notNull(),
  categoryId: uuid('category_id')
    .references(() => categories.id)
    .notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const transactionAuditLog = pgTable('transaction_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: uuid('transaction_id')
    .references(() => transactions.id)
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  changeType: text('change_type', { enum: ['created', 'updated', 'deleted', 'category_changed'] }).notNull(),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
});
