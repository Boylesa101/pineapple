import { useEffect, useState } from 'react';
import { AccessibilityInfo, LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { PaymentCardOpenView } from '@/components/payment-card/PaymentCardOpenView';
import { colors, radii, spacing } from '@/constants/theme';
import type { Document, Traveller } from '@/types/models';
import { getDocumentExpiryInfo } from '@/utils/documentExpiry';
import { derivePaymentCardData, getPaymentCardVerificationStatus, maskPaymentCardNumber } from '@/utils/paymentCard';

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

export function PaymentCardDocument({
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

  const record = derivePaymentCardData(document, traveller);
  const expiryInfo = getDocumentExpiryInfo(document.documentType, document.expiryDate);
  const verificationStatus = getPaymentCardVerificationStatus(document);

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
        <PaymentCardOpenView
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
        <View style={styles.cardTop}>
          <Text style={[styles.bankName, compact ? styles.bankNameCompact : null]} numberOfLines={1}>
            {record.bank || 'Travel payment card'}
          </Text>
          <MaterialIcons name="credit-card" size={compact ? 22 : 28} color="#F7E6BA" />
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.cardType, compact ? styles.cardTypeCompact : null]}>{record.cardType || 'Payment card'}</Text>
          <Text style={[styles.cardNumber, compact ? styles.cardNumberCompact : null]}>{maskPaymentCardNumber(document.documentNumber)}</Text>
        </View>
        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.bottomLabel}>Card holder</Text>
            <Text style={[styles.bottomValue, compact ? styles.bottomValueCompact : null]} numberOfLines={1}>
              {document.holderName || traveller?.fullName || 'Card holder'}
            </Text>
          </View>
          <View>
            <Text style={styles.bottomLabel}>Expiry</Text>
            <Text style={[styles.bottomValue, compact ? styles.bottomValueCompact : null]}>
              {document.expiryDate ? document.expiryDate.slice(2, 7).replace('-', '/') : '--/--'}
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
    maxWidth: 220,
  },
  card: {
    minHeight: 148,
    borderRadius: 24,
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: '#17324A',
    borderWidth: 1,
    borderColor: '#2C4E6F',
    shadowColor: '#0D1823',
    shadowOpacity: 0.24,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 18,
    elevation: 4,
  },
  cardCompact: {
    minHeight: 126,
    padding: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  bankName: {
    flex: 1,
    color: '#F5E2B1',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
  bankNameCompact: {
    fontSize: 15,
  },
  cardBody: {
    gap: spacing.sm,
  },
  cardType: {
    color: '#DDE9F3',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  cardTypeCompact: {
    fontSize: 10,
  },
  cardNumber: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    letterSpacing: 1.8,
  },
  cardNumberCompact: {
    fontSize: 16,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  bottomLabel: {
    color: '#A9BECE',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bottomValue: {
    color: colors.white,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  bottomValueCompact: {
    fontSize: 12,
  },
});
