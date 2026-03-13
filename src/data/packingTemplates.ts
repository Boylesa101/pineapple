import type { PackingCategory, PackingItemDraft, PackingPriority } from '@/types/models';

export type PackingTemplateId = 'beach_holiday' | 'city_break' | 'family_holiday' | 'kids_baby_essentials';

type TemplateSeed = {
  title: string;
  category: PackingCategory;
  quantity: number;
  luggageType: 'carry_on' | 'checked';
  priority: PackingPriority;
};

export const packingTemplates: Record<
  PackingTemplateId,
  {
    label: string;
    description: string;
    items: TemplateSeed[];
  }
> = {
  beach_holiday: {
    label: 'Beach holiday',
    description: 'Sun, swim, and easy resort essentials.',
    items: [
      { title: 'Swimwear', category: 'clothes', quantity: 2, luggageType: 'checked', priority: 'essential' },
      { title: 'Sun cream SPF 50', category: 'toiletries', quantity: 1, luggageType: 'checked', priority: 'essential' },
      { title: 'Flip flops', category: 'beach_pool', quantity: 1, luggageType: 'checked', priority: 'useful' },
      { title: 'Beach towels', category: 'beach_pool', quantity: 2, luggageType: 'checked', priority: 'useful' },
      { title: 'Portable fan', category: 'electronics', quantity: 1, luggageType: 'carry_on', priority: 'optional' },
    ],
  },
  city_break: {
    label: 'City break',
    description: 'Compact essentials for shorter urban trips.',
    items: [
      { title: 'Walking shoes', category: 'clothes', quantity: 1, luggageType: 'checked', priority: 'essential' },
      { title: 'Day bag', category: 'other', quantity: 1, luggageType: 'carry_on', priority: 'useful' },
      { title: 'Phone charger', category: 'electronics', quantity: 1, luggageType: 'carry_on', priority: 'essential' },
      { title: 'Travel card / tickets', category: 'documents', quantity: 1, luggageType: 'carry_on', priority: 'essential' },
    ],
  },
  family_holiday: {
    label: 'Family holiday',
    description: 'Shared trip items and practical family extras.',
    items: [
      { title: 'Travel adapters', category: 'electronics', quantity: 2, luggageType: 'carry_on', priority: 'essential' },
      { title: 'Snacks for journey', category: 'other', quantity: 1, luggageType: 'carry_on', priority: 'useful' },
      { title: 'Basic medicines pouch', category: 'medicines', quantity: 1, luggageType: 'carry_on', priority: 'essential' },
      { title: 'Wet wipes', category: 'kids_baby', quantity: 1, luggageType: 'carry_on', priority: 'useful' },
    ],
  },
  kids_baby_essentials: {
    label: 'Kids / baby essentials',
    description: 'Useful child-focused staples and journey helpers.',
    items: [
      { title: 'Nappies / pull-ups', category: 'kids_baby', quantity: 1, luggageType: 'checked', priority: 'essential' },
      { title: 'Favourite comfort toy', category: 'kids_baby', quantity: 1, luggageType: 'carry_on', priority: 'useful' },
      { title: 'Kids medicines', category: 'medicines', quantity: 1, luggageType: 'carry_on', priority: 'essential' },
      { title: 'Change of clothes', category: 'kids_baby', quantity: 1, luggageType: 'carry_on', priority: 'essential' },
    ],
  },
};

export function buildPackingTemplateItems(
  tripId: string,
  templateId: PackingTemplateId
): PackingItemDraft[] {
  return packingTemplates[templateId].items.map((item) => ({
    tripId,
    title: item.title,
    category: item.category,
    quantity: item.quantity,
    isPacked: false,
    luggageType: item.luggageType,
    assignmentScope: 'trip',
    travellerIds: [],
    priority: item.priority,
    notes: '',
  }));
}
