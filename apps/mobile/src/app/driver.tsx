import { AuthGate } from '@/ui/auth-gate';
import { RoleHome } from '@/ui/role-home';

export default function DriverHome() {
  return <AuthGate route="/driver"><RoleHome role="driver" /></AuthGate>;
}
