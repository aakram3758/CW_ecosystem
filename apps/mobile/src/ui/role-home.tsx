import { useState } from 'react';
import { Alert } from 'react-native';
import type { Role } from '@/data/auth-api';
import { errorMessage, loadErrorTitle } from '@/data/errors';
import { useAuth } from '@/providers/auth';
import { usePreferences } from '@/providers/preferences';
import { Button, Screen, Title } from '@/ui/components';

export function RoleHome({ role }: { role: Role }) {
  const { copy } = usePreferences();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try { await signOut(); } catch (error) {
      Alert.alert(loadErrorTitle(copy, role), errorMessage(error, copy, role), [{ text: copy.branch.close }]);
    } finally { setBusy(false); }
  }
  return <Screen><Title>{role === 'branch' ? copy.branch.navHome : copy.driver.planTitle}</Title>
    <Button label={role === 'branch' ? copy.branch.logout : copy.driver.logout} disabled={busy} onPress={() => void logout()} />
  </Screen>;
}
