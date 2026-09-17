import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs'; // 👈 ADDED NATIVE FS IMPORT
import { initDatabase, getAllSongs, clearDatabase} from './database';
import { startWatchingFolder } from './watcher';
// Look for your database imports near the top of index.ts and update it to this:


let mainWindow: BrowserWindow | null = null;
let savedMusicFolder: string | null = null; 

// ──> NEW: CONSTANT FILE PATH FOR STORAGE PERSISTENCE
const getConfigFileAddress = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'glow_config.json');
};

// ──> NEW: LIFECYCLE METHOD TO LOAD PATH ON BOOT
const loadSavedFolderConfig = () => {
  const configPath = getConfigFileAddress();
  if (fs.existsSync(configPath)) {
    try {
      const rawData = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(rawData);
      if (parsed && parsed.lastOpenedFolder) {
        savedMusicFolder = parsed.lastOpenedFolder;
        console.log(`Auto-restored last opened directory: ${savedMusicFolder}`);
      }
    } catch (e) {
      console.error("Failed to read persistent folder configurations:", e);
    }
  }
};

// ──> NEW: LIFECYCLE METHOD TO SAVE PATH CHANGES
const saveFolderConfig = (folderPath: string) => {
  try {
    const configPath = getConfigFileAddress();
    const configData = { lastOpenedFolder: folderPath };
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf-8');
  } catch (e) {
    console.error("Failed to write persistent configurations:", e);
  }
};

protocol.registerSchemesAsPrivileged([
  { scheme: 'atom', privileges: { bypassCSP: true, stream: true, corsEnabled: true, supportFetchAPI: true } }
]);

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1300, 
    height: 850,
    backgroundColor: '#09090b',
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true 
    }
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // ──> NEW: ONCE THE RECT INTERFACE SENDS A READY ACKNOWLEDGEMENT, START WATCHER IMMEDIATELY
  mainWindow.webContents.on('did-finish-load', () => {
    if (savedMusicFolder && mainWindow) {
      startWatchingFolder(savedMusicFolder, mainWindow);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.whenReady().then(() => {
  protocol.registerFileProtocol('atom', (request, callback) => {
    let targetUrl = request.url.replace(/^atom:\/\//, '');
    let decodedPath = decodeURIComponent(targetUrl);
    
    if (/^[A-Za-z]\//.test(decodedPath)) {
      decodedPath = decodedPath.charAt(0) + ':/' + decodedPath.slice(2);
    }
    
    try {
      const cleanFileSystemPath = path.normalize(decodedPath);
      return callback({ path: cleanFileSystemPath });
    } catch (error) {
      console.error('Failed to map secure audio file stream asset address path:', error);
    }
  });

  // ──> EXECUTE AUTO-RESTORE READ PASS BEFORE WINDOW STARTS
  loadSavedFolderConfig();
  initDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('db:get-songs', async () => {
  return getAllSongs();
});

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

  const selectedPath = result.filePaths[0].replace(/\\/g, '/');
  savedMusicFolder = selectedPath;

  // 1. SAVE THE NEW CONFIG POSITION TO FILE
  saveFolderConfig(selectedPath);

  // ──> 2. ADD THIS NEW PASS HERE TO PURGE THE OLD SONG LIST FROM MEMORY FIRST
  clearDatabase();

  // 3. START BACKGROUND SYNC AND SCAN OF THE REFRESHED CHANNELS
  startWatchingFolder(selectedPath, mainWindow);
  
  // 4. Force frontend tracking layout update
  mainWindow.webContents.send('library-updated');
  
  return selectedPath;
});

