import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, Pressable, TextInput, View } from 'react-native';
import { takePhoto, pickPhoto, type Photo as DevicePhoto } from '@/data/device';
import type { MaterialRow, SubtypeRow } from '@/data/mock/branch';
import { interpolate, ltr } from '@/i18n/copy';
import { usePreferences } from '@/providers/preferences';
import { Button, Card, ErrorLine, Field, Icon, Label, Sheet, TextLink, Title } from '@/ui/components';
import { softFill } from '@/ui/tokens';
import { isOpen, useBranch } from './state';
import { Footer, IconButton, Muted, PageFrame, Photo, Pill, styles, Tile, useBranchFormat } from './shared';

const materialHints = { card: 'materialHintCard', plas: 'materialHintPlas', paper: 'materialHintPaper',
  metal: 'materialHintMetal', bread: 'materialHintBread' } as const;
const subtypeHints = { mix: 'subtypeHintMix', stretch: 'subtypeHintStretch', iron: 'subtypeHintIron',
  copper: 'subtypeHintCopper', aluminium: 'subtypeHintAluminium' } as const;
const digits = (value: string) => value.replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632)).replace(/\D/g, '');

export function CreateScreen() {
  const data = useBranch();
  const f = useBranchFormat();
  const { copy } = usePreferences();
  const { t, colors } = f;
  const editing = data.editId ? data.requests.find(r => r.id === data.editId) : undefined;
  const [step, setStep] = useState(editing || data.initialMaterial ? 2 : 1);
  const [materialId, setMaterialId] = useState(editing?.material_id ?? data.initialMaterial);
  const [subtypeId, setSubtypeId] = useState(editing?.subtype_id ?? data.initialSubtype);
  const [kg, setKg] = useState(editing?.kg ? String(editing.kg) : '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [contactName, setContactName] = useState(editing?.contact_name ?? '');
  const [contactPhone, setContactPhone] = useState(editing?.contact_phone?.replace(/^0/, '') ?? '');
  const [photo, setPhoto] = useState<'none' | 'uploading' | 'chosen'>(editing?.branch_photo_path ? 'chosen' : 'none');
  const [chosenPhoto, setChosenPhoto] = useState<DevicePhoto | null>(null);
  const [photoError, setPhotoError] = useState('');
  const picking = useRef(false);
  const [sheetMaterial, setSheetMaterial] = useState<MaterialRow | null>(null);
  const material = data.materials.find(m => m.id === materialId);
  const subtype = data.subtypes.find(s => s.id === subtypeId);
  const materialName = material ? [f.name(material), subtype ? f.name(subtype) : null].filter(Boolean).join(' · ') : '';
  const weight = Number(kg) || 0;
  // The canvas does not disable the button and then leave you to work out why. It lets you press
  // it, and the press is what reveals the errors — `showErr` — so the form answers the question it
  // provoked. Until then nothing is red, however empty the fields are, because a form that scolds
  // you for not yet having typed is worse than one that waits.
  const [showErr, setShowErr] = useState(false);
  const weightError = kg === '' ? t.errW0 : weight < 1 ? t.errWmin : weight > 5000 ? t.errWmax : '';
  const contactError = { name: contactName.trim().length < 2, phone: !/^5[0-9]{8}$/.test(contactPhone) };
  const valid = !weightError && !contactError.name && !contactError.phone && photo !== 'uploading';
  // What is actually red right now: the weight and contact errors only after a press, the photo
  // error as soon as it happens — a device refusing the camera is not the form's complaint about
  // what you typed, so it does not wait for permission to be shown.
  const badWeight = showErr && !!weightError;
  const badName = showErr && contactError.name;
  const badPhone = showErr && contactError.phone;
  const open = data.requests.filter(r => isOpen(r) && r.id !== data.editId);
  const lockedRequest = (mid: string, sid: string | null) => open.find(r => r.material_id === mid && r.subtype_id === sid);
  const back = useCallback(() => {
    if (sheetMaterial) setSheetMaterial(null);
    else if (editing?.id) data.openRequest(editing.id);
    else if (step > 1) setStep(n => n - 1);
    else data.back();
  }, [sheetMaterial, editing?.id, step, data]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => subscription.remove();
  }, [back]);
  async function choosePhoto(camera: boolean) {
    if (picking.current) return;
    picking.current = true;
    setPhoto('uploading'); setPhotoError(''); setChosenPhoto(null);
    const result = await (camera ? takePhoto() : pickPhoto());
    picking.current = false;
    if (result.ok) { setChosenPhoto(result.photo); setPhoto('chosen'); }
    else {
      setPhoto('none');
      if (result.reason === 'denied') setPhotoError(camera ? copy.shared.camDenied : copy.shared.galDenied);
      else if (result.reason === 'failed') setPhotoError(t.photoFail);
    }
  }
  function pick(m: MaterialRow, s: SubtypeRow | null = null) {
    if (lockedRequest(m.id, s?.id ?? null)) return;
    setMaterialId(m.id); setSubtypeId(s?.id ?? null); setSheetMaterial(null); setStep(2); setShowErr(false);
  }
  /** The one footer button, whatever it says at this step. An invalid form reveals itself here. */
  function advance() {
    if (!valid) { setShowErr(true); return; }
    if (editing || step === 3) submit(); else setStep(3);
  }
  function submit() {
    if (!valid || !material || lockedRequest(material.id, subtypeId)) return;
    const args = { p_kg: weight, p_note: note.trim() || null, p_contact_name: contactName.trim(),
      p_contact_phone: `0${contactPhone}`, p_photo_path: photo === 'chosen' ? editing?.branch_photo_path ?? data.photoPath : undefined };
    if (editing?.id) data.edit({ ...args, p_request_id: editing.id });
    else data.create({ ...args, p_material_id: material.id, p_subtype_id: subtypeId });
  }
  const changeWeight = (value: number) => setKg(String(Math.max(1, Math.min(99999, value))));
  const summaryRows = [
    { label: t.material, value: materialName, icon: material ? f.materialStyle(material).icon : 'box', edit: () => setStep(1) },
    { label: t.weight, value: f.kg(weight), icon: 'scale', edit: () => setStep(2) },
    { label: t.photo, value: photo === 'chosen' ? t.photoOk : t.noPhoto, icon: 'camera', edit: () => setStep(2) },
    { label: t.contactT, value: contactName, icon: 'user', edit: () => setStep(2) },
    { label: t.note, value: note.trim() || t.noNote, icon: 'note', edit: () => setStep(2) },
  ];
  return <>
    <PageFrame title={editing ? t.editT : t.newReq} onBack={back}
      trailing={<Muted style={{ fontSize: 12 }}>{ltr(interpolate(t.stepOf, { n: step }))}</Muted>}
      top={<View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 }}>
        {[t.stepMat, t.stepWt, t.stepRev].map((label, i) => <View key={label} style={{ flex: 1, gap: 6 }}>
          <View style={{ height: 5, borderRadius: 9, backgroundColor: i < step ? colors.accent : colors.line }} />
          <Label style={{ fontSize: 12, fontFamily: 'Tajawal_700Bold', color: i + 1 === step ? colors.text : colors.muted }}>{label}</Label>
        </View>)}
      </View>}
      footer={step > 1 ? <Footer>
        {/* The canvas's `cr.showFix`: `fixErrs` above the button. `icon={null}` is `ErrorLine`'s
            summary variant — no icon, centred — because the fields it points at are the ones
            carrying the icons. Shown only once the press has happened and the form is still not
            valid. */}
        {showErr && !valid ? <ErrorLine icon={null}>{t.fixErrs}</ErrorLine> : null}
        <Button variant="branch" label={editing ? t.saveEdit : step === 2 ? t.toReview : t.send}
          icon={step === 3 ? 'send' : undefined} onPress={advance} />
      </Footer> : undefined}>
      {step === 1 ? <>
        <View style={{ gap: 4, paddingHorizontal: 4 }}><Title style={styles.h1}>{t.matQ}</Title><Muted>{t.matSub}</Muted></View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {data.materials.filter(m => m.active).sort((a, b) => a.sort_order - b.sort_order).map((m, index, all) => {
            const subs = data.subtypes.filter(s => s.active && s.material_id === m.id);
            const taken = subs.filter(s => lockedRequest(m.id, s.id));
            const lock = subs.length ? taken.length === subs.length : !!lockedRequest(m.id, null);
            const last = index === all.length - 1;
            const hintKey = materialHints[m.code as keyof typeof materialHints];
            return <View key={m.id} style={{ width: last ? '100%' : '48%', flexGrow: 1, borderWidth: 1.5,
              borderColor: materialId === m.id ? colors.accent : colors.line, borderRadius: 18,
              backgroundColor: colors.surface, overflow: 'hidden' }}>
              {/* A locked material is not a dead card: the whole thing becomes the way to the
                  request that locked it. The canvas marks the lock with nothing but the 16px icon
                  beside the name, and ours used to add a two-line band underneath explaining
                  itself. This is Ahmed's call — go past the canvas, but simpler and cleaner than
                  the band: the icon, and a pill at the end saying where it leads. The sentence
                  the band printed is still said, to a screen reader, as the card's own label. */}
              <Pressable accessibilityRole="button"
                accessibilityLabel={lock ? `${f.name(m)} — ${subs.length ? t.hasOpenAll : t.hasOpen}` : f.name(m)}
                accessibilityHint={lock ? (subs.length ? t.viewThem : t.viewIt) : undefined}
                onPress={() => {
                  if (!lock) { subs.length ? setSheetMaterial(m) : pick(m); return; }
                  if (subs.length) { data.setFilter(m.id); data.setPast(false); data.navigate('reqs'); }
                  else { const row = lockedRequest(m.id, null); if (row?.id) data.openRequest(row.id); }
                }}
                style={{ padding: 14, gap: 10, minHeight: last ? 80 : 132, flexDirection: last ? 'row' : 'column', alignItems: last ? 'center' : 'flex-start' }}>
                <Tile {...f.materialStyle(m)} size={48} iconSize={27} />
                <View style={{ flex: 1, gap: 2 }}><View style={[styles.row, { gap: 6 }]}>
                  <Label style={[styles.heavy, { fontSize: 17, flexShrink: 1 }]}>{f.name(m)}</Label>{lock ? <Icon name="lock" size={16} color={colors.muted} /> : null}
                </View>{lock ? <Pill icon={f.language === 'ar' ? 'caretL' : 'caretR'} color={colors.link}
                  background={colors.primarySoft}>{subs.length ? t.viewThem : t.viewIt}</Pill>
                  : <Muted style={{ fontSize: 12.5, lineHeight: 18.125 }}>{hintKey ? copy.shared[hintKey] : ''}</Muted>}</View>
              </Pressable>
              {!lock && taken.length ? <View style={{ backgroundColor: colors.surface2, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Muted style={{ fontSize: 12, lineHeight: 17.4 }}>{interpolate(t.partialOpen, { s: taken.map(f.name).join(' · ') })}</Muted>
              </View> : null}
            </View>;
          })}
        </View>
      </> : null}
      {step === 2 && material ? <>
        <Card style={[styles.card, styles.row, { paddingVertical: 12, paddingHorizontal: 14 }]}>
          <Tile {...f.materialStyle(material)} /><View style={styles.grow}><Muted style={{ fontSize: 13 }}>{t.material}</Muted>
            <Label style={[styles.heavy, { fontSize: 16 }]}>{materialName}</Label></View>
          {!editing ? <TextLink label={t.change} onPress={() => setStep(1)} /> : null}
        </Card>
        {editing ? <Muted style={{ fontSize: 12.5 }}>{t.editLock}</Muted> : null}
        {/* The whole card's border turns `colors.danger`, not just the box inside it — the canvas
            marks the card so the error is findable while scrolling, and the box so it is obvious
            which control is wrong. Both come from `badWeight`. */}
        <Card style={[styles.card, badWeight ? { borderColor: colors.danger } : null]}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}><Label style={[styles.heavy, { fontSize: 16 }]}>{t.weight}</Label><Pill>{t.required}</Pill></View>
          <View style={[styles.row, { gap: 10 }]}>
            <IconButton icon="plus" label={`+1 ${t.kgUnit}`} onPress={() => changeWeight(weight + 1)} style={{ width: 56, height: 56 }} />
            <View style={{ flex: 1, height: 64, flexDirection: 'row', direction: 'ltr', alignItems: 'center', justifyContent: 'center',
              gap: 6, paddingHorizontal: 10, borderWidth: 1.5, borderColor: badWeight ? colors.danger : colors.line, borderRadius: 16 }}>
              <TextInput accessibilityLabel={t.weight} keyboardType="number-pad" value={kg} placeholder={String(0)}
                placeholderTextColor={colors.muted} onChangeText={value => setKg(digits(value).replace(/^0+(?=\d)/, '').slice(0, 5))}
                style={{ flex: 1, height: 64, minWidth: 0, textAlign: 'center', color: colors.text, fontSize: 32, fontFamily: 'Tajawal_800ExtraBold' }} />
              <Muted style={[styles.bold, { fontSize: 16 }]}>{t.kgUnit}</Muted>
            </View>
            <IconButton icon="minus" label={`−1 ${t.kgUnit}`} onPress={() => changeWeight(weight - 1)} style={{ width: 56, height: 56 }} />
          </View>
          <View style={{ flexDirection: 'row', direction: 'ltr', gap: 8, justifyContent: 'center' }}>
            {[10,50,100].map(n => <Pressable key={n} accessibilityRole="button" onPress={() => changeWeight(weight + n)}
              style={{ minHeight: 44, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 999, backgroundColor: colors.surface2, justifyContent: 'center' }}>
              <Label style={styles.bold}>{`+${n}`}</Label>
            </Pressable>)}
          </View>
          {/* Three lines that take the same slot, in the canvas's order of precedence:
              - the error, when `badWeight` — an `ErrorLine` carrying `weightError`;
              - otherwise the large-weight warning, whenever the number is over 1,000 and is not
                itself an error (so 6,000 kg is a mistake to fix, not a quantity to double-check);
              - otherwise the hint. The canvas's own condition for the hint is
                `!badWeight && !(weight > 1000 && !weightError)`, which is what is written here:
                it stays visible while an over-5,000 number has not yet been pressed at. */}
          {badWeight ? <ErrorLine>{weightError}</ErrorLine>
            : !weightError && weight > 1000 ? <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start',
              paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.warningSoft }}>
              <Icon name="info" size={18} color={colors.warning} tint={softFill(colors.warning)} />
              <Label style={[styles.bold, { flex: 1, fontSize: 13, lineHeight: 19.5, color: colors.warning }]}>{t.warnW}</Label></View>
            : <Muted style={{ fontSize: 13, textAlign: 'center' }}>{t.weightHint}</Muted>}
        </Card>
        {/* The photo card marks itself the moment the device refuses — `photoError` is not gated on
            `showErr`, because it is not a complaint about what was typed. The two dashed buttons
            take the same colour on their dashed border. */}
        <Card style={[styles.card, photoError ? { borderColor: colors.danger } : null]}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}><Label style={[styles.heavy, { fontSize: 16 }]}>{t.photo}</Label><Pill>{t.optional}</Pill></View>
          <View style={[styles.row, { alignItems: 'flex-start', gap: 10 }]}><Icon name="scale" /><Label style={{ flex: 1, fontSize: 13.5, lineHeight: 21.6 }}>{t.photoGuide}</Label></View>
          {photo === 'none' ? <View style={{ flexDirection: 'row', gap: 10 }}>
            {[{ icon: 'camera', label: t.takePhoto }, { icon: 'image', label: t.gallery }].map(item => <Pressable key={item.icon}
              accessibilityRole="button" onPress={() => void choosePhoto(item.icon === 'camera')} style={{ flex: 1, minHeight: 96, borderWidth: 1.5, borderStyle: 'dashed',
                borderColor: photoError ? colors.danger : colors.line, borderRadius: 16, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name={item.icon} size={28} /><Label style={[styles.bold, { fontSize: 14, textAlign: 'center' }]}>{item.label}</Label>
            </Pressable>)}
          </View> : photo === 'uploading' ? <View accessibilityState={{ busy: true }} style={[styles.row, { minHeight: 96,
            borderRadius: 16, backgroundColor: colors.surface2, justifyContent: 'center' }]}>
            <ActivityIndicator color={colors.primary} /><Muted>{t.uploading}</Muted>
          </View> : <View style={styles.row}>{chosenPhoto ? <Image source={{ uri: chosenPhoto.uri }}
            accessibilityLabel={t.photo} style={{ width: 104, height: 104, borderRadius: 16 }} />
            : <Photo material={material} kg={weight} />}
            <View style={styles.grow}><Label style={[styles.heavy, { color: colors.success }]}>{t.photoOk}</Label>
              {/* Icons rather than the canvas's two text links — Ahmed's call. The thumbnail
                  already says what this row is about, so the words were doing little, and two
                  48px targets beside a photo read faster than two short links. */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <IconButton icon="retry" label={t.retake} onPress={() => void choosePhoto(true)} />
                <IconButton icon="x" label={t.remove}
                  onPress={() => { setPhoto('none'); setChosenPhoto(null); setPhotoError(''); }} />
              </View>
            </View>
          </View>}
          {photoError ? <ErrorLine>{photoError}</ErrorLine> : null}
        </Card>
        <Card style={styles.card}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}><Label style={[styles.heavy, { fontSize: 16 }]}>{t.note}</Label><Pill>{t.optional}</Pill></View>
          <TextInput accessibilityLabel={t.note} multiline maxLength={200} value={note} onChangeText={setNote} placeholder={t.notePh}
            placeholderTextColor={colors.muted} style={{ minHeight: 72, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1,
              borderColor: colors.line, borderRadius: 14, color: colors.text, fontFamily: 'Tajawal_500Medium', fontSize: 15,
              lineHeight: 24, textAlign: f.language === 'ar' ? 'right' : 'left', textAlignVertical: 'top' }} />
          <Muted style={{ fontSize: 12, alignSelf: 'flex-end' }}>{ltr(`${note.length} / 200`)}</Muted>
        </Card>
        {/* One card border for either field being wrong, and `Field`'s own `error` prop for the red
            box and the line under it — which is the whole reason `Field` already takes one. */}
        <Card style={[styles.card, badName || badPhone ? { borderColor: colors.danger } : null]}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}><Label style={[styles.heavy, { fontSize: 16 }]}>{t.contactT}</Label><Pill>{t.required}</Pill></View>
          <Muted style={{ fontSize: 13, lineHeight: 19.5 }}>{t.contactHint}</Muted>
          <Field variant="branch" label={t.cName} value={contactName} onChangeText={setContactName} maxLength={60}
            placeholder={t.cNamePh} autoComplete="name" error={badName ? t.errCName : undefined} />
          <Field variant="branch" label={t.cPhone} prefix={copy.shared.phonePrefix} placeholder={copy.shared.phonePlaceholder}
            value={contactPhone} onChangeText={value => setContactPhone(digits(value).replace(/^0/, '').slice(0, 9))}
            keyboardType="phone-pad" autoComplete="tel" error={badPhone ? t.errPhone : undefined}
            style={{ textAlign: 'left', writingDirection: 'ltr' }} />
        </Card>
      </> : null}
      {step === 3 && material ? <>
        <Title style={styles.h1}>{t.revT}</Title>
        <Card style={[styles.card, { paddingVertical: 4, gap: 0 }]}>
          {summaryRows.map((row, i) => <View key={row.label} style={[styles.row, { minHeight: 64, paddingVertical: 12,
            borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }]}>
            {i === 2 && photo === 'chosen' ? <Photo kg={weight} material={material} size={44} /> : i === 0
              ? <Tile {...f.materialStyle(material)} /> : <Tile icon={row.icon} />}
            <View style={styles.grow}><Muted style={{ fontSize: 13 }}>{row.label}</Muted>
              <Label style={styles.heavy}>{row.value}</Label>
              {i === 3 ? <Muted>{f.phone(`0${contactPhone}`)}</Muted> : null}
            </View>
            <TextLink label={t.edit} onPress={row.edit} />
          </View>)}
        </Card>
        <View style={[styles.row, { padding: 14, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'flex-start' }]}>
          <Icon name="cal" color={colors.link} /><Label style={[styles.bold, { flex: 1, fontSize: 14.5, lineHeight: 23.2 }]}>{t.opsLine}</Label>
        </View>
      </> : null}
    </PageFrame>
    {sheetMaterial ? <Sheet onClose={() => setSheetMaterial(null)}>
      <View style={styles.row}><Tile {...f.materialStyle(sheetMaterial)} size={52} iconSize={28} />
        <View style={styles.grow}><Title style={styles.h2}>{interpolate(t.subQ, { m: f.name(sheetMaterial) })}</Title><Muted style={{ fontSize: 13.5 }}>{t.subSub}</Muted></View>
      </View>
      {data.subtypes.filter(s => s.active && s.material_id === sheetMaterial.id).map(s => {
        const locked = lockedRequest(sheetMaterial.id, s.id);
        const hintKey = subtypeHints[s.code as keyof typeof subtypeHints];
        return <View key={s.id} style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1.5,
          borderColor: subtypeId === s.id ? colors.accent : colors.line }}>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!locked }} disabled={!!locked}
            onPress={() => pick(sheetMaterial, s)} style={[styles.row, { minHeight: 68, paddingVertical: 12, paddingHorizontal: 14, opacity: locked ? .55 : 1 }]}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: f.materialStyle(sheetMaterial).color }} />
            <View style={styles.grow}><Label style={[styles.heavy, { fontSize: 16 }]}>{f.name(s)}</Label><Muted style={{ fontSize: 13 }}>{hintKey ? copy.shared[hintKey] : ''}</Muted></View>
            <Icon name={locked ? 'lock' : f.language === 'ar' ? 'caretL' : 'caretR'} color={colors.muted} />
          </Pressable>
          {locked ? <View style={[styles.row, { backgroundColor: colors.surface2, paddingHorizontal: 14 }]}>
            <Muted style={[styles.grow, { fontSize: 12.5 }]}>{t.subOpen}</Muted>
            <TextLink label={t.viewIt} onPress={() => locked.id && data.openRequest(locked.id)} />
          </View> : null}
        </View>;
      })}
    </Sheet> : null}
  </>;
}
