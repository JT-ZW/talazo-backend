export const impactMetrics = {
 lossTonnes: {label:'Crop loss prevented',unit:'tonnes',max:1000000},
 lossReduction: {label:'Preventable crop loss reduction',unit:'%',max:100},
 evaluatedArea: {label:'Pilot area evaluated for crop loss',unit:'ha',max:1000000},
 onboarded: {label:'Pilot farmers onboarded',unit:'farmers',max:1000000,whole:true},
 retention: {label:'Long-term farmer participation',unit:'%',max:100},
 monitoredArea: {label:'Pilot area under active AI and sensor monitoring',unit:'ha',max:1000000},
 interventions: {label:'Agronomist-validated interventions',unit:'interventions',max:1000000,whole:true},
 waterSaved: {label:'Water saved against baseline',unit:'m³',max:100000000000},
 training: {label:'Farmers trained',unit:'farmers',max:1000000,whole:true},
 payingCustomers: {label:'Paying customers',unit:'customers',max:1000000,whole:true},
 revenue: {label:'Monthly earned revenue',unit:'USD',max:1000000000},
 costs: {label:'Monthly operating costs',unit:'USD',max:1000000000},
 consentedStories: {label:'Farmer stories with publication consent',unit:'stories',max:1000000,whole:true}
} as const;

export type ImpactMetric = keyof typeof impactMetrics;
export type ImpactEntry = {id:string;metric:ImpactMetric;period:string;value:number; evidence:string;created_at:string};
export function isImpactMetric(value:string):value is ImpactMetric {
 return Object.hasOwn(impactMetrics,value);
}
