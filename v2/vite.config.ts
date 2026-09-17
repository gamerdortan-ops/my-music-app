import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // 1. Import the Tailwind compiler plugin
import * as path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'src/renderer'),
  
  // 2. Add tailwindcss() right into the plugins array list
  plugins: [react(), tailwindcss()],
  
  base: './', 
  
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  
  server: {
    port: 5173, 
  }
});
