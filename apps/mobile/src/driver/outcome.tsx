import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { takePhoto } from '@/data/device';
import { errorCode, errorMessage } from '@/data/errors';
import { interpolate } from '@/i18n/copy';
import { usePreferences } from '@/providers/preferences';
import { useOnline } from '@/providers/query';
import { Button, Card, ErrorLine, ErrorState, Field, Icon, Label, Title } from '@/ui/components';
import { useDriver } from './state';
import { emptyDraft, stopState, validDraft, type Outcome } from './model';
import { Footer, LoadingCards, Muted, PageFrame, Pill, Tile, styles, useDriverFormat } from './shared';

export function OutcomeScreen() {
  const data = useDriver(); const f = useDriverFormat(); const { copy } = usePreferences(); const online = useOnline();
  const { t, colors } = f; const row = data.selected; const id = data.selectedId;
  const d = id ? data.drafts[id] ?? emptyDraft() : emptyDraft();
  const [cameraBusy, setCameraBusy] = useState(false); const [cameraError, setCameraError] = useState(false);
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
  return <PageFrame title={t.outcomeTitle} subtitle={row ? f.title(row) : t.request} onBack={busy ? undefined : data.back}
    footer={chosen ? <Footer>{hint ? <Muted style={{ textAlign: 'center' }}>{hint}</Muted> : null}
      <Button variant="branch" style={{ minHeight: 60, borderRadius: 18 }} busy={data.sending} disabled={busy || !valid || changed || (reasonNeeded && !data.reasons.data)}
        icon={data.sending ? 'circle-notch' : data.sendError ? 'retry' : 'check'} label={data.sending ? t.sending : data.sendError ? t.retry : t.send} onPress={() => void data.send()} />
    </Footer> : undefined}>
    <View style={{ flexDirection: 'row', gap: 8 }}>{[t.step1, t.step2, t.step3].map((label, i) => <View key={label} style={[styles.grow, { gap: 6 }]}>
      <View style={{ height: 6, borderRadius: 9, backgroundColor: i <= (data.sending ? 2 : chosen ? 1 : 0) ? colors.primary : colors.line }} />
      <Label style={[styles.bold, { fontSize: 13 }]}>{label}</Label></View>)}</View>
    {data.sendError ? <Card style={[styles.card, { backgroundColor: online ? colors.dangerSoft : colors.surface,
      borderWidth: 1.5, borderColor: online ? colors.danger : colors.text }]}>
      <View accessibilityRole="alert" style={styles.row}><Icon name={online ? 'cloudX' : 'wifiOff'} color={colors.dangerText} />
        <View style={styles.grow}><Title style={{ fontSize: 17 }}>{online ? t.notSent : t.offline}</Title>
          <Label>{online ? t.keptData : t.offlineSub}</Label>
          {online && errorCode(data.sendError) ? <ErrorLine>{errorMessage(data.sendError, copy, 'driver')}</ErrorLine> : null}</View></View>
    </Card> : null}
    {changed && !data.sending ? <ErrorState onRetry={() => void data.day.refetch()} /> : null}
    <View pointerEvents={busy || changed ? 'none' : 'auto'} style={{ gap: 14, opacity: busy ? .55 : 1 }}>
      {!chosen ? <><Title style={styles.h1}>{t.question}</Title><Pill icon="scale">{interpolate(t.declaredQ, { n: row ? f.kg(row.kg) : '' })}</Pill>
        {choices.map(choice => { const st = f.status(choice.kind); return <Pressable key={choice.kind} accessibilityRole="button"
          onPress={() => patch({ kind: choice.kind, reasonId: null, other: false })}>
          <Card style={[styles.card, styles.row, { borderRadius: 20, padding: 16, minHeight: 100, gap: 14 }]}>
            <Tile {...st} size={64} radius={20} iconSize={36} /><View style={styles.grow}><Title style={{ fontSize: 19 }}>{choice.label}</Title><Muted>{choice.sub}</Muted></View>
            <Icon name={f.language === 'ar' ? 'caretL' : 'caretR'} color={colors.muted} /></Card></Pressable>; })}
      </> : <>
        <View style={[styles.row, { padding: 14, borderRadius: 18, backgroundColor: f.status(chosen.kind).background }]}>
          <Icon name={f.status(chosen.kind).icon} color={f.status(chosen.kind).color} size={32} />
          <Title style={[styles.h2, styles.grow]}>{chosen.label}</Title><Button variant="branch" tone="outline" label={t.change} onPress={() => patch({ kind: null })} />
        </View>
        {chosen.kind !== 'failed' ? <View style={{ gap: 10 }}><View style={[styles.row, { justifyContent: 'space-between' }]}><Title style={{ fontSize: 17 }}>{t.scalePhoto}</Title><Pill>{t.required}</Pill></View>
          {d.photo ? <><Image source={{ uri: d.photo.uri }} accessibilityLabel={t.scalePhoto} style={{ width: '100%', height: 180, borderRadius: 18 }} />
            <Pill icon="check" color={colors.success} background={colors.successSoft}>{t.photoOk}</Pill>
            <Button variant="branch" tone="outline" label={t.retake} icon="retry" disabled={busy} onPress={() => void camera()} /></>
            : <Pressable accessibilityRole="button" accessibilityLabel={`${t.takePhoto}. ${t.photoHint}`} disabled={busy} onPress={() => void camera()}
              style={{ minHeight: 180, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Tile icon="camera" size={72} radius={36} iconSize={36} /><Title style={{ fontSize: 19 }}>{t.takePhoto}</Title><Label>{t.photoHint}</Label></Pressable>}
          {cameraError ? <ErrorLine>{t.errBody}</ErrorLine> : null}
        </View> : null}
        {reasonNeeded ? data.reasons.isPending ? <LoadingCards /> : data.reasons.isError ? <ErrorState onRetry={() => void data.reasons.refetch()} /> : <>
          <Title style={{ fontSize: 17 }}>{d.kind === 'partial' ? t.noteLabel : t.reasonLabel}</Title>
          <View style={{ gap: 8, flexDirection: d.kind === 'partial' ? 'row' : 'column', flexWrap: 'wrap' }}>
            {(data.reasons.data ?? []).filter(reason => reason.kind === d.kind).map(reason => <Button key={reason.id} variant="branch" tone="outline"
              selected={d.reasonId === reason.id} label={f.local(reason.label_ar, reason.label_en)}
              style={{ borderRadius: d.kind === 'partial' ? 12 : 16, minHeight: d.kind === 'partial' ? 44 : 60,
                borderColor: d.reasonId === reason.id ? colors.primary : colors.line, backgroundColor: d.reasonId === reason.id ? colors.primarySoft : colors.surface }}
              onPress={() => patch({ reasonId: d.reasonId === reason.id ? null : reason.id, other: false })} />)}
            {d.kind === 'failed' ? <Button variant="branch" tone="outline" selected={d.other} label={t.r_other}
              style={{ minHeight: 60, borderColor: d.other ? colors.primary : colors.line, backgroundColor: d.other ? colors.primarySoft : colors.surface }}
              onPress={() => patch({ other: true, reasonId: null })} /> : null}
          </View>
          {d.kind === 'partial' ? <Field label={t.noteLabel} placeholder={t.notePh} value={d.note} onChangeText={note => patch({ note })} multiline style={{ minHeight: 100 }} /> : null}
          {d.kind === 'failed' && d.other ? <Field label={t.otherLabel} placeholder={t.otherPh} value={d.reasonText} onChangeText={reasonText => patch({ reasonText })} multiline style={{ minHeight: 100 }} /> : null}
          <Muted>{d.kind === 'partial' ? t.toManagerPartial : t.toManagerFailed}</Muted>
        </> : null}
      </>}
    </View>
  </PageFrame>;
}
