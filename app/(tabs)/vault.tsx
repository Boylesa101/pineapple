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
import { DocumentAddSheet } from '@/components/document-support/DocumentAddSheet';
import { DocumentFloatingActionButton } from '@/components/document-support/DocumentFloatingActionButton';
import { DocumentNoticeBanner } from '@/components/document-support/DocumentNoticeBanner';
import { DocumentScanFlowModal, type DocumentScanStage } from '@/components/document-support/DocumentScanFlowModal';
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
import { TypedDateField } from '@/components/TypedDateField';
import { TripPicker } from '@/components/TripPicker';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { PERSONAL_DOCUMENTS_LABEL, PERSONAL_DOCUMENTS_TRIP_ID } from '@/constants/vault';
import { travellerAvatarColors } from '@/data/travellerOptions';
import { recognizeDrivingLicenceScan } from '@/services/drivingLicenceOcr';
import { recognizeFormalDocumentScan } from '@/services/formalDocumentOcr';
import { recognizeHealthCardScan } from '@/services/healthCardOcr';
import { isLiveDocumentScannerAvailable, scanDocumentWithLiveEdges } from '@/services/documentScanner';
import { recognizePassportScan } from '@/services/passportOcr';
import { useAppStore } from '@/store/useAppStore';
import type { DocumentDraft, DocumentType, ExpiryReminderLeadTime } from '@/types/models';
import { formatDateTime, formatShortDate } from '@/utils/date';
import { formatAirportDisplay } from '@/utils/airports';
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
import {
  airlineLoyaltyPresets,
  documentLabels,
  getFormalDocumentDateLabels,
  manualTravelDocumentTypes,
} from '@/utils/documentTypes';
import { getDocumentVaultSetupState } from '@/utils/documentVaultSetup';
import { isWebCompanionPolicyActive, sensitiveWebSupportMessage } from '@/utils/platformPolicy';
import { getDocumentExpiryWarnings, getTripBundle } from '@/utils/selectors';
import { toUserMessage } from '@/utils/userErrors';
import { validateDocument } from '@/utils/validation';
import { canAccessVaultAttachmentContent } from '@/utils/vaultSecurity';

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
  allowManagedAccess?: boolean;
};
type EditorNotice = {
  tone: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  description: string;
};
type GuidedScanState = {
  mode: 'scan' | 'ocr_import';
  documentType: DocumentType;
  stage: DocumentScanStage;
  previewUri?: string | null;
  mimeType?: string | null;
  detail?: string;
  warningText?: string | null;
};

