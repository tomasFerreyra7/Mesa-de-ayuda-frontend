'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  size = 'md',
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const sizeMap = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-[151] -translate-x-1/2 -translate-y-1/2',
          'w-full bg-card font-sans text-foreground rounded-xl border border-border shadow-2xl',
          'data-[state=open]:animate-fade-in',
          'max-h-[90vh] flex flex-col',
          sizeMap[size],
          className,
        )}
        {...props}
      >
        {(title || description) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
            <div>
              {title && <DialogPrimitive.Title className="text-base font-semibold text-foreground">{title}</DialogPrimitive.Title>}
              {description && <DialogPrimitive.Description className="text-sm text-muted-foreground mt-0.5">{description}</DialogPrimitive.Description>}
            </div>
            <DialogPrimitive.Close className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <X className="w-4 h-4" />
            </DialogPrimitive.Close>
          </div>
        )}
        <div className="overflow-y-auto flex-1">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

