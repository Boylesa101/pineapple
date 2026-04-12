import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { AppTextField } from '@/components/AppTextField';
import { ChoiceChips } from '@/components/ChoiceChips';
import { TypedDateField } from '@/components/TypedDateField';
import { DocumentScanFlowModal, type DocumentScanStage } from '@/components/document-support/DocumentScanFlowModal';
import { colors, radii, spacing } from '@/constants/theme';
import { PERSONAL_DOCUMENTS_TRIP_ID } from '@/constants/vault';
import { recognizeDocumentText } from '@/services/documentTextOcr';
import { isLiveDocumentScannerAvailable, scanDocumentWithLiveEdges } from '@/services/documentScanner';
import { useAppStore } from '@/store/useAppStore';
import { createEmptyPassportData, ensurePassportDraftData } from '@/utils/passport';
import { applyPassportOcrToDraft, parsePassportOcrText } from '@/utils/passportOcr';
import { isWebCompanionPolicyActive, sensitiveWebSupportMessage } from '@/utils/platformPolicy';
import { validateDocument } from '@/utils/validation';
import { cleanupImportedSource, copyIntoAppStorage, deleteLocalFile } from '@/utils/fileStorage';
import { createId } from '@/utils/ids';

type DocumentSetupChoice = 'skip' | 'passport_manual' | 'passport_photo';
type TravellerDraft = {
  id: string;
  fullName: string;
  addPassport: boolean;
  passportNumber: string;
  passportNationality: string;
  passportCountryCode: string;
  passportDateOfBirth: string | null;
  passportExpiryDate: string | null;
};

function createTravellerDraft(): TravellerDraft {
  return {
    id: createId('traveller'),
    fullName: '',
    addPassport: false,
    passportNumber: '',
    passportNationality: '',
    passportCountryCode: '',
    passportDateOfBirth: null,
    passportExpiryDate: null,
  };
}

