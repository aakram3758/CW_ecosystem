import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import clsx from 'clsx';

type Variant = 'gold' | 'primary' | 'outline' | 'ghost' | 'danger' | 'dangerOutline' | 'onDark';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-extrabold no-underline transition-[background-color,filter,color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60';

const variants: Record<Variant, string> = {
  gold: 'border-0 bg-gold text-navy-ink hover:brightness-95',
  primary: 'border-0 bg-primary text-white hover:bg-primary-hover',
  outline: 'border border-line bg-surface text-ink hover:bg-surface-2',
  ghost: 'border-0 bg-transparent text-primary hover:text-primary-hover',
  danger: 'border-0 bg-danger text-navy-ink hover:brightness-95',
  dangerOutline: 'border border-danger bg-surface text-danger-ink hover:bg-danger-soft',
  onDark: 'border border-white/[.16] bg-white/[.06] text-on-dark hover:bg-white/[.12] focus-visible:outline-gold',
};

const sizes: Record<Size, string> = {
  sm: 'h-10 rounded-xl px-3.5 text-sm',
  md: 'h-11 rounded-[14px] px-4 text-sm',
  lg: 'h-12 rounded-[14px] px-[22px] text-[15px]',
};

export interface ButtonStyleProps {
  variant?: Variant;
  size?: Size;
}

export const buttonClass = ({ variant = 'outline', size = 'md' }: ButtonStyleProps, extra?: string) =>
  clsx(base, variants[variant], sizes[size], extra);

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyleProps>(
  ({ variant, size, className, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={buttonClass({ variant, size }, className)} {...props} />
  ),
);
Button.displayName = 'Button';

export function ButtonLink({ variant, size, className, ...props }: LinkProps & ButtonStyleProps) {
  return <Link className={buttonClass({ variant, size }, className)} {...props} />;
}
