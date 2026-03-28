import { Alert, Linking } from 'react-native';

function isAllowedExternalUrl(url: string, allowedSchemes: string[]) {
  try {
    const parsed = new URL(url);
    const scheme = parsed.protocol.replace(/:$/, '').toLowerCase();
    return allowedSchemes.includes(scheme);
  } catch {
    return false;
  }
}

export async function openExternalOrFallback(
  url: string,
  fallbackMessage: string,
  options: { allowedSchemes?: string[] } = {}
) {
  const allowedSchemes = options.allowedSchemes ?? ['https', 'http'];

  if (!isAllowedExternalUrl(url, allowedSchemes)) {
    Alert.alert('Open link unavailable', fallbackMessage);
    return false;
  }

  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Open link unavailable', fallbackMessage);
      return false;
    }

    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert('Open link unavailable', fallbackMessage);
    return false;
  }
}
