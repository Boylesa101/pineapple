import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';

type Props = {
  title: string;
  description: string;
  right?: ReactNode;
  onPress?: () => void;
  noBorder?: boolean;
};

export function SettingRow({ title, description, right, onPress, noBorder = false }: Props) {
  const content = (
    <View style={[styles.row, noBorder ? styles.noBorder : null]}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      {right}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return <Pressable onPress={onPress}>{content}</Pressable>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  description: {
    color: '#6F8396',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
});
