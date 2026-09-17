import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
import * as path from 'path';
import { initDatabase, getAllSongs } from './database';
import { startWatchingFolder } from './watcher';

let mainWindow: BrowserWindow | null = null;
let savedMusicFolder: string | null = null; // Caches chosen directory path string

// Register custom file protocol securely with privileges enabled
protocol.registerSchemesAsPrivileged([
  { scheme: 'atom', privileges: { bypassCSP: true, stream: true, corsEnabled: true, supportFetchAPI: true } }
]);

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1300, // Slightly expanded grid workspace
    height: 850,
    backgroundColor: '#09090b',
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true // Keeps browser layer safe while protocols pass music binaries
    }
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.whenReady().then(() => {
  // FIXED: Bulletproof path encoder that accurately maintains Windows drive formatting (C:/)
  protocol.registerFileProtocol('atom', (request, callback) => {
    // 1. Extract the raw path string out of the browser URL structure
    let targetUrl = request.url.replace(/^atom:\/\//, '');
    let decodedPath = decodeURIComponent(targetUrl);
    
    // 2. CRITICAL WINDOWS FIX: If the path looks like "C/Users...", transform it into "C:/Users..."
    if (/^[A-Za-z]\//.test(decodedPath)) {
      decodedPath = decodedPath.charAt(0) + ':/' + decodedPath.slice(2);
    }
    
    try {
      // 3. Clean up mixed slash directions completely
      const cleanFileSystemPath = path.normalize(decodedPath);
      return callback({ path: cleanFileSystemPath });
    } catch (error) {
      console.error('Failed to map secure audio file stream asset address path:', error);
    }
  });

  initDatabase();
  createWindow();
});



app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Channel Handlers
ipcMain.handle('db:get-songs', async () => {
  return getAllSongs();
});

// FIXED: Channel handler now accurately passes back tracked storage configuration labels
ipcMain.handle('fs:get-selected-folder', async () => {
  return savedMusicFolder;
});

ipcMain.handle('fs:select-folder', async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  // Isolate and normalize path formatting
  const selectedPath = result.filePaths[0].replace(/\\/g, '/');
  savedMusicFolder = selectedPath;

  // Boot up background scanner
  startWatchingFolder(selectedPath, mainWindow);

  return selectedPath;
});
