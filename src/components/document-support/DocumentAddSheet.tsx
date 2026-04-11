import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppModal } from '@/components/AppModal';
import { ChoiceChips } from '@/components/ChoiceChips';
import { colors, radii, spacing } from '@/constants/theme';
import type { DocumentType } from '@/types/models';

type Props = {
  visible: boolean;
  importTarget: DocumentType;
  onImportTargetChange: (value: DocumentType) => void;
  onClose: () => void;
  onScanPassport: () => void;
  onScanDrivingLicence: () => void;
  onScanHealthCard: () => void;
  onAddPaymentCard: () => void;
  onAddFormalDocument: () => void;
  onImportPdfOrImage: () => void;
  onManualEntry: () => void;
};

type ActionRowProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
};

function ActionRow({ icon, title, description, onPress }: ActionRowProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionRow, pressed ? styles.actionRowPressed : null]}>
      <View style={styles.actionIconWrap}>
        <MaterialIcons name={icon} size={22} color={colors.primaryBlue} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={colors.textLight} />
    </Pressable>
  );
}

export function DocumentAddSheet({
  visible,
  importTarget,
  onImportTargetChange,
  onClose,
  onScanPassport,
  onScanDrivingLicence,
  onScanHealthCard,
  onAddPaymentCard,
  onAddFormalDocument,
  onImportPdfOrImage,
  onManualEntry,
}: Props) {
  return (
    <AppModal visible={visible} title="Add a document" onClose={onClose}>
      <AppCard title="Scan with OCR" subtitle="Start with a guided scan so Pineapple can extract the fields for review before you save.">
        <ActionRow icon="book" title="Scan passport" description="Guide a passport into frame and extract identity fields automatically." onPress={onScanPassport} />
        <ActionRow icon="badge" title="Scan driving licence" description="Capture the photocard first, then review extracted holder details." onPress={onScanDrivingLicence} />
        <ActionRow icon="health-and-safety" title="Scan health card" description="Scan a GHIC or EHIC and review expiry, issuer, and emergency details." onPress={onScanHealthCard} />
      </AppCard>

      <AppCard title="Add other records" subtitle="Use a structured manual flow for insurance records, travel tickets, lounge passes, hire-car vouchers, and loyalty cards.">
        <ActionRow icon="credit-card" title="Add payment card manually" description="Save a secure masked card record without exposing sensitive values by default." onPress={onAddPaymentCard} />
        <ActionRow icon="description" title="Add formal document" description="Store insurance records, lounge passes, hire-car bookings, rail tickets, loyalty cards, and confirmations." onPress={onAddFormalDocument} />
      </AppCard>

      <AppCard title="Import PDF or image" subtitle="Use an existing image or PDF already on this device and route it into the right OCR review flow.">
        <Text style={styles.importLabel}>Import target</Text>
        <ChoiceChips<DocumentType>
          value={importTarget}
          onChange={onImportTargetChange}
          options={[
            { label: 'Passport', value: 'passport' },
            { label: 'Driving licence', value: 'driving_licence' },
            { label: 'Health card', value: 'ghic' },
            { label: 'Formal document', value: 'insurance' },
          ]}
        />
        <AppButton label="Import PDF / image" tone="secondary" onPress={onImportPdfOrImage} />
        <AppButton label="Enter manually" tone="outline" onPress={onManualEntry} />
      </AppCard>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  actionRowPressed: {
    opacity: 0.85,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBlueSurface,
  },
  actionCopy: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  actionDescription: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  importLabel: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
});
