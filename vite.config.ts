import { paraglideVitePlugin } from '@inlang/paraglide-js'
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [paraglideVitePlugin({ project: './project.inlang', outdir: './src/lib/paraglide' }), tailwindcss(), sveltekit()],
  ssr: {
    noExternal: ['layerchart', '@layerstack/svelte-actions', '@layerstack/utils', '@layerstack/tailwind']
  }
});
