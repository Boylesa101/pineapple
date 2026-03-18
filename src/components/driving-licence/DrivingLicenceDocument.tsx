import { useEffect, useState } from 'react';
import { AccessibilityInfo, LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { DrivingLicenceOpenView } from '@/components/driving-licence/DrivingLicenceOpenView';
import { ManagedFileImage } from '@/components/ManagedFileImage';
import { colors, radii, spacing } from '@/constants/theme';
import type { Document, Traveller } from '@/types/models';
import { getDocumentExpiryInfo } from '@/utils/documentExpiry';
import { deriveDrivingLicenceData, getDrivingLicenceVerificationStatus } from '@/utils/drivingLicence';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  document: Document;
  traveller?: Traveller | null;
  open?: boolean;
  onPress?: () => void;
  interactive?: boolean;
  compact?: boolean;
};

export function DrivingLicenceDocument({
  document,
  traveller,
  open = false,
  onPress,
  interactive = false,
  compact = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(open);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotionEnabled)
      .catch(() => setReduceMotionEnabled(false));
  }, []);

  const record = deriveDrivingLicenceData(document, traveller);
  const expiryInfo = getDocumentExpiryInfo(document.documentType, document.expiryDate);
  const verificationStatus = getDrivingLicenceVerificationStatus(document, traveller);

  function toggle() {
    if (interactive) {
      if (!reduceMotionEnabled) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setIsOpen((value) => !value);
      return;
    }

    onPress?.();
  }

  if (isOpen) {
    return (
      <Pressable onPress={toggle} style={styles.wrapper}>
        <DrivingLicenceOpenView
          document={document}
          traveller={traveller}
          expiryBadge={{ label: expiryInfo.badgeLabel, tone: expiryInfo.tone }}
          verificationStatus={verificationStatus}
        />
      </Pressable>
    );
  }

  return (
    <Pressable onPress={toggle} style={[styles.wrapper, compact ? styles.wrapperCompact : null]}>
      <View style={[styles.card, compact ? styles.cardCompact : null]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.govText, compact ? styles.govTextCompact : null]}>United Kingdom</Text>
            <Text style={[styles.cardTitle, compact ? styles.cardTitleCompact : null]}>Driving Licence</Text>
          </View>
          <MaterialIcons name="directions-car-filled" size={compact ? 22 : 28} color="#0F6DA2" />
        </View>
        <View style={styles.cardBody}>
          <View style={[styles.photoFrame, compact ? styles.photoFrameCompact : null]}>
            {document.previewUri ? (
              <ManagedFileImage uri={document.previewUri} mimeType={document.mimeType} style={styles.photo} contentFit="cover" />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <MaterialIcons name="portrait" size={compact ? 22 : 26} color={colors.textMuted} />
              </View>
            )}
          </View>
          <View style={styles.cardCopy}>
            <Text style={[styles.holderName, compact ? styles.holderNameCompact : null]} numberOfLines={2}>
              {document.holderName || traveller?.fullName || 'Licence holder'}
            </Text>
            <Text style={styles.metaText} numberOfLines={1}>
              {document.documentNumber || 'Tap to open'}
            </Text>
            <Text style={styles.metaText} numberOfLines={2}>
              {record.status || 'Status pending'} {document.secondaryLocalFileUri ? '• reverse saved' : ''}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  wrapperCompact: {
    maxWidth: 210,
  },
  card: {
    minHeight: 144,
    borderRadius: 24,
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: '#F6D9E4',
    borderWidth: 1,
    borderColor: '#E3B8C8',
    shadowColor: '#AF8FA0',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 18,
    elevation: 4,
  },
  cardCompact: {
    minHeight: 122,
    padding: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  govText: {
    color: '#7A4C63',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  govTextCompact: {
    fontSize: 10,
  },
  cardTitle: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
  cardTitleCompact: {
    fontSize: 15,
  },
  cardBody: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  photoFrame: {
    width: 90,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: '#EBDDE2',
    borderWidth: 1,
    borderColor: '#D9C0C9',
  },
  photoFrameCompact: {
    width: 74,
  },
  photo: {
    width: '100%',
    aspectRatio: 0.78,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  holderName: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    lineHeight: 20,
  },
  holderNameCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  metaText: {
    color: '#62475A',
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 17,
  },
});
