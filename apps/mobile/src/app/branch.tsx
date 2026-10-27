import { AuthGate } from '@/ui/auth-gate';
import { BranchApp } from '@/branch/app';

export default function BranchHome() {
  return <AuthGate route="/branch"><BranchApp /></AuthGate>;
}
