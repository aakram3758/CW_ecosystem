import { AuthGate } from '@/ui/auth-gate';
import { RoleHome } from '@/ui/role-home';

export default function BranchHome() {
  return <AuthGate route="/branch"><RoleHome role="branch" /></AuthGate>;
}
