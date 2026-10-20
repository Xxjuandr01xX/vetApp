'use client';

import { useState } from 'react';
import { Modal, Button, TextInput, Alert, Spinner } from 'flowbite-react';
import { HiExclamation, HiTrash } from 'react-icons/hi';

interface DeletePetModalProps {
  show: boolean;
  petName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeletePetModal({ show, petName, onClose, onConfirm }: DeletePetModalProps) {
  const [typedName, setTypedName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isMatch = typedName.trim().toLowerCase() === petName.trim().toLowerCase();

  const handleConfirm = async () => {
    if (!isMatch) return;
    setLoading(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar el paciente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} size="md" onClose={onClose} popup>
      <Modal.Header />
      <Modal.Body>
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <HiTrash className="w-7 h-7" />
          </div>

          <h3 className="mb-2 text-lg font-bold text-gray-800">
            ¿Eliminar a {petName}?
          </h3>

          <p className="mb-4 text-sm text-gray-500">
            Esta acción es irreversible y eliminará la ficha de la mascota. Para confirmar, escribe el nombre del paciente: <strong className="text-gray-700">{petName}</strong>
          </p>

          {error && (
            <Alert color="failure" className="mb-4 text-left">
              {error}
            </Alert>
          )}

          <div className="mb-5">
            <TextInput
              type="text"
              placeholder={`Escribe "${petName}"`}
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="flex justify-center gap-3">
            <Button color="gray" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              color="failure"
              onClick={handleConfirm}
              disabled={!isMatch || loading}
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="mr-2" /> Eliminando...
                </>
              ) : (
                'Eliminar definitivamente'
              )}
            </Button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}
