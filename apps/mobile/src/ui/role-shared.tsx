import { type PropsWithChildren } from 'react';
import { View, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as api from '@/data/shared-api';
import { usePreferences } from '@/providers/preferences';
import { Icon, Label } from '@/ui/components';

export function Muted({ children, style }: PropsWithChildren<{ style?: React.ComponentProps<typeof Label>['style'] }>) {
  const { colors } = usePreferences();
  return <Label style={[{ color: colors.muted, fontSize: 14, lineHeight: 23.1 }, style]}>{children}</Label>;
}

export function Tile({ icon, color, background, size = 44, iconSize = 24, radius }: {
  icon: string; color?: string; background?: string; size?: number; iconSize?: number;
  /** The canvas rounds a tile by its size, except the password screen's, which is 18 at 56. */
  radius?: number;
}) {
  const { colors } = usePreferences();
  return <View style={{ width: size, height: size, borderRadius: radius ?? (size === 44 ? 13 : 16),
    backgroundColor: background ?? colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
    <Icon name={icon} size={iconSize} color={color ?? colors.primary} tint={color ? `${color}33` : undefined} />
  </View>;
}

export function IconButton({ icon, label, onPress, style }: { icon: string; label: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const { colors } = usePreferences();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={[{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.surface2,
      alignItems: 'center', justifyContent: 'center' }, style]}><Icon name={icon} color={colors.text} /></Pressable>;
}

export function Pill({ children, color, background, icon }: PropsWithChildren<{ color?: string; background?: string; icon?: string }>) {
  const { colors } = usePreferences();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 28,
    paddingVertical: 2, paddingHorizontal: 10, borderRadius: 999, alignSelf: 'flex-start',
    backgroundColor: background ?? colors.surface2, flexShrink: 1 }}>
    {icon ? <Icon name={icon} size={15} color={color ?? colors.muted} /> : null}
    <Label style={{ color: color ?? colors.muted, fontSize: 12.5, lineHeight: 16.25,
      fontFamily: 'Tajawal_700Bold', flexShrink: 1 }}>{children}</Label>
  </View>;
}

export function useSignedPhoto(path: string | null) {
  return useQuery({ queryKey: ['photo', path], queryFn: () => api.signedPhotoUrl(path!),
    staleTime: 50 * 60_000, enabled: path !== null });
}

export function Footer({ children }: PropsWithChildren) {
  const { colors } = usePreferences();
  return <View style={{ padding: 16, paddingTop: 12, paddingBottom: 28, gap: 8, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.line }}>{children}</View>;
}
