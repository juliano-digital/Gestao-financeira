/**
 * Página PersonExpenses - Mostra TODAS as compras, com a parte (metade)
 * de cada uma atribuída à pessoa da página. Compras parceladas podem ser
 * expandidas para ver e marcar cada parcela como paga. Qualquer compra
 * pode ser marcada como paga, deixando a linha verde escura. Compras
 * também podem ser editadas através de um modal.
 *
 * O pagamento é controlado SEPARADAMENTE por pessoa: quando o Juliano marca
 * uma compra (ou parcela) como paga, isso só afeta a página dele — a página
 * da Lidiane continua mostrando aquele valor como não pago até ela também
 * marcar a parte dela.
 *
 * O card "Falta Pagar" mostra o valor da FATURA DO CICLO ATUAL (fecha dia 4,
 * vence dia 10 do mês seguinte): contas à vista feitas dentro dessa janela +
 * a próxima parcela não paga de cada compra parcelada. Depois do dia 10 a
 * contagem passa sozinha para o próximo ciclo — não precisa mexer em nada.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout, Card } from '../components';
import { InstallmentsPanel } from '../components/expenses/InstallmentsPanel';
import { EditExpenseModal } from '../components/expenses/EditExpenseModal';
import { useExpenses } from '../hooks/useExpenses';
import { useAllParcelas } from '../hooks/useParcelas';
import { formatCurrency, formatDateTime, formatPaymentMethod } from '../utils/formatCurrency';
import { calculateTotalSpent } from '../utils/calculations';
import { calcularFatura } from '../utils/faturaCalculations';
import type { Expense } from '../types/expense';

// Intervalo de checagem da data do sistema (1 minuto é suficiente para
// detectar a virada do ciclo — dia 4 ou dia 10 — sem pesar no navegador)
const CHECK_INTERVAL_MS = 60 * 1000;

const PESSOAS_VALIDAS: Record<string, 'Juliano' | 'Lidiane'> = {
  juliano: 'Juliano',
  lidiane: 'Lidiane',
};

const formatDiaMes = (data: Date): string =>
  data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export const PersonExpenses: React.FC = () => {
  const { pessoa } = useParams<{ pessoa: string }>();
  const { expenses, loading, error, togglePagaPessoa, editExpense } = useExpenses();
  const { parcelas, loading: loadingParcelas, refetch: refetchParcelas } = useAllParcelas();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Data de referência usada para calcular o ciclo da fatura. Atualizada
  // periodicamente para que o card mude de ciclo sozinho quando o dia 4
  // ou o dia 10 virar, sem precisar recarregar a página.
  const [agora, setAgora] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => setAgora(new Date()), CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const nomePessoa = pessoa ? PESSOAS_VALIDAS[pessoa.toLowerCase()] : undefined;

  const resumoFatura = useMemo(() => {
  if (!nomePessoa) return null;
  const resultado = calcularFatura(expenses, parcelas, nomePessoa, agora);
  console.log('[DEBUG fatura]', {
    pessoa: nomePessoa,
    resultado,
    expenses: expenses.map((e) => ({
      local: e.local,
      valor: e.valor,
      forma: e.forma_pagamento,
      data: e.data_compra,
      paga_juliano: e.paga_juliano,
      paga_lidiane: e.paga_lidiane,
    })),
  });
  return resultado;
}, [expenses, parcelas, nomePessoa, agora]);

  if (!nomePessoa) {
    return (
      <Layout navbarTitle="Página não encontrada">
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">Pessoa não encontrada.</p>
          <Link to="/" className="text-blue-600 hover:underline font-medium">
            ← Voltar ao Dashboard
          </Link>
        </div>
      </Layout>
    );
  }

  const totalGeral = calculateTotalSpent(expenses);
  const suaParteTotal = totalGeral / 2;
  const corDestaque = nomePessoa === 'Juliano' ? 'blue' : 'pink';
  const faturaCarregando = loading || loadingParcelas;

  // Retorna se ESTA pessoa (a dona da página) já pagou a parte dela nesta compra
  const pagaPelaPessoa = (expense: Expense): boolean =>
    nomePessoa === 'Juliano' ? expense.paga_juliano : expense.paga_lidiane;

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleTogglePaga = async (expense: Expense) => {
    try {
      setTogglingId(expense.id);
      await togglePagaPessoa(expense.id, nomePessoa, !pagaPelaPessoa(expense));
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <Layout navbarTitle={`Parte de ${nomePessoa}`}>
      <div className="space-y-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-medium">Erro ao carregar gastos:</p>
            <p>{error}</p>
          </div>
        )}

        <div
          className={`rounded-lg p-6 text-white shadow-lg ${
            corDestaque === 'blue'
              ? 'bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600'
              : 'bg-gradient-to-br from-pink-600 via-pink-500 to-rose-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold opacity-95">Parte de {nomePessoa} (metade de tudo)</h3>
            <span className="text-3xl">💰</span>
          </div>
          {loading ? (
            <div className="text-2xl font-bold mt-6 animate-pulse">Carregando...</div>
          ) : (
            <div className="text-4xl font-bold mt-6">{formatCurrency(suaParteTotal)}</div>
          )}
        </div>

        {/* Card "Falta Pagar": valor da fatura do CICLO ATUAL (à vista do
            período + próxima parcela não paga), descontando o que ESTA
            pessoa já marcou como pago. Muda de ciclo sozinho: fecha dia 4,
            vence dia 10 do mês seguinte. */}
        <div className="rounded-lg p-6 text-white shadow-lg bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold opacity-95">💳 Falta Pagar — {nomePessoa}</h3>
            <span className="text-3xl">🧾</span>
          </div>
          {faturaCarregando || !resumoFatura ? (
            <div className="text-2xl font-bold mt-6 animate-pulse">Carregando...</div>
          ) : (
            <>
              <div className="text-4xl font-bold mt-6">{formatCurrency(resumoFatura.restante)}</div>
              <p className="text-sm opacity-80 mt-1">ainda falta {nomePessoa.toLowerCase()} pagar</p>
              <div className="flex gap-6 mt-4 text-sm opacity-90">
                <span>Total: {formatCurrency(resumoFatura.total)}</span>
                <span>Já pago: {formatCurrency(resumoFatura.pago)}</span>
              </div>
              <p className="text-xs opacity-60 mt-3">
  Fatura fecha dia {formatDiaMes(resumoFatura.cicloFim)} e fica em aberto até
  dia {formatDiaMes(resumoFatura.cicloVencimento)} — depois disso começa a
  contagem do mês seguinte
</p>
            </>
          )}
        </div>

        {/* Botão de acesso às anotações privadas desta pessoa */}
        <Link
          to={`/notas/${nomePessoa.toLowerCase()}`}
          className={`flex items-center justify-center gap-2 w-full rounded-lg py-3 font-semibold shadow-sm border-2 transition-colors ${
            corDestaque === 'blue'
              ? 'border-blue-200 text-blue-700 hover:bg-blue-50'
              : 'border-pink-200 text-pink-700 hover:bg-pink-50'
          }`}
        >
          📝 Minhas Anotações
        </Link>

        <Card title="📋 Todas as Compras">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Carregando gastos...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">Nenhuma compra registrada ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-300">
                  <tr>
                    <th className="px-5 py-4 text-left font-bold text-gray-700">Local</th>
                    <th className="px-5 py-4 text-left font-bold text-gray-700">Valor Total</th>
                    <th className="px-5 py-4 text-left font-bold text-gray-700">
                      Parte de {nomePessoa}
                    </th>
                    <th className="px-5 py-4 text-left font-bold text-gray-700">Comprado por</th>
                    <th className="px-5 py-4 text-left font-bold text-gray-700">Data/Hora</th>
                    <th className="px-5 py-4 text-left font-bold text-gray-700">Pagamento</th>
                    <th className="px-5 py-4 text-center font-bold text-gray-700">
                      Paga ({nomePessoa})
                    </th>
                    <th className="px-5 py-4 text-center font-bold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense, idx) => {
                    const isParcelado = expense.forma_pagamento === 'parcelado';
                    const isExpanded = expandedId === expense.id;
                    const isToggling = togglingId === expense.id;
                    const pagaPorMim = pagaPelaPessoa(expense);

                    // Linha paga: verde escuro fixo, sem efeito de hover diferente.
                    // Aqui "paga" é sempre em relação a ESTA pessoa (dona da página).
                    // Linha não paga: mantém o zebrado + hover azul claro de antes.
                    const rowClasses = pagaPorMim
                      ? 'bg-green-700'
                      : idx % 2 === 0
                      ? 'bg-white hover:bg-blue-50'
                      : 'bg-gray-50 hover:bg-blue-50';

                    // Textos ficam claros quando a linha está paga, para manter contraste
                    // sobre o fundo verde escuro.
                    const textPrimary = pagaPorMim ? 'text-white' : 'text-gray-800';
                    const textSecondary = pagaPorMim ? 'text-green-50' : 'text-gray-600';
                    const textParte = pagaPorMim
                      ? 'text-white'
                      : corDestaque === 'blue'
                      ? 'text-blue-600'
                      : 'text-pink-600';

                    return (
                      <React.Fragment key={expense.id}>
                        <tr className={`border-b border-gray-200 transition-colors ${rowClasses}`}>
                          <td className={`px-5 py-4 font-medium ${textPrimary}`}>{expense.local}</td>
                          <td className={`px-5 py-4 ${textSecondary}`}>{formatCurrency(expense.valor)}</td>
                          <td className={`px-5 py-4 font-bold ${textParte}`}>
                            {formatCurrency(expense.valor / 2)}
                          </td>
                          <td className={`px-5 py-4 ${textSecondary}`}>{expense.responsavel}</td>
                          <td className={`px-5 py-4 ${textSecondary}`}>{formatDateTime(expense.data_compra)}</td>
                          <td className={`px-5 py-4 ${textSecondary}`}>
                            <div className="flex items-center gap-2">
                              <span>{formatPaymentMethod(expense.forma_pagamento, expense.numero_parcelas)}</span>
                              {isParcelado && (
                                <button
                                  onClick={() => toggleExpand(expense.id)}
                                  className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                                    pagaPorMim
                                      ? 'text-white hover:bg-green-800'
                                      : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'
                                  }`}
                                >
                                  {isExpanded ? 'Ocultar parcelas ▲' : 'Ver parcelas ▼'}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => handleTogglePaga(expense)}
                              disabled={isToggling}
                              title={pagaPorMim ? 'Marcar como não paga' : 'Marcar como paga'}
                              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors mx-auto disabled:opacity-50 ${
                                pagaPorMim
                                  ? 'bg-green-900 border-green-900 text-white'
                                  : 'bg-white border-gray-300 text-transparent hover:border-green-400'
                              }`}
                            >
                              {isToggling ? '⏳' : '✓'}
                            </button>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => setEditingExpense(expense)}
                              title="Editar compra"
                              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm transition-colors mx-auto ${
                                pagaPorMim
                                  ? 'border-white/60 text-white hover:bg-green-800'
                                  : 'border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600'
                              }`}
                            >
                              ✏️
                            </button>
                          </td>
                        </tr>
                        {isParcelado && isExpanded && (
                          <tr className="bg-gray-50">
                            <td colSpan={8} className="px-5">
                              <InstallmentsPanel
                                gastoId={expense.id}
                                pessoa={nomePessoa}
                                onParcelaToggled={refetchParcelas}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <EditExpenseModal
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onSave={editExpense}
      />
    </Layout>
  );
};