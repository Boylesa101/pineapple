export type OnboardingStep = 'language' | 'name' | 'pin' | 'biometrics' | 'traveller_setup' | 'complete';

type OnboardingDeriveOptions = {
  pinConfigured: boolean;
  profileName: string;
  travellerCount: number;
  documentCount: number;
  tripCount: number;
};

export function isOnboardingStep(value: string | null | undefined): value is OnboardingStep {
  return (
    value === 'language' ||
    value === 'name' ||
    value === 'pin' ||
    value === 'biometrics' ||
    value === 'traveller_setup' ||
    value === 'complete'
  );
}

export function deriveOnboardingStep(
  storedStep: OnboardingStep | null,
  legacyCompleted: boolean | null,
  options: OnboardingDeriveOptions
): OnboardingStep {
  if (storedStep) {
    return storedStep;
  }

  if (legacyCompleted === true) {
    return 'complete';
  }

  const hasProfileName = Boolean(options.profileName.trim());
  const hasEstablishedData = options.travellerCount > 0 || options.documentCount > 0 || options.tripCount > 0;

  if (options.pinConfigured && hasProfileName && hasEstablishedData) {
    return 'complete';
  }

  if (options.pinConfigured && hasProfileName) {
    return 'biometrics';
  }

  if (options.pinConfigured) {
    return 'name';
  }

  if (hasProfileName) {
    return 'pin';
  }

  return 'language';
}

export function hasCompletedOnboarding(step: OnboardingStep) {
  return step === 'complete';
}
