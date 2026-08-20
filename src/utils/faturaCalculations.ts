/**
 * Cálculo EXATO do devido no MÊS ATUAL
 * À vista = comprada neste mês
 * Parcelado = SOMENTE a parcela que vence ESTE mês
 */

import type { Expense, Parcela } from '../types/expense';

export type Pessoa = 'Juliano' | 'Lidiane';

export interface ResumoFatura {
  total: number;        // Devido neste mês
  pago: number;         // Já pago por ESTA pessoa neste mês
  restante: number;     // Falta pagar = total - pago
  totalPagoGeral: number; // Histórico total pago
  mesInicio: Date;
  mesFim: Date;
}

function parseDataLocal(dataStr: string): Date {
  const somenteData = (dataStr || '').split('T')[0];
  const [ano, mes, dia] = somenteData.split('-').map(Number);
  return new Date(ano || 1970, (mes || 1) - 1, dia || 1);
}

function addMeses(data: Date, meses: number): Date {
  return new Date(data.getFullYear(), data.getMonth() + meses, data.getDate());
}

export function getMesAtual(hoje: Date = new Date()): { inicio: Date; fim: Date } {
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1, 0, 0, 0, 0);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);
  return { inicio, fim };
}

// Verifica se duas datas são do MESMO mês e ano
function mesmoMes(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function pagoPorPessoa(
  pessoa: Pessoa,
  pagaJuliano?: boolean | null,
  pagaLidiane?: boolean | null
): boolean {
  return pessoa === 'Juliano' ? !!pagaJuliano : !!pagaLidiane;
}

export function calcularFatura(
  expenses: Expense[],
  parcelas: Parcela[],
  pessoa: Pessoa,
  hoje: Date = new Date()
): ResumoFatura {
  const { inicio: mesAtualInicio } = getMesAtual(hoje);

  let total = 0;
  let pago = 0;
  let totalPagoGeral = 0;

  // ======================================
  // 1. COMPRAS À VISTA — SOMENTE do mês atual
  // ======================================
  for (const expense of expenses) {
    if (expense.forma_pagamento !== 'a_vista') continue;

    const dataCompra = parseDataLocal(expense.data_compra);

    // ✅ SÓ entra se foi comprada EXATAMENTE neste mês
    if (!mesmoMes(dataCompra, mesAtualInicio)) continue;

    const parte = expense.valor / 2;
    total += parte;

    if (pagoPorPessoa(pessoa, expense.paga_juliano, expense.paga_lidiane)) {
      pago += parte;
      totalPagoGeral += parte;
    }
  }

  // ======================================
  // 2. COMPRAS PARCELADAS — SÓ a parcela DESTE MÊS
  // ======================================
  const parcelasPorGasto = new Map<string, Parcela[]>();
  for (const p of parcelas) {
    const lista = parcelasPorGasto.get(p.gasto_id) || [];
    lista.push(p);
    parcelasPorGasto.set(p.gasto_id, lista);

    // Histórico: soma tudo que já foi pago em qualquer mês
    if (pagoPorPessoa(pessoa, p.paga_juliano, p.paga_lidiane)) {
      totalPagoGeral += p.valor_parcela / 2;
    }
  }

  for (const expense of expenses) {
    if (expense.forma_pagamento !== 'parcelado') continue;

    const listaParcelas = parcelasPorGasto.get(expense.id);
    if (!listaParcelas?.length) continue;

    const mesDaCompra = parseDataLocal(expense.data_compra);

    // Encontra a parcela que vence EXATAMENTE neste mês
    const parcelaDoMes = listaParcelas.find((parcela) => {
      const mesVencimento = addMeses(mesDaCompra, parcela.numero_parcela - 1);
      return mesmoMes(mesVencimento, mesAtualInicio);
    });

    // ✅ Se tem parcela neste mês → SOMA ELA APENAS
    if (parcelaDoMes) {
      const valorParcela = parcelaDoMes.valor_parcela / 2;
      total += valorParcela;

      if (pagoPorPessoa(pessoa, parcelaDoMes.paga_juliano, parcelaDoMes.paga_lidiane)) {
        pago += valorParcela;
      }
    }
  }

  return {
    total,           // 💰 Exatamente o que vence neste mês
    pago,            // ✅ Já pago neste mês
    restante: Math.max(0, total - pago), // ⏳ Falta pagar
    totalPagoGeral, // 📊 Total histórico pago
    mesInicio: mesAtualInicio,
    mesFim: getMesAtual(hoje).fim,
  };
}