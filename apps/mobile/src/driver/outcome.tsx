import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { takePhoto } from '@/data/device';
import { errorCode, errorMessage } from '@/data/errors';
import { interpolate } from '@/i18n/copy';
import { usePreferences } from '@/providers/preferences';
import { useOnline } from '@/providers/query';
import { Button, Card, ErrorLine, Field, Label, Title, Motion, press } from './visual';
import { Icon } from './icons';
import { useDriver } from './state';
import { emptyDraft, stopState, validDraft, type Outcome } from './model';
import { ErrorState, Footer, LoadingCards, Muted, PageFrame, Pill, Tile, styles, useDriverFormat } from './shared';

const photoGreen = '#19764A', white = '#FFFFFF';
export function OutcomeScreen() {
  const data = useDriver(); const f = useDriverFormat(); const { copy } = usePreferences(); const online = useOnline();
  const { t, colors } = f; const row = data.selected; const id = data.selectedId;
  const d = id ? data.drafts[id] ?? emptyDraft() : emptyDraft();
  const [cameraBusy, setCameraBusy] = useState(false); const [cameraError, setCameraError] = useState(false);
  const [reasonWidth, setReasonWidth] = useState(0);
  const busy = data.sending || cameraBusy;
  const patch = (value: Parameters<typeof data.patchDraft>[1]) => { if (id && !busy) { data.patchDraft(id, value); data.clearSendError(); } };
  async function camera() {
    if (busy || !id) return;
    setCameraBusy(true); setCameraError(false);
    const result = await takePhoto();
    if (result.ok) { data.patchDraft(id, { photo: result.photo, photoPath: null }); data.clearSendError(); }
    else if (result.reason !== 'cancelled') setCameraError(true);
    setCameraBusy(false);
  }
  const reasonValid = !!d.reasonId && (data.reasons.data ?? []).some(r => r.id === d.reasonId && r.kind === d.kind);
  const valid = validDraft(d) && (!d.reasonId || reasonValid);
  const hint = !d.kind ? '' : d.kind !== 'failed' && !d.photo ? t.needPhoto
    : d.kind === 'partial' && !reasonValid && d.note.trim().length < 3 ? t.needNote
    : d.kind === 'failed' && !d.other && !reasonValid ? t.needReason
    : d.kind === 'failed' && d.other && d.reasonText.trim().length < 3 ? t.needOther : '';
  const choices: { kind: Outcome; label: string; sub: string }[] = [
    { kind: 'full', label: t.oFull, sub: t.oFullSub }, { kind: 'partial', label: t.oPartial, sub: t.oPartialSub }, { kind: 'failed', label: t.oFailed, sub: t.oFailedSub },
  ];
  const chosen = choices.find(c => c.kind === d.kind);
  const changed = !row || stopState(row, data.today) !== 'todo';
  const reasonNeeded = d.kind === 'partial' || d.kind === 'failed';
  const kindStyle = (kind: Outcome) => ({ ...f.status(kind), color: kind === 'partial' ? colors.accent : f.status(kind).color });
  const disabled = busy || !valid || changed || (reasonNeeded && !data.reasons.data);
  const stepIndex = data.sending ? 2 : chosen ? 1 : 0;
  // The canvas's two send failures (1379): both exist only after a send was tried, and which one it
  // is depends on whether the phone is online now. Being offline before trying is not an error yet.
  const failedSend = !!data.sendError && online; const offline = !!data.sendError && !online;
  return <PageFrame title={t.outcomeTitle} titleSize={20} subtitle={row ? f.title(row) : t.request} onBack={data.back} close backDisabled={busy} motion="up"
    afterHeader={<View style={{ flexDirection: 'row', gap: 8, paddingTop: 4, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line }}>{[t.step1, t.step2, t.step3].map((label, i) => <View key={label} style={[styles.grow, { gap: 6 }]}><View style={{ height: 6, borderRadius: 9, backgroundColor: i <= stepIndex ? colors.primary : colors.line }} /><Label style={{ fontFamily: i === stepIndex ? 'Tajawal_800ExtraBold' : 'Tajawal_700Bold', fontSize: 13, color: i === stepIndex ? colors.text : colors.muted }}>{label}</Label></View>)}</View>}
    footer={chosen ? <Footer style={{ paddingTop: 10 }}>{hint && !data.sending && !failedSend && !offline ? <View style={[styles.row, { justifyContent: 'center', gap: 6 }]}><Icon name="info" size={18} color={colors.muted} /><Muted style={[styles.bold, { fontSize: 14 }]}>{hint}</Muted></View> : null}
      <Button style={{ height: 60, borderRadius: 18, gap: 10 }} fontSize={18} busy={data.sending} disabled={disabled} icon={failedSend || offline ? 'arrows-clockwise' : 'check'} label={data.sending ? t.sending : failedSend || offline ? t.retry : t.send} onPress={() => void data.send()} />
    </Footer> : undefined}>
    {failedSend ? <Motion kind="up"><View accessibilityRole="alert" style={[styles.row, { alignItems: 'flex-start', padding: 14, borderRadius: 16, backgroundColor: colors.dangerSoft, borderWidth: 1.5, borderColor: colors.danger }]}><Icon name="cloud-slash" size={30} color={colors.dangerText} /><View style={[styles.grow, { gap: 2 }]}><Title style={{ fontSize: 17, color: colors.dangerText }}>{t.notSent}</Title><Label style={{ fontSize: 15 }}>{t.keptData}</Label>{errorCode(data.sendError) ? <ErrorLine>{errorMessage(data.sendError, copy, 'driver')}</ErrorLine> : null}</View></View></Motion> : null}
    {offline ? <Motion kind="up"><View accessibilityRole="alert" style={[styles.row, { alignItems: 'flex-start', padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.text }]}><Icon name="wifi-slash" size={30} color={colors.dangerText} /><View style={[styles.grow, { gap: 2 }]}><Title style={{ fontSize: 17 }}>{t.offline}</Title><Muted>{t.offlineSub}</Muted></View></View></Motion> : null}
    {changed && !data.sending ? <ErrorState onRetry={() => void data.day.refetch()} /> : null}
    <View pointerEvents={busy || changed ? 'none' : 'auto'} style={{ gap: 14, opacity: busy ? .55 : 1 }}>
      {!chosen ? <><View style={{ gap: 6, marginTop: 4, marginBottom: 2 }}><Title style={{ fontSize: 22, lineHeight: 29.7 }}>{t.question}</Title><Pill icon="scales" iconSize={20} height={34} radius={10} padding={12} fontSize={15} weight={800} color={colors.text}>{interpolate(t.declaredQ, { n: row ? f.kg(row.kg) : '' })}</Pill></View>
        {choices.map(choice => { const st = kindStyle(choice.kind); return <Pressable key={choice.kind} accessibilityRole="button" onPress={() => patch({ kind: choice.kind, reasonId: null, other: false })} style={press}>
          <Card style={[styles.row, { borderWidth: 2, borderColor: 'transparent', borderRadius: 20, padding: 16, minHeight: 100, gap: 14 }]}><Tile {...st} size={64} radius={20} iconSize={36} /><View style={[styles.grow, { gap: 4 }]}><Title style={{ fontSize: 19, lineHeight: 24.7 }}>{choice.label}</Title><Muted>{choice.sub}</Muted></View><Icon name="fwd" size={18} color={colors.muted} /></Card></Pressable>; })}
      </> : <>
        <View style={[styles.row, { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: kindStyle(chosen.kind).background }]}><Icon name={kindStyle(chosen.kind).icon} color={kindStyle(chosen.kind).color} size={32} /><Title style={[styles.grow, { fontSize: 18 }]}>{chosen.label}</Title><Button tone="outline" fontSize={14} label={t.change} onPress={() => patch({ kind: null })} style={{ minHeight: 44, borderRadius: 12, paddingHorizontal: 14 }} /></View>
        {chosen.kind !== 'failed' ? <View style={{ gap: 10 }}><View style={[styles.row, { justifyContent: 'space-between' }]}><Title style={{ fontSize: 17 }}>{t.scalePhoto}</Title><Pill height={24} padding={8} radius={7} fontSize={12} weight={800}>{t.required}</Pill></View>
          {d.photo ? <><View style={{ height: 180, borderRadius: 18, overflow: 'hidden' }}><Image source={{ uri: d.photo.uri }} accessibilityLabel={t.scalePhoto} style={{ width: '100%', height: 180 }} /><View style={{ position: 'absolute', bottom: 10, left: 10 }}><Pill icon="check" height={32} radius={10} weight={800} color={white} background={photoGreen}>{t.photoOk}</Pill></View></View><Button tone="outline" label={t.retake} icon="arrow-counter-clockwise" iconSize={15} fontSize={15} disabled={busy} style={{ minHeight: 50, borderRadius: 14 }} onPress={() => void camera()} /></>
            : <Pressable accessibilityRole="button" accessibilityLabel={`${t.takePhoto}. ${t.photoHint}`} disabled={busy} onPress={() => void camera()} style={state => [{ height: 180, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', gap: 8 }, press(state)]}>
              <Tile icon="camera" weight="bold" size={72} radius={36} iconSize={36} color={colors.onPrimary} background={colors.primary} /><Title style={{ fontSize: 19, color: colors.primary }}>{t.takePhoto}</Title><Label style={[styles.bold, { fontSize: 14 }]}>{t.photoHint}</Label></Pressable>}
          {cameraError ? <ErrorLine>{t.errBody}</ErrorLine> : null}
        </View> : null}
        {reasonNeeded ? data.reasons.isPending ? <LoadingCards /> : data.reasons.isError ? <ErrorState onRetry={() => void data.reasons.refetch()} /> : <View style={{ gap: 10 }}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}><Title style={{ fontSize: 17 }}>{d.kind === 'partial' ? t.noteLabel : t.reasonLabel}</Title>{d.kind === 'partial' ? <Pill height={24} padding={8} radius={7} fontSize={12} weight={800}>{t.required}</Pill> : null}</View>
          <View onLayout={event => setReasonWidth((event.nativeEvent.layout.width - 10) / 2)} style={{ gap: d.kind === 'partial' ? 8 : 10, flexDirection: 'row', flexWrap: 'wrap' }}>
            {(data.reasons.data ?? []).filter(reason => reason.kind === d.kind).map(reason => d.kind === 'partial' ? <Button key={reason.id} tone="outline" selected={d.reasonId === reason.id} label={f.local(reason.label_ar, reason.label_en)} fontSize={14} weight={700} style={{ borderRadius: 12, minHeight: 44, paddingHorizontal: 14, borderColor: d.reasonId === reason.id ? colors.primary : colors.line, backgroundColor: d.reasonId === reason.id ? colors.primarySoft : colors.surface }} onPress={() => patch({ reasonId: d.reasonId === reason.id ? null : reason.id, other: false })} />
              : <ReasonTile key={reason.id} width={reasonWidth} label={f.local(reason.label_ar, reason.label_en)} selected={d.reasonId === reason.id} onPress={() => patch({ reasonId: reason.id, other: false })} />)}
            {d.kind === 'failed' ? <ReasonTile width={reasonWidth} label={t.r_other} selected={d.other} other onPress={() => patch({ other: true, reasonId: null })} /> : null}
          </View>
          {d.kind === 'partial' ? <Field accessibilityLabel={t.noteLabel} placeholder={t.notePh} value={d.note} onChangeText={note => patch({ note })} multiline numberOfLines={3} style={{ height: 99 }} /> : null}
          {d.kind === 'failed' && d.other ? <><Title style={{ fontSize: 15 }}>{t.otherLabel}</Title><Field accessibilityLabel={t.otherLabel} placeholder={t.otherPh} value={d.reasonText} onChangeText={reasonText => patch({ reasonText })} multiline numberOfLines={2} style={{ height: 75 }} /></> : null}
          <View style={[styles.row, { gap: 8, alignItems: 'flex-start' }]}><Icon name="info" size={20} color={d.kind === 'partial' ? colors.accentText : colors.muted} /><Label style={[styles.bold, styles.grow, { fontSize: 14, lineHeight: 20.3, color: d.kind === 'partial' ? colors.accentText : colors.muted }]}>{d.kind === 'partial' ? t.toManagerPartial : t.toManagerFailed}</Label></View>
        </View> : null}
      </>}
    </View>
  </PageFrame>;
}
function ReasonTile({ label, selected, other, onPress, width }: { label: string; selected: boolean; other?: boolean; onPress: () => void; width: number }) {
  const { colors } = useDriverFormat();
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={{ width, minHeight: 92, borderRadius: 16, borderWidth: 2, borderColor: selected ? colors.primary : colors.line, backgroundColor: selected ? colors.primarySoft : colors.surface, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10 }}>
    {/* reasons has no icon column. Only the canvas's local Other choice has an icon. */}
    {other ? <Icon name="dots-three-circle" size={30} color={selected ? colors.primary : colors.muted} /> : null}<Title style={{ fontSize: 15, lineHeight: 19.5, textAlign: 'center' }}>{label}</Title>
    {selected ? <View style={{ position: 'absolute', top: 8, right: 8 }}><Tile icon="check" size={22} radius={11} iconSize={13} background={colors.primary} color={colors.onPrimary} /></View> : null}
  </Pressable>;
}
