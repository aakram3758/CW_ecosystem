import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { interpolate, ltr } from '@/i18n/copy';
import { useAuth } from '@/providers/auth';
import { usePreferences } from '@/providers/preferences';
import { errorMessage } from '@/data/errors';
import { Button, Card, Icon, Label, PreferencesControls, Screen, Sheet, TextLink, Title } from '@/ui/components';
import { branchArtwork } from '@/ui/tokens';
import { BranchMap } from './location';
import { isOpen, useBranch } from './state';
import { BottomNav, Footer, IconButton, Muted, PageFrame, Pill, RequestCard, styles, Tile, useBranchFormat } from './shared';

export function useContact() {
  const { t } = useBranchFormat();
  // The prototype never dials its demo numbers. Keep that boundary for mock contacts as well.
  return (title: string, phone: string | null) => {
    if (phone) Alert.alert(title, `${phone}\n${t.dialToast}`, [{ text: t.close }]);
  };
}
export function HomeScreen() {
  const data = useBranch();
  const f = useBranchFormat();
  const { colors, t } = f;
  const contact = useContact();
  const open = data.requests.filter(isOpen);
  const next = open.filter(r => r.status === 'scheduled' && r.visit_day)
    .sort((a, b) => a.visit_day!.localeCompare(b.visit_day!))[0];
  const material = data.materials.find(m => m.id === next?.material_id);
  const days = next?.visit_day ? Math.round((Date.parse(next.visit_day) - Date.parse(data.today)) / 86400000) : 0;
  const unread = data.notifications.some(n => !n.read_at);
  return <Screen safeColor={colors.navy} contentStyle={{ padding: 0, paddingBottom: 28, gap: 0 }} footer={<BottomNav />}>
    <View style={{ backgroundColor: colors.navy, borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
      paddingTop: 8, paddingBottom: 76, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 1,
        borderColor: branchArtwork.heroLine, left: -90, top: -60 }} />
      <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 1,
        borderColor: branchArtwork.heroGoldLine, right: -60, bottom: -40 }} />
      <View style={[styles.row, { justifyContent: 'space-between', paddingHorizontal: 20 }]}>
        <Label style={[styles.heavy, { fontSize: 16, color: colors.onPrimary, flexShrink: 1 }]}>{t.splashB}</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {data.opsPhone ? <Pressable accessibilityRole="button" accessibilityLabel={t.support} onPress={() => contact(t.opsT, data.opsPhone)}
            style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: branchArtwork.heroTile, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="headset" color={colors.onPrimary} />
          </Pressable> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={t.notifs} onPress={() => data.navigate('notifs')}
            style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: branchArtwork.heroTile, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bell" color={colors.onPrimary} />
            {unread ? <View style={{ position: 'absolute', top: 9, end: 10, width: 9, height: 9, borderRadius: 5,
              backgroundColor: colors.gold, borderWidth: 2, borderColor: colors.navy }} /> : null}
          </Pressable>
        </View>
      </View>
      <View style={{ paddingTop: 22, paddingHorizontal: 20, gap: 14 }}>
        <View style={[styles.row, { gap: 6 }]}><Icon name="pin" size={18} color={colors.gold} />
          <Label style={[styles.bold, { color: colors.gold, fontSize: 14, flexShrink: 1 }]}>{data.branch.name} · {f.name(data.city)}</Label></View>
        <Title style={{ fontSize: 30, lineHeight: 39, color: colors.onPrimary }}>{t.heroQ}{'\n'}
          <Label style={{ fontSize: 30, lineHeight: 39, color: colors.gold, fontFamily: 'Tajawal_800ExtraBold' }}>{t.heroA}</Label>
        </Title>
        <Button variant="branch" tone="gold" icon="plus" label={t.newReq} onPress={() => data.startCreate()} style={{ alignSelf: 'flex-start', paddingHorizontal: 22 }} />
      </View>
    </View>
    {next && material ? <Pressable accessibilityRole="button" onPress={() => next.id && data.openRequest(next.id)} style={{ marginTop: -52, marginHorizontal: 16 }}>
      <Card style={{ borderRadius: 22, padding: 16, gap: 10 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}><Muted style={[styles.bold, { fontSize: 13 }]}>{t.nextVisit}</Muted>
          <Pill color={colors.link} background={colors.primarySoft}>{days <= 0 ? t.today : days === 1 ? t.tomorrow : days === 2 ? t.in2 : interpolate(t.inDays, { n: days })}</Pill>
        </View>
        <Title style={{ fontSize: 24, lineHeight: 30 }}>{f.date(next.visit_day, true)}</Title>
        <View style={[styles.row, { paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line }]}>
          <Tile {...f.materialStyle(material)} size={40} /><Label style={[styles.grow, styles.bold]}>{f.requestName(next)} · {f.kg(next.kg)}</Label>
          <Icon name={f.language === 'ar' ? 'caretL' : 'caretR'} color={colors.muted} />
        </View>
      </Card>
    </Pressable> : open.length ? <Card style={{ marginTop: -52, marginHorizontal: 16, borderRadius: 22 }}>
      <Label style={styles.heavy}>{t.noVisitT}</Label><Muted>{t.noVisitB}</Muted>
    </Card> : null}
    <View style={{ paddingTop: 26, paddingHorizontal: 16, gap: 10 }}>
      <View style={[styles.row, { justifyContent: 'space-between', paddingHorizontal: 4 }]}>
        <Title style={[styles.h2, styles.grow]}>{t.activeReqs} ({open.length})</Title><TextLink label={t.seeAll} onPress={() => data.navigate('reqs')} />
      </View>
      {open.slice(0, 3).map(r => <RequestCard key={r.id} row={r} />)}
    </View>
    <View style={{ paddingTop: 26, paddingHorizontal: 16, gap: 10 }}>
      <Title style={styles.h2}>{t.tipsT}</Title>
      <Card style={{ borderRadius: 18, paddingHorizontal: 14, paddingVertical: 0, gap: 0 }}>
        {[{ icon: 'stack', label: t.tip1 }, { icon: 'truck', label: t.tip2 }, { icon: 'scale', label: t.tip3 }].map((tip, i) =>
          <View key={tip.icon} style={[styles.row, { minHeight: 56, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }]}>
            <Tile icon={tip.icon} size={40} /><Label style={styles.grow}>{tip.label}</Label>
          </View>)}
      </Card>
    </View>
  </Screen>;
}
export function RequestsScreen() {
  const data = useBranch();
  const { colors, t, name, materialStyle } = useBranchFormat();
  const active = data.requests.filter(isOpen);
  const past = data.requests.filter(r => !isOpen(r));
  const rows = (data.past ? past : active).filter(r => !data.filter || r.material_id === data.filter);
  return <PageFrame title={t.reqsT} footer={<BottomNav />} top={<View style={{ paddingHorizontal: 16, paddingBottom: 10, gap: 10 }}>
    <View style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, backgroundColor: colors.surface2 }}>
      {[{ label: t.tabActive, past: false, count: active.length }, { label: t.tabPast, past: true, count: past.length }].map(item =>
        <Pressable key={item.label} accessibilityRole="tab" accessibilityState={{ selected: item.past === data.past }}
          onPress={() => data.setPast(item.past)} style={{ flex: 1, minHeight: 44, borderRadius: 11,
            backgroundColor: item.past === data.past ? colors.surface : 'transparent', justifyContent: 'center' }}>
          <Label style={[styles.bold, { textAlign: 'center', fontSize: 14, color: item.past === data.past ? colors.text : colors.muted }]}>{item.label} ({item.count})</Label>
        </Pressable>)}
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {[{ id: null, label: t.all, color: colors.muted }, ...data.materials.map(m => ({ id: m.id, label: name(m), color: materialStyle(m).color }))].map(item =>
        <Pressable key={item.id ?? 'all'} accessibilityRole="button" accessibilityState={{ selected: item.id === data.filter }}
          onPress={() => data.setFilter(item.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6,
            minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1,
            borderColor: item.id === data.filter ? colors.text : colors.line, backgroundColor: item.id === data.filter ? colors.text : colors.surface }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
          <Label style={[styles.bold, { fontSize: 14, color: item.id === data.filter ? colors.bg : colors.text }]}>{item.label}</Label>
        </Pressable>)}
    </ScrollView>
  </View>}>
    {rows.map(row => <RequestCard key={row.id} row={row} />)}
  </PageFrame>;
}
export function NotificationsScreen() {
  const data = useBranch();
  const f = useBranchFormat();
  const { t, colors } = f;
  const contact = useContact();
  return <PageFrame title={t.notifsT} footer={<BottomNav />}>
    {data.notifications.some(n => !n.read_at) ? <View style={{ alignSelf: 'flex-end' }}><TextLink label={t.markAll} onPress={data.markAllRead} /></View> : null}
    {data.notifications.map(n => {
      const material = data.materials.find(m => m.id === n.material_id);
      const request = data.requests.find(r => r.id === n.request_id);
      const phone = material?.contact_phone || data.opsPhone;
      const action = request?.status === 'needs_decision' && phone;
      const icons: Record<string, string> = { sched: 'cal', mis: 'headset', fail: 'warn', done: 'seal', morning: 'truck', closed: 'lock' };
      const warning = n.kind === 'mis' || n.kind === 'fail';
      return <Card key={n.id} style={{ borderRadius: 18, padding: 14, gap: 10, backgroundColor: n.read_at ? colors.surface : colors.primarySoft }}>
        <Pressable accessibilityRole="button" onPress={() => n.request_id && data.openRequest(n.request_id)} style={[styles.row, { alignItems: 'flex-start', minHeight: 44 }]}>
          <Tile icon={icons[n.kind] ?? 'bell'} color={warning ? colors.warning : n.kind === 'done' ? colors.success : colors.link}
            background={warning ? colors.warningSoft : n.kind === 'done' ? colors.successSoft : colors.primarySoft} />
          <View style={[styles.grow, { gap: 3 }]}>
            <View style={[styles.row, { alignItems: 'flex-start', gap: 8 }]}>
              <Label style={[styles.heavy, styles.grow, { lineHeight: 21.75 }]}>{f.language === 'ar' ? n.title_ar : n.title_en}</Label>
              {!n.read_at ? <View accessible accessibilityLabel={t.newL} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginTop: 7 }} /> : null}
            </View>
            <Muted style={{ lineHeight: 21.7 }}>{f.language === 'ar' ? n.body_ar : n.body_en}</Muted>
            <Muted style={{ fontSize: 12 }}>{f.stamp(n.created_at)}</Muted>
          </View>
        </Pressable>
        {action ? <Button variant="branch" tone="muted" icon="phone" label={t.contactMgr}
          style={{ minHeight: 44 }} onPress={() => contact(material ? interpolate(t.mgrT, { m: f.name(material) }) : t.opsT, phone)} /> : null}
      </Card>;
    })}
  </PageFrame>;
}
export function AccountScreen() {
  const data = useBranch();
  const f = useBranchFormat();
  const { colors, t } = f;
  const { copy } = usePreferences();
  const auth = useAuth();
  const contact = useContact();
  const [logout, setLogout] = useState(false);
  const [busy, setBusy] = useState(false);
  const accountRows = [{ label: t.chain, value: f.name(data.chain) }, { label: t.branchNo, value: data.branch.branch_number },
    { label: t.city, value: f.name(data.city) }, { label: t.district, value: f.name(data.district) }];
  return <>
    <PageFrame title={t.accT} footer={<BottomNav />}>
      <View style={{ backgroundColor: colors.navy, borderRadius: 22, padding: 18, gap: 14, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 1,
          borderColor: branchArtwork.heroGoldLine, start: -50, bottom: -70 }} />
        <View style={styles.row}><Tile icon="store" size={52} iconSize={28} color={colors.gold} background={branchArtwork.heroTile} />
          <View style={styles.grow}><Label style={[styles.heavy, { fontSize: 19, color: colors.onPrimary }]}>{data.branch.name}</Label>
            <Label style={{ fontSize: 13, color: colors.onPrimary, opacity: .75 }}>{t.sharedAcc}</Label></View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, columnGap: 16 }}>
          {accountRows.map(row => <View key={row.label} style={{ width: '46%', gap: 1 }}>
            <Label style={[styles.bold, { fontSize: 12, color: colors.onPrimary, opacity: .65 }]}>{row.label}</Label>
            <Label style={[styles.bold, { fontSize: 14, color: colors.onPrimary }]}>{row.value}</Label>
          </View>)}
        </View>
        <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: branchArtwork.accountLine, gap: 1 }}>
          <Label style={[styles.bold, { fontSize: 12, color: colors.onPrimary, opacity: .65 }]}>{t.address}</Label>
          <Label style={[styles.bold, { fontSize: 14, color: colors.onPrimary }]}>{data.branch.address}</Label>
        </View>
      </View>
      <Card style={{ borderRadius: 18, padding: 14, gap: 10 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}><Title style={{ fontSize: 16 }}>{t.savedLoc}</Title><Pill icon="lock">{t.viewOnly}</Pill></View>
        <BranchMap lat={data.branch.lat!} lng={data.branch.lng!} small />
        <Muted style={{ fontSize: 13 }}>{t.locLocked}</Muted>
        <Muted style={{ fontSize: 13 }}>{ltr(`${data.branch.lat?.toFixed(5)}, ${data.branch.lng?.toFixed(5)}`)}</Muted>
      </Card>
      <Card style={{ borderRadius: 18, padding: 16 }}><PreferencesControls variant="branch" /></Card>
      <Card style={{ borderRadius: 18, paddingHorizontal: 14, paddingVertical: 0, gap: 0 }}>
        {/* The existing password route is forced-change only; a voluntary flow needs its own auth contract. */}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: true }} disabled
          style={[styles.row, { minHeight: 56, opacity: .5 }]}>
          <Tile icon="key" size={40} /><Label style={[styles.grow, styles.bold]}>{t.changePass}</Label>
          <Icon name={f.language === 'ar' ? 'caretL' : 'caretR'} color={colors.muted} />
        </Pressable>
        {data.opsPhone ? <Pressable accessibilityRole="button" onPress={() => contact(t.opsT, data.opsPhone)}
          style={[styles.row, { minHeight: 56, borderTopWidth: 1, borderTopColor: colors.line }]}>
          <Tile icon="headset" size={40} /><Label style={[styles.grow, styles.bold]}>{t.contactOps}</Label>
          <Icon name={f.language === 'ar' ? 'caretL' : 'caretR'} color={colors.muted} />
        </Pressable> : null}
        <Pressable accessibilityRole="button" onPress={() => setLogout(true)} style={[styles.row, { minHeight: 56, borderTopWidth: 1, borderTopColor: colors.line }]}>
          <Tile icon="out" size={40} color={colors.dangerText} background={colors.dangerSoft} /><Label style={[styles.bold, { color: colors.dangerText }]}>{t.logout}</Label>
        </Pressable>
      </Card>
      <Muted style={{ fontSize: 12.5, textAlign: 'center' }}>{t.version}</Muted>
    </PageFrame>
    {logout ? <Sheet onClose={() => !busy && setLogout(false)}>
      <Tile icon="out" size={56} color={colors.dangerText} background={colors.dangerSoft} />
      <Title style={{ fontSize: 20 }}>{t.logoutQ}</Title><Label>{t.logoutB}</Label>
      <Button variant="branch" tone="danger" label={t.yesLogout} disabled={busy} onPress={() => {
        setBusy(true);
        void auth.signOut().catch(error => Alert.alert(t.loadErrT, errorMessage(error, copy, 'branch'), [{ text: t.close }]))
          .finally(() => setBusy(false));
      }} />
      <Button variant="branch" tone="muted" label={t.back} disabled={busy} onPress={() => setLogout(false)} />
    </Sheet> : null}
  </>;
}
export function SuccessScreen() {
  const { selected, navigate, openRequest } = useBranch();
  const f = useBranchFormat();
  return <Screen contentStyle={{ padding: 24, paddingBottom: 28, gap: 12 }} footer={<Footer>
    <Button variant="branch" label={f.t.goHome} onPress={() => navigate('home')} />
    <Button variant="branch" tone="muted" label={f.t.viewReq} onPress={() => selected?.id && openRequest(selected.id)} />
  </Footer>}>
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: f.colors.successSoft, justifyContent: 'center', alignItems: 'center' }}>
        <Icon name="seal" size={64} color={f.colors.success} />
      </View>
      <Title style={[styles.h1, { marginTop: 8, textAlign: 'center' }]}>{f.t.okT}</Title>
      {selected ? <View style={{ alignItems: 'center' }}><Pill>{interpolate(f.t.no, { id: selected.number ?? '' })} · {f.requestName(selected)} · {f.kg(selected.kg)}</Pill></View> : null}
      <Muted style={{ maxWidth: 310, textAlign: 'center' }}>{f.t.okB}</Muted>
    </View>
  </Screen>;
}
