import { Trash2, FileClock, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { ContractData } from '../types';
import { formatCurrencyBR, formatDateBR } from '../utils/calculator';

interface AuditHistoryProps {
  history: ContractData[];
  onSelect: (item: ContractData) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

export default function AuditHistory({ history, onSelect, onDelete, onClear }: AuditHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col items-center justify-center text-center min-h-[220px]">
        <FileClock className="w-10 h-10 text-slate-300 mb-3" />
        <p className="text-sm font-medium text-slate-500 font-display">Sem histórico de auditorias</p>
        <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
          Os contratos que você auditar serão salvos localmente neste navegador.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col h-full max-h-[500px]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-display flex items-center gap-1.5">
          <FileClock className="w-4 h-4 text-blue-600" />
          Auditorias Recentes
        </h3>
        <button 
          onClick={onClear}
          className="text-xs text-rose-600 hover:text-rose-700 font-medium transition-colors"
        >
          Limpar Tudo
        </button>
      </div>

      <div className="overflow-y-auto space-y-2 flex-1 pr-1 scrollbar-thin">
        {history.map((item) => (
          <div 
            key={item.id}
            className="group relative p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100 hover:border-slate-200 transition-all cursor-pointer flex justify-between items-center"
            onClick={() => onSelect(item)}
          >
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-800 truncate">
                  {item.clientName || 'Cliente sem nome'}
                </span>
                {item.contractNumber && (
                  <span className="text-[10px] bg-blue-50 text-blue-600 font-mono font-medium px-1.5 py-0.5 rounded">
                    #{item.contractNumber}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                <span>Assinatura: {formatDateBR(item.signatureDate)}</span>
                <span>•</span>
                <span>Canc.: {formatDateBR(item.requestDate)}</span>
              </div>
              <div className="text-xs font-bold text-slate-700 mt-1">
                Base: {formatCurrencyBR(item.monthlyFee)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.id) onDelete(item.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                title="Excluir auditoria"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
