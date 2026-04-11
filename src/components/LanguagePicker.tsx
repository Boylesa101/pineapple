import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import { getLanguageMeta, supportedLanguages, type AppLanguage } from '@/i18n/config';

type Props = {
  title: string;
  description: string;
  value: AppLanguage;
  onChange: (value: AppLanguage) => void;
  showGreetingCycle?: boolean;
};

export function LanguagePicker({ title, description, value, onChange, showGreetingCycle = true }: Props) {
  const [greetingIndex, setGreetingIndex] = useState(0);
  const activeLanguage = useMemo(() => getLanguageMeta(value), [value]);

  useEffect(() => {
    if (!showGreetingCycle) {
      return;
    }

    const timer = setInterval(() => {
      setGreetingIndex((current) => (current + 1) % supportedLanguages.length);
    }, 1600);

    return () => clearInterval(timer);
  }, [showGreetingCycle]);

  return (
    <View style={styles.wrapper}>
      {showGreetingCycle ? (
        <View style={styles.greetingWrap}>
          <Text style={styles.greetingLabel}>{supportedLanguages[greetingIndex]?.greeting ?? activeLanguage.greeting}</Text>
          <Text style={styles.greetingHint}>{title}</Text>
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.grid}>
        {supportedLanguages.map((language) => {
          const selected = language.value === value;
          return (
            <Pressable
              key={language.value}
              style={[styles.option, selected ? styles.optionActive : null]}
              onPress={() => onChange(language.value)}
            >
              <View style={[styles.flagWrap, selected ? styles.flagWrapActive : null]}>
                <Text style={styles.flag}>{language.flag}</Text>
              </View>
              <Text style={[styles.optionTitle, selected ? styles.optionTitleActive : null]}>{language.nativeLabel}</Text>
              <Text style={[styles.optionSubtitle, selected ? styles.optionSubtitleActive : null]}>{language.englishLabel}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
  },
  greetingWrap: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  greetingLabel: {
    color: colors.primaryBlue,
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
    textAlign: 'center',
  },
  greetingHint: {
    color: colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  title: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  option: {
    width: '30%',
    minWidth: 92,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
    backgroundColor: colors.white,
  },
  optionActive: {
    backgroundColor: colors.primaryBlueTint,
    borderColor: colors.primaryBlue,
  },
  flagWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: colors.primaryBlueBorder,
  },
  flagWrapActive: {
    backgroundColor: '#DDEBFF',
    borderColor: colors.primaryBlue,
  },
  flag: {
    fontSize: 28,
  },
  optionTitle: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    textAlign: 'center',
  },
  optionTitleActive: {
    color: colors.primaryBlueDark,
  },
  optionSubtitle: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    textAlign: 'center',
  },
  optionSubtitleActive: {
    color: colors.primaryBlue,
  },
});
