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
import { DocumentScanFlowModal, type DocumentScanStage } from '@/components/document-support/DocumentScanFlowModal';
import { OnboardingIllustration } from '@/components/OnboardingIllustration';
import { colors, radii, spacing } from '@/constants/theme';
import { PERSONAL_DOCUMENTS_TRIP_ID } from '@/constants/vault';
import { recognizeDocumentText } from '@/services/documentTextOcr';
import { isLiveDocumentScannerAvailable, scanDocumentWithLiveEdges } from '@/services/documentScanner';
import { useAppStore } from '@/store/useAppStore';
import type { TravelStyle } from '@/types/models';
import { createEmptyPassportData, ensurePassportDraftData } from '@/utils/passport';
import { applyPassportOcrToDraft, parsePassportOcrText } from '@/utils/passportOcr';
import { validateDocument } from '@/utils/validation';
import { cleanupImportedSource, copyIntoAppStorage, deleteLocalFile } from '@/utils/fileStorage';
import { createId } from '@/utils/ids';
import { chooseProfilePhoto, removeProfilePhoto } from '@/utils/profilePhotos';

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
      'Keep passport and GHIC expiry dates easy to spot before departure, alongside packing, flight, and insurance checks so nothing slips through.',
  },
];

type SetupStep = 'name' | 'preferences' | 'photo' | 'document';
type DocumentSetupChoice = 'skip' | 'passport_manual' | 'passport_photo';
type CompanionDraft = {
  id: string;
  fullName: string;
  photoUri: string | null;
  addPassport: boolean;
  passportNumber: string;
  passportNationality: string;
  passportCountryCode: string;
  passportDateOfBirth: string | null;
  passportExpiryDate: string | null;
};

const travelStyleOptions: Array<{ value: TravelStyle; label: string; body: string }> = [
  {
    value: 'family_holidays',
    label: 'Family holidays',
    body: 'Keep passports, reminders, and traveller details ready for everyone.',
  },
  {
    value: 'city_breaks',
    label: 'City breaks',
    body: 'Stay quick with bookings, weather, and short-trip planning.',
  },
  {
    value: 'road_trips',
    label: 'Road trips',
    body: 'Keep driving docs, stops, and on-the-move plans close to hand.',
  },
  {
    value: 'mixed',
    label: 'A bit of everything',
    body: 'Use Pineapple flexibly across different kinds of trips.',
  },
];

