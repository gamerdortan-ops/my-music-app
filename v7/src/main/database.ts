import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';

// Initialize the SQLite database connection safely in the local system folder
const dbPath = path.join(app.getPath('userData'), 'glow_player.db');
const db = new Database(dbPath);

/**
 * Ensures data tables are built correctly on application startup
 */
export const initDatabase = (): void => {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      title TEXT,
      artist TEXT,
      duration INTEGER,
      file_path TEXT UNIQUE
    )
  `).run();

  console.log('SQLite backend data matrix verified successfully.');
};

/*
 * ------------------------------------------------------------
 * AUDIO TRACK DATA TRANSACTIONS
 * ------------------------------------------------------------
 */

export const getSongs = (): any[] => {
  return db.prepare('SELECT * FROM songs ORDER BY title ASC').all();
};

export const insertSong = (song: { id: string; title: string; artist: string; duration: number; file_path: string }): void => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO songs (id, title, artist, duration, file_path)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(song.id, song.title, song.artist, song.duration, song.file_path);
};

export const deleteSongByPath = (filePath: string): void => {
  db.prepare('DELETE FROM songs WHERE file_path = ?').run(filePath);
};

/**
 * Removes all indexed music files that are contained within a specific directory path structure
 */
export const deleteSongsByDirectory = (folderPath: string): void => {
  const folderWildcard = `${folderPath}%`;
  db.prepare('DELETE FROM songs WHERE file_path LIKE ?').run(folderWildcard);
  console.log(`Successfully purged cache entries for sub-directory: ${folderPath}`);
};
