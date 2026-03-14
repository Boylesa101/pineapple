import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { ChoiceChips } from '@/components/ChoiceChips';
import { EmptyState } from '@/components/EmptyState';
import { InfoChip } from '@/components/InfoChip';
import { ListRow } from '@/components/ListRow';
import { colors, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import { formatShortDate } from '@/utils/date';
import { documentTypeSupportsExpiryWarnings, getDocumentExpiryInfo } from '@/utils/documentExpiry';

const documentLabels = {
  passport: 'Passport',
  ghic: 'GHIC / EHIC',
  insurance: 'Travel insurance',
  visa: 'Visa',
  driving_licence: 'Driving licence',
  id_card: 'ID card',
  boarding_pass: 'Boarding pass',
  hotel_booking: 'Hotel booking',
  excursion_ticket: 'Excursion ticket',
  custom: 'Custom document',
} as const;

type FilterMode = 'all' | 'expiring' | 'expired' | 'notifications_off';

export default function WarningsScreen() {
  const router = useRouter();
  const { data, setActiveTrip } = useAppStore();
  const [filter, setFilter] = useState<FilterMode>('all');

  const documents = useMemo(() => {
    return data.documents
      .filter((document) => documentTypeSupportsExpiryWarnings(document.documentType))
      .map((document) => {
        const trip = data.trips.find((item) => item.id === document.tripId) ?? null;
        const traveller = data.travellers.find((item) => item.id === document.travellerId) ?? null;
        const info = getDocumentExpiryInfo(document.documentType, document.expiryDate);
        return {
          document,
          trip,
          traveller,
          info,
        };
      })
      .filter((item) => {
        if (filter === 'expiring') return item.info.isExpiring;
        if (filter === 'expired') return item.info.isExpired;
        if (filter === 'notifications_off') return !item.document.expiryReminderEnabled;
        return true;
      })
      .sort((left, right) => {
        const leftTime = left.document.expiryDate ? new Date(left.document.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.document.expiryDate ? new Date(right.document.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      });
  }, [data.documents, data.travellers, data.trips, filter]);

  return (
    <AppScreen title="Expiry warnings" subtitle="Track document validity locally and edit reminder settings before travel.">
      <AppCard title="Filters">
        <ChoiceChips<FilterMode>
          value={filter}
          onChange={setFilter}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Expiring soon', value: 'expiring' },
            { label: 'Expired', value: 'expired' },
            { label: 'Notifications off', value: 'notifications_off' },
          ]}
        />
        {!data.appPreferences.expiryRemindersEnabled ? (
          <Text style={styles.note}>Expiry reminders are currently disabled in Settings. Status warnings still show inside the app.</Text>
        ) : null}
      </AppCard>

      <AppCard title="Overview">
        <View style={styles.chipRow}>
          <InfoChip label={`${data.documents.filter((item) => item.expiredStatus).length} expired`} tone="danger" />
          <InfoChip label={`${data.documents.filter((item) => item.expiringSoonStatus).length} expiring soon`} tone="gold" />
        </View>
      </AppCard>

      {documents.length ? (
        <AppCard title="Documents">
          {documents.map(({ document, trip, traveller, info }) => (
            <ListRow
              key={document.id}
              eyebrow={trip?.destination ?? 'Trip'}
              title={`${documentLabels[document.documentType]}${traveller ? ` • ${traveller.fullName}` : ''}`}
              subtitle={`${formatShortDate(document.expiryDate)} • ${info.relativeLabel}`}
              onPress={() => {
                setActiveTrip(document.tripId);
                router.push({ pathname: '/vault', params: { editDocumentId: document.id } });
              }}
              right={
                <View style={styles.rowRight}>
                  <InfoChip label={info.badgeLabel} tone={info.tone} />
                  <AppButton
                    label="Edit"
                    tone="secondary"
                    onPress={() => {
                      setActiveTrip(document.tripId);
                      router.push({ pathname: '/vault', params: { editDocumentId: document.id } });
                    }}
                  />
                </View>
              }
            />
          ))}
        </AppCard>
      ) : (
        <AppCard>
          <EmptyState
            title="No documents in this filter"
            description="Documents with expiry dates and reminder states will appear here automatically."
          />
        </AppCard>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  note: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
});