export default function TravellerSetupScreen() {
  const router = useRouter();
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const ensurePersonalDocumentsTrip = useAppStore((state) => state.ensurePersonalDocumentsTrip);
  const saveTraveller = useAppStore((state) => state.saveTraveller);
  const saveDocument = useAppStore((state) => state.saveDocument);
  const appPreferences = useAppStore((state) => state.data.appPreferences);
  const [submitting, setSubmitting] = useState(false);
  const [documentChoice, setDocumentChoice] = useState<DocumentSetupChoice>('skip');
  const [passportHolderName, setPassportHolderName] = useState(appPreferences.profileName);
  const [passportNumber, setPassportNumber] = useState('');
  const [passportNationality, setPassportNationality] = useState('');
  const [passportCountryCode, setPassportCountryCode] = useState('');
  const [passportDateOfBirth, setPassportDateOfBirth] = useState<string | null>(null);
  const [passportExpiryDate, setPassportExpiryDate] = useState<string | null>(null);
  const [passportLocalFileUri, setPassportLocalFileUri] = useState('');
  const [passportPreviewUri, setPassportPreviewUri] = useState<string | null>(null);
  const [passportMimeType, setPassportMimeType] = useState<string | null>(null);
  const [documentCaptureMessage, setDocumentCaptureMessage] = useState<string | null>(null);
  const [scanStage, setScanStage] = useState<DocumentScanStage | null>(null);
  const [scanGuidance, setScanGuidance] = useState<string | undefined>();
  const [scanDetail, setScanDetail] = useState<string | undefined>();
  const [scanWarningText, setScanWarningText] = useState<string | null>(null);
  const [travellers, setTravellers] = useState<TravellerDraft[]>([]);

  function updateTraveller(travellerId: string, updater: (current: TravellerDraft) => TravellerDraft) {
    setTravellers((current) => current.map((item) => (item.id === travellerId ? updater(item) : item)));
  }

  async function attachPassportImage(source: 'camera' | 'library') {
    if (isWebCompanionPolicyActive()) {
      Alert.alert('Use the Android app for passport images', sensitiveWebSupportMessage);
      return;
    }

    try {
      setScanGuidance(
        source === 'camera'
          ? 'Keep the whole passport inside the frame and reduce glare before capture.'
          : 'Choose a clear passport image with all corners visible.'
      );
      setScanDetail('Pineapple stores the image locally and then tries to extract the passport fields for review.');
      setScanWarningText(null);
      setScanStage('capturing');

      let assetUri: string | null = null;
      let mimeType: string | null = 'image/jpeg';

      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setScanStage(null);
          Alert.alert('Camera permission needed', 'Allow camera access to capture a passport image, or use manual entry.');
          return;
        }

        if (isLiveDocumentScannerAvailable()) {
          try {
            const result = await scanDocumentWithLiveEdges({ maxNumDocuments: 1 });
            if (result.status === 'success' && result.scannedImages[0]) {
              assetUri = result.scannedImages[0];
            }
          } catch {
            // Fall back to plain camera capture.
          }
        }

        if (!assetUri) {
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
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
          Alert.alert('Photos permission needed', 'Allow photo library access to import a passport image, or use manual entry.');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
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
      setDocumentCaptureMessage('Passport image saved. Review the extracted fields before you finish setup.');

      try {
        const ocr = await recognizeDocumentText(localFileUri, mimeType, 'Passport');
        const parsed = parsePassportOcrText(ocr.rawText);
        if (!parsed) {
          setScanStage('warning');
          setScanWarningText('Passport image saved, but Pineapple could not extract reliable details from this image.');
          return;
        }

        const nextDraft = applyPassportOcrToDraft(
          ensurePassportDraftData(
            {
              tripId: PERSONAL_DOCUMENTS_TRIP_ID,
              travellerId: null,
              holderName: passportHolderName.trim() || appPreferences.profileName,
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

        setPassportHolderName(nextDraft.holderName);
        setPassportNumber(nextDraft.documentNumber);
        setPassportExpiryDate(nextDraft.expiryDate);
        setPassportCountryCode(nextDraft.passportData?.countryCode ?? '');
        setPassportNationality(nextDraft.passportData?.nationality ?? '');
        setPassportDateOfBirth(nextDraft.passportData?.dateOfBirth ?? null);
        setScanWarningText(parsed.warnings[0] ?? null);
        setScanStage(parsed.warnings.length ? 'warning' : 'extracted');
      } catch {
        setScanStage('warning');
        setScanWarningText('Passport image saved. OCR is unavailable for this image, but you can still continue.');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Traveller setup passport image failed', error);
      }
      setScanStage('error');
      setScanWarningText('Pineapple could not use that passport image right now. Try again or switch to manual entry.');
    }
  }

  async function finishSetup() {
    if (submitting) {
      return;
    }

    const companionsReady = travellers.every((traveller) => {
      if (!traveller.fullName.trim()) {
        return false;
      }

      if (!traveller.addPassport) {
        return true;
      }

      return Boolean(traveller.passportNationality.trim() && traveller.passportCountryCode.trim());
    });

    const documentReady =
      documentChoice === 'skip' ||
      (documentChoice === 'passport_manual' &&
        Boolean((passportHolderName.trim() || appPreferences.profileName.trim()) && passportNationality.trim() && passportCountryCode.trim())) ||
      (documentChoice === 'passport_photo' && Boolean(passportLocalFileUri));

    if (!documentReady || !companionsReady) {
      Alert.alert('Setup needs a quick review', 'Finish the selected passport fields, or choose Skip for now before continuing.');
      return;
    }

    setSubmitting(true);
    try {
      const personalTripId =
        documentChoice !== 'skip' || travellers.length ? await ensurePersonalDocumentsTrip() : PERSONAL_DOCUMENTS_TRIP_ID;

      if (documentChoice === 'passport_manual' || documentChoice === 'passport_photo') {
        const draft = ensurePassportDraftData(
          {
            tripId: personalTripId,
            travellerId: null,
            holderName: passportHolderName.trim() || appPreferences.profileName.trim(),
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

      for (const traveller of travellers) {
        const fullName = traveller.fullName.trim();
        if (!fullName) {
          continue;
        }

        const travellerId = await saveTraveller({
          tripId: personalTripId,
          fullName,
          dateOfBirth: traveller.passportDateOfBirth,
          passportNationality: traveller.addPassport ? traveller.passportNationality.trim() : '',
          passportNumber: traveller.addPassport ? traveller.passportNumber.trim() : '',
          ghicNumber: '',
          medicalNote: '',
          notes: '',
          avatarColor: '#1EAAF0',
          relationshipType: 'other',
        });

        if (!traveller.addPassport) {
          continue;
        }

        const passportDraft = ensurePassportDraftData(
          {
            tripId: personalTripId,
            travellerId,
            holderName: fullName,
            documentType: 'passport',
            documentNumber: traveller.passportNumber.trim(),
            issueDate: null,
            expiryDate: traveller.passportExpiryDate,
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
              countryCode: traveller.passportCountryCode.trim().toUpperCase(),
              nationality: traveller.passportNationality.trim(),
              dateOfBirth: traveller.passportDateOfBirth,
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

        const errors = validateDocument(passportDraft);
        if (errors.length) {
          Alert.alert('Traveller passport needs attention', `${fullName}: ${errors.join('\n')}`);
          setSubmitting(false);
          return;
        }

        await saveDocument(passportDraft);
      }

      await completeOnboarding();
      router.replace('/home');
    } catch (error) {
      if (__DEV__) {
        console.error('Traveller setup failed', error);
      }
      Alert.alert('Setup could not continue', 'Pineapple could not finish traveller setup. Your saved data is still kept locally.');
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
            label={documentChoice === 'skip' ? 'Finish setup' : 'Save and finish'}
            tone="secondary"
            size="large"
            style={styles.footerButton}
            labelStyle={styles.footerButtonLabel}
            onPress={() => {
              void finishSetup();
            }}
            loading={submitting}
          />
          <AppButton
            label="Skip for now"
            tone="secondary"
            size="large"
            style={styles.footerButton}
            labelStyle={styles.footerButtonLabel}
            onPress={() => {
              setDocumentChoice('skip');
              void finishSetup();
            }}
            disabled={submitting}
          />
        </View>
      }
    >
      <AppCard>
        <View style={styles.badge}>
          <MaterialIcons name="badge" size={28} color={colors.primaryBlue} />
        </View>
        <Text style={styles.heading}>Passport and traveller setup</Text>
        <Text style={styles.body}>
          Set up your own passport after security is ready, then add anyone else you usually travel with. This stays as a Pineapple record and is not an official travel document.
        </Text>
        {isWebCompanionPolicyActive() ? <Text style={styles.helper}>{sensitiveWebSupportMessage}</Text> : null}

        <View style={styles.choiceRow}>
          <Pressable style={[styles.choiceCard, documentChoice === 'passport_manual' ? styles.choiceCardActive : null]} onPress={() => setDocumentChoice('passport_manual')}>
            <MaterialIcons name="edit-note" size={22} color={documentChoice === 'passport_manual' ? colors.white : colors.primaryBlue} />
            <Text style={[styles.choiceTitle, documentChoice === 'passport_manual' ? styles.choiceTitleActive : null]}>Manual passport</Text>
            <Text style={[styles.choiceBody, documentChoice === 'passport_manual' ? styles.choiceBodyActive : null]}>Type the passport fields now.</Text>
          </Pressable>
          <Pressable
            style={[styles.choiceCard, documentChoice === 'passport_photo' ? styles.choiceCardActive : null]}
            onPress={() => setDocumentChoice('passport_photo')}
            disabled={isWebCompanionPolicyActive()}
          >
            <MaterialIcons name="photo-camera" size={22} color={documentChoice === 'passport_photo' ? colors.white : colors.primaryBlue} />
            <Text style={[styles.choiceTitle, documentChoice === 'passport_photo' ? styles.choiceTitleActive : null]}>Photo / OCR</Text>
            <Text style={[styles.choiceBody, documentChoice === 'passport_photo' ? styles.choiceBodyActive : null]}>
              {isWebCompanionPolicyActive() ? 'Use the Android app for secure passport capture.' : 'Scan or import a passport image.'}
            </Text>
          </Pressable>
          <Pressable style={[styles.choiceCard, documentChoice === 'skip' ? styles.choiceCardActive : null]} onPress={() => setDocumentChoice('skip')}>
            <MaterialIcons name="schedule" size={22} color={documentChoice === 'skip' ? colors.white : colors.primaryBlue} />
            <Text style={[styles.choiceTitle, documentChoice === 'skip' ? styles.choiceTitleActive : null]}>Skip</Text>
            <Text style={[styles.choiceBody, documentChoice === 'skip' ? styles.choiceBodyActive : null]}>Add passports later in Vault.</Text>
          </Pressable>
        </View>

        {documentChoice === 'passport_manual' ? (
          <View style={styles.form}>
            <AppTextField label="Passport holder" value={passportHolderName} onChangeText={setPassportHolderName} placeholder={appPreferences.profileName || 'Traveller name'} />
            <AppTextField label="Passport number" value={passportNumber} onChangeText={setPassportNumber} placeholder="123456789" />
            <AppTextField label="Nationality" value={passportNationality} onChangeText={setPassportNationality} placeholder="British" />
            <AppTextField label="Issuing country code" value={passportCountryCode} onChangeText={setPassportCountryCode} placeholder="GBR" />
            <TypedDateField label="Date of birth" value={passportDateOfBirth} onChange={setPassportDateOfBirth} />
            <TypedDateField label="Expiry date" value={passportExpiryDate} onChange={setPassportExpiryDate} />
          </View>
        ) : null}

        {documentChoice === 'passport_photo' ? (
          <View style={styles.form}>
            <Text style={styles.helper}>Capture or import a passport image now. Pineapple stores it locally and tries OCR on-device when available.</Text>
            <View style={styles.photoActionRow}>
              <AppButton label="Capture passport" tone="outline" onPress={() => void attachPassportImage('camera')} />
              <AppButton label="Choose image" tone="outline" onPress={() => void attachPassportImage('library')} />
            </View>
            {passportPreviewUri ? (
              <View style={styles.passportPreviewWrap}>
                <Image source={passportPreviewUri} style={styles.passportPreview} contentFit="cover" />
              </View>
            ) : null}
            {documentCaptureMessage ? <Text style={styles.helper}>{documentCaptureMessage}</Text> : null}
          </View>
        ) : null}
      </AppCard>

      <AppCard title="Other travellers" subtitle="Add family or group travellers now, with optional passport basics for each person.">
        {travellers.map((traveller, index) => (
          <View key={traveller.id} style={[styles.travellerCard, index === travellers.length - 1 ? null : styles.travellerCardGap]}>
            <View style={styles.travellerHeader}>
              <Text style={styles.travellerTitle}>{traveller.fullName.trim() || 'New traveller'}</Text>
              <Pressable onPress={() => setTravellers((current) => current.filter((item) => item.id !== traveller.id))}>
                <MaterialIcons name="delete-outline" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <AppTextField
              label="Traveller name"
              value={traveller.fullName}
              onChangeText={(value) => updateTraveller(traveller.id, (current) => ({ ...current, fullName: value }))}
              placeholder="Alex Pineapple"
            />
            <View style={styles.field}>
              <Text style={styles.label}>Add passport basics</Text>
              <ChoiceChips<'yes' | 'no'>
                value={traveller.addPassport ? 'yes' : 'no'}
                onChange={(value) => updateTraveller(traveller.id, (current) => ({ ...current, addPassport: value === 'yes' }))}
                options={[
                  { label: 'Yes', value: 'yes' },
                  { label: 'No', value: 'no' },
                ]}
              />
            </View>
            {traveller.addPassport ? (
              <View style={styles.form}>
                <AppTextField label="Passport number" value={traveller.passportNumber} onChangeText={(value) => updateTraveller(traveller.id, (current) => ({ ...current, passportNumber: value }))} />
                <AppTextField label="Nationality" value={traveller.passportNationality} onChangeText={(value) => updateTraveller(traveller.id, (current) => ({ ...current, passportNationality: value }))} />
                <AppTextField label="Issuing country code" value={traveller.passportCountryCode} onChangeText={(value) => updateTraveller(traveller.id, (current) => ({ ...current, passportCountryCode: value }))} />
                <TypedDateField label="Date of birth" value={traveller.passportDateOfBirth} onChange={(value) => updateTraveller(traveller.id, (current) => ({ ...current, passportDateOfBirth: value }))} />
                <TypedDateField label="Expiry date" value={traveller.passportExpiryDate} onChange={(value) => updateTraveller(traveller.id, (current) => ({ ...current, passportExpiryDate: value }))} />
              </View>
            ) : null}
          </View>
        ))}

        <AppButton label="Add traveller" tone="outline" onPress={() => setTravellers((current) => [...current, createTravellerDraft()])} />
      </AppCard>

      <DocumentScanFlowModal
        visible={scanStage !== null}
        title="Passport setup"
        documentLabel="Passport"
        stage={scanStage ?? 'capturing'}
        guidance={scanGuidance}
        detail={scanDetail}
        warningText={scanWarningText}
        onClose={() => setScanStage(null)}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBlueSurface,
    alignSelf: 'center',
  },
  heading: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    textAlign: 'center',
  },
  body: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  choiceRow: {
    gap: spacing.sm,
  },
  choiceCard: {
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  choiceCardActive: {
    backgroundColor: colors.primaryBlue,
    borderColor: colors.primaryBlue,
  },
  choiceTitle: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  choiceTitleActive: {
    color: colors.white,
  },
  choiceBody: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  choiceBodyActive: {
    color: 'rgba(255,255,255,0.84)',
  },
  form: {
    gap: spacing.sm,
  },
  helper: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  photoActionRow: {
    gap: spacing.sm,
  },
  passportPreviewWrap: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
  },
  passportPreview: {
    width: '100%',
    aspectRatio: 1.58,
  },
  travellerCard: {
    gap: spacing.sm,
  },
  travellerCardGap: {
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F8',
    marginBottom: spacing.md,
  },
  travellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  travellerTitle: {
    color: colors.primaryBlueText,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  footer: {
    gap: spacing.sm,
  },
  footerButton: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.24)',
  },
  footerButtonLabel: {
    color: colors.white,
  },
});
