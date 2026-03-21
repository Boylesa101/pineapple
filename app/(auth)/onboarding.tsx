import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { PineappleMark } from '@/brand/PineappleMark';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { AppTextField } from '@/components/AppTextField';
import { TypedDateField } from '@/components/TypedDateField';
import { OnboardingIllustration } from '@/components/OnboardingIllustration';
import { colors, radii, spacing } from '@/constants/theme';
import { PERSONAL_DOCUMENTS_TRIP_ID } from '@/constants/vault';
import { useAppStore } from '@/store/useAppStore';
import { createEmptyPassportData, ensurePassportDraftData } from '@/utils/passport';
import { validateDocument } from '@/utils/validation';
import { cleanupImportedSource, copyIntoAppStorage, deleteLocalFile } from '@/utils/fileStorage';

const slides = [
  {
    key: 'welcome',
    icon: 'beach-access' as const,
    heading: 'Welcome to Pineapple',
    body:
      'Keep every trip, traveller, booking, and emergency detail in one calm local-first organiser. Pineapple works offline first and stays ready when travel gets busy.',
  },
  {
    key: 'document-scanning',
    icon: 'document-scanner' as const,
    heading: 'Store travel documents clearly',
    body:
      'Save passports, insurance, hotel bookings, and boarding passes in the secure vault. Sensitive previews stay hidden until you unlock them.',
  },
  {
    key: 'travel-mode',
    icon: 'bolt' as const,
    heading: 'Travel Mode is built for speed',
    body:
      'Open a high-contrast quick-access view for airports, hotels, taxis, and family emergencies. Reveal sensitive values only when you need them.',
  },
  {
    key: 'import-email',
    icon: 'mail-outline' as const,
    heading: 'Bring plans in from elsewhere',
    body:
      'Import saved travel files from this device and keep shared-trip packets ready for manual sync. Pineapple does not connect to your inbox or depend on a cloud backend.',
  },
  {
    key: 'expiry-warnings',
    icon: 'warning-amber' as const,
    heading: 'Catch expiry dates early',
    body:
      'Surface passport and GHIC expiry warnings before departure, plus local reminders for packing, flights, and missing insurance so nothing slips through.',
  },
];

type SetupStep = 'name' | 'photo' | 'document';
type DocumentSetupChoice = 'skip' | 'passport';