const guidedFormalTypeOptions: DocumentType[] = [...manualTravelDocumentTypes];
const guidedImportTypeOptions: DocumentType[] = ['passport', 'driving_licence', 'ghic', 'insurance'];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    unlockVaultWithPin,
    unlockWithBiometrics,
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
  const [guidedScan, setGuidedScan] = useState<GuidedScanState | null>(null);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [editorNotice, setEditorNotice] = useState<EditorNotice | null>(null);
  const [setupTravellerName, setSetupTravellerName] = useState('');
  const [savingSetupTraveller, setSavingSetupTraveller] = useState(false);
  const [passportOcrLoading, setPassportOcrLoading] = useState(false);
  const [drivingLicenceOcrLoading, setDrivingLicenceOcrLoading] = useState(false);
  const [healthCardOcrLoading, setHealthCardOcrLoading] = useState(false);
  const [formalDocumentOcrLoading, setFormalDocumentOcrLoading] = useState(false);
  const [addDocumentType, setAddDocumentType] = useState<DocumentType>('passport');
  const openedEditIdRef = useRef<string | null>(null);
  const pendingVaultActionRef = useRef<(() => void) | null>(null);
  const hasPersonalDocuments = data.documents.some((document) => document.tripId === PERSONAL_DOCUMENTS_TRIP_ID);
  const selectedTripId = activeTripId ?? data.trips[0]?.id ?? (hasPersonalDocuments ? PERSONAL_DOCUMENTS_TRIP_ID : null);
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
    openExistingDocumentEditor(document);
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

  function requestVaultUnlockFor(action: () => void) {
    pendingVaultActionRef.current = action;
    setPinPromptVisible(true);
  }

  function withVaultAttachmentAccess(document: { sensitive: boolean }, action: () => void) {
    if (!canAccessVaultAttachmentContent(document, isVaultUnlocked)) {
      requestVaultUnlockFor(action);
      return false;
    }

    action();
    return true;
  }

  function buildEditableDraft(sourceDocument: DocumentDraft) {
    const traveller = bundle.travellers.find((item) => item.id === sourceDocument.travellerId) ?? null;
    return ensurePaymentCardDraftData(
      ensureFormalDocumentDraftData(
        ensureHealthCardDraftData(ensureDrivingLicenceDraftData(ensurePassportDraftData(sourceDocument, traveller), traveller), traveller),
        traveller
      ),
      traveller
    );
  }

  function openExistingDocumentEditor(sourceDocument: DocumentDraft) {
    withVaultAttachmentAccess(sourceDocument, () => {
      setEditorNotice(null);
      setDraft(buildEditableDraft(sourceDocument));
      setDetailVisible(false);
      setEditorVisible(true);
    });
  }

  function openPrimarySource(document: {
    localFileUri: string;
    previewUri: string | null;
    mimeType: string | null;
    documentType: DocumentType;
    sensitive: boolean;
  }) {
    withVaultAttachmentAccess(document, () => {
      openScanViewer({
        title: isDocumentPdfSource(document.mimeType, document.localFileUri)
          ? `${documentLabels[document.documentType]} PDF`
          : `${documentLabels[document.documentType]} scan`,
        localFileUri: document.localFileUri,
        previewUri: document.previewUri,
        mimeType: document.mimeType,
        allowManagedAccess: true,
      });
    });
  }

  function openSecondarySource(document: {
    secondaryLocalFileUri?: string | null;
    secondaryPreviewUri?: string | null;
    secondaryMimeType?: string | null;
    sensitive: boolean;
  }) {
    withVaultAttachmentAccess(document, () => {
      openScanViewer({
        title: isDocumentPdfSource(document.secondaryMimeType, document.secondaryLocalFileUri) ? 'Back PDF' : 'Back scan',
        localFileUri: document.secondaryLocalFileUri ?? null,
        previewUri: document.secondaryPreviewUri ?? null,
        mimeType: document.secondaryMimeType ?? null,
        emptyText: 'No back scan attached yet.',
        allowManagedAccess: true,
      });
    });
  }

  function openExtractedFieldEditor(sourceDocument: DocumentDraft) {
    openExistingDocumentEditor(sourceDocument);
  }

  function resolveFormalDocumentType(type: DocumentType) {
    if (guidedFormalTypeOptions.includes(type)) {
      return type;
    }
    return 'insurance';
  }

  function resolveImportTargetType(type: DocumentType) {
    if (guidedImportTypeOptions.includes(type)) {
      return type;
    }
    return 'passport';
  }

  function getScanDocumentLabel(documentType: DocumentType) {
    if (documentType === 'ghic') {
      return 'Health card';
    }

    if (isFormalDocumentType(documentType)) {
      return documentLabels[documentType];
    }

    return documentLabels[documentType];
  }

  function openGuidedDocumentFlow(mode: 'scan' | 'ocr_import', documentType: DocumentType) {
    setAddSheetVisible(false);
    setEditorNotice(null);
    setGuidedScan({
      mode,
      documentType,
      stage: 'ready',
      detail:
        mode === 'scan'
          ? isLiveDocumentScannerAvailable()
            ? 'Open the live scanner, align the document inside the frame, and Pineapple will crop the edges before OCR review.'
            : 'Position the document so all edges are visible. Keep it flat, reduce glare, and hold steady while Pineapple prepares the OCR review.'
          : 'Choose a clear photo or PDF from this device. Pineapple will secure it locally and prepare the extracted fields for review.',
    });
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
  const draftDateLabels = draft ? getFormalDocumentDateLabels(draft.documentType) : null;

  const orderedVaultSections = useMemo(() => {
    const documentGroups = [
      { key: 'passport', title: 'Passports', documents: bundle.documents.filter((document) => document.documentType === 'passport') },
      {
        key: 'driving_licence',
        title: 'Driving licences',
        documents: bundle.documents.filter((document) => document.documentType === 'driving_licence'),
      },
      { key: 'ghic', title: 'Health cards', documents: bundle.documents.filter((document) => document.documentType === 'ghic') },
    ].filter((group) => group.documents.length);
    const otherDocuments = bundle.documents.filter(
      (document) => !['passport', 'driving_licence', 'ghic'].includes(document.documentType)
    );

    const flights = [...bundle.travelSegments]
      .filter((segment) => segment.transportType === 'flight')
      .sort((left, right) => left.departureTime.localeCompare(right.departureTime));
    const trains = [...bundle.travelSegments]
      .filter((segment) => segment.transportType === 'train')
      .sort((left, right) => left.departureTime.localeCompare(right.departureTime));
    const transfers =
      bundle.trip && (bundle.trip.transferProvider || bundle.trip.transferLocation || bundle.trip.transferNotes)
        ? [
            {
              id: `${bundle.trip.id}:transfer`,
              provider: bundle.trip.transferProvider,
              method: bundle.trip.transferMethod,
              location: bundle.trip.transferLocation,
              time: bundle.trip.transferTime,
              notes: bundle.trip.transferNotes,
            },
          ]
        : [];
    const hotels = [...bundle.hotelStays].sort((left, right) => left.checkIn.localeCompare(right.checkIn));

    return {
      documentGroups,
      flights,
      trains,
      transfers,
      hotels,
      otherDocuments,
    };
  }, [bundle.documents, bundle.hotelStays, bundle.travelSegments, bundle.trip]);

  if (!data.trips.length && !hasPersonalDocuments) {
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

        if (isLiveDocumentScannerAvailable()) {
          try {
            const result = await scanDocumentWithLiveEdges({ maxNumDocuments: 1 });
            if (result.status !== 'success' || !result.scannedImages[0]) {
              return null;
            }

            const scannedUri = result.scannedImages[0];
            const localFileUri = await copyIntoAppStorage(scannedUri, 'vault', 'image/jpeg', { encryptAtRest: true });
            await cleanupImportedSource(scannedUri);
            return {
              localFileUri,
              previewUri: localFileUri,
              mimeType: 'image/jpeg',
            };
          } catch {
            // Fall back to the plain camera flow if the native scanner cannot open.
          }
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

  async function runInitialOcrIfAvailable(nextDraft: DocumentDraft) {
    if (nextDraft.documentType === 'passport') {
      return runPassportOcrOnDraft(nextDraft);
    }
    if (nextDraft.documentType === 'driving_licence') {
      return runDrivingLicenceOcrOnDraft(nextDraft);
    }
    if (nextDraft.documentType === 'ghic') {
      return runHealthCardOcrOnDraft(nextDraft);
    }
    if (isFormalDocumentType(nextDraft.documentType)) {
      return runFormalDocumentOcrOnDraft(nextDraft);
    }
    return null;
  }

  async function startDocumentFlow(action: 'scan' | 'ocr_import' | 'manual', documentType: DocumentType) {
    if (isWebCompanionPolicyActive()) {
      Alert.alert('Vault editing stays disabled on web', sensitiveWebSupportMessage);
      return;
    }

    if (action === 'manual') {
      setAddSheetVisible(false);
      openManualDocument(documentType);
      return;
    }

    if (action === 'scan' || action === 'ocr_import') {
      openGuidedDocumentFlow(action, documentType);
      return;
    }
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

  async function handleGuidedSourcePick(source: DocumentAssetSource) {
    if (!guidedScan) {
      return;
    }

    setGuidedScan((current) =>
      current
        ? {
            ...current,
            stage: 'capturing',
            detail:
              source === 'camera'
                ? isLiveDocumentScannerAvailable()
                  ? 'Opening the live document scanner and preparing a secure local capture.'
                  : 'Opening the camera and preparing a secure local capture.'
                : 'Securing the selected file locally before Pineapple reviews the document.',
            warningText: null,
          }
        : current
    );

    const asset = await pickManagedDocumentAsset(source);
    if (!asset) {
      setGuidedScan(null);
      return;
    }

    setGuidedScan((current) =>
      current
        ? {
            ...current,
            stage: 'capturing',
            previewUri: asset.previewUri ?? asset.localFileUri,
            mimeType: asset.mimeType,
            detail: 'Document captured. Hold steady while Pineapple prepares the extracted fields.',
            warningText: null,
          }
        : current
    );

    await wait(420);

    const nextDraft = buildStarterDocumentDraft(guidedScan.documentType, asset);
    if (!nextDraft) {
      setGuidedScan(null);
      return;
    }

    setDraft(nextDraft);
    setGuidedScan((current) =>
      current
        ? {
            ...current,
            stage: 'processing',
            previewUri: asset.previewUri ?? asset.localFileUri,
            mimeType: asset.mimeType,
            detail: 'Extracting fields locally on this device and preparing the review screen.',
            warningText: null,
          }
        : current
    );

    const notice = await runInitialOcrIfAvailable(nextDraft);

    const terminalStage: DocumentScanStage =
      notice?.tone === 'danger' ? 'error' : notice?.tone === 'warning' ? 'warning' : 'extracted';

    setGuidedScan((current) =>
      current
        ? {
            ...current,
            stage: terminalStage,
            previewUri: asset.previewUri ?? asset.localFileUri,
            mimeType: asset.mimeType,
            detail:
              notice?.tone === 'danger'
                ? 'OCR could not finish cleanly, but Pineapple kept the document and opened a manual review so you can continue.'
                : 'The extracted fields are ready for review before you save the document.',
            warningText: notice?.description ?? null,
          }
        : current
    );

    await wait(terminalStage === 'extracted' ? 520 : 760);
    setGuidedScan(null);
    setEditorVisible(true);
  }

  function openManualDocument(documentType: DocumentType = 'custom') {
    const nextDraft = buildStarterDocumentDraft(documentType);
    if (!nextDraft) return;
    setEditorNotice(null);
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
    setEditorNotice(null);
    setEditorVisible(false);
    if (params.editDocumentId) {
      router.setParams({ editDocumentId: undefined });
    }
  }

  async function handleVaultUnlock() {
    if (isWebCompanionPolicyActive()) {
      Alert.alert('Vault unlock stays disabled on web', sensitiveWebSupportMessage);
      return;
    }

    const valid = await unlockVaultWithPin(pin);
    if (!valid) {
      Alert.alert('Incorrect PIN', 'Try again.');
      setPin('');
      return;
    }
    setPinPromptVisible(false);
    setPin('');
    const pendingAction = pendingVaultActionRef.current;
    pendingVaultActionRef.current = null;
    pendingAction?.();
  }

  function closeVaultPrompt() {
    pendingVaultActionRef.current = null;
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

  function renderTravelVaultCard(props: {
    key: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    title: string;
    subtitle: string;
    description?: string;
    onPress: () => void;
  }) {
    return (
      <Pressable key={props.key} onPress={props.onPress} style={styles.travelVaultCard}>
        <View style={styles.travelVaultBadge}>
          <MaterialIcons name={props.icon} size={22} color={colors.primaryBlue} />
        </View>
        <View style={styles.travelVaultCopy}>
          <Text style={styles.travelVaultTitle}>{props.title}</Text>
          <Text style={styles.travelVaultSubtitle}>{props.subtitle}</Text>
          {props.description ? <Text style={styles.travelVaultMeta}>{props.description}</Text> : null}
        </View>
      </Pressable>
    );
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
      const notice: EditorNotice = {
        tone: 'warning',
        title: 'Passport scan needed',
        description: sourceDraft.localFileUri
          ? 'Passport OCR can read local image scans and PDFs in the Android build.'
          : 'Attach a passport image or PDF first, then Pineapple can extract the MRZ and fill the passport fields for review.',
      };
      setEditorNotice(notice);
      return notice;
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

      const notice: EditorNotice = extracted.warnings.length
        ? {
            tone: 'warning',
            title: 'Passport extracted with review notes',
            description: [
              extracted.source === 'mrz'
                ? 'Pineapple read the passport MRZ and filled the passport fields.'
                : 'Pineapple filled the passport fields from the scan text.',
              `Review: ${extracted.warnings.join(' ')}`,
            ].join(' '),
          }
        : {
            tone: 'success',
            title: 'Passport extracted',
            description:
              extracted.source === 'mrz'
                ? 'Pineapple read the passport MRZ and filled the passport fields for review.'
                : 'Pineapple filled the passport fields from the scan text for review.',
          };
      setEditorNotice(notice);
      return notice;
    } catch (error) {
      const notice: EditorNotice = {
        tone: 'danger',
        title: 'Passport OCR unavailable',
        description: toUserMessage(
          error,
          'Pineapple could not read that passport scan right now. You can still enter the passport fields manually.'
        ),
      };
      setEditorNotice(notice);
      return notice;
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
      const notice: EditorNotice = {
        tone: 'warning',
        title: 'Driving licence scan needed',
        description: sourceDraft.localFileUri
          ? 'Driving licence OCR can read the front image or PDF in the Android build.'
          : 'Attach the front driving licence scan first, then Pineapple can extract the holder record for review.',
      };
      setEditorNotice(notice);
      return notice;
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

      const notice: EditorNotice = extracted.warnings.length
        ? {
            tone: 'warning',
            title: 'Driving licence extracted with review notes',
            description: `Pineapple filled the driving licence fields from the front scan. Review: ${extracted.warnings.join(' ')}`,
          }
        : {
            tone: 'success',
            title: 'Driving licence extracted',
            description: 'Pineapple filled the driving licence fields from the front scan for review.',
          };
      setEditorNotice(notice);
      return notice;
    } catch (error) {
      const notice: EditorNotice = {
        tone: 'danger',
        title: 'Driving licence OCR unavailable',
        description: toUserMessage(
          error,
          'Pineapple could not read that driving licence scan right now. You can still enter the licence fields manually.'
        ),
      };
      setEditorNotice(notice);
      return notice;
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
      const notice: EditorNotice = {
        tone: 'warning',
        title: 'Health card scan needed',
        description: sourceDraft.localFileUri
          ? 'Health-card OCR can read local image scans and PDFs in the Android build.'
          : 'Attach a GHIC or EHIC scan first, then Pineapple can extract the card fields for review.',
      };
      setEditorNotice(notice);
      return notice;
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

      const notice: EditorNotice = extracted.warnings.length
        ? {
            tone: 'warning',
            title: 'Health card extracted with review notes',
            description: `Pineapple filled the health-card fields from the scan. Review: ${extracted.warnings.join(' ')}`,
          }
        : {
            tone: 'success',
            title: 'Health card extracted',
            description: 'Pineapple filled the health-card fields from the scan for review.',
          };
      setEditorNotice(notice);
      return notice;
    } catch (error) {
      const notice: EditorNotice = {
        tone: 'danger',
        title: 'Health-card OCR unavailable',
        description: toUserMessage(
          error,
          'Pineapple could not read that health-card scan right now. You can still enter the card fields manually.'
        ),
      };
      setEditorNotice(notice);
      return notice;
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
      const notice: EditorNotice = {
        tone: 'warning',
        title: 'Document scan needed',
        description: sourceDraft.localFileUri
          ? 'Formal-document OCR can read local image scans and PDFs in the Android build.'
          : 'Attach a scan or PDF first, then Pineapple can extract document metadata for review.',
      };
      setEditorNotice(notice);
      return notice;
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

      const notice: EditorNotice = extracted.warnings.length
        ? {
            tone: 'warning',
            title: 'Document fields extracted with review notes',
            description: `Pineapple filled the formal-document fields from the scan. Review: ${extracted.warnings.join(' ')}`,
          }
        : {
            tone: 'success',
            title: 'Document fields extracted',
            description: 'Pineapple filled the formal-document fields from the scan for review.',
          };
      setEditorNotice(notice);
      return notice;
    } catch (error) {
      const notice: EditorNotice = {
        tone: 'danger',
        title: 'Formal-document OCR unavailable',
        description: toUserMessage(
          error,
          'Pineapple could not read that document right now. You can still enter the document fields manually.'
        ),
      };
      setEditorNotice(notice);
      return notice;
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

  function renderDocumentListItem(document: (typeof bundle.documents)[number]) {
    const traveller = bundle.travellers.find((item) => item.id === document.travellerId);
    const previewUnlocked = isVaultUnlocked || !document.sensitive;
    const numberLabel = previewUnlocked ? document.documentNumber || 'No number saved' : maskSensitive(document.documentNumber);
    const expiryInfo = getDocumentExpiryInfo(document.documentType, document.expiryDate);

    if (document.documentType === 'passport') {
      return (
        <View key={document.id} style={styles.physicalDocumentCard}>
          <PassportDocument
            document={document}
            traveller={traveller}
            onPress={() => {
              setSelectedId(document.id);
              setPassportOpen(false);
              setDetailVisible(true);
            }}
          />
          <View style={styles.documentMetaBlock}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Passport</Text>
              <VerificationBadge status={getPassportVerificationStatus(document, traveller)} />
              {document.expiryDate || expiryInfo.needsExpiryPrompt ? (
                <InfoChip label={document.expiryDate ? expiryInfo.badgeLabel : 'Add expiry date'} tone={expiryInfo.tone} />
              ) : null}
            </View>
            <Text style={styles.meta}>{document.holderName || traveller?.fullName || 'Trip-wide document'}</Text>
            <Text style={styles.meta}>
              {document.expiryDate ? `${formatShortDate(document.expiryDate)} • ${expiryInfo.relativeLabel}` : 'Add expiry date to enable warnings'}
            </Text>
            <Text style={styles.meta}>{numberLabel}</Text>
            <View style={styles.documentActionRow}>
              {document.localFileUri ? (
                <Pressable onPress={() => openPrimarySource(document)} style={styles.documentActionLink}>
                  <MaterialIcons name="visibility" size={16} color={colors.primaryBlue} />
                  <Text style={styles.documentActionText}>View</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => openExistingDocumentEditor(document)}
                style={styles.documentActionLink}
              >
                <MaterialIcons name="edit" size={16} color={colors.primaryBlue} />
                <Text style={styles.documentActionText}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => confirmDeleteDocument(document.id)} style={styles.documentActionLink}>
                <MaterialIcons name="delete-outline" size={16} color={colors.danger} />
                <Text style={styles.documentActionDanger}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    if (document.documentType === 'driving_licence') {
      return (
        <View key={document.id} style={styles.physicalDocumentCard}>
          <DrivingLicenceDocument
            document={document}
            traveller={traveller}
            allowPreview={previewUnlocked}
            onPress={() => {
              setSelectedId(document.id);
              setDrivingLicenceOpen(false);
              setDetailVisible(true);
            }}
          />
          <View style={styles.documentMetaBlock}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Driving licence</Text>
              <VerificationBadge status={getDrivingLicenceVerificationStatus(document, traveller)} />
              {document.expiryDate || expiryInfo.needsExpiryPrompt ? (
                <InfoChip label={document.expiryDate ? expiryInfo.badgeLabel : 'Add expiry date'} tone={expiryInfo.tone} />
              ) : null}
            </View>
            <Text style={styles.meta}>{document.holderName || traveller?.fullName || 'Trip-wide document'}</Text>
            <Text style={styles.meta}>
              {document.expiryDate ? `${formatShortDate(document.expiryDate)} • ${expiryInfo.relativeLabel}` : 'Add expiry date to enable warnings'}
            </Text>
            <Text style={styles.meta}>
              {document.secondaryLocalFileUri ? 'Front and back scans saved' : document.localFileUri ? 'Front scan only' : 'Metadata only • No scans attached'}
            </Text>
            <View style={styles.documentActionRow}>
              {document.localFileUri ? (
                <Pressable onPress={() => openPrimarySource(document)} style={styles.documentActionLink}>
                  <MaterialIcons name="visibility" size={16} color={colors.primaryBlue} />
                  <Text style={styles.documentActionText}>Front</Text>
                </Pressable>
              ) : null}
              {document.secondaryLocalFileUri ? (
                <Pressable onPress={() => openSecondarySource(document)} style={styles.documentActionLink}>
                  <MaterialIcons name="flip" size={16} color={colors.primaryBlue} />
                  <Text style={styles.documentActionText}>Back</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => openExistingDocumentEditor(document)}
                style={styles.documentActionLink}
              >
                <MaterialIcons name="edit" size={16} color={colors.primaryBlue} />
                <Text style={styles.documentActionText}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => confirmDeleteDocument(document.id)} style={styles.documentActionLink}>
                <MaterialIcons name="delete-outline" size={16} color={colors.danger} />
                <Text style={styles.documentActionDanger}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    if (document.documentType === 'ghic') {
      return (
        <View key={document.id} style={styles.physicalDocumentCard}>
          <HealthCardDocument
            document={document}
            traveller={traveller}
            allowPreview={previewUnlocked}
            onPress={() => {
              setSelectedId(document.id);
              setHealthCardOpen(false);
              setDetailVisible(true);
            }}
          />
          <View style={styles.documentMetaBlock}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>GHIC / EHIC</Text>
              <VerificationBadge status={getHealthCardVerificationStatus(document, traveller)} />
              {document.expiryDate || expiryInfo.needsExpiryPrompt ? (
                <InfoChip label={document.expiryDate ? expiryInfo.badgeLabel : 'Add expiry date'} tone={expiryInfo.tone} />
              ) : null}
            </View>
            <Text style={styles.meta}>{document.holderName || traveller?.fullName || 'Trip-wide document'}</Text>
            <Text style={styles.meta}>
              {document.expiryDate ? `${formatShortDate(document.expiryDate)} • ${expiryInfo.relativeLabel}` : 'Add expiry date to enable warnings'}
            </Text>
            <Text style={styles.meta}>{numberLabel}</Text>
            <View style={styles.documentActionRow}>
              {document.localFileUri ? (
                <Pressable onPress={() => openPrimarySource(document)} style={styles.documentActionLink}>
                  <MaterialIcons name="visibility" size={16} color={colors.primaryBlue} />
                  <Text style={styles.documentActionText}>View</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => openExistingDocumentEditor(document)}
                style={styles.documentActionLink}
              >
                <MaterialIcons name="edit" size={16} color={colors.primaryBlue} />
                <Text style={styles.documentActionText}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => confirmDeleteDocument(document.id)} style={styles.documentActionLink}>
                <MaterialIcons name="delete-outline" size={16} color={colors.danger} />
                <Text style={styles.documentActionDanger}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    if (document.documentType === 'payment_card') {
      return (
        <View key={document.id} style={styles.physicalDocumentCard}>
          <PaymentCardDocument
            document={document}
            traveller={traveller}
            onPress={() => {
              setSelectedId(document.id);
              setPaymentCardOpen(false);
              setDetailVisible(true);
            }}
          />
          <View style={styles.documentMetaBlock}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Payment card</Text>
              <VerificationBadge status={getPaymentCardVerificationStatus(document)} />
              {document.expiryDate || expiryInfo.needsExpiryPrompt ? (
                <InfoChip label={document.expiryDate ? expiryInfo.badgeLabel : 'Add expiry date'} tone={expiryInfo.tone} />
              ) : null}
            </View>
            <Text style={styles.meta}>{document.holderName || traveller?.fullName || 'Trip-wide document'}</Text>
            <Text style={styles.meta}>{maskPaymentCardNumber(document.documentNumber)}</Text>
            <View style={styles.documentActionRow}>
              {document.localFileUri ? (
                <Pressable onPress={() => openPrimarySource(document)} style={styles.documentActionLink}>
                  <MaterialIcons name="visibility" size={16} color={colors.primaryBlue} />
                  <Text style={styles.documentActionText}>View</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => openExistingDocumentEditor(document)}
                style={styles.documentActionLink}
              >
                <MaterialIcons name="edit" size={16} color={colors.primaryBlue} />
                <Text style={styles.documentActionText}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => confirmDeleteDocument(document.id)} style={styles.documentActionLink}>
                <MaterialIcons name="delete-outline" size={16} color={colors.danger} />
                <Text style={styles.documentActionDanger}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    if (isFormalDocumentType(document.documentType)) {
      return (
        <View key={document.id} style={styles.physicalDocumentCard}>
          <FormalDocumentRecord
            document={document}
            traveller={traveller}
            onPress={() => {
              setSelectedId(document.id);
              setFormalDocumentOpen(false);
              setDetailVisible(true);
            }}
            onOpenSource={() => openPrimarySource(document)}
          />
          <View style={styles.documentMetaBlock}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{documentLabels[document.documentType]}</Text>
              <VerificationBadge status={getFormalDocumentVerificationStatus(document)} />
              {document.expiryDate || expiryInfo.needsExpiryPrompt ? (
                <InfoChip label={document.expiryDate ? expiryInfo.badgeLabel : 'Add expiry date'} tone={expiryInfo.tone} />
              ) : null}
            </View>
            <Text style={styles.meta}>{document.holderName || traveller?.fullName || 'Trip-wide document'}</Text>
            <Text style={styles.meta}>
              {document.expiryDate
                ? `${formatShortDate(document.expiryDate)} • ${expiryInfo.relativeLabel}`
                : expiryInfo.needsExpiryPrompt
                  ? 'Add expiry date to enable warnings'
                  : 'No expiry date saved'}
            </Text>
            <View style={styles.documentActionRow}>
              {document.localFileUri ? (
                <Pressable onPress={() => openPrimarySource(document)} style={styles.documentActionLink}>
                  <MaterialIcons name="visibility" size={16} color={colors.primaryBlue} />
                  <Text style={styles.documentActionText}>View</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => openExistingDocumentEditor(document)}
                style={styles.documentActionLink}
              >
                <MaterialIcons name="edit" size={16} color={colors.primaryBlue} />
                <Text style={styles.documentActionText}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => confirmDeleteDocument(document.id)} style={styles.documentActionLink}>
                <MaterialIcons name="delete-outline" size={16} color={colors.danger} />
                <Text style={styles.documentActionDanger}>Delete</Text>
              </Pressable>
            </View>
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
            {document.expiryDate || expiryInfo.needsExpiryPrompt ? (
              <InfoChip label={document.expiryDate ? expiryInfo.badgeLabel : 'Add expiry date'} tone={expiryInfo.tone} />
            ) : null}
          </View>
          <View style={styles.inlineRow}>
            {traveller ? <AvatarBadge label={traveller.fullName} color={traveller.avatarColor} size={26} /> : null}
            <Text style={styles.meta}>{document.holderName || traveller?.fullName || 'Trip-wide document'}</Text>
          </View>
          <Text style={styles.meta}>
            {document.expiryDate
              ? `${formatShortDate(document.expiryDate)} • ${expiryInfo.relativeLabel}`
              : expiryInfo.needsExpiryPrompt
                ? 'Add expiry date to enable warnings'
                : 'No expiry date saved'}
          </Text>
          <Text style={styles.meta}>{numberLabel}</Text>
          {!document.localFileUri ? <Text style={styles.meta}>Metadata only • No local file attached</Text> : null}
        </View>
        <View style={styles.iconColumn}>
          <Pressable
            onPress={() => openExistingDocumentEditor(document)}
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
  }

  function openFlightTicketArea() {
    if (selectedTripId) {
      setActiveTrip(selectedTripId);
      router.push({ pathname: '/trip/[tripId]', params: { tripId: selectedTripId, focus: 'travel' } });
      return;
    }
    router.push('/flight-tickets');
  }

  function filterToPassports() {
    const passport = bundle.documents.find((document) => document.documentType === 'passport');
    if (!passport) {
      Alert.alert('No passport saved', 'Add a passport and it will appear here for quick access.');
      return;
    }
    setSelectedId(passport.id);
    setDetailVisible(true);
  }

  function openHotelQuickAccess() {
    if (!selectedTripId) {
      Alert.alert('Trip needed', 'Create or select a trip first so Pineapple can open the hotel information for that journey.');
      return;
    }

    setActiveTrip(selectedTripId);
    router.push({ pathname: '/trip/[tripId]', params: { tripId: selectedTripId, focus: 'hotel' } });
  }

  return (
    <AppScreen
      footer={
        <DocumentFloatingActionButton
          onPress={() => {
            if (isWebCompanionPolicyActive()) {
              Alert.alert('Vault editing stays disabled on web', sensitiveWebSupportMessage);
              return;
            }
            setAddSheetVisible(true);
          }}
        />
      }
      contentStyle={styles.screenContent}
    >
      <View style={styles.vaultHeader}>
        <View style={styles.vaultHeaderCopy}>
          <Text style={styles.vaultEyebrow}>Pineapple</Text>
          <Text style={styles.vaultTitle}>Document Vault</Text>
          <Text style={styles.vaultSubtitle}>Travel-ready identity records, cards, passes, and supporting paperwork stored locally on this device.</Text>
          {isWebCompanionPolicyActive() ? <Text style={styles.meta}>{sensitiveWebSupportMessage}</Text> : null}
        </View>
        <Pressable
          onPress={() => {
            if (isWebCompanionPolicyActive()) {
              Alert.alert('Vault unlock stays disabled on web', sensitiveWebSupportMessage);
              return;
            }
            setPinPromptVisible(true);
          }}
          style={styles.vaultLockButton}
        >
          <MaterialIcons name={isVaultUnlocked ? 'verified-user' : 'lock-outline'} size={20} color={colors.primaryBlue} />
        </Pressable>
      </View>

        <TripPicker
          trips={data.trips}
          value={selectedTripId}
          onChange={setActiveTrip}
          extraOptions={hasPersonalDocuments ? [{ id: PERSONAL_DOCUMENTS_TRIP_ID, label: PERSONAL_DOCUMENTS_LABEL }] : []}
        />

      <View style={styles.quickAccessRow}>
        <Pressable onPress={openFlightTicketArea} style={styles.quickAccessButton}>
          <MaterialIcons name="flight-takeoff" size={22} color={colors.primaryBlue} />
          <Text style={styles.quickAccessLabel}>Flights</Text>
        </Pressable>
        <Pressable onPress={filterToPassports} style={styles.quickAccessButton}>
          <MaterialIcons name="badge" size={22} color={colors.primaryBlue} />
          <Text style={styles.quickAccessLabel}>Passports</Text>
        </Pressable>
        <Pressable onPress={openHotelQuickAccess} style={styles.quickAccessButton}>
          <MaterialIcons name="hotel" size={22} color={colors.primaryBlue} />
          <Text style={styles.quickAccessLabel}>Hotels</Text>
        </Pressable>
      </View>

      {!!expiryWarnings.length ? (
        <AppCard title="Expiry warnings" subtitle="Documents that need attention before travel.">
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
          {orderedVaultSections.documentGroups.map((group) => (
            <AppCard key={group.key} title={group.title} subtitle="Tap a document to open the full detail view.">
              {group.documents.map((document) => renderDocumentListItem(document))}
            </AppCard>
          ))}

          <AppCard title="Flights" subtitle="Boarding and flight movement details for this trip.">
            {orderedVaultSections.flights.length ? (
              orderedVaultSections.flights.map((segment) =>
                renderTravelVaultCard({
                  key: segment.id,
                  icon: 'flight-takeoff',
                  title: [segment.airline, segment.flightNumber].filter(Boolean).join(' ') || 'Flight',
                  subtitle: `${formatAirportDisplay(segment.departureAirport, segment.departureAirportCode)} → ${formatAirportDisplay(segment.arrivalAirport, segment.arrivalAirportCode)}`,
                  description: formatDateTime(segment.departureTime),
                  onPress: () => router.push({ pathname: '/trip/[tripId]', params: { tripId: segment.tripId, focus: 'travel' } }),
                })
              )
            ) : (
              <EmptyState title="No flights yet" description="Saved outbound and return flights will appear here in a cleaner travel-card style." />
            )}
          </AppCard>

          <AppCard title="Train" subtitle="Rail travel saved for this trip.">
            {orderedVaultSections.trains.length ? (
              orderedVaultSections.trains.map((segment) =>
                renderTravelVaultCard({
                  key: segment.id,
                  icon: 'train',
                  title: [segment.airline, segment.flightNumber].filter(Boolean).join(' ') || 'Train service',
                  subtitle: `${segment.departureAirport} → ${segment.arrivalAirport}`,
                  description: formatDateTime(segment.departureTime),
                  onPress: () => router.push({ pathname: '/trip/[tripId]', params: { tripId: segment.tripId, focus: 'travel' } }),
                })
              )
            ) : (
              <EmptyState title="No train travel yet" description="Rail details will appear here once they are saved in the trip." />
            )}
          </AppCard>

          <AppCard title="Transfer" subtitle="Pickup, shuttle, taxi, and handoff details.">
            {orderedVaultSections.transfers.length ? (
              orderedVaultSections.transfers.map((transfer) =>
                renderTravelVaultCard({
                  key: transfer.id,
                  icon: 'swap-horiz',
                  title: transfer.provider || 'Transfer details',
                  subtitle: transfer.location || transfer.method || 'Pickup details saved',
                  description: transfer.time ? formatDateTime(transfer.time) : transfer.notes,
                  onPress: () =>
                    selectedTripId
                      ? router.push({ pathname: '/trip/[tripId]', params: { tripId: selectedTripId, focus: 'transfer' } })
                      : undefined,
                })
              )
            ) : (
              <EmptyState title="No transfers yet" description="Pickup and transfer details will appear here once they are added to the trip." />
            )}
          </AppCard>

          <AppCard title="Hotel" subtitle="Stay details and hotel cards for this trip.">
            {orderedVaultSections.hotels.length ? (
              orderedVaultSections.hotels.map((hotel) =>
                renderTravelVaultCard({
                  key: hotel.id,
                  icon: 'hotel',
                  title: hotel.hotelName,
                  subtitle: hotel.address,
                  description: `${formatShortDate(hotel.checkIn)} to ${formatShortDate(hotel.checkOut)}`,
                  onPress: () => router.push({ pathname: '/trip/[tripId]', params: { tripId: hotel.tripId, focus: 'hotel' } }),
                })
              )
            ) : (
              <EmptyState title="No hotel stay yet" description="Hotel details saved in the trip flow will appear here." />
            )}
          </AppCard>

          {orderedVaultSections.otherDocuments.length ? (
            <AppCard title="Other travel documents" subtitle="Cards, bookings, insurance, and supporting paperwork.">
              {orderedVaultSections.otherDocuments.map((document) => renderDocumentListItem(document))}
            </AppCard>
          ) : null}
        </>
      )}

      <AppModal
        visible={editorVisible}
        title={draft?.id ? 'Review document' : 'Add document'}
        onClose={() => {
          setEditorNotice(null);
          setEditorVisible(false);
          if (params.editDocumentId) {
            router.setParams({ editDocumentId: undefined });
          }
        }}
      >
        {draft ? (
          <>
            {editorNotice ? (
              <DocumentNoticeBanner tone={editorNotice.tone} title={editorNotice.title} description={editorNotice.description} />
            ) : null}
            {(draft.previewUri || draft.localFileUri) ? (
              <AppCard title="Document source" subtitle="Review the attached image or PDF before you save the record.">
                {draft.previewUri ? (
                  <View style={styles.editorPreview}>
                    <ManagedFileImage uri={draft.previewUri} mimeType={draft.mimeType} style={styles.editorPreview} contentFit="cover" />
                  </View>
                ) : (
                  <View style={[styles.editorPreview, styles.editorPreviewPlaceholder]}>
                    <MaterialIcons name={isDocumentPdfSource(draft.mimeType, draft.localFileUri) ? 'picture-as-pdf' : 'description'} size={34} color={colors.primaryBlue} />
                    <Text style={styles.meta}>Original file attached locally.</Text>
                  </View>
                )}
                {draft.localFileUri ? (
                  <AppButton
                    label={getDocumentSourceCtaLabel(isDocumentPdfSource(draft.mimeType, draft.localFileUri))}
                    tone="secondary"
                    onPress={() => openPrimarySource(draft)}
                  />
                ) : null}
              </AppCard>
            ) : null}
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
                <TypedDateField
                  label="Date of birth"
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
                <TypedDateField
                  label="Date of birth"
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
                {draft.documentType === 'loyalty_card' ? (
                  <View style={styles.field}>
                    <Text style={styles.label}>Airline program</Text>
                    <ChoiceChips<string>
                      value={airlineLoyaltyPresets.find((preset) => preset.title === (draft.formalDocumentData?.title ?? ''))?.id ?? ''}
                      onChange={(value) => {
                        const preset = airlineLoyaltyPresets.find((item) => item.id === value);
                        if (!preset) {
                          return;
                        }

                        setDraft((current) =>
                          current?.formalDocumentData
                            ? {
                                ...current,
                                formalDocumentData: {
                                  ...current.formalDocumentData,
                                  title: preset.title,
                                  issuer: preset.issuer,
                                  status: current.formalDocumentData.status || 'Member',
                                },
                              }
                            : current
                        );
                      }}
                      options={airlineLoyaltyPresets.map((preset) => ({ label: preset.title, value: preset.id }))}
                    />
                  </View>
                ) : null}
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
                {draft.documentType === 'rail_ticket' ? (
                  <>
                    <AppTextField
                      label="Traveller"
                      value={draft.formalDocumentData.travellerName ?? ''}
                      onChangeText={(value) =>
                        setDraft((current) =>
                          current?.formalDocumentData ? { ...current, formalDocumentData: { ...current.formalDocumentData, travellerName: value } } : current
                        )
                      }
                    />
                    <AppTextField
                      label="Class"
                      value={draft.formalDocumentData.railClass ?? ''}
                      onChangeText={(value) =>
                        setDraft((current) =>
                          current?.formalDocumentData ? { ...current, formalDocumentData: { ...current.formalDocumentData, railClass: value } } : current
                        )
                      }
                    />
                    <AppTextField
                      label="Ticket type"
                      value={draft.formalDocumentData.ticketType ?? ''}
                      onChangeText={(value) =>
                        setDraft((current) =>
                          current?.formalDocumentData ? { ...current, formalDocumentData: { ...current.formalDocumentData, ticketType: value } } : current
                        )
                      }
                    />
                    <AppTextField
                      label="Coach"
                      value={draft.formalDocumentData.coach ?? ''}
                      onChangeText={(value) =>
                        setDraft((current) =>
                          current?.formalDocumentData ? { ...current, formalDocumentData: { ...current.formalDocumentData, coach: value } } : current
                        )
                      }
                    />
                    <AppTextField
                      label="Seat"
                      value={draft.formalDocumentData.seat ?? ''}
                      onChangeText={(value) =>
                        setDraft((current) =>
                          current?.formalDocumentData ? { ...current, formalDocumentData: { ...current.formalDocumentData, seat: value } } : current
                        )
                      }
                    />
                    <AppTextField
                      label="Fare"
                      value={draft.formalDocumentData.fare ?? ''}
                      onChangeText={(value) =>
                        setDraft((current) =>
                          current?.formalDocumentData ? { ...current, formalDocumentData: { ...current.formalDocumentData, fare: value } } : current
                        )
                      }
                    />
                  </>
                ) : null}
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
              label={draftDateLabels?.startLabel ?? 'Issue date'}
              mode={draft.documentType === 'hire_car_booking' || draft.documentType === 'airport_lounge_pass' || draft.documentType === 'rail_ticket' ? 'datetime' : 'date'}
              value={draft.issueDate}
              onChange={(value) => setDraft((current) => (current ? { ...current, issueDate: value } : current))}
            />
            <DateTimeField
              label={draftDateLabels?.endLabel ?? 'Expiry date'}
              mode={draft.documentType === 'hire_car_booking' || draft.documentType === 'airport_lounge_pass' || draft.documentType === 'rail_ticket' ? 'datetime' : 'date'}
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

      <AppModal visible={pinPromptVisible} title="Unlock vault" onClose={closeVaultPrompt}>
        <Text style={styles.meta}>Enter your PIN to reveal sensitive previews for this session.</Text>
        <PinPad value={pin} pinLength={security.pinLength} onChange={setPin} />
        <AppButton label="Unlock with PIN" onPress={handleVaultUnlock} />
        {security.biometricEnabled ? (
          <AppButton
            label="Use biometrics"
            tone="secondary"
            onPress={async () => {
              const unlocked = await unlockWithBiometrics('vault');
              if (unlocked) {
                setPinPromptVisible(false);
                setPin('');
                const pendingAction = pendingVaultActionRef.current;
                pendingVaultActionRef.current = null;
                pendingAction?.();
              }
            }}
          />
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
        allowManagedAccess={scanViewer?.allowManagedAccess ?? true}
      />

      <DocumentAddSheet
        visible={addSheetVisible}
        importTarget={resolveImportTargetType(addDocumentType)}
        onImportTargetChange={setAddDocumentType}
        onClose={() => setAddSheetVisible(false)}
        onScanPassport={() => startDocumentFlow('scan', 'passport')}
        onScanDrivingLicence={() => startDocumentFlow('scan', 'driving_licence')}
        onScanHealthCard={() => startDocumentFlow('scan', 'ghic')}
        onAddPaymentCard={() => startDocumentFlow('manual', 'payment_card')}
        onAddFormalDocument={() => startDocumentFlow('manual', resolveFormalDocumentType(addDocumentType))}
        onImportPdfOrImage={() => startDocumentFlow('ocr_import', resolveImportTargetType(addDocumentType))}
        onManualEntry={() => startDocumentFlow('manual', resolveImportTargetType(addDocumentType))}
      />

      <DocumentScanFlowModal
        visible={Boolean(guidedScan)}
        title={
          guidedScan
            ? guidedScan.mode === 'scan'
              ? `Scan ${getScanDocumentLabel(guidedScan.documentType)}`
              : `Import ${getScanDocumentLabel(guidedScan.documentType)}`
            : 'Scan document'
        }
        stage={guidedScan?.stage ?? 'ready'}
        documentLabel={guidedScan ? getScanDocumentLabel(guidedScan.documentType) : 'Travel document'}
        previewUri={guidedScan?.previewUri}
        mimeType={guidedScan?.mimeType}
        guidance={
          guidedScan?.mode === 'scan'
            ? isLiveDocumentScannerAvailable()
              ? 'Use the live scanner to keep the document inside the frame. Pineapple will crop the edges before preparing OCR review.'
              : 'Position the document inside the frame. Keep it flat, include every edge, and avoid glare before capture.'
            : 'Choose the clearest local photo or PDF you have. Pineapple keeps the file on this device and prepares the OCR review.'
        }
        detail={guidedScan?.detail}
        warningText={guidedScan?.warningText}
        onClose={() => setGuidedScan(null)}
        primaryLabel={
          guidedScan?.stage === 'ready'
            ? guidedScan?.mode === 'scan'
              ? 'Open camera'
              : 'Choose photo'
            : undefined
        }
        onPrimaryAction={
          guidedScan?.stage === 'ready'
            ? () => handleGuidedSourcePick(guidedScan?.mode === 'scan' ? 'camera' : 'photos')
            : undefined
        }
        secondaryLabel={guidedScan?.stage === 'ready' && guidedScan?.mode === 'ocr_import' ? 'Choose PDF / image' : undefined}
        onSecondaryAction={guidedScan?.stage === 'ready' && guidedScan?.mode === 'ocr_import' ? () => handleGuidedSourcePick('files') : undefined}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.lg,
  },
  vaultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  vaultHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  vaultEyebrow: {
    color: colors.primaryBlue,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  vaultTitle: {
    color: colors.primaryBlueText,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 28,
    lineHeight: 34,
  },
  vaultSubtitle: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  vaultLockButton: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAccessRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickAccessButton: {
    flex: 1,
    minHeight: 84,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    ...shadows.card,
  },
  quickAccessLabel: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  travelVaultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  travelVaultBadge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.primaryBlueTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  travelVaultCopy: {
    flex: 1,
    gap: 2,
  },
  travelVaultTitle: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  travelVaultSubtitle: {
    color: colors.nightNavy,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  travelVaultMeta: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  warningList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: '#F4F9FF',
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  documentRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    backgroundColor: colors.white,
  },
  physicalDocumentCard: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
  },
  thumbnailPlaceholder: {
    backgroundColor: '#F4F9FF',
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  documentMetaBlock: {
    gap: spacing.xs,
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
  documentActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  documentActionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  documentActionText: {
    color: colors.primaryBlue,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  documentActionDanger: {
    color: colors.danger,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  iconColumn: {
    gap: spacing.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryBlueSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    width: '100%',
    height: 320,
    borderRadius: radii.md,
    backgroundColor: '#F4F9FF',
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    overflow: 'hidden',
  },
  editorPreview: {
    width: '100%',
    height: 220,
    borderRadius: radii.lg,
    backgroundColor: '#F4F9FF',
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    overflow: 'hidden',
  },
  editorPreviewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
