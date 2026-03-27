import { StyleSheet, Text, View } from 'react-native';

import { ManagedFileImage } from '@/components/ManagedFileImage';
import { colors } from '@/constants/theme';

type Props = {
  label: string;
  color: string;
  imageUri?: string | null;
  size?: number;
};

export function AvatarBadge({ label, color, imageUri = null, size = 36 }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: color, width: size, height: size, borderRadius: size / 2 }]}>
      {imageUri ? (
        <ManagedFileImage uri={imageUri} style={styles.image} />
      ) : (
        <Text style={[styles.label, { fontSize: size / 2.4 }]}>{label.slice(0, 1).toUpperCase()}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  label: {
    color: colors.white,
    fontFamily: 'Poppins_600SemiBold',
  },
});
