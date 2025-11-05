
import { db } from '../shared/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function backupDatabase() {
  console.log('Starting database backup...');

  try {
    // Create backups directory if it doesn't exist
    const backupDir = path.join(process.cwd(), 'database-backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

    // Get all table names from schema
    const tables = [
      'categories',
      'chefs',
      'products',
      'admin_users',
      'partner_users',
      'subscription_plans',
      'subscriptions',
      'orders',
      'delivery_settings',
      'delivery_personnel',
      'users',
      'sessions'
    ];

    let sqlDump = `-- Database Backup Generated: ${new Date().toISOString()}\n`;
    sqlDump += `-- PostgreSQL Database Dump\n\n`;

    // Export data from each table
    for (const table of tables) {
      console.log(`Backing up table: ${table}`);
      
      try {
        const result = await db.execute(sql.raw(`SELECT * FROM ${table}`));
        const rows = result.rows;

        if (rows && rows.length > 0) {
          sqlDump += `\n-- Data for table: ${table}\n`;
          sqlDump += `DELETE FROM ${table};\n`;

          for (const row of rows) {
            const columns = Object.keys(row).join(', ');
            const values = Object.values(row).map(val => {
              if (val === null) return 'NULL';
              if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
              if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
              if (val instanceof Date) return `'${val.toISOString()}'`;
              return val;
            }).join(', ');

            sqlDump += `INSERT INTO ${table} (${columns}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
          }
        }
      } catch (error) {
        console.log(`Note: Table ${table} might not exist yet or is empty`);
      }
    }

    // Write to file
    fs.writeFileSync(backupFile, sqlDump);
    console.log(`✓ Backup saved to: ${backupFile}`);

    // Also create a JSON backup for easier inspection
    const jsonBackupFile = path.join(backupDir, `backup-${timestamp}.json`);
    const jsonBackup: any = {};

    for (const table of tables) {
      try {
        const result = await db.execute(sql.raw(`SELECT * FROM ${table}`));
        jsonBackup[table] = result.rows || [];
      } catch (error) {
        jsonBackup[table] = [];
      }
    }

    fs.writeFileSync(jsonBackupFile, JSON.stringify(jsonBackup, null, 2));
    console.log(`✓ JSON backup saved to: ${jsonBackupFile}`);

    console.log('\n✓ Database backup completed successfully!');
    console.log(`\nTo restore this backup later, run:`);
    console.log(`  npx tsx scripts/restore-database.ts ${path.basename(backupFile)}`);

  } catch (error) {
    console.error('Backup failed:', error);
    process.exit(1);
  }
}

backupDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Backup failed:', error);
    process.exit(1);
  });
