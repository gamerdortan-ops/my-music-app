import chokidar from 'chokidar';
import * as musicMetadata from 'music-metadata';
import crypto from 'crypto'; 
import { BrowserWindow, ipcMain } from 'electron';
import { insertSong, deleteSongByPath, deleteSongsByDirectory } from './database';

// Track concurrent background directories dynamically
const activeWatchers = new Map<string, any>();

const generateId = (filePath: string): string => {
  return crypto.createHash('md5').update(filePath).digest('hex');
};

/**
 * Mounts a new active file system monitor targeting a specific directory location
 */
export const startWatchingFolder = (folderPath: string, mainWindow: BrowserWindow): void => {
  const normalizedFolderPath = folderPath.replace(/\\/g, '/');

  if (activeWatchers.has(normalizedFolderPath)) {
    console.log(`Sync engine is already watching: ${normalizedFolderPath}`);
    return;
  }

  console.log(`Sync engine started watching: ${normalizedFolderPath}`);

  const watcher = chokidar.watch(normalizedFolderPath, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    depth: 9
  });

  watcher.on('add', async (filePath: string) => {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const lowerPath = normalizedPath.toLowerCase();
    
    if (!lowerPath.endsWith('.mp3') && !lowerPath.endsWith('.wav') && !lowerPath.endsWith('.m4a')) {
      return;
    }

    try {
      const metadata = await musicMetadata.parseFile(normalizedPath);
      
      const trackData = {
        id: generateId(normalizedPath),
        title: metadata.common.title || normalizedPath.split('/').pop() || 'Unknown Title',
        artist: metadata.common.artist || 'Unknown Artist',
        duration: Math.round(metadata.format.duration || 0),
        file_path: normalizedPath
      };

      insertSong(trackData);
      mainWindow.webContents.send('library-updated');
    } catch (error) {
      console.error(`Error reading metadata from file: ${normalizedPath}`, error);
    }
  });

  watcher.on('unlink', (filePath: string) => {
    const normalizedPath = filePath.replace(/\\/g, '/');
    console.log(`File removed from hard drive: ${normalizedPath}`);
    
    deleteSongByPath(normalizedPath);
    mainWindow.webContents.send('library-updated');
  });

  activeWatchers.set(normalizedFolderPath, watcher);
};

/**
 * Maps the execution channel link hooks directly into your right-click menu system buttons
 */
export const registerWatcherIPCHandlers = (
  mainWindow: BrowserWindow,
  onFolderRemoved: (folderPath: string) => void
): void => {
  ipcMain.removeHandler('remove-music-folder');

  ipcMain.handle('remove-music-folder', async (_event, folderPath: string) => {
    const normalizedTargetFolder = folderPath.replace(/\\/g, '/');
    console.log(`Processing directory removal request for: ${normalizedTargetFolder}`);

    try {
      // 1. Terminate the active chokidar engine tracking this specific location
      if (activeWatchers.has(normalizedTargetFolder)) {
        const watcherToClose = activeWatchers.get(normalizedTargetFolder);
        await watcherToClose.close();
        activeWatchers.delete(normalizedTargetFolder);
        console.log(`Watcher stream closed cleanly for path: ${normalizedTargetFolder}`);
      }

      // 2. Erase any tracks matching this structural path format string out of the database
      deleteSongsByDirectory(normalizedTargetFolder);

      // 3. Remove the folder from persistent configuration
      onFolderRemoved(normalizedTargetFolder);

      // 4. Alert the user viewport context arrays to drop items instantly
      mainWindow.webContents.send('library-updated');

      return { success: true };
    } catch (error) {
      console.error("Failed to run folder exclusion lifecycle updates:", error);
      throw error;
    }
  });
};
