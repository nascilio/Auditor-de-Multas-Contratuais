import { useState } from 'react';
import { 
  BadgePercent, 
  CalendarDays, 
  DollarSign, 
  AlertTriangle, 
  Copy, 
  Check, 
  FileText, 
  HelpCircle,
  Info,
  Calculator,
  RotateCcw
} from 'lucide-react';
import { DiscountData } from '../types';
import { 
  calculateDiscount, 
  generateDiscountMarkdownReport 
} from '../utils/calculator';

interface DiscountTabProps {
  initialMonthlyFee?: number;
}

export default function DiscountTab({ initialMonthlyFee = 500 }: DiscountTabProps) {
  // Form State
  const [monthlyFee, setMonthlyFee] = useState<number>(initialMonthlyFee);
  const [affectedDays, setAffectedDays] = useState<number>(3);
  const [monthYear, setMonthYear] = useState<string>("2026-02");
  const [discountPercentage, setDiscountPercentage] = useState<number>(20);
  
  // UI states
  const [copiedMarkdown, setCopiedMarkdown] = useState<boolean>(false);
  const [outputTab, setOutputTab] = useState<'visual' | 'markdown'>('visual');

  const discountData: DiscountData = {
    monthlyFee,
    affectedDays: Math.max(0, affectedDays || 0),
    monthYear,
    discountPercentage: Math.max(0, Math.min(100, discountPercentage || 0))
  };

  const result = calculateDiscount(discountData);
  const markdownReport = generateDiscountMarkdownReport(discountData);

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownReport);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2500);
  };

  const handleReset = () => {
    setMonthlyFee(500);
    setAffectedDays(3);
    setMonthYear("2026-02");
    setDiscountPercentage(20);
  };

  return (
    <div className="space-y-6">
      
      {/* Disclaimer Top Banner */}
      <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 shadow-2xs flex items-start gap-3 text-amber-950">
        <div className="p-2 bg-amber-100/80 rounded-xl text-amber-800 shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="text-xs space-y-1">
          <h3 className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
            Nota Importante: Cálculo Proporcional de Isenção
          </h3>
          <p className="leading-relaxed text-amber-900/90">
            Este cálculo deve ser utilizado como <strong>base e referência</strong> para o abatimento e <strong>não como uma regra absoluta</strong>. 
            Existem situações em que o cliente enfrentou instabilidade em apenas uma funcionalidade específica enquanto a plataforma permaneceu operante no geral. 
            Nesses casos, o valor de abatimento pode ser negociado ou ajustado proporcionalmente.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Parameters Form (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-slate-900" />
            
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <BadgePercent className="w-4 h-4 text-blue-600" />
                Parâmetros do Desconto
              </h2>
              <button
                onClick={handleReset}
                className="text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1 font-medium transition-colors"
                title="Restaurar valores padrão"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpar
              </button>
            </div>

            <div className="space-y-5">
              
              {/* Valor da Mensalidade */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                    Valor da Mensalidade do Cliente
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">BRL (R$)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-bold font-mono">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlyFee || ''}
                    onChange={(e) => setMonthlyFee(parseFloat(e.target.value) || 0)}
                    placeholder="500,00"
                    className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden transition-all font-mono text-slate-800 font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Mês e Ano do Ocorrido */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                    Mês e Ano da Ocorrência
                  </span>
                  <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono font-bold">
                    {result.daysInMonth} dias no mês
                  </span>
                </label>
                <input
                  type="month"
                  value={monthYear}
                  onChange={(e) => setMonthYear(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden transition-all font-mono text-slate-800"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3 text-slate-400 shrink-0" />
                  Meses mais curtos ou mais longos alteram o valor da diária. Ex: Fevereiro possui {result.daysInMonth} dias.
                </p>
              </div>

              {/* Dias com Problema */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Dias com Problema / Instabilidade
                  </span>
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium">Indisponibilidade</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max={result.daysInMonth}
                  step="0.5"
                  value={affectedDays || ''}
                  onChange={(e) => setAffectedDays(parseFloat(e.target.value) || 0)}
                  placeholder="15"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden transition-all font-mono text-slate-800 font-semibold"
                  required
                />
              </div>

              {/* Percentual de Desconto APLICÁVEL */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BadgePercent className="w-3.5 h-3.5 text-blue-600" />
                    Percentual de Desconto (% Editável)
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold transition-all ${
                    discountPercentage > 21 
                      ? 'text-red-700 bg-red-50 border border-red-200' 
                      : 'text-blue-700 bg-blue-50'
                  }`}>
                    {result.discountPercentage}% {discountPercentage > 21 && '• Requer Aprovação'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={discountPercentage ?? ''}
                    onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                    placeholder="20"
                    className={`w-full text-sm pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 border focus:bg-white focus:ring-1 focus:outline-hidden transition-all font-mono font-bold ${
                      discountPercentage > 21
                        ? 'border-red-300 text-red-900 focus:border-red-600 focus:ring-red-600'
                        : 'border-slate-200 text-slate-800 focus:border-blue-600 focus:ring-blue-600'
                    }`}
                    required
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold font-mono">%</span>
                </div>
                
                {/* Presets Rápidos */}
                <div className="flex gap-1.5 mt-2">
                  {[10, 20, 30, 50, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDiscountPercentage(pct)}
                      className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg transition-all ${
                        discountPercentage === pct 
                          ? pct > 21 ? 'bg-red-600 text-white shadow-xs' : 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                {discountPercentage > 21 ? (
                  <p className="text-[11px] text-red-600 font-semibold mt-1.5 flex items-start gap-1 leading-snug">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    <span>
                      Aplica {discountPercentage}% de desconto sobre o valor total correspondente aos dias afetados. <strong>Atenção: descontos acima de 21% precisam de aprovação da diretoria.</strong>
                    </span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Aplica {discountPercentage}% de desconto sobre o valor total correspondente aos dias afetados.
                  </p>
                )}
              </div>

              {/* Legenda Obrigatória sobre a origem da informação */}
              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
                <span className="font-bold flex items-center gap-1 text-blue-800 mb-0.5">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                  Legenda Importante:
                </span>
                Esta informação de dias com problema deve ser <strong>coletada e mencionada a partir do ticket do problema</strong> no suporte técnico.
              </div>

            </div>
          </section>
        </div>

        {/* Right Side: Results & Breakdown (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Output Switcher Tab */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-4">
            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setOutputTab('visual')}
                className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  outputTab === 'visual' 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Auditoria Visual & Pro-Rata
              </button>
              <button
                onClick={() => setOutputTab('markdown')}
                className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  outputTab === 'markdown' 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Relatório Markdown
              </button>
            </div>
            
            <div className="text-xs text-slate-400 font-mono hidden sm:block">
              {result.monthNameBR}
            </div>
          </div>

          {outputTab === 'visual' ? (
            <div className="space-y-6">
              
              {/* Highlight Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Desconto Card */}
                <div className="bg-gradient-to-br from-blue-900 to-slate-950 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 opacity-10">
                    <BadgePercent className="w-32 h-32 text-blue-400" />
                  </div>
                  <span className="text-[10px] text-blue-300 uppercase tracking-widest font-bold font-mono block mb-1">
                    Abatimento Proporcional Calculado
                  </span>
                  <div className="text-3xl font-black font-mono tracking-tight text-white mt-1">
                    {result.discountValueFormatted}
                  </div>
                  <div className="mt-2 text-[11px] text-blue-200 font-medium flex items-center gap-1.5">
                    <span className="bg-blue-800/80 text-blue-200 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                      {result.discountPercentage.toFixed(1)}% OFF
                    </span>
                    <span>Referente a {result.affectedDays} {result.affectedDays === 1 ? 'dia' : 'dias'} de indisponibilidade</span>
                  </div>
                </div>

                {/* Mensalidade Final Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono block mb-1">
                      Mensalidade Líquida a Cobrar
                    </span>
                    <div className="text-2xl font-black font-mono text-slate-900">
                      {result.netMonthlyFeeFormatted}
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>Diária: {result.dailyRateFormatted}/dia</span>
                    <span className="text-slate-400">({result.daysInMonth} dias no mês)</span>
                  </div>
                </div>

              </div>

              {/* Memória de Cálculo Detalhada */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-display mb-5 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  Memória do Cálculo Passo a Passo
                </h3>

                <div className="space-y-4 text-xs font-mono">
                  
                  {/* Step 1 */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <div className="font-bold text-slate-700 font-sans flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center font-mono">1</span>
                      Dividir o valor da mensalidade pelos dias do mês ({result.monthNameBR}):
                    </div>
                    <div className="text-slate-600 pl-6">
                      R$ {monthlyFee.toFixed(2)} ÷ {result.daysInMonth} dias = <strong className="text-slate-900">{result.dailyRateFormatted} / dia</strong>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <div className="font-bold text-slate-700 font-sans flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center font-mono">2</span>
                      Multiplicar o resultado pelos dias com problema:
                    </div>
                    <div className="text-slate-600 pl-6">
                      {result.dailyRateFormatted} / dia × {result.affectedDays} {result.affectedDays === 1 ? 'dia' : 'dias'} = <strong className="text-slate-900">{result.proportionalDaysValueFormatted}</strong>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <div className="font-bold text-slate-700 font-sans flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center font-mono">3</span>
                      Aplicar {result.discountPercentage}% de desconto no resultado:
                    </div>
                    <div className="text-slate-600 pl-6">
                      {result.proportionalDaysValueFormatted} × {result.discountPercentage}% = <strong className="text-blue-700 font-bold">{result.discountValueFormatted} (Abatimento Final)</strong>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                    <div className="font-bold text-blue-950 font-sans flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center font-mono">4</span>
                      Valor Final da Mensalidade a Cobrar:
                    </div>
                    <div className="text-blue-900 pl-6">
                      {result.monthlyFeeFormatted} - {result.discountValueFormatted} = <strong className="text-blue-950 font-extrabold">{result.netMonthlyFeeFormatted}</strong>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          ) : (
            
            /* Markdown Output Tab */
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-display flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Relatório Markdown Gerado
                </h3>
                
                <button
                  onClick={handleCopyMarkdown}
                  className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl transition-all ${
                    copiedMarkdown 
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-600' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  }`}
                >
                  {copiedMarkdown ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar Markdown
                    </>
                  )}
                </button>
              </div>

              <textarea
                readOnly
                value={markdownReport}
                className="w-full h-96 rounded-xl border border-slate-200 bg-slate-900 p-4 text-xs font-mono text-slate-200 leading-relaxed resize-none focus:outline-hidden"
              />
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
