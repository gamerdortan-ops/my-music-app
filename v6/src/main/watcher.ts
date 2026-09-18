import chokidar from 'chokidar';
import * as musicMetadata from 'music-metadata';
import crypto from 'crypto'; 
import { BrowserWindow } from 'electron';
import { insertSong, deleteSongByPath } from './database';

// FIXED: Using any or ReturnType to completely bypass the Chokidar v5 type namespace error
let folderWatcher: any = null;

/**
 * Generates a clean, unique ID for every song based on its file path
 */
const generateId = (filePath: string): string => {
  return crypto.createHash('md5').update(filePath).digest('hex');
};

/**
 * Starts scanning and watching a local folder on the hard drive
 */
export const startWatchingFolder = (folderPath: string, mainWindow: BrowserWindow): void => {
  // If a previous watcher is already running, close it down first
  if (folderWatcher) {
    folderWatcher.close();
  }

  console.log(`Sync engine started watching: ${folderPath}`);

  // Initialize the directory watcher
  folderWatcher = chokidar.watch(folderPath, {
    ignored: /(^|[\/\\])\../, // Ignore hidden system files
    persistent: true,
    depth: 9 // Scan subfolders up to 9 folders deep
  });

    // 1. ADD EVENT: Triggered when a new file is found
  folderWatcher.on('add', async (filePath: string) => {
    // FIXED: Normalize path slashes and make file extension check completely case-insensitive
    const normalizedPath = filePath.replace(/\\/g, '/');
    const lowerPath = normalizedPath.toLowerCase();
    
    if (!lowerPath.endsWith('.mp3') && !lowerPath.endsWith('.wav') && !lowerPath.endsWith('.m4a')) {
      return;
    }

    try {
      // Read internal audio binary headers (ID3 Tags) using the clean path
      const metadata = await musicMetadata.parseFile(normalizedPath);
      
      const trackData = {
        id: generateId(normalizedPath),
        title: metadata.common.title || normalizedPath.split('/').pop() || 'Unknown Title',
        artist: metadata.common.artist || 'Unknown Artist',
        duration: Math.round(metadata.format.duration || 0),
        file_path: normalizedPath // Saved cleanly with forward slashes
      };

      // Push track into SQLite database cache
      insertSong(trackData as any);

      // Notify the React frontend to refresh its track display list
      mainWindow.webContents.send('library-updated');
    } catch (error) {
      console.error(`Error reading metadata from file: ${normalizedPath}`, error);
    }
  });


  // 2. DELETE EVENT: Triggered if a file is removed
  folderWatcher.on('unlink', (filePath: string) => {
    console.log(`File removed from hard drive: ${filePath}`);
    
    // Erase it from our SQLite table cache
    deleteSongByPath(filePath);

    // Alert the frontend to remove the track instantly
    mainWindow.webContents.send('library-updated');
  });
};
