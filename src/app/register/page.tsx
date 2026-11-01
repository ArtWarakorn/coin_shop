'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface FormFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minLength?: number;
  maxLength?: number;
}

function FormField({ label, type = 'text', onChange, ...inputProps }: FormFieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <input
        type={type}
        required
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        {...inputProps}
      />
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    phone: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const setField = (key: keyof typeof formData) => (value: string) =>
    setFormData({ ...formData, [key]: value });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Front-end Pre-validation
    if (formData.password.length < 6) {
      setErrorMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      setLoading(false);
      return;
    }

    try {
      // 1. เรียกใช้งาน API /api/auth/register
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_name: formData.username,
          full_name: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
        setLoading(false);
        return;
      }

      setSuccessMessage('สมัครสมาชิกสำเร็จ! กำลังเข้าสู่ระบบและนำท่านไปยังหน้าร้าน...');

      // 2. ล็อกอินเข้าใช้งานด้วย session อัตโนมัติหลังสมัครเสร็จ
      const supabase = createClient();
      await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1000);
    } catch (err: unknown) {
      setErrorMessage((err instanceof Error && err.message) || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-2xl">
            🪙
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">สมัครสมาชิก</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            สร้างบัญชีสำหรับสั่งทำและติดตามคิวเหรียญโปรยทาน
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-200 dark:border-red-800 flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
            <span>✓</span>
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <FormField
            label="Username"
            minLength={3}
            maxLength={50}
            value={formData.username}
            onChange={setField('username')}
            placeholder="เช่น somchai99"
          />
          <FormField
            label="ชื่อ-นามสกุล"
            minLength={2}
            value={formData.fullName}
            onChange={setField('fullName')}
            placeholder="เช่น นายสมชาย ใจดี"
          />
          <FormField
            label="เบอร์โทรศัพท์"
            type="tel"
            value={formData.phone}
            onChange={setField('phone')}
            placeholder="เช่น 0812345678"
          />
          <FormField
            label="อีเมล"
            type="email"
            value={formData.email}
            onChange={setField('email')}
            placeholder="name@example.com"
          />
          <FormField
            label="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
            type="password"
            minLength={6}
            value={formData.password}
            onChange={setField('password')}
            placeholder="••••••••"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer text-sm"
          >
            {loading ? 'กำลังลงทะเบียนและเข้าสู่ระบบ...' : 'สมัครสมาชิก'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-600 dark:text-gray-400">
          มีบัญชีอยู่แล้ว?{' '}
          <Link href="/login" className="text-amber-600 dark:text-amber-400 hover:underline font-semibold">
            เข้าสู่ระบบที่นี่
          </Link>
        </div>
      </div>
    </div>
  );
}
