import { useEffect } from 'react';
import { BackHandler, View } from 'react-native';
import { OfflineBar, Toast } from '@/ui/components';
import { BranchProvider, useBranch } from './state';
import { ContactSheet } from './shared';
import { LocationScreen } from './location';
import { CreateScreen } from './create';
import { DetailsScreen } from './details';
import { PasswordScreen } from './password';
import { AccountScreen, HomeScreen, NotificationsScreen, RequestsScreen, SuccessScreen } from './main-screens';

function BranchNavigation() {
  const data = useBranch();
  useEffect(() => {
    if (data.page === 'create') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (data.page === 'loc') return true;
      // Both of these were opened from a tab and go back to it, rather than to home.
      if (data.page === 'details' || data.page === 'pwd') { data.back(); return true; }
      if (data.page !== 'home') { data.navigate('home'); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [data]);
  // No direction here: AppProviders sets it for the whole tree.
  return <View style={{ flex: 1 }}>
    {data.page === 'loc' ? <LocationScreen /> : data.page === 'home' ? <HomeScreen />
      : data.page === 'create' ? <CreateScreen key={data.createKey} /> : data.page === 'success' ? <SuccessScreen />
        : data.page === 'details' ? <DetailsScreen /> : data.page === 'pwd' ? <PasswordScreen />
          : data.page === 'reqs' ? <RequestsScreen />
            : data.page === 'notifs' ? <NotificationsScreen /> : <AccountScreen />}
    {/* Both of these belong to the app rather than to a page: the toast is still being read when
        the page under it has already changed, and the same contact sheet is opened from home,
        details, notifications and account. The toast is last so it draws over the page; the sheet
        is a Modal and draws over everything regardless. */}
    {data.contact ? <ContactSheet target={data.contact} onClose={data.closeContact} /> : null}
    <OfflineBar bottom={data.page === 'success' ? 24 : ['create', 'details', 'loc', 'pwd'].includes(data.page) ? 178 : 100}
      busy={data.refreshing} onRetry={data.retry} />
    <Toast text={data.toast} onDone={data.dismissToast} />
  </View>;
}
export function BranchApp() {
  return <BranchProvider><BranchNavigation /></BranchProvider>;
}
