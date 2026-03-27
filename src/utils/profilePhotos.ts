import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { cleanupImportedSource, copyIntoAppStorage, deleteLocalFile } from '@/utils/fileStorage';

export async function chooseProfilePhoto(
  existingUri: string | null | undefined,
  options: { replaceExisting?: boolean } = {}
) {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo library access to choose a profile photo.');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      aspect: [1, 1],
      allowsEditing: true,
      selectionLimit: 1,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    const asset = result.assets[0];
    const storedUri = await copyIntoAppStorage(asset.uri, 'trips', asset.mimeType, { encryptAtRest: true });
    if (options.replaceExisting !== false && existingUri && existingUri !== storedUri) {
      await deleteLocalFile(existingUri);
    }
    await cleanupImportedSource(asset.uri);
    return storedUri;
  } catch (error) {
    if (__DEV__) {
      console.error('chooseProfilePhoto failed', error);
    }
    Alert.alert('Photo not added', 'Pineapple could not use that photo right now.');
    return null;
  }
}

export async function removeProfilePhoto(uri: string | null | undefined) {
  await deleteLocalFile(uri);
}
