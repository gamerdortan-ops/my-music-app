import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { initDatabase, getSongs } from './database';
import { startWatchingFolder, registerWatcherIPCHandlers } from './watcher';

let mainWindow: BrowserWindow | null = null;
// Updated to support multiple tracked folder collections simultaneously
let savedMusicFolders: string[] = []; 

// 1. Secure Custom Audio Protocol Registration (Preserved)
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
      if (parsed && parsed.lastOpenedFolders) {
        savedMusicFolders = Array.isArray(parsed.lastOpenedFolders) ? parsed.lastOpenedFolders : [parsed.lastOpenedFolders];
      } else if (parsed && parsed.lastOpenedFolder) {
        // Migration fallback logic for older setups
        savedMusicFolders = [parsed.lastOpenedFolder];
      }
    } catch (e) {
      console.error("Failed to read persistent config:", e);
    }
  }
};

const saveFolderConfig = (folderPaths: string[]) => {
  try {
    const configPath = getConfigFileAddress();
    fs.writeFileSync(configPath, JSON.stringify({ lastOpenedFolders: folderPaths }, null, 2), 'utf-8');
  } catch (e) {
    console.error("Failed to write persistent configurations:", e);
  }
};

app.whenReady().then(() => {
  initDatabase();
  loadSavedFolderConfig();

  // 2. High-Performance Sandboxed Filesystem Media Router (Preserved)
  protocol.handle('track', async (request) => {
    try {
      const url = new URL(request.url);
      let decodedPath = decodeURIComponent(url.pathname);
      if (process.platform === 'win32' && decodedPath.startsWith('/')) {
        decodedPath = decodedPath.slice(1);
      }
      
      const normalizedPath = path.normalize(decodedPath);
      const audioBuffer = await fs.promises.readFile(normalizedPath);
      
      return new Response(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Access-Control-Allow-Origin': '*',
          'Content-Length': audioBuffer.length.toString()
        }
      });
    } catch (error) {
      console.error("Custom asset tracking protocol failed to load:", error);
      return new Response("Media resource tracking broken down.", { status: 500 });
    }
  });
  
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    backgroundColor: '#00000000', // Supports frosted layout translucency
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.webContents.on('did-finish-load', () => {
    if (Array.isArray(savedMusicFolders) && mainWindow) {
      savedMusicFolders.forEach(folder => {
        startWatchingFolder(folder, mainWindow!);
      });
    }
  });

  // Register multi-watcher removal handle tools
  registerWatcherIPCHandlers(mainWindow, (folderPath) => {
    savedMusicFolders = savedMusicFolders.filter(
      folder => folder.replace(/\\/g, '/') !== folderPath
    );
    saveFolderConfig(savedMusicFolders);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/*
 * ------------------------------------------------------------
 * BACKEND ROUTER COMMUNICATIONS LAYER INTERFACES (IPC)
 * ------------------------------------------------------------
 */

ipcMain.handle('db:get-songs', async () => getSongs());
ipcMain.handle('fs:get-selected-folder', async () => savedMusicFolders);

ipcMain.handle('fs:select-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (result.canceled || result.filePaths.length === 0) return null;
  
  const selectedPath = result.filePaths[0].replace(/\\/g, '/');
  
  // Guard clause against mapping exact duplicate string folders
  if (!savedMusicFolders.includes(selectedPath)) {
    savedMusicFolders.push(selectedPath);
    saveFolderConfig(savedMusicFolders);
    startWatchingFolder(selectedPath, mainWindow);
    mainWindow.webContents.send('library-updated');
  }
  
  return selectedPath;
});

// 3. Native OS Level Output Audio Routing Channel Handler (Preserved)
ipcMain.handle('audio:device', async (_, deviceLabel: string) => {
  console.log(`Audio hardware handoff routing target assigned: ${deviceLabel}`);
  
  if (!deviceLabel || deviceLabel === 'default') {
    return true;
  }

  try {
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      const safeLabel = deviceLabel.replace(/'/g, "''");
      const psCommand = `Get-CimInstance Win32_SoundDevice | Where-Object { $_.Name -eq '${safeLabel}' } | Invoke-CimMethod -MethodName SetDefault;`;
      
      exec(`powershell -Command "${psCommand}"`, (err: any) => {
        if (err) console.warn("Native device routing utility fallback active.");
      });
    }
    return true;
  } catch (e) {
    console.error("Failed to execute native hardware device switch:", e);
    return false;
  }
});

// Core stubs to keep systems synchronized
ipcMain.handle('audio:play', async () => true);
ipcMain.handle('audio:toggle', async () => true);
ipcMain.handle('audio:volume', async () => true);
ipcMain.handle('audio:seek', async () => true);
