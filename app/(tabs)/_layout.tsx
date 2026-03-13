import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { colors } from '@/constants/theme';

const iconMap = {
  home: 'home',
  trips: 'luggage',
  packing: 'checkroom',
  itinerary: 'event-note',
  vault: 'lock',
} as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.nightNavy,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: 74,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: colors.white,
          borderTopColor: '#EBDDC3',
        },
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name={iconMap[route.name as keyof typeof iconMap]} size={size} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="trips" options={{ title: 'Trips' }} />
      <Tabs.Screen name="packing" options={{ title: 'Packing' }} />
      <Tabs.Screen name="itinerary" options={{ title: 'Itinerary' }} />
      <Tabs.Screen name="vault" options={{ title: 'Vault' }} />
    </Tabs>
  );
}
