import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

/** Label + control + optional error, wired for screen readers. */
export function Field({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}) {
  const id = useId();
  const errId = `${id}-err`;
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-bold text-muted">
        {label}
      </label>
      {children({ id, describedBy: error ? errId : undefined, invalid: !!error })}
      {hint && !error && <div className="text-xs text-muted">{hint}</div>}
      {error && (
        <div id={errId} className="text-[13px] font-bold text-danger-ink">
          {error}
        </div>
      )}
    </div>
  );
}

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => (
  <select ref={ref} className={clsx('fld', className)} {...p} />
));
Select.displayName = 'Select';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={clsx('fld', className)} {...p} />
));
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={clsx('fld', className)} {...p} />
));
Textarea.displayName = 'Textarea';
