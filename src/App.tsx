import { useState, useEffect } from 'react';
import { 
  Calculator, 
  Copy, 
  Check, 
  HelpCircle, 
  RefreshCw, 
  Plus, 
  FileText, 
  Download, 
  Printer, 
  TrendingUp, 
  FileCheck2,
  DollarSign,
  CalendarDays,
  User,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ContractData, CalculationResult } from './types';
import { 
  calculateFine, 
  generateMarkdownReport, 
  generateClientShareMessage,
  formatCurrencyBR, 
  getEndDate,
  getDaysDifference,
  formatDateBR
} from './utils/calculator';
import ContractTimeline from './components/ContractTimeline';
import CalculationBreakdown from './components/CalculationBreakdown';
import AuditHistory from './components/AuditHistory';

// Preset scenarios for user testability
const SCENARIOS = [
  {
    name: "Caso de Exemplo (Prompt)",
    signatureDate: "2026-01-01",
    monthlyFee: 500,
    requestDate: "2026-09-15",
    clientName: "Empresa Alfa Ltda.",
    contractNumber: "2026-001",
    notes: "Exemplo padrão do prompt com 108 dias restantes para o término da fidelidade de 12 meses."
  },
  {
    name: "Caso de Isenção Completa",
    signatureDate: "2026-01-01",
    monthlyFee: 650,
    requestDate: "2027-01-01",
    clientName: "Carlos Eduardo Santos",
    contractNumber: "2026-142",
    notes: "Cliente cumpriu exatamente os 12 meses de fidelidade, portanto está isento de multa."
  },
  {
    name: "Rescisão Recém-Assinado",
    signatureDate: "2026-06-15",
    monthlyFee: 1200,
    requestDate: "2026-08-10",
    clientName: "Tech Solutions S/A",
    contractNumber: "2026-789",
    notes: "Cancelamento solicitado logo no início do contrato, gerando um alto valor de multa rescisória."
  }
];

