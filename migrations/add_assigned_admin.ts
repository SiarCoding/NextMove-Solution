import { db } from '../db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

async function runMigration() {
  try {
    // Add assigned_admin column to users table
    await db.schema
      .alterTable('users')
      .addColumnIfNotExists('assigned_admin', 'text', (col) => 
        col.defaultTo('admin@nextmove.de')
      );

    // Update existing users
    await db.update(users)
      .set({ assigned_admin: 'admin@nextmove.de' })
      .where(eq(users.assigned_admin, null));

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

runMigration();
