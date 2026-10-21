import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  FileText,
  Upload,
  X,
} from 'lucide-react';
import { Publication } from '../types';
import {
  ParsedInventoryReport,
  ParsedInventoryRow,
  parseJwHubInventoryPdf,
} from '../utils/pdfInventoryParser';

interface InventoryPdfImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingPublications: Publication[];
  onConfirmImport: (
    items: ParsedInventoryRow[],
    reportLanguage: string
  ) => Promise<void>;
  showToast: (msg: string) => void;
}

export const InventoryPdfImportModal: React.FC<InventoryPdfImportModalProps> = ({
  isOpen,
  onClose,
  existingPublications,
  onConfirmImport,
  showToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [report, setReport] = useState<ParsedInventoryReport | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  const existingByCode = useMemo(() => {
    const map = new Map<string, Publication>();
    existingPublications.forEach((pub) => {
      map.set(pub.code.trim().toLowerCase(), pub);
    });
    return map;
  }, [existingPublications]);

  if (!isOpen) return null;

  const handleReset = () => {
    setIsParsing(false);
    setIsSaving(false);
    setErrorMessage(null);
    setFileName('');
    setReport(null);
    setSelectedCodes(new Set());
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const processArrayBuffer = async (buffer: ArrayBuffer, name: string) => {
    setIsParsing(true);
    setErrorMessage(null);
    setFileName(name);
    try {
      const parsed = await parseJwHubInventoryPdf(buffer);
      if (parsed.items.length === 0) {
        setErrorMessage(
          'No se detectaron filas de publicaciones con formato "(código) Título Cantidad" en este PDF. Asegúrate de subir el Informe de inventario de JW Hub.'
        );
        setReport(null);
        setSelectedCodes(new Set());
      } else {
        setReport(parsed);
        setSelectedCodes(
          new Set(parsed.items.map((it) => it.code.toLowerCase()))
        );
      }
    } catch (err) {
      console.error('Error al analizar el PDF:', err);
      setErrorMessage(
        'No se pudo leer el archivo PDF. Verifica que sea un archivo PDF válido.'
      );
      setReport(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    await processArrayBuffer(buffer, file.name);
    e.target.value = '';
  };

  const toggleCode = (codeLower: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(codeLower)) {
        next.delete(codeLower);
      } else {
        next.add(codeLower);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (!report) return;
    if (selectedCodes.size === report.items.length) {
      setSelectedCodes(new Set());
    } else {
      setSelectedCodes(
        new Set(report.items.map((it) => it.code.toLowerCase()))
      );
    }
  };

  const handleConfirm = async () => {
    if (!report) return;
    const chosen = report.items.filter((it) =>
      selectedCodes.has(it.code.toLowerCase())
    );
    if (chosen.length === 0) return;

    setIsSaving(true);
    try {
      await onConfirmImport(chosen, report.reportLanguage || 'Español');
      showToast(
        `Inventario actualizado (${chosen.length} publicaciones procesadas).`
      );
      handleClose();
    } catch (err) {
      console.error('Error al guardar inventario:', err);
      setErrorMessage('Ocurrió un error al guardar los cambios en la base de datos.');
    } finally {
      setIsSaving(false);
    }
  };

  const summary = useMemo(() => {
    if (!report) return { updatesCount: 0, newCount: 0, selectedTotal: 0 };
    let updatesCount = 0;
    let newCount = 0;
    let selectedTotal = 0;

    report.items.forEach((item) => {
      const key = item.code.toLowerCase();
      if (!selectedCodes.has(key)) return;
      selectedTotal++;
      if (existingByCode.has(key)) {
        updatesCount++;
      } else {
        newCount++;
      }
    });

    return { updatesCount, newCount, selectedTotal };
  }, [report, selectedCodes, existingByCode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-5 h-5 text-[#1E3A5F] shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                Importar Informe de Inventario (PDF)
              </h3>
              <p className="text-xs text-slate-500 truncate">
                Sube el PDF mensual descargado de JW Hub para actualizar las existencias
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* File Upload Box */}
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-4 text-center space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-semibold text-slate-800">
                {fileName
                  ? `Archivo cargado: ${fileName}`
                  : 'Selecciona el PDF de Informe de Inventario de JW Hub'}
              </p>
              <p className="text-xs text-slate-500">
                Lee automáticamente Biblias, Libros, Folletos, Formularios y Revistas, e ignora las filas «Otros».
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={isParsing}
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[42px] px-4 py-2 bg-[#1E3A5F] text-white text-xs sm:text-sm font-medium rounded-xl inline-flex items-center gap-2 disabled:opacity-60"
              >
                <Upload className="w-4 h-4" />
                <span>
                  {isParsing
                    ? 'Leyendo PDF...'
                    : report
                    ? 'Cambiar archivo PDF'
                    : 'Seleccionar archivo PDF'}
                </span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Preview Table */}
          {report && report.items.length > 0 && (
            <div className="space-y-3">
              <div className="bg-slate-100 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900">
                    {report.reportPeriod
                      ? `Informe: ${report.reportPeriod} (${report.reportLanguage})`
                      : `Idioma detectado: ${report.reportLanguage}`}
                  </div>
                  <div className="text-xs text-slate-600">
                    <span className="font-mono font-semibold text-slate-900">
                      {summary.selectedTotal}
                    </span>{' '}
                    seleccionadas:{' '}
                    <span className="font-semibold text-blue-800">
                      {summary.updatesCount} actualizarán stock
                    </span>{' '}
                    y{' '}
                    <span className="font-semibold text-emerald-800">
                      {summary.newCount} se crearán como nuevas
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleAll}
                  className="min-h-[34px] px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 self-start sm:self-auto"
                >
                  {selectedCodes.size === report.items.length
                    ? 'Desmarcar todas'
                    : 'Seleccionar todas'}
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-200 max-h-80 overflow-y-auto">
                {report.items.map((item) => {
                  const key = item.code.toLowerCase();
                  const existing = existingByCode.get(key);
                  const isChecked = selectedCodes.has(key);

                  return (
                    <label
                      key={key}
                      className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isChecked ? 'bg-white' : 'bg-slate-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCode(key)}
                          className="mt-1 w-4 h-4 rounded"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center flex-wrap gap-1.5 text-xs">
                            <span className="font-mono font-bold text-[#1E3A5F]">
                              ({item.code})
                            </span>
                            <span className="text-slate-500">
                              · {item.sectionName}
                            </span>
                            {existing ? (
                              <span className="text-blue-700 font-medium">
                                · En catálogo
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-semibold">
                                · Nueva publicación
                              </span>
                            )}
                          </div>
                          <div className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                            {item.title}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 font-mono text-xs sm:text-sm">
                        {existing ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 line-through">
                              {existing.stockCount}
                            </span>
                            <span className="text-slate-400">→</span>
                            <span className="font-bold text-slate-900">
                              {item.quantity}
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-emerald-700">
                            +{item.quantity}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="min-h-[42px] px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!report || summary.selectedTotal === 0 || isSaving}
            onClick={handleConfirm}
            className="min-h-[42px] px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#1E3A5F] rounded-xl inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>
              {isSaving
                ? 'Importando...'
                : `Confirmar e Importar (${summary.selectedTotal})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
