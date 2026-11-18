import {error} from '@sveltejs/kit';
import {workspaces} from '#lib/catalog.js';
export function load({params,data}){
 const workspace=workspaces[params.workspace];
 if(!workspace || !workspace.sections.includes(params.section))error(404,'Workspace or page not found');
 return {workspace:params.workspace,section:params.section,bench:data.bench};
}
