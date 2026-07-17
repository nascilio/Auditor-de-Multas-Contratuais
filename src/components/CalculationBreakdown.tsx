import { HelpCircle, ArrowRight, CheckCircle, Info } from 'lucide-react';
import { CalculationResult } from '../types';
import { formatDecimalBR, formatCurrencyBR } from '../utils/calculator';

interface CalculationBreakdownProps {
  result: CalculationResult;
  useRounding: boolean;
}

export default function CalculationBreakdown({ result, useRounding }: CalculationBreakdownProps) {
  const { 
    daysRemaining, 
    monthsRemainingTruncated, 
    monthsRemainingRounded, 
    fineValueTruncated, 
    fineValueRounded, 
    isExempt,
    monthlyFeeFormatted
  } = result;

  const monthsVal = useRounding ? monthsRemainingRounded : monthsRemainingTruncated;
  const fineVal = useRounding ? fineValueRounded : fineValueTruncated;
  const methodLabel = useRounding ? 'Arredondamento Padrão' : 'Truncamento de Casas Decimais';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-slate-950" />
      <h3 className="text-lg font-bold font-display text-slate-900 mb-6 flex items-center gap-2">
        <Info className="w-5 h-5 text-blue-600" />
        Memória de Cálculo Detalhada (Auditoria)
      </h3>

      <div className="space-y-6">
        {/* Step 1: Fidelidade */}
        <div className="relative pl-6 pb-6 border-l-2 border-slate-200 last:border-0">
          <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-slate-900 border-4 border-white shadow-sm" />
          <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            Passo 1: Verificação da Fidelidade de 12 Meses
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Verifica se a data de cancelamento é anterior à data de término da fidelidade (Data de Assinatura + 12 meses).
          </p>
          <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs font-mono text-slate-700 flex flex-wrap gap-4">
            <div><strong>Assinatura:</strong> {result.signatureDateFormatted}</div>
            <div><strong>Fim da Fidelidade:</strong> {result.endDateFormatted}</div>
            <div><strong>Cancelamento:</strong> {result.requestDateFormatted}</div>
            <div className="w-full pt-1 border-t border-slate-200 mt-1 flex items-center gap-2">
              <span className="font-semibold text-slate-800">Status:</span>
              {isExempt ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 inline" /> Isento de multa (cancelamento em ou após o fim previsto)
                </span>
              ) : (
                <span className="text-amber-600 font-semibold">
                  Sujeito a multa compensatória (cancelamento antecipado)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: Dias Restantes */}
        <div className="relative pl-6 pb-6 border-l-2 border-slate-200 last:border-0">
          <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-sm" />
          <h4 className="text-sm font-semibold text-slate-800">
            Passo 2: Cálculo dos Dias Restantes
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Calcula-se a diferença em dias corridos entre a data de solicitação de cancelamento e o fim previsto da fidelidade.
          </p>
          {!isExempt ? (
            <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs font-mono text-slate-700 space-y-1">
               <div>Fórmula: Dias Restantes = Data Fim Prevista - Data de Solicitação</div>
              <div>Cálculo: {result.endDateFormatted} - {result.requestDateFormatted} = <strong className="text-blue-600">{daysRemaining} dias</strong></div>
            </div>
          ) : (
            <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs font-mono text-slate-500">
              Não aplicável pois o período de fidelidade já foi integralmente cumprido.
            </div>
          )}
        </div>

        {/* Step 3: Proporcional de Meses */}
        <div className="relative pl-6 pb-6 border-l-2 border-slate-200 last:border-0">
          <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-slate-900 border-4 border-white shadow-sm" />
          <h4 className="text-sm font-semibold text-slate-800">
            Passo 3: Conversão para Proporcional em Meses (Pro-Rata)
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Converte a fração de dias para meses considerando a média real anual de dias por mês: <strong>365 / 12 = 30.4167 dias/mês</strong>.
          </p>
          {!isExempt ? (
            <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs font-mono text-slate-700 space-y-2">
              <div>Fórmula: Mensalidades Restantes = Dias Restantes / 30.4167</div>
              <div>Cálculo Exato: {daysRemaining} / 30.4167 = <span className="font-semibold text-slate-900">{(daysRemaining / 30.4167).toFixed(8)}... meses</span></div>
              
              <div className="pt-2 border-t border-slate-200 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className={`p-2 rounded-lg border ${!useRounding ? 'border-blue-200 bg-blue-50/50' : 'border-slate-100'}`}>
                  <span className="font-semibold text-blue-700 block text-[10px] uppercase tracking-wider">Truncamento (4 Decimais)</span>
                  <span className="text-sm font-bold text-slate-800">{formatDecimalBR(monthsRemainingTruncated, 4)} meses</span>
                </div>
                <div className={`p-2 rounded-lg border ${useRounding ? 'border-blue-200 bg-blue-50/50' : 'border-slate-100'}`}>
                  <span className="font-semibold text-blue-700 block text-[10px] uppercase tracking-wider">Arredondamento (4 Decimais)</span>
                  <span className="text-sm font-bold text-slate-800">{formatDecimalBR(monthsRemainingRounded, 4)} meses</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs font-mono text-slate-500">
              Não aplicável.
            </div>
          )}
        </div>

        {/* Step 4: Decomposição Didática de Parcelas (Requested Feature) */}
        {!isExempt && result.breakdown && result.breakdown.length > 0 && (
          <div className="relative pl-6 pb-6 border-l-2 border-slate-200 last:border-0">
            <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              Passo 4: Decomposição Didática de Parcelas (Pro-Rata)
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded uppercase">Explicativo</span>
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Divisão didática de cada período pendente de faturamento (meses inteiros e a fração final em dias restantes):
            </p>
            
            <div className="mt-4 space-y-2 max-w-md">
              {result.breakdown.map((item, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-xl flex items-center justify-between border text-xs ${
                    item.type === 'month' 
                      ? 'bg-slate-50/80 border-slate-200' 
                      : 'bg-blue-50/50 border-blue-100 text-blue-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${item.type === 'month' ? 'bg-slate-400' : 'bg-blue-500 animate-pulse'}`} />
                    <div>
                      <span className="font-bold font-mono text-slate-800">{item.label}</span>
                      <span className="text-[10px] text-slate-400 block font-medium uppercase mt-0.5 tracking-wide">
                        {item.type === 'month' ? '1 Mês Inteiro' : 'Fração Proporcional de Dias'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold font-mono text-slate-900 text-sm">
                      {formatCurrencyBR(item.value)}
                    </span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">
                      {item.type === 'month' 
                        ? `100% da mensalidade` 
                        : `${formatDecimalBR(item.quantity, 2)} dias / 30,4167`}
                    </span>
                  </div>
                </div>
              ))}

              {/* Sum Card */}
              <div className="p-3 bg-slate-900 text-white rounded-xl flex justify-between items-center text-xs font-mono mt-3 shadow-md">
                <span className="font-semibold text-slate-300">Somatório das Parcelas:</span>
                <span className="font-bold text-sm text-emerald-400">
                  {formatCurrencyBR(fineVal)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Fine Calculation */}
        <div className="relative pl-6 pb-6 border-l-2 border-slate-200 last:border-0">
          <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-sm" />
          <h4 className="text-sm font-semibold text-slate-800">
            Passo {result.breakdown && result.breakdown.length > 0 ? '5' : '4'}: Cálculo Final da Multa Rescisória
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Multiplica-se o valor da última mensalidade base pelo proporcional em meses restantes.
          </p>
          {!isExempt ? (
            <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs font-mono text-slate-700 space-y-2">
              <div>Fórmula: Valor da Multa = Valor da Última Mensalidade * Mensalidades Restantes</div>
              
              <div className="space-y-1.5 mt-2 bg-slate-100/50 p-2 rounded-lg">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Mensalidade Base:</span>
                  <span className="font-semibold">{monthlyFeeFormatted}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Proporcional Usado:</span>
                  <span className="font-semibold">{formatDecimalBR(monthsVal, 4)} meses ({methodLabel})</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-1.5 border-t border-slate-200 font-bold text-slate-900">
                  <span>Multa Resultante:</span>
                  <span className="text-blue-600 text-base">{formatCurrencyBR(fineVal)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs font-mono text-slate-700 font-semibold text-emerald-600 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> Isento de multa (R$ 0,00)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
