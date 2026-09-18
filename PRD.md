# Product Requirements Document (PRD) — Auditor de Multas Contratuais & Descontos Pro-Rata

**Versão do Documento:** 2.0.0  
**Data de Atualização:** 18/09/2026  
**Finalidade:** Especificação funcional, técnica, comportamental e de segurança para suítes de testes automatizados (E2E, Integração, Unitários, Fuzzing e Testes de Penetração/Segurança).

---

## 1. Visão Geral do Produto

### 1.1 Objetivo
O **Auditor de Multas Contratuais & Descontos Pro-Rata** é uma aplicação web financeira projetada para auditar contratos de prestação de serviços continuados (SaaS, Telecom, Facilities). O sistema realiza:
1. **Auditoria de Multa Rescisória:** Cálculo da multa por cancelamento antecipado de fidelidade (12 meses), utilizando decomposição didática de meses cheios e fração de dias baseada na média real anual (30,4167 dias/mês).
2. **Cálculo de Desconto por Indisponibilidade (SLA):** Apuração pro-rata de abatimento sobre mensalidade devido a dias de falha/instabilidade técnica, com alíquota configurável e alerta obrigatório de compliance para concessões acima de 21%.
3. **Persistência em Nuvem (Firebase Firestore):** Sincronização em tempo real de auditorias e propostas de desconto salvas.

### 1.2 Stack Tecnológica
- **Linguagem & Runtime:** TypeScript, Node.js.
- **Frontend Framework:** React 18+ com Vite.
- **Estilização & UI:** Tailwind CSS (utility classes), Lucide React (ícones), Motion (animações de transição).
- **Backend / BaaS:** Firebase Firestore (Cloud Firestore Web SDK v11).
- **Armazenamento de Contingência:** LocalStorage (`audit_history`).

---

## 2. Arquitetura do Sistema e Fluxo de Dados

```
[ Usuário / QA Automated Runner ]
              │
              ▼
   [ React UI (Porta 3000) ]
   ├── Tab 1: Auditoria de Multa Rescisória (Fidelidade)
   └── Tab 2: Descontos e Isenções Pro-Rata (SLA / Chamados)
              │
   ┌──────────┴──────────┐
   ▼                     ▼
[ Local Engine ]     [ Firebase Service ]
(calculator.ts)      (firebaseService.ts)
   │                     │
   ▼                     ▼
- Pure Functions      - Firestore SDK (v11)
- Intl Currency BR    - Collection 'audits'
- Intl Date BR        - Collection 'discounts'
- Markdown Generator  - Realtime onSnapshot listener
```

---

## 3. Módulos Funcionais e Regras de Negócio Detalhadas

### 3.1 Módulo 1: Auditoria de Multa Rescisória (`mainTab === 'fidelity'`)

#### 3.1.1 Parâmetros de Entrada
| Campo | Tipo / Formato | Obrigatório | Restrições / Validações |
| :--- | :--- | :--- | :--- |
| `signatureDate` | String (`YYYY-MM-DD`) | Sim | Data válida de assinatura. |
| `endDate` | String (`YYYY-MM-DD`) | Automático | Calculado: `signatureDate + 12 meses`. Campo readonly. |
| `requestDate` | String (`YYYY-MM-DD`) | Sim | Data em que o cliente solicitou cancelamento. |
| `monthlyFee` | Number (Float) | Sim | Valor base da mensalidade (`>= 0`). |
| `clientName` | String | Opcional | Nome/razão social para dossiê. |
| `contractNumber`| String | Opcional | Identificador/protocolo do contrato. |
| `notes` | String | Opcional | Observações internas. |

#### 3.1.2 Regras de Negócio & Fórmulas
1. **Data Fim da Fidelidade:**
   - Adiciona exatamente 12 meses à `signatureDate` preservando dia e mês.
   - Fórmula: `endDate = new Date(year, month + 12, day)`.
2. **Validação de Inconsistência Temporal:**
   - Se `requestDate < signatureDate`, a interface exibe banner de erro:
     `"A data de solicitação de cancelamento não pode ser anterior à data de assinatura do contrato."`
   - O cálculo continua operando matematicamente, mas o estado de erro é sinalizado.
