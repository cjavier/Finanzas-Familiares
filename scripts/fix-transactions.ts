import "dotenv/config";
import { db, pool } from "../server/db";
import { transactions } from "@shared/schema";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Starting transaction fix script...");

  try {
    // Check for negative transactions
    const negativeTransactions = await db.execute(
      sql`SELECT count(*) as count FROM ${transactions} WHERE amount < 0`
    );
    
    const count = negativeTransactions.rows[0].count;
    console.log(`Found ${count} negative transactions.`);

    if (Number(count) > 0) {
      console.log("Fixing negative transactions...");
      
      // Update all negative transactions to absolute value
      const result = await db.execute(
        sql`UPDATE ${transactions} SET amount = ABS(amount) WHERE amount < 0`
      );

      console.log(`Updated transactions. Row count: ${result.rowCount}`);
    } else {
      console.log("No negative transactions found.");
    }
  } catch (error) {
    console.error("Error executing script:", error);
  } finally {
    await pool.end();
  }
}

main();

