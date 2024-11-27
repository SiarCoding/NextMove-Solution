import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '../db';

async function runMigration() {
  try {
    // Create companies table if not exists
    await db.schema
      .createTableIfNotExists('companies')
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('admin_id', 'integer')
      .addColumn('created_at', 'timestamp', (col) => col.defaultNow().notNull())
      .addColumn('updated_at', 'timestamp', (col) => col.defaultNow().notNull());

    // Add company_id to users if not exists
    await db.schema
      .alterTable('users')
      .addColumnIfNotExists('company_id', 'integer', (col) => 
        col.references('companies.id')
      );

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

runMigration();
