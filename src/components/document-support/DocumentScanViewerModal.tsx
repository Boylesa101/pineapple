import { Linking, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';

import { AppButton } from '@/components/AppButton';
import { AppModal } from '@/components/AppModal';
import { colors, radii, spacing } from '@/constants/theme';
import { getDocumentSourceCtaLabel, getDocumentSourceEmptyText, getDocumentSourcePreviewUri, isDocumentPdfSource } from '@/utils/documentViewer';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  localFileUri: string | null;
  previewUri?: string | null;
  mimeType?: string | null;
  emptyText?: string;
};

export function DocumentScanViewerModal({ visible, title, onClose, localFileUri, previewUri, mimeType, emptyText }: Props) {
  const isPdf = isDocumentPdfSource(mimeType, localFileUri);
  const imageUri = getDocumentSourcePreviewUri(previewUri, localFileUri, mimeType);
  const hasFile = Boolean(localFileUri);

  return (
    <AppModal visible={visible} title={title} onClose={onClose}>
      <View style={styles.viewer}>
        {imageUri ? (
          <Image source={imageUri} style={styles.image} contentFit="contain" />
        ) : (
          <View style={styles.placeholder}>
            <MaterialIcons name={isPdf ? 'picture-as-pdf' : 'description'} size={52} color={colors.textMuted} />
            <Text style={styles.placeholderText}>{emptyText || getDocumentSourceEmptyText({ hasFile, isPdf })}</Text>
          </View>
        )}
        {hasFile ? (
          <AppButton
            label={getDocumentSourceCtaLabel(isPdf)}
            tone="secondary"
            onPress={() => {
              if (localFileUri) {
                Linking.openURL(localFileUri);
              }
            }}
          />
        ) : null}
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  viewer: {
    gap: spacing.md,
  },
  image: {
    width: '100%',
    minHeight: 420,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#DED2C5',
    backgroundColor: '#FFFDF9',
    overflow: 'hidden',
  },
  placeholder: {
    minHeight: 280,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#DED2C5',
    backgroundColor: '#FFFDF9',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  placeholderText: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
