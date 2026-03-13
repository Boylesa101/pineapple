import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';

type Props = {
  label: string;
  color: string;
  size?: number;
};

export function AvatarBadge({ label, color, size = 36 }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: color, width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.label, { fontSize: size / 2.4 }]}>{label.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.white,
    fontFamily: 'Poppins_600SemiBold',
  },
});
