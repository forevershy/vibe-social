const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

const PORT = process.env.PORT || 8787
let serverProc = null
let mainWindow = null

function startServer() {
  const serverEntry = path.join(__dirname, '..', 'server', 'index.js')
  const env = {
    ...process.env,
    PORT: String(PORT),
    VIBE_DATA_DIR: path.join(app.getPath('userData'), 'vibe-data'),
  }
  serverProc = spawn(process.execPath, [serverEntry], {
    env: {
      ...env,
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: 'inherit',
  })
  serverProc.on('exit', (code) => {
    console.log('[vibe] server exited', code)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 980,
    minHeight: 640,
    title: 'Vibe',
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      autoplayPolicy: 'no-user-gesture-required',
    },
  })

  const url = `http://127.0.0.1:${PORT}`
  const tryLoad = (attempt = 0) => {
    mainWindow.loadURL(url).catch(() => {
      if (attempt < 40) {
        setTimeout(() => tryLoad(attempt + 1), 250)
      }
    })
  }
  tryLoad()

  mainWindow.webContents.setWindowOpenHandler(({ url: u }) => {
    shell.openExternal(u)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  startServer()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (serverProc) {
    try {
      serverProc.kill()
    } catch {
      /* ignore */
    }
  }
  if (process.platform !== 'darwin') app.quit()
})
