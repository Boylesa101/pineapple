import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/constants/theme';

type Props = {
  progress: number;
  tone?: 'gold' | 'blue';
};

export function ProgressBar({ progress, tone = 'gold' }: Props) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, tone === 'blue' ? styles.blue : styles.gold, { width: `${Math.min(100, Math.max(0, progress))}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: '#EFE7D9',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  gold: {
    backgroundColor: colors.pineappleGold,
  },
  blue: {
    backgroundColor: colors.oceanBlue,
  },
});
