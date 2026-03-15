import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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
import { EmptyState } from '@/components/EmptyState';
import { InfoChip } from '@/components/InfoChip';
import { MultiSelectChips } from '@/components/MultiSelectChips';
import { PinPad } from '@/components/PinPad';
import { CopyDataButton } from '@/components/passport/CopyDataButton';
import { PassportDocument } from '@/components/passport/PassportDocument';
import { VerificationBadge } from '@/components/passport/VerificationBadge';
import { TripPicker } from '@/components/TripPicker';
import { colors, radii, spacing } from '@/constants/theme';
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
import { copyIntoAppStorage } from '@/utils/fileStorage';
import { maskSensitive } from '@/utils/format';
import { buildPassportCopyPayload, ensurePassportDraftData, getPassportVerificationStatus } from '@/utils/passport';
import { applyPassportOcrToDraft, hasPassportImageForOcr } from '@/utils/passportOcr';
import { getDocumentExpiryWarnings, getTripBundle } from '@/utils/selectors';
import { validateDocument } from '@/utils/validation';

const documentLabels: Record<DocumentType, string> = {
  passport: 'Passport',
  ghic: 'GHIC / EHIC',
  insurance: 'Travel insurance',
  visa: 'Visa',
  driving_licence: 'Driving licence',
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

export default function VaultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ editDocumentId?: string }>();
  const {
    data,
    activeTripId,
    setActiveTrip,
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
  const [passportOcrLoading, setPassportOcrLoading] = useState(false);
  const openedEditIdRef = useRef<string | null>(null);
  const selectedTripId = activeTripId ?? data.trips[0]?.id ?? null;
  const bundle = getTripBundle(data, selectedTripId);
  const selectedDocument = bundle.documents.find((item) => item.id === selectedId) ?? null;
  const selectedTraveller = selectedDocument
    ? bundle.travellers.find((item) => item.id === selectedDocument.travellerId) ?? null
    : null;
  const isVaultUnlocked = !!vaultUnlockedUntil && vaultUnlockedUntil > Date.now();
  const expiryWarnings = getDocumentExpiryWarnings(bundle.documents, bundle.travellers);

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
    setDraft(document);
    setEditorVisible(true);
  }, [data.documents, params.editDocumentId, selectedTripId, setActiveTrip]);

  useEffect(() => {
    if (!detailVisible) {
      setPassportOpen(false);
    }
  }, [detailVisible, selectedId]);

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

  async function handleSourcePick(source: 'files' | 'photos') {
    if (!selectedTripId) return;
    try {
      if (source === 'files') {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'],
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets[0]) return;
        const asset = result.assets[0];
        const localFileUri = await copyIntoAppStorage(asset.uri, 'vault', asset.mimeType);
        setDraft({
          ...buildDocumentDraftDefaults({
            tripId: selectedTripId,
            localFileUri,
            previewUri: asset.mimeType?.startsWith('image') ? localFileUri : null,
            mimeType: asset.mimeType ?? null,
          }),
          expiryReminderSchedule: data.appPreferences.expiryReminderSchedule,
        });
        setEditorVisible(true);
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photos permission needed',
          'Allow photo library access if you want Pineapple to import document images from your device.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const localFileUri = await copyIntoAppStorage(asset.uri, 'vault', asset.mimeType);
      setDraft({
        ...buildDocumentDraftDefaults({
          tripId: selectedTripId,
          localFileUri,
          previewUri: localFileUri,
          mimeType: asset.mimeType ?? null,
        }),
        expiryReminderSchedule: data.appPreferences.expiryReminderSchedule,
      });
      setEditorVisible(true);
    } catch {
      Alert.alert(
        source === 'files' ? 'Import unavailable' : 'Photo import unavailable',
        source === 'files'
          ? 'Pineapple could not import that file. Try another PDF or image saved on this device.'
          : 'Pineapple could not import that image right now. Try a different photo.'
      );
    }
  }

  function openManualDocument() {
    if (!selectedTripId) return;

    setDraft({
      ...buildDocumentDraftDefaults({
        tripId: selectedTripId,
        localFileUri: '',
        previewUri: null,
        mimeType: null,
      }),
      expiryReminderSchedule: data.appPreferences.expiryReminderSchedule,
    });
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

  async function runPassportOcrOnDraft(sourceDraft: DocumentDraft, options?: { openEditor?: boolean }) {
    const openEditor = options?.openEditor ?? false;
    if (!hasPassportImageForOcr(sourceDraft)) {
      Alert.alert(
        'Image scan needed',
        sourceDraft.localFileUri
          ? 'Passport OCR currently works with image scans saved on this device. PDFs still need manual entry.'
          : 'Attach a passport image first, then Pineapple can extract the MRZ and fill the passport fields for review.'
      );
      return;
    }

    try {
      setPassportOcrLoading(true);
      const extracted = await recognizePassportScan(sourceDraft.localFileUri);
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
        extracted.source === 'mrz'
          ? 'Pineapple read the passport MRZ and filled the passport fields. Review them before saving.'
          : 'Pineapple filled the passport fields from the scan text. Review them before saving.'
      );
    } catch (error) {
      Alert.alert(
        'Passport OCR unavailable',
        error instanceof Error
          ? error.message
          : 'Pineapple could not read that passport scan right now. You can still enter the passport fields manually.'
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

    const traveller = bundle.travellers.find((item) => item.id === selectedDocument.travellerId) ?? null;
    const editableDraft = ensurePassportDraftData(selectedDocument, traveller);
    setDraft(editableDraft);
    await runPassportOcrOnDraft(editableDraft, { openEditor: true });
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
        <View style={styles.buttonRow}>
          <AppButton label="Add from files" tone="secondary" onPress={() => handleSourcePick('files')} />
          <AppButton label="Add from photos" tone="secondary" onPress={() => handleSourcePick('photos')} />
          <AppButton label="Add without file" tone="secondary" onPress={openManualDocument} />
        </View>
        <AppButton
          label={isVaultUnlocked ? 'Vault unlocked' : 'Unlock previews'}
          onPress={() => setPinPromptVisible(true)}
          tone={isVaultUnlocked ? 'ghost' : 'primary'}
        />
      </AppCard>

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
                          setDraft(document);
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
                    <Image source={document.previewUri} style={styles.thumbnail} contentFit="cover" />
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
                        setDraft(document);
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
            title="Vault is empty"
            description="Add passports, boarding passes, insurance policies, visas, hotel bookings, or any custom PDF."
          />
        </AppCard>
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

                    const traveller = bundle.travellers.find((item) => item.id === current.travellerId) ?? null;
                    return ensurePassportDraftData(
                      {
                        ...current,
                        documentType: value,
                        expiryReminderEnabled: documentTypeSupportsExpiryWarnings(value) ? current.expiryReminderEnabled : false,
                        expiryReminderSchedule: normalizeExpiryReminderSchedule(current.expiryReminderSchedule),
                      },
                      traveller
                    );
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
                    return ensurePassportDraftData(
                      {
                        ...current,
                        travellerId: value === 'trip' ? null : value,
                      },
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
              label="Document number"
              value={draft.documentNumber}
              onChangeText={(value) => setDraft((current) => (current ? { ...current, documentNumber: value } : current))}
            />
            {draft.documentType === 'passport' && draft.passportData ? (
              <>
                <View style={styles.detailHeader}>
                  <Text style={styles.label}>Passport extracted fields</Text>
                  <VerificationBadge
                    status={getPassportVerificationStatus(
                      { localFileUri: draft.localFileUri, passportData: draft.passportData },
                      bundle.travellers.find((item) => item.id === draft.travellerId) ?? null
                    )}
                  />
                </View>
                <AppButton
                  label="Extract from scan"
                  tone="secondary"
                  onPress={handleDraftPassportOcr}
                  disabled={!hasPassportImageForOcr(draft)}
                  loading={passportOcrLoading}
                />
                {!hasPassportImageForOcr(draft) ? (
                  <Text style={styles.meta}>
                    {draft.localFileUri
                      ? 'Passport OCR currently works with local image scans. PDFs still need manual review.'
                      : 'Attach a passport image to extract MRZ and identity fields automatically.'}
                  </Text>
                ) : null}
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
              </>
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
              {draft.localFileUri
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

      <AppModal visible={detailVisible} title={selectedDocument?.documentType === 'passport' ? 'Passport detail' : 'Document detail'} onClose={() => setDetailVisible(false)}>
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
                        onPress={() => {
                          setDraft(selectedDocument);
                          setDetailVisible(false);
                          setEditorVisible(true);
                        }}
                      />
                      <AppButton
                        label={selectedDocument.mimeType === 'application/pdf' ? 'View original PDF' : 'View original scan'}
                        tone="secondary"
                        onPress={() => Linking.openURL(selectedDocument.localFileUri)}
                        disabled={!selectedDocument.localFileUri}
                      />
                    </View>
                    {!selectedDocument.localFileUri ? (
                      <Text style={styles.meta}>No original scan is attached yet. You can still keep passport details and expiry tracking locally.</Text>
                    ) : null}
                    {selectedDocument.localFileUri && !hasPassportImageForOcr(selectedDocument) ? (
                      <Text style={styles.meta}>Passport OCR currently works with image scans. PDFs can still be viewed and edited manually.</Text>
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
                      <Image source={selectedDocument.previewUri} style={styles.preview} contentFit="contain" />
                    ) : null}
                    {selectedDocument.mimeType === 'application/pdf' && selectedDocument.localFileUri ? (
                      <AppButton
                        label="Open PDF locally"
                        tone="secondary"
                        onPress={() => Linking.openURL(selectedDocument.localFileUri)}
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
