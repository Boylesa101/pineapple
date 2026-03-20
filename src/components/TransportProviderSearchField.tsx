import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, shadows, spacing } from '@/constants/theme';
import { searchTransportProviders, type TransportProviderSuggestion } from '@/data/transportProviders';
import type { TransportType } from '@/types/models';
import { ProviderLogoBadge } from './ProviderLogoBadge';

type Props = {
  label: string;
  value: string;
  transportType: TransportType;
  onChangeText: (value: string) => void;
  onSelectProvider?: (provider: TransportProviderSuggestion) => void;
  placeholder?: string;
  helper?: string;
};

export function TransportProviderSearchField({
  label,
  value,
  transportType,
  onChangeText,
  onSelectProvider,
  placeholder,
  helper,
}: Props) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput | null>(null);
  const selectingRef = useRef(false);
  const suggestions = useMemo(() => searchTransportProviders(value, transportType), [transportType, value]);
  const showSuggestions = focused && suggestions.length > 0;

  function handleSelect(provider: TransportProviderSuggestion) {
    selectingRef.current = true;
    onChangeText(provider.name);
    onSelectProvider?.(provider);
    setFocused(false);
    inputRef.current?.blur();
    setTimeout(() => {
      selectingRef.current = false;
    }, 120);
  }

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
          {suggestions.map((provider) => (
            <Pressable
              key={`${provider.type}:${provider.code}:${provider.name}`}
              onPress={() => handleSelect(provider)}
              style={({ pressed }) => [styles.suggestionRow, pressed ? styles.suggestionRowPressed : null]}
            >
              <ProviderLogoBadge name={provider.name} code={provider.code} logoUrl={provider.logoUrl} size={34} />
              <View style={styles.suggestionCopy}>
                <Text style={styles.suggestionLabel}>{provider.name}</Text>
                <Text style={styles.suggestionMeta}>{provider.code || provider.type.toUpperCase()}</Text>
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
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F8',
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
});
