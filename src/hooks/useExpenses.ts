/**
 * Hook customizado para gerenciar estado e operações de gastos
 * Utiliza as funções do expensesService
 */

import { useState, useEffect } from 'react';
import type { Expense, ExpenseFormData } from '../types/expense';
import {
  getAllExpenses,
  getExpensesByDateRange,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../services/expensesService';

interface UseExpensesReturn {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  fetchAllExpenses: () => Promise<void>;
  fetchExpensesByDateRange: (dataInicio: string, dataFim: string) => Promise<void>;
  addExpense: (expense: ExpenseFormData) => Promise<void>;
  editExpense: (id: string, expense: Partial<ExpenseFormData>) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
}

/**
 * Hook para gerenciar gastos
 * @returns Objeto contendo estado e funções para operações com gastos
 */
export const useExpenses = (): UseExpensesReturn => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Função para buscar todos os gastos
  const fetchAllExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllExpenses();
      setExpenses(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar gastos';
      setError(message);
      console.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar gastos por período
  const fetchExpensesByDateRange = async (dataInicio: string, dataFim: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getExpensesByDateRange(dataInicio, dataFim);
      setExpenses(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar gastos por período';
      setError(message);
      console.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Função para adicionar um novo gasto
  const addExpense = async (expense: ExpenseFormData) => {
    try {
      setError(null);
      const newExpense = await createExpense(expense);
      setExpenses([newExpense, ...expenses]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar gasto';
      setError(message);
      console.error(message);
      throw err;
    }
  };

  // Função para editar um gasto
  const editExpense = async (id: string, expense: Partial<ExpenseFormData>) => {
    try {
      setError(null);
      const updatedExpense = await updateExpense(id, expense);
      setExpenses(
        expenses.map((exp) => (exp.id === id ? updatedExpense : exp))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar gasto';
      setError(message);
      console.error(message);
      throw err;
    }
  };

  // Função para deletar um gasto
  const removeExpense = async (id: string) => {
    try {
      setError(null);
      await deleteExpense(id);
      setExpenses(expenses.filter((exp) => exp.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao deletar gasto';
      setError(message);
      console.error(message);
      throw err;
    }
  };

  // Buscar gastos ao montar o componente
  useEffect(() => {
    fetchAllExpenses();
  }, []);

  return {
    expenses,
    loading,
    error,
    fetchAllExpenses,
    fetchExpensesByDateRange,
    addExpense,
    editExpense,
    removeExpense,
  };
};
