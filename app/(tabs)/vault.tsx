import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppModal } from '@/components/AppModal';
import { AppScreen } from '@/components/AppScreen';
import { AppTextField } from '@/components/AppTextField';
import { AvatarBadge } from '@/components/AvatarBadge';
import { ChoiceChips } from '@/components/ChoiceChips';
import { DateTimeField } from '@/components/DateTimeField';
import { CopyDataButton } from '@/components/document-support/CopyDataButton';
import { DocumentAddActionsCard } from '@/components/document-support/DocumentAddActionsCard';
import { DocumentScanViewerModal } from '@/components/document-support/DocumentScanViewerModal';
import { ExtractedFieldEditor } from '@/components/document-support/ExtractedFieldEditor';
import { VerificationBadge } from '@/components/document-support/VerificationBadge';
import { DocumentVaultEmptyState } from '@/components/document-support/DocumentVaultEmptyState';
import { DrivingLicenceDocument } from '@/components/driving-licence/DrivingLicenceDocument';
import { EmptyState } from '@/components/EmptyState';
import { FormalDocumentRecord } from '@/components/formal-document/FormalDocumentRecord';
import { HealthCardDocument } from '@/components/health-card/HealthCardDocument';
import { InfoChip } from '@/components/InfoChip';
import { ManagedFileImage } from '@/components/ManagedFileImage';
import { MultiSelectChips } from '@/components/MultiSelectChips';
import { PaymentCardDocument } from '@/components/payment-card/PaymentCardDocument';
import { PinPad } from '@/components/PinPad';
import { PassportDocument } from '@/components/passport/PassportDocument';
import { TripPicker } from '@/components/TripPicker';
import { colors, radii, spacing } from '@/constants/theme';
import { travellerAvatarColors } from '@/data/travellerOptions';
import { recognizeDrivingLicenceScan } from '@/services/drivingLicenceOcr';
import { recognizeFormalDocumentScan } from '@/services/formalDocumentOcr';
import { recognizeHealthCardScan } from '@/services/healthCardOcr';
import { recognizePassportScan } from '@/services/passportOcr';
import { useAppStore } from '@/store/useAppStore';
import type { DocumentDraft, DocumentType, ExpiryReminderLeadTime } from '@/types/models';
import { formatShortDate } from '@/utils/date';
import {
  buildDocumentDraftDefaults,
  documentTypeNeedsExpiryPrompt,
  documentTypeSupportsExpiryWarnings,
  getDocumentExpiryInfo,
  normalizeExpiryReminderSchedule,
} from '@/utils/documentExpiry';
import { findPotentialDocumentDuplicate } from '@/utils/documentDuplicates';
import {
  buildDrivingLicenceCopyPayload,
  ensureDrivingLicenceDraftData,
  getDrivingLicenceVerificationStatus,
} from '@/utils/drivingLicence';
import { applyDrivingLicenceOcrToDraft, canRunDrivingLicenceOcr } from '@/utils/drivingLicenceOcr';
import { cleanupImportedSource, copyIntoAppStorage } from '@/utils/fileStorage';
import {
  buildFormalDocumentCopyPayload,
  ensureFormalDocumentDraftData,
  getFormalDocumentVerificationStatus,
  isFormalDocumentType,
} from '@/utils/formalDocument';
import { applyFormalDocumentOcrToDraft, canRunFormalDocumentOcr } from '@/utils/formalDocumentOcr';
import { maskSensitive } from '@/utils/format';
import { buildHealthCardCopyPayload, ensureHealthCardDraftData, getHealthCardVerificationStatus } from '@/utils/healthCard';
import { applyHealthCardOcrToDraft, canRunHealthCardOcr } from '@/utils/healthCardOcr';
import {
  buildPaymentCardCopyPayload,
  ensurePaymentCardDraftData,
  getPaymentCardVerificationStatus,
  maskPaymentCardNumber,
} from '@/utils/paymentCard';
import { buildPassportCopyPayload, ensurePassportDraftData, getPassportVerificationStatus } from '@/utils/passport';
import { applyPassportOcrToDraft, hasPassportImageForOcr } from '@/utils/passportOcr';
import { getDocumentSourceCtaLabel, isDocumentPdfSource } from '@/utils/documentViewer';
import { getDocumentVaultSetupState } from '@/utils/documentVaultSetup';
import { getDocumentExpiryWarnings, getTripBundle } from '@/utils/selectors';
import { toUserMessage } from '@/utils/userErrors';
import { validateDocument } from '@/utils/validation';

const documentLabels: Record<DocumentType, string> = {
  passport: 'Passport',
  ghic: 'GHIC / EHIC',
  insurance: 'Travel insurance',
  visa: 'Visa',
  driving_licence: 'Driving licence',
  payment_card: 'Payment card',
  id_card: 'ID card',
  boarding_pass: 'Boarding pass',
  hotel_booking: 'Hotel booking',
  excursion_ticket: 'Excursion ticket',
  custom: 'Custom',
};

const scheduleOptions: Array<{ label: string; value: ExpiryReminderLeadTime }> = [
  { label: '180d', value: 180 },
  { label: '90d', value: 90 },
  { label: '30d', value: 30 },
  { label: '14d', value: 14 },
  { label: '7d', value: 7 },
  { label: '1d', value: 1 },
  { label: 'Day of', value: 0 },
];

type PrimaryFilter = 'all' | 'traveller' | 'type';
type GroupMode = 'flat' | 'traveller' | 'type';
type DocumentAssetSource = 'files' | 'photos' | 'camera';
type DocumentScanSide = 'front' | 'back';
type ScanViewerState = {
  title: string;
  localFileUri: string | null;
  previewUri?: string | null;
  mimeType?: string | null;
  emptyText?: string;
};

