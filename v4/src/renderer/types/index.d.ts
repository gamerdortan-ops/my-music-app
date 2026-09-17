export interface IElectronAPI {
  getSongs: () => Promise<any>;
  selectMusicFolder: () => Promise<string | null>;
  getSelectedFolder: () => Promise<string | null>;
  onLibraryUpdate: (callback: () => void) => void;
  removeLibraryListener: () => void;
  
  // ──> NATIVE CONTEXT INTERFACES
  playNativeTrack: (filePath: string) => Promise<void>;
  toggleNativePlay: () => Promise<void>;
  setNativeVolume: (volume: number) => Promise<void>;
  seekNativeTrack: (seconds: number) => Promise<void>;
  switchNativeDevice: (deviceId: string) => Promise<void>;
  onAudioEngineProgress: (callback: (data: { currentTime: number; duration: number; isPlaying: boolean }) => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
