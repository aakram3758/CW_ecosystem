import { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
import { EyeSlashIcon } from 'phosphor-react-native/src/icons/EyeSlash';
import { usePreferences } from '@/providers/preferences';
import { TruckIcon } from 'phosphor-react-native/src/icons/Truck';
import { HeadsetIcon } from 'phosphor-react-native/src/icons/Headset';
import { BellIcon } from 'phosphor-react-native/src/icons/Bell';
import { BellRingingIcon } from 'phosphor-react-native/src/icons/BellRinging';
import { MapPinIcon } from 'phosphor-react-native/src/icons/MapPin';
import { MapPinAreaIcon } from 'phosphor-react-native/src/icons/MapPinArea';
import { MapTrifoldIcon } from 'phosphor-react-native/src/icons/MapTrifold';
import { PhoneIcon } from 'phosphor-react-native/src/icons/Phone';
import { HouseIcon } from 'phosphor-react-native/src/icons/House';
import { CalendarBlankIcon } from 'phosphor-react-native/src/icons/CalendarBlank';
import { CalendarCheckIcon } from 'phosphor-react-native/src/icons/CalendarCheck';
import { ClockCounterClockwiseIcon } from 'phosphor-react-native/src/icons/ClockCounterClockwise';
import { UserIcon } from 'phosphor-react-native/src/icons/User';
import { CameraIcon } from 'phosphor-react-native/src/icons/Camera';
import { ImageIcon } from 'phosphor-react-native/src/icons/Image';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { XCircleIcon } from 'phosphor-react-native/src/icons/XCircle';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import { WifiSlashIcon } from 'phosphor-react-native/src/icons/WifiSlash';
import { StorefrontIcon } from 'phosphor-react-native/src/icons/Storefront';
import { DoorOpenIcon } from 'phosphor-react-native/src/icons/DoorOpen';
import { LockSimpleIcon } from 'phosphor-react-native/src/icons/LockSimple';
import { TranslateIcon } from 'phosphor-react-native/src/icons/Translate';
import { MoonIcon } from 'phosphor-react-native/src/icons/Moon';
import { SunIcon } from 'phosphor-react-native/src/icons/Sun';
import { CircleHalfIcon } from 'phosphor-react-native/src/icons/CircleHalf';
import { SignOutIcon } from 'phosphor-react-native/src/icons/SignOut';
import { PasswordIcon } from 'phosphor-react-native/src/icons/Password';
import { ScalesIcon } from 'phosphor-react-native/src/icons/Scales';
import { NotePencilIcon } from 'phosphor-react-native/src/icons/NotePencil';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { DotsThreeCircleIcon } from 'phosphor-react-native/src/icons/DotsThreeCircle';
import { MagnifyingGlassPlusIcon } from 'phosphor-react-native/src/icons/MagnifyingGlassPlus';
import { ChatCircleTextIcon } from 'phosphor-react-native/src/icons/ChatCircleText';
import { CoffeeIcon } from 'phosphor-react-native/src/icons/Coffee';
import { ClipboardTextIcon } from 'phosphor-react-native/src/icons/ClipboardText';
import { SealCheckIcon } from 'phosphor-react-native/src/icons/SealCheck';
import { PaletteIcon } from 'phosphor-react-native/src/icons/Palette';
import { CloudSlashIcon } from 'phosphor-react-native/src/icons/CloudSlash';
import { CircleDashedIcon } from 'phosphor-react-native/src/icons/CircleDashed';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretUpIcon } from 'phosphor-react-native/src/icons/CaretUp';
import { ArrowLeftIcon } from 'phosphor-react-native/src/icons/ArrowLeft';
import { ArrowRightIcon } from 'phosphor-react-native/src/icons/ArrowRight';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { CircleNotchIcon } from 'phosphor-react-native/src/icons/CircleNotch';
import { ArrowsClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowsClockwise';
import { ArrowCounterClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowCounterClockwise';

// Canvas names; this is the only driver module allowed to import Phosphor.
export const icons = {
 'eye': EyeIcon, 'eye-slash': EyeSlashIcon,
  'truck': TruckIcon,
  'headset': HeadsetIcon,
  'bell': BellIcon,
  'bell-ringing': BellRingingIcon,
  'map-pin': MapPinIcon,
  'map-pin-area': MapPinAreaIcon,
  'map-trifold': MapTrifoldIcon,
  'phone': PhoneIcon,
  'house': HouseIcon,
  'calendar-blank': CalendarBlankIcon,
  'calendar-check': CalendarCheckIcon,
  'clock-counter-clockwise': ClockCounterClockwiseIcon,
  'user': UserIcon,
  'camera': CameraIcon,
  'image': ImageIcon,
  'check-circle': CheckCircleIcon,
  'x-circle': XCircleIcon,
  'warning-circle': WarningCircleIcon,
  'wifi-slash': WifiSlashIcon,
  'storefront': StorefrontIcon,
  'door-open': DoorOpenIcon,
  'lock-simple': LockSimpleIcon,
  'translate': TranslateIcon,
  'moon': MoonIcon,
  'sun': SunIcon,
  'circle-half': CircleHalfIcon,
  'sign-out': SignOutIcon,
  'password': PasswordIcon,
  'scales': ScalesIcon,
  'note-pencil': NotePencilIcon,
  'info': InfoIcon,
  'dots-three-circle': DotsThreeCircleIcon,
  'magnifying-glass-plus': MagnifyingGlassPlusIcon,
  'chat-circle-text': ChatCircleTextIcon,
  'coffee': CoffeeIcon,
  'clipboard-text': ClipboardTextIcon,
  'seal-check': SealCheckIcon,
  'palette': PaletteIcon,
  'cloud-slash': CloudSlashIcon,
  'circle-dashed': CircleDashedIcon,
  'caret-left': CaretLeftIcon,
  'caret-right': CaretRightIcon,
  'caret-down': CaretDownIcon,
  'caret-up': CaretUpIcon,
  'arrow-left': ArrowLeftIcon,
  'arrow-right': ArrowRightIcon,
  'x': XIcon,
  'check': CheckIcon,
  'circle-notch': CircleNotchIcon,
  'arrows-clockwise': ArrowsClockwiseIcon,
  'arrow-counter-clockwise': ArrowCounterClockwiseIcon,
};
export function Icon({ name, size = 24, color, weight }: { name: string; size?: number; color?: string; weight?: 'regular' | 'bold' | 'fill' | 'duotone' }) {
  const { colors, language } = usePreferences();
  const key = name === 'fwd' ? (language === 'ar' ? 'caret-left' : 'caret-right') : name === 'back' ? (language === 'ar' ? 'arrow-right' : 'arrow-left') : name;
  const Component = icons[key as keyof typeof icons];
  if (!Component) throw new Error('Unknown driver canvas icon: ' + name);
  const bold = /^(caret-|arrow-|arrows-|circle-notch|navigation-arrow)/.test(key) || key === 'x' || key === 'check';
  return <Component size={size} color={color ?? colors.primary} weight={weight ?? (bold ? 'bold' : 'duotone')} />;
}
