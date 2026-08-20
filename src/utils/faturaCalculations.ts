/**
 * Cálculo de "quanto falta pagar" para uma pessoa (Juliano ou Lidiane),
 * considerando apenas a FATURA ATUAL.
 *
 * Regra do ciclo (igual fatura de cartão de crédito):
 *  - Fecha sempre no dia 4 do mês.
 *  - Fica em aberto para pagamento até o dia 10 do MÊS SEGUINTE ao
 *    fechamento (ex: fecha 04/08 → fica aberta até 10/09).
 *  - Assim que o dia 10 passa, a fatura corrente automaticamente vira a
 *    que fechou no dia 4 seguinte (ex: fechou 04/09 → aberta até 10/10).
 *
 * O que entra na fatura atual:
 *  - Compras à vista feitas dentro do período coberto por essa fatura
 *    (do dia 5 do mês anterior ao fechamento até o dia 4 do mês do
 *    fechamento).
 *  - Para compras parceladas, cada parcela tem um fechamento FIXO
 *    (baseado na data da compra + número da parcela) — só a parcela que
 *    fecha NESTA fatura entra na conta.
 *
 * O "pago" é sempre específico de cada pessoa (paga_juliano/paga_lidiane).
 */

import type { Expense, Parcela } from '../types/expense';

export type Pessoa = 'Juliano' | 'Lidiane';

export interface ResumoFatura {
  total: number;
  pago: number;
  restante: number;
  /** Início do período coberto pela fatura atual (dia 5 do mês anterior ao fechamento) */
  cicloInicio: Date;
  /** Data de fechamento da fatura atual (dia 4) */
  cicloFim: Date;
  /** Data limite de pagamento da fatura atual (dia 10 do mês seguinte ao fechamento) */
  cicloVencimento: Date;
}

const DIA_FECHAMENTO = 4;
const DIA_VENCIMENTO = 10;

/**
 * Converte data_compra (pode vir como "YYYY-MM-DD" simples ou como
 * timestamp completo "YYYY-MM-DDTHH:mm:ss.ssssss+00:00") para uma Date
 * local, usando apenas ano/mês/dia — a hora da compra não importa para
 * decidir em qual fatura ela cai.
 */
function parseDataLocal(dataStr: string): Date {
  // Pega só a parte "YYYY-MM-DD" antes de qualquer "T" (hora) que exista
  const somenteData = dataStr.split('T')[0];
  const [ano, mes, dia] = somenteData.split('-').map(Number);
  return new Date(ano, (mes || 1) - 1, dia || 1);
}

function addMeses(data: Date, meses: number): Date {
  return new Date(data.getFullYear(), data.getMonth() + meses, data.getDate());
}

