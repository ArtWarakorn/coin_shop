import { useState } from 'react';

export type ToastType = 'success' | 'error';

export function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

  const showToast = (msg: string, type: ToastType) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  return { toast, showToast };
}
