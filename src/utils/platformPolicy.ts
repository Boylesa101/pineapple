import { Platform } from 'react-native';

export const sensitiveWebSupportMessage =
  'Pineapple web is not an approved surface for sensitive vault data, manual-share sync, or encrypted backups. Use the installed Android app for those features.';

export function isWebCompanionPolicyActive() {
  return Platform.OS === 'web';
}
