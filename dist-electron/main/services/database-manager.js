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
    validateDatabaseName(database) {
        const normalized = String(database ?? '').trim();
        if (!/^[A-Za-z0-9_]+$/.test(normalized)) {
            throw new Error('El nombre de la base de datos solo puede contener letras, números y guion bajo.');
        }
        return normalized;
    }
    async ensureDatabaseExists(config) {
        const databaseName = this.validateDatabaseName(config.database);
        const adminConnection = await promise_1.default.createConnection({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            ssl: config.ssl ? {} : undefined
        });
        try {
            await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        }
        catch (error) {
            throw new Error(error instanceof Error
                ? `No se pudo crear o validar la base de datos "${databaseName}": ${error.message}`
                : `No se pudo crear o validar la base de datos "${databaseName}".`);
        }
        finally {
            await adminConnection.end();
        }
    }
    validateDatabaseUser(user) {
        const normalized = String(user ?? '').trim();
        if (!/^[A-Za-z][A-Za-z0-9_]{2,31}$/.test(normalized)) {
            throw new Error('El usuario interno de la base de datos debe iniciar con letra y solo puede contener letras, números y guion bajo.');
        }
        return normalized;
    }
    validateDatabasePassword(password) {
        const normalized = String(password ?? '');
        if (normalized.length < 12 || normalized.length > 128) {
            throw new Error('La contraseña del usuario interno de MySQL debe tener entre 12 y 128 caracteres.');
        }
        if (!/[A-Z]/.test(normalized) || !/[a-z]/.test(normalized) || !/\d/.test(normalized)) {
            throw new Error('La contraseña del usuario interno de MySQL debe incluir al menos mayúscula, minúscula y número.');
        }
        return normalized;
    }
    createInstallSteps() {
        return [
            { key: 'connect-admin', label: 'Conectando a MySQL con usuario administrador', status: 'pending' },
            { key: 'create-database', label: 'Creando o validando la base de datos local', status: 'pending' },
            { key: 'create-db-user', label: 'Creando el usuario interno de la aplicación', status: 'pending' },
            { key: 'save-config', label: 'Guardando la configuración interna de la app', status: 'pending' },
            { key: 'run-migrations', label: 'Creando tablas y estructura inicial', status: 'pending' },
            { key: 'verify-health', label: 'Validando la instalación local', status: 'pending' },
            { key: 'ready', label: 'Iniciando la aplicación', status: 'pending' }
        ];
    }
    completeStep(steps, key, status) {
        const step = steps.find((item) => item.key === key);
        if (step) {
            step.status = status;
        }
    }
    async bootstrapLocalInstall(input) {
        const steps = this.createInstallSteps();
        const database = this.validateDatabaseName(input.database);
        const appUser = this.validateDatabaseUser(input.appDbUser);
        const appPassword = this.validateDatabasePassword(input.appDbPassword);
        const adminConnection = await promise_1.default.createConnection({
            host: input.host,
            port: input.port,
            user: input.adminUser,
            password: input.adminPassword,
            ssl: input.ssl ? {} : undefined,
            multipleStatements: true
        });
        this.completeStep(steps, 'connect-admin', 'success');
        try {
            const escapedPassword = adminConnection.escape(appPassword);
            await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            this.completeStep(steps, 'create-database', 'success');
            await adminConnection.query(`CREATE USER IF NOT EXISTS '${appUser}'@'%' IDENTIFIED BY ${escapedPassword}`);
            await adminConnection.query(`ALTER USER '${appUser}'@'%' IDENTIFIED BY ${escapedPassword}`);
            await adminConnection.query(`GRANT ALL PRIVILEGES ON \`${database}\`.* TO '${appUser}'@'%'`);
            await adminConnection.query('FLUSH PRIVILEGES');
            this.completeStep(steps, 'create-db-user', 'success');
        }
        catch (error) {
            this.completeStep(steps, 'create-database', 'error');
            this.completeStep(steps, 'create-db-user', 'error');
            throw error;
        }
        finally {
            await adminConnection.end();
        }
        const dbConfig = {
            host: input.host,
            port: input.port,
            user: appUser,
            password: appPassword,
            database,
            ssl: input.ssl
        };
        store.set('dbConfig', dbConfig);
        this.db = null;
        this.completeStep(steps, 'save-config', 'success');
        await this.migrate();
        this.completeStep(steps, 'run-migrations', 'success');
        const health = await this.healthCheck();
        if (!health.connected) {
            this.completeStep(steps, 'verify-health', 'error');
            throw new Error(health.message);
        }
        this.completeStep(steps, 'verify-health', 'success');
        this.completeStep(steps, 'ready', 'success');
        return {
            steps,
            health,
            dbConfig
        };
    }
    getConfig() {
        return store.get('dbConfig');
    }
    async saveConfig(config) {
        const connection = await promise_1.default.createConnection({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: this.validateDatabaseName(config.database),
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
            return {
                configured: false,
                connected: false,
                migrated: false,
                hasUsers: false,
                message: 'Configura la conexión MySQL para iniciar.'
            };
        }
        try {
            const connection = await promise_1.default.createConnection({
                host: config.host,
                port: config.port,
                user: config.user,
                password: config.password,
                database: this.validateDatabaseName(config.database),
                ssl: config.ssl ? {} : undefined
            });
            await connection.ping();
            await connection.end();
            await this.migrate();
            const db = await this.getDb();
            const countResult = await db
                .selectFrom('users')
                .select((eb) => eb.fn.count('id').as('count'))
                .executeTakeFirst();
            const hasUsers = Number(countResult?.count ?? 0) > 0;
            return {
                configured: true,
                connected: true,
                migrated: true,
                hasUsers,
                message: hasUsers
                    ? 'Conexión y migraciones listas.'
                    : 'Conexión lista. Falta crear los usuarios iniciales.'
            };
        }
        catch (error) {
            return {
                configured: true,
                connected: false,
                migrated: false,
                hasUsers: false,
                message: error instanceof Error ? error.message : 'No fue posible conectar.'
            };
        }
    }
}
exports.databaseManager = new DatabaseManager();
