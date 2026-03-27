export function toUserMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error) || !error.message.trim()) {
    return fallback;
  }

  const message = error.message.trim();

  switch (message) {
    case 'Trip not found.':
      return 'That trip is no longer available locally.';
    case 'Conflict not found.':
      return 'That conflict is no longer available. Refresh and try again.';
    case 'No backup file selected.':
      return 'Choose a Pineapple backup file to continue.';
    case 'The selected backup file is no longer available.':
      return 'That backup file is no longer available on this device.';
    case 'Backup integrity check failed. The password or file may be invalid.':
    case 'Unable to decrypt backup. Check the password and try again.':
      return 'Pineapple could not unlock that backup. Check the password and file, then try again.';
    case 'Unsupported backup version.':
    case 'This backup file was created with an unsupported Pineapple version.':
      return 'That backup was created by an unsupported Pineapple version.';
    case 'Backup file is not valid JSON.':
    case 'Backup file is incomplete or corrupted.':
    case 'Backup file is missing required data sections.':
    case 'This backup file is not recognised.':
    case 'This backup file uses an unsupported protection format.':
      return 'That backup file is invalid or incomplete.';
    case 'This shared trip file is not recognised.':
      return 'That shared trip file is not recognised.';
    case 'This shared trip file is incomplete.':
      return 'That shared trip file is incomplete or corrupted.';
    case 'Secure document integrity check failed.':
    case 'Secure document decryption failed.':
    case 'This secure document file is invalid.':
      return 'Pineapple could not open that stored document securely. Re-import the document if the problem continues.';
    case 'Secure document access is unavailable on this platform.':
      return 'Secure document access is not available in this runtime. Use the Android app build to open that document.';
    case 'Secure random bytes are unavailable on this platform.':
    case 'Secure random bytes are unavailable on this device build.':
      return 'Pineapple could not generate a secure local key on this device build. Reinstall or update the app if this keeps happening.';
    case 'Destination is required for live Vibes suggestions.':
      return 'Add a destination to the trip before opening Vibes.';
    case 'Vibes is not configured for live suggestions yet.':
    case 'Tripadvisor is not configured on the Pineapple Cloudflare site yet. Add the TRIPADVISOR_API_KEY Pages secret to enable Vibes.':
      return 'Vibes is not configured for live suggestions yet.';
    case 'Live suggestions are temporarily unavailable.':
      return 'Live suggestions are temporarily unavailable.';
    default:
      return message.length > 160 ? fallback : message;
  }
}
