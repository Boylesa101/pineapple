export function getWelcomeGreeting(hasCompletedOnboarding: boolean, date = new Date()) {
  if (!hasCompletedOnboarding) {
    return "Aloha, let's get you all set up to plan your next trip.";
  }

  const greetings = ['Welcome back', 'Hello', 'Bonjour', 'Hola'];
  return greetings[date.getDate() % greetings.length];
}

export function canAdvancePinSetup(pin: string) {
  return pin.length >= 4;
}

export function canConfirmPinSetup(pin: string, confirmation: string) {
  return pin.length >= 4 && confirmation.length === pin.length;
}

