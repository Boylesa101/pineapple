import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  searchDestinations,
  type DestinationSuggestion,
  type DestinationSuggestionType,
} from '@/data/destinations';
import { colors, radii, shadows, spacing } from '@/constants/theme';

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onSelectSuggestion?: (suggestion: DestinationSuggestion) => void;
  placeholder?: string;
  helper?: string;
};

function typeLabel(type: DestinationSuggestionType) {
  if (type === 'country') return 'Country';
  if (type === 'city') return 'City';
  if (type === 'town') return 'Town';
  return 'Region';
}

export function DestinationSearchField({
  label,
  value,
  onChangeText,
  onSelectSuggestion,
  placeholder,
  helper,
}: Props) {
  const [focused, setFocused] = useState(false);
  const suggestions = useMemo(() => searchDestinations(value), [value]);
  const showSuggestions = focused && suggestions.length > 0;

  function handleSelect(suggestion: DestinationSuggestion) {
    onChangeText(suggestion.label);
    onSelectSuggestion?.(suggestion);
    setFocused(false);
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setTimeout(() => setFocused(false), 120);
        }}
        autoCorrect={false}
        autoCapitalize="words"
      />
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      {showSuggestions ? (
        <View style={styles.suggestionCard}>
          {suggestions.map((suggestion) => (
            <Pressable
              key={`${suggestion.type}:${suggestion.label}`}
              onPress={() => handleSelect(suggestion)}
              style={({ pressed }) => [styles.suggestionRow, pressed ? styles.suggestionRowPressed : null]}
            >
              <View style={styles.suggestionCopy}>
                <Text style={styles.suggestionLabel}>{suggestion.label}</Text>
                <Text style={styles.suggestionMeta}>{typeLabel(suggestion.type)}</Text>
              </View>
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
  },
});
