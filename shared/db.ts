// shared/db.ts (or wherever this file exists)

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });

export { sql };
export const {
  users,
  categories,
  products,
  orders,
  chefs,
  adminUsers,
  partnerUsers,
  subscriptions,
  subscriptionPlans,
  deliverySettings,
  deliveryPersonnel,
  coupons,
  referrals
} = schema;