/** Google may leave incomplete listener handles after an authorization failure.
 * Cleanup must never prevent a retry or navigation. @param {unknown[]} listeners */
export function removeMapListeners(listeners){
 for(const listener of listeners){try{const handle=/** @type {{remove?:()=>void}|null|undefined} */(listener);handle?.remove?.();}catch{/* Continue disposing the remaining handles. */}}
}
