import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { checkDatabaseConnection } from "./db";
import { insertTransactionSchema, insertCategorySchema, insertBudgetSchema, insertRuleSchema, insertFileSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { createReadStream } from "fs";
import csvParser from "csv-parser";
import * as XLSX from "xlsx";

export function registerRoutes(app: Express): Server {
  // Check database connection on startup
  checkDatabaseConnection().then(connected => {
    if (!connected) {
      console.error('⚠️  Warning: Server starting without database connection');
      console.error('🔧 Please check your DATABASE_URL and database status');
    }
  }).catch(error => {
    console.error('⚠️  Database connection check failed:', error);
  });

  // sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Get team information and members for current user
  app.get("/api/team", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    try {
      const user = req.user!;
      const [team, members] = await Promise.all([
        storage.getTeam(user.teamId),
        storage.getTeamMembers(user.teamId)
      ]);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      res.json({ ...team, members });
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ message: "Failed to fetch team information" });
    }
  });

  // Update team information
  app.put("/api/team", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    try {
      const user = req.user!;
      const { name } = req.body;

      // Check if user is admin
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Only team administrators can update team information" });
      }

      // Basic validation
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ message: "Team name is required" });
      }

      const updatedTeam = await storage.updateTeam(user.teamId, { name: name.trim() });
      if (!updatedTeam) {
        return res.status(404).json({ message: "Team not found" });
      }

      res.json(updatedTeam);
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(500).json({ message: "Failed to update team information" });
    }
  });

  // Get or regenerate team invite code
  app.get("/api/team/invite-code", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    try {
      const user = req.user!;

      // Check if user is admin
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Only team administrators can manage invite codes" });
      }

      const team = await storage.getTeam(user.teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      res.json({ inviteCode: team.inviteCode });
    } catch (error) {
      console.error("Error fetching invite code:", error);
      res.status(500).json({ message: "Failed to fetch invite code" });
    }
  });

  // Regenerate team invite code
  app.post("/api/team/invite-code/regenerate", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    try {
      const user = req.user!;

      // Check if user is admin
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Only team administrators can regenerate invite codes" });
      }

      const updatedTeam = await storage.regenerateInviteCode(user.teamId);
      if (!updatedTeam) {
        return res.status(404).json({ message: "Team not found" });
      }

      res.json({ inviteCode: updatedTeam.inviteCode });
    } catch (error) {
      console.error("Error regenerating invite code:", error);
      res.status(500).json({ message: "Failed to regenerate invite code" });
    }
  });

  // Send team invitation email
  app.post("/api/team/invite", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    try {
      const user = req.user!;
      const { email } = req.body;

      // Check if user is admin
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Only team administrators can send invitations" });
      }

      // Basic validation
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      const team = await storage.getTeam(user.teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // For now, we'll just return the invite code
      // In a real implementation, you would send an email here
      res.json({ 
        message: "Invitation sent successfully",
        inviteCode: team.inviteCode,
        email: email
      });
    } catch (error) {
      console.error("Error sending invitation:", error);
      res.status(500).json({ message: "Failed to send invitation" });
    }
  });

  // Change team member role
  app.put("/api/team/members/:id/role", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    try {
      const user = req.user!;
      const memberId = req.params.id;
      const { role } = req.body;

      // Check if user is admin
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Only team administrators can change member roles" });
      }

      // Validate role
      if (!role || !["admin", "member"].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'admin' or 'member'" });
      }

      // Can't change own role
      if (memberId === user.id) {
        return res.status(400).json({ message: "You cannot change your own role" });
      }

      // If changing to member, ensure there's at least one admin left
      if (role === "member") {
        const members = await storage.getTeamMembers(user.teamId);
        const adminCount = members.filter(m => m.role === "admin" && m.id !== memberId).length;
        if (adminCount === 0) {
          return res.status(400).json({ message: "Cannot remove the last administrator from the team" });
        }
      }

      const updatedUser = await storage.updateUserRole(memberId, user.teamId, role);
      if (!updatedUser) {
        return res.status(404).json({ message: "Team member not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating member role:", error);
      res.status(500).json({ message: "Failed to update member role" });
    }
  });

  // Remove team member
  app.delete("/api/team/members/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    try {
      const user = req.user!;
      const memberId = req.params.id;

      // Check if user is admin
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Only team administrators can remove members" });
      }

      // Can't remove self
      if (memberId === user.id) {
        return res.status(400).json({ message: "You cannot remove yourself from the team" });
      }

      // Get the member to check if they're an admin
      const memberToRemove = await storage.getUser(memberId);
      if (!memberToRemove || memberToRemove.teamId !== user.teamId) {
        return res.status(404).json({ message: "Team member not found" });
      }

      // If removing an admin, ensure there's at least one admin left
      if (memberToRemove.role === "admin") {
        const members = await storage.getTeamMembers(user.teamId);
        const adminCount = members.filter(m => m.role === "admin" && m.id !== memberId).length;
        if (adminCount === 0) {
          return res.status(400).json({ message: "Cannot remove the last administrator from the team" });
        }
      }

      const success = await storage.removeUserFromTeam(memberId, user.teamId);
      if (!success) {
        return res.status(404).json({ message: "Team member not found" });
      }

      res.sendStatus(204);
    } catch (error) {
      console.error("Error removing team member:", error);
      res.status(500).json({ message: "Failed to remove team member" });
    }
  });

  // Get transactions for user's team
  app.get("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const { categoryId, fromDate, toDate, status, search, page = "1", limit = "50" } = req.query;
      
      const transactions = await storage.getTransactions(user.teamId, {
        categoryId: categoryId as string,
        fromDate: fromDate as string,
        toDate: toDate as string,
        status: status as string,
        search: search as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });
      
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Create new transaction
  app.post("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      
      // Ensure amount is always positive for cost tracking
      const requestData = { ...req.body };
      if (requestData.amount) {
        const numAmount = parseFloat(requestData.amount);
        requestData.amount = Math.abs(numAmount).toString();
      }
      
      const validatedData = insertTransactionSchema.parse(requestData);
      
      const transaction = await storage.createTransaction({
        ...validatedData,
        teamId: user.teamId,
        userId: user.id,
      });
      
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  // Update transaction
  app.put("/api/transactions/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const transactionId = req.params.id;
      
      // Ensure amount is always positive for cost tracking
      const requestData = { ...req.body };
      if (requestData.amount) {
        const numAmount = parseFloat(requestData.amount);
        requestData.amount = Math.abs(numAmount).toString();
      }
      
      const validatedData = insertTransactionSchema.partial().parse(requestData);
      
      // Verify transaction belongs to user's team
      const existingTransaction = await storage.getTransaction(transactionId, user.teamId);
      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      // Verify category belongs to user's team if categoryId is being changed
      if (validatedData.categoryId) {
        const category = await storage.getCategory(validatedData.categoryId, user.teamId);
        if (!category) {
          return res.status(404).json({ message: "Category not found" });
        }
      }
      
      const updatedTransaction = await storage.updateTransaction(transactionId, validatedData, user.id);
      res.json(updatedTransaction);
    } catch (error) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });

  // Delete multiple transactions (DEBE IR ANTES que la ruta :id)
  app.delete("/api/transactions/batch", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const { transactionIds } = req.body;

      if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
        return res.status(400).json({ message: "Transaction IDs array is required" });
      }

      if (transactionIds.length > 100) {
        return res.status(400).json({ message: "Cannot delete more than 100 transactions at once" });
      }

      const results = {
        deleted: 0,
        errors: [] as string[]
      };

      // Delete transactions one by one to ensure proper permissions and audit logging
      for (const transactionId of transactionIds) {
        try {
          const success = await storage.deleteTransaction(transactionId, user.teamId, user.id);
          if (success) {
            results.deleted++;
          } else {
            results.errors.push(`Transaction ${transactionId} not found`);
          }
        } catch (error) {
          results.errors.push(`Failed to delete transaction ${transactionId}: ${error}`);
        }
      }

      res.json({
        message: `Batch deletion completed`,
        deleted: results.deleted,
        total: transactionIds.length,
        errors: results.errors
      });
    } catch (error) {
      console.error("Error deleting transactions in batch:", error);
      res.status(500).json({ message: "Failed to delete transactions" });
    }
  });

  // Delete transaction
  app.delete("/api/transactions/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const transactionId = req.params.id;
      
      const success = await storage.deleteTransaction(transactionId, user.teamId, user.id);
      if (!success) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Recategorize transaction
  app.put("/api/transactions/:id/categorize", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const transactionId = req.params.id;
      const { categoryId } = req.body;

      if (!categoryId) {
        return res.status(400).json({ message: "Category ID is required" });
      }

      // Verify transaction belongs to user's team
      const existingTransaction = await storage.getTransaction(transactionId, user.teamId);
      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Verify new category belongs to user's team
      const category = await storage.getCategory(categoryId, user.teamId);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      const updatedTransaction = await storage.updateTransaction(transactionId, { categoryId }, user.id);
      
      // Create specific audit log for category change
      if (updatedTransaction) {
        await storage.createAuditLog({
          transactionId: updatedTransaction.id,
          userId: user.id,
          changeType: 'category_changed',
          oldValue: { categoryId: existingTransaction.categoryId },
          newValue: { categoryId: categoryId },
        });
      }

      res.json(updatedTransaction);
    } catch (error) {
      console.error("Error recategorizing transaction:", error);
      res.status(500).json({ message: "Failed to recategorize transaction" });
    }
  });

  // Complete onboarding setup
  app.post("/api/onboarding/complete", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const { selectedCategories, customCategories, budgets } = req.body;

      // Validate input
      if (!Array.isArray(selectedCategories)) {
        return res.status(400).json({ message: "Selected categories must be an array" });
      }

      // Create custom categories first
      const createdCategories = [];
      if (Array.isArray(customCategories) && customCategories.length > 0) {
        for (const customCategory of customCategories) {
          if (customCategory.name && customCategory.name.trim()) {
            const category = await storage.createCategory({
              name: customCategory.name.trim(),
              icon: customCategory.icon || 'FaMoneyBillWave',
              color: customCategory.color || 'purple',
              teamId: user.teamId,
            });
            createdCategories.push(category);
          }
        }
      }

      // Get existing categories that match selected ones
      const existingCategories = await storage.getCategories(user.teamId);
      const selectedExistingCategories = existingCategories.filter(cat => 
        selectedCategories.includes(cat.name)
      );

      // Create budgets for selected categories
      const createdBudgets = [];
      if (budgets && typeof budgets === 'object') {
        const allCategories = [...selectedExistingCategories, ...createdCategories];
        
        for (const category of allCategories) {
          const budgetAmount = budgets[category.name];
          if (budgetAmount && budgetAmount > 0) {
            const budget = await storage.createBudget({
              categoryId: category.id,
              amount: budgetAmount.toString(),
              period: 'monthly',
              startDate: new Date().toISOString().split('T')[0], // Current date
              teamId: user.teamId,
            });
            createdBudgets.push(budget);
          }
        }
      }

      res.json({
        success: true,
        message: "Onboarding completed successfully",
        data: {
          categoriesCreated: createdCategories.length,
          budgetsCreated: createdBudgets.length,
          totalSelectedCategories: selectedCategories.length
        }
      });
    } catch (error) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ message: "Failed to complete onboarding setup" });
    }
  });

  // Get categories for user's team
  app.get("/api/categories", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const categories = await storage.getCategories(user.teamId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Create new category
  app.post("/api/categories", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const validatedData = insertCategorySchema.parse(req.body);
      
      const category = await storage.createCategory({
        ...validatedData,
        teamId: user.teamId,
      });
      
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Update category
  app.put("/api/categories/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const categoryId = req.params.id;
      const validatedData = insertCategorySchema.partial().parse(req.body);
      
      // Verify category belongs to user's team
      const existingCategory = await storage.getCategory(categoryId, user.teamId);
      if (!existingCategory) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      const updatedCategory = await storage.updateCategory(categoryId, validatedData);
      res.json(updatedCategory);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  // Delete category
  app.delete("/api/categories/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const categoryId = req.params.id;
      
      const success = await storage.deleteCategory(categoryId, user.teamId);
      if (!success) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting category:", error);
      if (error instanceof Error && error.message === "Cannot delete category with active transactions") {
        return res.status(400).json({ message: "Cannot delete category with active transactions" });
      }
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Get budgets for user's team
  app.get("/api/budgets", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const budgets = await storage.getBudgets(user.teamId);
      res.json(budgets);
    } catch (error) {
      console.error("Error fetching budgets:", error);
      res.status(500).json({ message: "Failed to fetch budgets" });
    }
  });

  // Create new budget
  app.post("/api/budgets", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const validatedData = insertBudgetSchema.parse(req.body);
      
      // Verify category belongs to user's team
      const category = await storage.getCategory(validatedData.categoryId, user.teamId);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      const budget = await storage.createBudget({
        ...validatedData,
        teamId: user.teamId,
      });
      
      res.status(201).json(budget);
    } catch (error) {
      console.error("Error creating budget:", error);
      res.status(500).json({ message: "Failed to create budget" });
    }
  });

  // Update budget
  app.put("/api/budgets/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const budgetId = req.params.id;
      const validatedData = insertBudgetSchema.partial().parse(req.body);
      
      // Verify budget belongs to user's team
      const existingBudget = await storage.getBudget(budgetId, user.teamId);
      if (!existingBudget) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      // If categoryId is being changed, verify the new category belongs to team
      if (validatedData.categoryId) {
        const category = await storage.getCategory(validatedData.categoryId, user.teamId);
        if (!category) {
          return res.status(404).json({ message: "Category not found" });
        }
      }
      
      const updatedBudget = await storage.updateBudget(budgetId, validatedData);
      res.json(updatedBudget);
    } catch (error) {
      console.error("Error updating budget:", error);
      res.status(500).json({ message: "Failed to update budget" });
    }
  });

  // Delete budget
  app.delete("/api/budgets/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const budgetId = req.params.id;
      
      const success = await storage.deleteBudget(budgetId, user.teamId);
      if (!success) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting budget:", error);
      res.status(500).json({ message: "Failed to delete budget" });
    }
  });

  // Get budget analytics for user's team
  app.get("/api/budgets/analytics", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const { month, year } = req.query;
      
      // Default to current month if not specified
      const now = new Date();
      const targetMonth = month ? parseInt(month as string) : now.getMonth() + 1;
      const targetYear = year ? parseInt(year as string) : now.getFullYear();
      
      const analytics = await storage.getBudgetAnalytics(user.teamId, targetMonth, targetYear);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching budget analytics:", error);
      res.status(500).json({ message: "Failed to fetch budget analytics" });
    }
  });

  // Get rules for user's team
  app.get("/api/rules", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const rules = await storage.getRules(user.teamId);
      res.json(rules);
    } catch (error) {
      console.error("Error fetching rules:", error);
      res.status(500).json({ message: "Failed to fetch rules" });
    }
  });

  // Create new rule
  app.post("/api/rules", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const validatedData = insertRuleSchema.parse(req.body);
      
      // Verify category belongs to user's team
      const category = await storage.getCategory(validatedData.categoryId, user.teamId);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      const rule = await storage.createRule({
        ...validatedData,
        teamId: user.teamId,
      });
      
      res.status(201).json(rule);
    } catch (error) {
      console.error("Error creating rule:", error);
      res.status(500).json({ message: "Failed to create rule" });
    }
  });

  // Update rule
  app.put("/api/rules/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const ruleId = req.params.id;
      const validatedData = insertRuleSchema.partial().parse(req.body);
      
      // Verify rule belongs to user's team
      const existingRule = await storage.getRule(ruleId, user.teamId);
      if (!existingRule) {
        return res.status(404).json({ message: "Rule not found" });
      }
      
      // If categoryId is being changed, verify the new category belongs to team
      if (validatedData.categoryId) {
        const category = await storage.getCategory(validatedData.categoryId, user.teamId);
        if (!category) {
          return res.status(404).json({ message: "Category not found" });
        }
      }
      
      const updatedRule = await storage.updateRule(ruleId, validatedData);
      res.json(updatedRule);
    } catch (error) {
      console.error("Error updating rule:", error);
      res.status(500).json({ message: "Failed to update rule" });
    }
  });

  // Delete rule
  app.delete("/api/rules/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const ruleId = req.params.id;
      
      const success = await storage.deleteRule(ruleId, user.teamId);
      if (!success) {
        return res.status(404).json({ message: "Rule not found" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting rule:", error);
      res.status(500).json({ message: "Failed to delete rule" });
    }
  });

  // Apply rules to transactions (batch categorization)
  app.post("/api/transactions/categorize-batch", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const result = await storage.applyRulesToTransactions(user.teamId, user.id);
      res.json({
        message: "Rules applied successfully",
        categorizedCount: result.categorizedCount,
        totalProcessed: result.totalProcessed,
        details: result.details
      });
    } catch (error) {
      console.error("Error applying rules:", error);
      res.status(500).json({ message: "Failed to apply rules to transactions" });
    }
  });

  // Configure multer for file uploads
  const upload = multer({
    dest: "uploads/",
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp'
      ];
      
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF, Excel, CSV, and image files are allowed.'));
      }
    }
  });

  // Configure multer for image uploads (supports multiple images)
  const imageUpload = multer({
    dest: "uploads/",
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit per file
      files: 5, // Maximum 5 images at once
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp'
      ];
      
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only image files (JPEG, PNG, GIF, WebP, BMP) are allowed.'));
      }
    }
  });

  // File upload endpoint
  app.post("/api/files/upload", upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Create file record
      const fileRecord = await storage.createFile({
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size.toString(),
        path: file.path,
        status: 'uploaded',
        teamId: user.teamId,
        userId: user.id,
      });

      // Start processing the file asynchronously
      processFileAsync(fileRecord, user.teamId, user.id);

      res.status(201).json(fileRecord);
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Get files for user's team
  app.get("/api/files", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const files = await storage.getFiles(user.teamId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  // Get transactions from processed file
  app.get("/api/files/:id/transactions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const fileId = req.params.id;

      // Verify file belongs to user's team
      const file = await storage.getFile(fileId, user.teamId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Get transactions created from this file
      const transactions = await storage.getTransactions(user.teamId, {
        // Note: This would require adding a fileId field to transactions
        // For now, we'll return all transactions as a placeholder
      });

      res.json(transactions);
    } catch (error) {
      console.error("Error fetching file transactions:", error);
      res.status(500).json({ message: "Failed to fetch file transactions" });
    }
  });

  // Delete file and associated transactions
  app.delete("/api/files/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const fileId = req.params.id;

      // Verify file belongs to user's team
      const file = await storage.getFile(fileId, user.teamId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Delete the physical file
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.error("Error deleting physical file:", error);
        // Continue with database deletion even if file doesn't exist
      }

      // Delete file record from database
      const success = await storage.deleteFile(fileId, user.teamId);
      if (!success) {
        return res.status(404).json({ message: "File not found" });
      }

      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // Async file processing function
  async function processFileAsync(fileRecord: any, teamId: string, userId: string) {
    try {
      // Update status to processing
      await storage.updateFile(fileRecord.id, { status: 'processing' });

      let transactions: any[] = [];

      // Process based on file type
      switch (fileRecord.mimetype) {
        case 'text/csv':
          transactions = await processCSVFile(fileRecord.path);
          break;
        case 'application/vnd.ms-excel':
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          transactions = await processExcelFile(fileRecord.path);
          break;
        case 'application/pdf':
          transactions = await processPDFFile(fileRecord.path);
          break;
      }

      // Create transaction records
      let createdCount = 0;
      for (const txData of transactions) {
        try {
          await storage.createTransaction({
            ...txData,
            teamId,
            userId,
            source: 'file',
            sourceFileId: fileRecord.id,
          });
          createdCount++;
        } catch (error) {
          console.error('Error creating transaction from file:', error);
        }
      }

      // Update file status to completed
      await storage.updateFile(fileRecord.id, { 
        status: 'completed',
        processedAt: new Date(),
        transactionCount: createdCount.toString()
      });

    } catch (error) {
      console.error('Error processing file:', error);
      await storage.updateFile(fileRecord.id, { 
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async function processCSVFile(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const transactions: any[] = [];
      const readableStream = createReadStream(filePath);

      readableStream
        .pipe(csvParser())
        .on('data', (row: any) => {
          try {
            // Try to parse common CSV formats
            const transaction = parseCsvRow(row);
            if (transaction) {
              transactions.push(transaction);
            }
          } catch (error) {
            console.error('Error parsing CSV row:', error);
          }
        })
        .on('end', () => {
          resolve(transactions);
        })
        .on('error', (error: any) => {
          reject(error);
        });
    });
  }

  async function processExcelFile(filePath: string): Promise<any[]> {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const transactions: any[] = [];
    for (const row of data as any[]) {
      try {
        const transaction = parseExcelRow(row);
        if (transaction) {
          transactions.push(transaction);
        }
      } catch (error) {
        console.error('Error parsing Excel row:', error);
      }
    }

    return transactions;
  }

  async function processPDFFile(filePath: string): Promise<any[]> {
    const fileBuffer = await fs.readFile(filePath);
    const pdf = (await import('pdf-parse')).default;
    const pdfData = await pdf(fileBuffer);
    
    // Basic PDF text parsing - this would need to be more sophisticated
    // for real bank statements
    const lines = pdfData.text.split('\n');
    const transactions: any[] = [];

    for (const line of lines) {
      try {
        const transaction = parsePdfLine(line);
        if (transaction) {
          transactions.push(transaction);
        }
      } catch (error) {
        console.error('Error parsing PDF line:', error);
      }
    }

    return transactions;
  }

  function parseCsvRow(row: any): any | null {
    // Try to identify common column names and formats
    const dateFields = ['date', 'fecha', 'Date', 'Fecha', 'transaction_date'];
    const descriptionFields = ['description', 'descripcion', 'Description', 'Descripcion', 'memo', 'concept'];
    const amountFields = ['amount', 'monto', 'Amount', 'Monto', 'value', 'valor'];

    let date = null;
    let description = null;
    let amount = null;

    // Find date field
    for (const field of dateFields) {
      if (row[field]) {
        date = parseDate(row[field]);
        break;
      }
    }

    // Find description field
    for (const field of descriptionFields) {
      if (row[field]) {
        description = String(row[field]).trim();
        break;
      }
    }

    // Find amount field
    for (const field of amountFields) {
      if (row[field]) {
        const parsed = parseFloat(String(row[field]).replace(/[^-\d.]/g, ''));
        if (!isNaN(parsed)) {
          amount = parsed.toString();
          break;
        }
      }
    }

    if (date && description && amount) {
      return {
        date,
        description,
        amount,
        status: 'active',
        isAiSuggested: false,
      };
    }

    return null;
  }

  function parseExcelRow(row: any): any | null {
    // Similar logic to CSV parsing
    return parseCsvRow(row);
  }

  function parsePdfLine(line: string): any | null {
    // Basic regex patterns for common bank statement formats
    // This is a simplified example - real implementation would need more sophisticated parsing
    const patterns = [
      // Pattern: DD/MM/YYYY Description Amount
      /(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+([-+]?\d+(?:\.\d{2})?)\s*$/,
      // Pattern: YYYY-MM-DD Description Amount
      /(\d{4}-\d{2}-\d{2})\s+(.+?)\s+([-+]?\d+(?:\.\d{2})?)\s*$/,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const [, dateStr, description, amountStr] = match;
        const date = parseDate(dateStr);
        const amount = parseFloat(amountStr);

        if (date && description.trim() && !isNaN(amount)) {
          return {
            date,
            description: description.trim(),
            amount: amount.toString(),
            status: 'active',
            isAiSuggested: false,
          };
        }
      }
    }

    return null;
  }

  function parseDate(dateStr: string): string | null {
    try {
      // Try different date formats
      const formats = [
        // DD/MM/YYYY
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        // MM/DD/YYYY
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        // YYYY-MM-DD
        /^(\d{4})-(\d{2})-(\d{2})$/,
      ];

      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          const [, first, second, third] = match;
          
          // Assume YYYY-MM-DD if first part is 4 digits
          if (first.length === 4) {
            const date = new Date(parseInt(first), parseInt(second) - 1, parseInt(third));
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          } else {
            // Try DD/MM/YYYY format first
            const date = new Date(parseInt(third), parseInt(second) - 1, parseInt(first));
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          }
        }
      }

      // Fallback: try to parse as-is
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (error) {
      console.error('Error parsing date:', dateStr, error);
    }

    return null;
  }

  // Notification endpoints
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const notifications = await storage.getNotifications(user.teamId, user.id);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const notificationId = req.params.id;
      
      const success = await storage.markNotificationAsRead(notificationId, user.teamId);
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put("/api/notifications/read-all", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      
      // Get all unread notifications for the user
      const notifications = await storage.getNotifications(user.teamId, user.id);
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      // Mark each as read
      const promises = unreadNotifications.map(n => 
        storage.markNotificationAsRead(n.id, user.teamId)
      );
      
      await Promise.all(promises);
      
      res.json({ 
        message: "All notifications marked as read",
        count: unreadNotifications.length
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const { title, message, type, userId } = req.body;

      // Basic validation
      if (!title || !message || !type) {
        return res.status(400).json({ message: "Title, message, and type are required" });
      }

      // Create notification
      const notification = await storage.createNotification({
        teamId: user.teamId,
        userId: userId || user.id, // If no specific user, create for current user
        title,
        body: message,
        type,
        isRead: false,
      });

      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  // AI Agent routes
  
  // Chat session management
  app.get("/api/agent/sessions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const chatSessions = await storage.getChatSessions(user.teamId, user.id);
      res.json(chatSessions);
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
      res.status(500).json({ message: "Failed to fetch chat sessions" });
    }
  });

  app.post("/api/agent/sessions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const { title } = req.body;

      if (!title || typeof title !== 'string') {
        return res.status(400).json({ message: "Title is required" });
      }

      const chatSession = await storage.createChatSession({
        title,
        teamId: user.teamId,
        userId: user.id,
      });

      res.json(chatSession);
    } catch (error) {
      console.error("Error creating chat session:", error);
      res.status(500).json({ message: "Failed to create chat session" });
    }
  });

  app.put("/api/agent/sessions/:sessionId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { sessionId } = req.params;
      const { title } = req.body;

      if (!title || typeof title !== 'string') {
        return res.status(400).json({ message: "Title is required" });
      }

      const chatSession = await storage.updateChatSession(sessionId, title);
      res.json(chatSession);
    } catch (error) {
      console.error("Error updating chat session:", error);
      res.status(500).json({ message: "Failed to update chat session" });
    }
  });

  app.delete("/api/agent/sessions/:sessionId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { sessionId } = req.params;
      await storage.deleteChatSession(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting chat session:", error);
      res.status(500).json({ message: "Failed to delete chat session" });
    }
  });

  app.get("/api/agent/sessions/:sessionId/conversations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { sessionId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const conversations = await storage.getConversations(sessionId, limit);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversation history:", error);
      res.status(500).json({ message: "Failed to fetch conversation history" });
    }
  });

  app.post("/api/agent/chat", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const { message, sessionId } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ message: "Session ID is required" });
      }

      // Import agent here to avoid circular dependency issues
      const { financeAgent } = await import("./agent");

      // Get context data
      const team = await storage.getTeam(user.teamId);

      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const context = {
        user,
        team,
        storage
      };

      // Load conversation history for this session
      const conversations = await storage.getConversations(sessionId, 20); // Get last 20 messages for context
      const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      
      // Convert stored conversations to the format expected by the LLM
      conversations.reverse().forEach(conv => {
        conversationHistory.push({ role: 'user', content: conv.message });
        
        // Include tool usage information in the assistant response context
        let assistantContent = conv.response;
        if (conv.context && typeof conv.context === 'object' && 'toolsUsed' in conv.context) {
          const toolsUsed = conv.context.toolsUsed as string[];
          if (Array.isArray(toolsUsed) && toolsUsed.length > 0) {
            assistantContent += `\n\n[Herramientas utilizadas: ${toolsUsed.join(', ')}]`;
          }
        }
        
        conversationHistory.push({ role: 'assistant', content: assistantContent });
      });

      // Get AI response with conversation history
      const result = await financeAgent.chat(message, context, conversationHistory);

      // Store conversation
      await storage.createConversation({
        message,
        response: result.response,
        context: { teamId: user.teamId, userId: user.id, toolsUsed: result.toolsUsed },
        sessionId,
        teamId: user.teamId,
        userId: user.id
      });

      res.json({ response: result.response, toolsUsed: result.toolsUsed });
    } catch (error) {
      console.error("Error in agent chat:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // Chat with file upload
  app.post("/api/agent/chat-with-file", upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const { message = '', sessionId } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "File is required" });
      }

      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ message: "Session ID is required" });
      }

      // Import agent here to avoid circular dependency issues
      const { financeAgent } = await import("./agent");

      // Get context data
      const team = await storage.getTeam(user.teamId);

      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const context = {
        user,
        team,
        storage
      };

      // Load conversation history for this session
      const conversations = await storage.getConversations(sessionId, 20);
      const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      
      conversations.reverse().forEach(conv => {
        conversationHistory.push({ role: 'user', content: conv.message });
        
        let assistantContent = conv.response;
        if (conv.context && typeof conv.context === 'object' && 'toolsUsed' in conv.context) {
          const toolsUsed = conv.context.toolsUsed as string[];
          if (Array.isArray(toolsUsed) && toolsUsed.length > 0) {
            assistantContent += `\n\n[Herramientas utilizadas: ${toolsUsed.join(', ')}]`;
          }
        }
        
        conversationHistory.push({ role: 'assistant', content: assistantContent });
      });

      // Read and process the uploaded file
      let fileContent = '';
      let fileAnalysis = '';

      try {
        // Determine file type and extract content
        if (file.mimetype === 'text/csv') {
          fileContent = await fs.readFile(file.path, 'utf-8');
          fileAnalysis = await financeAgent.analyzeFile(fileContent, file.filename, context);
        } else if (file.mimetype.includes('sheet') || file.filename.endsWith('.xlsx') || file.filename.endsWith('.xls')) {
          const workbook = XLSX.readFile(file.path);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          fileContent = XLSX.utils.sheet_to_csv(worksheet);
          fileAnalysis = await financeAgent.analyzeFile(fileContent, file.filename, context);
        } else if (file.mimetype === 'application/pdf') {
          const pdfBuffer = await fs.readFile(file.path);
          const pdf = (await import('pdf-parse')).default;
          const pdfData = await pdf(pdfBuffer);
          fileContent = pdfData.text;
          fileAnalysis = await financeAgent.analyzeFile(fileContent, file.filename, context);
        } else if (file.mimetype.startsWith('image/')) {
          // For images, use the vision API to analyze
          fileAnalysis = await financeAgent.analyzeImageWithFile(file.path, message, context);
        } else {
          // Try to read as text
          fileContent = await fs.readFile(file.path, 'utf-8');
          fileAnalysis = await financeAgent.analyzeFile(fileContent, file.filename, context);
        }
      } catch (error) {
        console.error("Error processing file:", error);
        fileAnalysis = `He recibido el archivo "${file.filename}", pero tuve dificultades para procesarlo. ¿Podrías describir qué tipo de información contiene para poder ayudarte mejor?`;
      }

      // Create the combined message with file context
      const combinedMessage = message 
        ? `${message}\n\n[Archivo adjunto: ${file.filename}]\n${fileAnalysis}`
        : `He subido el archivo: ${file.filename}\n\n${fileAnalysis}`;

      // Get AI response with file context
      const result = await financeAgent.chat(combinedMessage, context, conversationHistory);

      // Store conversation with file information
      await storage.createConversation({
        message: message || `He subido el archivo: ${file.filename}`,
        response: result.response,
        context: { 
          teamId: user.teamId, 
          userId: user.id, 
          toolsUsed: result.toolsUsed,
          fileInfo: {
            name: file.filename,
            size: file.size,
            type: file.mimetype,
            originalPath: file.path
          }
        },
        sessionId,
        teamId: user.teamId,
        userId: user.id
      });

      // Clean up temporary file
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.error("Error cleaning up temporary file:", error);
      }

      res.json({ response: result.response, toolsUsed: result.toolsUsed });
    } catch (error) {
      console.error("Error in agent chat with file:", error);
      
      // Clean up file if it exists
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error("Error cleaning up file after error:", cleanupError);
        }
      }
      
      res.status(500).json({ message: "Failed to process chat message with file" });
    }
  });

  // Chat with image uploads (supports multiple images)
  app.post("/api/agent/chat-with-images", imageUpload.array('images', 5), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const { message = '', sessionId } = req.body;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "At least one image is required" });
      }

      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ message: "Session ID is required" });
      }

      // Import agent here to avoid circular dependency issues
      const { financeAgent } = await import("./agent");

      // Get context data
      const team = await storage.getTeam(user.teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const context = {
        user,
        team,
        storage
      };

      // Load conversation history for this session
      const conversations = await storage.getConversations(sessionId, 20);
      const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      
      conversations.reverse().forEach(conv => {
        conversationHistory.push({ role: 'user', content: conv.message });
        
        let assistantContent = conv.response;
        if (conv.context && typeof conv.context === 'object' && 'toolsUsed' in conv.context) {
          const toolsUsed = conv.context.toolsUsed as string[];
          if (Array.isArray(toolsUsed) && toolsUsed.length > 0) {
            assistantContent += `\n\n[Herramientas utilizadas: ${toolsUsed.join(', ')}]`;
          }
        }
        
        conversationHistory.push({ role: 'assistant', content: assistantContent });
      });

      // Create message with image context
      const imagesList = files.map(f => f.filename).join(', ');
      const combinedMessage = message 
        ? `${message}\n\n[Imágenes adjuntas: ${imagesList}]`
        : `He subido ${files.length} imagen(es): ${imagesList}`;

      // Get AI response with images
      const imagePaths = files.map(f => f.path);
      const result = await financeAgent.chat(combinedMessage, context, conversationHistory, imagePaths);

      // Store conversation with image information
      await storage.createConversation({
        message: message || `He subido ${files.length} imagen(es)`,
        response: result.response,
        context: { 
          teamId: user.teamId, 
          userId: user.id, 
          toolsUsed: result.toolsUsed,
          imageInfo: files.map(f => ({
            name: f.filename,
            size: f.size,
            type: f.mimetype,
            originalPath: f.path
          }))
        },
        sessionId,
        teamId: user.teamId,
        userId: user.id
      });

      // Clean up temporary files
      for (const file of files) {
        try {
          await fs.unlink(file.path);
        } catch (error) {
          console.error("Error cleaning up temporary image file:", error);
        }
      }

      res.json({ response: result.response, toolsUsed: result.toolsUsed });
    } catch (error) {
      console.error("Error in agent chat with images:", error);
      
      // Clean up files if they exist
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files as Express.Multer.File[]) {
          try {
            await fs.unlink(file.path);
          } catch (cleanupError) {
            console.error("Error cleaning up image file after error:", cleanupError);
          }
        }
      }
      
      res.status(500).json({ message: "Failed to process chat message with images" });
    }
  });

  // Analyze file by ID and send to chat
  app.post("/api/agent/analyze-and-chat", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const { fileId, sessionId, message } = req.body;

      if (!fileId || !sessionId || !message) {
        return res.status(400).json({ message: "File ID, session ID, and message are required" });
      }

      // Get the file from storage
      const file = await storage.getFile(fileId, user.teamId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Import agent here to avoid circular dependency issues
      const { financeAgent } = await import("./agent");

      // Get context data
      const team = await storage.getTeam(user.teamId);

      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const context = {
        user,
        team,
        storage
      };

      // Load conversation history for this session
      const conversations = await storage.getConversations(sessionId, 20);
      const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      
      conversations.reverse().forEach(conv => {
        conversationHistory.push({ role: 'user', content: conv.message });
        
        let assistantContent = conv.response;
        if (conv.context && typeof conv.context === 'object' && 'toolsUsed' in conv.context) {
          const toolsUsed = conv.context.toolsUsed as string[];
          if (Array.isArray(toolsUsed) && toolsUsed.length > 0) {
            assistantContent += `\n\n[Herramientas utilizadas: ${toolsUsed.join(', ')}]`;
          }
        }
        
        conversationHistory.push({ role: 'assistant', content: assistantContent });
      });

      // Read and process the file
      let fileContent = '';
      let fileAnalysis = '';

      try {
        // Determine file type and extract content
        if (file.mimetype === 'text/csv') {
          fileContent = await fs.readFile(file.path, 'utf-8');
          fileAnalysis = await financeAgent.analyzeFile(fileContent, file.filename, context);
        } else if (file.mimetype.includes('sheet') || file.filename.endsWith('.xlsx') || file.filename.endsWith('.xls')) {
          const workbook = XLSX.readFile(file.path);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          fileContent = XLSX.utils.sheet_to_csv(worksheet);
          fileAnalysis = await financeAgent.analyzeFile(fileContent, file.filename, context);
        } else if (file.mimetype === 'application/pdf') {
          const pdfBuffer = await fs.readFile(file.path);
          const pdf = (await import('pdf-parse')).default;
          const pdfData = await pdf(pdfBuffer);
          fileContent = pdfData.text;
          fileAnalysis = await financeAgent.analyzeFile(fileContent, file.filename, context);
        } else {
          // Try to read as text
          fileContent = await fs.readFile(file.path, 'utf-8');
          fileAnalysis = await financeAgent.analyzeFile(fileContent, file.filename, context);
        }
      } catch (error) {
        console.error("Error processing file:", error);
        fileAnalysis = `He recibido el archivo "${file.filename}", pero tuve dificultades para procesarlo. ¿Podrías describir qué tipo de información contiene para poder ayudarte mejor?`;
      }

      // Create the combined message with file context
      const combinedMessage = `${message}\n\n[Archivo: ${file.filename}]\n${fileAnalysis}`;

      // Get AI response with file context
      const result = await financeAgent.chat(combinedMessage, context, conversationHistory);

      // Store conversation with file information
      await storage.createConversation({
        message: message,
        response: result.response,
        context: { 
          teamId: user.teamId, 
          userId: user.id, 
          toolsUsed: result.toolsUsed,
          fileInfo: {
            id: file.id,
            name: file.filename,
            size: parseInt(file.size),
            type: file.mimetype,
            path: file.path
          }
        },
        sessionId,
        teamId: user.teamId,
        userId: user.id
      });

      res.json({ response: result.response, toolsUsed: result.toolsUsed });
    } catch (error) {
      console.error("Error in agent analyze and chat:", error);
      res.status(500).json({ message: "Failed to process file analysis request" });
    }
  });

  // Legacy route for backwards compatibility
  app.get("/api/agent/history", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      // Get the most recent chat session and return its conversations
      const chatSessions = await storage.getChatSessions(user.teamId, user.id);
      
      if (chatSessions.length === 0) {
        return res.json([]);
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const conversations = await storage.getConversations(chatSessions[0].id, limit);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversation history:", error);
      res.status(500).json({ message: "Failed to fetch conversation history" });
    }
  });

  app.post("/api/agent/analyze-file", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const { fileId } = req.body;

      if (!fileId) {
        return res.status(400).json({ message: "File ID is required" });
      }

      const file = await storage.getFile(fileId, user.teamId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Read file content
      let fileContent = '';
      try {
        if (file.mimetype === 'text/csv') {
          fileContent = await fs.readFile(file.path, 'utf-8');
        } else if (file.mimetype.includes('sheet') || file.path.endsWith('.xlsx')) {
          const workbook = XLSX.readFile(file.path);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          fileContent = XLSX.utils.sheet_to_csv(worksheet);
        } else if (file.mimetype === 'application/pdf') {
          const pdfBuffer = await fs.readFile(file.path);
          const pdf = (await import('pdf-parse')).default;
          const pdfData = await pdf(pdfBuffer);
          fileContent = pdfData.text;
        } else {
          fileContent = await fs.readFile(file.path, 'utf-8');
        }
      } catch (error) {
        console.error("Error reading file:", error);
        return res.status(500).json({ message: "Failed to read file content" });
      }

      // Import agent
      const { financeAgent } = await import("./agent");

      // Get context
      const team = await storage.getTeam(user.teamId);

      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const context = {
        user,
        team,
        storage
      };

      // Analyze file
      const analysis = await financeAgent.analyzeFile(fileContent, file.filename, context);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing file:", error);
      res.status(500).json({ message: "Failed to analyze file" });
    }
  });

  app.post("/api/agent/suggest-categories", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const { transactionIds } = req.body;

      if (!transactionIds || !Array.isArray(transactionIds)) {
        return res.status(400).json({ message: "Transaction IDs array is required" });
      }

      // Get transactions and categories
      const [categories, transactions] = await Promise.all([
        storage.getCategories(user.teamId),
        Promise.all(
          transactionIds.map(id => storage.getTransaction(id, user.teamId))
        )
      ]);

      const validTransactions = transactions.filter(t => t !== undefined);

      if (validTransactions.length === 0) {
        return res.status(404).json({ message: "No valid transactions found" });
      }

      // Import agent
      const { financeAgent } = await import("./agent");

      // Get suggestions
      const suggestions = await financeAgent.suggestCategories(validTransactions, categories);
      res.json({ suggestions });
    } catch (error) {
      console.error("Error suggesting categories:", error);
      res.status(500).json({ message: "Failed to suggest categories" });
    }
  });

  app.post("/api/agent/create-rules", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;

      // Get recent transactions and categories
      const [categories, transactions] = await Promise.all([
        storage.getCategories(user.teamId),
        storage.getTransactions(user.teamId, { limit: 100 })
      ]);

      // Import agent
      const { financeAgent } = await import("./agent");

      // Generate rules
      const suggestedRules = await financeAgent.createRules(transactions, categories);
      res.json({ rules: suggestedRules });
    } catch (error) {
      console.error("Error creating rules:", error);
      res.status(500).json({ message: "Failed to create rules" });
    }
  });

  // Dashboard Analytics endpoints
  app.get("/api/dashboard", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const { period = 'current-month' } = req.query;
      
      // Calculate date range based on period
      let fromDate: string;
      let toDate: string;
      const now = new Date();
      
      switch (period) {
        case 'last-month':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          fromDate = lastMonth.toISOString().slice(0, 7) + '-01';
          toDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).toISOString().slice(0, 10);
          break;
        case 'current-year':
          fromDate = `${now.getFullYear()}-01-01`;
          toDate = `${now.getFullYear()}-12-31`;
          break;
        case 'current-month':
        default:
          const currentMonth = now.toISOString().slice(0, 7);
          fromDate = `${currentMonth}-01`;
          toDate = `${currentMonth}-31`;
          break;
      }
      
      // Get dashboard summary data
      const [
        team,
        recentTransactions,
        categories,
        budgets,
        notifications
      ] = await Promise.all([
        storage.getTeam(user.teamId),
        storage.getTransactions(user.teamId, { limit: 10 }),
        storage.getCategories(user.teamId),
        storage.getBudgets(user.teamId),
        storage.getNotifications(user.teamId, user.id)
      ]);

      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Calculate summary statistics for selected period
      const periodTransactions = await storage.getTransactions(user.teamId, {
        fromDate,
        toDate
      });

      const totalIncome = periodTransactions
        .filter(t => parseFloat(t.amount) > 0)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const totalExpenses = periodTransactions
        .filter(t => parseFloat(t.amount) < 0)
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

      const netFlow = totalIncome - totalExpenses;

      // Calculate budget analytics for the selected period
      const periodMonth = fromDate.slice(0, 7); // Use the period's month for budget calculations
      const budgetSummary = await calculateBudgetSummary(user.teamId, budgets, periodMonth);

      // Get unread notifications count
      const unreadNotifications = notifications.filter(n => !n.isRead).length;

      // Get spending by category for selected period
      const spendingByCategory = await calculateSpendingByCategory(user.teamId, periodMonth);

      const dashboard = {
        summary: {
          totalIncome,
          totalExpenses,
          netFlow,
          transactionCount: periodTransactions.length
        },
        budgets: budgetSummary,
        recentTransactions: recentTransactions.slice(0, 5),
        notifications: {
          unread: unreadNotifications,
          recent: notifications.slice(0, 3)
        },
        spendingByCategory,
        alerts: generateAlerts(budgetSummary, spendingByCategory)
      };

      res.json(dashboard);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  app.get("/api/analytics/spending", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const { period = 'month', months = 6 } = req.query;

      // Calculate spending analytics for the specified period
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - parseInt(months.toString()));

      const transactions = await storage.getTransactions(user.teamId, {
        fromDate: startDate.toISOString().split('T')[0],
        toDate: endDate.toISOString().split('T')[0]
      });

      const analytics = calculateSpendingAnalytics(transactions, period.toString());
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching spending analytics:", error);
      res.status(500).json({ message: "Failed to fetch spending analytics" });
    }
  });

  app.get("/api/analytics/trends", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const { period = 'month', months = 12 } = req.query;

      // Get trend data for the specified period
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - parseInt(months.toString()));

      const transactions = await storage.getTransactions(user.teamId, {
        fromDate: startDate.toISOString().split('T')[0],
        toDate: endDate.toISOString().split('T')[0]
      });

      const trends = calculateSpendingTrends(transactions, period.toString());
      res.json(trends);
    } catch (error) {
      console.error("Error fetching spending trends:", error);
      res.status(500).json({ message: "Failed to fetch spending trends" });
    }
  });

  app.get("/api/analytics/categories", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const { period = 'month', months = 3 } = req.query;

      // Get category breakdown for the specified period
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - parseInt(months.toString()));

      const [transactions, categories] = await Promise.all([
        storage.getTransactions(user.teamId, {
          fromDate: startDate.toISOString().split('T')[0],
          toDate: endDate.toISOString().split('T')[0]
        }),
        storage.getCategories(user.teamId)
      ]);

      const categoryBreakdown = calculateCategoryBreakdown(transactions, categories);
      res.json(categoryBreakdown);
    } catch (error) {
      console.error("Error fetching category analytics:", error);
      res.status(500).json({ message: "Failed to fetch category analytics" });
    }
  });

  // Helper functions for dashboard analytics
  interface BudgetSummary {
    totalBudget: number;
    totalSpent: number;
    overBudgetCategories: number;
    underBudgetCategories: number;
    categories: Array<{
      categoryId: string;
      budgetAmount: number;
      spentAmount: number;
      percentage: number;
      isOverBudget: boolean;
    }>;
  }

  async function calculateBudgetSummary(teamId: string, budgets: any[], month: string): Promise<BudgetSummary> {
    const summary: BudgetSummary = {
      totalBudget: 0,
      totalSpent: 0,
      overBudgetCategories: 0,
      underBudgetCategories: 0,
      categories: []
    };

    for (const budget of budgets) {
      const spent = await calculateCategorySpending(teamId, budget.categoryId, month);
      const budgetAmount = parseFloat(budget.amount);
      const spentAmount = Math.abs(spent);
      const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

      summary.totalBudget += budgetAmount;
      summary.totalSpent += spentAmount;

      if (spentAmount > budgetAmount) {
        summary.overBudgetCategories++;
      } else {
        summary.underBudgetCategories++;
      }

      summary.categories.push({
        categoryId: budget.categoryId,
        budgetAmount,
        spentAmount,
        percentage,
        isOverBudget: spentAmount > budgetAmount
      });
    }

    return summary;
  }

  async function calculateCategorySpending(teamId: string, categoryId: string, month: string) {
    const transactions = await storage.getTransactions(teamId, {
      categoryId,
      fromDate: `${month}-01`,
      toDate: `${month}-31`
    });

    return transactions
      .filter(t => parseFloat(t.amount) < 0) // Only expenses
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  }

  async function calculateSpendingByCategory(teamId: string, month: string) {
    const [transactions, categories] = await Promise.all([
      storage.getTransactions(teamId, {
        fromDate: `${month}-01`,
        toDate: `${month}-31`
      }),
      storage.getCategories(teamId)
    ]);

    const categorySpending: Record<string, number> = {};
    
    transactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount);
      if (amount < 0) { // Only count expenses
        const categoryId = transaction.categoryId;
        if (!categorySpending[categoryId]) {
          categorySpending[categoryId] = 0;
        }
        categorySpending[categoryId] += Math.abs(amount);
      }
    });

    return categories.map(category => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      amount: categorySpending[category.id] || 0
    })).sort((a, b) => b.amount - a.amount);
  }

  interface Alert {
    type: string;
    severity: string;
    message: string;
    data: any;
  }

  function generateAlerts(budgetSummary: any, spendingByCategory: any[]): Alert[] {
    const alerts: Alert[] = [];

    // Budget alerts
    budgetSummary.categories.forEach((category: any) => {
      if (category.isOverBudget) {
        alerts.push({
          type: 'budget_exceeded',
          severity: 'high',
          message: `Budget exceeded for category ${category.categoryId}`,
          data: category
        });
      } else if (category.percentage > 80) {
        alerts.push({
          type: 'budget_warning',
          severity: 'medium',
          message: `Approaching budget limit for category ${category.categoryId}`,
          data: category
        });
      }
    });

    // High spending alerts
    const avgSpending = spendingByCategory.reduce((sum, cat) => sum + cat.amount, 0) / spendingByCategory.length;
    spendingByCategory.forEach(category => {
      if (category.amount > avgSpending * 2) {
        alerts.push({
          type: 'high_spending',
          severity: 'medium',
          message: `Unusually high spending in ${category.name}`,
          data: category
        });
      }
    });

    return alerts;
  }

  function calculateSpendingAnalytics(transactions: any[], period: string) {
    const analytics = {
      totalTransactions: transactions.length,
      totalIncome: 0,
      totalExpenses: 0,
      averageTransaction: 0,
      largestExpense: 0,
      largestIncome: 0,
      trends: []
    };

    transactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount);
      if (amount > 0) {
        analytics.totalIncome += amount;
        analytics.largestIncome = Math.max(analytics.largestIncome, amount);
      } else {
        const expense = Math.abs(amount);
        analytics.totalExpenses += expense;
        analytics.largestExpense = Math.max(analytics.largestExpense, expense);
      }
    });

    analytics.averageTransaction = transactions.length > 0 
      ? (analytics.totalIncome + analytics.totalExpenses) / transactions.length 
      : 0;

    return analytics;
  }

  function calculateSpendingTrends(transactions: any[], period: string) {
    const trends: Record<string, { income: number; expenses: number; transactions: number }> = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const key = period === 'month' 
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : `${date.getFullYear()}-W${getWeekNumber(date)}`;
      
      if (!trends[key]) {
        trends[key] = { income: 0, expenses: 0, transactions: 0 };
      }
      
      const amount = parseFloat(transaction.amount);
      if (amount > 0) {
        trends[key].income += amount;
      } else {
        trends[key].expenses += Math.abs(amount);
      }
      trends[key].transactions++;
    });

    return Object.entries(trends)
      .map(([period, data]) => ({ period, ...data }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  function calculateCategoryBreakdown(transactions: any[], categories: any[]) {
    const breakdown: Record<string, { income: number; expenses: number; transactions: number }> = {};
    
    transactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount);
      const categoryId = transaction.categoryId;
      
      if (!breakdown[categoryId]) {
        breakdown[categoryId] = {
          income: 0,
          expenses: 0,
          transactions: 0
        };
      }
      
      if (amount > 0) {
        breakdown[categoryId].income += amount;
      } else {
        breakdown[categoryId].expenses += Math.abs(amount);
      }
      breakdown[categoryId].transactions++;
    });

    return categories.map(category => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      ...breakdown[category.id] || { income: 0, expenses: 0, transactions: 0 }
    }));
  }

  // Health check endpoint with database status
  app.get("/api/health", async (req, res) => {
    try {
      const dbConnected = await checkDatabaseConnection();
      const status = {
        status: dbConnected ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        services: {
          database: dbConnected ? "connected" : "disconnected",
          server: "running"
        },
        environment: process.env.NODE_ENV || "unknown"
      };
      
      res.status(dbConnected ? 200 : 503).json(status);
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        services: {
          database: "error",
          server: "running"
        },
        error: error instanceof Error ? error.message : "Unknown error",
        environment: process.env.NODE_ENV || "unknown"
      });
    }
  });

  function getWeekNumber(date: Date) {
    const firstJanuary = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - firstJanuary.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + firstJanuary.getDay() + 1) / 7);
  }

  const httpServer = createServer(app);
  return httpServer;
}
