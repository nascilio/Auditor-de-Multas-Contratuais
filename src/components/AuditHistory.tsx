import { Trash2, FileClock, ChevronRight, RotateCcw } from 'lucide-react';
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
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col items-center justify-center text-center min-h-[200px]">
        <FileClock className="w-9 h-9 text-slate-300 mb-2.5" />
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider font-display">Minhas Auditorias</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
          Nenhuma auditoria salva no momento. Preencha os campos e clique em <strong>Salvar Auditoria</strong>.
        </p>
      </div>
    );
  }

  return (
    <div 
      id="saved-audits-container"
      data-testid="saved-audits-list"
      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col h-full max-h-[520px]"
    >
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display flex items-center gap-1.5">
          <FileClock className="w-4 h-4 text-blue-600" />
          <span>Minhas Auditorias</span>
          <span className="text-[10px] bg-blue-50 text-blue-700 font-mono font-bold px-1.5 py-0.5 rounded ml-1 border border-blue-100">
            {history.length}
          </span>
        </h3>
        <button 
          type="button"
          onClick={onClear}
          className="text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded font-medium transition-colors"
          title="Limpar todas as auditorias salvas"
        >
          Limpar Tudo
        </button>
      </div>

      <div className="overflow-y-auto space-y-2.5 flex-1 pr-1 scrollbar-thin">
        {history.map((item) => (
          <div 
            key={item.id}
            data-testid={`saved-audit-item-${item.id}`}
            onClick={() => onSelect(item)}
            className="group relative p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-200/90 hover:border-blue-300 transition-all flex justify-between items-center gap-3 cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800 truncate">
                  {item.clientName || 'Auditoria Contratual'}
                </span>
                {item.contractNumber && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 font-mono font-bold px-1.5 py-0.2 rounded">
                    #{item.contractNumber}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                <span>Início: {formatDateBR(item.signatureDate)}</span>
                <span>•</span>
                <span>Canc.: {formatDateBR(item.requestDate)}</span>
              </div>
              <div className="text-xs font-extrabold text-slate-700 mt-1">
                Base: {formatCurrencyBR(item.monthlyFee)}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                data-testid="btn-load-audit"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(item);
                }}
                className="px-2.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-2xs flex items-center gap-1"
                title="Carregar esta auditoria no formulário"
              >
                <span>Carregar</span>
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.id) onDelete(item.id);
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                title="Excluir auditoria"
                aria-label="Excluir auditoria"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
