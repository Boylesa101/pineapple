import { useEffect, useState } from 'react';
import { AccessibilityInfo, LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { HealthCardOpenView } from '@/components/health-card/HealthCardOpenView';
import { ManagedFileImage } from '@/components/ManagedFileImage';
import { colors, radii, spacing } from '@/constants/theme';
import type { Document, Traveller } from '@/types/models';
import { getDocumentExpiryInfo } from '@/utils/documentExpiry';
import { deriveHealthCardData, getHealthCardVerificationStatus } from '@/utils/healthCard';

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

export function HealthCardDocument({
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

  const record = deriveHealthCardData(document, traveller);
  const expiryInfo = getDocumentExpiryInfo(document.documentType, document.expiryDate);
  const verificationStatus = getHealthCardVerificationStatus(document, traveller);

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
        <HealthCardOpenView
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
            <Text style={[styles.cardLabel, compact ? styles.cardLabelCompact : null]}>Health card</Text>
            <Text style={[styles.cardTitle, compact ? styles.cardTitleCompact : null]}>GHIC / EHIC</Text>
          </View>
          <MaterialIcons name="local-hospital" size={compact ? 22 : 28} color="#E9F8FF" />
        </View>
        <View style={styles.cardBody}>
          <View style={[styles.photoFrame, compact ? styles.photoFrameCompact : null]}>
            {document.previewUri ? (
              <ManagedFileImage uri={document.previewUri} mimeType={document.mimeType} style={styles.photo} contentFit="cover" />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <MaterialIcons name="health-and-safety" size={compact ? 24 : 28} color="#BCEBFF" />
              </View>
            )}
          </View>
          <View style={styles.cardCopy}>
            <Text style={[styles.holderName, compact ? styles.holderNameCompact : null]} numberOfLines={2}>
              {document.holderName || traveller?.fullName || 'Card holder'}
            </Text>
            <Text style={styles.metaText} numberOfLines={1}>
              {document.documentNumber || 'Tap to open'}
            </Text>
            <Text style={styles.metaText} numberOfLines={2}>
              {(record.issuer || 'Emergency health access') + (record.countryCode ? ` • ${record.countryCode}` : '')}
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
    backgroundColor: '#1496DA',
    borderWidth: 1,
    borderColor: '#61BFEF',
    shadowColor: '#186B95',
    shadowOpacity: 0.18,
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
  cardLabel: {
    color: '#D8F4FF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardLabelCompact: {
    fontSize: 10,
  },
  cardTitle: {
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
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
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    lineHeight: 20,
  },
  holderNameCompact: {
    fontSize: 14,
    lineHeight: 18,
  },
  metaText: {
    color: '#D7F3FF',
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 17,
  },
});