function mesmoMesEAno(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Retorna o dia 4 (fechamento) de um mês/ano específico, como Date com hora 23:59:59 */
function fechamentoDoMes(ano: number, mes: number): Date {
  return new Date(ano, mes, DIA_FECHAMENTO, 23, 59, 59, 999);
}

/** Retorna o dia 10 (vencimento) do mês seguinte a um fechamento */
function vencimentoAposFechamento(fechamento: Date): Date {
  let mes = fechamento.getMonth() + 1;
  let ano = fechamento.getFullYear();
  if (mes > 11) {
    mes = 0;
    ano += 1;
  }
  return new Date(ano, mes, DIA_VENCIMENTO, 23, 59, 59, 999);
}

/**
 * Calcula a fatura "atual" com base na data de hoje.
 *
 * Regra: pega o último fechamento (dia 4) que já aconteceu. Se ainda não
 * passou do vencimento dessa fatura (dia 10 do mês seguinte), ela é a
 * fatura atual. Se já passou do vencimento, avança para a próxima fatura
 * (fechamento do dia 4 seguinte).
 */
export function getCicloAtual(hoje: Date = new Date()): {
  inicio: Date;
  fim: Date;
  vencimento: Date;
} {
  // Último fechamento (dia 4) que já ocorreu: se hoje ainda não passou do
  // dia 4 deste mês, o último fechamento foi no mês anterior.
  let mesFim = hoje.getMonth();
  let anoFim = hoje.getFullYear();
  if (hoje.getDate() < DIA_FECHAMENTO) {
    mesFim -= 1;
    if (mesFim < 0) {
      mesFim = 11;
      anoFim -= 1;
    }
  }

  let fim = fechamentoDoMes(anoFim, mesFim);
  let vencimento = vencimentoAposFechamento(fim);

  // Se já passou do vencimento dessa fatura, avança para a próxima
  if (hoje.getTime() > vencimento.getTime()) {
    mesFim += 1;
    if (mesFim > 11) {
      mesFim = 0;
      anoFim += 1;
    }
    fim = fechamentoDoMes(anoFim, mesFim);
    vencimento = vencimentoAposFechamento(fim);
  }

  let mesInicio = mesFim - 1;
  let anoInicio = anoFim;
  if (mesInicio < 0) {
    mesInicio = 11;
    anoInicio -= 1;
  }
  const inicio = new Date(anoInicio, mesInicio, DIA_FECHAMENTO + 1, 0, 0, 0, 0);

  return { inicio, fim, vencimento };
}

/**
 * Dado uma data (ex: data da compra), retorna a data de FECHAMENTO (dia 4)
 * do período ao qual ela pertence. Até o dia 4 → fecha neste mês; depois
 * do dia 4 → fecha no mês seguinte.
 */
function getFechamentoDaData(data: Date): Date {
  const dia = data.getDate();
  let mes = data.getMonth();
  let ano = data.getFullYear();

  if (dia > DIA_FECHAMENTO) {
    mes += 1;
    if (mes > 11) {
      mes = 0;
      ano += 1;
    }
  }

  return fechamentoDoMes(ano, mes);
}

export function calcularFatura(
  expenses: Expense[],
  parcelas: Parcela[],
  pessoa: Pessoa,
  hoje: Date = new Date()
): ResumoFatura {
  const { inicio, fim, vencimento } = getCicloAtual(hoje);

  let total = 0;
  let pago = 0;

  const pagoPor = (jaPagouJuliano: boolean, jaPagouLidiane: boolean): boolean =>
    pessoa === 'Juliano' ? jaPagouJuliano : jaPagouLidiane;

  // Contas à vista: entram se a data da compra cair dentro do período coberto pela fatura atual
  for (const expense of expenses) {
    if (expense.forma_pagamento !== 'a_vista') continue;

    const dataCompra = parseDataLocal(expense.data_compra);
    if (dataCompra.getTime() < inicio.getTime() || dataCompra.getTime() > fim.getTime()) continue;

    const parte = expense.valor / 2;
    total += parte;
    if (pagoPor(expense.paga_juliano, expense.paga_lidiane)) {
      pago += parte;
    }
  }

  // Compras parceladas: cada parcela tem um fechamento FIXO (não depende
  // de outras parcelas estarem pagas). Só a que fecha NESTA fatura entra.
  const parcelasPorGasto = new Map<string, Parcela[]>();
  for (const parcela of parcelas) {
    const lista = parcelasPorGasto.get(parcela.gasto_id) ?? [];
    lista.push(parcela);
    parcelasPorGasto.set(parcela.gasto_id, lista);
  }

  for (const expense of expenses) {
    if (expense.forma_pagamento !== 'parcelado') continue;

    const listaParcelas = parcelasPorGasto.get(expense.id);
    if (!listaParcelas || listaParcelas.length === 0) continue;

    const dataCompra = parseDataLocal(expense.data_compra);
    const fechamentoDaCompra = getFechamentoDaData(dataCompra);

    for (const parcela of listaParcelas) {
      // Parcela N fecha N-1 meses depois do fechamento em que a compra caiu
      const fechamentoDaParcela = addMeses(fechamentoDaCompra, parcela.numero_parcela - 1);

      if (!mesmoMesEAno(fechamentoDaParcela, fim)) continue;

      const parte = parcela.valor_parcela / 2;
      total += parte;
      if (pagoPor(parcela.paga_juliano, parcela.paga_lidiane)) {
        pago += parte;
      }
    }
  }

  return {
    total,
    pago,
    restante: total - pago,
    cicloInicio: inicio,
    cicloFim: fim,
    cicloVencimento: vencimento,
  };
}