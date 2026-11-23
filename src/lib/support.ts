export const supportCategories={
 access:'Account access',field:'Farm or field setup',monitoring:'Satellite monitoring',
 allowance:'Monitoring allowance',report:'Reports and data',other:'Something else'
} as const;
export const supportStatuses={open:'Open',in_review:'In review',resolved:'Resolved'} as const;
export type SupportRequest={
 id:string;requester:string;category:keyof typeof supportCategories;subject:string;
 message:string;status:keyof typeof supportStatuses;reply:string;created_at:string
};
