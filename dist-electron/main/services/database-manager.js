"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseManager = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const electron_store_1 = __importDefault(require("electron-store"));
const connection_js_1 = require("../../backend/db/connection.js");
const migrator_js_1 = require("../../backend/db/migrator.js");
const store = new electron_store_1.default({
    name: 'lavanderia-settings'
});
class DatabaseManager {
    db = null;
    getConfig() {
        return store.get('dbConfig');
    }
    async saveConfig(config) {
        const connection = await promise_1.default.createConnection({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database,
            ssl: config.ssl ? {} : undefined
        });
        await connection.ping();
        await connection.end();
        store.set('dbConfig', config);
        this.db = null;
    }
    async getDb() {
        if (this.db)
            return this.db;
        const config = this.getConfig();
        if (!config)
            throw new Error('La base de datos no está configurada.');
        this.db = (0, connection_js_1.createDb)(config);
        return this.db;
    }
    async migrate() {
        const db = await this.getDb();
        await (0, migrator_js_1.runMigrations)(db);
    }
    async healthCheck() {
        const config = this.getConfig();
        if (!config) {
            return { configured: false, connected: false, migrated: false, message: 'Configura la conexión MySQL para iniciar.' };
        }
        try {
            const connection = await promise_1.default.createConnection({
                host: config.host,
                port: config.port,
                user: config.user,
                password: config.password,
                database: config.database,
                ssl: config.ssl ? {} : undefined
            });
            await connection.ping();
            await connection.end();
            await this.migrate();
            return { configured: true, connected: true, migrated: true, message: 'Conexión y migraciones listas.' };
        }
        catch (error) {
            return { configured: true, connected: false, migrated: false, message: error instanceof Error ? error.message : 'No fue posible conectar.' };
        }
    }
}
exports.databaseManager = new DatabaseManager();
