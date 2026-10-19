import React, { useMemo, useState } from 'react';
import { Check, Users, X } from 'lucide-react';
import { Publisher } from '../types';

interface BulkPublisherModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingPublishers: Publisher[];
  onBulkAdd: (
    items: Array<{ fullName: string; groupName: string; phone: string }>
  ) => Promise<void>;
}

interface ParsedRow {
  fullName: string;
  phone: string;
  isDuplicate: boolean;
}

export const BulkPublisherModal: React.FC<BulkPublisherModalProps> = ({
  isOpen,
  onClose,
  existingPublishers,
  onBulkAdd,
}) => {
  const [rawText, setRawText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const existingNamesSet = useMemo(() => {
    return new Set(
      existingPublishers.map((p) => p.fullName.trim().toLowerCase())
    );
  }, [existingPublishers]);

  const parsedRows = useMemo<ParsedRow[]>(() => {
    if (!rawText.trim()) return [];
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const seenInBatch = new Set<string>();

    const rows = lines
      .map((line) => {
        const cleanedLine = line.replace(/^(\d+[\.\)\-]\s*|[\-\•\*]\s*)/, '').trim();
        const parts = cleanedLine
          .split(/[,;\t|]/)
          .map((p) => p.trim())
          .filter(Boolean);

        const fullName = parts[0] || '';
        let phone = '';

        for (let i = 1; i < parts.length; i++) {
          const digits = parts[i].replace(/[^\d]/g, '');
          if (digits.length >= 7) {
            phone = digits;
            break;
          }
        }

        const lowerName = fullName.toLowerCase();
        const isDuplicate =
          !fullName ||
          existingNamesSet.has(lowerName) ||
          seenInBatch.has(lowerName);

        if (fullName) {
          seenInBatch.add(lowerName);
        }

        return {
          fullName,
          phone,
          isDuplicate,
        };
      })
      .filter((r) => r.fullName.length > 0);

    return rows.sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
  }, [rawText, existingNamesSet]);

  const validRows = useMemo(
    () => parsedRows.filter((r) => !r.isDuplicate),
    [parsedRows]
  );

  if (!isOpen) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validRows.length === 0) return;
    setIsSubmitting(true);
    try {
      await onBulkAdd(
        validRows.map((r) => ({
          fullName: r.fullName,
          groupName: '',
          phone: r.phone,
        }))
      );
      setRawText('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4">
      <div className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#1E3A5F]" />
            <h2 className="text-base font-semibold text-slate-900">
              Añadir publicadores en masa
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-4 overflow-y-auto space-y-4 flex-1">
          <p className="text-xs sm:text-sm text-slate-600">
            Escribe o pega un nombre por línea. Si deseas incluir el teléfono para WhatsApp, sepáralo con una coma (ej.{' '}
            <span className="font-mono text-slate-800">Ana López, 17875550199</span>). Se ordenarán alfabéticamente.
          </p>

          <textarea
            rows={6}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Andrés Figueroa, 17875550201\nBeatriz Solís\nHéctor Maldonado, 17875550203`}
            className="w-full p-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
          />

          {parsedRows.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 text-xs text-slate-700 border-b border-slate-200 flex justify-between">
                <span>
                  Se agregarán: <strong className="font-mono">{validRows.length}</strong>
                </span>
                {parsedRows.length - validRows.length > 0 && (
                  <span className="text-amber-700">
                    {parsedRows.length - validRows.length} repetidos omitidos
                  </span>
                )}
              </div>
              <div className="max-h-36 overflow-y-auto divide-y divide-slate-100">
                {parsedRows.map((row, idx) => (
                  <div
                    key={`${row.fullName}-${idx}`}
                    className={`px-3 py-2 text-xs flex items-center justify-between gap-2 ${
                      row.isDuplicate ? 'text-slate-400 line-through bg-slate-50' : 'text-slate-800'
                    }`}
                  >
                    <span className="truncate font-medium">{row.fullName}</span>
                    {row.phone && (
                      <span className="font-mono text-slate-500 shrink-0">{row.phone}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={validRows.length === 0 || isSubmitting}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-[#1E3A5F] disabled:opacity-40 rounded-xl flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Guardar ({validRows.length})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
