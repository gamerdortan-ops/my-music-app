import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';

let db: Database.Database;

// Define what a Song structure looks like
export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  file_path: string;
}

/**
 * Initializes the SQLite Database file on the user's machine.
 * The file sits securely inside the application's local user data folder.
 */
export const initDatabase = (): void => {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'glow_library.db');

  // Open or create the database file
  db = new Database(dbPath);

  // Create the 'songs' table if it doesn't exist yet
  db.exec(`
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      title TEXT,
      artist TEXT,
      duration INTEGER,
      file_path TEXT UNIQUE
    )
  `);
  
  console.log(`Database initialized successfully at: ${dbPath}`);
};

/**
 * Retrieves all songs cached inside the local database.
 */
// Replace your current getAllSongs() block inside database.ts with this layout:
export const getAllSongs = (): Track[] => {
  try {
    // If database connection is active but no directory is loaded yet, return empty list!
    if (!db) return [];
    
    const stmt = db.prepare('SELECT * FROM songs ORDER BY title ASC');
    return stmt.all() as Track[];
  } catch (error) {
    console.error('Failed to fetch songs from database:', error);
    return [];
  }
};


/**
 * Caches a new song metadata record into the database.
 * If the file path already exists, it skips it to prevent duplicates.
 */
export const insertSong = (track: Track): void => {
  try {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO songs (id, title, artist, duration, file_path)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(track.id, track.title, track.artist, track.duration, track.file_path);
  } catch (error) {
    console.error(`Failed to insert song (${track.title}):`, error);
  }
};

/**
 * Deletes a song record from the database based on its file path location.
 * This triggers when a user manually deletes a file outside the app.
 */
export const deleteSongByPath = (filePath: string): void => {
  try {
    const stmt = db.prepare('DELETE FROM songs WHERE file_path = ?');
    stmt.run(filePath);
  } catch (error) {
    console.error(`Failed to delete song at path (${filePath}):`, error);
  }
};

/**
 * Completely purges the local songs table.
 * Triggers when a user switches to a brand new folder directory space.
 */
export const clearDatabase = (): void => {
  try {
    if (!db) return;
    const stmt = db.prepare('DELETE FROM songs');
    stmt.run();
    console.log('Local music tracking database table successfully purged.');
  } catch (error) {
    console.error('Failed to clear local cached song table:', error);
  }
};
