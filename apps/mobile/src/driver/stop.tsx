import { Platform, View } from 'react-native';
import { Button, Card, ErrorState, Label, Title } from '@/ui/components';
import { useDriver } from './state';
import { stopState } from './model';
import { Footer, LoadingCards, MaterialPill, Muted, OpsButton, PageFrame, Pill, StoredPhoto, Tile, openDeviceUrl, styles, useDriverFormat } from './shared';

export function StopScreen() {
  const data = useDriver(); const f = useDriverFormat(); const { t, colors } = f; const row = data.selected;
  const kind = row ? stopState(row, data.today) : 'todo'; const st = f.status(kind);
  const open = (url: string) => void openDeviceUrl(url, () => data.showToast(t.errBody));
  return <PageFrame title={row ? f.title(row) : t.request} subtitle={row?.number ? `${t.request} #${row.number}` : undefined} onBack={data.back}
    footer={row && kind === 'todo' && !data.day.isError ? <Footer><Button variant="branch" icon="clip" style={{ minHeight: 60, borderRadius: 18 }}
      label={row.id && data.drafts[row.id]?.kind ? t.continueDraft : t.record}
      onPress={() => { data.clearSendError(); data.setPage('outcome'); }} /></Footer> : undefined}>
    {data.day.isPending ? <LoadingCards /> : data.day.isError || !row ? <ErrorState onRetry={() => void data.day.refetch()} /> : <>
      <Pill {...st} icon={st.icon}>{st.label}</Pill>
      {row.branch_access_notes ? <Card style={[styles.card, styles.row, { backgroundColor: colors.accentSoft }]}>
        <Tile icon="store" background={colors.surface} color={colors.accent} size={48} /><View style={styles.grow}>
          <Muted>{t.access}</Muted><Label style={[styles.heavy, { fontSize: 17 }]}>{row.branch_access_notes}</Label></View></Card> : null}
      {row.branch_address || row.contact_name || row.branch_phone || row.lat !== null && row.lng !== null ? <Card style={styles.card}>
        {row.branch_address ? <View style={styles.row}><Tile icon="pin" /><View style={styles.grow}><Muted>{t.address}</Muted><Label style={styles.bold}>{row.branch_address}</Label></View></View> : null}
        {row.lat !== null && row.lng !== null ? <Button variant="branch" icon="map-trifold" style={{ minHeight: 60, borderRadius: 16, backgroundColor: colors.navy }}
          label={t.openMaps} onPress={() => open(Platform.OS === 'android' ? `geo:${row.lat},${row.lng}?q=${row.lat},${row.lng}` : `maps:?ll=${row.lat},${row.lng}&q=${encodeURIComponent(f.title(row))}`)} /> : null}
        {row.contact_name ? <View style={[styles.row, { padding: 12, borderRadius: 16, backgroundColor: colors.surface2 }]}>
          <Tile icon="user" color={colors.success} background={colors.successSoft} /><View style={styles.grow}><Muted>{t.contactLabel}</Muted>
            <Label style={styles.heavy}>{row.contact_name}</Label>{row.contact_phone ? <Muted>{f.phone(row.contact_phone)}</Muted> : null}</View>
          {row.contact_phone ? <Button variant="branch" icon="phone" label={t.callContact} onPress={() => open(`tel:${row.contact_phone}`)} style={{ backgroundColor: colors.success, flexShrink: 1 }} /> : null}
        </View> : null}
        {row.branch_phone ? <Button variant="branch" tone="outline" icon="phone" label={t.callBranch} onPress={() => open(`tel:${row.branch_phone}`)} /> : null}
      </Card> : null}
      <Card style={styles.card}><View style={[styles.row, { flexWrap: 'wrap' }]}><Title style={{ fontSize: 17 }}>{t.request} {row.number !== null ? `#${row.number}` : ''}</Title><MaterialPill row={row} /></View>
        <View style={styles.row}><Tile icon="scale" size={48} /><View><Muted>{t.declared}</Muted><Title style={{ fontSize: 26 }}>{f.kg(row.kg)}</Title></View></View>
        {row.branch_photo_path ? <StoredPhoto path={row.branch_photo_path} label={t.branchPhoto} enlarge caption={`${t.declared} · ${f.kg(row.kg)}`} />
          : <View style={[styles.row, { padding: 14, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, backgroundColor: colors.surface2 }]}>
            <Tile icon="image" /><View style={styles.grow}><Label style={styles.heavy}>{t.noBranchPhoto}</Label><Muted>{t.noBranchPhotoSub}</Muted></View></View>}
        {row.note ? <View style={{ padding: 12, borderRadius: 14, backgroundColor: colors.surface2 }}><Muted>{t.branchNote}</Muted><Label>{row.note}</Label></View> : null}
        {row.created_at ? <Muted>{t.requestedOn} {f.date(row.created_at)}</Muted> : null}
      </Card>
      {kind !== 'todo' ? <Card style={[styles.card, { borderWidth: 1.5, borderColor: st.color }]}>
        <View style={styles.row}><Tile {...st} /><View style={styles.grow}><Muted>{t.recordedAs} · {f.time(row.last_attempt_at)}</Muted>
          <Title style={{ fontSize: 17 }}>{kind === 'full' ? t.rFull : kind === 'partial' ? t.rPartial : t.rFailed}</Title></View></View>
        {f.local(row.last_reason_ar, row.last_reason_en) ? <Label>{f.local(row.last_reason_ar, row.last_reason_en)}</Label> : null}
        {row.last_attempt_note ? <Label>{row.last_attempt_note}</Label> : null}<OpsButton wrong />
      </Card> : null}
    </>}
  </PageFrame>;
}
