import { useState, useEffect } from 'react';

export interface AudioDevice {
  id: string;
  label: string;
}

export const useDevices = () => {
  const [devices, setDevices] = useState<AudioDevice[]>([
    { id: 'default', label: 'System Default Channel' }
  ]);

  const scanAudioDevices = async () => {
    try {
      // Prompt baseline media permissions context
      await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {});
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      
      const outputDevices = allDevices
        .filter(device => device.kind === 'audiooutput')
        .map(device => ({
          // Map ID to label text because Windows shell switches targets by string name
          id: device.label || device.deviceId,
          label: device.label || `Audio Device (${device.deviceId.slice(0, 4)})`
        }));

      // Filter out untrusted hashes or headless fallback entries
      const cleanDevices = outputDevices.filter(d => d.label && !d.label.includes('Audio Device'));
      
      setDevices(cleanDevices.length > 0 ? cleanDevices : [{ id: 'default', label: 'System Default Channel' }]);
    } catch (error) {
      console.error('Hardware discovery block error inside useDevices:', error);
    }
  };

  useEffect(() => {
    scanAudioDevices();
    navigator.mediaDevices.addEventListener('devicechange', scanAudioDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', scanAudioDevices);
  }, []);

  return {
    devices,
    refreshDevices: scanAudioDevices
  };
};
