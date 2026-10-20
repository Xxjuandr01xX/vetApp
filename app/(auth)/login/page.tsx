'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Button, TextInput, Alert, Spinner } from 'flowbite-react';
import { HiMail, HiArrowLeft, HiExclamationCircle } from 'react-icons/hi';
import Link from 'next/link';
import { API } from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'pin'>('email');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePinPress = useCallback((digit: string) => {
    setPin((prev) => (prev.length < 6 ? prev + digit : prev));
  }, []);

  const handleDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
  }, []);

  const handleLogin = useCallback(async () => {
    if (pin.length !== 6) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(API.AUTH_LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
        setPin('');
        return;
      }

      await signInWithCustomToken(auth, data.customToken);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || 'Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [email, pin, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-subtle">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-vet-primary mb-4">
            <span className="text-2xl">🐾</span>
          </div>
          <h1 className="text-2xl font-bold text-vet-primary">VetApp</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión veterinaria</p>
        </div>

        {step === 'email' ? (
          <div className="card-vet">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Iniciar sesión</h2>

            <div className="mb-4">
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                sizing="lg"
                icon={HiMail}
                required
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && email) setStep('pin');
                }}
              />
            </div>

            <Button
              size="lg"
              className="w-full bg-vet-primary hover:bg-vet-primary/90 focus:ring-vet-primary-light"
              onClick={() => email && setStep('pin')}
              disabled={!email}
            >
              Continuar
            </Button>

            <div className="mt-4 text-center text-sm">
              <span className="text-gray-500">¿No tienes cuenta? </span>
              <Link href="/register" className="text-vet-primary-light hover:underline font-medium">
                Regístrate
              </Link>
            </div>
          </div>
        ) : (
          <div className="card-vet">
            {/* Botón Volver */}
            <button
              onClick={() => { setStep('email'); setPin(''); setError(''); }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              <HiArrowLeft className="w-4 h-4" />
              Cambiar email
            </button>

            <p className="text-center text-sm text-gray-600 mb-1">Ingresa tu PIN de 6 dígitos</p>
            <p className="text-center text-xs text-gray-400 mb-6">{email}</p>

            {/* Indicadores de PIN */}
            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-10 h-12 border-b-2 flex items-center justify-center text-2xl transition-colors ${
                    pin.length > i ? 'border-vet-primary' : 'border-gray-300'
                  }`}
                >
                  {pin.length > i ? '●' : ''}
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <Alert color="failure" icon={HiExclamationCircle} className="mb-4">
                {error}
              </Alert>
            )}

            {/* Teclado Numérico */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <Button
                  key={n}
                  size="lg"
                  color="light"
                  className="h-14 text-xl font-semibold"
                  onClick={() => handlePinPress(n.toString())}
                  disabled={loading}
                >
                  {n}
                </Button>
              ))}
              <Button
                size="lg"
                color="light"
                className="h-14 text-sm font-medium text-gray-500"
                onClick={handleClear}
                disabled={loading}
              >
                Limpiar
              </Button>
              <Button
                size="lg"
                color="light"
                className="h-14 text-xl font-semibold"
                onClick={() => handlePinPress('0')}
                disabled={loading}
              >
                0
              </Button>
              <Button
                size="lg"
                color="light"
                className="h-14 text-xl"
                onClick={handleDelete}
                disabled={loading}
              >
                ⌫
              </Button>
            </div>

            {/* Botón Login */}
            <Button
              size="lg"
              className="w-full bg-vet-primary hover:bg-vet-primary/90"
              disabled={pin.length !== 6 || loading}
              onClick={handleLogin}
            >
              {loading ? (
                <><Spinner size="sm" className="mr-2" /> Verificando...</>
              ) : (
                'Iniciar sesión'
              )}
            </Button>

            {/* Olvidé mi PIN */}
            <div className="mt-4 text-center">
              <Link href="/reset-pin" className="text-sm text-vet-primary-light hover:underline">
                ¿Olvidaste tu PIN?
              </Link>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-xs text-gray-400 flex items-center justify-center gap-3">
          <Link href="/privacy" className="hover:text-vet-primary hover:underline">
            Políticas de Privacidad
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-vet-primary hover:underline">
            Términos y Condiciones
          </Link>
        </div>
      </div>
    </div>
  );
}
