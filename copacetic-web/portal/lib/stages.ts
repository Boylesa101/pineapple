export const STAGES = [
  { id: 'invited', label: 'Invited', client: 'Accept your invitation to get started.' },
  { id: 'onboarding', label: 'Onboarding', client: 'Complete your briefing and send us your content.' },
  { id: 'content_submitted', label: 'Content submitted', client: 'Thanks. We have your content and are reviewing it.' },
  { id: 'in_build', label: 'In build', client: 'We are building your website.' },
  { id: 'in_review', label: 'In review', client: 'Your draft is ready. Review the previews below.' },
  { id: 'signed_off', label: 'Signed off', client: 'You have approved your site. Your invoice is on its way.' },
  { id: 'paid', label: 'Paid', client: 'Thank you. We are preparing your launch.' },
  { id: 'live', label: 'Live', client: 'Your website is live.' },
] as const;

export type StageId = (typeof STAGES)[number]['id'];
export const STAGE_IDS = STAGES.map((s) => s.id) as [StageId, ...StageId[]];
export const stageInfo = (id: string) => STAGES.find((s) => s.id === id) ?? STAGES[0];
export const stageIndex = (id: string) => STAGES.findIndex((s) => s.id === id);

export const ROLE_LABELS = {
  owner: 'Owner',
  approver: 'Approver',
  editor: 'Editor',
} as const;
export const ROLE_HELP = {
  owner: 'Manages the firm’s users, signs off builds and sees invoices.',
  approver: 'Approves blog posts and signs off builds (usually the COLP or a partner).',
  editor: 'Writes content and blog drafts. Can’t publish or sign off.',
} as const;
