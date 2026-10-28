/**
 * The brand splash — option **ب** «المواد بتتجمع», the one marked «المعتمد» in
 * `design/branch-v2/project/SplashOptions.dc.html`. The screen itself is in `Main.dc.html` lines
 * 114–127, and its CSS (`.sb-ic`, `.sb-logo`, `.sb-burst`, `.sb-tag`, and the `sbFly` / `sbPop` /
 * `sbBurst` keyframes) is in that file's style block. **Use `Main.dc.html`'s timings, not
 * `SplashOptions.dc.html`'s** — the option sheet was drawn first and its delays are shorter.
 *
 * Five material icons fly in from the edges, shrink into the centre and vanish; a gold ring bursts
 * out of the point they met at; the logo pops in; the tagline rises under it. About 1.95s.
 *
 * It is navy in both themes, like the hero, so nothing here reads the palette's light/dark pair.
 * The values it does use are in `tokens.ts` as `splash` and `splashMaterials`.
 *
 * Motion is React Native's own `Animated`, and the gradient is react-native-svg. Reanimated is
 * not an option here however often it looks like one: it is in `package.json`, but it resolves
 * its own nested `semver`, which this workspace's Metro config deliberately refuses to look for.
 * `metro.config.js` has the whole story.
 *
 * Built to `briefs/04-splash-onboarding-device.md`.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { usePreferences } from '@/providers/preferences';
import { Icon } from './components';
import { softFill, splash, splashMaterials } from './tokens';

const flyEase = Easing.bezier(.55, .05, .4, 1);
const popEase = Easing.bezier(.2, .8, .2, 1);
const outEase = Easing.bezier(0, 0, .58, 1);
const riseEase = Easing.bezier(.25, .1, .25, 1);
// Native interpolation has no easing callback; sample each curve before sending it to native.
function curved(time: Animated.Value, stops: number[], values: number[], easing: (value: number) => number) {
  const inputRange = [stops[0]], outputRange = [values[0]];
  for (let segment = 1; segment < stops.length; segment++) {
    for (let sample = 1; sample <= 60; sample++) {
      const p = sample / 60;
      inputRange.push(stops[segment - 1] + (stops[segment] - stops[segment - 1]) * p);
      outputRange.push(values[segment - 1] + (values[segment] - values[segment - 1]) * easing(p));
    }
  }
  return time.interpolate({ inputRange, outputRange, extrapolate: 'clamp' });
}
function FlyingMaterial({ index, time }: { index: number; time: Animated.Value }) {
  const material = splashMaterials[index];
  const start = index * 80;
  const move = curved(time, [start, start + 1000], [0, 1], flyEase);
  const style = {
    opacity: curved(time, [start, start + 150, start + 800, start + 1000], [0, 1, 1, 0], flyEase),
    transform: [
      { translateX: move.interpolate({ inputRange: [0, 1], outputRange: [material.x, 0] }) },
      { translateY: move.interpolate({ inputRange: [0, 1], outputRange: [material.y, 0] }) },
      { scale: move.interpolate({ inputRange: [0, 1], outputRange: [1, .25] }) },
    ],
  };
  return <Animated.View style={[{ position: 'absolute', start: '50%', top: '42%', marginStart: -30,
    marginTop: -30, width: 60, height: 60, borderRadius: 30, borderWidth: 2,
    borderColor: material.color, backgroundColor: splash.tile, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: .35, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 8 }, style]}>
    <Icon name={material.icon} size={32} color={material.color} tint={softFill(material.color)} />
  </Animated.View>;
}

/**
 * Plays once and calls `onDone`.
 *
 * **Layout.** Fills its parent. The background is the canvas's
 * `radial-gradient(120% 70% at 50% 40%, #17426F 0%, #0B2340 55%, #06172B 100%)` — in SVG terms a
 * `RadialGradient` at `cx="50%" cy="40%"` with `rx="120%" ry="70%"` (CSS gives an ellipse's two
 * radii there, not its diameters) and those three stops, drawn by a `Rect` filling the viewport.
 *
 * Everything that moves is positioned against one point: 50% of the width, 42% of the height.
 *
 * **The five icons.** `splashMaterials`, in order. Each is a 60×60 circle — `borderRadius: 30`,
 * `borderWidth: 2` in the material's colour, `backgroundColor: splash.tile`, the icon at 32 in the
 * same colour — centred on that point with `marginTop: -30` and `marginLeft: -30`, and a soft
 * drop shadow (`shadowColor: '#000'`, opacity .35, radius 18, no offset; `elevation: 8`).
 *
 * Each runs `sbFly` over 1s on `cubic-bezier(.55,.05,.4,1)`, staggered 80ms apart, so the last one
 * starts at 320ms:
 *   0%   translate(x, y) scale 1, opacity 0
 *   15%  opacity 1
 *   80%  opacity 1
 *   100% translate(0, 0)  scale .25, opacity 0
 * `x` and `y` are the material's own offsets, in points, and they are physical: the canvas does
 * not mirror them for Arabic, and neither should this.
 *
 * **The burst.** A 260×260 ring on the same point — `borderRadius: 130`, `borderWidth: 2` in
 * `splash.burst` — running `sbBurst` over 800ms, ease-out, starting at 1000ms: opacity .9 → 0
 * while scaling .4 → 1.6. Not touchable.
 *
 * **The logo.** `require('../../assets/cw-logo.png')` at width 212. The file is 452×362, so its
 * height is 170. Centred on the same point. `sbPop` over 600ms on `cubic-bezier(.2,.8,.2,1)`,
 * starting at 1000ms: opacity 0 → 1 and scale .6 → 1.06 by 70%, settling to 1.
 *
 * **The tagline.** `copy.branch.splashA`, Tajawal_500Medium 16 in `splash.tag`, centred, its own
 * top edge 108 below the meeting point. Rises in over 500ms from 1450ms — opacity 0 → 1,
 * translateY 12 → 0, which is the canvas's `cwrise`.
 *
 * **Finishing.** `onDone` fires once, when the tagline has settled. Tapping anywhere finishes it
 * early — the canvas wraps the whole splash in a button for exactly that. Either way `onDone` is
 * called at most once.
 *
 * **Reduced motion.** When `AccessibilityInfo.isReduceMotionEnabled()` is true, skip the movement:
 * draw the end state — logo and tagline, no icons, no burst — hold it briefly, and call `onDone`.
 * The canvas does the same with its `prefers-reduced-motion` block.
 */
