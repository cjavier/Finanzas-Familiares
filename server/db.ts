import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// For Railway and standard PostgreSQL databases
console.log('🔍 Database type detected: Railway PostgreSQL (using standard pg driver)');

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export const db = drizzle({ client: pool, schema });

// Database connection check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    console.log('🔄 Checking database connection...');
    console.log('📊 Database URL configured:', process.env.DATABASE_URL ? 'YES' : 'NO');
    
    // Simple query to check connection
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    const row = result.rows[0];
    
    console.log('✅ Database connection successful!');
    console.log('⏰ Database time:', row.current_time);
    console.log('📦 Database version:', row.db_version.split(' ')[0]); // Show just PostgreSQL version
    console.log('🌐 Connection pool size:', pool.totalCount);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('🔍 Full error object:', error);
    console.error('🔍 Error message:', error instanceof Error ? error.message : String(error));
    console.error('🔍 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (error instanceof Error) {
      console.error('🔍 Error name:', error.name);
      console.error('🔍 Error cause:', error.cause);
      
      if (error.message.includes('ENOTFOUND')) {
        console.error('🌐 DNS resolution failed - check your DATABASE_URL host');
      } else if (error.message.includes('authentication')) {
        console.error('🔐 Authentication failed - check your database credentials');
      } else if (error.message.includes('connection')) {
        console.error('🔌 Connection issue - check network and database availability');
      } else if (error.message.includes('timeout')) {
        console.error('⏰ Connection timeout - database may be slow or unreachable');
      } else if (error.message.includes('ECONNREFUSED')) {
        console.error('🚫 Connection refused - check if database is running and accessible');
      }
    }
    
    return false;
  }
}
