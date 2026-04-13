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
import { InfoChip } from '@/components/InfoChip';
import { MultiSelectChips } from '@/components/MultiSelectChips';
import { ProgressBar } from '@/components/ProgressBar';
import { SectionHeader } from '@/components/SectionHeader';
import { TripPicker } from '@/components/TripPicker';
import { colors, spacing } from '@/constants/theme';
import { packingTemplates, type PackingTemplateId } from '@/data/packingTemplates';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppStore } from '@/store/useAppStore';
import type {
  LuggageType,
  PackingAssignmentScope,
  PackingCategory,
  PackingItemDraft,
  PackingPriority,
} from '@/types/models';
import { percent } from '@/utils/format';
import { getPackingProgress, getPackingProgressByTraveller, getTripBundle } from '@/utils/selectors';
import { filterVisibleTrips } from '@/utils/tripVisibility';
import { validatePackingItem } from '@/utils/validation';

const emptyDraft = (tripId: string): PackingItemDraft => ({
  tripId,
  title: '',
  category: 'clothes',
  quantity: 1,
  isPacked: false,
  luggageType: 'checked',
  assignmentScope: 'trip',
  travellerIds: [],
  priority: 'useful',
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

const priorityLabels: Record<PackingPriority, string> = {
  essential: 'Essential',
  useful: 'Useful',
  optional: 'Optional',
};

export default function PackingScreen() {
  const { t } = useTranslation();
  const {
    data,
    activeTripId,
    setActiveTrip,
    savePackingItem,
    deleteRecord,
    duplicatePackingItem,
    applyPackingTemplate,
  } = useAppStore();
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState<PackingItemDraft | null>(null);
  const visibleTrips = useMemo(() => filterVisibleTrips(data.trips), [data.trips]);
  const activeVisibleTripId = activeTripId && visibleTrips.some((trip) => trip.id === activeTripId) ? activeTripId : null;
  const selectedTripId = activeVisibleTripId ?? visibleTrips[0]?.id ?? null;
  const bundle = getTripBundle(data, selectedTripId);
  const progress = getPackingProgress(data, selectedTripId);
  const travellerProgress = getPackingProgressByTraveller(bundle.packingItems, bundle.travellers);
  const grouped = useMemo(() => {
    return bundle.packingItems.reduce<Record<string, typeof bundle.packingItems>>((accumulator, item) => {
      accumulator[item.category] = [...(accumulator[item.category] ?? []), item];
      return accumulator;
    }, {});
  }, [bundle.packingItems]);

  if (!visibleTrips.length) {
    return (
      <AppScreen title={t('packing.title')}>
        <AppCard>
          <EmptyState
            title={t('packing.noTripTitle')}
            description={t('packing.noTripBody')}
          />
        </AppCard>
      </AppScreen>
    );
  }

  async function handleSave() {
    if (!draft) return;
    const errors = validatePackingItem(draft);
    if (errors.length) {
      Alert.alert(t('packing.needsAttention'), errors.join('\n'));
      return;
    }
    await savePackingItem(draft);
    setVisible(false);
  }

  async function handleTemplateApply(templateId: PackingTemplateId) {
    if (!selectedTripId) return;
    await applyPackingTemplate(selectedTripId, templateId);
  }

  return (
    <AppScreen title={t('packing.title')} subtitle={t('packing.subtitle')}>
      <TripPicker trips={visibleTrips} value={selectedTripId} onChange={setActiveTrip} />
      <AppCard title={t('packing.completion')}>
        <Text style={styles.meta}>
          {progress.packed} of {progress.total} items packed
        </Text>
        <ProgressBar progress={percent(progress.packed, progress.total)} />
        <View style={styles.chipRow}>
          {travellerProgress.map(({ traveller, packed, total }) => (
            <InfoChip
              key={traveller.id}
              label={`${traveller.fullName.split(' ')[0]} ${packed}/${total || 0}`}
              tone={total && packed === total ? 'success' : 'blue'}
            />
          ))}
        </View>
      </AppCard>

      <AppCard title={t('packing.templates')} subtitle={t('packing.templatesBody')}>
        <View style={styles.templateList}>
          {Object.entries(packingTemplates).map(([templateId, template]) => (
            <View key={templateId} style={styles.templateRow}>
              <View style={styles.templateCopy}>
                <Text style={styles.templateTitle}>{template.label}</Text>
                <Text style={styles.meta}>{template.description}</Text>
              </View>
              <AppButton label={t('packing.apply')} tone="secondary" onPress={() => handleTemplateApply(templateId as PackingTemplateId)} />
            </View>
          ))}
        </View>
      </AppCard>

      {Object.keys(grouped).length ? (
        Object.entries(grouped).map(([category, items]) => (
          <AppCard key={category}>
            <SectionHeader title={categoryLabels[category as PackingCategory]} subtitle={`${items.length} item(s)`} />
            {items.map((item) => {
              const assignedNames =
                item.assignmentScope === 'trip'
                  ? t('packing.entireTrip')
                  : bundle.travellers
                      .filter((traveller) => item.travellerIds.includes(traveller.id))
                      .map((traveller) => traveller.fullName)
                      .join(', ');

              return (
                <View key={item.id} style={styles.row}>
                  <Pressable
                    onPress={() => savePackingItem({ ...item, isPacked: !item.isPacked })}
                    style={[styles.checkbox, item.isPacked ? styles.checkboxChecked : null]}
                  >
                    {item.isPacked ? <MaterialIcons name="check" size={16} color={colors.white} /> : null}
                  </Pressable>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>
                      {item.title} x{item.quantity}
                    </Text>
                    <Text style={styles.meta}>
                      {assignedNames} • {item.luggageType === 'carry_on' ? t('packing.carryOn') : t('packing.checked')} •{' '}
                      {priorityLabels[item.priority]}
                    </Text>
                  </View>
                  <Pressable onPress={() => duplicatePackingItem(item.id)} style={styles.iconButton}>
                    <MaterialIcons name="content-copy" size={18} color={colors.nightNavy} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setDraft(item);
                      setVisible(true);
                    }}
                    style={styles.iconButton}
                  >
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
          <EmptyState
            title={t('packing.emptyTitle')}
            description={t('packing.emptyBody')}
          />
        </AppCard>
      )}

      <AppButton
        label={t('packing.addItem')}
        onPress={() => {
          if (selectedTripId) {
            setDraft(emptyDraft(selectedTripId));
            setVisible(true);
          }
        }}
      />

      <AppModal
        visible={visible}
        title={draft?.id ? t('packing.editItem') : t('packing.addItem')}
        onClose={() => setVisible(false)}
      >
        {draft ? (
          <>
            <AppTextField
              label={t('packing.item')}
              value={draft.title}
              onChangeText={(value) => setDraft((current) => (current ? { ...current, title: value } : current))}
              placeholder="Swimwear"
            />
            <AppTextField
              label={t('packing.quantity')}
              value={String(draft.quantity)}
              onChangeText={(value) =>
                setDraft((current) => (current ? { ...current, quantity: Math.max(1, Number(value || '1')) } : current))
              }
              keyboardType="numeric"
            />
            <View style={styles.field}>
              <Text style={styles.label}>{t('packing.category')}</Text>
              <ChoiceChips<PackingCategory>
                value={draft.category}
                onChange={(value) => setDraft((current) => (current ? { ...current, category: value } : current))}
                options={Object.entries(categoryLabels).map(([value, label]) => ({ value: value as PackingCategory, label }))}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Assignment</Text>
              <ChoiceChips<PackingAssignmentScope>
                value={draft.assignmentScope}
                onChange={(value) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          assignmentScope: value,
                          travellerIds: value === 'trip' ? [] : current.travellerIds,
                        }
                      : current
                  )
                }
                options={[
                  { label: 'Entire trip', value: 'trip' },
                  { label: 'Specific travellers', value: 'travellers' },
                ]}
              />
            </View>
            {draft.assignmentScope === 'travellers' ? (
              <View style={styles.field}>
                <Text style={styles.label}>Travellers</Text>
                <MultiSelectChips<string>
                  values={draft.travellerIds}
                  onChange={(travellerIds) =>
                    setDraft((current) => (current ? { ...current, travellerIds } : current))
                  }
                  options={bundle.travellers.map((traveller) => ({
                    label: traveller.fullName,
                    value: traveller.id,
                  }))}
                />
              </View>
            ) : null}
            <View style={styles.field}>
              <Text style={styles.label}>Luggage</Text>
              <ChoiceChips<LuggageType>
                value={draft.luggageType}
                onChange={(value) =>
                  setDraft((current) => (current ? { ...current, luggageType: value } : current))
                }
                options={[
                  { label: 'Carry-on', value: 'carry_on' },
                  { label: 'Checked', value: 'checked' },
                ]}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>{t('packing.priority')}</Text>
              <ChoiceChips<PackingPriority>
                value={draft.priority}
                onChange={(value) => setDraft((current) => (current ? { ...current, priority: value } : current))}
                options={[
                  { label: 'Essential', value: 'essential' },
                  { label: 'Useful', value: 'useful' },
                  { label: 'Optional', value: 'optional' },
                ]}
              />
            </View>
            <AppTextField
              label="Notes"
              value={draft.notes}
              onChangeText={(value) => setDraft((current) => (current ? { ...current, notes: value } : current))}
              multiline
            />
            <AppButton label={t('packing.saveItem')} onPress={handleSave} />
          </>
        ) : null}
      </AppModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  templateList: {
    gap: spacing.sm,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  templateCopy: {
    flex: 1,
    gap: 2,
  },
  templateTitle: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
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
    lineHeight: 18,
  },
  iconButton: {
    padding: spacing.xs,
  },
});
