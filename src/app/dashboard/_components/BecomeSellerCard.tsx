'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ConfirmDialog from '@/app/seller/orders/_components/ConfirmDialog';

export default function BecomeSellerCard({ userId }: { userId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleApply = async () => {
    setIsPending(true);
    setErrorMessage(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'seller', updated_at: new Date().toISOString() })
      .eq('id', userId)
      .eq('role', 'customer')
      .select('id');

    if (error) {
      setErrorMessage(`สมัครร้านค้าไม่สำเร็จ: ${error.message}`);
    } else if (!data || data.length === 0) {
      // Role changed elsewhere. A refresh sends a seller on to /seller.
      setErrorMessage('สมัครร้านค้าไม่สำเร็จ: สถานะบัญชีถูกเปลี่ยนแล้ว');
      router.refresh();
    } else {
      router.push('/seller');
      return;
    }

    setIsPending(false);
    setConfirming(false);
  };

  return (
    <>
      {confirming && (
        <ConfirmDialog
          message="ยืนยันการสมัครเป็นร้านค้า? บัญชีนี้จะเปลี่ยนเป็นผู้ขายทันทีและย้ายไปใช้หน้าร้านค้าแทน โดยยังสั่งทำเหรียญได้ที่เมนู “สั่งทำ”"
          onConfirm={handleApply}
          onCancel={() => setConfirming(false)}
          isPending={isPending}
        />
      )}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">เปิดร้านค้าของคุณ</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            สมัครเป็นร้านค้าเพื่อลงขายลายเหรียญและรับออเดอร์จากลูกค้า
          </p>
          {errorMessage && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400 mt-2">
              {errorMessage}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="shrink-0 text-sm font-semibold px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition"
        >
          สมัครเป็นร้านค้า
        </button>
      </div>
    </>
  );
}
