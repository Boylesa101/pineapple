import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { AvatarBadge } from '@/components/AvatarBadge';
import { ChoiceChips } from '@/components/ChoiceChips';
import { ManagedFileImage } from '@/components/ManagedFileImage';
import { AppHeader } from '@/components/ui/AppHeader';
import { MiniActionCard } from '@/components/ui/MiniActionCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, radii, spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppStore } from '@/store/useAppStore';
import { chooseProfilePhoto, removeProfilePhoto } from '@/utils/profilePhotos';
import { filterVisibleTrips } from '@/utils/tripVisibility';

function initialsForName(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function AccountScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data, saveAppPreferences } = useAppStore();
  const visibleTrips = useMemo(() => filterVisibleTrips(data.trips), [data.trips]);
  const travellers = data.travellers;
  const primaryTraveller = travellers[0] ?? null;
  const fullName = primaryTraveller?.fullName || data.appPreferences.profileName || 'Pineapple traveller';
  const profilePhotoUri = data.appPreferences.profilePhotoUri;
  const travelStyle = data.appPreferences.travelStyle;
  const initials = useMemo(() => initialsForName(fullName) || 'P', [fullName]);

  async function handleProfilePhotoPress() {
    if (profilePhotoUri) {
      Alert.alert('Profile photo', 'Update or remove your account photo.', [
        {
          text: 'Change photo',
          onPress: () => {
            void (async () => {
              const nextUri = await chooseProfilePhoto(profilePhotoUri);
              if (nextUri) {
                await saveAppPreferences({ profilePhotoUri: nextUri });
              }
            })();
          },
        },
        {
          text: 'Remove photo',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await removeProfilePhoto(profilePhotoUri);
              await saveAppPreferences({ profilePhotoUri: null });
            })();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }

    const nextUri = await chooseProfilePhoto(null);
    if (nextUri) {
      await saveAppPreferences({ profilePhotoUri: nextUri });
    }
  }

  return (
    <AppScreen scroll contentStyle={styles.screen}>
      <AppHeader
        badgeLabel="A"
        title={t('account.title')}
        subtitle={t('account.subtitle')}
        actionIcon="settings"
        onActionPress={() => router.push('/settings')}
      />

      <View style={styles.profileTop}>
        <Pressable onPress={() => void handleProfilePhotoPress()} style={styles.avatar} accessibilityLabel="Add or change profile photo">
          {profilePhotoUri ? <ManagedFileImage uri={profilePhotoUri} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{initials}</Text>}
          <View style={styles.avatarEditBadge}>
            <MaterialIcons name="photo-camera" size={16} color={colors.white} />
          </View>
        </Pressable>
        <Text style={styles.profileName}>{fullName}</Text>
        <Text style={styles.profileSubtitle}>{t('account.profileSubtitle')}</Text>
        <Text style={styles.profileHint}>{profilePhotoUri ? t('account.profileHintChange') : t('account.profileHintAdd')}</Text>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{visibleTrips.length}</Text>
          <Text style={styles.statLabel}>{t('account.tripsStat')}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{data.documents.length}</Text>
          <Text style={styles.statLabel}>{t('account.docsStat')}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{travellers.length}</Text>
          <Text style={styles.statLabel}>{t('account.travellersStat')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('account.tripStyle')} />
        <AppCard>
          <ChoiceChips<typeof travelStyle>
            value={travelStyle}
            onChange={(value) => {
              void saveAppPreferences({ travelStyle: value });
            }}
            options={[
              { label: t('account.familyStyle'), value: 'family_holidays' },
              { label: t('account.cityBreaksStyle'), value: 'city_breaks' },
              { label: t('account.roadTripsStyle'), value: 'road_trips' },
              { label: t('account.mixedStyle'), value: 'mixed' },
            ]}
          />
          <Text style={styles.profileHint}>{t('account.tripStyleHint')}</Text>
        </AppCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('account.familyTravellers')} />
        <AppCard>
          {travellers.length ? (
            travellers.map((traveller, index) => (
              <Pressable key={traveller.id} onPress={() => router.push('/trips')} style={[styles.listItem, index === travellers.length - 1 ? styles.listItemLast : null]}>
                <View style={styles.rowLeft}>
                  <AvatarBadge label={traveller.fullName} color={traveller.avatarColor} imageUri={traveller.photoUri} size={34} />
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>{traveller.fullName}</Text>
                    <Text style={styles.rowDescription}>
                      {traveller.relationshipType ? `${traveller.relationshipType} traveller profile` : 'Traveller profile'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.rowAction}>{t('account.openAction')}</Text>
              </Pressable>
            ))
          ) : (
            <Pressable onPress={() => router.push('/trips')} style={[styles.listItem, styles.listItemLast]}>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{t('account.addTraveller')}</Text>
                <Text style={styles.rowDescription}>{t('account.addTravellerBody')}</Text>
              </View>
              <Text style={styles.rowAction}>{t('account.addAction')}</Text>
            </Pressable>
          )}
        </AppCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('account.accountTools')} />
        <View style={styles.grid}>
          <MiniActionCard
            style={styles.gridItem}
            icon={<MaterialIcons name="lock" size={28} color={colors.primaryBlue} />}
            title={t('account.toolSecurity')}
            description={t('account.toolSecurityBody')}
            onPress={() => router.push('/settings')}
          />
          <MiniActionCard
            style={styles.gridItem}
            icon={<MaterialIcons name="backup" size={28} color={colors.primaryBlue} />}
            title={t('account.toolBackups')}
            description={t('account.toolBackupsBody')}
            onPress={() => router.push('/settings')}
          />
          <MiniActionCard
            style={styles.gridItem}
            icon={<MaterialIcons name="upload-file" size={28} color={colors.primaryBlue} />}
            title={t('account.toolImports')}
            description={t('account.toolImportsBody')}
            onPress={() => router.push('/vault')}
          />
          <MiniActionCard
            style={styles.gridItem}
            icon={<MaterialIcons name="notifications" size={28} color={colors.primaryBlue} />}
            title={t('account.toolReminders')}
            description={t('account.toolRemindersBody')}
            onPress={() => router.push('/settings')}
          />
          <MiniActionCard
            style={styles.gridItem}
            icon={<MaterialIcons name="policy" size={28} color={colors.primaryBlue} />}
            title={t('account.toolAbout')}
            description={t('account.toolAboutBody')}
            onPress={() => router.push('/about')}
          />
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
  },
  profileTop: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarEditBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBlueDark,
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: colors.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
  },
  profileName: {
    color: colors.primaryBlueDark,
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
  },
  profileSubtitle: {
    color: '#6D8194',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  profileHint: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F3F8FF',
    borderWidth: 1,
    borderColor: '#D9E9FB',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: colors.primaryBlue,
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
  },
  statLabel: {
    color: '#6F8396',
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  section: {
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridItem: {
    width: '48%',
    alignSelf: 'flex-start',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F8',
  },
  listItemLast: {
    borderBottomWidth: 0,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  rowCopy: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    color: colors.primaryBlueText,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  rowDescription: {
    color: '#6D8194',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  rowAction: {
    color: colors.primaryBlue,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
});
