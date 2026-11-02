import { useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { Button, ErrorLine, Label, OfflineBar, Sheet, Title, Toast } from '@/ui/components';
import { DriverProvider, useDriver } from './state';
import { HomeScreen, PlanScreen } from './home';
import { StopScreen } from './stop';
import { OutcomeScreen } from './outcome';
import { HistoryScreen } from './history';
import { AccountScreen, NextPlanScreen, NotificationsScreen, SuccessScreen } from './screens';
import { PasswordScreen } from './password';
import { Muted, Tile, openDeviceUrl, styles, useDriverFormat } from './shared';

function DriverNavigation() {
  const data = useDriver(); const f = useDriverFormat();
  const [opsError, setOpsError] = useState(false);
  useEffect(() => { setOpsError(false); }, [data.ops]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (data.sending) return true;
      if (data.ops) { data.closeOps(); return true; }
      if (data.page !== 'home') { data.back(); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [data]);
  return <View style={{ flex: 1 }}>
    {data.page === 'home' ? <HomeScreen /> : data.page === 'plan' ? <PlanScreen /> : data.page === 'stop' ? <StopScreen />
      : data.page === 'outcome' ? <OutcomeScreen /> : data.page === 'success' ? <SuccessScreen />
        : data.page === 'upcoming' ? <NextPlanScreen /> : data.page === 'history' ? <HistoryScreen />
          : data.page === 'notifications' ? <NotificationsScreen /> : data.page === 'pwd' ? <PasswordScreen /> : <AccountScreen />}
    {data.ops && data.context.opsPhone ? <Sheet onClose={data.closeOps}>
      <View style={styles.row}><Tile icon="headset" size={56} radius={18} /><View style={styles.grow}><Title style={{ fontSize: 20 }}>{f.t.opsTitle}</Title><Muted>{f.t.opsBody}</Muted></View></View>
      <View style={[styles.row, { padding: 14, borderRadius: 14, backgroundColor: f.colors.surface2, justifyContent: 'space-between' }]}>
        <Muted>{f.t.mobileLabel}</Muted><Label style={styles.heavy}>{f.phone(data.context.opsPhone)}</Label></View>
      <Button variant="branch" icon="phone" label={f.t.call} style={{ minHeight: 58, borderRadius: 16, backgroundColor: f.colors.success }}
        onPress={() => { setOpsError(false); void openDeviceUrl(`tel:${data.context.opsPhone}`, () => setOpsError(true)); }} />
      {opsError ? <ErrorLine>{f.t.errBody}</ErrorLine> : null}
    </Sheet> : null}
    <OfflineBar bottom={['home', 'plan', 'upcoming', 'history', 'account'].includes(data.page) ? 100
      : ['stop', 'outcome', 'pwd'].includes(data.page) ? 178 : 24} busy={data.refreshing} onRetry={() => void data.retry()} />
    <Toast text={data.toast} onDone={data.dismissToast} />
  </View>;
}
export function DriverApp() { return <DriverProvider><DriverNavigation /></DriverProvider>; }
