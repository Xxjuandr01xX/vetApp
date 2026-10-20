'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, Spinner, Badge } from 'flowbite-react';
import { HiSearch, HiX, HiArrowRight } from 'react-icons/hi';
import { useAuth } from '@/lib/hooks/useAuth';
import { searchGlobal, SearchResultItem } from '@/lib/services/search';

interface GlobalSearchModalProps {
  show: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ show, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Enfocar input al abrir
  useEffect(() => {
    if (show) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setQueryText('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [show]);

  // Búsqueda con debounce
  useEffect(() => {
    if (!show || !user) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchGlobal(user.uid, queryText);
        setResults(res);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Error en búsqueda global:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [show, user, queryText]);

  const handleSelect = useCallback(
    (item: SearchResultItem) => {
      onClose();
      router.push(item.href);
    },
    [router, onClose]
  );

  // Manejo de teclas de navegación (flechas, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        results.length > 0 ? (prev - 1 + results.length) % results.length : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Auto-scroll del item seleccionado
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const getBadgeColor = (type: SearchResultItem['type']) => {
    switch (type) {
      case 'action':
        return 'purple';
      case 'pet':
        return 'info';
      case 'appointment':
        return 'warning';
      case 'treatment':
        return 'success';
      case 'medication':
        return 'indigo';
      default:
        return 'gray';
    }
  };

  return (
    <Modal
      show={show}
      onClose={onClose}
      size="xl"
      position="top-center"
      className="p-0 backdrop-blur-sm"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Cabecera / Buscador */}
        <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800">
          <HiSearch className="h-5 w-5 text-gray-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar pacientes, citas, tratamientos, fármacos o comandos..."
            className="w-full bg-transparent border-0 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:ring-0 focus:outline-none p-0"
          />
          {loading && <Spinner size="sm" className="mr-2" />}
          {queryText && (
            <button
              onClick={() => setQueryText('')}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
            >
              <HiX className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Lista de Resultados */}
        <div
          ref={listRef}
          className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/60 p-2"
        >
          {results.length === 0 && !loading && (
            <div className="py-10 text-center text-gray-400 dark:text-gray-500">
              <span className="text-3xl block mb-2">🔍</span>
              <p className="text-sm font-medium">No se encontraron resultados para &ldquo;{queryText}&rdquo;</p>
              <p className="text-xs text-gray-400 mt-1">
                Intenta buscar por nombre de paciente, tutor, diagnóstico o fármaco.
              </p>
            </div>
          )}

          {results.map((item, index) => {
            const isSelected = index === selectedIndex;
            return (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0 p-1 bg-white dark:bg-gray-700 rounded-md shadow-2xs">
                    {item.icon || '📌'}
                  </span>
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{item.title}</p>
                      {item.badge && (
                        <Badge color={getBadgeColor(item.type)} size="xs">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center shrink-0 ml-2">
                  {isSelected && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                      Abrir <HiArrowRight className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pie con atajos de teclado */}
        <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between text-2xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 font-sans shadow-2xs">
                ↑↓
              </kbd>{' '}
              Navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 font-sans shadow-2xs">
                ↵
              </kbd>{' '}
              Seleccionar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 font-sans shadow-2xs">
                ESC
              </kbd>{' '}
              Cerrar
            </span>
          </div>

          <span className="hidden sm:inline font-mono">VetApp Cmd+K</span>
        </div>
      </div>
    </Modal>
  );
}
