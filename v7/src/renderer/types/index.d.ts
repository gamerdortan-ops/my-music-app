export interface IElectronAPI {
  getSongs: () => Promise<any[]>;
  getSelectedFolder: () => Promise<string[] | string | null>;
  selectMusicFolder: () => Promise<string | null>;
  onLibraryUpdate: (callback: () => void) => void;
  removeLibraryListener: () => void;
  removeMusicFolder: (folderPath: string) => Promise<{ success: boolean }>;

  // Native hardware routing controls
  playNativeTrack: (filePath: string) => Promise<boolean>;
  toggleNativePlay: () => Promise<boolean>;
  setNativeVolume: (volume: number) => Promise<boolean>;
  seekNativeTrack: (seconds: number) => Promise<boolean>;
  switchNativeDevice: (deviceLabel: string) => Promise<boolean>;
  onAudioEngineProgress: (callback: (data: { currentTime: number; duration: number; isPlaying: boolean }) => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
