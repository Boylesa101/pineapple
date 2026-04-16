import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { AccordionSection } from '@/components/ui/AccordionSection';
import { colors, spacing } from '@/constants/theme';
import type { ContentSection } from '@/content/legal';

export function LegalSectionCards({ sections }: { sections: ContentSection[] }) {
  return (
    <View style={styles.wrap}>
      {sections.map((section) => (
        <AccordionSection key={section.heading} title={section.heading}>
          <AppCard>
            {section.paragraphs.map((paragraph) => (
              <Text key={paragraph} style={styles.body}>
                {paragraph}
              </Text>
            ))}
            {section.bullets?.length ? (
              <View style={styles.list}>
                {section.bullets.map((bullet) => (
                  <View key={bullet} style={styles.listItem}>
                    <View style={styles.dot} />
                    <Text style={styles.body}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </AppCard>
        </AccordionSection>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  body: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
  },
  list: {
    gap: spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginTop: 7,
    backgroundColor: colors.primaryBlue,
  },
});
