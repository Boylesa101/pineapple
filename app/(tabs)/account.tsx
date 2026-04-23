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
import { ManagedFileImage } from '@/components/ManagedFileImage';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, radii, spacing } from '@/constants/theme';
import { PERSONAL_DOCUMENTS_TRIP_ID } from '@/constants/vault';
import { relationshipOptions, travellerAvatarColors } from '@/data/travellerOptions';
import { useAppStore } from '@/store/useAppStore';
import type { RelationshipType, TravellerDraft } from '@/types/models';
import { chooseProfilePhoto, removeProfilePhoto } from '@/utils/profilePhotos';
import { filterVisibleTrips } from '@/utils/tripVisibility';
import { validateTraveller } from '@/utils/validation';

type TravellerEditorState = TravellerDraft & {
  editorTitle: string;
};

function initialsForName(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function createTravellerDraft(index: number): TravellerEditorState {
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

export default function AccountScreen() {
  const router = useRouter();
  const {
    data,
    saveAppPreferences,
    saveTraveller,
    deleteRecord,
    ensurePersonalDocumentsTrip,
  } = useAppStore();
  const visibleTrips = useMemo(() => filterVisibleTrips(data.trips), [data.trips]);
  const travellers = useMemo(
    () => data.travellers.filter((traveller) => traveller.tripId === PERSONAL_DOCUMENTS_TRIP_ID),
    [data.travellers]
  );
  const otherTripTravellerCount = data.travellers.length - travellers.length;
  const profileName = data.appPreferences.profileName.trim();
  const profilePhotoUri = data.appPreferences.profilePhotoUri;
  const fullName = profileName || 'Pineapple traveller';
  const initials = useMemo(() => initialsForName(fullName) || 'P', [fullName]);
  const [profileDraft, setProfileDraft] = useState(profileName);
  const [travellerEditor, setTravellerEditor] = useState<TravellerEditorState | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleProfilePhotoPress() {
    if (profilePhotoUri) {
      Alert.alert('Profile photo', 'Update or remove your account photo.', [
        {
          text: 'Change photo',
          onPress: () => {
            void (async () => {
              const nextUri = await chooseProfilePhoto(profilePhotoUri);
              if (nextUri) {
                await saveAppPreferences({ profilePhotoUri: nextUri });
              }
            })();
          },
        },
        {
          text: 'Remove photo',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await removeProfilePhoto(profilePhotoUri);
              await saveAppPreferences({ profilePhotoUri: null });
            })();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }

    const nextUri = await chooseProfilePhoto(null);
    if (nextUri) {
      await saveAppPreferences({ profilePhotoUri: nextUri });
    }
  }

  async function saveProfileName() {
    const trimmedName = profileDraft.trim();
    if (!trimmedName) {
      Alert.alert('Profile name needed', 'Add the main account holder name to continue.');
      return;
    }

    setBusy(true);
    try {
      await saveAppPreferences({ profileName: trimmedName });
    } finally {
      setBusy(false);
    }
  }

  function openNewTraveller() {
    setTravellerEditor(createTravellerDraft(travellers.length));
  }

  function openExistingTraveller(traveller: TravellerDraft) {
    setTravellerEditor({
      ...traveller,
      photoUri: traveller.photoUri ?? null,
      editorTitle: 'Edit traveller',
    });
  }

  async function chooseTravellerPhoto() {
    if (!travellerEditor) {
      return;
    }

    const nextUri = await chooseProfilePhoto(travellerEditor.photoUri ?? null);
    if (nextUri) {
      setTravellerEditor((current) => (current ? { ...current, photoUri: nextUri } : current));
    }
  }

  async function saveTravellerDraft() {
    if (!travellerEditor) {
      return;
    }

    const errors = validateTraveller(travellerEditor);
    if (errors.length) {
      Alert.alert('Traveller needs attention', errors.join('\n'));
      return;
    }

    setBusy(true);
    try {
      await ensurePersonalDocumentsTrip();
      await saveTraveller({
        ...travellerEditor,
        tripId: PERSONAL_DOCUMENTS_TRIP_ID,
      });
      setTravellerEditor(null);
    } finally {
      setBusy(false);
    }
  }

  async function removeTraveller(travellerId: string) {
    await deleteRecord('travellers', travellerId);
  }

  return (
    <AppScreen title="Account" subtitle="Manage your local profile, saved travellers, privacy copy, and core Pineapple setup.">
      <AppCard>
        <View style={styles.profileTop}>
          <Pressable onPress={() => void handleProfilePhotoPress()} style={styles.avatar} accessibilityLabel="Add or change profile photo">
            {profilePhotoUri ? <ManagedFileImage uri={profilePhotoUri} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{initials}</Text>}
            <View style={styles.avatarEditBadge}>
              <MaterialIcons name="photo-camera" size={16} color={colors.white} />
            </View>
          </Pressable>
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>{fullName}</Text>
            <Text style={styles.profileSubtitle}>
              Your data is stored locally on your device. Pineapple does not need your personal travel data beyond helping you manage your trips.
            </Text>
          </View>
        </View>

        <AppTextField
          label="Main account holder"
          value={profileDraft}
          onChangeText={setProfileDraft}
          placeholder="Full name"
        />
        <AppButton label="Save profile" onPress={() => void saveProfileName()} loading={busy} />
      </AppCard>

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{visibleTrips.length}</Text>
          <Text style={styles.statLabel}>Trips</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{travellers.length}</Text>
          <Text style={styles.statLabel}>Saved travellers</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{data.documents.length}</Text>
          <Text style={styles.statLabel}>Vault items</Text>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Saved travellers" right={`${otherTripTravellerCount > 0 ? `${otherTripTravellerCount} trip-only` : 'Account-level'}`} />
        <AppCard>
          {travellers.length ? (
            travellers.map((traveller, index) => (
              <View key={traveller.id} style={[styles.travellerRow, index === travellers.length - 1 ? styles.travellerRowLast : null]}>
                <Pressable onPress={() => openExistingTraveller(traveller)} style={styles.travellerPressable}>
                  <AvatarBadge label={traveller.fullName} color={traveller.avatarColor} imageUri={traveller.photoUri} size={42} />
                  <View style={styles.travellerCopy}>
                    <Text style={styles.travellerName}>{traveller.fullName}</Text>
                    <Text style={styles.travellerMeta}>
                      {traveller.relationshipType} traveller
                      {traveller.passportNationality.trim() ? ` · ${traveller.passportNationality}` : ''}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
                </Pressable>
                <Pressable
                  onPress={() =>
                    Alert.alert('Remove traveller?', 'This removes the saved traveller profile from Pineapple.', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => {
                          void removeTraveller(traveller.id);
                        },
                      },
                    ])
                  }
                  style={styles.inlineDelete}
                >
                  <MaterialIcons name="delete-outline" size={18} color={colors.dangerRed} />
                </Pressable>
              </View>
            ))
          ) : (
            <Text style={styles.emptyBody}>No saved travellers yet. Add family or frequent travel companions here so later trip setup is faster.</Text>
          )}

          <AppButton label="Add traveller" tone="secondary" onPress={openNewTraveller} />
        </AppCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Foundation tools" />
        <AppCard>
          <View style={styles.toolRow}>
            <Text style={styles.toolTitle}>Trips</Text>
            <Text style={styles.toolBody}>Create, edit, and delete trip skeletons from the main trips tab.</Text>
          </View>
          <View style={styles.toolRow}>
            <Text style={styles.toolTitle}>Vault</Text>
            <Text style={styles.toolBody}>Keep personal or trip-linked documents in the local-first vault.</Text>
          </View>
          <View style={styles.toolRow}>
            <Text style={styles.toolTitle}>Settings</Text>
            <Text style={styles.toolBody}>Storage, transfer, notifications, SOS, and privacy hooks live in Settings.</Text>
          </View>
          <View style={styles.toolActions}>
            <AppButton label="Open settings" tone="secondary" onPress={() => router.push('/settings')} />
            <AppButton label="Open trips" onPress={() => router.push('/trips')} />
          </View>
        </AppCard>
      </View>

      <AppModal
        visible={!!travellerEditor}
        title={travellerEditor?.editorTitle || 'Traveller'}
        onClose={() => setTravellerEditor(null)}
      >
        {travellerEditor ? (
          <>
            <Pressable onPress={() => void chooseTravellerPhoto()} style={styles.travellerPhotoPicker}>
              <AvatarBadge
                label={travellerEditor.fullName || 'T'}
                color={travellerEditor.avatarColor}
                imageUri={travellerEditor.photoUri}
                size={72}
              />
              <Text style={styles.travellerPhotoText}>
                {travellerEditor.photoUri ? 'Change traveller photo' : 'Add traveller photo'}
              </Text>
            </Pressable>

            <AppTextField
              label="Full name"
              value={travellerEditor.fullName}
              onChangeText={(value) => setTravellerEditor((current) => (current ? { ...current, fullName: value } : current))}
              placeholder="Traveller name"
            />
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Relationship</Text>
              <ChoiceChips<RelationshipType>
                value={travellerEditor.relationshipType}
                onChange={(value) => setTravellerEditor((current) => (current ? { ...current, relationshipType: value } : current))}
                options={relationshipOptions.map((option) => ({
                  label: option.label,
                  value: option.value,
                }))}
              />
            </View>
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Avatar colour</Text>
              <ChoiceChips<string>
                value={travellerEditor.avatarColor}
                onChange={(value) => setTravellerEditor((current) => (current ? { ...current, avatarColor: value } : current))}
                options={travellerAvatarColors.map((value, index) => ({
                  label: `Tone ${index + 1}`,
                  value,
                }))}
              />
            </View>
            <AppTextField
              label="Passport nationality"
              value={travellerEditor.passportNationality}
              onChangeText={(value) => setTravellerEditor((current) => (current ? { ...current, passportNationality: value } : current))}
              placeholder="Optional"
            />
            <AppTextField
              label="Medical note"
              value={travellerEditor.medicalNote}
              onChangeText={(value) => setTravellerEditor((current) => (current ? { ...current, medicalNote: value } : current))}
              multiline
              placeholder="Optional allergy, medication, or support note"
            />
            <AppTextField
              label="General notes"
              value={travellerEditor.notes}
              onChangeText={(value) => setTravellerEditor((current) => (current ? { ...current, notes: value } : current))}
              multiline
              placeholder="Optional profile note"
            />
            <AppButton label="Save traveller" onPress={() => void saveTravellerDraft()} loading={busy} />
          </>
        ) : null}
      </AppModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  profileTop: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  profileCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarEditBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBlueDark,
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
  },
  profileName: {
    color: colors.primaryBlueDark,
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
  },
  profileSubtitle: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F7FBFF',
    borderWidth: 1,
    borderColor: 'rgba(13, 110, 253, 0.08)',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: colors.primaryBlue,
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
  },
  statLabel: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    gap: spacing.sm,
  },
  travellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  travellerRowLast: {
    borderBottomWidth: 0,
  },
  travellerPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  travellerCopy: {
    flex: 1,
    gap: 2,
  },
  travellerName: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  travellerMeta: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  inlineDelete: {
    padding: spacing.xs,
  },
  emptyBody: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  toolRow: {
    gap: 4,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  toolTitle: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  toolBody: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  toolActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    paddingTop: spacing.xs,
  },
  travellerPhotoPicker: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    borderRadius: radii.xl,
  },
  travellerPhotoText: {
    color: colors.primaryBlue,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  fieldBlock: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
});