export default function VaultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ editDocumentId?: string }>();
  const {
    data,
    activeTripId,
    setActiveTrip,
    saveTraveller,
    saveDocument,
    deleteRecord,
    security,
    confirmPin,
    unlockWithBiometrics,
    unlockVault,
    vaultUnlockedUntil,
  } = useAppStore();
  const [editorVisible, setEditorVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [pinPromptVisible, setPinPromptVisible] = useState(false);
  const [draft, setDraft] = useState<DocumentDraft | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [primaryFilter, setPrimaryFilter] = useState<PrimaryFilter>('all');
  const [travellerFilter, setTravellerFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [groupMode, setGroupMode] = useState<GroupMode>('flat');
  const [passportOpen, setPassportOpen] = useState(false);
  const [drivingLicenceOpen, setDrivingLicenceOpen] = useState(false);
  const [healthCardOpen, setHealthCardOpen] = useState(false);
  const [paymentCardOpen, setPaymentCardOpen] = useState(false);
  const [formalDocumentOpen, setFormalDocumentOpen] = useState(false);
  const [scanViewer, setScanViewer] = useState<ScanViewerState | null>(null);
  const [setupTravellerName, setSetupTravellerName] = useState('');
  const [savingSetupTraveller, setSavingSetupTraveller] = useState(false);
  const [passportOcrLoading, setPassportOcrLoading] = useState(false);
  const [drivingLicenceOcrLoading, setDrivingLicenceOcrLoading] = useState(false);
  const [healthCardOcrLoading, setHealthCardOcrLoading] = useState(false);
  const [formalDocumentOcrLoading, setFormalDocumentOcrLoading] = useState(false);
  const [addDocumentType, setAddDocumentType] = useState<DocumentType>('passport');
  const openedEditIdRef = useRef<string | null>(null);
  const selectedTripId = activeTripId ?? data.trips[0]?.id ?? null;
  const bundle = getTripBundle(data, selectedTripId);
  const selectedDocument = bundle.documents.find((item) => item.id === selectedId) ?? null;
  const selectedTraveller = selectedDocument
    ? bundle.travellers.find((item) => item.id === selectedDocument.travellerId) ?? null
    : null;
  const isVaultUnlocked = !!vaultUnlockedUntil && vaultUnlockedUntil > Date.now();
  const expiryWarnings = getDocumentExpiryWarnings(bundle.documents, bundle.travellers);
  const setupState = getDocumentVaultSetupState({
    documents: bundle.documents,
    travellers: bundle.travellers,
    security,
  });
  const primaryTraveller = bundle.travellers[0] ?? null;

  useEffect(() => {
    if (!params.editDocumentId || openedEditIdRef.current === params.editDocumentId) {
      return;
    }

    const document = data.documents.find((item) => item.id === params.editDocumentId);
    if (!document) {
      return;
    }

    openedEditIdRef.current = params.editDocumentId;
    if (document.tripId !== selectedTripId) {
      setActiveTrip(document.tripId);
    }
    const traveller = data.travellers.find((item) => item.id === document.travellerId) ?? null;
    setDraft(
      ensurePaymentCardDraftData(
        ensureFormalDocumentDraftData(
          ensureHealthCardDraftData(ensureDrivingLicenceDraftData(ensurePassportDraftData(document, traveller), traveller), traveller),
          traveller
        ),
        traveller
      )
    );
    setEditorVisible(true);
  }, [data.documents, params.editDocumentId, selectedTripId, setActiveTrip]);

  useEffect(() => {
    if (!detailVisible) {
      setPassportOpen(false);
      setDrivingLicenceOpen(false);
      setHealthCardOpen(false);
      setPaymentCardOpen(false);
      setFormalDocumentOpen(false);
    }
  }, [detailVisible, selectedId]);

  useEffect(() => {
    setPassportOpen(false);
    setDrivingLicenceOpen(false);
    setHealthCardOpen(false);
    setPaymentCardOpen(false);
    setFormalDocumentOpen(false);
  }, [selectedId]);

  function withSpecializedDocumentData(source: DocumentDraft) {
    const traveller = bundle.travellers.find((item) => item.id === source.travellerId) ?? null;
    return ensurePaymentCardDraftData(
      ensureFormalDocumentDraftData(
        ensureHealthCardDraftData(ensureDrivingLicenceDraftData(ensurePassportDraftData(source, traveller), traveller), traveller),
        traveller
      ),
      traveller
    );
  }

  function openScanViewer(viewer: ScanViewerState) {
    setScanViewer(viewer);
  }

  function openPrimarySource(document: {
    localFileUri: string;
    previewUri: string | null;
    mimeType: string | null;
    documentType: DocumentType;
  }) {
    openScanViewer({
      title: isDocumentPdfSource(document.mimeType, document.localFileUri)
        ? `${documentLabels[document.documentType]} PDF`
        : `${documentLabels[document.documentType]} scan`,
      localFileUri: document.localFileUri,
      previewUri: document.previewUri,
      mimeType: document.mimeType,
    });
  }

  function openSecondarySource(document: {
    secondaryLocalFileUri?: string | null;
    secondaryPreviewUri?: string | null;
    secondaryMimeType?: string | null;
  }) {
    openScanViewer({
      title: isDocumentPdfSource(document.secondaryMimeType, document.secondaryLocalFileUri) ? 'Back PDF' : 'Back scan',
      localFileUri: document.secondaryLocalFileUri ?? null,
      previewUri: document.secondaryPreviewUri ?? null,
      mimeType: document.secondaryMimeType ?? null,
      emptyText: 'No back scan attached yet.',
    });
  }

  function openExtractedFieldEditor(sourceDocument: DocumentDraft) {
    setDraft(withSpecializedDocumentData(sourceDocument));
    setDetailVisible(false);
    setEditorVisible(true);
  }

  function getDocumentDetailTitle(document: (typeof selectedDocument)) {
    if (!document) {
      return 'Document detail';
    }
    if (document.documentType === 'passport') return 'Passport detail';
    if (document.documentType === 'driving_licence') return 'Driving licence detail';
    if (document.documentType === 'ghic') return 'Health card detail';
    if (document.documentType === 'payment_card') return 'Payment card detail';
    if (isFormalDocumentType(document.documentType)) return 'Formal document detail';
    return 'Document detail';
  }

  function buildStarterDocumentDraft(documentType: DocumentType, partial?: { localFileUri?: string; previewUri?: string | null; mimeType?: string | null }) {
    if (!selectedTripId) {
      return null;
    }

    return withSpecializedDocumentData({
      ...buildDocumentDraftDefaults({
        tripId: selectedTripId,
        localFileUri: partial?.localFileUri ?? '',
        previewUri: partial?.previewUri ?? null,
        mimeType: partial?.mimeType ?? null,
      }),
      documentType,
      travellerId: primaryTraveller?.id ?? null,
      holderName: primaryTraveller?.fullName ?? '',
      expiryReminderSchedule: data.appPreferences.expiryReminderSchedule,
    });
  }

  const filteredDocuments = useMemo(() => {
    return bundle.documents.filter((document) => {
      if (primaryFilter === 'traveller' && travellerFilter !== 'all') {
        return travellerFilter === 'trip' ? document.travellerId === null : document.travellerId === travellerFilter;
      }
      if (primaryFilter === 'type' && typeFilter !== 'all') {
        return document.documentType === typeFilter;
      }
      return true;
    });
  }, [bundle.documents, primaryFilter, travellerFilter, typeFilter]);

  const addDocumentTypeOptions: Array<{ label: string; value: DocumentType }> = useMemo(
    () => [
      { label: 'Passport', value: 'passport' },
      { label: 'Driving licence', value: 'driving_licence' },
      { label: 'GHIC / EHIC', value: 'ghic' },
      { label: 'Insurance', value: 'insurance' },
      { label: 'Boarding pass', value: 'boarding_pass' },
      { label: 'Other', value: 'custom' },
    ],
    []
  );

  const groupedDocuments = useMemo(() => {
    if (groupMode === 'flat') {
      return [{ title: 'All documents', documents: filteredDocuments }];
    }

    if (groupMode === 'traveller') {
      return [
        {
          title: 'Trip-wide',
          documents: filteredDocuments.filter((document) => !document.travellerId),
        },
        ...bundle.travellers.map((traveller) => ({
          title: traveller.fullName,
          documents: filteredDocuments.filter((document) => document.travellerId === traveller.id),
        })),
      ].filter((group) => group.documents.length);
    }

    return Object.entries(documentLabels)
      .map(([type, label]) => ({
        title: label,
        documents: filteredDocuments.filter((document) => document.documentType === type),
      }))
      .filter((group) => group.documents.length);
  }, [bundle.travellers, filteredDocuments, groupMode]);

  if (!data.trips.length) {
    return (
      <AppScreen title="Vault">
        <AppCard>
          <EmptyState
            title="Vault is ready when you are"
            description="Create a trip first, then add passports, GHIC cards, boarding passes, insurance docs, and PDFs."
          />
        </AppCard>
      </AppScreen>
    );
  }

  async function pickManagedDocumentAsset(source: DocumentAssetSource) {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            'Camera permission needed',
            'Allow camera access if you want Pineapple to scan a document and extract details right away.'
          );
          return null;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
        if (result.canceled || !result.assets[0]) return null;
        const asset = result.assets[0];
        const localFileUri = await copyIntoAppStorage(asset.uri, 'vault', asset.mimeType, { encryptAtRest: true });
        await cleanupImportedSource(asset.uri);
        return {
          localFileUri,
          previewUri: localFileUri,
          mimeType: asset.mimeType ?? null,
        };
      }

      if (source === 'files') {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'],
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets[0]) return null;
        const asset = result.assets[0];
        const localFileUri = await copyIntoAppStorage(asset.uri, 'vault', asset.mimeType, { encryptAtRest: true });
        await cleanupImportedSource(asset.uri);
        return {
          localFileUri,
          previewUri: asset.mimeType?.startsWith('image') ? localFileUri : null,
          mimeType: asset.mimeType ?? null,
        };
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photos permission needed',
          'Allow photo library access if you want Pineapple to import document images from your device.'
        );
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return null;
      const asset = result.assets[0];
      const localFileUri = await copyIntoAppStorage(asset.uri, 'vault', asset.mimeType, { encryptAtRest: true });
      await cleanupImportedSource(asset.uri);
      return {
        localFileUri,
        previewUri: localFileUri,
        mimeType: asset.mimeType ?? null,
      };
    } catch {
      Alert.alert(
        source === 'files' ? 'Import unavailable' : source === 'camera' ? 'Scan unavailable' : 'Photo import unavailable',
        source === 'files'
          ? 'Pineapple could not import that file. Try another PDF or image saved on this device.'
          : source === 'camera'
            ? 'Pineapple could not capture that scan right now. Try again or use an existing photo.'
            : 'Pineapple could not import that image right now. Try a different photo.'
      );
      return null;
    }
  }

  async function handleSourcePick(source: DocumentAssetSource, documentType: DocumentType = 'custom') {
    if (!selectedTripId) return;
    const asset = await pickManagedDocumentAsset(source);
    if (!asset) {
      return;
    }

    const nextDraft = buildStarterDocumentDraft(documentType, asset);
    if (!nextDraft) {
      return;
    }
    setDraft(nextDraft);
    setEditorVisible(true);
  }

  async function runInitialOcrIfAvailable(nextDraft: DocumentDraft) {
    if (nextDraft.documentType === 'passport') {
      await runPassportOcrOnDraft(nextDraft);
      return;
    }
    if (nextDraft.documentType === 'driving_licence') {
      await runDrivingLicenceOcrOnDraft(nextDraft);
      return;
    }
    if (nextDraft.documentType === 'ghic') {
      await runHealthCardOcrOnDraft(nextDraft);
      return;
    }
    if (isFormalDocumentType(nextDraft.documentType)) {
      await runFormalDocumentOcrOnDraft(nextDraft);
    }
  }

  async function startDocumentFlow(action: 'scan' | 'ocr_import' | 'manual', documentType: DocumentType) {
    if (action === 'manual') {
      openManualDocument(documentType);
      return;
    }

    if (action === 'scan') {
      const asset = await pickManagedDocumentAsset('camera');
      if (!asset) {
        return;
      }
      const nextDraft = buildStarterDocumentDraft(documentType, asset);
      if (!nextDraft) {
        return;
      }
      setDraft(nextDraft);
      setEditorVisible(true);
      await runInitialOcrIfAvailable(nextDraft);
      return;
    }

    Alert.alert('Choose import source', 'Use an existing image, photo, or PDF file for OCR.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Photos',
        onPress: async () => {
          const asset = await pickManagedDocumentAsset('photos');
          if (!asset) {
            return;
          }
          const nextDraft = buildStarterDocumentDraft(documentType, asset);
          if (!nextDraft) {
            return;
          }
          setDraft(nextDraft);
          setEditorVisible(true);
          await runInitialOcrIfAvailable(nextDraft);
        },
      },
      {
        text: 'Files / PDFs',
        onPress: async () => {
          const asset = await pickManagedDocumentAsset('files');
          if (!asset) {
            return;
          }
          const nextDraft = buildStarterDocumentDraft(documentType, asset);
          if (!nextDraft) {
            return;
          }
          setDraft(nextDraft);
          setEditorVisible(true);
          await runInitialOcrIfAvailable(nextDraft);
        },
      },
    ]);
  }

  async function handleDraftScanPick(side: DocumentScanSide, source: DocumentAssetSource) {
    if (!draft) {
      return;
    }

    const asset = await pickManagedDocumentAsset(source);
    if (!asset) {
      return;
    }

    setDraft((current) => {
      if (!current) {
        return current;
      }

      return side === 'front'
        ? { ...current, localFileUri: asset.localFileUri, previewUri: asset.previewUri, mimeType: asset.mimeType }
        : {
            ...current,
            secondaryLocalFileUri: asset.localFileUri,
            secondaryPreviewUri: asset.previewUri,
            secondaryMimeType: asset.mimeType,
          };
    });
  }

  function openManualDocument(documentType: DocumentType = 'custom') {
    const nextDraft = buildStarterDocumentDraft(documentType);
    if (!nextDraft) return;
    setDraft(nextDraft);
    setEditorVisible(true);
  }

  async function confirmDuplicateSave() {
    return new Promise<boolean>((resolve) => {
      Alert.alert(
        'Possible duplicate document',
        'Pineapple found another document with the same type and matching holder or file details. Save this anyway?',
        [
          { text: 'Go back', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Save anyway', style: 'default', onPress: () => resolve(true) },
        ]
      );
    });
  }

  async function handleSave() {
    if (!draft) return;
    const errors = validateDocument(draft);
    if (errors.length) {
      Alert.alert('Document needs attention', errors.join('\n'));
      return;
    }
    if (documentTypeNeedsExpiryPrompt(draft.documentType) && !draft.expiryDate) {
      Alert.alert(
        'Add expiry date?',
        `${documentLabels[draft.documentType]} usually needs an expiry date so Pineapple can warn you before travel.`,
        [
          { text: 'Go back', style: 'cancel' },
          {
            text: 'Save without expiry',
            style: 'default',
            onPress: async () => {
              await saveDocument(draft);
              setEditorVisible(false);
              if (params.editDocumentId) {
                router.setParams({ editDocumentId: undefined });
              }
            },
          },
        ]
      );
      return;
    }

    const duplicate = findPotentialDocumentDuplicate(bundle.documents, draft);
    if (duplicate) {
      const shouldContinue = await confirmDuplicateSave();
      if (!shouldContinue) {
        return;
      }
    }

    await saveDocument(draft);
    setEditorVisible(false);
    if (params.editDocumentId) {
      router.setParams({ editDocumentId: undefined });
    }
  }

  async function handleVaultUnlock() {
    const valid = await confirmPin(pin);
    if (!valid) {
      Alert.alert('Incorrect PIN', 'Try again.');
      setPin('');
      return;
    }
    unlockVault();
    setPinPromptVisible(false);
    setPin('');
  }

  function confirmDeleteDocument(documentId: string) {
    Alert.alert('Delete document?', 'This removes the local file reference and reminder settings for this document.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteRecord('documents', documentId),
      },
    ]);
  }

  async function handleSaveSetupTraveller() {
    if (!selectedTripId) {
      return;
    }

    const fullName = setupTravellerName.trim();
    if (!fullName) {
      Alert.alert('Name needed', 'Add your name first so Pineapple can link your documents to the right traveller profile.');
      return;
    }

    try {
      setSavingSetupTraveller(true);
      await saveTraveller({
        tripId: selectedTripId,
        fullName,
        dateOfBirth: null,
        passportNationality: '',
        passportNumber: '',
        ghicNumber: '',
        medicalNote: '',
        notes: '',
        avatarColor: travellerAvatarColors[0],
        relationshipType: 'adult',
      });
      setSetupTravellerName('');
      Alert.alert('Name saved', 'You can now add documents with your traveller profile preselected.');
    } finally {
      setSavingSetupTraveller(false);
    }
  }

  async function runPassportOcrOnDraft(sourceDraft: DocumentDraft, options?: { openEditor?: boolean }) {
    const openEditor = options?.openEditor ?? false;
    if (!hasPassportImageForOcr(sourceDraft)) {
      Alert.alert(
        'Image scan needed',
        sourceDraft.localFileUri
          ? 'Passport OCR can read local image scans and PDFs in the Android build.'
          : 'Attach a passport image or PDF first, then Pineapple can extract the MRZ and fill the passport fields for review.'
      );
      return;
    }

    try {
      setPassportOcrLoading(true);
      const extracted = await recognizePassportScan(sourceDraft.localFileUri, sourceDraft.mimeType);
      const merged = applyPassportOcrToDraft(sourceDraft, extracted);
      setDraft((current) => {
        if (current?.id && sourceDraft.id && current.id !== sourceDraft.id) {
          return current;
        }
        return merged;
      });

      if (openEditor) {
        setDetailVisible(false);
        setEditorVisible(true);
      }

      Alert.alert(
        'Passport fields extracted',
        [
          extracted.source === 'mrz'
            ? 'Pineapple read the passport MRZ and filled the passport fields.'
            : 'Pineapple filled the passport fields from the scan text.',
          extracted.warnings.length ? `Review notes:\n- ${extracted.warnings.join('\n- ')}` : 'Review them before saving.',
        ].join('\n\n')
      );
    } catch (error) {
      Alert.alert(
        'Passport OCR unavailable',
        toUserMessage(
          error,
          'Pineapple could not read that passport scan right now. You can still enter the passport fields manually.'
        )
      );
    } finally {
      setPassportOcrLoading(false);
    }
  }

  async function handleDraftPassportOcr() {
    if (!draft) {
      return;
    }

    await runPassportOcrOnDraft(draft);
  }

  async function handleSelectedPassportOcr() {
    if (!selectedDocument) {
      return;
    }

    const editableDraft = withSpecializedDocumentData(selectedDocument);
    setDraft(editableDraft);
    await runPassportOcrOnDraft(editableDraft, { openEditor: true });
  }

  async function runDrivingLicenceOcrOnDraft(sourceDraft: DocumentDraft, options?: { openEditor?: boolean }) {
    const openEditor = options?.openEditor ?? false;
    if (!canRunDrivingLicenceOcr(sourceDraft)) {
      Alert.alert(
        'Scan needed',
        sourceDraft.localFileUri
          ? 'Driving licence OCR can read the front image or PDF in the Android build.'
          : 'Attach the front driving licence scan first, then Pineapple can extract the holder record for review.'
      );
      return;
    }

    try {
      setDrivingLicenceOcrLoading(true);
      const extracted = await recognizeDrivingLicenceScan(sourceDraft.localFileUri, sourceDraft.mimeType);
      const merged = applyDrivingLicenceOcrToDraft(sourceDraft, extracted);
      setDraft((current) => {
        if (current?.id && sourceDraft.id && current.id !== sourceDraft.id) {
          return current;
        }
        return merged;
      });

      if (openEditor) {
        setDetailVisible(false);
        setEditorVisible(true);
      }

      Alert.alert(
        'Licence fields extracted',
        [
          'Pineapple filled the driving licence fields from the front scan.',
          extracted.warnings.length ? `Review notes:\n- ${extracted.warnings.join('\n- ')}` : 'Review them before saving.',
        ].join('\n\n')
      );
    } catch (error) {
      Alert.alert(
        'Driving licence OCR unavailable',
        toUserMessage(
          error,
          'Pineapple could not read that driving licence scan right now. You can still enter the licence fields manually.'
        )
      );
    } finally {
      setDrivingLicenceOcrLoading(false);
    }
  }

  async function handleDraftDrivingLicenceOcr() {
    if (!draft) {
      return;
    }

    await runDrivingLicenceOcrOnDraft(draft);
  }

  async function handleSelectedDrivingLicenceOcr() {
    if (!selectedDocument) {
      return;
    }

    const editableDraft = withSpecializedDocumentData(selectedDocument);
    setDraft(editableDraft);
    await runDrivingLicenceOcrOnDraft(editableDraft, { openEditor: true });
  }

  async function runHealthCardOcrOnDraft(sourceDraft: DocumentDraft, options?: { openEditor?: boolean }) {
    const openEditor = options?.openEditor ?? false;
    if (!canRunHealthCardOcr(sourceDraft)) {
      Alert.alert(
        'Scan needed',
        sourceDraft.localFileUri
          ? 'Health-card OCR can read local image scans and PDFs in the Android build.'
          : 'Attach a GHIC or EHIC scan first, then Pineapple can extract the card fields for review.'
      );
      return;
    }

    try {
      setHealthCardOcrLoading(true);
      const extracted = await recognizeHealthCardScan(sourceDraft.localFileUri, sourceDraft.mimeType);
      const merged = applyHealthCardOcrToDraft(sourceDraft, extracted);
      setDraft((current) => {
        if (current?.id && sourceDraft.id && current.id !== sourceDraft.id) {
          return current;
        }
        return merged;
      });

      if (openEditor) {
        setDetailVisible(false);
        setEditorVisible(true);
      }

      Alert.alert(
        'Health-card fields extracted',
        [
          'Pineapple filled the health-card fields from the scan.',
          extracted.warnings.length ? `Review notes:\n- ${extracted.warnings.join('\n- ')}` : 'Review them before saving.',
        ].join('\n\n')
      );
    } catch (error) {
      Alert.alert(
        'Health-card OCR unavailable',
        toUserMessage(
          error,
          'Pineapple could not read that health-card scan right now. You can still enter the card fields manually.'
        )
      );
    } finally {
      setHealthCardOcrLoading(false);
    }
  }

  async function handleDraftHealthCardOcr() {
    if (!draft) {
      return;
    }

    await runHealthCardOcrOnDraft(draft);
  }

  async function handleSelectedHealthCardOcr() {
    if (!selectedDocument) {
      return;
    }

    const editableDraft = withSpecializedDocumentData(selectedDocument);
    setDraft(editableDraft);
    await runHealthCardOcrOnDraft(editableDraft, { openEditor: true });
  }

  async function runFormalDocumentOcrOnDraft(sourceDraft: DocumentDraft, options?: { openEditor?: boolean }) {
    const openEditor = options?.openEditor ?? false;
    if (!canRunFormalDocumentOcr(sourceDraft)) {
      Alert.alert(
        'Scan needed',
        sourceDraft.localFileUri
          ? 'Formal-document OCR can read local image scans and PDFs in the Android build.'
          : 'Attach a scan or PDF first, then Pineapple can extract document metadata for review.'
      );
      return;
    }

    try {
      setFormalDocumentOcrLoading(true);
      const extracted = await recognizeFormalDocumentScan(sourceDraft.localFileUri, sourceDraft.mimeType);
      const merged = applyFormalDocumentOcrToDraft(sourceDraft, extracted);
      setDraft((current) => {
        if (current?.id && sourceDraft.id && current.id !== sourceDraft.id) {
          return current;
        }
        return merged;
      });

      if (openEditor) {
        setDetailVisible(false);
        setEditorVisible(true);
      }

      Alert.alert(
        'Document fields extracted',
        [
          'Pineapple filled the formal-document fields from the scan.',
          extracted.warnings.length ? `Review notes:\n- ${extracted.warnings.join('\n- ')}` : 'Review them before saving.',
        ].join('\n\n')
      );
    } catch (error) {
      Alert.alert(
        'Formal-document OCR unavailable',
        toUserMessage(
          error,
          'Pineapple could not read that document right now. You can still enter the document fields manually.'
        )
      );
    } finally {
      setFormalDocumentOcrLoading(false);
    }
  }

  async function handleDraftFormalDocumentOcr() {
    if (!draft) {
      return;
    }

    await runFormalDocumentOcrOnDraft(draft);
  }

  async function handleSelectedFormalDocumentOcr() {
    if (!selectedDocument) {
      return;
    }

    const editableDraft = withSpecializedDocumentData(selectedDocument);
    setDraft(editableDraft);
    await runFormalDocumentOcrOnDraft(editableDraft, { openEditor: true });
  }

  return (
    <AppScreen title="Vault" subtitle="Traveller-specific documents, grouped views, and clear expiry warnings.">
      <TripPicker trips={data.trips} value={selectedTripId} onChange={setActiveTrip} />

      {!!expiryWarnings.length ? (
        <AppCard title="Expiry warnings" subtitle="Check these before you travel.">
          <View style={styles.warningList}>
            {expiryWarnings.map((document) => (
              <InfoChip
                key={document.document.id}
                label={`${document.ownerLabel} • ${document.info.relativeLabel}`}
                tone={document.info.tone}
              />
            ))}
          </View>
        </AppCard>
      ) : null}

      <AppCard title="Vault controls">
        <DocumentAddActionsCard
          title="Add a document"
          description="Use OCR first for passports, licences, cards, passes, and similar travel records."
          selectedType={addDocumentType}
          onTypeChange={setAddDocumentType}
          typeOptions={addDocumentTypeOptions}
          onScan={() => startDocumentFlow('scan', addDocumentType)}
          onImportForOcr={() => startDocumentFlow('ocr_import', addDocumentType)}
          onManual={() => startDocumentFlow('manual', addDocumentType)}
        />
        <AppButton
          label={isVaultUnlocked ? 'Vault unlocked' : 'Unlock previews'}
          onPress={() => setPinPromptVisible(true)}
          tone={isVaultUnlocked ? 'ghost' : 'secondary'}
        />
      </AppCard>

      {setupState.isFirstTime ? (
        <DocumentVaultEmptyState
          travellerName={setupTravellerName}
          onTravellerNameChange={setSetupTravellerName}
          onSaveTravellerName={handleSaveSetupTraveller}
          savingTraveller={savingSetupTraveller}
          showTravellerPrompt={setupState.needsTravellerName}
          pinConfigured={security.pinConfigured}
          onOpenSecurity={() => router.push('/setup-pin')}
          selectedIdentityType={addDocumentType === 'driving_licence' ? 'driving_licence' : 'passport'}
          onIdentityTypeChange={(value) => setAddDocumentType(value)}
          onScanIdentity={() => startDocumentFlow('scan', addDocumentType === 'driving_licence' ? 'driving_licence' : 'passport')}
          onImportIdentityForOcr={() => startDocumentFlow('ocr_import', addDocumentType === 'driving_licence' ? 'driving_licence' : 'passport')}
          onEnterIdentityManually={() => startDocumentFlow('manual', addDocumentType === 'driving_licence' ? 'driving_licence' : 'passport')}
          onAddHealthCard={() => openManualDocument('ghic')}
          onAddInsurance={() => openManualDocument('insurance')}
          onAddOther={() => openManualDocument('custom')}
        />
      ) : (
        <>
          <AppCard title="Filters">
            <ChoiceChips<PrimaryFilter>
              value={primaryFilter}
              onChange={setPrimaryFilter}
              options={[
                { label: 'All', value: 'all' },
                { label: 'Traveller', value: 'traveller' },
                { label: 'Document type', value: 'type' },
              ]}
            />
            {primaryFilter === 'traveller' ? (
              <ChoiceChips<string>
                value={travellerFilter}
                onChange={setTravellerFilter}
                options={[
                  { label: 'All travellers', value: 'all' },
                  { label: 'Trip-wide', value: 'trip' },
                  ...bundle.travellers.map((traveller) => ({ label: traveller.fullName, value: traveller.id })),
                ]}
              />
            ) : null}
            {primaryFilter === 'type' ? (
              <ChoiceChips<string>
                value={typeFilter}
                onChange={(value) => setTypeFilter(value as DocumentType | 'all')}
                options={[
                  { label: 'All types', value: 'all' },
                  ...Object.entries(documentLabels).map(([value, label]) => ({ value, label })),
                ]}
              />
            ) : null}
            <Text style={styles.label}>Grouped view</Text>
            <ChoiceChips<GroupMode>
              value={groupMode}
              onChange={setGroupMode}
              options={[
                { label: 'Flat', value: 'flat' },
                { label: 'By traveller', value: 'traveller' },
                { label: 'By type', value: 'type' },
              ]}
            />
          </AppCard>

          {groupedDocuments.length ? (
        groupedDocuments.map((group) => (
          <AppCard key={group.title} title={group.title}>
            {group.documents.map((document) => {
              const traveller = bundle.travellers.find((item) => item.id === document.travellerId);
              const previewUnlocked = isVaultUnlocked || !document.sensitive;
              const numberLabel = previewUnlocked ? document.documentNumber || 'No number saved' : maskSensitive(document.documentNumber);
              const expiryInfo = getDocumentExpiryInfo(document.documentType, document.expiryDate);

              if (document.documentType === 'passport') {
                return (
                  <View key={document.id} style={styles.passportRow}>
                    <PassportDocument
                      document={document}
                      traveller={traveller}
                      onPress={() => {
                        setSelectedId(document.id);
                        setPassportOpen(false);
                        setDetailVisible(true);
                      }}
                      compact
                    />
                    <View style={styles.passportMeta}>
                      <View style={styles.titleRow}>
                        <Text style={styles.title}>Passport</Text>
                        <VerificationBadge status={getPassportVerificationStatus(document, traveller)} />
                      </View>
                      <Text style={styles.meta}>{document.holderName || traveller?.fullName || 'Trip-wide document'}</Text>
                      <Text style={styles.meta}>
                        {document.expiryDate ? `${formatShortDate(document.expiryDate)} • ${expiryInfo.relativeLabel}` : 'Add expiry date to enable warnings'}
                      </Text>
                      <Text style={styles.meta}>{numberLabel}</Text>
                      {!document.localFileUri ? <Text style={styles.meta}>Metadata only • No local file attached</Text> : null}
                    </View>
                    <View style={styles.iconColumn}>
                      <Pressable
                        onPress={() => {
                          setDraft(withSpecializedDocumentData(document));
                          setEditorVisible(true);
                        }}
                        style={styles.iconButton}
                      >
                        <MaterialIcons name="edit" size={18} color={colors.nightNavy} />
                      </Pressable>
                      <Pressable onPress={() => confirmDeleteDocument(document.id)} style={styles.iconButton}>
                        <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                );
              }

              if (document.documentType === 'driving_licence') {
                return (
                  <View key={document.id} style={styles.passportRow}>
                    <DrivingLicenceDocument
                      document={document}
                      traveller={traveller}
                      onPress={() => {
                        setSelectedId(document.id);
                        setDrivingLicenceOpen(false);
                        setDetailVisible(true);
                      }}
                      compact
                    />
                    <View style={styles.passportMeta}>
                      <View style={styles.titleRow}>
                        <Text style={styles.title}>Driving licence</Text>
                        <VerificationBadge status={getDrivingLicenceVerificationStatus(document, traveller)} />
                      </View>
                      <Text style={styles.meta}>{document.holderName || traveller?.fullName || 'Trip-wide document'}</Text>
                      <Text style={styles.meta}>
                        {document.expiryDate ? `${formatShortDate(document.expiryDate)} • ${expiryInfo.relativeLabel}` : 'Add expiry date to enable warnings'}
                      </Text>
                      <Text style={styles.meta}>{numberLabel}</Text>
                      <Text style={styles.meta}>
                        {document.secondaryLocalFileUri ? 'Front and back scans saved' : document.localFileUri ? 'Front scan only' : 'Metadata only • No scans attached'}
                      </Text>
                    </View>
                    <View style={styles.iconColumn}>
                      <Pressable
                        onPress={() => {
                          setDraft(withSpecializedDocumentData(document));
                          setEditorVisible(true);
                        }}
                        style={styles.iconButton}
                      >
                        <MaterialIcons name="edit" size={18} color={colors.nightNavy} />
                      </Pressable>
                      <Pressable onPress={() => confirmDeleteDocument(document.id)} style={styles.iconButton}>
                        <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                );
              }

              if (document.documentType === 'ghic') {
                return (
                  <View key={document.id} style={styles.passportRow}>
                    <HealthCardDocument
                      document={document}
                      traveller={traveller}
                      onPress={() => {
                        setSelectedId(document.id);
                        setHealthCardOpen(false);
                        setDetailVisible(true);
                      }}
                      compact
                    />
                    <View style={styles.passportMeta}>
                      <View style={styles.titleRow}>
                        <Text style={styles.title}>GHIC / EHIC</Text>
                        <VerificationBadge status={getHealthCardVerificationStatus(document, traveller)} />
                      </View>
                      <Text style={styles.meta}>{document.holderName || traveller?.fullName || 'Trip-wide document'}</Text>
                      <Text style={styles.meta}>
                        {document.expiryDate ? `${formatShortDate(document.expiryDate)} • ${expiryInfo.relativeLabel}` : 'Add expiry date to enable warnings'}
                      </Text>
                      <Text style={styles.meta}>{numberLabel}</Text>
                      {!document.localFileUri ? <Text style={styles.meta}>Metadata only • No local file attached</Text> : null}
                    </View>
                    <View style={styles.iconColumn}>
                      <Pressable
                        onPress={() => {
                          setDraft(withSpecializedDocumentData(document));
                          setEditorVisible(true);
                        }}
                        style={styles.iconButton}
                      >
                        <MaterialIcons name="edit" size={18} color={colors.nightNavy} />
                      </Pressable>
                      <Pressable onPress={() => confirmDeleteDocument(document.id)} style={styles.iconButton}>
                        <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                );
              }

              if (document.documentType === 'payment_card') {
                return (
                  <View key={document.id} style={styles.passportRow}>
                    <PaymentCardDocument
                      document={document}
                      traveller={traveller}
                      onPress={() => {
                        setSelectedId(document.id);
                        setPaymentCardOpen(false);
                        setDetailVisible(true);
                      }}
                      compact
                    />
                    <View style={styles.passportMeta}>
                      <View style={styles.titleRow}>
                        <Text style={styles.title}>Payment card</Text>
                        <VerificationBadge status={getPaymentCardVerificationStatus(document)} />
                      </View>
                      <Text style={styles.meta}>{document.holderName || traveller?.fullName || 'Trip-wide document'}</Text>
                      <Text style={styles.meta}>
                        {document.expiryDate ? `${formatShortDate(document.expiryDate)} • ${expiryInfo.relativeLabel}` : 'Add expiry date to enable warnings'}
                      </Text>
                      <Text style={styles.meta}>{maskPaymentCardNumber(document.documentNumber)}</Text>
                      {!document.localFileUri ? <Text style={styles.meta}>Metadata only • No local file attached</Text> : null}
                    </View>
                    <View style={styles.iconColumn}>
                      <Pressable
                        onPress={() => {
                          setDraft(withSpecializedDocumentData(document));
                          setEditorVisible(true);
                        }}
                        style={styles.iconButton}
                      >
                        <MaterialIcons name="edit" size={18} color={colors.nightNavy} />
                      </Pressable>
                      <Pressable onPress={() => confirmDeleteDocument(document.id)} style={styles.iconButton}>
                        <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                );
              }

              if (isFormalDocumentType(document.documentType)) {
                return (
                  <View key={document.id} style={styles.passportRow}>
                    <FormalDocumentRecord
                      document={document}
                      traveller={traveller}
                      onPress={() => {
                        setSelectedId(document.id);
                        setFormalDocumentOpen(false);
                        setDetailVisible(true);
                      }}
                      compact
                      onOpenSource={() => openPrimarySource(document)}
                    />
                    <View style={styles.passportMeta}>
                      <View style={styles.titleRow}>
                        <Text style={styles.title}>{documentLabels[document.documentType]}</Text>
                        <VerificationBadge status={getFormalDocumentVerificationStatus(document)} />
                      </View>
                      <Text style={styles.meta}>{document.holderName || traveller?.fullName || 'Trip-wide document'}</Text>
                      <Text style={styles.meta}>
                        {document.expiryDate ? `${formatShortDate(document.expiryDate)} • ${expiryInfo.relativeLabel}` : expiryInfo.needsExpiryPrompt ? 'Add expiry date to enable warnings' : 'No expiry date saved'}
                      </Text>
                      <Text style={styles.meta}>{numberLabel}</Text>
                      {!document.localFileUri ? <Text style={styles.meta}>Metadata only • No local file attached</Text> : null}
                    </View>
                    <View style={styles.iconColumn}>
                      <Pressable
                        onPress={() => {
                          setDraft(withSpecializedDocumentData(document));
                          setEditorVisible(true);
                        }}
                        style={styles.iconButton}
                      >
                        <MaterialIcons name="edit" size={18} color={colors.nightNavy} />
                      </Pressable>
                      <Pressable onPress={() => confirmDeleteDocument(document.id)} style={styles.iconButton}>
                        <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                );
              }

              return (
                <Pressable
                  key={document.id}
                  onPress={() => {
                    setSelectedId(document.id);
                    setDetailVisible(true);
                  }}
                  style={styles.documentRow}
                >
                  {previewUnlocked && document.previewUri ? (
                    <View style={styles.thumbnail}>
                      <ManagedFileImage uri={document.previewUri} mimeType={document.mimeType} style={styles.thumbnail} contentFit="cover" />
                    </View>
                  ) : (
                    <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                      <MaterialIcons name="lock" size={22} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.copy}>
                    <View style={styles.titleRow}>
                      <Text style={styles.title}>{documentLabels[document.documentType]}</Text>
                      {(document.expiryDate || expiryInfo.needsExpiryPrompt) ? (
                        <InfoChip
                          label={document.expiryDate ? expiryInfo.badgeLabel : 'Add expiry date'}
                          tone={expiryInfo.tone}
                        />
                      ) : null}
                    </View>
                    <View style={styles.inlineRow}>
                      {traveller ? <AvatarBadge label={traveller.fullName} color={traveller.avatarColor} size={26} /> : null}
                      <Text style={styles.meta}>{document.holderName || traveller?.fullName || 'Trip-wide document'}</Text>
                    </View>
                    <Text style={styles.meta}>
                      {document.expiryDate ? `${formatShortDate(document.expiryDate)} • ${expiryInfo.relativeLabel}` : expiryInfo.needsExpiryPrompt ? 'Add expiry date to enable warnings' : 'No expiry date saved'}
                    </Text>
                    <Text style={styles.meta}>{numberLabel}</Text>
                    {!document.localFileUri ? <Text style={styles.meta}>Metadata only • No local file attached</Text> : null}
                  </View>
                  <View style={styles.iconColumn}>
                    <Pressable
                      onPress={() => {
                        setDraft(withSpecializedDocumentData(document));
                        setEditorVisible(true);
                      }}
                      style={styles.iconButton}
                    >
                      <MaterialIcons name="edit" size={18} color={colors.nightNavy} />
                    </Pressable>
                    <Pressable onPress={() => confirmDeleteDocument(document.id)} style={styles.iconButton}>
                      <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
          </AppCard>
        ))
      ) : (
        <AppCard>
          <EmptyState
            title="No documents match this view"
            description="Try clearing a filter or add another travel document."
          />
        </AppCard>
          )}
        </>
      )}

      <AppModal
        visible={editorVisible}
        title={draft?.id ? 'Edit document' : 'Add document'}
        onClose={() => {
          setEditorVisible(false);
          if (params.editDocumentId) {
            router.setParams({ editDocumentId: undefined });
          }
        }}
      >
        {draft ? (
          <>
            <AppTextField
              label="Holder name"
              value={draft.holderName}
              onChangeText={(value) => setDraft((current) => (current ? { ...current, holderName: value } : current))}
            />
            <View style={styles.field}>
              <Text style={styles.label}>Document type</Text>
              <ChoiceChips<DocumentType>
                value={draft.documentType}
                onChange={(value) =>
                  setDraft((current) => {
                    if (!current) {
                      return current;
                    }

                    return withSpecializedDocumentData({
                      ...current,
                      documentType: value,
                      expiryReminderEnabled: documentTypeSupportsExpiryWarnings(value) ? current.expiryReminderEnabled : false,
                      expiryReminderSchedule: normalizeExpiryReminderSchedule(current.expiryReminderSchedule),
                    });
                  })
                }
                options={Object.entries(documentLabels).map(([value, label]) => ({ value: value as DocumentType, label }))}
              />
              {documentTypeNeedsExpiryPrompt(draft.documentType) ? (
                <Text style={styles.meta}>Strongly recommended: add an expiry date so Pineapple can warn you in time.</Text>
              ) : null}
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Assigned traveller</Text>
              <ChoiceChips<string>
                value={draft.travellerId ?? 'trip'}
                onChange={(value) =>
                  setDraft((current) => {
                    if (!current) {
                      return current;
                    }

                    const traveller = bundle.travellers.find((item) => item.id === (value === 'trip' ? null : value)) ?? null;
                    return ensurePaymentCardDraftData(
                      ensureFormalDocumentDraftData(
                        ensureHealthCardDraftData(
                          ensureDrivingLicenceDraftData(
                            ensurePassportDraftData(
                              {
                                ...current,
                                travellerId: value === 'trip' ? null : value,
                              },
                              traveller
                            ),
                            traveller
                          ),
                          traveller
                        ),
                        traveller
                      ),
                      traveller
                    );
                  })
                }
                options={[
                  { label: 'Whole trip', value: 'trip' },
                  ...bundle.travellers.map((traveller) => ({ label: traveller.fullName, value: traveller.id })),
                ]}
              />
            </View>
            <AppTextField
              label={draft.documentType === 'payment_card' ? 'Card number' : 'Document number'}
              value={draft.documentNumber}
              onChangeText={(value) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        documentNumber: draft.documentType === 'payment_card' ? value.replace(/[^0-9 ]/g, '') : value,
                      }
                    : current
                )
              }
              keyboardType={draft.documentType === 'payment_card' ? 'numeric' : 'default'}
            />
            {draft.documentType === 'passport' && draft.passportData ? (
              <ExtractedFieldEditor
                title="Passport extracted fields"
                verificationStatus={getPassportVerificationStatus(
                  { localFileUri: draft.localFileUri, passportData: draft.passportData },
                  bundle.travellers.find((item) => item.id === draft.travellerId) ?? null
                )}
                actionLabel="Extract from scan"
                onAction={handleDraftPassportOcr}
                actionDisabled={!hasPassportImageForOcr(draft)}
                actionLoading={passportOcrLoading}
                helperText={
                  !hasPassportImageForOcr(draft)
                    ? draft.localFileUri
                      ? 'Passport OCR can read local image scans and PDFs in the Android build.'
                      : 'Attach a passport image or PDF to extract MRZ and identity fields automatically.'
                    : null
                }
              >
                <AppTextField
                  label="Passport type"
                  value={draft.passportData.passportType}
                  onChangeText={(value) =>
                    setDraft((current) =>
                      current?.passportData
                        ? { ...current, passportData: { ...current.passportData, passportType: value.toUpperCase() } }
                        : current
                    )
                  }
                />
                <AppTextField
                  label="Country code"
                  value={draft.passportData.countryCode}
                  onChangeText={(value) =>
                    setDraft((current) =>
                      current?.passportData
                        ? { ...current, passportData: { ...current.passportData, countryCode: value.toUpperCase().slice(0, 3) } }
                        : current
                    )
                  }
                />
                <AppTextField
                  label="Surname"
                  value={draft.passportData.surname}
                  onChangeText={(value) =>
                    setDraft((current) =>
                      current?.passportData ? { ...current, passportData: { ...current.passportData, surname: value } } : current
                    )
                  }
                />
                <AppTextField
                  label="Given names"
                  value={draft.passportData.givenNames}
                  onChangeText={(value) =>
                    setDraft((current) =>
                      current?.passportData ? { ...current, passportData: { ...current.passportData, givenNames: value } } : current
                    )
                  }
                />
                <AppTextField
                  label="Nationality"
                  value={draft.passportData.nationality}
                  onChangeText={(value) =>
                    setDraft((current) =>
                      current?.passportData ? { ...current, passportData: { ...current.passportData, nationality: value } } : current
                    )
                  }
                />
                <DateTimeField
                  label="Date of birth"
                  mode="date"
                  value={draft.passportData.dateOfBirth}
                  onChange={(value) =>
                    setDraft((current) =>
                      current?.passportData
                        ? { ...current, passportData: { ...current.passportData, dateOfBirth: value } }
                        : current
                    )
                  }
                />
                <AppTextField
                  label="Place of birth"
                  value={draft.passportData.placeOfBirth}
                  onChangeText={(value) =>
                    setDraft((current) =>
                      current?.passportData ? { ...current, passportData: { ...current.passportData, placeOfBirth: value } } : current
                    )
                  }
                />
              </ExtractedFieldEditor>
            ) : null}
            {draft.documentType === 'driving_licence' && draft.drivingLicenceData ? (
              <ExtractedFieldEditor
                title="Driving licence record"
                verificationStatus={getDrivingLicenceVerificationStatus(
                  {
                    localFileUri: draft.localFileUri,
                    secondaryLocalFileUri: draft.secondaryLocalFileUri,
                    drivingLicenceData: draft.drivingLicenceData,
                  },
                  bundle.travellers.find((item) => item.id === draft.travellerId) ?? null
                )}
                description="Use the front scan for the photocard and the back scan for categories or endorsements."
                actionLabel="Extract from front scan"
                onAction={handleDraftDrivingLicenceOcr}
                actionDisabled={!canRunDrivingLicenceOcr(draft)}
                actionLoading={drivingLicenceOcrLoading}
                helperText={
                  !canRunDrivingLicenceOcr(draft)
                    ? draft.localFileUri
                      ? 'Driving licence OCR can read the front image or PDF in the Android build.'
                      : 'Attach the front photocard image or PDF to extract holder details automatically.'
                    : null
                }
              >
                <View style={styles.buttonRow}>
                  <AppButton label={draft.localFileUri ? 'Replace front from files' : 'Add front from files'} tone="secondary" onPress={() => handleDraftScanPick('front', 'files')} />
                  <AppButton label={draft.localFileUri ? 'Replace front from photos' : 'Add front from photos'} tone="secondary" onPress={() => handleDraftScanPick('front', 'photos')} />
                </View>
                <View style={styles.buttonRow}>
                  <AppButton
                    label={draft.secondaryLocalFileUri ? 'Replace back from files' : 'Add back from files'}
                    tone="secondary"
                    onPress={() => handleDraftScanPick('back', 'files')}
                  />
                  <AppButton
                    label={draft.secondaryLocalFileUri ? 'Replace back from photos' : 'Add back from photos'}
                    tone="secondary"
                    onPress={() => handleDraftScanPick('back', 'photos')}
                  />
                </View>
                <AppTextField
                  label="Address"
                  value={draft.drivingLicenceData.address}
                  onChangeText={(value) =>
                    setDraft((current) =>
                      current?.drivingLicenceData ? { ...current, drivingLicenceData: { ...current.drivingLicenceData, address: value } } : current
                    )
                  }
                  multiline
                />
                <DateTimeField
                  label="Date of birth"
                  mode="date"
                  value={draft.drivingLicenceData.dateOfBirth}
                  onChange={(value) =>
                    setDraft((current) =>
                      current?.drivingLicenceData ? { ...current, drivingLicenceData: { ...current.drivingLicenceData, dateOfBirth: value } } : current
                    )
                  }
                />
                <AppTextField
                  label="Categories"
                  value={draft.drivingLicenceData.categories}
                  onChangeText={(value) =>
                    setDraft((current) =>
                      current?.drivingLicenceData ? { ...current, drivingLicenceData: { ...current.drivingLicenceData, categories: value } } : current
                    )
                  }
                />
                <AppTextField
                  label="Issuing authority"
                  value={draft.drivingLicenceData.issuingAuthority}
                  onChangeText={(value) =>
                    setDraft((current) =>
                      current?.drivingLicenceData
                        ? { ...current, drivingLicenceData: { ...current.drivingLicenceData, issuingAuthority: value } }
                        : current
                    )
                  }
                />
                <View style={styles.field}>
                  <Text style={styles.label}>Status</Text>
                  <ChoiceChips<string>
                    value={draft.drivingLicenceData.status || 'Valid'}
                    onChange={(value) =>
                      setDraft((current) =>
                        current?.drivingLicenceData ? { ...current, drivingLicenceData: { ...current.drivingLicenceData, status: value } } : current
                      )
                    }
                    options={[
                      { label: 'Valid', value: 'Valid' },
                      { label: 'Provisional', value: 'Provisional' },
                      { label: 'Expired', value: 'Expired' },
                      { label: 'Review', value: 'Needs review' },
                    ]}
                  />
                </View>
              </ExtractedFieldEditor>
            ) : null}
            {draft.documentType === 'ghic' && draft.healthCardData ? (
              <ExtractedFieldEditor
                title="Health card record"
                verificationStatus={getHealthCardVerificationStatus(
                  { localFileUri: draft.localFileUri, healthCardData: draft.healthCardData },
                  bundle.travellers.find((item) => item.id === draft.travellerId) ?? null
                )}
                actionLabel="Extract from scan"
                onAction={handleDraftHealthCardOcr}
                actionDisabled={!canRunHealthCardOcr(draft)}
                actionLoading={healthCardOcrLoading}
                helperText={
                  !canRunHealthCardOcr(draft)
                    ? draft.localFileUri
                      ? 'Health-card OCR can read local image scans and PDFs in the Android build.'
                      : 'Attach a GHIC or EHIC image or PDF to extract card fields automatically.'
                    : null
                }
              >
                <AppTextField
                  label="Issuer"
                  value={draft.healthCardData.issuer}
                  onChangeText={(value) =>
                    setDraft((current) =>
                      current?.healthCardData ? { ...current, healthCardData: { ...current.healthCardData, issuer: value } } : current
                    )
                  }
                />
                <AppTextField
                  label="Country code"
                  value={draft.healthCardData.countryCode}
                  onChangeText={(value) =>
                    setDraft((current) =>
                      current?.healthCardData
                        ? { ...current, healthCardData: { ...current.healthCardData, countryCode: value.toUpperCase().slice(0, 3) } }
                        : current
                    )
                  }
                />
                <AppTextField
                  label="Emergency line"
                  value={draft.healthCardData.emergencyLine}
                  onChangeText={(value) =>
                    setDraft((current) =>
                      current?.healthCardData
                        ? { ...current, healthCardData: { ...current.healthCardData, emergencyLine: value } }
                        : current
                    )
                  }
                />
                <View style={styles.field}>
                  <Text style={styles.label}>Status</Text>
                  <ChoiceChips<string>
                    value={draft.healthCardData.status || 'Active'}
                    onChange={(value) =>
                      setDraft((current) =>
                        current?.healthCardData ? { ...current, healthCardData: { ...current.healthCardData, status: value } } : current
                      )
                    }
                    options={[
                      { label: 'Active', value: 'Active' },
                      { label: 'Pending review', value: 'Pending review' },
                      { label: 'Expired', value: 'Expired' },
                    ]}
                  />
                </View>
              </ExtractedFieldEditor>
            ) : null}
            {isFormalDocumentType(draft.documentType) && draft.formalDocumentData ? (
              <ExtractedFieldEditor
                title="Document record"
                verificationStatus={getFormalDocumentVerificationStatus({
                  localFileUri: draft.localFileUri,
                  mimeType: draft.mimeType,
                  formalDocumentData: draft.formalDocumentData,
                  documentNumber: draft.documentNumber,
                  notes: draft.notes,
                })}
                actionLabel="Extract from scan"
                onAction={handleDraftFormalDocumentOcr}
                actionDisabled={!canRunFormalDocumentOcr(draft)}
                actionLoading={formalDocumentOcrLoading}
                helperText={
                  !canRunFormalDocumentOcr(draft)
                    ? draft.localFileUri
                      ? 'Formal-document OCR can read local image scans and PDFs in the Android build.'
                      : 'Attach a document image or PDF to extract metadata automatically.'
                    : null
                }
              >
                <AppTextField
                  label="Document title"
                  value={draft.formalDocumentData.title}
                  onChangeText={(value) =>
                    setDraft((current) =>
                      current?.formalDocumentData ? { ...current, formalDocumentData: { ...current.formalDocumentData, title: value } } : current
                    )
                  }
                />
                <AppTextField
                  label="Issuer"
                  value={draft.formalDocumentData.issuer}
                  onChangeText={(value) =>
                    setDraft((current) =>
                      current?.formalDocumentData ? { ...current, formalDocumentData: { ...current.formalDocumentData, issuer: value } } : current
                    )
                  }
                />
                <AppTextField
                  label="Reference"
                  value={draft.formalDocumentData.referenceCode}
                  onChangeText={(value) =>
                    setDraft((current) =>
                      current?.formalDocumentData
                        ? {
                            ...current,
                            documentNumber: value,
                            formalDocumentData: { ...current.formalDocumentData, referenceCode: value },
                          }
                        : current
                    )
                  }
                />
                <AppTextField
                  label="Location"
                  value={draft.formalDocumentData.location}
                  onChangeText={(value) =>
                    setDraft((current) =>
                      current?.formalDocumentData ? { ...current, formalDocumentData: { ...current.formalDocumentData, location: value } } : current
                    )
                  }
                />
                <View style={styles.field}>
                  <Text style={styles.label}>Status</Text>
                  <ChoiceChips<string>
                    value={draft.formalDocumentData.status || 'Stored'}
                    onChange={(value) =>
                      setDraft((current) =>
                        current?.formalDocumentData ? { ...current, formalDocumentData: { ...current.formalDocumentData, status: value } } : current
                      )
                    }
                    options={[
                      { label: 'Stored', value: 'Stored' },
                      { label: 'Needs review', value: 'Needs review' },
                      { label: 'Confirmed', value: 'Confirmed' },
                    ]}
                  />
                </View>
                <AppTextField
                  label="Summary"
                  value={draft.formalDocumentData.summary}
                  onChangeText={(value) =>
                    setDraft((current) =>
                      current?.formalDocumentData ? { ...current, formalDocumentData: { ...current.formalDocumentData, summary: value } } : current
                    )
                  }
                  multiline
                />
              </ExtractedFieldEditor>
            ) : null}
            {draft.documentType === 'payment_card' && draft.paymentCardData ? (
              <ExtractedFieldEditor
                title="Payment card record"
                verificationStatus={getPaymentCardVerificationStatus({
                  localFileUri: draft.localFileUri,
                  paymentCardData: draft.paymentCardData,
                  documentNumber: draft.documentNumber,
                })}
                description="Sensitive card values stay masked in the viewer. CVV is stored privately and never shown by default."
              >
                <AppTextField
                  label="Card type"
                  value={draft.paymentCardData.cardType}
                  onChangeText={(value) =>
                    setDraft((current) =>
                      current?.paymentCardData ? { ...current, paymentCardData: { ...current.paymentCardData, cardType: value } } : current
                    )
                  }
                />
                <AppTextField
                  label="Bank"
                  value={draft.paymentCardData.bank}
                  onChangeText={(value) =>
                    setDraft((current) =>
                      current?.paymentCardData ? { ...current, paymentCardData: { ...current.paymentCardData, bank: value } } : current
                    )
                  }
                />
                <AppTextField
                  label="Billing details or travel note"
                  value={draft.paymentCardData.billingDetails}
                  onChangeText={(value) =>
                    setDraft((current) =>
                      current?.paymentCardData ? { ...current, paymentCardData: { ...current.paymentCardData, billingDetails: value } } : current
                    )
                  }
                  multiline
                />
                <AppTextField
                  label="Security code"
                  value={draft.paymentCardData.cvv}
                  onChangeText={(value) =>
                    setDraft((current) =>
                      current?.paymentCardData
                        ? { ...current, paymentCardData: { ...current.paymentCardData, cvv: value.replace(/[^0-9]/g, '').slice(0, 4) } }
                        : current
                    )
                  }
                  keyboardType="numeric"
                  secureTextEntry
                  helper="Stored locally for your own reference. Pineapple never shows it by default in the card view."
                />
              </ExtractedFieldEditor>
            ) : null}
            <DateTimeField
              label="Issue date"
              mode="date"
              value={draft.issueDate}
              onChange={(value) => setDraft((current) => (current ? { ...current, issueDate: value } : current))}
            />
            <DateTimeField
              label="Expiry date"
              mode="date"
              value={draft.expiryDate}
              onChange={(value) => setDraft((current) => (current ? { ...current, expiryDate: value } : current))}
            />
            <View style={styles.field}>
              <Text style={styles.label}>Expiry reminders</Text>
              <ChoiceChips<'on' | 'off'>
                value={draft.expiryReminderEnabled ? 'on' : 'off'}
                onChange={(value) => setDraft((current) => (current ? { ...current, expiryReminderEnabled: value === 'on' } : current))}
                options={[
                  { label: 'On', value: 'on' },
                  { label: 'Off', value: 'off' },
                ]}
              />
              {draft.expiryReminderEnabled ? (
                <MultiSelectChips<ExpiryReminderLeadTime>
                  values={draft.expiryReminderSchedule}
                  onChange={(values) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            expiryReminderSchedule: normalizeExpiryReminderSchedule(values),
                          }
                        : current
                    )
                  }
                  options={scheduleOptions}
                />
              ) : null}
              <Text style={styles.meta}>Reminders stay on this device only and never include document numbers or images.</Text>
            </View>
            <Text style={styles.meta}>
              {draft.documentType === 'driving_licence'
                ? draft.localFileUri || draft.secondaryLocalFileUri
                  ? `This driving licence keeps ${draft.localFileUri ? 'the front' : 'no front'}${draft.secondaryLocalFileUri ? ' and the reverse' : ''} scan locally on the device.`
                  : 'This is a metadata-only driving licence entry. You can still track numbers, dates, and reminders without attaching scans yet.'
                : isFormalDocumentType(draft.documentType)
                  ? draft.localFileUri
                    ? 'This formal document keeps its image or PDF locally on the device for quick reference.'
                    : 'This is a metadata-only formal document entry. You can still keep issuer, reference, and renewal details without attaching a file yet.'
                : draft.documentType === 'payment_card'
                  ? draft.localFileUri
                    ? 'This payment card keeps its stored image locally on the device. Card numbers stay masked by default.'
                    : 'This is a metadata-only payment card entry. You can still keep expiry tracking and masked card details without attaching an image yet.'
                : draft.localFileUri
                  ? 'This document includes a local file stored on the device.'
                  : 'This is a metadata-only document entry. You can still track numbers, dates, and reminders without attaching a file.'}
            </Text>
            <View style={styles.field}>
              <Text style={styles.label}>Sensitivity</Text>
              <ChoiceChips<'yes' | 'no'>
                value={draft.sensitive ? 'yes' : 'no'}
                onChange={(value) => setDraft((current) => (current ? { ...current, sensitive: value === 'yes' } : current))}
                options={[
                  { label: 'Sensitive', value: 'yes' },
                  { label: 'Standard', value: 'no' },
                ]}
              />
            </View>
            <AppTextField
              label="Notes"
              value={draft.notes}
              onChangeText={(value) => setDraft((current) => (current ? { ...current, notes: value } : current))}
              multiline
            />
            <AppButton label="Save document" onPress={handleSave} />
          </>
        ) : null}
      </AppModal>

      <AppModal visible={pinPromptVisible} title="Unlock vault" onClose={() => setPinPromptVisible(false)}>
        <Text style={styles.meta}>Enter your PIN to reveal sensitive previews for this session.</Text>
        <PinPad value={pin} pinLength={security.pinLength} onChange={setPin} />
        <AppButton label="Unlock with PIN" onPress={handleVaultUnlock} />
        {security.biometricEnabled ? (
          <AppButton label="Use biometrics" tone="secondary" onPress={() => unlockWithBiometrics('vault')} />
        ) : null}
      </AppModal>

      <AppModal
        visible={detailVisible}
        title={getDocumentDetailTitle(selectedDocument)}
        onClose={() => setDetailVisible(false)}
      >
        {selectedDocument ? (
          <>
            {selectedDocument.sensitive && !isVaultUnlocked ? (
              <>
                <Text style={styles.meta}>Unlock the vault to reveal the preview and any sensitive values.</Text>
                <AppButton label="Unlock previews" onPress={() => setPinPromptVisible(true)} />
              </>
            ) : (
              <>
                {selectedDocument.documentType === 'passport' ? (
                  <>
                    <PassportDocument
                      document={selectedDocument}
                      traveller={selectedTraveller}
                      open={passportOpen}
                      interactive
                    />
                    <AppButton
                      label={passportOpen ? 'Close passport' : 'Open passport'}
                      tone="secondary"
                      onPress={() => setPassportOpen((value) => !value)}
                    />
                    <View style={styles.buttonRow}>
                      <CopyDataButton payload={buildPassportCopyPayload(selectedDocument, selectedTraveller)} />
                      <AppButton
                        label="Extract from scan"
                        tone="secondary"
                        onPress={handleSelectedPassportOcr}
                        disabled={!hasPassportImageForOcr(selectedDocument)}
                        loading={passportOcrLoading}
                      />
                      <AppButton
                        label="Edit extracted fields"
                        tone="secondary"
                        onPress={() => openExtractedFieldEditor(selectedDocument)}
                      />
                      <AppButton
                        label={getDocumentSourceCtaLabel(isDocumentPdfSource(selectedDocument.mimeType, selectedDocument.localFileUri))}
                        tone="secondary"
                        onPress={() => openPrimarySource(selectedDocument)}
                        disabled={!selectedDocument.localFileUri}
                      />
                    </View>
                    {!selectedDocument.localFileUri ? (
                      <Text style={styles.meta}>No original scan is attached yet. You can still keep passport details and expiry tracking locally.</Text>
                    ) : null}
                    {selectedDocument.localFileUri && !hasPassportImageForOcr(selectedDocument) ? (
                      <Text style={styles.meta}>Passport OCR can read local image scans and PDFs in the Android build.</Text>
                    ) : null}
                    {selectedDocument.notes ? <Text style={styles.meta}>{selectedDocument.notes}</Text> : null}
                  </>
                ) : selectedDocument.documentType === 'driving_licence' ? (
                  <>
                    <DrivingLicenceDocument
                      document={selectedDocument}
                      traveller={selectedTraveller}
                      open={drivingLicenceOpen}
                      interactive
                    />
                    <AppButton
                      label={drivingLicenceOpen ? 'Close licence' : 'Open licence'}
                      tone="secondary"
                      onPress={() => setDrivingLicenceOpen((value) => !value)}
                    />
                    <View style={styles.buttonRow}>
                      <CopyDataButton label="Copy licence data" payload={buildDrivingLicenceCopyPayload(selectedDocument, selectedTraveller)} />
                      <AppButton
                        label="Extract from front scan"
                        tone="secondary"
                        onPress={handleSelectedDrivingLicenceOcr}
                        disabled={!canRunDrivingLicenceOcr(selectedDocument)}
                        loading={drivingLicenceOcrLoading}
                      />
                      <AppButton
                        label="Edit extracted fields"
                        tone="secondary"
                        onPress={() => openExtractedFieldEditor(selectedDocument)}
                      />
                      <AppButton
                        label={getDocumentSourceCtaLabel(isDocumentPdfSource(selectedDocument.mimeType, selectedDocument.localFileUri))}
                        tone="secondary"
                        onPress={() => openPrimarySource(selectedDocument)}
                        disabled={!selectedDocument.localFileUri}
                      />
                      <AppButton
                        label={getDocumentSourceCtaLabel(
                          isDocumentPdfSource(selectedDocument.secondaryMimeType, selectedDocument.secondaryLocalFileUri)
                        )}
                        tone="secondary"
                        onPress={() => openSecondarySource(selectedDocument)}
                        disabled={!selectedDocument.secondaryLocalFileUri}
                      />
                    </View>
                    {!selectedDocument.localFileUri ? (
                      <Text style={styles.meta}>No front scan is attached yet. You can still keep the driving licence record and expiry tracking locally.</Text>
                    ) : null}
                    {!selectedDocument.secondaryLocalFileUri ? (
                      <Text style={styles.meta}>No back scan is attached yet. Add the reverse side for categories and endorsements.</Text>
                    ) : null}
                    {selectedDocument.notes ? <Text style={styles.meta}>{selectedDocument.notes}</Text> : null}
                  </>
                ) : selectedDocument.documentType === 'ghic' ? (
                  <>
                    <HealthCardDocument
                      document={selectedDocument}
                      traveller={selectedTraveller}
                      open={healthCardOpen}
                      interactive
                    />
                    <AppButton
                      label={healthCardOpen ? 'Close health card' : 'Open health card'}
                      tone="secondary"
                      onPress={() => setHealthCardOpen((value) => !value)}
                    />
                    <View style={styles.buttonRow}>
                      <CopyDataButton label="Copy health card data" payload={buildHealthCardCopyPayload(selectedDocument, selectedTraveller)} />
                      <AppButton
                        label="Extract from scan"
                        tone="secondary"
                        onPress={handleSelectedHealthCardOcr}
                        disabled={!canRunHealthCardOcr(selectedDocument)}
                        loading={healthCardOcrLoading}
                      />
                      <AppButton
                        label="Edit extracted fields"
                        tone="secondary"
                        onPress={() => openExtractedFieldEditor(selectedDocument)}
                      />
                      <AppButton
                        label={getDocumentSourceCtaLabel(isDocumentPdfSource(selectedDocument.mimeType, selectedDocument.localFileUri))}
                        tone="secondary"
                        onPress={() => openPrimarySource(selectedDocument)}
                        disabled={!selectedDocument.localFileUri}
                      />
                    </View>
                    {!selectedDocument.localFileUri ? (
                      <Text style={styles.meta}>No original scan is attached yet. You can still keep health-card details and expiry tracking locally.</Text>
                    ) : null}
                    {selectedDocument.notes ? <Text style={styles.meta}>{selectedDocument.notes}</Text> : null}
                  </>
                ) : selectedDocument.documentType === 'payment_card' ? (
                  <>
                    <PaymentCardDocument
                      document={selectedDocument}
                      traveller={selectedTraveller}
                      open={paymentCardOpen}
                      interactive
                    />
                    <AppButton
                      label={paymentCardOpen ? 'Close payment card' : 'Open payment card'}
                      tone="secondary"
                      onPress={() => setPaymentCardOpen((value) => !value)}
                    />
                    <View style={styles.buttonRow}>
                      <CopyDataButton
                        label="Copy card summary"
                        payload={buildPaymentCardCopyPayload(selectedDocument)}
                      />
                      <AppButton
                        label="Edit stored fields"
                        tone="secondary"
                        onPress={() => openExtractedFieldEditor(selectedDocument)}
                      />
                      <AppButton
                        label={getDocumentSourceCtaLabel(isDocumentPdfSource(selectedDocument.mimeType, selectedDocument.localFileUri))}
                        tone="secondary"
                        onPress={() => openPrimarySource(selectedDocument)}
                        disabled={!selectedDocument.localFileUri}
                      />
                    </View>
                    {!selectedDocument.localFileUri ? (
                      <Text style={styles.meta}>No card image is attached yet. Pineapple still keeps the masked card record and expiry locally.</Text>
                    ) : null}
                    <Text style={styles.meta}>Full card numbers stay hidden until you deliberately reveal them. Security codes are not shown in this view.</Text>
                    {selectedDocument.notes ? <Text style={styles.meta}>{selectedDocument.notes}</Text> : null}
                  </>
                ) : isFormalDocumentType(selectedDocument.documentType) ? (
                  <>
                    <FormalDocumentRecord
                      document={selectedDocument}
                      traveller={selectedTraveller}
                      open={formalDocumentOpen}
                      interactive
                      onOpenSource={() => openPrimarySource(selectedDocument)}
                    />
                    <AppButton
                      label={formalDocumentOpen ? 'Close document' : 'Open document'}
                      tone="secondary"
                      onPress={() => setFormalDocumentOpen((value) => !value)}
                    />
                    <View style={styles.buttonRow}>
                      <CopyDataButton
                        label="Copy document data"
                        payload={buildFormalDocumentCopyPayload(selectedDocument, selectedTraveller)}
                      />
                      <AppButton
                        label="Extract from scan"
                        tone="secondary"
                        onPress={handleSelectedFormalDocumentOcr}
                        disabled={!canRunFormalDocumentOcr(selectedDocument)}
                        loading={formalDocumentOcrLoading}
                      />
                      <AppButton
                        label="Edit extracted fields"
                        tone="secondary"
                        onPress={() => openExtractedFieldEditor(selectedDocument)}
                      />
                      <AppButton
                        label={getDocumentSourceCtaLabel(isDocumentPdfSource(selectedDocument.mimeType, selectedDocument.localFileUri))}
                        tone="secondary"
                        onPress={() => openPrimarySource(selectedDocument)}
                        disabled={!selectedDocument.localFileUri}
                      />
                    </View>
                    {!selectedDocument.localFileUri ? (
                      <Text style={styles.meta}>No original file is attached yet. You can still keep extracted document details and renewal tracking locally.</Text>
                    ) : null}
                    {selectedDocument.notes ? <Text style={styles.meta}>{selectedDocument.notes}</Text> : null}
                  </>
                ) : (
                  <>
                    {(() => {
                      const expiryInfo = getDocumentExpiryInfo(selectedDocument.documentType, selectedDocument.expiryDate);
                      return (
                        <>
                          <View style={styles.inlineRow}>
                            <Text style={styles.title}>{documentLabels[selectedDocument.documentType]}</Text>
                            {(selectedDocument.expiryDate || expiryInfo.needsExpiryPrompt) ? (
                              <InfoChip label={expiryInfo.badgeLabel} tone={expiryInfo.tone} />
                            ) : null}
                          </View>
                          {expiryInfo.passportSixMonthWarning ? (
                            <Text style={styles.warningText}>Many destinations require passports to stay valid for at least six months beyond travel.</Text>
                          ) : null}
                        </>
                      );
                    })()}
                    <Text style={styles.meta}>Holder: {selectedDocument.holderName || 'Trip-wide'}</Text>
                    <Text style={styles.meta}>Number: {selectedDocument.documentNumber || 'Not set'}</Text>
                    <Text style={styles.meta}>Issue date: {formatShortDate(selectedDocument.issueDate)}</Text>
                    <Text style={styles.meta}>Expiry date: {formatShortDate(selectedDocument.expiryDate)}</Text>
                    {!selectedDocument.localFileUri ? <Text style={styles.meta}>No local file saved for this document.</Text> : null}
                    {selectedDocument.previewUri ? (
                      <View style={styles.preview}>
                        <ManagedFileImage
                          uri={selectedDocument.previewUri}
                          mimeType={selectedDocument.mimeType}
                          style={styles.preview}
                          contentFit="contain"
                        />
                      </View>
                    ) : null}
                    {selectedDocument.localFileUri ? (
                      <AppButton
                        label={getDocumentSourceCtaLabel(isDocumentPdfSource(selectedDocument.mimeType, selectedDocument.localFileUri))}
                        tone="secondary"
                        onPress={() => openPrimarySource(selectedDocument)}
                      />
                    ) : null}
                    {selectedDocument.notes ? <Text style={styles.meta}>{selectedDocument.notes}</Text> : null}
                  </>
                )}
              </>
            )}
          </>
        ) : null}
      </AppModal>

      <DocumentScanViewerModal
        visible={Boolean(scanViewer)}
        title={scanViewer?.title || 'Document source'}
        onClose={() => setScanViewer(null)}
        localFileUri={scanViewer?.localFileUri ?? null}
        previewUri={scanViewer?.previewUri ?? null}
        mimeType={scanViewer?.mimeType ?? null}
        emptyText={scanViewer?.emptyText}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  warningList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  documentRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  passportRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
  },
  thumbnailPlaceholder: {
    backgroundColor: '#F8F5EE',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  passportMeta: {
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  warningText: {
    color: colors.danger,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  iconColumn: {
    gap: spacing.xs,
  },
  iconButton: {
    padding: spacing.xs,
  },
  preview: {
    width: '100%',
    height: 320,
    borderRadius: radii.md,
    backgroundColor: '#F8F5EE',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
