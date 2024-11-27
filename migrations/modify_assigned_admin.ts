import { db } from '../db';
import { users } from '@db/schema';
import { sql } from 'drizzle-orm';

async function runMigration() {
  try {
    // Drop the foreign key constraint if it exists
    await db.execute(sql`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 
          FROM information_schema.table_constraints 
          WHERE constraint_name = 'users_assigned_admin_fkey'
        ) THEN
          ALTER TABLE users DROP CONSTRAINT users_assigned_admin_fkey;
        END IF;
      END $$;
    `);

    // Modify the column type to TEXT
    await db.execute(sql`
      ALTER TABLE users 
      ALTER COLUMN assigned_admin TYPE TEXT 
      USING assigned_admin::TEXT;
    `);

    // Set default value for existing rows
    await db.execute(sql`
      UPDATE users 
      SET assigned_admin = 'admin@nextmove.de' 
      WHERE assigned_admin IS NULL;
    `);

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

runMigration();
