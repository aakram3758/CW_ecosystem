import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { errorMessage } from '@/data/errors';
import { currentLocation } from '@/data/device';
import { ltr } from '@/i18n/copy';
import { usePreferences } from '@/providers/preferences';
import { Button, ErrorLine, Icon, Label, Sheet, Title } from '@/ui/components';
import { branchArtwork, softFill } from '@/ui/tokens';
import { useBranch } from './state';
import { Footer, Muted, PageFrame, Pill, styles, Tile } from './shared';

export const pointToCoords = (x: number, y: number) => ({ lat: 21.5812 - (y - 156) * .00004, lng: 39.1689 + (x - 182) * .00004 });
export function BranchMap({ lat, lng, onMove, small = false, center = { lat: 21.5812, lng: 39.1689 },
  dot = null, locating = false, hasPin = true }: {
  lat: number; lng: number; onMove?: (lat: number, lng: number) => void; small?: boolean; center?: { lat: number; lng: number };
  /**
   * Where the phone says it is, drawn as the canvas's blue dot — a different thing from the pin,
   * which is where the branch says its door is. Null until the device has told us, which is why
   * this is a prop and not a constant: the dot used to be drawn at the map's centre on every
   * render, so the map claimed to know your position before anyone had asked it.
   */
  dot?: { lat: number; lng: number } | null;
  /** While the device is being asked: the canvas dims the map and puts a spinner pill on it. */
  locating?: boolean;
  /**
   * Whether there is a pin to draw at all — the canvas's `lc.hasPin`, which is `ls.x != null`.
   *
   * False is the state of a branch whose row has no coordinates: nothing has ever been saved and
   * the phone has not been asked, so there is no position to mark. The map then draws **no pin**
   * and puts «اضغط على الخريطة لوضع الدبوس» in the middle of itself instead. `lat` and `lng` are
   * ignored while it is false, and callers pass the map's centre for them.
   *
   * It defaults to true because every other map in the app — the small one on the account screen,
   * and this one for a branch that has coordinates — has a pin by definition.
   */
  hasPin?: boolean;
}) {
  const { colors, copy, language, theme } = usePreferences();
  const [width, setWidth] = useState(358);
  const x = 182 + (lng - center.lng) / .00004;
  const y = 156 - (lat - center.lat) / .00004;
  function move(event: GestureResponderEvent) {
    if (locating) return;
    const px = Math.max(16, Math.min(342, event.nativeEvent.locationX * 358 / width));
    const py = Math.max(52, Math.min(292, event.nativeEvent.locationY));
    const coords = pointToCoords(px, py);
    onMove?.(coords.lat + center.lat - 21.5812, coords.lng + center.lng - 39.1689);
  }
  const blocks = small ? [[10,10,120,40],[146,10,70,40],[232,10,96,90],[10,62,206,38]]
    : [[14,18,120,84],[150,18,88,84],[254,18,96,120],[14,126,70,150],[100,126,138,64],[100,206,138,72],[254,160,96,118]];
  const roads = small ? [[0,52,330,8],[222,0,6,110]]
    : [[0,108,358,12],[242,0,8,300],[88,120,8,180],[96,194,146,8]];
  return <View accessible accessibilityRole={onMove ? 'adjustable' : 'image'}
    accessibilityLabel={onMove ? copy.branch.locHint : copy.branch.savedLoc}
    accessibilityActions={onMove ? [{ name: 'increment', label: copy.branch.useMine }, { name: 'decrement', label: copy.branch.useMine }] : undefined}
    onAccessibilityAction={() => !locating && onMove?.(center.lat, center.lng)}
    onLayout={event => setWidth(event.nativeEvent.layout.width)}
    onStartShouldSetResponder={() => !!onMove && !locating} onMoveShouldSetResponder={() => !!onMove && !locating}
    onResponderGrant={move} onResponderMove={move} onResponderTerminationRequest={() => false}
    style={{ height: small ? 110 : 300, borderRadius: small ? 14 : 20, overflow: 'hidden',
      backgroundColor: colors.mapBg, borderWidth: small ? 0 : 1, borderColor: colors.line, direction: 'ltr' }}>
    <Svg pointerEvents="none" width="100%" height="100%" viewBox={small ? '0 0 330 110' : '0 0 358 300'} preserveAspectRatio="none">
      {blocks.map(([bx,by,w,h], i) => <Rect key={`b${i}`} x={bx} y={by} width={w} height={h} rx={small ? 8 : 10} fill={colors.mapBlock} />)}
      {roads.map(([rx,ry,w,h], i) => <Rect key={`r${i}`} x={rx} y={ry} width={w} height={h} fill={colors.mapRoad} />)}
      {!small ? <SvgText x="150" y="130" fontSize="10" fontFamily="Tajawal_700Bold" fill={colors.muted}>{copy.shared.mapStreet}</SvgText> : null}
      {/* The dot goes where the device actually is, through the same transform as the pin, so
          dragging the pin away from it leaves it behind — which is the whole point of drawing two
          marks. The ring is the canvas's `0 0 0 10px rgba(46,123,224,.18)` spread. */}
      {!small && dot ? <>
        <Circle cx={182 + (dot.lng - center.lng) / .00004} cy={156 - (dot.lat - center.lat) / .00004} r="18" fill={branchArtwork.locationRing} />
        <Circle cx={182 + (dot.lng - center.lng) / .00004} cy={156 - (dot.lat - center.lat) / .00004} r="8"
          fill={branchArtwork.locationDot} stroke={colors.onPrimary} strokeWidth="3" />
      </> : null}
      {hasPin ? <Svg x={small ? x * 330 / 358 - 15 : x - 20} y={small ? 16 : y - 50} width={small ? 30 : 40} height={small ? 39 : 52} viewBox="0 0 40 52">
        <Path d="M20 51s17-15.5 17-30A17 17 0 0 0 3 21c0 14.5 17 30 17 30z" fill={colors.navy} stroke={colors.gold} strokeWidth="2" />
        <Circle cx="20" cy="20" r="6.5" fill={colors.gold} />
      </Svg> : null}
    </Svg>
    {/* The canvas's `lc.noPin`: with nothing to mark, the map says what to do instead — a
        `colors.surface` pill centred in it by a `StyleSheet.absoluteFill` with `alignItems` and
        `justifyContent: 'center'`, `borderRadius: 999`, `paddingVertical: 8`,
        `paddingHorizontal: 14`, the overlay shadow, and `copy.branch.placePin` as Tajawal_700Bold
        13. `pointerEvents="none"` on it, because the whole point is that the map underneath it can
        be tapped. Only on the full map, never the small one, which always has a pin. */}
    {!small && !hasPin ? <View pointerEvents="none"
      style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      <View style={{ backgroundColor: colors.surface, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14,
        shadowColor: colors.overlayShadow, shadowOffset: { width: 0, height: 12 }, shadowOpacity: theme === 'dark' ? .35 : .16,
        shadowRadius: 30, elevation: 8, direction: language === 'ar' ? 'rtl' : 'ltr' }}>
        <Label style={[styles.bold, { fontSize: 13 }]}>{copy.branch.placePin}</Label>
      </View>
    </View> : null}
    {/* The canvas's `lc.locating`: the map goes under `colors.scrim` and a pill sits in the middle
        of it — `StyleSheet.absoluteFill` with `alignItems`/`justifyContent: 'center'`, and inside,
        a `colors.surface` row of `borderRadius: 999`, `paddingVertical: 8`, `paddingHorizontal: 14`,
        `gap: 8`, holding an 18px `ActivityIndicator` in `colors.primary` and `copy.branch.locating`
        as Tajawal_700Bold 13. It is above the Svg, so it also stops the map being dragged while
        the device is being asked — give it `pointerEvents` of its default ('auto') for that. */}
    {locating ? <View onStartShouldSetResponder={() => true} accessibilityState={{ busy: true }}
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center' }]}>
      <View style={{ flexDirection: 'row', direction: language === 'ar' ? 'rtl' : 'ltr', alignItems: 'center',
        backgroundColor: colors.surface, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, gap: 8 }}>
        <ActivityIndicator size={18} color={colors.primary} />
        <Label style={[styles.bold, { fontSize: 13 }]}>{copy.branch.locating}</Label>
      </View>
    </View> : null}
  </View>;
}
export function LocationScreen() {
  const data = useBranch();
  const { branch, confirmLocation } = data;
  const { colors, copy } = usePreferences();
  const t = copy.branch;
  // The pin — or null for a branch whose row has no coordinates at all, which two of them have.
  // This used to default to the middle of Jeddah, so the screen drew a pin nobody had placed and
  // «تأكيد الموقع» would have saved it as the branch's door. The canvas's answer is to draw no pin,
  // say «اضغط على الخريطة لوضع الدبوس» on the map, and keep the confirm button disabled until the
  // branch taps it or the phone answers.
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    branch.lat !== null && branch.lng !== null ? { lat: branch.lat, lng: branch.lng } : null);
  const [center, setCenter] = useState({ lat: 21.5812, lng: 39.1689 });
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  // A refused permission is a state of the screen, not a passing message: the canvas keeps the
  // card up for as long as the permission is off, because the way out of it — place the pin by
  // hand — is a thing you do next, not a thing you acknowledge. A failure that is not about
  // permission stays a one-line error, since retrying is the answer to that one.
  const [denied, setDenied] = useState(false);
  // Where the phone says it is, once it has said. Separate from `coords`, which is the pin.
  const [device, setDevice] = useState<{ lat: number; lng: number } | null>(null);
  const pending = useRef(false);
  async function locate() {
    if (pending.current) return;
    pending.current = true; setLocating(true); setLocationError('');
    const result = await currentLocation();
    pending.current = false; setLocating(false);
    if (result.ok) {
      const point = { lat: result.lat, lng: result.lng };
      setDenied(false); setDevice(point); setCoords(point); setCenter(point);
    } else if (result.reason === 'denied') setDenied(true);
    else setLocationError(copy.shared.locFailed);
  }
  const [confirming, setConfirming] = useState(false);
  return <>
    <PageFrame title={t.locT} trailing={<Pill>{t.locOnce}</Pill>} footer={<Footer>
      <Button variant="branch" tone="outline" icon="target" label={locating ? t.locating : t.useMine} disabled={locating} onPress={() => void locate()} />
      {/* The canvas's own `disabled="{{ lc.noPin }}"`. The exception to this app's "reveal the
          error on press" rule, because there is no error to reveal: the instruction is already on
          the map, in the pill. */}
      <Button variant="branch" busy={data.locating} disabled={data.locating || coords === null}
        label={t.confirmLoc} onPress={() => setConfirming(true)} />
    </Footer>}>
      <View style={[styles.row, { alignItems: 'flex-start', backgroundColor: colors.accentSoft, borderRadius: 16, padding: 14 }]}>
        <Tile icon="store" color={colors.accentText} background={colors.accentSoft} />
        <View style={styles.grow}><Label style={[styles.heavy, { fontSize: 16 }]}>{t.locWarnT}</Label>
          <Label style={{ fontSize: 13.5, lineHeight: 21.6 }}>{t.locWarnB}</Label></View>
      </View>
      {/* Between the warning and the map, which is where the canvas puts it, because what it tells
          you to do is on the map: a `colors.dangerSoft` block, `borderRadius: 14`, `padding: 12`,
          a row with `gap: 10` and `alignItems: 'flex-start'`, the `pinOff` icon at 24 in
          `colors.dangerText`, then `deniedT` as Tajawal_800ExtraBold 14 above `deniedB` at 13 /
          lineHeight 20.15 in `colors.muted`, the pair with `gap: 2`. Give the block
          `accessibilityRole="alert"` so it is read when it appears. */}
      {denied ? <View accessibilityRole="alert" style={{ backgroundColor: colors.dangerSoft, borderRadius: 14,
        padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <Icon name="pinOff" size={24} color={colors.dangerText} tint={softFill(colors.dangerText)} />
        <View style={[styles.grow, { gap: 2 }]}>
          <Label style={[styles.heavy, { fontSize: 14 }]}>{t.deniedT}</Label>
          <Muted style={{ fontSize: 13, lineHeight: 20.15 }}>{t.deniedB}</Muted>
        </View>
      </View> : null}
      <BranchMap {...(coords ?? center)} hasPin={coords !== null} center={center} dot={device} locating={locating}
        onMove={(lat, lng) => setCoords({ lat, lng })} />
      {locationError ? <ErrorLine>{locationError}</ErrorLine> : null}
      <View style={{ gap: 8 }}><Muted style={{ fontSize: 12.5 }}>{t.locHint}</Muted>
        {/* The canvas's own em dash while there is nothing to read out. */}
        <Muted style={{ fontSize: 12.5 }}>{coords ? ltr(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`) : '—'}</Muted></View>
    </PageFrame>
    {confirming ? <Sheet onClose={() => setConfirming(false)}>
      <Tile icon="pin" size={56} iconSize={28} color={colors.accentText} background={colors.accentSoft} />
      <Title style={{ fontSize: 20 }}>{t.locConfT}</Title><Label>{t.locConfB}</Label>
      {/* `confirmLocation` leaves for the home screen, and the toast lands there — which is the
          canvas's own `enterHome(t.locSaved)`. It can, because the Toast is mounted above the
          pages in `app.tsx` rather than inside one. */}
      {data.locationError ? <ErrorLine>{errorMessage(data.locationError, copy, 'branch')}</ErrorLine> : null}
      <Button variant="branch" busy={data.locating} disabled={data.locating} label={t.yesLoc}
        onPress={() => coords && confirmLocation(coords.lat, coords.lng)} />
      <Button variant="branch" tone="muted" label={t.back} onPress={() => setConfirming(false)} />
    </Sheet> : null}
  </>;
}
