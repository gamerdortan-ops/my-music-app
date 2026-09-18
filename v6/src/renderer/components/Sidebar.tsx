import * as React from 'react';
import { Volume2, Headphones, Speaker, Disc, RefreshCw, FolderOpen } from 'lucide-react';
import { useDevices } from '../hooks/useDevices'; // 👈 IMPORT THE CLEAN NEW HOOK

interface SidebarProps {
  activeDeviceId: string | null;
  onDeviceChange: (deviceId: string) => void;
  currentFolder: string | null;
  onFolderSelect: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeDeviceId, 
  onDeviceChange, 
  currentFolder, 
  onFolderSelect 
}) => {
  // ──> CONSUME SYSTEM DISCOVERED AUDIO TRACK HARDWARE DEEP LINKS HERE
  const { devices, refreshDevices } = useDevices();

  return (
    <aside className="w-64 h-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col text-white shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] overflow-hidden">
    {/* <aside className="w-64 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col text-zinc-200"> */}
      <div className="p-6 flex items-center gap-3 border-b border-zinc-800">
        <Disc className="w-6 h-6 text-purple-500 animate-spin [animation-duration:8s]" />
        <span className="font-bold text-lg tracking-wider text-white">MUSIC_PLAYER</span>
      </div>

      {/* Navigation & Directory Displays */}
      <div className="flex-1 p-4 space-y-4">
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase px-3 tracking-wider mb-2">Library</p>
          <button className="w-full text-left px-3 py-2 rounded-md bg-zinc-800 text-white font-medium text-sm mb-2">
            All Songs
          </button>
          
          <button 
            onClick={onFolderSelect}
            className="w-full text-left px-3 py-2 rounded-md border border-dashed border-zinc-700 hover:border-purple-500 text-zinc-400 hover:text-purple-400 transition-all font-medium text-sm cursor-pointer"
          >
            + Select Music Folder
          </button>
        </div>

        {currentFolder && (
          <div className="px-3 py-2 bg-zinc-950/40 border border-zinc-800/80 rounded-lg mx-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              <FolderOpen className="w-3 h-3 text-purple-400" />
              <span>Active Directory</span>
            </div>
            <p className="text-xs text-zinc-400 truncate font-mono" title={currentFolder}>
              {currentFolder.split('/').pop()}
            </p>
          </div>
        )}
      </div>

      {/* Audio Hardware Devices Panel */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950/50">
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Audio Output</span>
          </div>
          <button onClick={refreshDevices} className="text-zinc-500 hover:text-white transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
          {devices.map((device) => {
            const isActive = device.id === activeDeviceId || (activeDeviceId === 'default' && device.id === 'default');
            const isHeadphones = device.label.toLowerCase().includes('headphone') || device.label.toLowerCase().includes('buds') || device.label.toLowerCase().includes('audio');

            return (
              <button
                key={device.id}
                onClick={() => onDeviceChange(device.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-all ${
                  isActive ? 'bg-purple-600 text-white font-medium shadow-md shadow-purple-600/10' : 'hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {isHeadphones ? <Headphones className="w-4 h-4 text-zinc-500" /> : <Speaker className="w-4 h-4 text-zinc-500" />}
                <span className="truncate">{device.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