function initialsForName(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function OnboardingScreen() {
  const router = useRouter();
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const saveAppPreferences = useAppStore((state) => state.saveAppPreferences);
  const ensurePersonalDocumentsTrip = useAppStore((state) => state.ensurePersonalDocumentsTrip);
  const saveDocument = useAppStore((state) => state.saveDocument);
  const appPreferences = useAppStore((state) => state.data.appPreferences);
  const [slideIndex, setSlideIndex] = useState(0);
  const [setupStep, setSetupStep] = useState<SetupStep>('name');
  const [submitting, setSubmitting] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [documentChoice, setDocumentChoice] = useState<DocumentSetupChoice>('skip');
  const [passportHolderName, setPassportHolderName] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [passportNationality, setPassportNationality] = useState('');
  const [passportCountryCode, setPassportCountryCode] = useState('');
  const [passportDateOfBirth, setPassportDateOfBirth] = useState<string | null>(null);
  const [passportExpiryDate, setPassportExpiryDate] = useState<string | null>(null);

  const inSlides = slideIndex < slides.length;
  const currentSlide = slides[Math.min(slideIndex, slides.length - 1)];
  const isLastSlide = slideIndex === slides.length - 1;
  const displayName = profileName.trim();
  const initials = initialsForName(displayName) || 'P';
  const passportHolderDisplay = passportHolderName.trim() || displayName;

  async function finalizeOnboarding() {
    setSubmitting(true);
    try {
      await saveAppPreferences({
        profileName: displayName,
        profilePhotoUri,
      });

      if (documentChoice === 'passport') {
        await ensurePersonalDocumentsTrip();
        const draft = ensurePassportDraftData(
          {
            tripId: PERSONAL_DOCUMENTS_TRIP_ID,
            travellerId: null,
            holderName: passportHolderDisplay,
            documentType: 'passport',
            documentNumber: passportNumber.trim(),
            issueDate: null,
            expiryDate: passportExpiryDate,
            expiryReminderEnabled: true,
            expiryReminderSchedule: appPreferences.expiryReminderSchedule,
            expiredStatus: false,
            expiringSoonStatus: false,
            notes: '',
            localFileUri: '',
            previewUri: null,
            mimeType: null,
            passportData: {
              ...createEmptyPassportData(),
              countryCode: passportCountryCode.trim().toUpperCase(),
              nationality: passportNationality.trim(),
              dateOfBirth: passportDateOfBirth,
            },
            secondaryLocalFileUri: null,
            secondaryPreviewUri: null,
            secondaryMimeType: null,
            drivingLicenceData: null,
            healthCardData: null,
            paymentCardData: null,
            formalDocumentData: null,
            sensitive: true,
          },
          null
        );

        const errors = validateDocument(draft);
        if (errors.length) {
          Alert.alert('Passport needs attention', errors.join('\n'));
          setSubmitting(false);
          return;
        }

        await saveDocument(draft);
      }

      await completeOnboarding();
      router.replace('/setup-pin');
    } catch (error) {
      if (__DEV__) {
        console.error('Onboarding finalization failed', error);
      }
      Alert.alert('Setup could not continue', 'Pineapple could not save this setup step. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function pickPhoto() {
    if (submitting) {
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo access needed', 'Allow photo library access to choose a profile photo, or skip this step for now.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const storedUri = await copyIntoAppStorage(asset.uri, 'trips', asset.mimeType, { encryptAtRest: true });
      await cleanupImportedSource(asset.uri);

      if (profilePhotoUri && profilePhotoUri !== storedUri) {
        await deleteLocalFile(profilePhotoUri);
      }

      setProfilePhotoUri(storedUri);
    } catch (error) {
      if (__DEV__) {
        console.error('Profile photo selection failed', error);
      }
      Alert.alert('Photo not added', 'Pineapple could not use that photo. You can skip this step and add one later.');
    }
  }

  const footer = useMemo(() => {
    if (inSlides) {
      return (
        <View style={styles.footer}>
          <AppButton
            label={isLastSlide ? 'Continue' : 'Next'}
            tone="secondary"
            size="large"
            style={styles.footerButton}
            labelStyle={styles.footerButtonLabel}
            onPress={() => {
              if (isLastSlide) {
                setSlideIndex(slides.length);
                setSetupStep('name');
                return;
              }

              setSlideIndex((value) => Math.min(value + 1, slides.length));
            }}
            disabled={submitting}
          />
          <AppButton
            label="Skip intro"
            tone="secondary"
            size="large"
            style={styles.footerButton}
            labelStyle={styles.footerButtonLabel}
            onPress={() => {
              setSlideIndex(slides.length);
              setSetupStep('name');
            }}
            disabled={submitting}
          />
        </View>
      );
    }

    if (setupStep === 'name') {
      return (
        <View style={styles.footer}>
          <AppButton
            label="Continue"
            tone="secondary"
            size="large"
            style={styles.footerButton}
            labelStyle={styles.footerButtonLabel}
            onPress={() => setSetupStep('photo')}
            disabled={!displayName || submitting}
          />
          <AppButton
            label="Back"
            tone="secondary"
            size="large"
            style={styles.footerButton}
            labelStyle={styles.footerButtonLabel}
            onPress={() => {
              setSlideIndex(slides.length - 1);
            }}
            disabled={submitting}
          />
        </View>
      );
    }

    if (setupStep === 'photo') {
      return (
        <View style={styles.footer}>
          <AppButton
            label="Continue"
            tone="secondary"
            size="large"
            style={styles.footerButton}
            labelStyle={styles.footerButtonLabel}
            onPress={() => setSetupStep('document')}
            disabled={submitting}
          />
          <AppButton
            label="Skip photo"
            tone="secondary"
            size="large"
            style={styles.footerButton}
            labelStyle={styles.footerButtonLabel}
            onPress={() => setSetupStep('document')}
            disabled={submitting}
          />
        </View>
      );
    }

    const documentReady = documentChoice === 'skip' || Boolean(passportHolderDisplay && passportNationality.trim() && passportCountryCode.trim());

    return (
      <View style={styles.footer}>
        <AppButton
          label={documentChoice === 'passport' ? 'Save passport and continue' : 'Continue to PIN'}
          tone="secondary"
          size="large"
          style={styles.footerButton}
          labelStyle={styles.footerButtonLabel}
          onPress={() => {
            void finalizeOnboarding();
          }}
          loading={submitting}
          disabled={!documentReady}
        />
        <AppButton
          label="Skip for now"
          tone="secondary"
          size="large"
          style={styles.footerButton}
          labelStyle={styles.footerButtonLabel}
          onPress={() => {
            void finalizeOnboarding();
          }}
          disabled={submitting}
        />
      </View>
    );
  }, [
    appPreferences.expiryReminderSchedule,
    displayName,
    documentChoice,
    finalizeOnboarding,
    inSlides,
    isLastSlide,
    passportCountryCode,
    passportHolderDisplay,
    passportNationality,
    setupStep,
    slideIndex,
    submitting,
  ]);

  return (
    <AppScreen footer={footer} backgroundColor={colors.authBlue} hideBackgroundDecor>
      <View style={styles.hero}>
        <PineappleMark size={82} />
        <Text style={styles.brand}>Pineapple</Text>
      </View>

      {inSlides ? (
        <AppCard>
          <View style={styles.progressRow}>
            {slides.map((slide, index) => (
              <View key={slide.key} style={[styles.progressDot, index === slideIndex ? styles.progressDotActive : null]} />
            ))}
          </View>
          <OnboardingIllustration icon={currentSlide.icon} accent={slideIndex % 2 === 0 ? colors.pineappleGold : colors.oceanBlue} />
          <Text style={styles.heading}>{currentSlide.heading}</Text>
          <Text style={styles.body}>{currentSlide.body}</Text>
        </AppCard>
      ) : null}

      {!inSlides && setupStep === 'name' ? (
        <AppCard>
          <Text style={styles.heading}>What should Pineapple call you?</Text>
          <Text style={styles.body}>Add your name now so Home, Account, and travel summaries feel personal from the first launch.</Text>
          <AppTextField label="Your name" value={profileName} onChangeText={setProfileName} placeholder="Andrew" />
        </AppCard>
      ) : null}

      {!inSlides && setupStep === 'photo' ? (
        <AppCard>
          <Text style={styles.heading}>Add a profile photo</Text>
          <Text style={styles.body}>Use a photo of yourself if you want one on your account. You can skip this and add it later.</Text>
          <View style={styles.photoPreview}>
            {profilePhotoUri ? (
              <Image source={profilePhotoUri} style={styles.photoImage} contentFit="cover" />
            ) : (
              <View style={styles.photoFallback}>
                <Text style={styles.photoFallbackText}>{initials}</Text>
              </View>
            )}
          </View>
          <AppButton
            label={profilePhotoUri ? 'Change photo' : 'Choose photo'}
            tone="outline"
            onPress={() => {
              void pickPhoto();
            }}
            icon={<MaterialIcons name="photo-camera" size={18} color={colors.primaryBlue} />}
          />
        </AppCard>
      ) : null}

      {!inSlides && setupStep === 'document' ? (
        <AppCard>
          <View style={styles.documentBadge}>
            <MaterialIcons name="badge" size={28} color={colors.primaryBlue} />
          </View>
          <Text style={styles.heading}>Add your main ID</Text>
          <Text style={styles.body}>You can add a passport now with a short manual form, or skip and use Vault later.</Text>
          <View style={styles.documentChoiceRow}>
            <Pressable
              style={[styles.documentChoiceCard, documentChoice === 'passport' ? styles.documentChoiceCardActive : null]}
              onPress={() => {
                setDocumentChoice('passport');
                if (!passportHolderName && displayName) {
                  setPassportHolderName(displayName);
                }
              }}
            >
              <MaterialIcons
                name="badge"
                size={22}
                color={documentChoice === 'passport' ? colors.white : colors.primaryBlue}
              />
              <Text style={[styles.documentChoiceTitle, documentChoice === 'passport' ? styles.documentChoiceTitleActive : null]}>
                Add passport
              </Text>
              <Text style={[styles.documentChoiceBody, documentChoice === 'passport' ? styles.documentChoiceBodyActive : null]}>
                Save a real passport record now.
              </Text>
            </Pressable>
            <Pressable
              style={[styles.documentChoiceCard, documentChoice === 'skip' ? styles.documentChoiceCardActive : null]}
              onPress={() => setDocumentChoice('skip')}
            >
              <MaterialIcons name="schedule" size={22} color={documentChoice === 'skip' ? colors.white : colors.primaryBlue} />
              <Text style={[styles.documentChoiceTitle, documentChoice === 'skip' ? styles.documentChoiceTitleActive : null]}>
                Skip for now
              </Text>
              <Text style={[styles.documentChoiceBody, documentChoice === 'skip' ? styles.documentChoiceBodyActive : null]}>
                Add documents later from Vault.
              </Text>
            </Pressable>
          </View>
          {documentChoice === 'passport' ? (
            <View style={styles.documentForm}>
              <AppTextField
                label="Passport holder"
                value={passportHolderName}
                onChangeText={setPassportHolderName}
                placeholder={displayName || 'Andrew Boyles'}
                helper="Use the holder name exactly as it appears on the passport."
              />
              <AppTextField
                label="Passport number"
                value={passportNumber}
                onChangeText={setPassportNumber}
                placeholder="123456789"
                helper="Leave spaces out if possible."
              />
              <AppTextField
                label="Nationality"
                value={passportNationality}
                onChangeText={setPassportNationality}
                placeholder="British"
              />
              <AppTextField
                label="Issuing country code"
                value={passportCountryCode}
                onChangeText={setPassportCountryCode}
                placeholder="GBR"
                helper="Use the 3-letter passport country code."
              />
              <TypedDateField label="Date of birth" value={passportDateOfBirth} onChange={setPassportDateOfBirth} />
              <TypedDateField label="Expiry date" value={passportExpiryDate} onChange={setPassportExpiryDate} />
            </View>
          ) : (
            <View style={styles.documentNotes}>
              <Text style={styles.documentNote}>Vault remains the place to scan or import documents later.</Text>
              <Text style={styles.documentNote}>Skipping now does not block trips, SOS, or later document setup.</Text>
            </View>
          )}
        </AppCard>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xxl,
  },
  brand: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EAD8BA',
  },
  progressDotActive: {
    width: 26,
    backgroundColor: colors.nightNavy,
  },
  heading: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 28,
    textAlign: 'center',
  },
  body: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  footer: {
    gap: spacing.sm,
  },
  footerButton: {
    borderColor: colors.white,
  },
  footerButtonLabel: {
    color: colors.authBlue,
    fontSize: 17,
  },
  photoPreview: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  photoFallback: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBlue,
  },
  photoFallbackText: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 36,
  },
  photoImage: {
    width: 108,
    height: 108,
    borderRadius: 54,
  },
  documentBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBlueSurface,
    alignSelf: 'center',
  },
  documentNotes: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  documentChoiceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  documentChoiceCard: {
    flex: 1,
    gap: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  documentChoiceCardActive: {
    backgroundColor: colors.primaryBlue,
    borderColor: colors.primaryBlue,
  },
  documentChoiceTitle: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  documentChoiceTitleActive: {
    color: colors.white,
  },
  documentChoiceBody: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  documentChoiceBodyActive: {
    color: 'rgba(255,255,255,0.88)',
  },
  documentForm: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  documentNote: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
