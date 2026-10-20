'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Button, TextInput, Alert, Spinner, Label } from 'flowbite-react';
import { HiMail, HiUser, HiExclamationCircle, HiCheckCircle } from 'react-icons/hi';
import Link from 'next/link';
import { API, AUTH } from '@/lib/constants';

type Step = 'info' | 'pin' | 'confirm';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('info');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePinPress = (digit: string, target: 'pin' | 'confirm') => {
    if (target === 'pin') {
      setPin((p) => (p.length < AUTH.PIN_LENGTH ? p + digit : p));
    } else {
      setConfirmPin((p) => (p.length < AUTH.PIN_LENGTH ? p + digit : p));
    }
  };

  const handleRegister = async () => {
    if (pin !== confirmPin) {
      setError('Los PINs no coinciden');
      setConfirmPin('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(API.AUTH_REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName, pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al registrarse');
        return;
      }

      // Auto-login después del registro
      const loginRes = await fetch(API.AUTH_LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      });

      const loginData = await loginRes.json();
      if (loginRes.ok) {
        await signInWithCustomToken(auth, loginData.customToken);
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err?.message || 'Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const PinDots = ({ value }: { value: string }) => (
    <div className="flex justify-center gap-3 mb-6">
      {Array.from({ length: AUTH.PIN_LENGTH }).map((_, i) => (
        <div
          key={i}
          className={`w-10 h-12 border-b-2 flex items-center justify-center text-2xl transition-colors ${
            value.length > i ? 'border-vet-primary' : 'border-gray-300'
          }`}
        >
          {value.length > i ? '●' : ''}
        </div>
      ))}
    </div>
  );

  const NumPad = ({ onPress, onDelete, onClear, disabled }: {
    onPress: (d: string) => void;
    onDelete: () => void;
    onClear: () => void;
    disabled: boolean;
  }) => (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
        <Button key={n} size="lg" color="light" className="h-14 text-xl font-semibold"
          onClick={() => onPress(n.toString())} disabled={disabled}>
          {n}
        </Button>
      ))}
      <Button size="lg" color="light" className="h-14 text-sm text-gray-500"
        onClick={onClear} disabled={disabled}>Limpiar</Button>
      <Button size="lg" color="light" className="h-14 text-xl font-semibold"
        onClick={() => onPress('0')} disabled={disabled}>0</Button>
      <Button size="lg" color="light" className="h-14 text-xl"
        onClick={onDelete} disabled={disabled}>⌫</Button>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-subtle">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-vet-primary mb-4">
            <span className="text-2xl">🐾</span>
          </div>
          <h1 className="text-2xl font-bold text-vet-primary">Crear cuenta</h1>
          <p className="text-sm text-gray-500 mt-1">Comienza a gestionar tu consultorio</p>
        </div>

        {/* Indicador de pasos */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(['info', 'pin', 'confirm'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s ? 'bg-vet-primary text-white' :
                (['info', 'pin', 'confirm'].indexOf(step) > i ? 'bg-vet-accent text-white' : 'bg-gray-200 text-gray-500')
              }`}>
                {['info', 'pin', 'confirm'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              {i < 2 && <div className="w-8 h-0.5 bg-gray-200" />}
            </div>
          ))}
        </div>

        <div className="card-vet">
          {error && (
            <Alert color="failure" icon={HiExclamationCircle} className="mb-4">
              {error}
            </Alert>
          )}

          {step === 'info' && (
            <>
              <div className="mb-4">
                <Label htmlFor="name" value="Nombre completo" className="mb-2 block" />
                <TextInput id="name" type="text" value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Dra. Ana García" sizing="lg" icon={HiUser} required />
              </div>
              <div className="mb-6">
                <Label htmlFor="email" value="Email" className="mb-2 block" />
                <TextInput id="email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com" sizing="lg" icon={HiMail} required />
              </div>
              <Button size="lg" className="w-full bg-vet-primary hover:bg-vet-primary/90"
                onClick={() => { setError(''); if (displayName && email) setStep('pin'); }}
                disabled={!displayName || !email}>
                Continuar
              </Button>
            </>
          )}

          {step === 'pin' && (
            <>
              <p className="text-center text-sm text-gray-600 mb-1">Crea un PIN de 6 dígitos</p>
              <p className="text-center text-xs text-gray-400 mb-4">Úsalo para iniciar sesión rápidamente</p>
              <PinDots value={pin} />
              <NumPad
                onPress={(d) => handlePinPress(d, 'pin')}
                onDelete={() => setPin((p) => p.slice(0, -1))}
                onClear={() => setPin('')}
                disabled={loading}
              />
              <Button size="lg" className="w-full bg-vet-primary hover:bg-vet-primary/90"
                onClick={() => { setError(''); if (pin.length === 6) setStep('confirm'); }}
                disabled={pin.length !== AUTH.PIN_LENGTH}>
                Continuar
              </Button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <p className="text-center text-sm text-gray-600 mb-1">Confirma tu PIN</p>
              <p className="text-center text-xs text-gray-400 mb-4">Ingresa el mismo PIN de 6 dígitos</p>
              <PinDots value={confirmPin} />
              <NumPad
                onPress={(d) => handlePinPress(d, 'confirm')}
                onDelete={() => setConfirmPin((p) => p.slice(0, -1))}
                onClear={() => setConfirmPin('')}
                disabled={loading}
              />
              <Button size="lg" className="w-full bg-vet-primary hover:bg-vet-primary/90"
                onClick={handleRegister}
                disabled={confirmPin.length !== AUTH.PIN_LENGTH || loading}>
                {loading ? (
                  <><Spinner size="sm" className="mr-2" /> Creando cuenta...</>
                ) : (
                  'Crear cuenta'
                )}
              </Button>
            </>
          )}

          <div className="mt-4 text-center text-sm">
            <span className="text-gray-500">¿Ya tienes cuenta? </span>
            <Link href="/login" className="text-vet-primary-light hover:underline font-medium">
              Inicia sesión
            </Link>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 text-center text-[11px] text-gray-400 leading-relaxed">
            Al registrarte en VetApp, aceptas nuestros{' '}
            <Link href="/terms" className="text-vet-primary hover:underline font-medium">
              Términos y Condiciones
            </Link>{' '}
            y las{' '}
            <Link href="/privacy" className="text-vet-primary hover:underline font-medium">
              Políticas de Privacidad
            </Link>
            .
          </div>
        </div>
      </div>
    </div>
  );
}
