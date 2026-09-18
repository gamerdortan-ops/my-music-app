import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getSongs: () => ipcRenderer.invoke('db:get-songs'),
  selectMusicFolder: () => ipcRenderer.invoke('fs:select-folder'),
  getSelectedFolder: () => ipcRenderer.invoke('fs:get-selected-folder'),
  onLibraryUpdate: (callback: () => void) => {
    ipcRenderer.on('library-updated', () => callback());
  },
  removeLibraryListener: () => {
    ipcRenderer.removeAllListeners('library-updated');
  },
  // Add this entry alongside your existing selectMusicFolder / getSongs setups if not present:
  removeMusicFolder: (folderPath: string) => ipcRenderer.invoke('remove-music-folder', folderPath),
  
  // ──> NATIVE HARDWARE AUDIO CONTROLS
  playNativeTrack: (filePath: string) => ipcRenderer.invoke('audio:play', filePath),
  toggleNativePlay: () => ipcRenderer.invoke('audio:toggle'),
  setNativeVolume: (volume: number) => ipcRenderer.invoke('audio:volume', volume),
  seekNativeTrack: (seconds: number) => ipcRenderer.invoke('audio:seek', seconds),
  switchNativeDevice: (deviceId: string) => ipcRenderer.invoke('audio:device', deviceId),
  onAudioEngineProgress: (callback: (data: { currentTime: number; duration: number; isPlaying: boolean }) => void) => {
    ipcRenderer.on('audio-progress', (_, data) => callback(data));
  }
});
