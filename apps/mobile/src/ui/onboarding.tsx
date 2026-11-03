/**
 * The three onboarding slides, from `design/branch-v2/project/Main.dc.html` lines 128–168 — the
 * markup — with `.onb-slide`, `.onb-img`, `.onb-txt`, `.onb-pill`, `.onb-h`, `.onb-p` and
 * `.onb-foot` in that file's style block, and the `ob` view-model around line 1241.
 *
 * Shown once per install, before sign-in, and skippable.
 *
 * **It renders light in both themes, on purpose.** The three illustrations are photographs with a
 * near-white background baked in, and the canvas gives each slide its own light page colour
 * (`#F0F1F6`, `#EDEDF1`, `#ECECF1`) with the light palette's text and muted beneath. A dark frame
 * around a white picture reads as a bug, so this screen does not follow the theme — the splash
 * before it is navy in both themes for the same kind of reason.
 *
 * Built to `briefs/04-splash-onboarding-device.md`.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, BackHandler, Easing, Image, PanResponder, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { interpolate } from '@/i18n/copy';
import { usePreferences } from '@/providers/preferences';
import { Button, Label } from './components';
import { palette } from './tokens';

// The one animation in the app that does not run on the native driver, and it has to be: the dot
// changes `width` and `backgroundColor`, and native Animated supports neither — a colour on the
// native driver throws at runtime rather than failing to build. Scaling a 26-wide dot down to 8
// would stay native, but it squashes the border radius with it, so an inactive dot comes out as a
// flattened pill instead of a circle. Three dots on a 250ms tween cost nothing on the JS driver.
function Dot({ selected, number, onPress, reduced }: { selected: boolean; number: number; onPress: () => void; reduced: boolean | null }) {
  const active = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => {
    if (reduced === null) return;
    const animation = Animated.timing(active, { toValue: selected ? 1 : 0, duration: reduced ? 0 : 250,
      easing: Easing.inOut(Easing.quad), useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [selected, active, reduced]);
  const style = {
    width: active.interpolate({ inputRange: [0, 1], outputRange: [8, 26] }),
    backgroundColor: active.interpolate({ inputRange: [0, 1], outputRange: ['#D3D9E3', palette.light.accent] }),
  };
  return <Pressable accessibilityRole="button" accessibilityLabel={String(number)} accessibilityState={{ selected }}
    onPress={onPress} style={{ minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
    <Animated.View style={[{ height: 8, borderRadius: 9 }, style]} />
  </Pressable>;
}

/** The three slides, in order: the image, and the copy keys for its heading and its line. */
export const slides = [
  { image: require('../../assets/onboarding-1.jpg'), title: 'onb1T', body: 'onb1B', background: '#F0F1F6' },
  { image: require('../../assets/onboarding-2.jpg'), title: 'onb2T', body: 'onb2B', background: '#EDEDF1' },
  { image: require('../../assets/onboarding-3.jpg'), title: 'onb3T', body: 'onb3B', background: '#ECECF1' },
] as const;

/**
 * Walks the three slides and calls `onDone` when the last one is accepted or any one is skipped.
 *
 * **One slide at a time, not a scroller.** The canvas swaps the slide rather than scrolling to it,
 * and a horizontal paging ScrollView is the part of React Native that handles right-to-left worst.
 * So: render the current slide, animate it in, and read the swipe with a PanResponder, exactly as
 * the canvas's `ob.down` / `ob.up` do — a horizontal movement of 50 points or more, where in
 * Arabic a rightward drag goes **forward** and in English a leftward one does.
 *
 * **A slide.** Fills the screen on `slides[i].background`, its content centred horizontally:
 * - the illustration at the top, 34 below the safe area. The canvas draws it 372 wide on a
 *   390-wide screen; here it takes `width: '95%'` with the file's own `aspectRatio` (853/1100),
 *   `resizeMode: 'contain'` and `flexShrink: 1`, so a short phone shrinks it instead of pushing
 *   the footer off. It is decorative: `accessible={false}`.
 * - under it, a column with `gap: 8` and `paddingHorizontal: 28`, centred text:
 *   - the step pill — `interpolate(copy.shared.onbStep, { n: i + 1 })` — `borderWidth: 1.5` in
 *     `palette.light.accent`, text in `palette.light.accentText`, `borderRadius: 999`,
 *     `paddingVertical: 3`, `paddingHorizontal: 16`, Tajawal_700Bold 13.
 *   - the heading, Tajawal_800ExtraBold 25 / lineHeight 33.75, in `palette.light.text`,
 *     `marginTop: 2`, `accessibilityRole="header"`.
 *   - the line, Tajawal_400Regular 15 / lineHeight 24.75, in `palette.light.muted`,
 *     `maxWidth: 310`.
 * - each slide fades and rises in over 350ms — the canvas's `cwslide`: opacity 0 → 1,
 *   translateY 10 → 0.
 *
 * **The footer**, pinned to the bottom, `paddingHorizontal: 24`, `paddingBottom: 24` plus the safe
 * area, `gap: 12`, centred:
 * - three dots, `gap: 8`, each 8 high with `borderRadius: 9`, animating over 250ms between 8 wide
 *   in `#D3D9E3` and 26 wide in `palette.light.accent` as the slide changes. Each is a button that
 *   jumps to its slide, labelled with its number.
 * - the primary button, full width, `palette.light.primary` with white on it — the app's
 *   `Button variant="branch"`, which already draws that. Its label is `copy.shared.onbNext`, and
 *   `copy.shared.startNow` on the last slide.
 * - `copy.shared.skip` as a `TextLink` at 16, except on the last slide, where the canvas leaves a
 *   44-high gap so the button does not jump.
 *
 * The Android back button goes to the previous slide, and does nothing on the first — it must not
 * close the app or fall through to a route behind this screen.
 */
