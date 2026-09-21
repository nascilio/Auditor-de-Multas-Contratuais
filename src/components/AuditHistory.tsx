import { Trash2, FileClock, Clock, ShieldCheck } from 'lucide-react';
import { ContractData } from '../types';
import { formatCurrencyBR, formatDateBR } from '../utils/calculator';

interface AuditHistoryProps {
  history: ContractData[];
  onSelect: (item: ContractData) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

function getRemainingTimeText(createdAt?: number, expiresAt?: number): string {
  if (!createdAt) return 'Válido por 24h';
  const now = Date.now();
  const expiration = expiresAt || (createdAt + 24 * 60 * 60 * 1000);
  const diffMs = expiration - now;
  if (diffMs <= 0) return 'Expirando agora';
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (diffHours > 0) {
    return `Expira em ${diffHours}h ${diffMinutes}m`;
  }
  return `Expira em ${diffMinutes}min`;
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
        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-medium">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>Retenção temporária: autoexclusão a cada 24h</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      id="saved-audits-container"
      data-testid="saved-audits-list"
      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col h-full max-h-[520px]"
    >
      <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
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

      {/* 24-hour Auto-deletion Banner */}
      <div className="mb-3 px-2.5 py-1.5 bg-amber-50/80 border border-amber-200/70 rounded-xl flex items-center justify-between text-[11px] text-amber-800">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Autoexclusão ativa: dados expiram em 24h</span>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wider font-mono text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
          24h TTL
        </span>
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
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-bold text-slate-800 truncate">
                  {item.clientName || 'Auditoria Contratual'}
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-mono text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded-full shrink-0">
                  <Clock className="w-2.5 h-2.5 text-amber-500" />
                  {getRemainingTimeText(item.createdAt, item.expiresAt)}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono flex flex-wrap gap-x-2 gap-y-0.5">
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
