"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupService = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const node_http_1 = __importDefault(require("node:http"));
const node_child_process_1 = require("node:child_process");
const electron_1 = require("electron");
const googleapis_1 = require("googleapis");
const database_manager_js_1 = require("./database-manager.js");
const GOOGLE_REDIRECT_URI = 'http://127.0.0.1:3017/oauth2callback';
const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/drive.file'];
class BackupService {
    getGoogleCredentialsPath() {
        const envPath = process.env.GOOGLE_OAUTH_PATH;
        const userDataPath = node_path_1.default.join(electron_1.app.getPath('userData'), 'google-oauth.json');
        const devPath = node_path_1.default.join(process.cwd(), 'google-oauth.json');
        if (envPath && node_fs_1.default.existsSync(envPath))
            return envPath;
        if (node_fs_1.default.existsSync(userDataPath))
            return userDataPath;
        if (node_fs_1.default.existsSync(devPath))
            return devPath;
        throw new Error('No existe google-oauth.json. Usa GOOGLE_OAUTH_PATH, copia el archivo a userData o déjalo en la raíz del proyecto en desarrollo.');
    }
    getOAuthClient() {
        const credentialsPath = this.getGoogleCredentialsPath();
        const credentials = JSON.parse(node_fs_1.default.readFileSync(credentialsPath, 'utf-8'));
        const installed = credentials.installed || credentials.web;
        if (!installed?.client_id || !installed?.client_secret) {
            throw new Error('El archivo google-oauth.json no es válido.');
        }
        return new googleapis_1.google.auth.OAuth2(installed.client_id, installed.client_secret, GOOGLE_REDIRECT_URI);
    }
    getMysqldumpCommand() {
        const envPath = process.env.MYSQLDUMP_PATH;
        const packagedWinPath = node_path_1.default.join(process.resourcesPath, 'bin', 'mysqldump.exe');
        const devWinPath = node_path_1.default.join(process.cwd(), 'resources', 'bin', 'mysqldump.exe');
        if (envPath && node_fs_1.default.existsSync(envPath)) {
            return envPath;
        }
        if (process.platform === 'win32') {
            if (node_fs_1.default.existsSync(packagedWinPath))
                return packagedWinPath;
            if (node_fs_1.default.existsSync(devWinPath))
                return devWinPath;
            return 'mysqldump.exe';
        }
        return 'mysqldump';
    }
    async getTokenRow(userId) {
        const db = await database_manager_js_1.databaseManager.getDb();
        if (typeof userId === 'number') {
            return db
                .selectFrom('google_drive_tokens')
                .selectAll()
                .where('user_id', '=', userId)
                .orderBy('id desc')
                .executeTakeFirst();
        }
        return db
            .selectFrom('google_drive_tokens')
            .selectAll()
            .where('user_id', 'is', null)
            .orderBy('id desc')
            .executeTakeFirst();
    }
    async getExistingTokenId(userId) {
        const db = await database_manager_js_1.databaseManager.getDb();
        if (typeof userId === 'number') {
            return db
                .selectFrom('google_drive_tokens')
                .select(['id'])
                .where('user_id', '=', userId)
                .executeTakeFirst();
        }
        return db
            .selectFrom('google_drive_tokens')
            .select(['id'])
            .where('user_id', 'is', null)
            .executeTakeFirst();
    }
    async connectDrive(userId) {
        const db = await database_manager_js_1.databaseManager.getDb();
        const oAuth2Client = this.getOAuthClient();
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: GOOGLE_SCOPES
        });
        const tokens = await new Promise((resolve, reject) => {
            const server = node_http_1.default.createServer(async (req, res) => {
                try {
                    const reqUrl = new URL(req.url || '', GOOGLE_REDIRECT_URI);
                    if (reqUrl.pathname !== '/oauth2callback') {
                        res.statusCode = 404;
                        res.end('Ruta no encontrada');
                        return;
                    }
                    const code = reqUrl.searchParams.get('code');
                    if (!code) {
                        res.statusCode = 400;
                        res.end('No se recibió código de autorización.');
                        return;
                    }
                    const tokenResponse = await oAuth2Client.getToken(code);
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.end('<h2>Google Drive conectado correctamente. Puedes cerrar esta ventana.</h2>');
                    server.close();
                    resolve(tokenResponse.tokens);
                }
                catch (error) {
                    server.close();
                    reject(error);
                }
            });
            server.listen(3017, '127.0.0.1', async () => {
                await electron_1.shell.openExternal(authUrl);
            });
        });
        const existing = await this.getExistingTokenId(userId);
        if (existing) {
            await db
                .updateTable('google_drive_tokens')
                .set({
                access_token: tokens.access_token ?? null,
                refresh_token: tokens.refresh_token ?? null,
                scope: tokens.scope ?? null,
                token_type: tokens.token_type ?? null,
                expiry_date: tokens.expiry_date ?? null
            })
                .where('id', '=', existing.id)
                .execute();
        }
        else {
            await db
                .insertInto('google_drive_tokens')
                .values({
                user_id: typeof userId === 'number' ? userId : null,
                access_token: tokens.access_token ?? null,
                refresh_token: tokens.refresh_token ?? null,
                scope: tokens.scope ?? null,
                token_type: tokens.token_type ?? null,
                expiry_date: tokens.expiry_date ?? null
            })
                .execute();
        }
        return {
            success: true,
            message: 'Google Drive conectado correctamente.'
        };
    }
    async getAuthorizedClient(userId) {
        const token = await this.getTokenRow(userId);
        if (!token?.refresh_token && !token?.access_token) {
            throw new Error('Primero debes conectar Google Drive.');
        }
        const oAuth2Client = this.getOAuthClient();
        oAuth2Client.setCredentials({
            access_token: token.access_token ?? undefined,
            refresh_token: token.refresh_token ?? undefined,
            scope: token.scope ?? undefined,
            token_type: token.token_type ?? undefined,
            expiry_date: token.expiry_date ?? undefined
        });
        return oAuth2Client;
    }
    async createSqlBackup() {
        const config = database_manager_js_1.databaseManager.getConfig();
        if (!config) {
            throw new Error('La base de datos no está configurada.');
        }
        const mysqldumpCommand = this.getMysqldumpCommand();
        const now = new Date();
        const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
        const fileName = `backup_${config.database}_${stamp}.sql`;
        const filePath = node_path_1.default.join(node_os_1.default.tmpdir(), fileName);
        const args = [
            '-h',
            config.host,
            '-P',
            String(config.port),
            '-u',
            config.user,
            `-p${config.password}`,
            '--single-transaction',
            '--routines',
            '--triggers',
            config.database
        ];
        await new Promise((resolve, reject) => {
            const child = (0, node_child_process_1.spawn)(mysqldumpCommand, args, {
                stdio: ['ignore', 'pipe', 'pipe']
            });
            const output = node_fs_1.default.createWriteStream(filePath);
            let stderr = '';
            child.stdout.pipe(output);
            child.stderr.on('data', (chunk) => {
                stderr += String(chunk);
            });
            child.on('error', (error) => {
                output.close();
                reject(new Error(`No se pudo ejecutar mysqldump. Instala mysql-client o define MYSQLDUMP_PATH. Detalle: ${error.message}`));
            });
            child.on('close', (code) => {
                output.end(() => {
                    if (code === 0) {
                        resolve();
                        return;
                    }
                    reject(new Error(stderr.trim() || 'No se pudo ejecutar mysqldump.'));
                });
            });
        });
        if (!node_fs_1.default.existsSync(filePath)) {
            throw new Error('No se pudo generar el archivo de backup.');
        }
        return { fileName, filePath };
    }
    async uploadBackupToDrive(userId) {
        const db = await database_manager_js_1.databaseManager.getDb();
        const auth = await this.getAuthorizedClient(userId);
        const drive = googleapis_1.google.drive({ version: 'v3', auth });
        const { fileName, filePath } = await this.createSqlBackup();
        const createdBackup = await db
            .insertInto('backups')
            .values({
            file_name: fileName,
            status: 'UPLOADING',
            message: 'Subiendo backup a Google Drive'
        })
            .executeTakeFirstOrThrow();
        try {
            const response = await drive.files.create({
                requestBody: {
                    name: fileName
                },
                media: {
                    mimeType: 'application/sql',
                    body: node_fs_1.default.createReadStream(filePath)
                },
                fields: 'id,name'
            });
            await db
                .updateTable('backups')
                .set({
                drive_file_id: response.data.id ?? null,
                status: 'DONE',
                message: 'Backup subido correctamente'
            })
                .where('id', '=', Number(createdBackup.insertId))
                .execute();
            if (node_fs_1.default.existsSync(filePath)) {
                node_fs_1.default.unlinkSync(filePath);
            }
            return {
                success: true,
                fileName,
                driveFileId: response.data.id ?? null,
                message: 'Backup subido correctamente a Google Drive.'
            };
        }
        catch (error) {
            await db
                .updateTable('backups')
                .set({
                status: 'ERROR',
                message: error instanceof Error ? error.message : 'Error subiendo backup'
            })
                .where('id', '=', Number(createdBackup.insertId))
                .execute();
            if (node_fs_1.default.existsSync(filePath)) {
                node_fs_1.default.unlinkSync(filePath);
            }
            throw error;
        }
    }
    async listBackups() {
        const db = await database_manager_js_1.databaseManager.getDb();
        const rows = await db
            .selectFrom('backups')
            .selectAll()
            .orderBy('id desc')
            .execute();
        return rows.map((row) => ({
            id: row.id,
            file_name: row.file_name,
            drive_file_id: row.drive_file_id,
            status: row.status,
            message: row.message,
            created_at: new Date(row.created_at).toISOString()
        }));
    }
}
exports.backupService = new BackupService();