3. **Regra de Isenção (Cumprimento da Fidelidade):**
   - Se `requestDate >= endDate`:
     - `isExempt = true`.
     - `daysRemaining = 0`.
     - `monthsRemaining = 0`.
     - `fineValue = R$ 0,00` (ISENTO).
     - Relatório e mensagens indicam: *"O período de fidelidade de 12 meses já foi cumprido integralmente."*
4. **Cálculo de Dias Restantes:**
   - Diferença em dias corridos calculada ao meio-dia UTC para evitar desvios de horário de verão (DST):
     $$\text{daysRemaining} = \text{round}\left(\frac{\text{endDate} - \text{requestDate}}{1000 \times 60 \times 60 \times 24}\right)$$
5. **Conversão Pro-Rata em Meses:**
   - Base do ano comercial/civil padrão Anatel/Telecom: $365 \div 12 = 30,4167$ dias/mês.
     $$\text{monthsRemainingRaw} = \frac{\text{daysRemaining}}{30,4167}$$
6. **Modos de Precisão Numérica:**
   - **Modo Truncado (Default):**
     $$\text{monthsRemainingTruncated} = \frac{\lfloor \text{monthsRemainingRaw} \times 10000 \rfloor}{10000}$$
     $$\text{fineValueTruncated} = \text{monthlyFee} \times \text{monthsRemainingTruncated}$$
   - **Modo Arredondado:**
     $$\text{monthsRemainingRounded} = \frac{\text{round}(\text{monthsRemainingRaw} \times 10000)}{10000}$$
     $$\text{fineValueRounded} = \text{monthlyFee} \times \text{monthsRemainingRounded}$$
7. **Decomposição Didática de Parcelas:**
   - Meses cheios: $\text{monthsPart} = \lfloor \text{monthsRemainingRaw} \rfloor$. Cada mês completo equivale a $1 \times \text{monthlyFee}$.
   - Fração restante: $\text{remainingDaysFraction} = \text{daysRemaining} - (\text{monthsPart} \times 30,4167)$.
   - Se a fração $\ge 30$, converte em +1 mês cheio e 0 dias.
   - Valor da fração: $(\text{remainingDaysFraction} / 30,4167) \times \text{monthlyFee}$.

---

### 3.2 Módulo 2: Descontos e Isenções Pro-Rata (`mainTab === 'discounts'`)

#### 3.2.1 Parâmetros de Entrada
| Campo | Tipo / Formato | Default | Limites |
| :--- | :--- | :--- | :--- |
| `monthlyFee` | Number | 500,00 | $\ge 0$ |
| `affectedDays` | Number (Float) | 3 | $\ge 0$ |
| `monthYear` | String (`YYYY-MM`) | 2026-02 | Formato de mês e ano válido |
| `discountPercentage` | Number | 20 | $\ge 0$ e $\le 100$ |

#### 3.2.2 Regras de Negócio & Fórmulas
1. **Dias Reais do Mês:**
   - Calculado dinamicamente: `new Date(year, month, 0).getDate()`.
   - Considera anos bissextos (ex: Fev/2024 = 29 dias, Fev/2026 = 28 dias).
2. **Passo 1 — Tarifa Diária do Mês:**
   $$\text{dailyRate} = \frac{\text{monthlyFee}}{\text{daysInMonth}}$$
3. **Passo 2 — Valor Bruto dos Dias Afetados:**
   $$\text{proportionalDaysValue} = \text{dailyRate} \times \text{affectedDays}$$
4. **Passo 3 — Aplicação da Alíquota de Desconto:**
   $$\text{discountValue} = \min\left(\text{monthlyFee}, \text{proportionalDaysValue} \times \frac{\text{discountPercentage}}{100}\right)$$
5. **Passo 4 — Valor Líquido Final a Faturar:**
   $$\text{netMonthlyFee} = \max(0, \text{monthlyFee} - \text{discountValue})$$
