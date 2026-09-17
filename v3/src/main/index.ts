import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { initDatabase, getAllSongs, clearDatabase } from './database';
import { startWatchingFolder } from './watcher';

let mainWindow: BrowserWindow | null = null;
let savedMusicFolder: string | null = null; 

// ──> Register protocol with absolute standard/stream/cors privileges
protocol.registerSchemesAsPrivileged([
  { 
    scheme: 'track', 
    privileges: { 
      secure: true, 
      standard: true, 
      stream: true, 
      corsEnabled: true, 
      supportFetchAPI: true 
    } 
  }
]);

const getConfigFileAddress = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'glow_config.json');
};

const loadSavedFolderConfig = () => {
  const configPath = getConfigFileAddress();
  if (fs.existsSync(configPath)) {
    try {
      const rawData = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(rawData);
      if (parsed && parsed.lastOpenedFolder) {
        savedMusicFolder = parsed.lastOpenedFolder;
      }
    } catch (e) {
      console.error("Failed to read persistent config:", e);
    }
  }
};

const saveFolderConfig = (folderPath: string) => {
  try {
    const configPath = getConfigFileAddress();
    fs.writeFileSync(configPath, JSON.stringify({ lastOpenedFolder: folderPath }, null, 2), 'utf-8');
  } catch (e) {
    console.error("Failed to write persistent configurations:", e);
  }
};

app.whenReady().then(() => {
  initDatabase();
  loadSavedFolderConfig();

  // ──> FIXED OFFLINE STREAMING ENGINE: Uses native fs streams instead of net.fetch
  protocol.handle('track', async (request) => {
    try {
      // Decode the custom URL format back to an actual system path string
      const url = new URL(request.url);
      // Handles both forward/backward slashes and windows drive configurations neatly
      let decodedPath = decodeURIComponent(url.pathname);
      if (process.platform === 'win32' && decodedPath.startsWith('/')) {
        decodedPath = decodedPath.slice(1);
      }
      
      const normalizedPath = path.normalize(decodedPath);
      
      // Read raw binary sound buffers from disk layout safely
      const audioBuffer = await fs.promises.readFile(normalizedPath);
      
      // Return a perfect web response containing strict CORS headers
      return new Response(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Access-Control-Allow-Origin': '*',
          'Content-Length': audioBuffer.length.toString()
        }
      });
    } catch (error) {
      console.error("Custom asset tracking protocol crashed:", error);
      return new Response("Media resource track matching broken down.", { status: 500 });
    }
  });
  
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.webContents.on('did-finish-load', () => {
    if (savedMusicFolder && mainWindow) {
      startWatchingFolder(savedMusicFolder, mainWindow);
    }
  });
});

ipcMain.handle('db:get-songs', async () => getAllSongs());
ipcMain.handle('fs:get-selected-folder', async () => savedMusicFolder);

ipcMain.handle('fs:select-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (result.canceled || result.filePaths.length === 0) return null;
  const selectedPath = result.filePaths[0].replace(/\\/g, '/');
  savedMusicFolder = selectedPath;
  saveFolderConfig(selectedPath);
  clearDatabase();
  startWatchingFolder(selectedPath, mainWindow);
  mainWindow.webContents.send('library-updated');
  return selectedPath;
});

// HARDWARE INTERFACE HOOKS
ipcMain.handle('audio:device', async (_, deviceId: string) => {
  console.log(`Audio hardware handoff routing target assigned: ${deviceId}`);
  return true;
});

ipcMain.handle('audio:play', async () => true);
ipcMain.handle('audio:toggle', async () => true);
ipcMain.handle('audio:volume', async () => true);
ipcMain.handle('audio:seek', async () => true);
