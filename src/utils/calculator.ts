import { ContractData, CalculationResult, BreakdownItem } from '../types';

export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getEndDate(signatureDateStr: string): string {
  if (!signatureDateStr) return '';
  const [year, month, day] = signatureDateStr.split('-').map(Number);
  // Add 12 months exactly
  const date = new Date(year, month - 1, day);
  date.setMonth(date.getMonth() + 12);
  
  const endYear = date.getFullYear();
  const endMonth = date.getMonth() + 1;
  const endDay = date.getDate();
  
  const yStr = endYear.toString();
  const mStr = endMonth.toString().padStart(2, '0');
  const dStr = endDay.toString().padStart(2, '0');
  return `${yStr}-${mStr}-${dStr}`;
}

export function getDaysDifference(dateStr1: string, dateStr2: string): number {
  const d1 = parseDateString(dateStr1);
  const d2 = parseDateString(dateStr2);
  
  // Set to noon to avoid DST changes causing off-by-one errors
  d1.setHours(12, 0, 0, 0);
  d2.setHours(12, 0, 0, 0);
  
  const diffMs = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function formatCurrencyBR(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function formatDecimalBR(value: number, decimals: number = 4): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

export function calculateFine(data: ContractData): CalculationResult {
  const { signatureDate, monthlyFee, requestDate } = data;
  const endDate = getEndDate(signatureDate);
  
  const sigDateObj = parseDateString(signatureDate);
  const reqDateObj = parseDateString(requestDate);
  const endDateObj = parseDateString(endDate);
  
  const isExempt = reqDateObj.getTime() >= endDateObj.getTime();
  
  if (isExempt) {
    return {
      signatureDateFormatted: formatDateBR(signatureDate),
      endDateFormatted: formatDateBR(endDate),
      requestDateFormatted: formatDateBR(requestDate),
      monthlyFeeFormatted: formatCurrencyBR(monthlyFee),
      daysRemaining: 0,
      monthsRemainingTruncated: 0,
      monthsRemainingRounded: 0,
      fineValueTruncated: 0,
      fineValueRounded: 0,
      isExempt: true,
      timelineProgress: 100,
      breakdown: [],
      monthsPart: 0,
      daysPart: 0
    };
  }
  
  const daysRemaining = getDaysDifference(requestDate, endDate);
  const totalDays = getDaysDifference(signatureDate, endDate);
  const fulfilledDays = Math.max(0, totalDays - daysRemaining);
  const timelineProgress = Math.min(100, Math.round((fulfilledDays / totalDays) * 100));
  
  // Calculate raw fractional months
  const monthsRemainingRaw = daysRemaining / 30.4167;
  
  // Truncated to 4 decimals (e.g. 3.55068 -> 3.5506)
  const monthsRemainingTruncated = Math.floor(monthsRemainingRaw * 10000) / 10000;
  // Rounded to 4 decimals
  const monthsRemainingRounded = Math.round(monthsRemainingRaw * 10000) / 10000;
  
  // Value calculations
  const fineValueTruncated = monthlyFee * monthsRemainingTruncated;
  const fineValueRounded = monthlyFee * monthsRemainingRounded;

  // Breakdown generation
  const breakdown: BreakdownItem[] = [];
  let monthsPart = Math.floor(monthsRemainingRaw);
  let daysPart = Math.round(daysRemaining - (monthsPart * 30.4167));
  if (daysPart >= 30) {
    monthsPart += 1;
    daysPart = 0;
  }
  
  // 1. Add individual full months
  for (let i = 1; i <= monthsPart; i++) {
    breakdown.push({
      label: `Mês ${i}`,
      type: 'month',
      value: monthlyFee,
      quantity: 1,
      description: '1 mês completo restante de fidelidade'
    });
  }

  // 2. Add remaining fractional days if any
  if (daysPart > 0) {
    // Note: for calculation consistency, we can compute daysVal based on the remainingDaysFraction to exactly match fine values.
    // Let's compute remainingDaysFraction = daysRemaining - (monthsPart * 30.4167).
    const remainingDaysFraction = daysRemaining - (monthsPart * 30.4167);
    const daysVal = (remainingDaysFraction / 30.4167) * monthlyFee;
    breakdown.push({
      label: `${daysPart} ${daysPart === 1 ? 'dia' : 'dias'}`,
      type: 'days',
      value: daysVal,
      quantity: remainingDaysFraction,
      description: `Proporcional de ${formatDecimalBR(remainingDaysFraction, 4)} dias (${formatDecimalBR(remainingDaysFraction, 4)} / 30,4167)`
    });
  }
  
  return {
    signatureDateFormatted: formatDateBR(signatureDate),
    endDateFormatted: formatDateBR(endDate),
    requestDateFormatted: formatDateBR(requestDate),
    monthlyFeeFormatted: formatCurrencyBR(monthlyFee),
    daysRemaining,
    monthsRemainingTruncated,
    monthsRemainingRounded,
    fineValueTruncated,
    fineValueRounded,
    isExempt: false,
    timelineProgress,
    breakdown,
    monthsPart,
    daysPart
  };
}

export function generateMarkdownReport(data: ContractData, useRounding: boolean = false): string {
  const result = calculateFine(data);
  const monthsVal = useRounding ? result.monthsRemainingRounded : result.monthsRemainingTruncated;
  const fineValFormatted = result.isExempt ? 'ISENTO' : formatCurrencyBR(useRounding ? result.fineValueRounded : result.fineValueTruncated);
  
  let markdown = `### 📊 Relatório de Rescisão Contratual
* **Data de Assinatura:** ${result.signatureDateFormatted}
* **Data de Fim Prevista:** ${result.endDateFormatted}
* **Data de Solicitação:** ${result.requestDateFormatted}
* **Valor da Mensalidade Base:** ${result.monthlyFeeFormatted}

---
### 🧮 Memória de Cálculo
* **Dias restantes para o término:** ${result.isExempt ? '0 dias' : `${result.daysRemaining} dias`}
* **Proporcional restante:** ${result.isExempt ? '0 meses e 0 dias' : `${result.monthsPart} ${result.monthsPart === 1 ? 'mês' : 'meses'} e ${result.daysPart} ${result.daysPart === 1 ? 'dia' : 'dias'}`} (${formatDecimalBR(monthsVal, 4)} meses)
`;

  if (!result.isExempt && result.breakdown.length > 0) {
    markdown += `\n**Decomposição Didática de Parcelas:**\n`;
    result.breakdown.forEach((item) => {
      const displayVal = formatCurrencyBR(item.value);
      if (item.type === 'month') {
        markdown += `* **${item.label}:** ${displayVal} (1 mês completo)\n`;
      } else {
        markdown += `* **${item.label}:** ${displayVal} (Fração de dias: ${item.description.split(' (')[1].replace(')', '')})\n`;
      }
    });
  }

  if (result.isExempt) {
    markdown += `\n* **VALOR DA MULTA COMPENSATÓRIA:** ISENTO (Fidelidade de 12 meses cumprida ou superada)
---`;
  } else {
    markdown += `\n* **VALOR DA MULTA COMPENSATÓRIA:** ${fineValFormatted}
---`;
  }
  
  return markdown;
}

export function generateClientShareMessage(data: ContractData, useRounding: boolean = false): string {
  const result = calculateFine(data);
  const clientName = data.clientName || 'Prezado(a) Cliente';
  const contractNum = data.contractNumber ? ` (Contrato: #${data.contractNumber})` : '';
  const fineValue = useRounding ? result.fineValueRounded : result.fineValueTruncated;
  const fineFormatted = formatCurrencyBR(fineValue);
  
  if (result.isExempt) {
    return `Prezado(a) ${clientName},

Gostaria de informar que realizamos a auditoria da fidelidade de seu contrato${contractNum}.

Identificamos que o período mínimo de permanência de 12 meses já foi integralmente cumprido ou superado (solicitado em ${result.requestDateFormatted}, com início em ${result.signatureDateFormatted}).

Dessa forma, a rescisão contratual foi efetuada sem nenhuma incidência de multa compensatória.

Agradecemos pela parceria!
Atenciosamente,
Auditoria Financeira`;
  }

  // Decomposição das parcelas
  let parcelasTexto = '';
  result.breakdown.forEach((item) => {
    const valorFormatado = formatCurrencyBR(item.value);
    if (item.type === 'month') {
      parcelasTexto += `• ${item.label}: ${valorFormatado} (1 mês completo)\n`;
    } else {
      const formattedQuantity = item.quantity.toFixed(4).replace('.', ',');
      parcelasTexto += `• ${item.label}: ${valorFormatado} (${formattedQuantity} dias proporcionais base 30,4167)\n`;
    }
  });

  return `Prezado(a) ${clientName},

Gostaria de apresentar o detalhamento da auditoria de faturamento rescisório de seu contrato${contractNum}:

• Início do Contrato: ${result.signatureDateFormatted}
• Fim Previsto da Fidelidade: ${result.endDateFormatted}
• Data de Solicitação da Rescisão: ${result.requestDateFormatted}
• Valor da Mensalidade Base: ${result.monthlyFeeFormatted}

Com base nestas datas, restam ainda ${result.daysRemaining} dias para a conclusão do período de fidelidade contratual (correspondendo a exatamente ${result.monthsPart} ${result.monthsPart === 1 ? 'mês' : 'meses'} e ${result.daysPart} ${result.daysPart === 1 ? 'dia' : 'dias'}).

O cálculo pro-rata (proporcional) foi decomposto da seguinte forma didática:
${parcelasTexto}
▶ VALOR TOTAL DA MULTA COMPENSATÓRIA: ${fineFormatted}

Ficamos à disposição para qualquer esclarecimento adicional.
Atenciosamente,
Auditoria Financeira`;
}

