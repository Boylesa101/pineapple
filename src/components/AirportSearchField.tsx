import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { searchAirports, type AirportSuggestion } from '@/data/airports';
import { colors, radii, shadows, spacing } from '@/constants/theme';

type Props = {
  label: string;
  value: string;
  airportCode?: string;
  onChangeText: (value: string) => void;
  onSelectAirport?: (airport: AirportSuggestion) => void;
  placeholder?: string;
  helper?: string;
};

export function AirportSearchField({
  label,
  value,
  airportCode,
  onChangeText,
  onSelectAirport,
  placeholder,
  helper,
}: Props) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput | null>(null);
  const selectingRef = useRef(false);
  const suggestions = useMemo(() => searchAirports(value), [value]);
  const showSuggestions = focused && suggestions.length > 0;

  function handleSelect(airport: AirportSuggestion) {
    selectingRef.current = true;
    onChangeText(airport.name);
    onSelectAirport?.(airport);
    setFocused(false);
    inputRef.current?.blur();
    setTimeout(() => {
      selectingRef.current = false;
    }, 0);
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {airportCode ? <Text style={styles.codeChip}>{airportCode}</Text> : null}
      </View>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          if (selectingRef.current) {
            return;
          }
          setTimeout(() => {
            if (!selectingRef.current) {
              setFocused(false);
            }
          }, 180);
        }}
        autoCorrect={false}
        autoCapitalize="words"
      />
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      {showSuggestions ? (
        <View style={styles.suggestionCard}>
          {suggestions.map((airport) => (
            <Pressable
              key={`${airport.code}:${airport.name}`}
              onPressIn={() => handleSelect(airport)}
              onPress={() => handleSelect(airport)}
              style={({ pressed }) => [styles.suggestionRow, pressed ? styles.suggestionRowPressed : null]}
            >
              <View style={styles.suggestionCopy}>
                <Text style={styles.suggestionLabel}>{airport.name}</Text>
                <Text style={styles.suggestionMeta}>
                  {airport.city}, {airport.country}
                </Text>
              </View>
              <Text style={styles.suggestionCode}>{airport.code}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  label: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  codeChip: {
    borderRadius: radii.pill,
    backgroundColor: colors.primaryBlueSurface,
    color: colors.primaryBlue,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  input: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.nightNavy,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  helper: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  suggestionCard: {
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  suggestionRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  suggestionRowPressed: {
    backgroundColor: colors.primaryBlueSurface,
  },
  suggestionCopy: {
    flex: 1,
    gap: 2,
  },
  suggestionLabel: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  suggestionMeta: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  suggestionCode: {
    color: colors.primaryBlue,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
});
