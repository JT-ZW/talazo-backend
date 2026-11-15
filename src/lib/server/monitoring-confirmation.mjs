/** Accept only unambiguous positive confirmations. Unknown provider wording
 * requires reconciliation; it must never release reserved hectares.
 * @param {unknown} value @param {'paused'|'resumed'} state */
export function monitoringConfirmed(value,state){
 if(typeof value!=='string')return false;
 const text=value.trim().replace(/[.!]$/,'').toLowerCase();
 return new RegExp(`^(?:(?:field )?(?:monitoring )?(?:(?:has been|is) )?)?${state}(?: successfully)?$`).test(text)
  ||new RegExp(`^(?:field )?monitoring (?:has been )?successfully ${state}$`).test(text);
}
