import { Platform, View } from 'react-native';
import { Button, Card, Label, Title } from './visual';
import { Icon } from './icons';
import { useDriver } from './state';
import { stopState } from './model';
import { DecisionLine, ErrorState, Footer, LoadingCards, MaterialPill, Muted, OpsButton, PageFrame, Pill, StoredPhoto, Tile, openDeviceUrl, styles, useDriverFormat } from './shared';
const navy = '#0B2340', white = '#FFFFFF', gold = '#E8CE84';
export function StopScreen() {
  const data = useDriver(); const f = useDriverFormat(); const { t, colors } = f; const row = data.selected;
  const kind = row ? stopState(row, data.today) : 'todo'; const st = f.status(kind);
  const open = (url: string) => void openDeviceUrl(url, () => data.showToast(t.errBody));
  const detail = row ? [f.local(row.last_reason_ar, row.last_reason_en), row.last_attempt_note].filter(Boolean).join('\n') : '';
  // A dashboard request has no contact person: the card shows the staff member who created it, and Operations'
  // number when their profile has none.
  const admin = row?.created_via === 'dashboard';
  const contact = !row ? null : admin ? { label: t.adminLabel, icon: 'headset', name: f.local(row.creator_name, row.creator_name_en) || t.opsTitle, phone: row.creator_phone ?? data.context.opsPhone }
    : row.contact_name ? { label: t.contactLabel, icon: 'user', name: row.contact_name, phone: row.contact_phone } : null;
  return <PageFrame title={row ? f.title(row) : t.request} titleSize={20} onBack={data.back} contentStyle={data.day.isPending || data.day.isError || !row ? { padding: 16, gap: 12 } : undefined}
    subtitle={<View style={[styles.row, { gap: 8 }]}><Muted style={{ fontSize: 14 }}>{t.request} {row?.number ? `#${row.number}` : ''}</Muted><Pill {...st} icon={st.icon} iconWeight={kind === 'todo' ? 'duotone' : 'fill'} height={24} radius={8} fontSize={12} iconSize={12} padding={8} weight={800}>{st.label}</Pill></View>}
    footer={row && kind === 'todo' && !data.day.isError ? <Footer><Button cwPress icon={row.id && data.drafts[row.id]?.kind ? 'note-pencil' : 'clipboard-text'} iconSize={26} fontSize={18} style={{ height: 60, borderRadius: 18, gap: 10 }} label={row.id && data.drafts[row.id]?.kind ? t.continueDraft : t.record} onPress={() => { data.clearSendError(); data.setPage('outcome'); }} /></Footer> : undefined}>
    {data.day.isPending ? <LoadingCards /> : data.day.isError || !row ? <ErrorState onRetry={() => void data.day.refetch()} /> : <>
      {row.branch_access_notes ? <View style={[styles.row, { padding: 14, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: 'flex-start' }]}><Tile icon="door-open" background={colors.surface} color={colors.accent} size={48} radius={14} iconSize={26} /><View style={[styles.grow, { gap: 2 }]}><Label style={[styles.bold, { fontSize: 13, color: colors.accentText }]}>{t.access}</Label><Title style={{ fontSize: 17, lineHeight: 23.8 }}>{row.branch_access_notes}</Title></View></View> : null}
      {/* No call-the-branch button: the canvas never draws one (callBranch is in its copy, unused). */}
      {row.branch_address || contact || row.lat !== null && row.lng !== null ? <Card>
        {row.branch_address ? <View style={[styles.row, { alignItems: 'flex-start' }]}><Icon name="map-pin" size={26} /><View style={[styles.grow, { gap: 2 }]}><Muted style={[styles.bold, { fontSize: 13 }]}>{t.address}</Muted><Label style={[styles.bold, { fontSize: 16, lineHeight: 23.2 }]}>{row.branch_address}</Label></View></View> : null}
        {row.lat !== null && row.lng !== null ? <Button cwPress icon="map-trifold" iconSize={26} iconColor={gold} textColor={white} fontSize={18} style={{ height: 60, borderRadius: 16, backgroundColor: navy, gap: 10 }} label={t.openMaps} onPress={() => open(Platform.OS === 'android' ? `geo:${row.lat},${row.lng}?q=${row.lat},${row.lng}` : `maps:?ll=${row.lat},${row.lng}&q=${encodeURIComponent(f.title(row))}`)} /> : null}
        {contact ? <View style={[styles.row, { padding: 12, borderRadius: 16, backgroundColor: colors.surface2 }]}><Tile icon={contact.icon} size={46} radius={23} color={colors.success} background={colors.successSoft} /><View style={styles.grow}><Muted style={[styles.bold, { fontSize: 13 }]}>{contact.label}</Muted><Title style={{ fontSize: 16, lineHeight: 20.8 }}>{contact.name}</Title>{contact.phone ? <Muted style={[styles.bold, { fontSize: 14 }]}>{f.phone(contact.phone)}</Muted> : null}</View>
          {contact.phone ? <Button cwPress icon="phone" iconSize={20} label={t.call} textColor={colors.onSuccess} onPress={() => open(`tel:${contact.phone}`)} style={{ height: 54, borderRadius: 16, paddingHorizontal: 18, backgroundColor: colors.success }} /> : null}</View> : null}
      </Card> : null}
      <Card><View style={[styles.row, { justifyContent: 'space-between', gap: 8 }]}><Title style={{ fontSize: 17 }}>{t.request} {row.number !== null ? `#${row.number}` : ''}</Title><MaterialPill row={row} height={30} fontSize={14} /></View>
        <View style={styles.row}><Tile icon="scales" size={48} radius={14} iconSize={26} background={colors.surface2} color={colors.text} /><View><Muted style={[styles.bold, { fontSize: 13 }]}>{t.declared}</Muted><Title style={{ fontSize: 26, lineHeight: 31.2 }}>{f.kg(row.kg)}</Title></View></View>
        {row.branch_photo_path ? <StoredPhoto path={row.branch_photo_path} label={t.branchPhoto} enlarge caption={f.kg(row.kg)} /> : <View style={[styles.row, { padding: 14, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, backgroundColor: colors.surface2 }]}><Icon name="image" size={30} color={colors.muted} /><View style={[styles.grow, { gap: 2 }]}><Title style={{ fontSize: 15 }}>{t.noBranchPhoto}</Title><Muted style={{ fontSize: 14 }}>{t.noBranchPhotoSub}</Muted></View></View>}
        {row.note ? <View style={[styles.row, { gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 14, backgroundColor: colors.surface2 }]}><Icon name="chat-circle-text" /><View style={styles.grow}><Muted style={[styles.bold, { fontSize: 13 }]}>{admin ? t.adminNote : t.branchNote}</Muted><Label style={[styles.bold, { fontSize: 15, lineHeight: 21.75 }]}>{row.note}</Label></View></View> : null}
        {row.created_at ? <Muted style={{ fontSize: 14 }}>{t.requestedOn} {f.date(row.created_at)}</Muted> : null}
      </Card>
      {kind !== 'todo' ? <Card style={{ gap: 10, borderWidth: 1.5, borderColor: st.color }}><View style={[styles.row, { gap: 10 }]}><Icon name={st.icon} weight="fill" size={28} color={st.color} /><View style={styles.grow}><Muted style={[styles.bold, { fontSize: 13 }]}>{t.recordedAs} · {f.time(row.last_attempt_at)}</Muted><Title style={{ fontSize: 17 }}>{kind === 'full' ? t.rFull : kind === 'partial' ? t.rPartial : t.rFailed}</Title><DecisionLine row={row} fontSize={14} /></View></View>
        {detail ? <Label style={{ fontSize: 15, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.surface2 }}>{detail}</Label> : null}<OpsButton wrong /></Card> : null}
    </>}
  </PageFrame>;
}
