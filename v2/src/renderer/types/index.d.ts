export interface IElectronAPI {
  getSongs: () => Promise<any>;
  selectMusicFolder: () => Promise<string | null>;
  getSelectedFolder: () => Promise<string | null>; // ──> ADD THIS NEW LINE HERE!
  onLibraryUpdate: (callback: () => void) => void;
  removeLibraryListener: () => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
