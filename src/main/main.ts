import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { registerIpc } from './ipc/register'
import { autoUpdater } from 'electron-updater'

const isDev = !app.isPackaged

const createWindow = async () => {
  const mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1280,
    minHeight: 800,
    backgroundColor: '#edf1f5',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  try {
    if (isDev) {
      await mainWindow.loadURL('http://localhost:5173')
      mainWindow.webContents.openDevTools()
    } else {
      const indexPath = path.join(app.getAppPath(), 'dist', 'index.html')
      await mainWindow.loadFile(indexPath)

      // 👉 SOLO abre devtools si quieres debug en producción
      // mainWindow.webContents.openDevTools()
    }
  } catch (error) {
    console.error('Error cargando la ventana principal:', error)

    mainWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(`
        <html>
          <body style="font-family: Arial; padding: 24px;">
            <h2>Error cargando la aplicación</h2>
            <p>Revisa la consola principal para más detalles.</p>
          </body>
        </html>
      `)}`
    )
  }
}

app.whenReady().then(async () => {
  registerIpc()
  await createWindow()

  // 🚀 AUTO UPDATE SOLO EN PRODUCCIÓN
  if (!isDev) {
    try {
      autoUpdater.checkForUpdatesAndNotify()

      autoUpdater.on('update-available', () => {
        console.log('🔄 Nueva actualización disponible')
      })

      autoUpdater.on('update-downloaded', () => {
        console.log('✅ Update descargado, reiniciando...')
        autoUpdater.quitAndInstall()
      })

      autoUpdater.on('error', (err) => {
        console.error('❌ Error en autoUpdater:', err)
      })
    } catch (error) {
      console.error('❌ Error iniciando autoUpdater:', error)
    }
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})