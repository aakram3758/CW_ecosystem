import { useState } from 'react';
import { View } from 'react-native';
import { interpolate } from '@/i18n/copy';
import { Button, Card, Icon, Label, Sheet, Title } from '@/ui/components';
import { useBranch, isOpen } from './state';
import { Footer, Muted, PageFrame, Photo, styles, Tile, useBranchFormat } from './shared';
import { useContact } from './main-screens';

export function DetailsScreen() {
  const data = useBranch();
  const f = useBranchFormat();
  const { colors, t } = f;
  const contact = useContact();
  const row = data.selected;
  if (!row) return null;
  const material = data.materials.find(m => m.id === row.material_id);
  const st = f.status(row);
  const editable = row.status === 'waiting';
  const locked = row.status === 'scheduled' || row.status === 'needs_decision';
  const phone = contact.phoneFor(material);
  // The confirmation the cancel button has been waiting for since bite 2, when it was drawn
  // disabled because the state it leads to had not been reviewed yet.
  const [confirming, setConfirming] = useState(false);
  const attempts = data.attempts.filter(a => a.request_id === row.id).sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  const events = data.events.filter(e => e.request_id === row.id).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const reason = (attempt: (typeof attempts)[number]) => {
    const reasonRow = data.reasons.find(r => r.id === attempt.reason_id);
    return reasonRow ? f.language === 'ar' ? reasonRow.label_ar : reasonRow.label_en : attempt.reason_text ?? attempt.note ?? '';
  };
  const outcome = (attempt: (typeof attempts)[number]) => attempt.outcome === 'full' ? t.o_done
    : attempt.outcome === 'partial' ? t.o_mis : attempt.outcome === 'failed'
      ? interpolate(t.o_fail, { r: reason(attempt) }) : attempt.note ?? t.outcomes;
  const timeline = events.map(event => {
    const attempt = attempts.find(a => a.recorded_at === event.created_at);
    let label: string = event.note ?? t.history;
    let color: string = colors.primary;
    if (!event.from_status) label = t.ev_created;
    else if (event.from_status === event.to_status) label = t.ev_edited;
    else if (event.to_status === 'scheduled') {
      // Events have no visit_day column. A following recorded visit supplies its day; otherwise the current plan does.
      const visitDay = attempts.find(a => a.recorded_at >= event.created_at)?.visit_day ?? row.visit_day;
      label = visitDay ? interpolate(t.ev_sched, { d: f.date(visitDay, true) }) : t.visitDay;
    } else if (event.to_status === 'completed') { label = t.ev_done; color = colors.success; }
    else if (event.to_status === 'cancelled') { label = t.ev_cancel; color = colors.muted; }
    else if (event.to_status === 'closed') { label = interpolate(t.ev_closed, { r: row.closed_reason ?? '' }); color = colors.muted; }
    else if (event.to_status === 'waiting') { label = t.ev_requeue; color = colors.warning; }
    else if (attempt) { label = attempt.outcome === 'partial' ? t.ev_mis : interpolate(t.ev_fail, { r: reason(attempt) }); color = colors.warning; }
    else if (event.to_status === 'needs_decision') { label = t.pend_dec; color = colors.warning; }
    return { key: `event-${event.id}`, label, time: event.created_at, color, pending: false };
  });
  // Some outcomes arrive without a separate status transition; retain those visit rows as history too.
  attempts.filter(a => !events.some(e => e.created_at === a.recorded_at)).forEach(attempt => {
    timeline.push({ key: attempt.id, label: outcome(attempt), time: attempt.recorded_at,
      color: attempt.outcome === 'full' ? colors.success : colors.warning, pending: false });
  });
  timeline.sort((a, b) => a.time.localeCompare(b.time));
  if (editable || locked) timeline.push({ key: 'pending', label: editable ? t.pend_sched : row.status === 'scheduled'
    ? interpolate(t.pend_visit, { d: f.date(row.visit_day, true) }) : t.pend_dec,
    time: '', color: editable ? colors.line : locked ? st.color : colors.primary, pending: true });
  const subtitle = row.status === 'scheduled' ? t.sub_sched : row.status === 'needs_decision' ? t.sub_dec
    : row.status === 'completed' ? interpolate(t.sub_done, { d: f.date(row.visit_day) })
      : row.status === 'closed' ? interpolate(t.sub_closed, { r: row.closed_reason ?? '' })
        : row.status === 'cancelled' ? t.sub_cancel : t.sub_await;
  const alreadyOpen = data.requests.some(r => isOpen(r) && r.material_id === row.material_id && r.subtype_id === row.subtype_id);
  return <>
    <PageFrame title={interpolate(t.reqNo, { id: row.number ?? '' })} onBack={data.back}
      footer={<Footer>
      {editable ? <>
        <Muted style={{ textAlign: 'center', fontSize: 13 }}>{t.editHint}</Muted>
        <Button variant="branch" tone="outline" icon="pencil" label={t.editT}
          onPress={() => row.id && data.startCreate(row.material_id, row.subtype_id, row.id)} />
        <Button variant="branch" tone="text" label={t.cancelReq} onPress={() => setConfirming(true)} />
      </> : locked ? <>
        <View style={[styles.row, { justifyContent: 'center', gap: 8 }]}><Icon name="lock" size={18} color={colors.muted} />
          <Muted style={[styles.bold, { fontSize: 13.5, flexShrink: 1, textAlign: 'center' }]}>{t.lockedT}</Muted></View>
        {phone ? <Button variant="branch" icon="phone" label={t.contactMgr}
          onPress={() => contact.open(material)} /> : null}
      </> : <Button variant="branch" tone="muted" icon="plus" label={t.againSame} disabled={alreadyOpen}
        onPress={() => data.startCreate(row.material_id, row.subtype_id)} />}
    </Footer>}>
    <Card style={[styles.card, { padding: 18, backgroundColor: st.background, borderWidth: 0 }]}>
      <View style={[styles.row, { alignItems: 'flex-start' }]}><Tile icon={st.icon} color={st.color} background={colors.surface} size={52} iconSize={28} />
        <View style={[styles.grow, { gap: 4 }]}><Title style={{ fontSize: 20, lineHeight: 27 }}>{st.label}</Title>
          <Label style={{ fontSize: 14, lineHeight: 21.7, opacity: .85 }}>{subtitle}</Label></View>
      </View>
    </Card>
    <Card style={[styles.card, { paddingVertical: 4, gap: 0 }]}>
      <View style={[styles.row, { minHeight: 68, paddingVertical: 8 }]}>
        {material ? <Tile {...f.materialStyle(material)} /> : null}
        <View style={styles.grow}><Label style={[styles.heavy, { fontSize: 17 }]}>{f.requestName(row)}</Label><Muted style={{ fontSize: 13 }}>{f.stamp(row.created_at)}</Muted></View>
        <Label style={[styles.heavy, { fontSize: 18 }]}>{f.kg(row.kg)}</Label>
      </View>
      {/* Label above its value with the icon beside both, rather than the canvas's label on one
          side and value on the other — Ahmed's call after reading it on a phone, where the two
          ended up at opposite edges with a hand's width of nothing between them. This is the shape
          the create screen's review step already uses, so the two now read the same. */}
      <View style={[styles.row, { minHeight: 64, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line }]}>
        <Tile icon="cal" />
        <View style={[styles.grow, { gap: 2 }]}><Muted style={{ fontSize: 13 }}>{t.visitDay}</Muted>
          <Label style={[styles.heavy, { color: row.visit_day ? colors.text : colors.muted }]}>{f.date(row.visit_day, true)}</Label></View>
      </View>
      <View style={[styles.row, { minHeight: 64, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line }]}>
        <Tile icon="user" />
        <View style={[styles.grow, { gap: 2 }]}><Muted style={{ fontSize: 13 }}>{t.contactT}</Muted>
          <Label style={styles.heavy}>{row.contact_name}</Label>
          <Muted style={{ fontSize: 13 }}>{f.phone(row.contact_phone)}</Muted></View>
      </View>
      <View style={[styles.row, { paddingVertical: 12, alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: colors.line }]}>
        {row.branch_photo_path && material ? <Photo kg={row.kg ?? 0} material={material} size={72} /> : <Tile icon="camera" size={72} color={colors.muted} />}
        <View style={[styles.grow, { gap: 4 }]}><Muted style={{ fontSize: 13 }}>{row.branch_photo_path ? t.branchPhoto : t.noPhoto}</Muted>
          <Label style={{ fontSize: 14.5, lineHeight: 22.475 }}>{t.note}: {row.note || t.noNote}</Label></View>
      </View>
    </Card>
    {attempts.length ? <Card style={styles.card}><Title style={{ fontSize: 16 }}>{t.outcomes}</Title>
      {attempts.map(attempt => <View key={attempt.id} style={[styles.row, { alignItems: 'flex-start', gap: 10 }]}>
        <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 7, backgroundColor: attempt.outcome === 'full' ? colors.success : colors.warning }} />
        <Label style={{ flex: 1, fontSize: 14.5, lineHeight: 22.475 }}>{f.date(attempt.visit_day)} – {outcome(attempt)}</Label>
      </View>)}
    </Card> : null}
    <Card style={[styles.card, { gap: 0 }]}><Title style={{ fontSize: 16, marginBottom: 12 }}>{t.history}</Title>
      {timeline.map((event, index) => <View key={event.key} style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 16, alignItems: 'center' }}><View style={{ width: 14, height: 14, borderRadius: 7,
          marginTop: 4, borderWidth: 2, borderColor: event.color, backgroundColor: event.pending ? colors.surface : event.color }} />
          {index < timeline.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 18, backgroundColor: colors.line }} /> : null}
        </View>
        <View style={{ flex: 1, paddingBottom: 14, gap: 1 }}><Label style={{ fontFamily: event.pending ? 'Tajawal_500Medium' : 'Tajawal_700Bold',
          color: event.pending ? colors.muted : colors.text }}>{event.label}</Label>
          <Muted style={{ fontSize: 12.5 }}>{event.time ? f.stamp(event.time) : editable ? t.notSet : ''}</Muted></View>
      </View>)}
    </Card>
    </PageFrame>
    {/* The canvas's confirm sheet, the same shape the sign-out and location sheets already use: a
        56 / radius-18 tile holding the `x` icon in `colors.dangerText` on `colors.dangerSoft`, a
        20px Title, the body as a plain Label, then the two buttons stacked with `gap: 8` — the
        danger one first (`tone="danger"`, `t.yesCancel`) and `t.keep` under it as `tone="muted"`.
        Note `t.keep` («تراجع»), not `t.back`: this sheet's second button is a decision to keep the
        request, not a way back out of a screen.

        The title names the request the way the rest of the app does — `interpolate(t.cancelQ, { m:
        f.requestName(row) })`, so it reads «إلغاء طلب بلاستيك · ستريتش؟».

        On confirm: close the sheet, `data.cancelRequest(row.id)`, `data.showToast(t.cancelledT)`,
        and nothing else — the row is still the selected one and the screen stays on it, now showing
        the cancelled status card and «ألغاه الفرع» at the end of its history, which is the point of
        staying. */}
    {confirming && row.id ? <Sheet onClose={() => setConfirming(false)}>
      {/* `Tile`, which puts the radius at 16 rather than the canvas's 18. The sign-out and location
          sheets have been on Ahmed's phone at 16 since bite 2 and he approved them there, so the
          three confirm sheets stay identical to each other; a 2px difference on one of them is
          worse than the same 2px on all three. */}
      <Tile icon="x" size={56} iconSize={28} color={colors.dangerText} background={colors.dangerSoft} />
      <Title style={{ fontSize: 20 }}>{interpolate(t.cancelQ, { m: f.requestName(row) })}</Title>
      <Label>{t.cancelB}</Label>
      <View style={{ gap: 8, marginTop: 4 }}>
        <Button variant="branch" tone="danger" label={t.yesCancel} onPress={() => {
          if (!row.id) return;
          setConfirming(false); data.cancelRequest(row.id); data.showToast(t.cancelledT);
        }} />
        <Button variant="branch" tone="muted" label={t.keep} onPress={() => setConfirming(false)} />
      </View>
    </Sheet> : null}
  </>;
}
