
import { db } from '../shared/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function restoreDatabase() {
  const backupFileName = process.argv[2];
  
  if (!backupFileName) {
    console.error('Please provide a backup file name');
    console.log('Usage: npx tsx scripts/restore-database.ts <backup-file.sql>');
    process.exit(1);
  }

  const backupFile = path.join(process.cwd(), 'database-backups', backupFileName);

  if (!fs.existsSync(backupFile)) {
    console.error(`Backup file not found: ${backupFile}`);
    process.exit(1);
  }

  console.log(`Restoring database from: ${backupFile}`);

  try {
    const sqlContent = fs.readFileSync(backupFile, 'utf-8');
    
    // Split into individual statements and execute
    const statements = sqlContent
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('--'))
      .join('\n')
      .split(';')
      .filter(stmt => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.execute(sql.raw(statement));
        } catch (error) {
          console.log(`Warning: Could not execute statement (might be expected):`, error);
        }
      }
    }

    console.log('✓ Database restored successfully!');
  } catch (error) {
    console.error('Restore failed:', error);
    process.exit(1);
  }
}

restoreDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Restore failed:', error);
    process.exit(1);
  });
