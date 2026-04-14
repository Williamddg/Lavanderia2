"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const kysely_1 = require("kysely");
const migrationsDir = node_path_1.default.join(__dirname, 'migrations');
const runMigrations = async (db) => {
    await (0, kysely_1.sql) `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `.execute(db);
    const applied = await db.selectFrom('schema_migrations').select('name').execute();
    const appliedSet = new Set(applied.map((item) => item.name));
    const files = (await promises_1.default.readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort();
    for (const file of files) {
        if (appliedSet.has(file))
            continue;
        const content = await promises_1.default.readFile(node_path_1.default.join(migrationsDir, file), 'utf8');
        const statements = content
            .split(/;\s*\n/g)
            .map((statement) => statement.trim())
            .filter(Boolean);
        for (const statement of statements) {
            await kysely_1.sql.raw(statement).execute(db);
        }
        await db.insertInto('schema_migrations').values({ name: file }).execute();
    }
};
exports.runMigrations = runMigrations;
