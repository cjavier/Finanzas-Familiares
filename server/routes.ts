import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTransactionSchema, insertCategorySchema, insertBudgetSchema } from "@shared/schema";

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
      const { categoryId, fromDate, toDate, status } = req.query;
      
      const transactions = await storage.getTransactions(user.teamId, {
        categoryId: categoryId as string,
        fromDate: fromDate as string,
        toDate: toDate as string,
        status: status as string,
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
      
      const updatedTransaction = await storage.updateTransaction(transactionId, validatedData);
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
      
      const success = await storage.deleteTransaction(transactionId, user.teamId);
      if (!success) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Failed to delete transaction" });
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

  const httpServer = createServer(app);
  return httpServer;
}
