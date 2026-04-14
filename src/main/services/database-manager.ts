import mysql from 'mysql2/promise';
import ElectronStore from 'electron-store';
import type { Kysely } from 'kysely';
import { createDb } from '../../backend/db/connection.js';
import { runMigrations } from '../../backend/db/migrator.js';
import type { Database } from '../../backend/db/schema.js';
import type {
  DbConnectionConfig,
  HealthStatus,
  InstallStep,
  LocalInstallInput,
  LocalInstallResult
} from '../../shared/types.js';

type SettingsStore = {
  get: (key: 'dbConfig') => DbConnectionConfig | undefined;
  set: (key: 'dbConfig', value: DbConnectionConfig) => void;
};

const store = new ElectronStore({
  name: 'lavanderia-settings'
}) as unknown as SettingsStore;

class DatabaseManager {
  private db: Kysely<Database> | null = null;

  private validateDatabaseName(database: string) {
    const normalized = String(database ?? '').trim();

    if (!/^[A-Za-z0-9_]+$/.test(normalized)) {
      throw new Error(
        'El nombre de la base de datos solo puede contener letras, números y guion bajo.'
      );
    }

    return normalized;
  }

  private async ensureDatabaseExists(config: DbConnectionConfig) {
    const databaseName = this.validateDatabaseName(config.database);
    const adminConnection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? {} : undefined
    });

    try {
      await adminConnection.query(
        `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `No se pudo crear o validar la base de datos "${databaseName}": ${error.message}`
          : `No se pudo crear o validar la base de datos "${databaseName}".`
      );
    } finally {
      await adminConnection.end();
    }
  }

  private validateDatabaseUser(user: string) {
    const normalized = String(user ?? '').trim();

    if (!/^[A-Za-z][A-Za-z0-9_]{2,31}$/.test(normalized)) {
      throw new Error(
        'El usuario interno de la base de datos debe iniciar con letra y solo puede contener letras, números y guion bajo.'
      );
    }

    return normalized;
  }

  private validateDatabasePassword(password: string) {
    const normalized = String(password ?? '');

    if (normalized.length < 12 || normalized.length > 128) {
      throw new Error(
        'La contraseña del usuario interno de MySQL debe tener entre 12 y 128 caracteres.'
      );
    }

    if (!/[A-Z]/.test(normalized) || !/[a-z]/.test(normalized) || !/\d/.test(normalized)) {
      throw new Error(
        'La contraseña del usuario interno de MySQL debe incluir al menos mayúscula, minúscula y número.'
      );
    }

    return normalized;
  }

  private createInstallSteps(): InstallStep[] {
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

  private completeStep(steps: InstallStep[], key: string, status: 'success' | 'error') {
    const step = steps.find((item) => item.key === key);
    if (step) {
      step.status = status;
    }
  }

  async bootstrapLocalInstall(input: LocalInstallInput): Promise<LocalInstallResult> {
    const steps = this.createInstallSteps();
    const database = this.validateDatabaseName(input.database);
    const appUser = this.validateDatabaseUser(input.appDbUser);
    const appPassword = this.validateDatabasePassword(input.appDbPassword);

    const adminConnection = await mysql.createConnection({
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

      await adminConnection.query(
        `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      this.completeStep(steps, 'create-database', 'success');

      await adminConnection.query(
        `CREATE USER IF NOT EXISTS '${appUser}'@'%' IDENTIFIED BY ${escapedPassword}`
      );
      await adminConnection.query(
        `ALTER USER '${appUser}'@'%' IDENTIFIED BY ${escapedPassword}`
      );
      await adminConnection.query(
        `GRANT ALL PRIVILEGES ON \`${database}\`.* TO '${appUser}'@'%'`
      );
      await adminConnection.query('FLUSH PRIVILEGES');
      this.completeStep(steps, 'create-db-user', 'success');
    } catch (error) {
      this.completeStep(steps, 'create-database', 'error');
      this.completeStep(steps, 'create-db-user', 'error');
      throw error;
    } finally {
      await adminConnection.end();
    }

    const dbConfig: DbConnectionConfig = {
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

  async saveConfig(config: DbConnectionConfig) {
    const connection = await mysql.createConnection({
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
    if (this.db) return this.db;
    const config = this.getConfig();
    if (!config) throw new Error('La base de datos no está configurada.');
    this.db = createDb(config);
    return this.db;
  }

  async migrate() {
    const db = await this.getDb();
    await runMigrations(db);
  }

  async healthCheck(): Promise<HealthStatus> {
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
      const connection = await mysql.createConnection({
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
        .select((eb) => eb.fn.count<number>('id').as('count'))
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
    } catch (error) {
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

export const databaseManager = new DatabaseManager();
