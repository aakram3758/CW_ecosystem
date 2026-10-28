import { useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { usePreferences } from '@/providers/preferences';
import { Button, Label, Sheet, Title } from '@/ui/components';
import { branchArtwork } from '@/ui/tokens';
import { useBranch } from './state';
import { Footer, Muted, PageFrame, Pill, styles, Tile } from './shared';

export const pointToCoords = (x: number, y: number) => ({ lat: 21.5812 - (y - 156) * .00004, lng: 39.1689 + (x - 182) * .00004 });
export function BranchMap({ lat, lng, onMove, small = false }: {
  lat: number; lng: number; onMove?: (lat: number, lng: number) => void; small?: boolean;
}) {
  const { colors, copy } = usePreferences();
  const [width, setWidth] = useState(358);
  const x = 182 + (lng - 39.1689) / .00004;
  const y = 156 - (lat - 21.5812) / .00004;
  function move(event: GestureResponderEvent) {
    const px = Math.max(16, Math.min(342, event.nativeEvent.locationX * 358 / width));
    const py = Math.max(52, Math.min(292, event.nativeEvent.locationY));
    const coords = pointToCoords(px, py);
    onMove?.(coords.lat, coords.lng);
  }
  const blocks = small ? [[10,10,120,40],[146,10,70,40],[232,10,96,90],[10,62,206,38]]
    : [[14,18,120,84],[150,18,88,84],[254,18,96,120],[14,126,70,150],[100,126,138,64],[100,206,138,72],[254,160,96,118]];
  const roads = small ? [[0,52,330,8],[222,0,6,110]]
    : [[0,108,358,12],[242,0,8,300],[88,120,8,180],[96,194,146,8]];
  return <View accessible accessibilityRole={onMove ? 'adjustable' : 'image'}
    accessibilityLabel={onMove ? copy.branch.locHint : copy.branch.savedLoc}
    accessibilityActions={onMove ? [{ name: 'increment', label: copy.branch.useMine }, { name: 'decrement', label: copy.branch.useMine }] : undefined}
    onAccessibilityAction={() => onMove?.(21.5812, 39.1689)}
    onLayout={event => setWidth(event.nativeEvent.layout.width)}
    onStartShouldSetResponder={() => !!onMove} onMoveShouldSetResponder={() => !!onMove}
    onResponderGrant={move} onResponderMove={move} onResponderTerminationRequest={() => false}
    style={{ height: small ? 110 : 300, borderRadius: small ? 14 : 20, overflow: 'hidden',
      backgroundColor: colors.mapBg, borderWidth: small ? 0 : 1, borderColor: colors.line, direction: 'ltr' }}>
    <Svg pointerEvents="none" width="100%" height="100%" viewBox={small ? '0 0 330 110' : '0 0 358 300'} preserveAspectRatio="none">
      {blocks.map(([bx,by,w,h], i) => <Rect key={`b${i}`} x={bx} y={by} width={w} height={h} rx={small ? 8 : 10} fill={colors.mapBlock} />)}
      {roads.map(([rx,ry,w,h], i) => <Rect key={`r${i}`} x={rx} y={ry} width={w} height={h} fill={colors.mapRoad} />)}
      {!small ? <><SvgText x="150" y="130" fontSize="10" fontFamily="Tajawal_700Bold" fill={colors.muted}>{copy.shared.mapStreet}</SvgText>
        <Circle cx="182" cy="156" r="18" fill={branchArtwork.locationRing} />
        <Circle cx="182" cy="156" r="8" fill={branchArtwork.locationDot} stroke={colors.onPrimary} strokeWidth="3" /></> : null}
      <Svg x={small ? x * 330 / 358 - 15 : x - 20} y={small ? 16 : y - 50} width={small ? 30 : 40} height={small ? 39 : 52} viewBox="0 0 40 52">
        <Path d="M20 51s17-15.5 17-30A17 17 0 0 0 3 21c0 14.5 17 30 17 30z" fill={colors.navy} stroke={colors.gold} strokeWidth="2" />
        <Circle cx="20" cy="20" r="6.5" fill={colors.gold} />
      </Svg>
    </Svg>
  </View>;
}
export function LocationScreen() {
  const { branch, confirmLocation } = useBranch();
  const { colors, copy } = usePreferences();
  const t = copy.branch;
  const [coords, setCoords] = useState({ lat: branch.lat ?? 21.5812, lng: branch.lng ?? 39.1689 });
  const [confirming, setConfirming] = useState(false);
  return <>
    <PageFrame title={t.locT} trailing={<Pill>{t.locOnce}</Pill>} footer={<Footer>
      <Button variant="branch" tone="outline" icon="target" label={t.useMine} onPress={() => setCoords(pointToCoords(182, 156))} />
      <Button variant="branch" label={t.confirmLoc} onPress={() => setConfirming(true)} />
    </Footer>}>
      <View style={[styles.row, { alignItems: 'flex-start', backgroundColor: colors.accentSoft, borderRadius: 16, padding: 14 }]}>
        <Tile icon="store" color={colors.accentText} background={colors.accentSoft} />
        <View style={styles.grow}><Label style={[styles.heavy, { fontSize: 16 }]}>{t.locWarnT}</Label>
          <Label style={{ fontSize: 13.5, lineHeight: 21.6 }}>{t.locWarnB}</Label></View>
      </View>
      <BranchMap {...coords} onMove={(lat, lng) => setCoords({ lat, lng })} />
      <View style={{ gap: 8 }}><Muted style={{ fontSize: 12.5 }}>{t.locHint}</Muted>
        <Muted style={{ fontSize: 12.5, writingDirection: 'ltr' }}>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</Muted></View>
    </PageFrame>
    {confirming ? <Sheet onClose={() => setConfirming(false)}>
      <Tile icon="pin" size={56} iconSize={28} color={colors.accentText} background={colors.accentSoft} />
      <Title style={{ fontSize: 20 }}>{t.locConfT}</Title><Label>{t.locConfB}</Label>
      <Button variant="branch" label={t.yesLoc} onPress={() => confirmLocation(coords.lat, coords.lng)} />
      <Button variant="branch" tone="muted" label={t.back} onPress={() => setConfirming(false)} />
    </Sheet> : null}
  </>;
}
