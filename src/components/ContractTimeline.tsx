import { Calendar, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { ContractData, CalculationResult } from '../types';

interface ContractTimelineProps {
  data: ContractData;
  result: CalculationResult;
}

export default function ContractTimeline({ data, result }: ContractTimelineProps) {
  const { isExempt, daysRemaining, timelineProgress } = result;

  // Let's calculate elapsed days
  const totalDays = isExempt ? 365 : Math.max(365, daysRemaining + Math.round((365 * timelineProgress) / 100));
  const elapsedDays = Math.max(0, totalDays - daysRemaining);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600" />
      
      <h3 className="text-lg font-semibold font-display text-slate-900 mb-6 flex items-center gap-2">
        <Clock className="w-5 h-5 text-indigo-600" />
        Cronograma do Período de Fidelidade (12 meses)
      </h3>

      {/* Visual Timeline Bar */}
      <div className="relative my-8">
        {/* Background track */}
        <div className="h-3 w-full bg-slate-100 rounded-full" />
        
        {/* Fulfilled Progress Track (Green) */}
        <motion.div 
          className="absolute top-0 left-0 h-3 bg-emerald-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${timelineProgress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* Timeline Markers */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-1 pointer-events-none">
          {/* Start Point */}
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 rounded-full border-4 border-white bg-indigo-600 shadow-sm flex items-center justify-center z-10" />
            <span className="text-xs font-medium text-slate-500 mt-2">Início</span>
            <span className="text-[10px] text-slate-400 font-mono">{result.signatureDateFormatted}</span>
          </div>

          {/* Cancel Request Point (if not exempt) */}
          {!isExempt && timelineProgress > 0 && timelineProgress < 100 && (
            <motion.div 
              className="flex flex-col items-center absolute -translate-x-1/2"
              style={{ left: `${timelineProgress}%` }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
            >
              <div className="w-6 h-6 rounded-full border-4 border-white bg-amber-500 shadow-sm flex items-center justify-center z-10 animate-pulse" />
              <span className="text-xs font-semibold text-amber-600 mt-2">Solicitação</span>
              <span className="text-[10px] text-amber-500 font-mono">{result.requestDateFormatted}</span>
            </motion.div>
          )}

          {/* End Point */}
          <div className="flex flex-col items-center">
            <div className={`w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 ${
              isExempt ? 'bg-emerald-500' : 'bg-slate-300'
            }`} />
            <span className="text-xs font-medium text-slate-500 mt-2">Fim Previsto</span>
            <span className="text-[10px] text-slate-400 font-mono">{result.endDateFormatted}</span>
          </div>
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 pt-4 border-t border-slate-100">
        <div className="p-3 bg-slate-50 rounded-xl flex items-start gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Assinatura</div>
            <div className="text-sm font-semibold text-slate-800">{result.signatureDateFormatted}</div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl flex items-start gap-3">
          <div className={`p-2 rounded-lg ${isExempt ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            {isExempt ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Solicitado em</div>
            <div className="text-sm font-semibold text-slate-800">{result.requestDateFormatted}</div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl flex items-start gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Data Fim Prevista</div>
            <div className="text-sm font-semibold text-slate-800">{result.endDateFormatted}</div>
          </div>
        </div>
      </div>

      {/* Timeline Summary Alert */}
      <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 ${
        isExempt 
          ? 'bg-emerald-50/70 border border-emerald-100 text-emerald-800' 
          : 'bg-amber-50/70 border border-amber-100 text-amber-800'
      }`}>
        {isExempt ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Fidelidade Totalmente Cumprida!</p>
              <p className="text-xs opacity-90 mt-0.5">
                O cliente permaneceu ativo durante todo o período obrigatório de 12 meses. O cancelamento está <strong>isento de qualquer multa compensatória</strong>.
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Rescisão Contratual Antecipada</p>
              <p className="text-xs opacity-90 mt-0.5">
                O contrato foi rescindido antes do fim da fidelidade de 12 meses. Restam <strong>{daysRemaining} dias</strong> para o término do contrato, correspondendo a um proporcional a pagar.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
