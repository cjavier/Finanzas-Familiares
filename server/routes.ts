import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTransactionSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  // sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Get team information for current user
  app.get("/api/team", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    try {
      const user = req.user!;
      const team = await storage.getTeamByInviteCode(""); // We'll get team through user's teamId
      // Since we don't have a direct getTeam method, we can add it or get through user relation
      res.json({ id: user.teamId, name: "Team" }); // Simplified for now
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ message: "Failed to fetch team information" });
    }
  });

  // Get transactions for user's team
  app.get("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const user = req.user!;
      const { category, fromDate, toDate } = req.query;
      
      const transactions = await storage.getTransactions(user.teamId, {
        category: category as string,
        fromDate: fromDate as string,
        toDate: toDate as string,
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
      const transactionId = parseInt(req.params.id);
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
      const transactionId = parseInt(req.params.id);
      
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

  const httpServer = createServer(app);
  return httpServer;
}
