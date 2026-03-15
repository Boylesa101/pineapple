import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radii, spacing } from '@/constants/theme';

type Props = {
  previewUri: string | null;
  localFileUri: string;
  mimeType: string | null;
  onOpen: () => void;
};

export function DocumentPreviewPane({ previewUri, localFileUri, mimeType, onOpen }: Props) {
  const isPdf = mimeType === 'application/pdf' || localFileUri.toLowerCase().endsWith('.pdf');

  return (
    <View style={styles.panel}>
      <Text style={styles.label}>Original</Text>
      {previewUri && !isPdf ? (
        <Image source={previewUri} style={styles.preview} contentFit="contain" />
      ) : (
        <View style={[styles.preview, styles.placeholder]}>
          <MaterialIcons name={isPdf ? 'picture-as-pdf' : 'description'} size={38} color={colors.textMuted} />
          <Text style={styles.placeholderText}>{isPdf ? 'PDF stored locally' : localFileUri ? 'Source file stored locally' : 'No source file attached'}</Text>
        </View>
      )}
      <Pressable onPress={onOpen} style={styles.button} disabled={!localFileUri}>
        <MaterialIcons name="open-in-new" size={18} color={colors.oceanBlue} />
        <Text style={styles.buttonText}>{isPdf ? 'Open PDF' : 'Open source file'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  preview: {
    width: '100%',
    minHeight: 220,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#DDD1C3',
    backgroundColor: '#FFFCF7',
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  placeholderText: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    color: colors.oceanBlue,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
});
