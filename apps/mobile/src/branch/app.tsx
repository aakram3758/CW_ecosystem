import { useEffect } from 'react';
import { BackHandler, View } from 'react-native';
import { usePreferences } from '@/providers/preferences';
import { BranchProvider, useBranch } from './state';
import { LocationScreen } from './location';
import { CreateScreen } from './create';
import { DetailsScreen } from './details';
import { AccountScreen, HomeScreen, NotificationsScreen, RequestsScreen, SuccessScreen } from './main-screens';

function BranchNavigation() {
  const data = useBranch();
  const { language } = usePreferences();
  useEffect(() => {
    if (data.page === 'create') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (data.page === 'loc') return true;
      if (data.page === 'details') { data.back(); return true; }
      if (data.page !== 'home') { data.navigate('home'); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [data]);
  return <View style={{ flex: 1, direction: language === 'ar' ? 'rtl' : 'ltr' }}>
    {data.page === 'loc' ? <LocationScreen /> : data.page === 'home' ? <HomeScreen />
      : data.page === 'create' ? <CreateScreen key={data.createKey} /> : data.page === 'success' ? <SuccessScreen />
        : data.page === 'details' ? <DetailsScreen /> : data.page === 'reqs' ? <RequestsScreen />
          : data.page === 'notifs' ? <NotificationsScreen /> : <AccountScreen />}
  </View>;
}
export function BranchApp() {
  return <BranchProvider><BranchNavigation /></BranchProvider>;
}
