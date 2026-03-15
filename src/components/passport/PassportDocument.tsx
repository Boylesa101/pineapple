import { useEffect, useState } from 'react';
import { AccessibilityInfo, LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { PassportOpenView } from '@/components/passport/PassportOpenView';
import { colors, radii, spacing } from '@/constants/theme';
import type { Document, Traveller } from '@/types/models';
import { getDocumentExpiryInfo } from '@/utils/documentExpiry';
import { derivePassportData, getPassportVerificationStatus } from '@/utils/passport';

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

export function PassportDocument({ document, traveller, open = false, onPress, interactive = false, compact = false }: Props) {
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

  const passport = derivePassportData(document, traveller);
  const expiryInfo = getDocumentExpiryInfo(document.documentType, document.expiryDate);
  const verificationStatus = getPassportVerificationStatus(document, traveller);

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
        <PassportOpenView
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
      <View style={[styles.cover, compact ? styles.coverCompact : null]}>
        <View style={styles.coverTop}>
          <MaterialIcons name="public" size={compact ? 18 : 22} color="#DAB761" />
          <Text style={[styles.coverType, compact ? styles.coverTypeCompact : null]}>Passport</Text>
        </View>
        <View style={styles.coverMiddle}>
          <View style={styles.emblemRing}>
            <MaterialIcons name="public" size={compact ? 22 : 28} color="#DAB761" />
          </View>
          <Text style={[styles.coverCountry, compact ? styles.coverCountryCompact : null]} numberOfLines={2}>
            {passport.nationality || passport.countryCode || 'Travel document'}
          </Text>
        </View>
        <View style={styles.coverBottom}>
          <Text style={[styles.coverNumber, compact ? styles.coverNumberCompact : null]}>
            {document.documentNumber || 'Tap to open'}
          </Text>
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
    maxWidth: 180,
  },
  cover: {
    minHeight: 238,
    borderRadius: 26,
    padding: spacing.lg,
    justifyContent: 'space-between',
    backgroundColor: '#0E3556',
    borderWidth: 1,
    borderColor: '#214B70',
    shadowColor: '#091B2B',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 22,
    elevation: 5,
  },
  coverCompact: {
    minHeight: 170,
    borderRadius: 22,
    padding: spacing.md,
  },
  coverTop: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  coverType: {
    color: '#F2D48D',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  coverTypeCompact: {
    fontSize: 12,
  },
  coverMiddle: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  emblemRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: 'rgba(218, 183, 97, 0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverCountry: {
    color: '#F2D48D',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    textAlign: 'center',
  },
  coverCountryCompact: {
    fontSize: 16,
  },
  coverBottom: {
    alignItems: 'center',
  },
  coverNumber: {
    color: '#DDBB72',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    letterSpacing: 1.2,
  },
  coverNumberCompact: {
    fontSize: 12,
  },
});