6. **Regra Crítica de Governança (Aprovação de Diretoria):**
   - **Condição:** Se `discountPercentage > 21`:
     - O texto descritivo assume estilo vermelho (`text-red-600 font-semibold`).
     - Ícone `AlertTriangle` é exibido.
     - Texto obrigatório exibido:  
       `"Atenção: descontos acima de 21% precisam de aprovação da diretoria."`
     - O input recebe borda e foco vermelhos (`border-red-300 focus:border-red-600`).
     - O badge de percentual exibe `• Requer Aprovação` com fundo vermelho (`bg-red-50 text-red-700`).

---

## 4. Estrutura de Dados e Esquema Firestore

### 4.1 Coleção `/audits/{auditId}`
```json
{
  "signatureDate": "2025-05-15",
  "requestDate": "2026-02-10",
  "monthlyFee": 650.00,
  "clientName": "Empresa ABC Ltda",
  "contractNumber": "CTR-9921",
  "notes": "Solicitado cancelamento por encerramento de filial",
  "createdAt": "2026-08-07T19:16:00.000Z"
}
```

### 4.2 Coleção `/discounts/{discountId}`
```json
{
  "monthlyFee": 1200.00,
  "affectedDays": 5,
  "monthYear": "2026-03",
  "discountPercentage": 25,
  "notes": "Instabilidade geral no link de fibra",
  "createdAt": "2026-08-07T19:16:00.000Z"
}
```

---

## 5. Mapeamento de Elementos DOM e Seletores para Testes Automatizados

### 5.1 Navegação Principal e Modos
| Elemento | Seletor Recomendado | Tipo | Ação / Comportamento |
| :--- | :--- | :--- | :--- |
| Tab Multa | `button:has-text("Auditoria de Multa Rescisória")` | Botão | Ativa visualização da aba de rescisão |
| Tab Descontos | `button:has-text("Descontos e Isenções")` | Botão | Ativa visualização da aba de pro-rata/SLA |
| Toggle Visual | `button:has-text("Visualização Gráfica")` | Botão | Alterna para cards e timeline |
| Toggle Markdown | `button:has-text("Markdown Copiável")` | Botão | Alterna para bloco de código markdown |
| Toggle Arredondamento | `button[title*="Alterne entre truncamento"]` | Botão | Alterna entre "Truncado" e "Arredondado" |

### 5.2 Formulário de Multa Rescisória
| Campo | Seletor | Tipo | Interação |
| :--- | :--- | :--- | :--- |
| Data Assinatura | `input[type="date"]:nth-of-type(1)` | Input Date | `page.fill(selector, '2025-01-10')` |
| Data Cancelamento | `input[type="date"]:nth-of-type(2)` | Input Date | `page.fill(selector, '2025-08-15')` |
| Mensalidade Base | `input[type="number"][placeholder="500,00"]` | Input Number | `page.fill(selector, '800')` |
| Copiar Mensagem | `button:has-text("Copiar Mensagem")` | Botão | Escreve no clipboard |
| Copiar Markdown | `button:has-text("Copiar Relatório")` | Botão | Escreve no clipboard |
| Área de Texto Cliente | `textarea[readonly]` | Textarea | Leitura do texto pronto de cliente |

### 5.3 Formulário de Descontos e Isenções
| Campo | Seletor | Tipo | Interação |
| :--- | :--- | :--- | :--- |
| Mensalidade | `input[type="number"][placeholder="100,00"]` | Input Number | `page.fill(selector, '1000')` |
| Mês/Ano Referência | `input[type="month"]` | Input Month | `page.fill(selector, '2026-02')` |
| Dias com Problema | `input[type="number"][placeholder="15"]` | Input Number | `page.fill(selector, '5')` |
| % de Desconto | `input[type="number"][placeholder="20"]` | Input Number | `page.fill(selector, '25')` |
| Presets de % | `button:has-text("10%")`, `20%`, etc. | Botão | Ajusta instantaneamente a % |
| Salvar no Firebase | `button:has-text("Salvar Proposta de Abatimento no Firebase")` | Botão | Dispara gravação no Firestore |
| Lista Salvos | `div:has-text("Abatimentos Salvos no Firebase")` | Container | Listagem reativa do Firestore |

