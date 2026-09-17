import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getSongs: () => ipcRenderer.invoke('db:get-songs'),
  selectMusicFolder: () => ipcRenderer.invoke('fs:select-folder'),
  getSelectedFolder: () => ipcRenderer.invoke('fs:get-selected-folder'), // ADD THIS NEW LINE
  onLibraryUpdate: (callback: () => void) => {
    ipcRenderer.on('library-updated', () => callback());
  },
  removeLibraryListener: () => {
    ipcRenderer.removeAllListeners('library-updated');
  }
});
