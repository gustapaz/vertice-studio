import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('.',import.meta.url)),base:'/atelier/',publicDir:false,esbuild:{jsxFactory:'h',jsxFragment:'Fragment'},build:{outDir:'../public/atelier',emptyOutDir:true,rollupOptions:{input:fileURLToPath(new URL('src/main.tsx',import.meta.url)),output:{entryFileNames:'app.js',chunkFileNames:'[name]-[hash].js',assetFileNames:'[name]-[hash][extname]'}}}});