export default function App() {
  // Calculator state
  const [signatureDate, setSignatureDate] = useState<string>("2026-01-01");
  const [monthlyFee, setMonthlyFee] = useState<number>(500);
  const [requestDate, setRequestDate] = useState<string>("2026-09-15");
  const [clientName, setClientName] = useState<string>("Empresa Alfa Ltda.");
  const [contractNumber, setContractNumber] = useState<string>("2026-001");
  const [notes, setNotes] = useState<string>("");
  
  // Advanced rounding calculation toggle
  const [useRounding, setUseRounding] = useState<boolean>(false);
  
  // UI states
  const [copied, setCopied] = useState<boolean>(false);
  const [shareCopied, setShareCopied] = useState<boolean>(false);
  const [history, setHistory] = useState<ContractData[]>([]);
  const [activeTab, setActiveTab] = useState<'visual' | 'markdown'>('visual');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('audit_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar histórico", e);
      }
    } else {
      // Seed with standard scenarios
      const initialHistory: ContractData[] = SCENARIOS.map((s, idx) => ({
        ...s,
        id: `seed-${idx}`
      }));
      setHistory(initialHistory);
      localStorage.setItem('audit_history', JSON.stringify(initialHistory));
    }
  }, []);

  // Sync state validations
  useEffect(() => {
    if (!signatureDate || !requestDate) return;
    
    const sigDate = new Date(signatureDate);
    const reqDate = new Date(requestDate);
    
    if (reqDate < sigDate) {
      setValidationError("Atenção: A data de cancelamento é anterior à data de assinatura do contrato.");
    } else {
      setValidationError(null);
    }
  }, [signatureDate, requestDate]);

  // Handle preset click
  const loadScenario = (scenario: typeof SCENARIOS[0]) => {
    setSignatureDate(scenario.signatureDate);
    setMonthlyFee(scenario.monthlyFee);
    setRequestDate(scenario.requestDate);
    setClientName(scenario.clientName);
    setContractNumber(scenario.contractNumber);
    setNotes(scenario.notes || "");
  };

  // Compile contract data
  const currentContractData: ContractData = {
    signatureDate,
    monthlyFee,
    requestDate,
    clientName,
    contractNumber,
    notes
  };

  // Calculate results
  const result = calculateFine(currentContractData);
  const markdownReport = generateMarkdownReport(currentContractData, useRounding);
  const clientShareMessage = generateClientShareMessage(currentContractData, useRounding);

  // Copy markdown to clipboard
  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Copy client share message
  const handleCopyShareMessage = () => {
    navigator.clipboard.writeText(clientShareMessage);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  // Save current audit to history
  const handleSaveToHistory = () => {
    const newItem: ContractData = {
      id: `audit-${Date.now()}`,
      signatureDate,
      monthlyFee,
      requestDate,
      clientName: clientName.trim() || `Auditoria ${new Date().toLocaleDateString('pt-BR')}`,
      contractNumber: contractNumber.trim() || undefined,
      notes: notes.trim() || undefined
    };

    const updated = [newItem, ...history.filter(item => item.id !== newItem.id)];
    setHistory(updated);
    localStorage.setItem('audit_history', JSON.stringify(updated));
  };

  // Delete single item from history
  const handleDeleteHistoryItem = (id: string) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('audit_history', JSON.stringify(updated));
  };

  // Clear all history
  const handleClearHistory = () => {
    if (confirm("Deseja realmente limpar todo o histórico de auditorias?")) {
      setHistory([]);
      localStorage.removeItem('audit_history');
    }
  };

  // Print friendly view
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 pb-16 print:bg-white print:pb-0">
      
      {/* Header Panel */}
      <header className="bg-white border-b border-slate-200 py-4 px-4 md:px-8 shadow-xs sticky top-0 z-40 print:hidden h-16 flex items-center">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-base shadow-xs">
              $
            </div>
            <div>
              <h1 className="text-base font-bold font-display text-slate-800 tracking-tight flex items-center gap-1.5 leading-none">
                Auditoria Pro-Rata <span className="text-indigo-600 text-xs font-semibold bg-indigo-50 px-1.5 py-0.5 rounded ml-1 font-mono">v2.4</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5 uppercase">
                Auditoria e Faturamento Rescisório
              </p>
            </div>
          </div>

          {/* Quick Stats Header */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono">
                Protocolo: #2026-{contractNumber || '001'}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 font-semibold text-xs">
              AD
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Parameters and Input Form (4 Cols) */}
        <div className="lg:col-span-4 space-y-6 print:hidden">
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5 pb-3 border-b border-slate-100 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-indigo-600" />
              Parâmetros de Entrada
            </h2>

            {/* Form Fields */}
            <div className="space-y-4">
              
              {/* Data de Assinatura */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                    Data de Assinatura do Contrato
                  </span>
                  <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">Início Fidelidade</span>
                </label>
                <input
                  type="date"
                  value={signatureDate}
                  onChange={(e) => setSignatureDate(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 focus:outline-hidden transition-all font-mono text-slate-800"
                  required
                />
              </div>

              {/* Data Prevista de Término (Calculated automatically, read-only display) */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center justify-between">
                  <span>Data de Fim Prevista da Fidelidade</span>
                  <span className="text-[10px] text-slate-400 font-mono">(Assinatura + 12 meses)</span>
                </label>
                <div className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-100 font-mono text-slate-600 flex items-center justify-between">
                  <span>{getEndDate(signatureDate) ? formatDateBR(getEndDate(signatureDate)) : 'Aguardando data'}</span>
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">Automático</span>
                </div>
              </div>

              {/* Data da Solicitação de Cancelamento */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-rose-500" />
                    Data de Solicitação de Cancelamento
                  </span>
                  <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-medium">Rescisão</span>
                </label>
                <input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 focus:outline-hidden transition-all font-mono text-slate-800"
                  required
                />
              </div>

              {/* Valor da Última Mensalidade */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                    Valor da Última Mensalidade Base
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">BRL (R$)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlyFee || ''}
                    onChange={(e) => setMonthlyFee(parseFloat(e.target.value) || 0)}
                    placeholder="500,00"
                    className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 focus:outline-hidden transition-all font-mono text-slate-800 font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Warning/Validation Message */}
              {validationError && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs font-medium">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Business Rule Banner inside Sidebar */}
              <div className="border-t border-slate-100 pt-4 mt-2">
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
                  <p className="text-xs font-bold text-amber-800 uppercase mb-1">Regra de Negócio</p>
                  <p className="text-[11px] leading-relaxed text-amber-700 font-medium">
                    Fidelidade de 12 meses. Base de cálculo proporcional de dias (pro-rata) considerando a média real de 30,4167 dias por mês.
                  </p>
                </div>
              </div>

            </div>
          </section>
        </div>

        {/* Right Side: Visual and Markdown Outputs (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Output Mode Switcher & Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('visual')}
                className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'visual' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Visualização Gráfica
              </button>
              <button
                onClick={() => setActiveTab('markdown')}
                className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'markdown' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Markdown Copiável
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* Math toggle */}
              <div className="flex items-center gap-2 mr-2">
                <span className="text-xs text-slate-500 font-medium">Método:</span>
                <button
                  onClick={() => setUseRounding(!useRounding)}
                  className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all border ${
                    useRounding 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                  title="Alterne entre truncamento para 4 casas decimais ou arredondamento padrão."
                >
                  {useRounding ? 'Arredondado' : 'Truncado'}
                </button>
              </div>

              <button
                onClick={handlePrint}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200/60 transition-colors"
                title="Imprimir relatório"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Render Area */}
          <div className="space-y-6">
            
            {activeTab === 'visual' ? (
              <div className="space-y-6">
                
                {/* 3 Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Dias Restantes Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono block mb-2">Dias Restantes</span>
                    <div className="text-3xl font-extrabold font-mono text-slate-800">
                      {result.isExempt ? '0 dias' : `${result.daysRemaining} dias`}
                    </div>
                  </div>
                  
                  {/* Proporcional Restante Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono block mb-2">Proporcional Restante</span>
                    <div>
                      <div className="text-lg font-bold text-indigo-600 leading-tight">
                        {result.isExempt ? '0 meses e 0 dias' : `${result.monthsPart} ${result.monthsPart === 1 ? 'mês' : 'meses'} e ${result.daysPart} ${result.daysPart === 1 ? 'dia' : 'dias'}`}
                      </div>
                      {!result.isExempt && (
                        <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                          ({(useRounding ? result.monthsRemainingRounded : result.monthsRemainingTruncated).toFixed(4).replace('.', ',')} meses)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mensalidade Base Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono block mb-2">Mensalidade Base</span>
                    <div className="text-3xl font-extrabold font-mono text-slate-800">
                      {result.monthlyFeeFormatted}
                    </div>
                  </div>
                </div>

                {/* Client Shareable Message Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm print:hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-display flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        Texto Pronto para Enviar ao Cliente
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Mensagem explicativa e transparente contendo a decomposição do faturamento.
                      </p>
                    </div>
                    
                    <button
                      onClick={handleCopyShareMessage}
                      className={`flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl transition-all w-full sm:w-auto ${
                        shareCopied 
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-600' 
                          : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                      }`}
                    >
                      {shareCopied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Mensagem Copiada!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copiar Mensagem
                        </>
                      )}
                    </button>
                  </div>

                  <div className="relative">
                    <textarea
                      readOnly
                      value={clientShareMessage}
                      className="w-full h-44 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-sans text-slate-700 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="absolute bottom-3 right-3 text-[10px] text-slate-400 font-medium bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded border border-slate-100">
                      Rápido e Prático
                    </div>
                  </div>
                </div>

                {/* Timeline Visual Progress Component */}
                <ContractTimeline data={currentContractData} result={result} />

                {/* Detailed calculation steps */}
                <CalculationBreakdown result={result} useRounding={useRounding} />

              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs relative">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-display flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Relatório Markdown Gerado
                  </h3>
                  
                  {/* Copy Button */}
                  <button
                    onClick={handleCopyMarkdown}
                    className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl transition-all ${
                      copied 
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-600' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar Relatório
                      </>
                    )}
                  </button>
                </div>

                {/* Markdown view content */}
                <div className="relative rounded-xl overflow-hidden border border-slate-200/80 bg-slate-950 font-mono text-slate-200 p-5 text-xs overflow-x-auto min-h-[300px] leading-relaxed selection:bg-slate-800">
                  <pre className="whitespace-pre-wrap font-mono select-all">
                    {markdownReport}
                  </pre>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Pronto para Enviar</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Este bloco de texto acima está rigorosamente de acordo com as regras de faturamento e auditoria exigidas. Use o botão <strong>Copiar Relatório</strong> para enviá-lo diretamente pelo chat ou anexá-lo ao dossiê financeiro do cliente.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </main>

      {/* Footer credits and information */}
      <footer className="max-w-7xl mx-auto px-4 md:px-8 mt-12 pt-6 border-t border-slate-200/60 text-center text-xs text-slate-400 print:hidden">
        <p className="font-medium">Auditor de Multas Contratuais © 2026</p>
        <p className="mt-1">
          Cálculo efetuado com fidelidade obrigatória de 12 meses e pro-rata de {`365 / 12 = 30,4167`} dias por mês.
        </p>
      </footer>

    </div>
  );
}
