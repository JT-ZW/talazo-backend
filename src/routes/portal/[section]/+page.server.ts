import {loadPortal,portalActions} from '$lib/server/portal';
export const load=(event:import('@sveltejs/kit').RequestEvent)=>loadPortal(event);
export const actions=portalActions;
