/**
 * Página PersonExpenses - Mostra TODAS as compras, com a parte (metade)
 * de cada uma atribuída à pessoa da página. Compras parceladas podem ser
 * expandidas para ver e marcar cada parcela como paga. Qualquer compra
 * pode ser marcada como paga, deixando a linha verde escura.
 */

import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout, Card } from '../components';
import { InstallmentsPanel } from '../components/expenses/InstallmentsPanel';
import { useExpenses } from '../hooks/useExpenses';
import { formatCurrency, formatDateTime, formatPaymentMethod } from '../utils/formatCurrency';
import { calculateTotalSpent } from '../utils/calculations';

const PESSOAS_VALIDAS: Record<string, 'Juliano' | 'Lidiane'> = {
  juliano: 'Juliano',
  lidiane: 'Lidiane',
};

export const PersonExpenses: React.FC = () => {
  const { pessoa } = useParams<{ pessoa: string }>();
  const { expenses, loading, error, togglePaga } = useExpenses();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const nomePessoa = pessoa ? PESSOAS_VALIDAS[pessoa.toLowerCase()] : undefined;

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

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleTogglePaga = async (id: string, pagaAtual: boolean) => {
    try {
      setTogglingId(id);
      await togglePaga(id, !pagaAtual);
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
                    <th className="px-5 py-4 text-center font-bold text-gray-700">Paga</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense, idx) => {
                    const isParcelado = expense.forma_pagamento === 'parcelado';
                    const isExpanded = expandedId === expense.id;
                    const isToggling = togglingId === expense.id;

                    // Linha paga: verde escuro fixo, sem efeito de hover diferente.
                    // Linha não paga: mantém o zebrado + hover azul claro de antes.
                    const rowClasses = expense.paga
                      ? 'bg-green-700'
                      : idx % 2 === 0
                      ? 'bg-white hover:bg-blue-50'
                      : 'bg-gray-50 hover:bg-blue-50';

                    // Textos ficam claros quando a linha está paga, para manter contraste
                    // sobre o fundo verde escuro.
                    const textPrimary = expense.paga ? 'text-white' : 'text-gray-800';
                    const textSecondary = expense.paga ? 'text-green-50' : 'text-gray-600';
                    const textParte = expense.paga
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
                                    expense.paga
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
                              onClick={() => handleTogglePaga(expense.id, expense.paga)}
                              disabled={isToggling}
                              title={expense.paga ? 'Marcar como não paga' : 'Marcar como paga'}
                              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors mx-auto disabled:opacity-50 ${
                                expense.paga
                                  ? 'bg-green-900 border-green-900 text-white'
                                  : 'bg-white border-gray-300 text-transparent hover:border-green-400'
                              }`}
                            >
                              {isToggling ? '⏳' : '✓'}
                            </button>
                          </td>
                        </tr>
                        {isParcelado && isExpanded && (
                          <tr className="bg-gray-50">
                            <td colSpan={7} className="px-5">
                              <InstallmentsPanel gastoId={expense.id} />
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
    </Layout>
  );
};