// Error codes passed in redirect URLs. Pages only ever show these fixed messages,
// so a crafted link can't put arbitrary text on a portal page.
export const MESSAGES = {
  invalid: 'Some details weren’t valid. Check the form and try again.',
  invite_failed: 'The invitation couldn’t be created. Try again.',
  keep_owner: 'The firm must keep at least one owner.',
  save_failed: 'That change didn’t save. Try again.',
  remove_failed: 'That person couldn’t be removed.',
  slug_taken: 'That short name is already used by another client. Choose a different one.',
  create_failed: 'The client couldn’t be created. Try again.',
  build_failed: 'The preview couldn’t be saved. Check the link and try again.',
  asana_failed: 'That Asana change didn’t go through. Check the project number and try again.',
} as const;
export type MessageCode = keyof typeof MESSAGES;
export const messageFor = (code: unknown) =>
  typeof code === 'string' && code in MESSAGES ? MESSAGES[code as MessageCode] : null;
