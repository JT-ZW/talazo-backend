import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import node from '@sveltejs/adapter-node';
import vercel from '@sveltejs/adapter-vercel';
// Keep localhost's standalone server; Vercel sets VERCEL=1 during its build.
const adapter = process.env.VERCEL === '1'
  ? vercel({ runtime: 'nodejs24.x', maxDuration: 240 })
  : node();
export default defineConfig({ plugins: [sveltekit({adapter})] });
