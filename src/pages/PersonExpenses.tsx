/**
 * Página PersonExpenses - Mostra as compras À VISTA e as PARCELADAS JÁ
 * QUITADAS na tabela "Todas as Compras". Compras parceladas ainda em
 * aberto ficam só na área "Parcelas Pendentes", e migram automaticamente
 * para a tabela geral assim que a última parcela é paga.
 */

import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout, Card } from '../components';
import { Pagination } from '../components/ui';
import { InstallmentsPanel, PendingInstallmentsSection } from '../components/expenses';
import { useExpenses } from '../hooks/useExpenses';
import { useAllParcelas } from '../hooks/useParcelas';
import { usePagination } from '../hooks/usePagination';
import { formatCurrency, formatDateTime, formatPaymentMethod } from '../utils/formatCurrency';
import { calculateTotalSpent, getPendingInstallments } from '../utils/calculations';

const PESSOAS_VALIDAS: Record<string, 'Juliano' | 'Lidiane'> = {
  juliano: 'Juliano',
  lidiane: 'Lidiane',
};

export const PersonExpenses: React.FC = () => {
  const { pessoa } = useParams<{ pessoa: string }>();
  const { expenses, loading, error } = useExpenses();
  const { parcelas, loading: loadingParcelas, refetch: refetchParcelas } = useAllParcelas();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const nomePessoa = pessoa ? PESSOAS_VALIDAS[pessoa.toLowerCase()] : undefined;

  // Compras parceladas ainda com parcela em aberto
  const pendingInstallments = useMemo(
    () => getPendingInstallments(expenses, parcelas),
    [expenses, parcelas]
  );

  // IDs das compras pendentes — usados para escondê-las da tabela geral
  const pendingIds = useMemo(
    () => new Set(pendingInstallments.map((item) => item.expense.id)),
    [pendingInstallments]
  );

  // "Todas as Compras" mostra só: à vista, ou parceladas já 100% quitadas
  const expensesTabelaGeral = useMemo(
    () => expenses.filter((e) => !pendingIds.has(e.id)),
    [expenses, pendingIds]
  );

  const { paginatedItems, currentPage, totalPages, goToPage } = usePagination(
    expensesTabelaGeral,
    { itemsPerPage: 7 }
  );

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
          {loading ? (
            <div className="text-2xl font-bold mt-6 animate-pulse">Carregando...</div>
          ) : (
            <div className="text-4xl font-bold mt-6">{formatCurrency(suaParteTotal)}</div>
          )}
        </div>

        {/* Área reservada: parcelas pendentes. onParcelaToggled recarrega os
            dados aqui na página assim que o usuário marca/desmarca uma parcela,
            fazendo o contador "X de Y pagas" e a migração para a tabela geral
            acontecerem na hora, sem precisar recarregar a página */}
        <PendingInstallmentsSection
          items={pendingInstallments}
          isLoading={loading || loadingParcelas}
          accentColor={corDestaque}
          onParcelaToggled={refetchParcelas}
        />

        <Card title="📋 Todas as Compras">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Carregando gastos...</p>
            </div>
          ) : expensesTabelaGeral.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">
                {expenses.length === 0
                  ? 'Nenhuma compra registrada ainda.'
                  : 'Todas as compras registradas ainda têm parcelas pendentes — veja acima.'}
              </p>
            </div>
          ) : (
            <>
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
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((expense, idx) => {
                      const isParcelado = expense.forma_pagamento === 'parcelado';
                      const isExpanded = expandedId === expense.id;

                      return (
                        <React.Fragment key={expense.id}>
                          <tr
                            className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            }`}
                          >
                            <td className="px-5 py-4 font-medium text-gray-800">{expense.local}</td>
                            <td className="px-5 py-4 text-gray-600">{formatCurrency(expense.valor)}</td>
                            <td
                              className={`px-5 py-4 font-bold ${
                                corDestaque === 'blue' ? 'text-blue-600' : 'text-pink-600'
                              }`}
                            >
                              {formatCurrency(expense.valor / 2)}
                            </td>
                            <td className="px-5 py-4 text-gray-600">{expense.responsavel}</td>
                            <td className="px-5 py-4 text-gray-600">{formatDateTime(expense.data_compra)}</td>
                            <td className="px-5 py-4 text-gray-600">
                              <div className="flex items-center gap-2">
                                <span>{formatPaymentMethod(expense.forma_pagamento, expense.numero_parcelas)}</span>
                                {isParcelado && (
                                  <>
                                    <span className="text-green-700 font-semibold text-xs bg-green-100 px-2 py-0.5 rounded-full">
                                      ✅ Pago
                                    </span>
                                    <button
                                      onClick={() => toggleExpand(expense.id)}
                                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 px-2 py-0.5 rounded text-xs font-semibold transition-colors"
                                    >
                                      {isExpanded ? 'Ocultar parcelas ▲' : 'Ver parcelas ▼'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isParcelado && isExpanded && (
                            <tr className="bg-gray-50">
                              <td colSpan={6} className="px-5">
                                <InstallmentsPanel
                                  gastoId={expense.id}
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

              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
};