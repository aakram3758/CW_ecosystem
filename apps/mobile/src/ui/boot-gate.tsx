import { useState, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePreferences } from '@/providers/preferences';
import { BrandSplash } from '@/ui/splash';
import { Onboarding } from '@/ui/onboarding';

/**
 * What the app shows before it shows the app: the brand splash every launch, then the three
 * onboarding slides on the first launch after an install.
 *
 * Both are drawn **over** `children` rather than instead of them. The splash runs for about two
 * seconds whatever else is happening, and the router, the session restore and the chain query all
 * want that time — serialising them behind the splash would add the whole of it to a cold start
 * for no reason. So the app boots underneath and is usually ready by the time the splash lifts.
 */
export function BootGate({ children }: PropsWithChildren) {
  const { onboarded, completeOnboarding } = usePreferences();
  const [splashDone, setSplashDone] = useState(false);
  const cover = !splashDone ? <BrandSplash onDone={() => setSplashDone(true)} />
    : !onboarded ? <Onboarding onDone={() => void completeOnboarding()} />
    : null;
  return <View style={{ flex: 1 }}>
    {children}
    {cover ? <View style={StyleSheet.absoluteFill}>{cover}</View> : null}
  </View>;
}
