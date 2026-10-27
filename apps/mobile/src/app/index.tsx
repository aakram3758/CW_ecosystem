/**
 * Placeholder. It exists to prove the skeleton stands up — the fonts load, the lifted tokens and
 * copy import and render, right-to-left is on, and both colour schemes resolve. The real first
 * screen (splash, then sign-in) replaces it in bite 1.
 */
import { I18nManager, Text, View, useColorScheme } from 'react-native';
import { ar } from '@/i18n/ar';
import { palette, type as typography } from '@/ui/tokens';

export default function BootCheck() {
  const theme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = palette[theme];

  const rows: [string, string][] = [
    ['الخط', 'Tajawal'],
    ['الاتجاه', I18nManager.isRTL ? 'من اليمين (RTL)' : 'من اليسار (LTR)'],
    ['المظهر', theme === 'dark' ? ar.branch.dark : ar.branch.light],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, padding: 24, justifyContent: 'center', gap: 24 }}>
      <View style={{ gap: 8 }}>
        <Text
          style={{
            fontFamily: 'Tajawal_800ExtraBold',
            fontSize: 28,
            color: c.text,
            lineHeight: 28 * typography.lineHeight,
          }}
        >
          {ar.branch.splashB}
        </Text>
        <Text
          style={{
            fontFamily: 'Tajawal_400Regular',
            fontSize: typography.baseSize,
            color: c.muted,
            lineHeight: typography.baseSize * typography.lineHeight,
          }}
        >
          {ar.branch.splashA}
        </Text>
      </View>

      <View style={{ backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.line }}>
        {rows.map(([label, value], i) => (
          <View
            key={label}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              padding: 14,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: c.line,
            }}
          >
            <Text style={{ fontFamily: 'Tajawal_500Medium', fontSize: 14, color: c.muted }}>{label}</Text>
            <Text style={{ fontFamily: 'Tajawal_700Bold', fontSize: 14, color: c.text }}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
