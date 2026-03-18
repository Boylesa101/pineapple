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
    default:
      return message.length > 160 ? fallback : message;
  }
}
