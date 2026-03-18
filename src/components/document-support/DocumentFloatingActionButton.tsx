import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, radii, shadows, spacing } from '@/constants/theme';

type Props = {
  onPress: () => void;
};

export function DocumentFloatingActionButton({ onPress }: Props) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]} accessibilityRole="button" accessibilityLabel="Add a document">
        <MaterialIcons name="add" size={30} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.hero,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.94,
  },
});
