import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppModal } from '@/components/AppModal';
import { AppScreen } from '@/components/AppScreen';
import { AppTextField } from '@/components/AppTextField';
import { ChoiceChips } from '@/components/ChoiceChips';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { SectionHeader } from '@/components/SectionHeader';
import { TripPicker } from '@/components/TripPicker';
import { colors, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import type { LuggageType, PackingCategory, PackingItemDraft } from '@/types/models';
import { percent } from '@/utils/format';
import { getPackingProgress, getTripBundle } from '@/utils/selectors';
import { validatePackingItem } from '@/utils/validation';

const emptyDraft = (tripId: string): PackingItemDraft => ({
  tripId,
  travellerId: null,
  title: '',
  category: 'clothes',
  quantity: 1,
  isPacked: false,
  luggageType: 'checked',
  notes: '',
});

const categoryLabels: Record<PackingCategory, string> = {
  clothes: 'Clothes',
  toiletries: 'Toiletries',
  documents: 'Documents',
  electronics: 'Electronics',
  medicines: 'Medicines',
  beach_pool: 'Beach / Pool',
  kids_baby: 'Kids / Baby',
  other: 'Other',
};

export default function PackingScreen() {
  const { data, activeTripId, setActiveTrip, savePackingItem, deleteRecord } = useAppStore();
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState<PackingItemDraft | null>(null);
  const selectedTripId = activeTripId ?? data.trips[0]?.id ?? null;
  const bundle = getTripBundle(data, selectedTripId);
  const progress = getPackingProgress(data, selectedTripId);
  const grouped = useMemo(() => {
    return bundle.packingItems.reduce<Record<string, typeof bundle.packingItems>>((accumulator, item) => {
      accumulator[item.category] = [...(accumulator[item.category] ?? []), item];
      return accumulator;
    }, {});
  }, [bundle.packingItems]);

  if (!data.trips.length) {
    return (
      <AppScreen title="Packing">
        <AppCard>
          <EmptyState title="Packing starts with a trip" description="Create a trip first, then build category-based packing lists, assign items to travellers, and track progress." />
        </AppCard>
      </AppScreen>
    );
  }

  async function handleSave() {
    if (!draft) return;
    const errors = validatePackingItem(draft);
    if (errors.length) {
      Alert.alert('Packing item needs attention', errors.join('\n'));
      return;
    }
    await savePackingItem(draft);
    setVisible(false);
  }

  return (
    <AppScreen title="Packing" subtitle="Grouped by category, assigned by traveller, and ready offline.">
      <TripPicker trips={data.trips} value={selectedTripId} onChange={setActiveTrip} />
      <AppCard title="Completion">
        <Text style={styles.meta}>{progress.packed} of {progress.total} items packed</Text>
        <ProgressBar progress={percent(progress.packed, progress.total)} />
      </AppCard>
      {Object.keys(grouped).length ? (
        Object.entries(grouped).map(([category, items]) => (
          <AppCard key={category}>
            <SectionHeader title={categoryLabels[category as PackingCategory]} subtitle={`${items.length} item(s)`} />
            {items.map((item) => {
              const traveller = bundle.travellers.find((travellerItem) => travellerItem.id === item.travellerId);
              return (
                <View key={item.id} style={styles.row}>
                  <Pressable
                    onPress={() => savePackingItem({ ...item, isPacked: !item.isPacked })}
                    style={[styles.checkbox, item.isPacked ? styles.checkboxChecked : null]}
                  >
                    {item.isPacked ? <MaterialIcons name="check" size={16} color={colors.white} /> : null}
                  </Pressable>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>{item.title} x{item.quantity}</Text>
                    <Text style={styles.meta}>
                      {traveller?.fullName || 'Everyone'} • {item.luggageType === 'carry_on' ? 'Carry-on' : 'Checked'}
                    </Text>
                  </View>
                  <Pressable onPress={() => { setDraft(item); setVisible(true); }} style={styles.iconButton}>
                    <MaterialIcons name="edit" size={18} color={colors.nightNavy} />
                  </Pressable>
                  <Pressable onPress={() => deleteRecord('packing_items', item.id)} style={styles.iconButton}>
                    <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              );
            })}
          </AppCard>
        ))
      ) : (
        <AppCard>
          <EmptyState title="Your list is empty" description="Add clothes, toiletries, electronics, medicines, and anything else you need." />
        </AppCard>
      )}

      <AppButton label="Add packing item" onPress={() => { if (selectedTripId) { setDraft(emptyDraft(selectedTripId)); setVisible(true); } }} />

      <AppModal visible={visible} title={draft?.id ? 'Edit packing item' : 'Add packing item'} onClose={() => setVisible(false)}>
        {draft ? (
          <>
            <AppTextField label="Item" value={draft.title} onChangeText={(value) => setDraft((current) => current ? { ...current, title: value } : current)} placeholder="Swimwear" />
            <AppTextField label="Quantity" value={String(draft.quantity)} onChangeText={(value) => setDraft((current) => current ? { ...current, quantity: Number(value || '1') } : current)} keyboardType="numeric" />
            <View style={styles.field}>
              <Text style={styles.label}>Category</Text>
              <ChoiceChips<PackingCategory>
                value={draft.category}
                onChange={(value) => setDraft((current) => current ? { ...current, category: value } : current)}
                options={Object.entries(categoryLabels).map(([value, label]) => ({ value: value as PackingCategory, label }))}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Assigned traveller</Text>
              <ChoiceChips<string>
                value={draft.travellerId ?? 'everyone'}
                onChange={(value) => setDraft((current) => current ? { ...current, travellerId: value === 'everyone' ? null : value } : current)}
                options={[
                  { label: 'Everyone', value: 'everyone' },
                  ...bundle.travellers.map((traveller) => ({ label: traveller.fullName, value: traveller.id })),
                ]}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Luggage</Text>
              <ChoiceChips<LuggageType>
                value={draft.luggageType}
                onChange={(value) => setDraft((current) => current ? { ...current, luggageType: value } : current)}
                options={[
                  { label: 'Carry-on', value: 'carry_on' },
                  { label: 'Checked', value: 'checked' },
                ]}
              />
            </View>
            <AppTextField label="Notes" value={draft.notes} onChangeText={(value) => setDraft((current) => current ? { ...current, notes: value } : current)} multiline />
            <AppButton label="Save item" onPress={handleSave} />
          </>
        ) : null}
      </AppModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  iconButton: {
    padding: spacing.xs,
  },
});
