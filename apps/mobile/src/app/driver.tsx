import { AuthGate } from '@/ui/auth-gate';
import { DriverApp } from '@/driver/app';

export default function DriverHome() {
  return <AuthGate route="/driver"><DriverApp /></AuthGate>;
}
