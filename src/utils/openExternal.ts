import { Alert, Linking } from 'react-native';

export async function openExternalOrFallback(url: string, fallbackMessage: string) {
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
