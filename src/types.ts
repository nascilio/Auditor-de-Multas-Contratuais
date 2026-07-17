export interface ContractData {
  id?: string;
  signatureDate: string; // YYYY-MM-DD
  monthlyFee: number;
  requestDate: string; // YYYY-MM-DD
  clientName?: string;
  contractNumber?: string;
  notes?: string;
}

export interface BreakdownItem {
  label: string; // Ex: "Mês 1", "Mês 2", "15 dias restantes"
  type: 'month' | 'days';
  value: number; // Ex: 100, 50
  quantity: number; // Ex: 1 (mês) ou 15 (dias)
  description: string; // Detalhe do cálculo
}

export interface CalculationResult {
  signatureDateFormatted: string; // DD/MM/YYYY
  endDateFormatted: string; // DD/MM/YYYY
  requestDateFormatted: string; // DD/MM/YYYY
  monthlyFeeFormatted: string; // R$ X.XXX,XX
  daysRemaining: number;
  monthsRemainingTruncated: number;
  monthsRemainingRounded: number;
  fineValueTruncated: number;
  fineValueRounded: number;
  isExempt: boolean;
  timelineProgress: number; // percentage of contract fulfilled
  breakdown: BreakdownItem[]; // Decomposição didática solicitada
  monthsPart: number; // quantidade de meses inteiros restantes
  daysPart: number; // quantidade de dias inteiros restantes
}
