import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, shadows, spacing } from '@/constants/theme';
import { searchHotelAddresses, type HotelSearchResult } from '@/services/hotelSearchService';

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onSelectResult?: (result: HotelSearchResult) => void;
  placeholder?: string;
  helper?: string;
};

export function HotelAddressSearchField({
  label,
  value,
  onChangeText,
  onSelectResult,
  placeholder,
  helper,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<HotelSearchResult[]>([]);
  const inputRef = useRef<TextInput | null>(null);
  const selectingRef = useRef(false);

  useEffect(() => {
    const query = value.trim();
    if (!focused || query.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(() => {
      searchHotelAddresses(query)
        .then((next) => setResults(next))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 260);

    return () => clearTimeout(timeout);
  }, [focused, value]);

  function handleSelect(result: HotelSearchResult) {
    selectingRef.current = true;
    onChangeText(result.label);
    onSelectResult?.(result);
    setFocused(false);
    inputRef.current?.blur();
    setTimeout(() => {
      selectingRef.current = false;
    }, 120);
  }

  const showSuggestions = focused && (loading || results.length > 0) && value.trim().length >= 3;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
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
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primaryBlue} />
              <Text style={styles.loadingText}>Searching hotel addresses…</Text>
            </View>
          ) : (
            results.map((result) => (
              <Pressable
                key={`${result.label}:${result.latitude}:${result.longitude}`}
                onPressIn={() => handleSelect(result)}
                onPress={() => handleSelect(result)}
                style={({ pressed }) => [styles.suggestionRow, pressed ? styles.suggestionRowPressed : null]}
              >
                <View style={styles.suggestionCopy}>
                  <Text style={styles.suggestionLabel}>{result.hotelName}</Text>
                  <Text style={styles.suggestionMeta}>{result.address}</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
    zIndex: 20,
  },
  label: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  loadingText: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  suggestionRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F8',
  },
  suggestionRowPressed: {
    backgroundColor: colors.primaryBlueSurface,
  },
  suggestionCopy: {
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
    lineHeight: 17,
  },
});
