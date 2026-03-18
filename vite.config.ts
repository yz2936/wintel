import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const removeOklchPlugin = () => {
  return {
    name: 'remove-oklch',
    enforce: 'post' as const,
    transform(code: string, id: string) {
      if (id.endsWith('.css')) {
        let newCode = code.replace(/color-mix\([^)]*\)/g, 'inherit');
        newCode = newCode.replace(/oklch\([^)]*\)/g, '#374151');
        newCode = newCode.replace(/oklab\([^)]*\)/g, '#374151');
        return { code: newCode };
      }
    },
    generateBundle(options: any, bundle: any) {
      for (const fileName in bundle) {
        if (fileName.endsWith('.css')) {
          const chunk = bundle[fileName];
          if (chunk.type === 'asset') {
            let sourceStr = typeof chunk.source === 'string' 
              ? chunk.source 
              : new TextDecoder().decode(chunk.source);
            
            sourceStr = sourceStr.replace(/color-mix\([^)]*\)/g, 'inherit');
            sourceStr = sourceStr.replace(/oklch\([^)]*\)/g, '#374151');
            sourceStr = sourceStr.replace(/oklab\([^)]*\)/g, '#374151');
            
            chunk.source = typeof chunk.source === 'string' 
              ? sourceStr 
              : new TextEncoder().encode(sourceStr);
          }
        }
      }
    }
  };
};

export default defineConfig(({mode}) => {
  return {
    plugins: [react(), tailwindcss(), removeOklchPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
