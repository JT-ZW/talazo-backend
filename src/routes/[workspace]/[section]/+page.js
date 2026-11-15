import { error } from '@sveltejs/kit';
import { workspaces } from '$lib/client-catalog';

/** @type {import('./$types').PageLoad} */
export function load({ params }) {
  if (params.workspace === 'admin' || !Object.hasOwn(workspaces, params.workspace) ||
      !workspaces[params.workspace].sections.includes(params.section)) {
    error(404, 'Page not found');
  }
  return { workspace: params.workspace, section: params.section };
}
