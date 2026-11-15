/** @param {string} value */
export function validDate(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T12:00:00Z');return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===value;
}
export const todayISO=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Africa/Harare',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
/** @param {string} month */
export function calendarDays(month){
 const [year,m]=month.split('-').map(Number);if(!year||m<1||m>12)return [];
 const first=new Date(Date.UTC(year,m-1,1,12));const offset=(first.getUTCDay()+6)%7;
 return Array.from({length:42},(_,i)=>new Date(Date.UTC(year,m-1,1-offset+i,12)).toISOString().slice(0,10));
}
/** @param {string} month @param {number} amount */
export function shiftMonth(month,amount){const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m-1+amount,1,12)).toISOString().slice(0,7);}
