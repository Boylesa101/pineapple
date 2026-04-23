import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { AppTextField } from '@/components/AppTextField';
import { EmptyState } from '@/components/EmptyState';
import { colors, spacing } from '@/constants/theme';
import { consumePendingTripTransferTarget, decodeTripTransferPayload } from '@/services/tripTransfer';
import { useAppStore } from '@/store/useAppStore';
import { toUserMessage } from '@/utils/userErrors';

export default function TripTransferScreen() {
  const router = useRouter();
  const { payload } = useLocalSearchParams<{ payload?: string }>();
  const importSharedTripFile = useAppStore((state) => state.importSharedTripFile);
  const setActiveTrip = useAppStore((state) => state.setActiveTrip);
  const [state, setState] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Opening trip transfer…');
  const [importedTripId, setImportedTripId] = useState<string | null>(null);
  const [encryptedContents, setEncryptedContents] = useState<string | null>(null);
  const [transferCode, setTransferCode] = useState('');
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) {
      return;
    }

    hasStarted.current = true;

    if (typeof payload !== 'string' || !payload.length) {
      setState('error');
      setMessage('This trip transfer link is incomplete.');
      return;
    }

    void (async () => {
      try {
        consumePendingTripTransferTarget();
        const contents = decodeTripTransferPayload(payload);
        setEncryptedContents(contents);
        setState('ready');
        setMessage('Enter the transfer code from the sending device to decrypt this trip.');
      } catch (error) {
        setState('error');
        setMessage(toUserMessage(error, 'Pineapple could not import that transfer QR right now.'));
      }
    })();
  }, [payload]);

  async function confirmImport() {
    if (!encryptedContents) {
      return;
    }

    if (!transferCode.trim()) {
      setMessage('Enter the transfer code to decrypt this trip transfer.');
      return;
    }

    try {
      const result = await importSharedTripFile(encryptedContents, transferCode);
      setImportedTripId(result.tripId ?? null);
      setState('success');
      setMessage(
        result.mode === 'conflict'
          ? 'Pineapple stored the incoming trip as a conflict for review.'
          : 'Encrypted trip transfer imported into Pineapple.'
      );
    } catch (error) {
      setMessage(toUserMessage(error, 'Pineapple could not decrypt or import that transfer QR right now.'));
      setState('ready');
    }
  }

  return (
    <AppScreen scroll={false} contentStyle={styles.screen}>
      <AppCard
        title="Trip transfer"
        subtitle="Pineapple is importing a trip shared from another device."
        right={<MaterialIcons name="qr-code-2" size={22} color={colors.primaryBlue} />}
      >
        {state === 'loading' ? (
          <Text style={styles.body}>{message}</Text>
        ) : state === 'ready' ? (
          <View style={styles.content}>
            <Text style={styles.body}>{message}</Text>
            <AppTextField
              label="Transfer code"
              value={transferCode}
              onChangeText={setTransferCode}
              placeholder="PINE-ABCD-EFGH"
            />
            <AppButton label="Decrypt and import" onPress={() => void confirmImport()} />
          </View>
        ) : state === 'success' ? (
          <View style={styles.content}>
            <Text style={styles.body}>{message}</Text>
            <View style={styles.actions}>
              {importedTripId ? (
                <AppButton
                  label="Open trip"
                  onPress={() => {
                    setActiveTrip(importedTripId);
                    router.replace({ pathname: '/trip/[tripId]', params: { tripId: importedTripId } });
                  }}
                />
              ) : null}
              <AppButton label="Go home" tone="secondary" onPress={() => router.replace('/home')} />
            </View>
          </View>
        ) : (
          <View style={styles.content}>
            <EmptyState title="Trip transfer unavailable" description={message} />
            <AppButton label="Go home" onPress={() => router.replace('/home')} />
          </View>
        )}
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center',
  },
  content: {
    gap: spacing.md,
  },
  body: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
