import { Tabs } from 'expo-router';

import { SafeAreaAwareBottomNav } from '@/components/ui/SafeAreaAwareBottomNav';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <SafeAreaAwareBottomNav {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="vault" options={{ title: 'Vault' }} />
      <Tabs.Screen name="sos" options={{ title: 'SOS' }} />
      <Tabs.Screen name="account" options={{ title: 'Account', href: null }} />
      <Tabs.Screen name="trips" options={{ title: 'Trips', href: null }} />
      <Tabs.Screen name="packing" options={{ href: null }} />
      <Tabs.Screen name="itinerary" options={{ href: null }} />
    </Tabs>
  );
}
