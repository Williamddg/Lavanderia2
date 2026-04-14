"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_path_1 = __importDefault(require("node:path"));
const register_1 = require("./ipc/register");
const electron_updater_1 = require("electron-updater");
const isDev = !electron_1.app.isPackaged;
const rendererPath = node_path_1.default.join(electron_1.app.getAppPath(), 'dist', 'index.html');
const shouldOpenDevTools = process.env.ELECTRON_OPEN_DEVTOOLS === '1';
const createWindow = async () => {
    const mainWindow = new electron_1.BrowserWindow({
        width: 1480,
        height: 920,
        minWidth: 1280,
        minHeight: 800,
        backgroundColor: '#edf1f5',
        webPreferences: {
            preload: node_path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });
    try {
        if (isDev) {
            await mainWindow.loadURL('http://localhost:5173');
            if (shouldOpenDevTools) {
                mainWindow.webContents.openDevTools();
            }
        }
        else {
            await mainWindow.loadFile(rendererPath);
            // 👉 SOLO abre devtools si quieres debug en producción
            // mainWindow.webContents.openDevTools()
        }
    }
    catch (error) {
        console.error('Error cargando la ventana principal:', error);
        mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
        <html>
          <body style="font-family: Arial; padding: 24px;">
            <h2>Error cargando la aplicación</h2>
            <p>Revisa la consola principal para más detalles.</p>
          </body>
        </html>
      `)}`);
    }
};
electron_1.app.whenReady().then(async () => {
    (0, register_1.registerIpc)();
    await createWindow();
    // 🚀 AUTO UPDATE SOLO EN PRODUCCIÓN
    if (!isDev) {
        try {
            electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
            electron_updater_1.autoUpdater.on('update-available', () => {
                console.log('🔄 Nueva actualización disponible');
            });
            electron_updater_1.autoUpdater.on('update-downloaded', () => {
                console.log('✅ Update descargado, reiniciando...');
                electron_updater_1.autoUpdater.quitAndInstall();
            });
            electron_updater_1.autoUpdater.on('error', (err) => {
                console.error('❌ Error en autoUpdater:', err);
            });
        }
        catch (error) {
            console.error('❌ Error iniciando autoUpdater:', error);
        }
    }
    electron_1.app.on('activate', async () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            await createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
