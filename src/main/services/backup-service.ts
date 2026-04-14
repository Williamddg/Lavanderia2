import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { shell } from 'electron';
import { google } from 'googleapis';
import { databaseManager } from './database-manager.js';

const execAsync = promisify(exec);

const GOOGLE_REDIRECT_URI = 'http://127.0.0.1:3017/oauth2callback';
const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/drive.file'];

class BackupService {
  private getGoogleCredentialsPath() {
    const packagedPath = path.join(process.resourcesPath, 'google-oauth.json');
    const devPath = path.join(process.cwd(), 'google-oauth.json');

    if (fs.existsSync(packagedPath)) return packagedPath;
    if (fs.existsSync(devPath)) return devPath;

    throw new Error(
      'No existe google-oauth.json. Debe estar en la raíz del proyecto o empaquetado en resources.'
    );
  }

  private getOAuthClient() {
    const credentialsPath = this.getGoogleCredentialsPath();
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
    const installed = credentials.installed || credentials.web;

    if (!installed?.client_id || !installed?.client_secret) {
      throw new Error('El archivo google-oauth.json no es válido.');
    }

    return new google.auth.OAuth2(
      installed.client_id,
      installed.client_secret,
      GOOGLE_REDIRECT_URI
    );
  }

  private getMysqldumpPath() {
    const packagedPath = path.join(process.resourcesPath, 'bin', 'mysqldump.exe');
    const devPath = path.join(process.cwd(), 'resources', 'bin', 'mysqldump.exe');

    if (fs.existsSync(packagedPath)) return packagedPath;
    if (fs.existsSync(devPath)) return devPath;

    throw new Error(
      'No se encontró mysqldump.exe. Debe existir en resources/bin/mysqldump.exe'
    );
  }

  private async getTokenRow(userId?: number) {
    const db = await databaseManager.getDb();

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

  private async getExistingTokenId(userId?: number) {
    const db = await databaseManager.getDb();

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

  async connectDrive(userId?: number) {
    const db = await databaseManager.getDb();
    const oAuth2Client = this.getOAuthClient();

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_SCOPES
    });

    const tokens = await new Promise<any>((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
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
        } catch (error) {
          server.close();
          reject(error);
        }
      });

      server.listen(3017, '127.0.0.1', async () => {
        await shell.openExternal(authUrl);
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
    } else {
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

  private async getAuthorizedClient(userId?: number) {
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
    const config = databaseManager.getConfig();

    if (!config) {
      throw new Error('La base de datos no está configurada.');
    }

    const mysqldumpPath = this.getMysqldumpPath();

    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(
      now.getMinutes()
    ).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;

    const fileName = `backup_${config.database}_${stamp}.sql`;
    const filePath = path.join(os.tmpdir(), fileName);

    const command = `"${mysqldumpPath}" -h ${config.host} -P ${config.port} -u ${config.user} -p${config.password} ${config.database} > "${filePath}"`;

    try {
      await execAsync(command);
    } catch (error: any) {
      throw new Error(
        error?.stderr?.trim() ||
          error?.stdout?.trim() ||
          error?.message ||
          'No se pudo ejecutar mysqldump.'
      );
    }

    if (!fs.existsSync(filePath)) {
      throw new Error('No se pudo generar el archivo de backup.');
    }

    return { fileName, filePath };
  }

  async uploadBackupToDrive(userId?: number) {
    const db = await databaseManager.getDb();
    const auth = await this.getAuthorizedClient(userId);
    const drive = google.drive({ version: 'v3', auth });
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
          body: fs.createReadStream(filePath)
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

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return {
        success: true,
        fileName,
        driveFileId: response.data.id ?? null,
        message: 'Backup subido correctamente a Google Drive.'
      };
    } catch (error) {
      await db
        .updateTable('backups')
        .set({
          status: 'ERROR',
          message: error instanceof Error ? error.message : 'Error subiendo backup'
        })
        .where('id', '=', Number(createdBackup.insertId))
        .execute();

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      throw error;
    }
  }

  async listBackups() {
    const db = await databaseManager.getDb();

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

export const backupService = new BackupService();