---

## 6. Análise de Segurança e Vetores de Vulnerabilidade (Pentest & DAST)

Para ferramentas de análise de vulnerabilidade (ex: OWASP ZAP, Burp Suite, Snyk, SonarQube, scripts de teste de injeção), os seguintes vetores devem ser testados:

### 6.1 Regras de Segurança do Firestore (`firestore.rules`)
- **Configuração Atual:**
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /audits/{auditId} {
        allow read, write: if true;
      }
      match /discounts/{discountId} {
        allow read, write: if true;
      }
    }
  }
  ```
- **Vulnerabilidade Identificada para Teste:**
  - `Unauthenticated Access & Open Writes`: Qualquer cliente conectado com o Firebase config consegue ler, injetar, alterar ou deletar qualquer registro nas coleções `audits` e `discounts`.
  - **Cenário de Teste de Segurança:** Submissão de documentos arbitrários via SDK sem autenticação (`anon-write`, `data-tampering`).

### 6.2 Vetores de Injeção de Código & XSS
- **Superfície de Teste:**
  - Injeção nos campos `clientName`, `contractNumber`, `notes`.
  - Payloads de teste: `<script>alert(1)</script>`, `"><img src=x onerror=alert(1)>`, `javascript:alert(1)`.
  - Comportamento esperado: React faz escape automático de strings no JSX. O relatório markdown é inserido em bloco `<pre>`, evitando interpretação de HTML perigoso. O teste deve validar se nenhuma injeção é executada no DOM.

### 6.3 Vetores de Manipulação Numérica e Float Precision
- **Divisão por Zero:** O que ocorre se `monthYear` for inválido ou se `daysInMonth = 0`?
  - Tratamento: `dailyRate = monthlyFee > 0 && daysInMonth > 0 ? monthlyFee / daysInMonth : 0`. Evita `NaN` e `Infinity`.
- **Valores Negativos:** O que ocorre ao passar valores negativos para `monthlyFee`, `affectedDays` ou `discountPercentage`?
  - O sistema utiliza `Math.max(0, ...)` e `Math.min(100, ...)` para blindar contra desvios de integridade.

---

## 7. Matriz de Casos de Teste Automatizados (Test Suite Specification)

### 7.1 Testes Funcionais Positivos (Happy Path)
| ID | Cenário | Entradas | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **TC-FUNC-01** | Rescisão no meio do contrato | Assinatura: `2025-01-01`<br>Canc: `2025-07-01`<br>Mensalidade: `R$ 1.000,00` | Fim: `2026-01-01`. Dias restantes: 184. Isento: `false`. Multa calculada com base em 184 dias. |
| **TC-FUNC-02** | Rescisão após cumprimento de 12 meses | Assinatura: `2024-01-01`<br>Canc: `2025-01-02`<br>Mensalidade: `R$ 500,00` | Isento: `true`. Multa: `R$ 0,00`. Status de isenção exibido no UI e nos relatórios. |
| **TC-FUNC-03** | Rescisão no dia exato do término | Assinatura: `2025-01-01`<br>Canc: `2026-01-01`<br>Mensalidade: `R$ 500,00` | Isento: `true`. Multa: `R$ 0,00`. |
| **TC-FUNC-04** | Alternância Truncado vs Arredondado | Entradas com fração dízima | O valor truncado mantém 4 casas sem arredondamento superior; o arredondado aplica aproximação padrão. |
| **TC-FUNC-05** | Cálculo de Desconto Pro-Rata padrão | Mensalidade: `R$ 300,00`<br>Mês: `2026-04` (30 dias)<br>Dias afetados: `3`<br>%: `20%` | Tarifa diária: R$ 10,00. Valor dos dias: R$ 30,00. Desconto (20%): R$ 6,00. Mensalidade líquida: R$ 294,00. |
| **TC-FUNC-06** | Alerta de Aprovação da Diretoria ($\le 21\%$) | Desconto: `20%` ou `21%` | Banner vermelho ausente. Badge azul normal. Texto de diretoria oculto. |
| **TC-FUNC-07** | Alerta de Aprovação da Diretoria ($> 21\%$) | Desconto: `22%` ou `50%` | Texto vermelho exibido: *"Atenção: descontos acima de 21% precisam de aprovação da diretoria."* Borda vermelha ativa. |
| **TC-FUNC-08** | Persistência Firestore (Desconto) | Clicar em "Salvar Proposta de Abatimento" | Documento criado no Firestore, listener atualiza a lista "Abatimentos Salvos", botão exibe estado de sucesso. |
| **TC-FUNC-09** | Exclusão Firestore (Desconto) | Clicar no botão lixeira do item salvo | Documento removido do Firestore e da lista da interface. |

