import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';
import { newDb } from 'pg-mem';

dotenv.config({ override: false });

let pool: Pool | null = null;
let inMemoryDb: ReturnType<typeof newDb> | null = null;
let inMemoryAdapter: any = null;

export function getDb(): Pool {
  const isTestMode = process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_DB === 'true';

  if (isTestMode) {
    if (!pool) {
      inMemoryDb = newDb();
      
      inMemoryDb.public.registerFunction({
        name: 'gen_random_uuid',
        returns: 'uuid' as any,
        impure: true,
        implementation: () => crypto.randomUUID()
      });

      inMemoryDb.public.registerFunction({
        name: 'to_char',
        returns: 'text' as any,
        implementation: (val: any) => (val ? String(val) : '')
      });

      inMemoryAdapter = inMemoryDb.adapters.createPg();
      pool = new inMemoryAdapter.Pool() as unknown as Pool;
    }
    return pool;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('supabase')
        ? { rejectUnauthorized: false }
        : false
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  const isTestMode = process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_DB === 'true';
  let sql = text;

  if (isTestMode && sql.toLowerCase().includes('create extension')) {
    sql = sql.replace(/CREATE EXTENSION IF NOT EXISTS\s+"[^"]+";?/gi, '');
    if (!sql.trim()) {
      return { rows: [] };
    }
  }

  const safeParams = params?.map(p => (p === undefined ? null : p));

  const db = getDb();
  return db.query(sql, safeParams);
}

export async function getClient(): Promise<PoolClient> {
  const db = getDb();
  const client = await db.connect();
  
  const originalQuery = client.query.bind(client);
  client.query = (async (text: any, params?: any) => {
    let sql = text;
    if (typeof sql === 'string') {
      const isTestMode = process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_DB === 'true';
      if (isTestMode && sql.toLowerCase().includes('create extension')) {
        sql = sql.replace(/CREATE EXTENSION IF NOT EXISTS\s+"[^"]+";?/gi, '');
        if (!sql.trim()) return { rows: [] };
      }
    }
    const safeParams = Array.isArray(params) ? params.map(p => (p === undefined ? null : p)) : params;
    return originalQuery(sql, safeParams);
  }) as any;

  return client;
}

export async function verifyDbConnection() {
  const isTestMode = process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_DB === 'true';
  try {
    const res = await query('SELECT 1 as connected');
    if (res.rows.length > 0) {
      const dbType = isTestMode
        ? 'In-Memory PostgreSQL Engine'
        : process.env.DATABASE_URL?.includes('neon.tech')
        ? 'Neon Hosted PostgreSQL'
        : 'PostgreSQL Database';
      
      console.log('=======================================================');
      console.log('🟢 [PostgreSQL Status] CONNECTED SUCCESSFULLY!');
      console.log(`   Database Type : ${dbType}`);
      console.log(`   Status        : Ready for SQL Queries & Transactions`);
      console.log(`   Timestamp     : ${new Date().toISOString()}`);
      console.log('=======================================================\n');
      return true;
    }
  } catch (err: any) {
    console.error('=======================================================');
    console.error('🔴 [PostgreSQL Status] CONNECTION FAILED!');
    console.error(`   Error Message : ${err.message}`);
    console.error('=======================================================\n');
    return false;
  }
}

export { pool };
