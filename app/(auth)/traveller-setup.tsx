import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppModal } from '@/components/AppModal';
import { AppScreen } from '@/components/AppScreen';
import { AppTextField } from '@/components/AppTextField';
import { AvatarBadge } from '@/components/AvatarBadge';
import { ChoiceChips } from '@/components/ChoiceChips';
import { colors, radii, spacing } from '@/constants/theme';
import { PERSONAL_DOCUMENTS_TRIP_ID } from '@/constants/vault';
import { relationshipOptions, travellerAvatarColors } from '@/data/travellerOptions';
import { useAppStore } from '@/store/useAppStore';
import type { RelationshipType, TravellerDraft } from '@/types/models';
import { chooseProfilePhoto } from '@/utils/profilePhotos';
import { validateTraveller } from '@/utils/validation';

type TravellerEditorState = TravellerDraft & {
  editorTitle: string;
};

function buildTravellerDraft(index: number): TravellerEditorState {
  return {
    editorTitle: 'Add traveller',
    tripId: PERSONAL_DOCUMENTS_TRIP_ID,
    fullName: '',
    photoUri: null,
    dateOfBirth: null,
    passportNationality: '',
    passportNumber: '',
    ghicNumber: '',
    medicalNote: '',
    notes: '',
    avatarColor: travellerAvatarColors[index % travellerAvatarColors.length],
    relationshipType: 'adult',
  };
}

export default function TravellerSetupScreen() {
  const router = useRouter();
  const { data, saveTraveller, ensurePersonalDocumentsTrip, completeOnboarding } = useAppStore();
  const travellers = useMemo(
    () => data.travellers.filter((traveller) => traveller.tripId === PERSONAL_DOCUMENTS_TRIP_ID),
    [data.travellers]
  );
  const [editor, setEditor] = useState<TravellerEditorState | null>(travellers[0] ? { ...travellers[0], editorTitle: 'Edit traveller' } : null);
  const [submitting, setSubmitting] = useState(false);

  async function openAddTraveller() {
    await ensurePersonalDocumentsTrip();
    setEditor(buildTravellerDraft(travellers.length));
  }

  async function chooseTravellerPhotoPress() {
    if (!editor) {
      return;
    }

    const nextUri = await chooseProfilePhoto(editor.photoUri ?? null);
    if (nextUri) {
      setEditor((current) => (current ? { ...current, photoUri: nextUri } : current));
    }
  }

  async function saveTravellerDraft() {
    if (!editor) {
      return;
    }

    const errors = validateTraveller(editor);
    if (errors.length) {
      Alert.alert('Traveller needs attention', errors.join('\n'));
      return;
    }

    setSubmitting(true);
    try {
      await ensurePersonalDocumentsTrip();
      await saveTraveller({
        ...editor,
        tripId: PERSONAL_DOCUMENTS_TRIP_ID,
      });
      setEditor(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function finishSetup() {
    setSubmitting(true);
    try {
      await ensurePersonalDocumentsTrip();
      await completeOnboarding();
      router.replace('/home');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppScreen
      backgroundColor={colors.authBlue}
      hideBackgroundDecor
      footer={
        <View style={styles.footer}>
          <AppButton
            label={travellers.length ? 'Continue to Pineapple' : 'Finish setup'}
            onPress={() => void finishSetup()}
            loading={submitting}
          />
          <AppButton label="Add traveller" tone="secondary" onPress={() => void openAddTraveller()} disabled={submitting} />
        </View>
      }
    >
      <View style={styles.hero}>
        <Text style={styles.kicker}>Almost ready</Text>
        <Text style={styles.title}>Set up your travellers</Text>
        <Text style={styles.body}>
          Save the people you travel with most often. You can edit them later in Account, and trip-specific details can still be added inside each trip.
        </Text>
      </View>

      <AppCard>
        <Text style={styles.sectionTitle}>Privacy first</Text>
        <Text style={styles.sectionBody}>
          Your data is stored locally on your device. We do not want or need your personal travel data beyond helping you manage your trips.
        </Text>
      </AppCard>

      <AppCard>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.sectionTitle}>Saved travellers</Text>
            <Text style={styles.sectionBody}>Optional for now. Add at least one if you want a ready-to-use profile foundation.</Text>
          </View>
          <Pressable onPress={() => void openAddTraveller()} style={styles.addIcon}>
            <MaterialIcons name="add" size={22} color={colors.primaryBlue} />
          </Pressable>
        </View>

        {travellers.length ? (
          travellers.map((traveller, index) => (
            <Pressable
              key={traveller.id}
              onPress={() => setEditor({ ...traveller, editorTitle: 'Edit traveller' })}
              style={[styles.row, index === travellers.length - 1 ? styles.rowLast : null]}
            >
              <AvatarBadge label={traveller.fullName} color={traveller.avatarColor} imageUri={traveller.photoUri} size={40} />
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{traveller.fullName}</Text>
                <Text style={styles.rowBody}>{traveller.relationshipType} traveller</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
            </Pressable>
          ))
        ) : (
          <Text style={styles.emptyBody}>No travellers saved yet. You can finish setup now and add them later, or add one before continuing.</Text>
        )}
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>What happens next</Text>
        <Text style={styles.sectionBody}>Home, Trips, Vault, Account, Settings, and SOS will all be available after this step.</Text>
      </AppCard>

      <AppModal visible={!!editor} title={editor?.editorTitle || 'Traveller'} onClose={() => setEditor(null)}>
        {editor ? (
          <>
            <Pressable onPress={() => void chooseTravellerPhotoPress()} style={styles.photoPicker}>
              <AvatarBadge label={editor.fullName || 'T'} color={editor.avatarColor} imageUri={editor.photoUri} size={72} />
              <Text style={styles.photoPickerLabel}>{editor.photoUri ? 'Change traveller photo' : 'Add traveller photo'}</Text>
            </Pressable>
            <AppTextField
              label="Full name"
              value={editor.fullName}
              onChangeText={(value) => setEditor((current) => (current ? { ...current, fullName: value } : current))}
              placeholder="Traveller name"
            />
            <View style={styles.fieldBlock}>
              <Text style={styles.modalLabel}>Relationship</Text>
              <ChoiceChips<RelationshipType>
                value={editor.relationshipType}
                onChange={(value) => setEditor((current) => (current ? { ...current, relationshipType: value } : current))}
                options={relationshipOptions.map((option) => ({ label: option.label, value: option.value }))}
              />
            </View>
            <View style={styles.fieldBlock}>
              <Text style={styles.modalLabel}>Avatar colour</Text>
              <ChoiceChips<string>
                value={editor.avatarColor}
                onChange={(value) => setEditor((current) => (current ? { ...current, avatarColor: value } : current))}
                options={travellerAvatarColors.map((value, index) => ({ label: `Tone ${index + 1}`, value }))}
              />
            </View>
            <AppTextField
              label="Notes"
              value={editor.notes}
              onChangeText={(value) => setEditor((current) => (current ? { ...current, notes: value } : current))}
              multiline
              placeholder="Optional traveller note"
            />
            <AppButton label="Save traveller" onPress={() => void saveTravellerDraft()} loading={submitting} />
          </>
        ) : null}
      </AppModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  kicker: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  title: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
  },
  body: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
  },
  sectionBody: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  addIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F8FD',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
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
  rowBody: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  emptyBody: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  photoPicker: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    borderRadius: radii.xl,
  },
  photoPickerLabel: {
    color: colors.primaryBlue,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  fieldBlock: {
    gap: spacing.xs,
  },
  modalLabel: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
});