### 7.2 Testes de Limite e Casos de Borda (Boundary & Edge Cases)
| ID | Cenário | Entradas | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **TC-EDGE-01** | Ano Bissexto (Fevereiro com 29 dias) | Mês: `2024-02` | `daysInMonth` deve ser exatamente 29. |
| **TC-EDGE-02** | Ano Não Bissexto (Fevereiro com 28 dias) | Mês: `2026-02` | `daysInMonth` deve ser exatamente 28. |
| **TC-EDGE-03** | Mês com 31 dias | Mês: `2026-01` ou `2026-07` | `daysInMonth` deve ser exatamente 31. |
| **TC-EDGE-04** | Dias afetados superiores aos dias do mês | Mês com 30 dias, `affectedDays = 45` | O sistema calcula o proporcional, mas o desconto máximo é limitado à própria mensalidade (`Math.min(monthlyFee, ...)`). |
| **TC-EDGE-05** | Desconto de 100% | `discountPercentage = 100` | Mensalidade líquida não fica negativa; valor líquido = `Math.max(0, ...)`. |
| **TC-EDGE-06** | Mensalidade Zero | `monthlyFee = 0` | Todos os cálculos retornam `0,00` sem erro de divisão ou `NaN`. |

### 7.3 Testes Negativos e Validações
| ID | Cenário | Entradas | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **TC-NEG-01** | Cancelamento anterior à assinatura | Assinatura: `2026-05-01`<br>Canc: `2026-01-01` | Banner de erro visível com texto explicativo de inconsistência temporal. |
| **TC-NEG-02** | Entrada com caracteres não numéricos na mensalidade | `monthlyFee = "abc"` ou vazio | Fallback para 0 sem travamento de renderização. |
| **TC-NEG-03** | % de Desconto negativo digitado | `discountPercentage = -10` | Sanitizado via `Math.max(0, ...)` resultando em 0%. |
| **TC-NEG-04** | % de Desconto acima de 100 | `discountPercentage = 150` | Limitado via `Math.min(100, ...)` resultando no teto de 100%. |

### 7.4 Testes de Segurança e Penetração (Security & Pentest)
| ID | Tipo de Teste | Vetor / Ação | Critério de Aceite |
| :--- | :--- | :--- | :--- |
| **TC-SEC-01** | Stored XSS em `clientName` | `clientName = "<img src=x onerror=alert('xss')>"` | Renderizado como texto escapado; nenhum script disparado. |
| **TC-SEC-02** | Stored XSS em `notes` | `notes = "<script>document.location='http://evil.com'</script>"` | Renderizado com segurança em textareas e blocos `<pre>`. |
| **TC-SEC-03** | Injeção em Parâmetros de Data | `signatureDate = "'; DROP TABLE audits; --"` | Rejeitado ou tratado como string inválida sem quebra do motor. |
| **TC-SEC-04** | Mass Write / Flooding Firestore | 50 requisições simultâneas de gravação | Verificar estabilidade da conexão e debounce da UI. |
| **TC-SEC-05** | Leak de Variáveis Sensíveis | Inspeção do bundle compilado | Chaves privadas ou tokens não devem estar expostos no frontend. |
