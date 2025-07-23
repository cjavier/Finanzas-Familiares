import { db } from "./db";
import { categories } from "@shared/schema";

export const defaultCategories = [
  { name: "Income", icon: "💰", color: "#10B981" },
  { name: "Housing", icon: "🏠", color: "#3B82F6" },
  { name: "Food", icon: "🛒", color: "#059669" },
  { name: "Transportation", icon: "🚗", color: "#F59E0B" },
  { name: "Entertainment", icon: "🎬", color: "#EF4444" },
  { name: "Healthcare", icon: "🏥", color: "#8B5CF6" },
  { name: "Shopping", icon: "🛍", color: "#EC4899" },
  { name: "Other", icon: "📦", color: "#6B7280" },
];

export async function createDefaultCategories(teamId: string) {
  const categoryRecords = defaultCategories.map(category => ({
    ...category,
    teamId,
  }));

  return db.insert(categories).values(categoryRecords).returning();
}