import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppModal } from '@/components/AppModal';
import { AppScreen } from '@/components/AppScreen';
import { AppTextField } from '@/components/AppTextField';
import { ChoiceChips } from '@/components/ChoiceChips';
import { DateTimeField } from '@/components/DateTimeField';
import { EmptyState } from '@/components/EmptyState';
import { PinPad } from '@/components/PinPad';
import { TripPicker } from '@/components/TripPicker';
import { colors, radii, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import type { DocumentDraft, DocumentType } from '@/types/models';
import { formatShortDate } from '@/utils/date';
import { copyIntoAppStorage } from '@/utils/fileStorage';
import { maskSensitive } from '@/utils/format';
import { getTripBundle } from '@/utils/selectors';
import { validateDocument } from '@/utils/validation';

const documentLabels: Record<DocumentType, string> = {
  passport: 'Passport',
  ghic: 'GHIC / EHIC',
  insurance: 'Insurance',
  visa: 'Visa',
  boarding_pass: 'Boarding pass',
  hotel_booking: 'Hotel booking',
  excursion_ticket: 'Excursion ticket',
  custom: 'Custom',
};

export default function VaultScreen() {
  const { data, activeTripId, setActiveTrip, saveDocument, deleteRecord, security, confirmPin, unlockWithBiometrics, unlockVault, vaultUnlockedUntil } = useAppStore();
  const [editorVisible, setEditorVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [pinPromptVisible, setPinPromptVisible] = useState(false);
  const [draft, setDraft] = useState<DocumentDraft | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const selectedTripId = activeTripId ?? data.trips[0]?.id ?? null;
  const bundle = getTripBundle(data, selectedTripId);
  const selectedDocument = bundle.documents.find((item) => item.id === selectedId) ?? null;
  const isVaultUnlocked = !!vaultUnlockedUntil && vaultUnlockedUntil > Date.now();

  if (!data.trips.length) {
    return (
      <AppScreen title="Vault">
        <AppCard>
          <EmptyState title="Vault is ready when you are" description="Create a trip first, then add passports, GHIC cards, boarding passes, insurance docs, and PDFs." />
        </AppCard>
      </AppScreen>
    );
  }

  async function handleSourcePick(source: 'files' | 'photos') {
    if (!selectedTripId) return;
    if (source === 'files') {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const localFileUri = await copyIntoAppStorage(asset.uri, 'vault', asset.mimeType);
      setDraft({
        tripId: selectedTripId,
        travellerId: null,
        holderName: '',
        documentType: 'custom',
        documentNumber: '',
        issueDate: null,
        expiryDate: null,
        notes: '',
        localFileUri,
        previewUri: asset.mimeType?.startsWith('image') ? localFileUri : null,
        mimeType: asset.mimeType ?? null,
        sensitive: true,
      });
      setEditorVisible(true);
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
      tripId: selectedTripId,
      travellerId: null,
      holderName: '',
      documentType: 'custom',
      documentNumber: '',
      issueDate: null,
      expiryDate: null,
      notes: '',
      localFileUri,
      previewUri: localFileUri,
      mimeType: asset.mimeType ?? null,
      sensitive: true,
    });
    setEditorVisible(true);
  }

  async function handleSave() {
    if (!draft) return;
    const errors = validateDocument(draft);
    if (errors.length) {
      Alert.alert('Document needs attention', errors.join('\n'));
      return;
    }
    await saveDocument(draft);
    setEditorVisible(false);
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

  const sortedDocuments = useMemo(() => [...bundle.documents], [bundle.documents]);

  return (
    <AppScreen title="Vault" subtitle="Sensitive trip documents, stored locally and hidden until you unlock them.">
      <TripPicker trips={data.trips} value={selectedTripId} onChange={setActiveTrip} />
      <AppCard title="Vault controls">
        <View style={styles.buttonRow}>
          <AppButton label="Add from files" tone="secondary" onPress={() => handleSourcePick('files')} />
          <AppButton label="Add from photos" tone="secondary" onPress={() => handleSourcePick('photos')} />
        </View>
        <AppButton label={isVaultUnlocked ? 'Vault unlocked' : 'Unlock previews'} onPress={() => setPinPromptVisible(true)} tone={isVaultUnlocked ? 'ghost' : 'primary'} />
      </AppCard>
      {sortedDocuments.length ? (
        sortedDocuments.map((document) => {
          const traveller = bundle.travellers.find((item) => item.id === document.travellerId);
          const previewUnlocked = isVaultUnlocked || !document.sensitive;
          return (
            <AppCard key={document.id}>
              <Pressable onPress={() => { setSelectedId(document.id); setDetailVisible(true); }}>
                <View style={styles.documentRow}>
                  {previewUnlocked && document.previewUri ? (
                    <Image source={document.previewUri} style={styles.thumbnail} contentFit="cover" />
                  ) : (
                    <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                      <MaterialIcons name="lock" size={22} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.copy}>
                    <Text style={styles.title}>{documentLabels[document.documentType]}</Text>
                    <Text style={styles.meta}>{document.holderName || traveller?.fullName || 'Holder not set'}</Text>
                    <Text style={styles.meta}>{previewUnlocked ? document.documentNumber || 'No number saved' : maskSensitive(document.documentNumber)}</Text>
                  </View>
                </View>
              </Pressable>
              <View style={styles.buttonRow}>
                <AppButton label="Edit" tone="secondary" onPress={() => { setDraft(document); setEditorVisible(true); }} />
                <AppButton label="Delete" tone="danger" onPress={() => deleteRecord('documents', document.id)} />
              </View>
            </AppCard>
          );
        })
      ) : (
        <AppCard>
          <EmptyState title="Vault is empty" description="Add passports, boarding passes, insurance policies, visas, hotel bookings, or any custom PDF." />
        </AppCard>
      )}

      <AppModal visible={editorVisible} title={draft?.id ? 'Edit document' : 'Add document'} onClose={() => setEditorVisible(false)}>
        {draft ? (
          <>
            <AppTextField label="Holder name" value={draft.holderName} onChangeText={(value) => setDraft((current) => current ? { ...current, holderName: value } : current)} />
            <View style={styles.field}>
              <Text style={styles.label}>Document type</Text>
              <ChoiceChips<DocumentType>
                value={draft.documentType}
                onChange={(value) => setDraft((current) => current ? { ...current, documentType: value } : current)}
                options={Object.entries(documentLabels).map(([value, label]) => ({ value: value as DocumentType, label }))}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Assigned traveller</Text>
              <ChoiceChips<string>
                value={draft.travellerId ?? 'none'}
                onChange={(value) => setDraft((current) => current ? { ...current, travellerId: value === 'none' ? null : value } : current)}
                options={[
                  { label: 'None', value: 'none' },
                  ...bundle.travellers.map((traveller) => ({ label: traveller.fullName, value: traveller.id })),
                ]}
              />
            </View>
            <AppTextField label="Document number" value={draft.documentNumber} onChangeText={(value) => setDraft((current) => current ? { ...current, documentNumber: value } : current)} />
            <DateTimeField label="Issue date" mode="date" value={draft.issueDate} onChange={(value) => setDraft((current) => current ? { ...current, issueDate: value } : current)} />
            <DateTimeField label="Expiry date" mode="date" value={draft.expiryDate} onChange={(value) => setDraft((current) => current ? { ...current, expiryDate: value } : current)} />
            <View style={styles.field}>
              <Text style={styles.label}>Sensitivity</Text>
              <ChoiceChips<'yes' | 'no'>
                value={draft.sensitive ? 'yes' : 'no'}
                onChange={(value) => setDraft((current) => current ? { ...current, sensitive: value === 'yes' } : current)}
                options={[
                  { label: 'Sensitive', value: 'yes' },
                  { label: 'Standard', value: 'no' },
                ]}
              />
            </View>
            <AppTextField label="Notes" value={draft.notes} onChangeText={(value) => setDraft((current) => current ? { ...current, notes: value } : current)} multiline />
            <AppButton label="Save document" onPress={handleSave} />
          </>
        ) : null}
      </AppModal>

      <AppModal visible={pinPromptVisible} title="Unlock vault" onClose={() => setPinPromptVisible(false)}>
        <Text style={styles.meta}>Enter your PIN to reveal sensitive previews for this session.</Text>
        <PinPad value={pin} pinLength={security.pinLength} onChange={setPin} />
        <AppButton label="Unlock with PIN" onPress={handleVaultUnlock} />
        {security.biometricEnabled ? <AppButton label="Use biometrics" tone="secondary" onPress={() => unlockWithBiometrics('vault')} /> : null}
      </AppModal>

      <AppModal visible={detailVisible} title="Document detail" onClose={() => setDetailVisible(false)}>
        {selectedDocument ? (
          <>
            {selectedDocument.sensitive && !isVaultUnlocked ? (
              <>
                <Text style={styles.meta}>Unlock the vault to reveal the preview and any sensitive values.</Text>
                <AppButton label="Unlock previews" onPress={() => setPinPromptVisible(true)} />
              </>
            ) : (
              <>
                <Text style={styles.title}>{documentLabels[selectedDocument.documentType]}</Text>
                <Text style={styles.meta}>Holder: {selectedDocument.holderName}</Text>
                <Text style={styles.meta}>Number: {selectedDocument.documentNumber || 'Not set'}</Text>
                <Text style={styles.meta}>Issue date: {formatShortDate(selectedDocument.issueDate)}</Text>
                <Text style={styles.meta}>Expiry date: {formatShortDate(selectedDocument.expiryDate)}</Text>
                {selectedDocument.previewUri ? <Image source={selectedDocument.previewUri} style={styles.preview} contentFit="contain" /> : null}
                {selectedDocument.mimeType === 'application/pdf' ? <AppButton label="Open PDF locally" tone="secondary" onPress={() => Linking.openURL(selectedDocument.localFileUri)} /> : null}
                {selectedDocument.notes ? <Text style={styles.meta}>{selectedDocument.notes}</Text> : null}
              </>
            )}
          </>
        ) : null}
      </AppModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  documentRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
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
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  preview: {
    width: '100%',
    height: 320,
    borderRadius: radii.md,
    backgroundColor: '#F8F5EE',
  },
});
