import { useEffect, useState } from 'react';
import { AccessibilityInfo, LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { FormalDocumentOpenView } from '@/components/formal-document/FormalDocumentOpenView';
import { colors, radii, spacing } from '@/constants/theme';
import type { Document, Traveller } from '@/types/models';
import { getDocumentExpiryInfo } from '@/utils/documentExpiry';
import { deriveFormalDocumentData, getFormalDocumentVerificationStatus } from '@/utils/formalDocument';

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
  onOpenSource?: () => void;
};

export function FormalDocumentRecord({
  document,
  traveller,
  open = false,
  onPress,
  interactive = false,
  compact = false,
  onOpenSource,
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

  const record = deriveFormalDocumentData(document, traveller);
  const expiryInfo = getDocumentExpiryInfo(document.documentType, document.expiryDate);
  const verificationStatus = getFormalDocumentVerificationStatus(document);

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
      <View style={styles.wrapper}>
        <FormalDocumentOpenView
          document={document}
          traveller={traveller}
          expiryBadge={{ label: expiryInfo.badgeLabel, tone: expiryInfo.tone }}
          verificationStatus={verificationStatus}
          onOpenSource={() => onOpenSource?.()}
        />
      </View>
    );
  }

  return (
    <Pressable
      onPress={toggle}
      style={[styles.wrapper, compact ? styles.wrapperCompact : null]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${record.title || 'formal document'}`}
    >
      <View style={[styles.cover, compact ? styles.coverCompact : null]}>
        <View style={styles.coverHeader}>
          <Text style={[styles.coverLabel, compact ? styles.coverLabelCompact : null]}>Official record</Text>
          <MaterialIcons name="folder-open" size={compact ? 20 : 26} color="#E0C58F" />
        </View>
        <View style={styles.coverBody}>
          <Text style={[styles.coverTitle, compact ? styles.coverTitleCompact : null]} numberOfLines={2}>
            {record.title || 'Formal document'}
          </Text>
          <Text style={styles.coverIssuer} numberOfLines={2}>
            {record.issuer || 'Stored paperwork'}
          </Text>
        </View>
        <View style={styles.coverFooter}>
          <Text style={styles.coverMeta} numberOfLines={1}>
            {record.referenceCode || document.documentNumber || 'Tap to open'}
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
    maxWidth: 210,
  },
  cover: {
    minHeight: 156,
    borderRadius: 24,
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: '#8F5E3B',
    borderWidth: 1,
    borderColor: '#A8754F',
    shadowColor: '#5B3A22',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 4,
  },
  coverCompact: {
    minHeight: 132,
    padding: spacing.sm,
  },
  coverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  coverLabel: {
    color: '#F2DEC4',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  coverLabelCompact: {
    fontSize: 10,
  },
  coverBody: {
    gap: spacing.xs,
  },
  coverTitle: {
    color: colors.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 22,
  },
  coverTitleCompact: {
    fontSize: 15,
    lineHeight: 19,
  },
  coverIssuer: {
    color: '#F1E2D1',
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  coverFooter: {
    marginTop: 'auto',
  },
  coverMeta: {
    color: '#E6D0B0',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.6,
  },
});
