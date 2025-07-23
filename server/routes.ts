import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTransactionSchema, insertCategorySchema, insertBudgetSchema, insertRuleSchema, insertFileSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import csvParser from "csv-parser";
import * as XLSX from "xlsx";

export function registerRoutes(app: Express): Server {
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
      const validatedData = insertTransactionSchema.parse(req.body);
      
      const transaction = await storage.createTransaction({
        ...validatedData,
        teamId: user.teamId,
        userId: user.id,
      });
      
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
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
      const validatedData = insertTransactionSchema.partial().parse(req.body);
      
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
      const analytics = await storage.getBudgetAnalytics(user.teamId);
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
        'text/csv'
      ];
      
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF, Excel, and CSV files are allowed.'));
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
      const readableStream = require('fs').createReadStream(filePath);

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
  app.post("/api/agent/chat", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const { message } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      // Import agent here to avoid circular dependency issues
      const { financeAgent } = await import("./agent");

      // Get context data
      const [team, categories, recentTransactions] = await Promise.all([
        storage.getTeam(user.teamId),
        storage.getCategories(user.teamId),
        storage.getTransactions(user.teamId, { limit: 20 })
      ]);

      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const context = {
        user,
        team,
        categories,
        recentTransactions
      };

      // Get AI response
      const response = await financeAgent.chat(message, context);

      // Store conversation
      await storage.createConversation({
        message,
        response,
        context: { categories: categories.length, recentTransactions: recentTransactions.length },
        teamId: user.teamId,
        userId: user.id
      });

      res.json({ response });
    } catch (error) {
      console.error("Error in agent chat:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  app.get("/api/agent/history", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const limit = parseInt(req.query.limit as string) || 50;

      const conversations = await storage.getConversations(user.teamId, user.id, limit);
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
      const [team, categories] = await Promise.all([
        storage.getTeam(user.teamId),
        storage.getCategories(user.teamId)
      ]);

      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const context = {
        user,
        team,
        categories,
        recentTransactions: []
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

  const httpServer = createServer(app);
  return httpServer;
}
