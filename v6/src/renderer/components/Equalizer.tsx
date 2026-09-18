import * as React from 'react';
import { useAudio } from '../hooks/useAudio';
import { Sliders } from 'lucide-react';

export const Equalizer: React.FC = () => {
  const { bass, mid, treble, changeBass, changeMid, changeTreble } = useAudio();

  const eqBands = [
    { label: 'BASS', sub: '60Hz - 200Hz', value: bass, onChange: changeBass },
    { label: 'MID', sub: '500Hz - 2kHz', value: mid, onChange: changeMid },
    { label: 'TREBLE', sub: '4kHz - 16kHz', value: treble, onChange: changeTreble }
  ];

  return (
    <div className="w-full max-w-sm bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-xl p-4 shadow-2xl flex flex-col gap-3 text-white select-none">
      
      {/* Equalizer Title Header */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <Sliders className="w-3.5 h-3.5 text-purple-400" />
        <h3 className="text-xs font-semibold text-zinc-200 tracking-wide">AUDIO MIXER EQUALIZER</h3>
      </div>

      {/* Horizontal Sliders Layout */}
      <div className="flex flex-col gap-3 bg-zinc-950/40 border border-zinc-800/50 rounded-lg p-3">
        {eqBands.map((band) => (
          <div key={band.label} className="flex flex-col gap-1 w-full">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-zinc-300 tracking-wide text-[11px]">{band.label}</span>
                <span className="text-[9px] text-zinc-500 font-mono">{band.sub}</span>
              </div>
              <span className="text-[10px] font-mono tabular-nums text-purple-400">
                {band.value > 0 ? `+${band.value}` : band.value} dB
              </span>
            </div>
            
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={band.value}
              onChange={(e) => band.onChange(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer h-1 bg-zinc-800 rounded-lg appearance-none outline-none mt-1"
              title={`${band.label} Control`}
            />
          </div>
        ))}
      </div>

      {/* Preset Action Buttons */}
      <div className="flex gap-2 justify-between">
        <button 
          onClick={() => { changeBass(0); changeMid(0); changeTreble(0); }}
          className="flex-1 py-1 text-[10px] uppercase font-semibold border border-zinc-800 bg-zinc-950/20 text-zinc-400 hover:text-white hover:bg-zinc-800/50 hover:border-zinc-700 rounded transition-all"
        >
          Reset Flat
        </button>
        <button 
          onClick={() => { changeBass(9); changeMid(2); changeTreble(-2); }}
          className="flex-1 py-1 text-[10px] uppercase font-semibold border border-purple-900/40 bg-purple-950/10 text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 hover:border-purple-600 rounded transition-all"
        >
          💥 Bass Boost
        </button>
      </div>

    </div>
  );
};
