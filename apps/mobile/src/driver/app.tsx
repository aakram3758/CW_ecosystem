import { useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Toast } from '@/ui/components';
import { Skeleton } from './visual';
import { useOnline } from '@/providers/query';
import { usePreferences } from '@/providers/preferences';
import { Button, ErrorLine, Label, Sheet, Title, Motion, Card, Screen, useShadows } from './visual';
import { Icon } from './icons';
import { DriverProvider, useDriver } from './state';
import { HomeScreen, PlanScreen } from './home';
import { StopScreen } from './stop';
import { OutcomeScreen } from './outcome';
import { HistoryScreen } from './history';
import { AccountScreen, NextPlanScreen, NotificationsScreen, SuccessScreen } from './screens';
import { PasswordScreen } from './password';
import { ErrorState, LoadingCards, Muted, Tile, openDeviceUrl, styles, useDriverFormat } from './shared';

const offlineRed = '#EF6B5E', offlineGold = '#E8CE84', offlineInk = '#0B1B2E', offlineWhite = '#FFFFFF';
const startupNavy = '#0B2340', startupLine = 'rgba(255,255,255,.08)', startupGoldLine = 'rgba(232,206,132,.22)';

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
      <View style={[styles.row, { gap: 14 }]}><Tile icon="headset" size={56} radius={18} iconSize={30} /><View style={styles.grow}><Title style={{ fontSize: 20 }}>{f.t.opsTitle}</Title><Muted>{f.t.opsBody}</Muted></View></View>
      <View style={[styles.row, { padding: 14, borderRadius: 14, backgroundColor: f.colors.surface2, justifyContent: 'space-between' }]}>
        <Muted style={[styles.bold, { fontSize: 14 }]}>{f.t.mobileLabel}</Muted><Label style={[styles.heavy, { fontSize: 17 }]}>{f.phone(data.context.opsPhone)}</Label></View>
      <Button cwPress fontSize={18} textColor={f.colors.onSuccess} icon="phone" label={f.t.call} style={{ minHeight: 58, borderRadius: 16, backgroundColor: f.colors.success, gap: 10 }}
        onPress={() => { setOpsError(false); void openDeviceUrl(`tel:${data.context.opsPhone}`, () => setOpsError(true)); }} />
      {opsError ? <ErrorLine>{f.t.errBody}</ErrorLine> : null}
    </Sheet> : null}
    <OfflineToast />
    <Toast text={data.toast} onDone={data.dismissToast} />
  </View>;
}
export function DriverApp() { return <DriverProvider renderPending={state => <DriverStartup {...state} />}><DriverNavigation /></DriverProvider>; }

function OfflineToast() {
  const data = useDriver();
  // The outcome owns its offline alert; takeovers/password omit the toast (canvas toast.on).
  if (['outcome', 'success', 'pwd'].includes(data.page)) return null;
  return <OfflineNotice busy={data.refreshing} retry={() => void data.retry()} nav={['home', 'plan', 'upcoming', 'history', 'account'].includes(data.page)} />;
}
function OfflineNotice({ busy, retry, nav = false }: { busy: boolean; retry: () => void; nav?: boolean }) {
  const online = useOnline(); const { colors, theme } = usePreferences(); const f = useDriverFormat(); const { shadowLg } = useShadows();
  if (online) return null;
  const fg = theme === 'dark' ? offlineInk : offlineWhite;
  return <Motion kind="up" style={[shadowLg, styles.row, { position: 'absolute', left: 12, right: 12, bottom: nav ? 100 : 24, zIndex: 30, borderRadius: 16, backgroundColor: colors.toast, padding: 8, paddingLeft: 14, gap: 10 }]}>
    <Icon name="wifi-slash" size={26} color={offlineRed} /><View accessibilityLiveRegion="polite" style={styles.grow}><Title style={{ fontSize: 15, color: fg }}>{f.t.offline}</Title><Label style={{ fontFamily: 'Tajawal_500Medium', fontSize: 13, color: fg, opacity: .8 }}>{f.t.toastSub}</Label></View>
    <Button label={f.t.retry} fontSize={14} textColor={offlineInk} busy={busy} disabled={busy} onPress={retry} style={{ minHeight: 44, borderRadius: 12, paddingHorizontal: 14, backgroundColor: offlineGold }} />
  </Motion>;
}

function DriverStartup({ error, busy, retry }: { error: boolean; busy: boolean; retry: () => void }) {
  const insets = useSafeAreaInsets(); const { shadowLg } = useShadows();
  return <View style={{ flex: 1 }}><Screen topInset={false} contentStyle={{ padding: 0, gap: 0 }}>
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 84, borderBottomStartRadius: 32, borderBottomEndRadius: 32, backgroundColor: startupNavy, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 1, borderColor: startupLine, left: -90, top: -60 }} /><View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 1, borderColor: startupGoldLine, right: -60, bottom: -40 }} />
      <Image source={require('../../assets/cw-mark.png')} accessible={false} resizeMode="contain" style={{ width: 61, height: 32 }} />
      <View style={{ gap: 12, paddingTop: 22 }}><Skeleton width="72%" height={30} style={{ backgroundColor: startupLine }} /><Skeleton width="44%" height={30} style={{ backgroundColor: startupLine }} /></View>
    </View><Card style={[shadowLg, { marginTop: -56, marginHorizontal: 16, padding: 18, borderRadius: 22, gap: 16 }]}>{error ? <ErrorState home onRetry={retry} /> : <LoadingCards home />}</Card>
    </Screen><OfflineNotice busy={busy} retry={retry} /></View>;
}
