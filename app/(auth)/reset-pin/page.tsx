'use client';

import { useState } from 'react';
import { Button, TextInput, Alert, Spinner, Label } from 'flowbite-react';
import { HiMail, HiExclamationCircle, HiCheckCircle } from 'react-icons/hi';
import Link from 'next/link';
import { API } from '@/lib/constants';

export default function ResetPinPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(API.AUTH_RESET_PIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al enviar la solicitud');
        return;
      }

      setSent(true);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-subtle">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-vet-primary mb-4">
            <span className="text-2xl">🔑</span>
          </div>
          <h1 className="text-2xl font-bold text-vet-primary">Recuperar PIN</h1>
          <p className="text-sm text-gray-500 mt-1">Te enviaremos un PIN temporal</p>
        </div>

        <div className="card-vet">
          {sent ? (
            <>
              <Alert color="success" icon={HiCheckCircle} className="mb-4">
                Si el email está registrado, recibirás instrucciones para restablecer tu PIN.
              </Alert>
              <Link href="/login">
                <Button size="lg" className="w-full bg-vet-primary hover:bg-vet-primary/90">
                  Volver al login
                </Button>
              </Link>
            </>
          ) : (
            <>
              {error && (
                <Alert color="failure" icon={HiExclamationCircle} className="mb-4">
                  {error}
                </Alert>
              )}

              <div className="mb-6">
                <Label htmlFor="reset-email" value="Email de tu cuenta" className="mb-2 block" />
                <TextInput
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  sizing="lg"
                  icon={HiMail}
                  required
                />
              </div>

              <Button
                size="lg"
                className="w-full bg-vet-primary hover:bg-vet-primary/90"
                onClick={handleReset}
                disabled={!email || loading}
              >
                {loading ? (
                  <><Spinner size="sm" className="mr-2" /> Enviando...</>
                ) : (
                  'Enviar instrucciones'
                )}
              </Button>

              <div className="mt-4 text-center">
                <Link href="/login" className="text-sm text-vet-primary-light hover:underline">
                  Volver al login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
