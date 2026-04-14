import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { sql, type Kysely } from 'kysely';
import type { Database } from './schema.js';

const resolveMigrationsDir = () => {
  const candidates = [
    path.join(process.cwd(), 'src', 'backend', 'db', 'migrations'),
    path.join(__dirname, 'migrations')
  ];

  const found = candidates.find((candidate) => fsSync.existsSync(candidate));

  if (!found) {
    throw new Error('No se encontró el directorio de migraciones SQL.');
  }

  return found;
};

export const runMigrations = async (db: Kysely<Database>) => {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `.execute(db);

  const migrationsDir = resolveMigrationsDir();
  const applied = await db.selectFrom('schema_migrations').select('name').execute();
  const appliedSet = new Set(applied.map((item) => item.name));
  const files = (await fs.readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort();

  for (const file of files) {
    if (appliedSet.has(file)) continue;

    const content = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    const statements = content
      .split(/;\s*\n/g)
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await sql.raw(statement).execute(db);
    }

    await db.insertInto('schema_migrations').values({ name: file }).execute();
  }
};
