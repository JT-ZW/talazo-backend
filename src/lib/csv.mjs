/** Escape spreadsheet formulas as well as CSV delimiters. @param {unknown} value */
export function csvCell(value){let text=String(value??'');if(/^[\s]*[=+\-@]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
/** @param {unknown[][]} rows */
export const csv=rows=>rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
