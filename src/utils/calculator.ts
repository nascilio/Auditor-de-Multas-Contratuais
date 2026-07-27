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
  const fineValue = useRounding ? result.fineValueRounded : result.fineValueTruncated;
  const fineFormatted = formatCurrencyBR(fineValue);
  
  if (result.isExempt) {
    return `Olá! Realizamos a auditoria de fidelidade de seu contrato:

📅 *Início:* ${result.signatureDateFormatted}
📅 *Cancelamento:* ${result.requestDateFormatted}

✅ *Status:* O período de fidelidade de 12 meses já foi cumprido integralmente. A rescisão foi efetuada *sem cobrança de multa compensatória*.

Ficamos à disposição para qualquer dúvida!`;
  }

  // Decomposição das parcelas de forma compacta
  let parcelasTexto = '';
  result.breakdown.forEach((item) => {
    const valorFormatado = formatCurrencyBR(item.value);
    if (item.type === 'month') {
      parcelasTexto += `• *${item.label}:* ${valorFormatado} (mês cheio)\n`;
    } else {
      parcelasTexto += `• *${item.label}:* ${valorFormatado} (pro-rata)\n`;
    }
  });

  return `Olá! Segue o detalhamento da multa compensatória do seu contrato:

📅 *Início:* ${result.signatureDateFormatted}
📅 *Fim Previsto:* ${result.endDateFormatted}
📅 *Cancelamento:* ${result.requestDateFormatted}
💵 *Mensalidade:* ${result.monthlyFeeFormatted}

⏳ *Tempo Restante:* ${result.daysRemaining} dias (${result.monthsPart} ${result.monthsPart === 1 ? 'mês' : 'meses'} e ${result.daysPart} ${result.daysPart === 1 ? 'dia' : 'dias'})

📊 *Decomposição do Cálculo:*
${parcelasTexto}
💰 *VALOR TOTAL DA MULTA:* *${fineFormatted}*

Ficamos à disposição para esclarecer qualquer dúvida!`;
}

const MONTH_NAMES_BR = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function calculateDiscount(data: import('../types').DiscountData): import('../types').DiscountResult {
  const { monthlyFee, affectedDays, monthYear, discountPercentage = 20 } = data;
  
  const [yearStr, monthStr] = (monthYear || '2026-02').split('-');
  const year = parseInt(yearStr, 10) || new Date().getFullYear();
  const month = parseInt(monthStr, 10) || (new Date().getMonth() + 1);
  
  const daysInMonth = getDaysInMonth(year, month);
  const monthName = MONTH_NAMES_BR[month - 1] || 'Mês';
  const monthNameBR = `${monthName} de ${year}`;
  
  // 1. Mensalidade / Dias do Mês (ex: 100 / 30 = 3,33)
  const dailyRate = monthlyFee > 0 && daysInMonth > 0 ? monthlyFee / daysInMonth : 0;
  
  // 2. Valor Diário x Dias com problema (ex: 3,33 x 15 = 50,00)
  const proportionalDaysValue = dailyRate * affectedDays;
  
  // 3. Aplicar % de Desconto sobre o valor dos dias afetados (ex: 50,00 x 20% = 10,00)
  const discountValue = Math.min(monthlyFee, proportionalDaysValue * (discountPercentage / 100));
  
  // 4. Valor Líquido Final da Mensalidade
  const netMonthlyFee = Math.max(0, monthlyFee - discountValue);
  
  // Percentual de desconto efetivo sobre a mensalidade inteira
  const effectiveDiscountPercentage = monthlyFee > 0 ? (discountValue / monthlyFee) * 100 : 0;
  
  return {
    monthlyFee,
    monthlyFeeFormatted: formatCurrencyBR(monthlyFee),
    affectedDays,
    monthYear,
    monthNameBR,
    daysInMonth,
    dailyRate,
    dailyRateFormatted: formatCurrencyBR(dailyRate),
    proportionalDaysValue,
    proportionalDaysValueFormatted: formatCurrencyBR(proportionalDaysValue),
    discountPercentage,
    discountValue,
    discountValueFormatted: formatCurrencyBR(discountValue),
    netMonthlyFee,
    netMonthlyFeeFormatted: formatCurrencyBR(netMonthlyFee),
    effectiveDiscountPercentage
  };
}

export function generateDiscountMarkdownReport(data: import('../types').DiscountData): string {
  const result = calculateDiscount(data);
  
  return `# RELATÓRIO DE ISENÇÃO / DESCONTO DE MENSALIDADE (PRO-RATA)

**Data da Auditoria:** ${new Date().toLocaleDateString('pt-BR')}

---

### 1. Parâmetros da Ocorrência
- **Mensalidade Base do Cliente:** ${result.monthlyFeeFormatted}
- **Mês/Ano do Ocorrido:** ${result.monthNameBR} (${result.daysInMonth} dias no mês)
- **Dias Registrados com Problema:** ${result.affectedDays} ${result.affectedDays === 1 ? 'dia' : 'dias'}
- **Percentual de Desconto Aplicado:** ${result.discountPercentage}%

> 📌 *Nota de Origem:* A quantidade de dias afetados deve ser coletada no ticket do problema no sistema de suporte.

---

### 2. Memória de Cálculo
1. **Valor por Dia no Mês:**
   \`\`\`
   ${result.monthlyFeeFormatted} ÷ ${result.daysInMonth} dias = ${result.dailyRateFormatted} / dia
   \`\`\`

2. **Valor Correspondente aos Dias Indisponíveis:**
   \`\`\`
   ${result.dailyRateFormatted} / dia × ${result.affectedDays} dias = ${result.proportionalDaysValueFormatted}
   \`\`\`

3. **Aplicação do Desconto Configurado (${result.discountPercentage}%):**
   \`\`\`
   ${result.proportionalDaysValueFormatted} × ${result.discountPercentage}% = ${result.discountValueFormatted} (Abatimento Final)
   \`\`\`

4. **Mensalidade Final a Cobrar:**
   \`\`\`
   ${result.monthlyFeeFormatted} - ${result.discountValueFormatted} = ${result.netMonthlyFeeFormatted}
   \`\`\`

---

### 3. Tabela Resumo da Auditoria
| Item / Parâmetro | Valor |
| :--- | :--- |
| **Mensalidade Integral** | ${result.monthlyFeeFormatted} |
| **Dias do Mês Selecionado** | ${result.daysInMonth} dias |
| **Valor por Dia** | ${result.dailyRateFormatted} |
| **Dias com Problema** | ${result.affectedDays} dias |
| **Valor Bruto dos Dias Afetados** | ${result.proportionalDaysValueFormatted} |
| **Percentual de Desconto** | ${result.discountPercentage}% |
| **Abatimento Final Concedido** | **${result.discountValueFormatted}** |
| **Valor Final a Cobrar** | **${result.netMonthlyFeeFormatted}** |

---

> ⚠️ **Nota Diretiva Fundamental:**
> Este cálculo deve ser utilizado como base e referência para o abatimento e não como uma regra absoluta. Existem situações em que o cliente enfrentou instabilidade em apenas uma funcionalidade específica enquanto a plataforma permaneceu operante no geral. Nesses casos, o abatimento pode ser negociado proporcionalmente.`;
}

