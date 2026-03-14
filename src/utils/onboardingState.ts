export function deriveOnboardingCompletionStatus(
  storedStatus: boolean | null,
  options: { pinConfigured: boolean; tripCount: number }
) {
  if (storedStatus !== null) {
    return storedStatus;
  }

  return options.pinConfigured || options.tripCount > 0;
}
