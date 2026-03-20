import type { PropsWithChildren } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, spacing } from '@/constants/theme';

type Props = PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose: () => void;
}>;

export function AppModal({ visible, title, onClose, children }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={[colors.primaryBlueTint, colors.white]} locations={[0, 0.32]} style={StyleSheet.absoluteFillObject} />
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text style={styles.kicker}>Pineapple</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.close}>
            <MaterialIcons name="close" size={20} color={colors.primaryBlueText} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    color: colors.primaryBlue,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    color: colors.primaryBlueText,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
  },
  close: {
    width: 40,
    height: 40,
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
});