export function BrandSplash({ onDone }: { onDone: () => void }): ReactNode {
  const { copy } = usePreferences();
  const [reduced, setReduced] = useState<boolean | null>(null);
  const time = useRef(new Animated.Value(0)).current;
  const done = useRef(false);
  const callback = useRef(onDone);
  callback.current = onDone;
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    callback.current();
  }, []);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (live) setReduced(value); },
      () => { if (live) setReduced(true); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (reduced === null) return;
    if (reduced) {
      const timer = setTimeout(finish, 400);
      return () => clearTimeout(timer);
    }
    time.setValue(0);
    const animation = Animated.timing(time, { toValue: 1950, duration: 1950, easing: Easing.linear, useNativeDriver: true });
    animation.start(({ finished }) => { if (finished) finish(); });
    return () => animation.stop();
  }, [reduced, finish, time]);
  const burst = curved(time, [1000, 1800], [0, 1], outEase);
  // `curved` clamps, so before 1000ms the burst reads 0 — which is its *most* visible state, a
  // small bright ring sitting there from the first frame. The near-instant step multiplied in
  // below is what keeps it invisible until its moment.
  const ring = {
    opacity: Animated.multiply(time.interpolate({ inputRange: [999.999, 1000], outputRange: [0, 1], extrapolate: 'clamp' }),
      burst.interpolate({ inputRange: [0, 1], outputRange: [.9, 0] })),
    transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [.4, 1.6] }) }],
  };
  const logo = {
    opacity: reduced ? 1 : curved(time, [1000, 1420], [0, 1], popEase),
    transform: [{ scale: reduced ? 1 : curved(time, [1000, 1420, 1600], [.6, 1.06, 1], popEase) }],
  };
  const rise = curved(time, [1450, 1950], [0, 1], riseEase);
  const tag = {
    opacity: reduced ? 1 : rise,
    transform: [{ translateY: reduced ? 0 : rise.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  };
  return <Pressable accessibilityRole="button" accessibilityLabel={copy.shared.skip} onPress={finish}
    style={{ flex: 1, overflow: 'hidden', backgroundColor: splash.gradient[1], direction: 'ltr' }}>
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs><RadialGradient id="brand" cx="50%" cy="40%" rx="120%" ry="70%">
        <Stop offset="0%" stopColor={splash.gradient[0]} /><Stop offset="55%" stopColor={splash.gradient[1]} />
        <Stop offset="100%" stopColor={splash.gradient[2]} />
      </RadialGradient></Defs><Rect width="100%" height="100%" fill="url(#brand)" />
    </Svg>
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { direction: 'ltr' }]}>
      {reduced === false ? <>{splashMaterials.map((material, index) => <FlyingMaterial key={material.icon} index={index} time={time} />)}
        <Animated.View style={[{ position: 'absolute', start: '50%', top: '42%', marginStart: -130, marginTop: -130,
          width: 260, height: 260, borderRadius: 130, borderWidth: 2, borderColor: splash.burst }, ring]} /></> : null}
      <Animated.Image source={require('../../assets/cw-logo.png')} resizeMode="contain" accessible={false}
        style={[{ position: 'absolute', start: '50%', top: '42%', marginStart: -106, marginTop: -85, width: 212, height: 170 }, logo]} />
      <Animated.Text style={[{ position: 'absolute', start: 0, end: 0, top: '42%', marginTop: 108,
        textAlign: 'center', fontFamily: 'Tajawal_500Medium', fontSize: 16, color: splash.tag }, tag]}>{copy.branch.splashA}</Animated.Text>
    </View>
  </Pressable>;
}
