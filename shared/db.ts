
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const client = neon(connectionString);
export const db = drizzle(client, { schema });

export { sql };
export const { users, categories, products, orders, chefs, adminUsers, partnerUsers, subscriptions, subscriptionPlans, deliverySettings } = schema;
