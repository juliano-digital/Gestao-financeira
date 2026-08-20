/**
 * Serviço para operações CRUD de gastos no Supabase
 * Ao criar um gasto parcelado, também cria as parcelas correspondentes
 */

import { supabase } from './supabaseClient';
import { createParcelasForExpense } from './parcelasService';
import type { Expense, ExpenseFormData } from '../types/expense';

const TABLE_NAME = 'gastos';

/**
 * Busca todos os gastos do banco de dados
 * @returns Promessa contendo array de gastos
 */
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

/**
 * Busca gastos dentro de um período
 * @param dataInicio - Data inicial (YYYY-MM-DD)
 * @param dataFim - Data final (YYYY-MM-DD)
 * @returns Promessa contendo array de gastos filtrados
 */
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

/**
 * Cria um novo gasto no banco de dados
 * Se for parcelado, também cria as parcelas correspondentes automaticamente
 * @param expense - Dados do gasto a ser criado
 * @returns Promessa contendo o gasto criado
 */
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

/**
 * Atualiza um gasto existente
 * @param id - ID do gasto
 * @param expense - Dados atualizados do gasto
 * @returns Promessa contendo o gasto atualizado
 */
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

/**
 * Deleta um gasto do banco de dados
 * @param id - ID do gasto a ser deletado
 * @returns Promessa vazia
 */
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

/**
 * Marca ou desmarca um gasto como pago (campo único, antigo — mantido por
 * compatibilidade com telas que ainda usam o status combinado).
 * @param id - ID do gasto
 * @param paga - true para marcar como pago, false para desmarcar
 * @returns Promessa contendo o gasto atualizado
 */
export const toggleExpensePaga = async (id: string, paga: boolean): Promise<Expense> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({ paga, paga_juliano: paga, paga_lidiane: paga })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar status de pagamento:', error);
    throw error;
  }

  return data;
};

/**
 * Marca ou desmarca a parte de UMA pessoa (Juliano ou Lidiane) como paga
 * neste gasto. O campo "paga" (combinado) é recalculado automaticamente:
 * só fica true quando as duas partes estiverem pagas.
 * @param id - ID do gasto
 * @param pessoa - Qual pessoa está marcando/desmarcando sua parte
 * @param novoPaga - true para marcar como pago, false para desmarcar
 * @returns Promessa contendo o gasto atualizado
 */
export const toggleExpensePagaPessoa = async (
  id: string,
  pessoa: 'Juliano' | 'Lidiane',
  novoPaga: boolean
): Promise<Expense> => {
  const { data: atual, error: fetchError } = await supabase
    .from(TABLE_NAME)
    .select('paga_juliano, paga_lidiane')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Erro ao buscar gasto para atualizar pagamento:', fetchError);
    throw fetchError;
  }

  const pagaJuliano = pessoa === 'Juliano' ? novoPaga : atual.paga_juliano;
  const pagaLidiane = pessoa === 'Lidiane' ? novoPaga : atual.paga_lidiane;

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({
      paga_juliano: pagaJuliano,
      paga_lidiane: pagaLidiane,
      paga: pagaJuliano && pagaLidiane,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar status de pagamento por pessoa:', error);
    throw error;
  }

  return data;
};