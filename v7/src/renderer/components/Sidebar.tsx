import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Volume2, Headphones, Speaker, Disc, RefreshCw, FolderOpen, Plus, Trash2 } from 'lucide-react';
import { useDevices } from '../hooks/useDevices';

interface SidebarProps {
  activeDeviceId: string | null;
  onDeviceChange: (deviceId: string) => void;
  currentFolders: string[]; 
  onFolderSelect: () => void;
  onFolderRemoved: () => Promise<void>;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeDeviceId, 
  onDeviceChange, 
  currentFolders = [], 
  onFolderSelect,
  onFolderRemoved
}) => {
  const { devices, refreshDevices } = useDevices();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; folder: string } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleFolderRightClick = (e: React.MouseEvent, folder: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      folder
    });
  };

  const handleRemoveDirectory = async (folder: string) => {
    setContextMenu(null);
    if (window.electronAPI?.removeMusicFolder) {
      await window.electronAPI.removeMusicFolder(folder);
      await onFolderRemoved();
    }
  };

  return (
    <aside className="w-64 h-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col text-white shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] overflow-hidden relative">
      
      {/* App Branding */}
      <div className="p-5 flex items-center gap-3 border-b border-white/10 bg-white/5">
        <Disc className="w-6 h-6 text-cyan-400 animate-spin [animation-duration:8s] drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
        <span className="font-extrabold text-base tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-purple-300">MUSIC PLAYER</span>
      </div>

      {/* Media Directory Group Panel */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
        <div>
          <div className="flex items-center justify-between px-2 mb-3">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Media Directories</p>
            <button 
              onClick={onFolderSelect}
              className="p-1 rounded-md border border-white/10 bg-white/5 text-white/60 hover:text-cyan-400 hover:border-cyan-400/40 hover:shadow-[0_0_8px_rgba(34,211,238,0.4)] transition-all cursor-pointer"
              title="Add New Music Folder"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dynamic Directories Map List */}
          {currentFolders.length === 0 ? (
            <div className="p-4 border border-dashed border-white/5 rounded-xl text-center text-white/30 text-[11px] font-medium leading-relaxed bg-black/10">
              No media sources tracked. Click the (+) icon to map audio libraries.
            </div>
          ) : (
            <div className="space-y-2">
              {currentFolders.map((folder) => (
                <div
                  key={folder}
                  onContextMenu={(e) => handleFolderRightClick(e, folder)}
                  className="px-3 py-2.5 bg-black/20 border border-white/5 hover:border-purple-500/40 rounded-xl transition-all duration-300 group cursor-help relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/2 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  <div className="flex items-center gap-2 text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-0.5">
                    <FolderOpen className="w-3 h-3 text-purple-400 flex-shrink-0" />
                    <span className="truncate">Library Source</span>
                  </div>
                  <p className="text-xs text-white/70 truncate font-mono" title={folder}>
                    {folder.split('/').pop() || folder.split('\\').pop() || folder}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Context Menu Popup Portal */}
      {contextMenu && (
        <div 
          ref={menuRef}
          style={{ top: contextMenu.y - 20, left: contextMenu.x - 10 }}
          className="fixed z-50 bg-[#120f1d]/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl p-1 w-44 animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            onClick={() => handleRemoveDirectory(contextMenu.folder)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove Directory
          </button>
        </div>
      )}

      {/* Audio Hardware Devices Panel */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Audio Output</span>
          </div>
          <button onClick={refreshDevices} className="text-white/40 hover:text-white transition-colors">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
          {devices.map((device) => {
            const isActive = device.id === activeDeviceId || (activeDeviceId === 'default' && device.id === 'default');
            const isHeadphones = /headphone|buds|audio/i.test(device.label);

            return (
              <button
                key={device.id}
                onClick={async () => {
                  onDeviceChange(device.id);
                  if (window.electronAPI?.switchNativeDevice) {
                    await window.electronAPI.switchNativeDevice(device.label);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-left transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-gradient-to-r from-purple-500/80 to-purple-600/80 border border-purple-400/40 text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]' 
                    : 'hover:bg-white/5 text-white/60 hover:text-white border border-transparent'
                }`}
              >
                {isHeadphones ? <Headphones className="w-3.5 h-3.5 text-cyan-400" /> : <Speaker className="w-3.5 h-3.5 text-purple-400" />}
                <span className="truncate">{device.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
