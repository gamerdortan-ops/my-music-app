import { useState, useEffect } from 'react';

export interface AudioDevice {
  id: string;
  label: string;
}

export const useDevices = () => {
  const [devices, setDevices] = useState<AudioDevice[]>([]);

  const scanAudioDevices = async () => {
    try {
      // Prompt permissions sequence to let browser pull human-readable labels cleanly
      await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {});
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      
      const outputDevices = allDevices
        .filter(device => device.kind === 'audiooutput' && device.deviceId !== '')
        .map(device => ({
          id: device.deviceId,
          label: device.label || `Audio Target (${device.deviceId.slice(0, 4)})`
        }));
        
      setDevices(outputDevices);
    } catch (error) {
      console.error('Hardware discovery block error inside useDevices:', error);
    }
  };

  useEffect(() => {
    scanAudioDevices();
    // Watch for hard drive plugs, device disconnects, or new Bluetooth syncs live
    navigator.mediaDevices.addEventListener('devicechange', scanAudioDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', scanAudioDevices);
  }, []);

  return {
    devices,
    refreshDevices: scanAudioDevices
  };
};