function initialsForName(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function createCompanionDraft(): CompanionDraft {
  return {
    id: createId('companion'),
    fullName: '',
    photoUri: null,
    addPassport: false,
    passportNumber: '',
    passportNationality: '',
    passportCountryCode: '',
    passportDateOfBirth: null,
    passportExpiryDate: null,
  };
}

export default function OnboardingScreen() {
  const router = useRouter();
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const saveAppPreferences = useAppStore((state) => state.saveAppPreferences);
  const ensurePersonalDocumentsTrip = useAppStore((state) => state.ensurePersonalDocumentsTrip);
  const saveTraveller = useAppStore((state) => state.saveTraveller);
  const saveDocument = useAppStore((state) => state.saveDocument);
  const appPreferences = useAppStore((state) => state.data.appPreferences);
  const [slideIndex, setSlideIndex] = useState(0);
  const [setupStep, setSetupStep] = useState<SetupStep>('name');
  const [submitting, setSubmitting] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [travelStyle, setTravelStyle] = useState<TravelStyle>(appPreferences.travelStyle ?? 'mixed');
  const [wantsReminders, setWantsReminders] = useState(appPreferences.notificationsEnabled);
  const [documentChoice, setDocumentChoice] = useState<DocumentSetupChoice>('skip');
  const [passportHolderName, setPassportHolderName] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [passportNationality, setPassportNationality] = useState('');
  const [passportCountryCode, setPassportCountryCode] = useState('');
  const [passportDateOfBirth, setPassportDateOfBirth] = useState<string | null>(null);
  const [passportExpiryDate, setPassportExpiryDate] = useState<string | null>(null);
  const [passportLocalFileUri, setPassportLocalFileUri] = useState<string>('');
  const [passportPreviewUri, setPassportPreviewUri] = useState<string | null>(null);
  const [passportMimeType, setPassportMimeType] = useState<string | null>(null);
  const [documentCaptureMessage, setDocumentCaptureMessage] = useState<string | null>(null);
  const [scanStage, setScanStage] = useState<DocumentScanStage | null>(null);
  const [scanGuidance, setScanGuidance] = useState<string | undefined>();
  const [scanDetail, setScanDetail] = useState<string | undefined>();
  const [scanWarningText, setScanWarningText] = useState<string | null>(null);
  const [companions, setCompanions] = useState<CompanionDraft[]>([]);

  const inSlides = slideIndex < slides.length;
  const currentSlide = slides[Math.min(slideIndex, slides.length - 1)];
  const isLastSlide = slideIndex === slides.length - 1;
  const displayName = profileName.trim();
  const initials = initialsForName(displayName) || 'P';
  const passportHolderDisplay = passportHolderName.trim() || displayName;
  const photoDocumentReady = Boolean(passportLocalFileUri);

  async function finalizeOnboarding() {
    setSubmitting(true);
    try {
      const personalDocumentsTripId =
        documentChoice === 'passport_manual' || documentChoice === 'passport_photo' || companions.length
          ? await ensurePersonalDocumentsTrip()
          : null;

      await saveAppPreferences({
        profileName: displayName,
        profilePhotoUri,
        travelStyle,
        notificationsEnabled: wantsReminders,
      });

      if (documentChoice === 'passport_manual' || documentChoice === 'passport_photo') {
        const draft = ensurePassportDraftData(
          {
            tripId: personalDocumentsTripId ?? PERSONAL_DOCUMENTS_TRIP_ID,
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
            localFileUri: passportLocalFileUri,
            previewUri: passportPreviewUri,
            mimeType: passportMimeType,
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

      for (const companion of companions) {
        const fullName = companion.fullName.trim();
        if (!fullName || !personalDocumentsTripId) {
          continue;
        }

        const travellerId = await saveTraveller({
          tripId: personalDocumentsTripId,
          fullName,
          photoUri: companion.photoUri,
          dateOfBirth: companion.passportDateOfBirth,
          passportNationality: companion.addPassport ? companion.passportNationality.trim() : '',
          passportNumber: companion.addPassport ? companion.passportNumber.trim() : '',
          ghicNumber: '',
          medicalNote: '',
          notes: '',
          avatarColor: '#1EAAF0',
          relationshipType: 'other',
        });

        if (!companion.addPassport) {
          continue;
        }

        const companionPassport = ensurePassportDraftData(
          {
            tripId: personalDocumentsTripId,
            travellerId,
            holderName: fullName,
            documentType: 'passport',
            documentNumber: companion.passportNumber.trim(),
            issueDate: null,
            expiryDate: companion.passportExpiryDate,
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
              countryCode: companion.passportCountryCode.trim().toUpperCase(),
              nationality: companion.passportNationality.trim(),
              dateOfBirth: companion.passportDateOfBirth,
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

        const errors = validateDocument(companionPassport);
        if (errors.length) {
          Alert.alert('Traveller passport needs attention', `${fullName}: ${errors.join('\n')}`);
          setSubmitting(false);
          return;
        }

        await saveDocument(companionPassport);
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

  async function attachPassportImage(source: 'camera' | 'library') {
    if (submitting) {
      return;
    }

    try {
      setScanGuidance(
        source === 'camera'
          ? 'Keep the whole passport inside the frame and reduce glare before capture.'
          : 'Choose a clear passport photo with all corners visible.'
      );
      setScanDetail(
        source === 'camera'
          ? 'Pineapple will store the image now and try to read passport details if OCR is available on this build.'
          : 'Pineapple will store the imported image now and try to read passport details if OCR is available on this build.'
      );
      setScanWarningText(null);
      setScanStage('capturing');

      let assetUri: string | null = null;
      let mimeType: string | null = 'image/jpeg';

      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setScanStage(null);
          Alert.alert('Camera permission needed', 'Allow camera access to capture a passport photo, or skip this step for now.');
          return;
        }

        if (isLiveDocumentScannerAvailable()) {
          try {
            const result = await scanDocumentWithLiveEdges({ maxNumDocuments: 1 });
            if (result.status === 'success' && result.scannedImages[0]) {
              assetUri = result.scannedImages[0];
              mimeType = 'image/jpeg';
            }
          } catch {
            // Fall back to the plain camera flow.
          }
        }

        if (!assetUri) {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });
          if (result.canceled || !result.assets[0]) {
            setScanStage(null);
            return;
          }
          assetUri = result.assets[0].uri;
          mimeType = result.assets[0].mimeType ?? 'image/jpeg';
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setScanStage(null);
          Alert.alert('Photos permission needed', 'Allow photo library access to import a passport photo, or skip this step for now.');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
        if (result.canceled || !result.assets[0]) {
          setScanStage(null);
          return;
        }
        assetUri = result.assets[0].uri;
        mimeType = result.assets[0].mimeType ?? 'image/jpeg';
      }

      if (!assetUri) {
        setScanStage(null);
        return;
      }

      setScanStage('processing');
      const localFileUri = await copyIntoAppStorage(assetUri, 'vault', mimeType, { encryptAtRest: true });
      await cleanupImportedSource(assetUri);

      if (passportLocalFileUri && passportLocalFileUri !== localFileUri) {
        await deleteLocalFile(passportLocalFileUri);
      }

      setPassportLocalFileUri(localFileUri);
      setPassportPreviewUri(localFileUri);
      setPassportMimeType(mimeType);
      setDocumentChoice('passport_photo');
      setDocumentCaptureMessage('Passport image saved. You can continue now or add details before saving.');

      try {
        const ocr = await recognizeDocumentText(localFileUri, mimeType, 'Passport');
        const parsed = parsePassportOcrText(ocr.rawText);
        if (parsed) {
          const nextDraft = applyPassportOcrToDraft(
            ensurePassportDraftData(
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
                localFileUri,
                previewUri: localFileUri,
                mimeType,
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
            ),
            parsed
          );
          if (nextDraft.holderName) {
            setPassportHolderName(nextDraft.holderName);
          }
          setPassportNumber(nextDraft.documentNumber);
          setPassportExpiryDate(nextDraft.expiryDate);
          setPassportCountryCode(nextDraft.passportData?.countryCode ?? '');
          setPassportNationality(nextDraft.passportData?.nationality ?? '');
          setPassportDateOfBirth(nextDraft.passportData?.dateOfBirth ?? null);
          setDocumentCaptureMessage(parsed.warnings.length ? 'Passport image saved. OCR extracted details, but review them before continuing.' : 'Passport image saved and key details were extracted.');
          setScanWarningText(parsed.warnings[0] ?? null);
          setScanStage(parsed.warnings.length ? 'warning' : 'extracted');
          return;
        }

        setScanStage('warning');
        setScanWarningText('Passport image saved, but Pineapple could not extract reliable details. You can continue and review later in Vault.');
      } catch {
        setScanStage('warning');
        setScanWarningText('Passport image saved. OCR is unavailable or could not read this image, but onboarding can continue.');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Onboarding passport capture failed', error);
      }
      setScanStage('error');
      setScanWarningText('Pineapple could not use that passport image right now. Try again or skip this step.');
    }
  }

  function updateCompanion(companionId: string, updater: (current: CompanionDraft) => CompanionDraft) {
    setCompanions((current) => current.map((item) => (item.id === companionId ? updater(item) : item)));
  }

  async function chooseCompanionPhoto(companionId: string) {
    const current = companions.find((item) => item.id === companionId);
    if (!current) {
      return;
    }

    const nextUri = await chooseProfilePhoto(current.photoUri);
    if (!nextUri) {
      return;
    }

    updateCompanion(companionId, (entry) => ({ ...entry, photoUri: nextUri }));
  }

  async function clearCompanionPhoto(companionId: string) {
    const current = companions.find((item) => item.id === companionId);
    if (!current?.photoUri) {
      return;
    }

    await removeProfilePhoto(current.photoUri);
    updateCompanion(companionId, (entry) => ({ ...entry, photoUri: null }));
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
            onPress={() => setSetupStep('preferences')}
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

    if (setupStep === 'preferences') {
      return (
        <View style={styles.footer}>
          <AppButton
            label="Continue"
            tone="secondary"
            size="large"
            style={styles.footerButton}
            labelStyle={styles.footerButtonLabel}
            onPress={() => setSetupStep('photo')}
            disabled={submitting}
          />
          <AppButton
            label="Back"
            tone="secondary"
            size="large"
            style={styles.footerButton}
            labelStyle={styles.footerButtonLabel}
            onPress={() => setSetupStep('name')}
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

    const companionsReady = companions.every((companion) => {
      const hasName = Boolean(companion.fullName.trim());
      if (!hasName) {
        return false;
      }

      if (!companion.addPassport) {
        return true;
      }

      return Boolean(companion.passportNationality.trim() && companion.passportCountryCode.trim());
    });
    const documentReady =
      documentChoice === 'skip' ||
      (documentChoice === 'passport_manual' && Boolean(passportHolderDisplay && passportNationality.trim() && passportCountryCode.trim())) ||
      (documentChoice === 'passport_photo' && photoDocumentReady);
    const readyToFinish = documentReady && companionsReady;

    return (
      <View style={styles.footer}>
        <AppButton
          label={documentChoice === 'skip' ? 'Continue to PIN' : 'Save passport and continue'}
          tone="secondary"
          size="large"
          style={styles.footerButton}
          labelStyle={styles.footerButtonLabel}
          onPress={() => {
            void finalizeOnboarding();
          }}
          loading={submitting}
          disabled={!readyToFinish}
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
    companions,
    displayName,
    documentChoice,
    finalizeOnboarding,
    inSlides,
    isLastSlide,
    passportCountryCode,
    photoDocumentReady,
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

      {!inSlides && setupStep === 'preferences' ? (
        <AppCard>
          <Text style={styles.heading}>Set Pineapple up your way</Text>
          <Text style={styles.body}>Tell Pineapple what kind of trips you usually plan and whether you want lock-screen travel reminders later.</Text>

          <View style={styles.preferenceSection}>
            <Text style={styles.preferenceLabel}>Most of my trips are</Text>
            <View style={styles.preferenceOptions}>
              {travelStyleOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={[styles.preferenceCard, travelStyle === option.value ? styles.preferenceCardActive : null]}
                  onPress={() => setTravelStyle(option.value)}
                >
                  <Text style={[styles.preferenceTitle, travelStyle === option.value ? styles.preferenceTitleActive : null]}>{option.label}</Text>
                  <Text style={[styles.preferenceBody, travelStyle === option.value ? styles.preferenceBodyActive : null]}>{option.body}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.preferenceSection}>
            <Text style={styles.preferenceLabel}>Lock-screen travel alerts</Text>
            <Text style={styles.preferenceHint}>Pineapple can prepare departure and trip reminders, then you can allow Android notifications after setup.</Text>
            <View style={styles.binaryChoiceRow}>
              <Pressable
                style={[styles.binaryChoice, wantsReminders ? styles.binaryChoiceActive : null]}
                onPress={() => setWantsReminders(true)}
              >
                <Text style={[styles.binaryChoiceTitle, wantsReminders ? styles.binaryChoiceTitleActive : null]}>Turn them on</Text>
                <Text style={[styles.binaryChoiceBody, wantsReminders ? styles.binaryChoiceBodyActive : null]}>Best for family trips and timed transport plans.</Text>
              </Pressable>
              <Pressable
                style={[styles.binaryChoice, !wantsReminders ? styles.binaryChoiceActive : null]}
                onPress={() => setWantsReminders(false)}
              >
                <Text style={[styles.binaryChoiceTitle, !wantsReminders ? styles.binaryChoiceTitleActive : null]}>Not now</Text>
                <Text style={[styles.binaryChoiceBody, !wantsReminders ? styles.binaryChoiceBodyActive : null]}>You can switch reminders on later from Settings.</Text>
              </Pressable>
            </View>
          </View>
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
          <Text style={styles.heading}>Add passports and travellers</Text>
          <Text style={styles.body}>Set up your own passport first, then add anyone else you usually travel with. Everything here is optional except your main profile.</Text>
          <View style={styles.documentChoiceRow}>
            <Pressable
              style={[styles.documentChoiceCard, documentChoice === 'passport_manual' ? styles.documentChoiceCardActive : null]}
              onPress={() => {
                setDocumentChoice('passport_manual');
                if (!passportHolderName && displayName) {
                  setPassportHolderName(displayName);
                }
              }}
            >
              <MaterialIcons
                name="badge"
                size={22}
                color={documentChoice === 'passport_manual' ? colors.white : colors.primaryBlue}
              />
              <Text style={[styles.documentChoiceTitle, documentChoice === 'passport_manual' ? styles.documentChoiceTitleActive : null]}>
                Manual entry
              </Text>
              <Text style={[styles.documentChoiceBody, documentChoice === 'passport_manual' ? styles.documentChoiceBodyActive : null]}>
                Type the main passport fields now.
              </Text>
            </Pressable>
            <Pressable
              style={[styles.documentChoiceCard, documentChoice === 'passport_photo' ? styles.documentChoiceCardActive : null]}
              onPress={() => {
                setDocumentChoice('passport_photo');
                if (!passportHolderName && displayName) {
                  setPassportHolderName(displayName);
                }
              }}
            >
              <MaterialIcons
                name="photo-camera"
                size={22}
                color={documentChoice === 'passport_photo' ? colors.white : colors.primaryBlue}
              />
              <Text style={[styles.documentChoiceTitle, documentChoice === 'passport_photo' ? styles.documentChoiceTitleActive : null]}>
                Photo / OCR
              </Text>
              <Text style={[styles.documentChoiceBody, documentChoice === 'passport_photo' ? styles.documentChoiceBodyActive : null]}>
                Capture or import now, then review later if needed.
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
          {documentChoice === 'passport_manual' ? (
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
          ) : documentChoice === 'passport_photo' ? (
            <View style={styles.documentForm}>
              <Text style={styles.documentPhotoLead}>
                Add a passport photo now. Pineapple will store it immediately and try OCR when supported, but you can always continue onboarding.
              </Text>
              <View style={styles.photoActionRow}>
                <AppButton
                  label="Capture photo"
                  tone="outline"
                  onPress={() => {
                    void attachPassportImage('camera');
                  }}
                  icon={<MaterialIcons name="photo-camera" size={18} color={colors.primaryBlue} />}
                />
                <AppButton
                  label="Choose photo"
                  tone="outline"
                  onPress={() => {
                    void attachPassportImage('library');
                  }}
                  icon={<MaterialIcons name="photo-library" size={18} color={colors.primaryBlue} />}
                />
              </View>
              {passportPreviewUri ? (
                <View style={styles.passportPreviewWrap}>
                  <Image source={passportPreviewUri} style={styles.passportPreview} contentFit="cover" />
                </View>
              ) : null}
              {documentCaptureMessage ? <Text style={styles.documentPhotoNote}>{documentCaptureMessage}</Text> : null}
              <AppTextField
                label="Passport holder"
                value={passportHolderName}
                onChangeText={setPassportHolderName}
                placeholder={displayName || 'Andrew Boyles'}
                helper="Optional now. You can refine all passport fields later in Vault."
              />
            </View>
          ) : (
            <View style={styles.documentNotes}>
              <Text style={styles.documentNote}>Vault remains the place to scan or import documents later.</Text>
              <Text style={styles.documentNote}>Skipping now does not block trips, SOS, or later document setup.</Text>
            </View>
          )}

          <View style={styles.companionSection}>
            <View style={styles.companionHeader}>
              <View style={styles.companionHeaderCopy}>
                <Text style={styles.companionTitle}>Other travellers</Text>
                <Text style={styles.helperText}>Add family or regular travel companions now, and optionally store a passport record for each.</Text>
              </View>
              <AppButton
                label="Add traveller"
                tone="outline"
                onPress={() => setCompanions((current) => [...current, createCompanionDraft()])}
                icon={<MaterialIcons name="person-add-alt-1" size={18} color={colors.primaryBlue} />}
              />
            </View>

            {companions.length ? (
              <View style={styles.companionList}>
                {companions.map((companion, index) => (
                  <View key={companion.id} style={styles.companionCard}>
                    <View style={styles.companionCardHeader}>
                      <Text style={styles.companionCardTitle}>Traveller {index + 1}</Text>
                      <Pressable
                        onPress={async () => {
                          if (companion.photoUri) {
                            await removeProfilePhoto(companion.photoUri);
                          }
                          setCompanions((current) => current.filter((item) => item.id !== companion.id));
                        }}
                        hitSlop={8}
                      >
                        <MaterialIcons name="delete-outline" size={20} color={colors.dangerRed} />
                      </Pressable>
                    </View>
                    <AppTextField
                      label="Traveller name"
                      value={companion.fullName}
                      onChangeText={(value) => updateCompanion(companion.id, (current) => ({ ...current, fullName: value }))}
                      placeholder="Mum, Dad, Sophie..."
                    />

                    <View style={styles.companionPhotoRow}>
                      <View style={styles.companionAvatar}>
                        {companion.photoUri ? (
                          <Image source={companion.photoUri} style={styles.companionAvatarImage} contentFit="cover" />
                        ) : (
                          <Text style={styles.companionAvatarText}>{initialsForName(companion.fullName) || '?'}</Text>
                        )}
                      </View>
                      <View style={styles.companionPhotoActions}>
                        <AppButton
                          label={companion.photoUri ? 'Change photo' : 'Add photo'}
                          tone="outline"
                          onPress={() => {
                            void chooseCompanionPhoto(companion.id);
                          }}
                        />
                        {companion.photoUri ? (
                          <AppButton
                            label="Remove photo"
                            tone="ghost"
                            onPress={() => {
                              void clearCompanionPhoto(companion.id);
                            }}
                          />
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.binaryChoiceRow}>
                      <Pressable
                        style={[styles.binaryChoice, companion.addPassport ? styles.binaryChoiceActive : null]}
                        onPress={() => updateCompanion(companion.id, (current) => ({ ...current, addPassport: true }))}
                      >
                        <Text style={[styles.binaryChoiceTitle, companion.addPassport ? styles.binaryChoiceTitleActive : null]}>Add passport now</Text>
                        <Text style={[styles.binaryChoiceBody, companion.addPassport ? styles.binaryChoiceBodyActive : null]}>Save the basics now and finish the rest later in Vault.</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.binaryChoice, !companion.addPassport ? styles.binaryChoiceActive : null]}
                        onPress={() => updateCompanion(companion.id, (current) => ({ ...current, addPassport: false }))}
                      >
                        <Text style={[styles.binaryChoiceTitle, !companion.addPassport ? styles.binaryChoiceTitleActive : null]}>Skip passport</Text>
                        <Text style={[styles.binaryChoiceBody, !companion.addPassport ? styles.binaryChoiceBodyActive : null]}>Create the traveller now and add the passport later.</Text>
                      </Pressable>
                    </View>

                    {companion.addPassport ? (
                      <View style={styles.companionPassportForm}>
                        <AppTextField
                          label="Passport number"
                          value={companion.passportNumber}
                          onChangeText={(value) => updateCompanion(companion.id, (current) => ({ ...current, passportNumber: value }))}
                          placeholder="123456789"
                        />
                        <AppTextField
                          label="Nationality"
                          value={companion.passportNationality}
                          onChangeText={(value) => updateCompanion(companion.id, (current) => ({ ...current, passportNationality: value }))}
                          placeholder="British"
                        />
                        <AppTextField
                          label="Issuing country code"
                          value={companion.passportCountryCode}
                          onChangeText={(value) => updateCompanion(companion.id, (current) => ({ ...current, passportCountryCode: value }))}
                          placeholder="GBR"
                        />
                        <TypedDateField
                          label="Date of birth"
                          value={companion.passportDateOfBirth}
                          onChange={(value) => updateCompanion(companion.id, (current) => ({ ...current, passportDateOfBirth: value }))}
                        />
                        <TypedDateField
                          label="Expiry date"
                          value={companion.passportExpiryDate}
                          onChange={(value) => updateCompanion(companion.id, (current) => ({ ...current, passportExpiryDate: value }))}
                        />
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.documentNotes}>
                <Text style={styles.documentNote}>Adding other travellers is optional. You can keep setup focused on yourself and do the rest later.</Text>
              </View>
            )}
          </View>
        </AppCard>
      ) : null}
      <DocumentScanFlowModal
        visible={scanStage !== null}
        title="Add passport"
        stage={scanStage ?? 'ready'}
        documentLabel="Passport"
        previewUri={passportPreviewUri}
        mimeType={passportMimeType}
        guidance={scanGuidance}
        detail={scanDetail}
        warningText={scanWarningText}
        onClose={() => {
          setScanStage(null);
          setScanWarningText(null);
        }}
        primaryLabel={scanStage === 'warning' || scanStage === 'extracted' ? 'Continue' : undefined}
        onPrimaryAction={
          scanStage === 'warning' || scanStage === 'extracted'
            ? () => {
                setScanStage(null);
                setScanWarningText(null);
              }
            : undefined
        }
      />
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
  preferenceSection: {
    gap: spacing.sm,
  },
  preferenceLabel: {
    color: colors.nightNavy,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    textAlign: 'center',
  },
  preferenceHint: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  preferenceOptions: {
    gap: spacing.sm,
  },
  preferenceCard: {
    gap: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  preferenceCardActive: {
    backgroundColor: colors.primaryBlue,
    borderColor: colors.primaryBlue,
  },
  preferenceTitle: {
    color: colors.nightNavy,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  preferenceTitleActive: {
    color: colors.white,
  },
  preferenceBody: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  preferenceBodyActive: {
    color: 'rgba(255,255,255,0.88)',
  },
  binaryChoiceRow: {
    gap: spacing.sm,
  },
  binaryChoice: {
    gap: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  binaryChoiceActive: {
    backgroundColor: colors.primaryBlue,
    borderColor: colors.primaryBlue,
  },
  binaryChoiceTitle: {
    color: colors.nightNavy,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  binaryChoiceTitleActive: {
    color: colors.white,
  },
  binaryChoiceBody: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  binaryChoiceBodyActive: {
    color: 'rgba(255,255,255,0.88)',
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
  photoActionRow: {
    gap: spacing.sm,
  },
  passportPreviewWrap: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.primaryBlueTint,
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
  },
  passportPreview: {
    width: '100%',
    height: 180,
  },
  documentPhotoLead: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  documentPhotoNote: {
    color: colors.nightNavy,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  documentNote: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  helperText: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  companionSection: {
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.primaryBlueBorder,
  },
  companionHeader: {
    gap: spacing.sm,
  },
  companionHeaderCopy: {
    gap: 4,
  },
  companionTitle: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
  companionList: {
    gap: spacing.md,
  },
  companionCard: {
    gap: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    backgroundColor: '#F9FCFF',
    padding: spacing.md,
  },
  companionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  companionCardTitle: {
    color: colors.nightNavy,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  companionPhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  companionAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBlue,
    overflow: 'hidden',
  },
  companionAvatarImage: {
    width: '100%',
    height: '100%',
  },
  companionAvatarText: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
  },
  companionPhotoActions: {
    flex: 1,
    gap: spacing.xs,
  },
  companionPassportForm: {
    gap: spacing.sm,
  },
});