export function Onboarding({ onDone }: { onDone: () => void }): ReactNode {
  const { copy, language } = usePreferences();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const done = useRef(false);
  const [reduced, setReduced] = useState<boolean | null>(null);
  const entry = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (live) setReduced(value); },
      () => { if (live) setReduced(true); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (reduced === null) return;
    // One value replayed from the start on each slide, rather than a new one per slide: a value
    // built in `useMemo` would be thrown away whenever React decided to drop the cache.
    entry.setValue(0);
    const animation = Animated.timing(entry, { toValue: 1, duration: reduced ? 0 : 350,
      easing: Easing.bezier(0, 0, .58, 1), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [entry, reduced, index]);
  const slide = slides[index];
  const colors = palette.light;
  const finish = () => { if (!done.current) { done.current = true; onDone(); } };
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) < 50) return;
      const forward = language === 'ar' ? gesture.dx > 0 : gesture.dx < 0;
      setIndex(value => Math.max(0, Math.min(slides.length - 1, value + (forward ? 1 : -1))));
    },
  }), [language]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setIndex(value => Math.max(0, value - 1));
      return true;
    });
    return () => subscription.remove();
  }, []);
  return <View {...pan.panHandlers} accessibilityViewIsModal style={{ flex: 1, backgroundColor: slide.background,
    paddingTop: insets.top, paddingHorizontal: Math.max(insets.left, insets.right), direction: language === 'ar' ? 'rtl' : 'ltr' }}>
    <Animated.View key={index} style={{ flex: 1, alignItems: 'center', paddingTop: 34, opacity: entry,
      transform: [{ translateY: entry.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
      <Image source={slide.image} accessible={false} resizeMode="contain"
        style={{ width: '95%', aspectRatio: 853 / 1100, flexShrink: 1, minHeight: 0 }} />
      <View style={{ gap: 8, paddingHorizontal: 28, paddingTop: 8, alignItems: 'center' }}>
        <Label style={{ borderWidth: 1.5, borderColor: colors.accent, color: colors.accentText, borderRadius: 999,
          paddingVertical: 3, paddingHorizontal: 16, fontFamily: 'Tajawal_700Bold', fontSize: 13, textAlign: 'center' }}>
          {interpolate(copy.shared.onbStep, { n: index + 1 })}</Label>
        <Label accessibilityRole="header" style={{ fontFamily: 'Tajawal_800ExtraBold', fontSize: 25,
          lineHeight: 33.75, color: colors.text, marginTop: 2, textAlign: 'center' }}>{copy.shared[slide.title]}</Label>
        <Label style={{ fontFamily: 'Tajawal_400Regular', fontSize: 15, lineHeight: 24.75,
          color: colors.muted, maxWidth: 310, textAlign: 'center' }}>{copy.shared[slide.body]}</Label>
      </View>
    </Animated.View>
    <View style={{ paddingHorizontal: 24, paddingBottom: 24 + insets.bottom, gap: 12, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {slides.map((_, i) => <Dot key={i} reduced={reduced} selected={i === index} number={i + 1} onPress={() => setIndex(i)} />)}
      </View>
      <Button variant="branch" label={index === slides.length - 1 ? copy.shared.startNow : copy.shared.onbNext}
        onPress={() => index === slides.length - 1 ? finish() : setIndex(value => Math.min(slides.length - 1, value + 1))}
        style={{ width: '100%', backgroundColor: colors.primary }} />
      {index === slides.length - 1 ? <View style={{ height: 44 }} /> :
        <Pressable accessibilityRole="button" onPress={finish}
          style={{ minHeight: 44, minWidth: 44, paddingHorizontal: 6, justifyContent: 'center' }}>
          <Label style={{ color: colors.link, fontSize: 16, fontFamily: 'Tajawal_700Bold' }}>{copy.shared.skip}</Label>
        </Pressable>}
    </View>
  </View>;
}
