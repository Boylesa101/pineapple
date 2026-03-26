import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

type Props = {
  tripadvisorUrl: string | null;
  websiteUrl: string | null;
  onOpen: (url: string) => void;
  inverted?: boolean;
};

export function VibeSocialLinksRow({ tripadvisorUrl, websiteUrl, onOpen, inverted = false }: Props) {
  if (!tripadvisorUrl && !websiteUrl) {
    return null;
  }

  const tone = inverted ? styles.buttonInverted : styles.button;
  const iconColor = inverted ? colors.white : colors.primaryBlue;

  return (
    <View style={styles.row}>
      {websiteUrl ? (
        <Pressable accessibilityLabel="Open place website" onPress={() => onOpen(websiteUrl)} style={[styles.buttonBase, tone]}>
          <MaterialIcons name="language" size={16} color={iconColor} />
        </Pressable>
      ) : null}
      {tripadvisorUrl ? (
        <Pressable accessibilityLabel="Open Tripadvisor listing" onPress={() => onOpen(tripadvisorUrl)} style={[styles.buttonBase, tone]}>
          <MaterialIcons name="travel-explore" size={16} color={iconColor} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  buttonBase: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  buttonInverted: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
});
