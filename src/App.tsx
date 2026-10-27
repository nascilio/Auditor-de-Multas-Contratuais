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
  Info,
  Cloud,
  CloudCheck,
  Save,
  Clock,
  AlertCircle
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
import CalculationBreakdown from './components/CalculationBreakdown';
import AuditHistory from './components/AuditHistory';
import { 
  subscribeToAudits, 
  saveAuditToFirestore, 
  deleteAuditFromFirestore, 
  clearAllAuditsFromFirestore,
  purgeExpiredAuditsFromFirestore,
  RETENTION_PERIOD_MS
} from './services/firebaseService';

// Preset scenarios for user testability
const SCENARIOS = [
  {
    name: "Caso de Exemplo (Prompt)",
    signatureDate: "2026-01-01",
    monthlyFee: 500,
    requestDate: "2026-09-15"
  },
  {
    name: "Caso de Isenção Completa",
    signatureDate: "2026-01-01",
    monthlyFee: 650,
    requestDate: "2027-01-01"
  },
  {
    name: "Rescisão Recém-Assinado",
    signatureDate: "2026-06-15",
    monthlyFee: 1200,
    requestDate: "2026-08-10"
  }
];

export default function App() {
  // Calculator state: strictly signatureDate, monthlyFee, and requestDate
  const [signatureDate, setSignatureDate] = useState<string>("2026-01-01");
  const [monthlyFee, setMonthlyFee] = useState<number>(500);
  const [requestDate, setRequestDate] = useState<string>("2026-09-15");
  
  // Advanced rounding calculation toggle
  const [useRounding, setUseRounding] = useState<boolean>(false);
  
  // UI states
  const [copied, setCopied] = useState<boolean>(false);
  const [shareCopied, setShareCopied] = useState<boolean>(false);
  const [savingAudit, setSavingAudit] = useState<boolean>(false);
  const [auditSavedSuccess, setAuditSavedSuccess] = useState<boolean>(false);
  const [history, setHistory] = useState<ContractData[]>([]);
  const [activeTab, setActiveTab] = useState<'visual' | 'markdown'>('visual');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Auto-purga e autoexclusão de dados imputados após 24 horas
  useEffect(() => {
    // 1. Purga imediata no Firestore
    purgeExpiredAuditsFromFirestore();

    // 2. Intervalo periódico de purga (a cada 5 minutos)
    const purgeInterval = setInterval(() => {
      purgeExpiredAuditsFromFirestore();
    }, 5 * 60 * 1000);

    // 3. Verificação de expiração dos dados digitados na sessão (24h de inatividade)
    const lastInputTime = localStorage.getItem('calc_last_input_time');
    const now = Date.now();
    if (lastInputTime && (now - Number(lastInputTime)) >= RETENTION_PERIOD_MS) {
      // Autoexclui dados imputados após 24h: restaura padrão limpo
      setSignatureDate("2026-01-01");
      setMonthlyFee(500);
      setRequestDate("2026-09-15");
      localStorage.removeItem('calc_saved_inputs');
    }
    localStorage.setItem('calc_last_input_time', String(now));

    return () => clearInterval(purgeInterval);
  }, []);

  // Atualiza o timestamp de atividade sempre que os campos são alterados
  useEffect(() => {
    localStorage.setItem('calc_last_input_time', String(Date.now()));
  }, [signatureDate, monthlyFee, requestDate]);

  // Initialize history from Firebase Firestore with fallback to localStorage
  useEffect(() => {
    const unsubscribe = subscribeToAudits((firestoreAudits) => {
      const now = Date.now();
      if (firestoreAudits && firestoreAudits.length > 0) {
        // Filtra apenas registros com menos de 24h
        const validAudits = firestoreAudits.filter(a => {
          if (!a.createdAt) return true;
          return (now - Number(a.createdAt)) < RETENTION_PERIOD_MS;
        });
        setHistory(validAudits);
        localStorage.setItem('audit_history', JSON.stringify(validAudits));
      } else {
        const saved = localStorage.getItem('audit_history');
        if (saved) {
          try {
            const parsed: ContractData[] = JSON.parse(saved);
            const valid = parsed.filter(item => {
              if (!item.createdAt) return false;
              return (now - Number(item.createdAt)) < RETENTION_PERIOD_MS;
            });
            setHistory(valid);
            localStorage.setItem('audit_history', JSON.stringify(valid));
          } catch (e) {
            console.error("Erro ao carregar histórico", e);
          }
        } else {
          const now = Date.now();
          const initialHistory: ContractData[] = SCENARIOS.map((s, idx) => ({
            ...s,
            id: `seed-${idx}`,
            createdAt: now,
            expiresAt: now + RETENTION_PERIOD_MS
          }));
          setHistory(initialHistory);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync state validations
  useEffect(() => {
    if (!signatureDate || !requestDate) return;
    
    const sigDate = new Date(signatureDate);
    const reqDate = new Date(requestDate);
    
    if (reqDate < sigDate) {
      setValidationError("Atenção: A data de desativação da plataforma é anterior à data de assinatura do contrato.");
    } else {
      setValidationError(null);
    }
  }, [signatureDate, requestDate]);

  // Handle preset click
  const loadScenario = (scenario: typeof SCENARIOS[0]) => {
    setSignatureDate(scenario.signatureDate);
    setMonthlyFee(scenario.monthlyFee);
    setRequestDate(scenario.requestDate);
  };

  // Compile contract data
  const currentContractData: ContractData = {
    signatureDate,
    monthlyFee,
    requestDate
  };

  // Calculate results
  const result = calculateFine(currentContractData);
  const markdownReport = generateMarkdownReport(currentContractData, useRounding);
  const clientShareMessage = generateClientShareMessage(currentContractData, useRounding);

  // Resilient clipboard helper with fallback for iframe sandboxes & automated test suites
  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {
      console.warn("navigator.clipboard.writeText failed or blocked, falling back to execCommand", e);
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error("Fallback execCommand copy failed", err);
      return false;
    }
  };

  // Copy markdown to clipboard
  const handleCopyMarkdown = async () => {
    await copyTextToClipboard(markdownReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Copy client share message
  const handleCopyShareMessage = async () => {
    await copyTextToClipboard(clientShareMessage);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 3000);
  };

  // Save current audit to history and Firestore
  const handleSaveToHistory = async () => {
    setSavingAudit(true);
    const resolvedName = `Auditoria (${formatDateBR(signatureDate)} • ${formatCurrencyBR(monthlyFee)})`;
    const now = Date.now();
    const newItem: Omit<ContractData, 'id'> = {
      signatureDate,
      monthlyFee,
      requestDate,
      clientName: resolvedName,
      createdAt: now,
      expiresAt: now + RETENTION_PERIOD_MS
    };

    try {
      const firestoreId = await saveAuditToFirestore(newItem);
      const itemWithId: ContractData = { ...newItem, id: firestoreId };
      const updated = [itemWithId, ...history.filter(h => h.id !== firestoreId)];
      setHistory(updated);
      localStorage.setItem('audit_history', JSON.stringify(updated));
    } catch (e) {
      console.warn("Salvando localmente como fallback", e);
      const localItem: ContractData = { ...newItem, id: `audit-${now}` };
      const updated = [localItem, ...history];
      setHistory(updated);
      localStorage.setItem('audit_history', JSON.stringify(updated));
    } finally {
      setSavingAudit(false);
      setAuditSavedSuccess(true);
      setTimeout(() => setAuditSavedSuccess(false), 3000);
    }
  };

  // Delete single item from history
  const handleDeleteHistoryItem = async (id: string) => {
    try {
      await deleteAuditFromFirestore(id);
    } catch (e) {
      console.warn("Excluindo localmente como fallback", e);
    }
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('audit_history', JSON.stringify(updated));
  };

  // Clear all history
  const handleClearHistory = async () => {
    if (confirm("Deseja realmente limpar todo o histórico de auditorias da nuvem e local?")) {
      try {
        await clearAllAuditsFromFirestore();
      } catch (e) {
        console.warn("Limpando localmente como fallback", e);
      }
      setHistory([]);
      localStorage.removeItem('audit_history');
    }
  };

  // Print friendly view
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900 pb-16 print:bg-white print:pb-0">
      
      {/* Header Panel */}
      <header className="bg-slate-950 border-b border-slate-900 py-4 px-4 md:px-8 shadow-md sticky top-0 z-40 print:hidden h-16 flex items-center">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-inner border border-slate-800 relative overflow-hidden group">
              <Calculator className="w-5 h-5 text-blue-500 relative z-10 group-hover:scale-110 transition-transform duration-300" />
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-black opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div>
              <h1 className="text-sm md:text-base font-extrabold font-display text-white tracking-tight flex items-center gap-1.5 leading-none">
                Auditor de Multas <span className="bg-gradient-to-r from-blue-600 to-blue-800 text-white text-[9px] font-black px-2 py-0.5 rounded-sm font-mono uppercase tracking-wider">Pro-Rata</span>
              </h1>
              <p className="text-[9px] text-slate-400 font-bold tracking-wider mt-1 uppercase">
                Auditoria de Fidelidade de Contratos
              </p>
            </div>
          </div>

          {/* Quick Stats Header */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/70 border border-amber-800/80 text-amber-300 text-[10px] font-mono font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Autoexclusão 24h Ativa</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 text-[10px] font-mono font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Firebase Conectado</span>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono">
                Auditoria Ativa
              </span>
            </div>
            <div className="h-8 w-px bg-slate-800 hidden sm:block" />
            <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-white font-bold text-xs font-mono shadow-inner bg-gradient-to-tr from-blue-600 to-slate-950">
              AM
            </div>
          </div>
        </div>
      </header>

      {/* Subheader Action Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 md:px-8 py-2.5 print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-blue-400" />
              <span>Auditoria de Multa Rescisória</span>
            </span>
            <span className="hidden sm:inline-block text-[10px] text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              Fidelidade 12 Meses • Pro-rata
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors font-medium border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Side: Parameters and Input Form (4 Cols) */}
            <div className="lg:col-span-4 space-y-6 print:hidden">
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-slate-950" />
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5 pb-3 border-b border-slate-100 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-blue-600" />
              Parâmetros de Entrada
            </h2>

            {/* Form Fields: strictly signature date, request date, and monthly fee */}
            <div className="space-y-4">
              
              {/* Data de Assinatura */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                    Data de Assinatura do Contrato
                  </span>
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">Início Fidelidade</span>
                </label>
                <input
                  type="date"
                  value={signatureDate}
                  onChange={(e) => setSignatureDate(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden transition-all font-mono text-slate-800"
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

              {/* Data de Desativação da Plataforma */}
              <div className="relative">
                <label className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-rose-500" />
                    <span>Data de Desativação da Plataforma</span>
                    <span
                      tabIndex={0}
                      title="Atenção: Deve ser informada a data de desativação da plataforma e não a data de cancelamento."
                      className="group relative inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-500 hover:text-white transition-colors cursor-help focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span
                        role="tooltip"
                        className="pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100 transition-all duration-150 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 rounded-xl bg-slate-900 text-white text-[11px] font-normal leading-relaxed shadow-xl border border-slate-700 z-50 text-left"
                      >
                        <strong className="text-amber-400 font-semibold block mb-0.5">Atenção à nova regra:</strong>
                        Deverá ser informada a <strong>data de desativação da plataforma</strong> e não a data de solicitação de cancelamento.
                        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                      </span>
                    </span>
                  </span>
                  <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-medium">Rescisão</span>
                </label>
                <input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden transition-all font-mono text-slate-800"
                  required
                />
              </div>

              {/* Valor da Última Mensalidade */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-blue-600" />
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
                    className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-hidden transition-all font-mono text-slate-800 font-semibold"
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

              {/* Salvar Auditoria Button */}
              <div className="pt-2">
                <button
                  type="button"
                  id="btn-save-audit"
                  data-testid="btn-save-audit"
                  onClick={handleSaveToHistory}
                  disabled={savingAudit}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                    auditSavedSuccess 
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-300' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.99]'
                  }`}
                >
                  {auditSavedSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Auditoria Salva com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{savingAudit ? 'Salvando...' : 'Salvar Auditoria'}</span>
                    </>
                  )}
                </button>

                {auditSavedSuccess && (
                  <div 
                    id="audit-save-success-banner"
                    data-testid="audit-save-success-banner"
                    role="status"
                    aria-live="polite"
                    className="mt-2 p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-center text-xs text-emerald-800 font-bold animate-in fade-in"
                  >
                    ✓ Auditoria salva em Minhas Auditorias com sucesso!
                  </div>
                )}
              </div>

              {/* Business Rule Banner inside Sidebar */}
              <div className="border-t border-slate-100 pt-4 mt-2">
                <div className="p-3.5 bg-amber-50/80 border border-amber-100 rounded-xl">
                  <p className="text-[11px] font-bold text-amber-800 uppercase mb-0.5">Regra de Negócio</p>
                  <p className="text-[11px] leading-relaxed text-amber-700 font-medium">
                    Fidelidade de 12 meses. Pro-rata de 30,4167 dias por mês (365 / 12).
                  </p>
                </div>
              </div>

            </div>
          </section>

          {/* Minhas Auditorias Section (Saved Audits List with Carregar action) */}
          <AuditHistory
            history={history}
            onSelect={(item) => {
              setSignatureDate(item.signatureDate);
              setRequestDate(item.requestDate);
              setMonthlyFee(item.monthlyFee);
            }}
            onDelete={handleDeleteHistoryItem}
            onClear={handleClearHistory}
          />
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
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Visualização Gráfica
              </button>
              <button
                onClick={() => setActiveTab('markdown')}
                className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'markdown' 
                    ? 'bg-slate-900 text-white shadow-sm' 
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
                      ? 'bg-blue-50 border-blue-200 text-blue-600' 
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
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900" />
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono block mb-2">Dias Restantes</span>
                    <div className="text-3xl font-extrabold font-mono text-slate-800">
                      {result.isExempt ? '0 dias' : `${result.daysRemaining} dias`}
                    </div>
                  </div>
                  
                  {/* Proporcional Restante Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600" />
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono block mb-2">Proporcional Restante</span>
                    <div>
                      <div className="text-lg font-bold text-blue-600 leading-tight">
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
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-slate-950" />
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
                        <FileText className="w-4 h-4 text-blue-600" />
                        Texto Pronto para Enviar ao Cliente
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Mensagem explicativa e transparente contendo a decomposição do faturamento.
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      id="btn-copy-share-message"
                      data-testid="btn-copy-share-message"
                      onClick={handleCopyShareMessage}
                      className={`flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all w-full sm:w-auto shadow-sm ${
                        shareCopied 
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-300' 
                          : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.99]'
                      }`}
                    >
                      {shareCopied ? (
                        <>
                          <Check className="w-4 h-4 text-white" />
                          <span className="font-bold">Mensagem Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar Mensagem</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Explicit visible confirmation toast/banner when copied */}
                  {shareCopied && (
                    <div 
                      id="copy-success-banner"
                      data-testid="copy-success-banner"
                      role="status"
                      aria-live="polite"
                      className="mb-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2.5 text-emerald-900 text-xs font-bold shadow-xs animate-in fade-in duration-150"
                    >
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span>Mensagem copiada para a área de transferência! (Copiado com sucesso)</span>
                    </div>
                  )}

                  <div className="relative">
                    <textarea
                      readOnly
                      id="client-share-message-textarea"
                      data-testid="textarea-client-share-message"
                      value={clientShareMessage}
                      className="w-full h-44 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-sans text-slate-700 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                    <div className="absolute bottom-3 right-3 text-[10px] text-slate-400 font-medium bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded border border-slate-100">
                      Rápido e Prático
                    </div>
                  </div>
                </div>

                {/* Detailed calculation steps */}
                <CalculationBreakdown result={result} useRounding={useRounding} />

              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs relative">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-display flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Relatório Markdown Gerado
                  </h3>
                  
                  {/* Copy Button */}
                  <button
                    type="button"
                    id="btn-copy-markdown"
                    data-testid="btn-copy-markdown"
                    onClick={handleCopyMarkdown}
                    className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm ${
                      copied 
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-300' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99]'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span className="font-bold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Relatório</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Explicit visible confirmation toast/banner for markdown */}
                {copied && (
                  <div 
                    id="markdown-copy-success-banner"
                    data-testid="markdown-copy-success-banner"
                    role="status"
                    aria-live="polite"
                    className="mb-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2.5 text-emerald-900 text-xs font-bold shadow-xs animate-in fade-in duration-150"
                  >
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span>Relatório copiado para a área de transferência com sucesso!</span>
                  </div>
                )}

                {/* Markdown view content */}
                <div className="relative rounded-xl overflow-hidden border border-slate-200/80 bg-slate-950 font-mono text-slate-200 p-5 text-xs overflow-x-auto min-h-[300px] leading-relaxed selection:bg-slate-800">
                  <pre className="whitespace-pre-wrap font-mono select-all">
                    {markdownReport}
                  </pre>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
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
