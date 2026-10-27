import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/auth';
import { AuthGate } from '@/ui/auth-gate';

export default function BootGate() {
  const { destination } = useAuth();
  return <AuthGate route={destination}><Redirect href={destination} /></AuthGate>;
}
