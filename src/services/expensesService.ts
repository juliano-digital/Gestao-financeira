/**
 * Serviço para operações CRUD de gastos no Supabase
 * Ao criar um gasto parcelado, também cria as parcelas correspondentes
 */

import { supabase } from './supabaseClient';
import { createParcelasForExpense } from './parcelasService';
import type { Expense, ExpenseFormData } from '../types/expense';

const TABLE_NAME = 'gastos';

export const getAllExpenses = async (): Promise<Expense[]> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('data_compra', { ascending: false });

  if (error) {
    console.error('Erro ao buscar gastos:', error);
    throw error;
  }

  return data || [];
};

export const getExpensesByDateRange = async (
  dataInicio: string,
  dataFim: string
): Promise<Expense[]> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .gte('data_compra', dataInicio)
    .lte('data_compra', dataFim)
    .order('data_compra', { ascending: false });

  if (error) {
    console.error('Erro ao buscar gastos por período:', error);
    throw error;
  }

  return data || [];
};

export const createExpense = async (expense: ExpenseFormData): Promise<Expense> => {
  const payload = {
    ...expense,
    numero_parcelas:
      expense.forma_pagamento === 'parcelado' ? expense.numero_parcelas ?? null : null,
  };

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar gasto:', error);
    throw error;
  }

  // Se for parcelado, cria as parcelas automaticamente
  if (expense.forma_pagamento === 'parcelado' && expense.numero_parcelas) {
    await createParcelasForExpense(data.id, expense.valor, expense.numero_parcelas);
  }

  return data;
};

export const updateExpense = async (
  id: string,
  expense: Partial<ExpenseFormData>
): Promise<Expense> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(expense)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar gasto:', error);
    throw error;
  }

  return data;
};

export const deleteExpense = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar gasto:', error);
    throw error;
  }
};