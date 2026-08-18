/**
 * Serviço para operações com parcelas de gastos parcelados
 */

import { supabase } from './supabaseClient';
import type { Parcela } from '../types/expense';

const TABLE_NAME = 'parcelas';

/**
 * Busca as parcelas de um gasto específico
 */
export const getParcelasByGastoId = async (gastoId: string): Promise<Parcela[]> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('gasto_id', gastoId)
    .order('numero_parcela', { ascending: true });

  if (error) {
    console.error('Erro ao buscar parcelas:', error);
    throw error;
  }

  return data || [];
};

/**
 * Busca todas as parcelas de todos os gastos (usado para calcular status "Pago")
 */
export const getAllParcelas = async (): Promise<Parcela[]> => {
  const { data, error } = await supabase.from(TABLE_NAME).select('*');

  if (error) {
    console.error('Erro ao buscar todas as parcelas:', error);
    throw error;
  }

  return data || [];
};

/**
 * Cria as parcelas de um gasto parcelado, dividindo o valor total igualmente.
 * A última parcela absorve qualquer diferença de arredondamento.
 */
export const createParcelasForExpense = async (
  gastoId: string,
  valorTotal: number,
  numeroParcelas: number
): Promise<void> => {
  const valorBase = Math.floor((valorTotal / numeroParcelas) * 100) / 100;
  const totalBase = valorBase * (numeroParcelas - 1);
  const valorUltima = Math.round((valorTotal - totalBase) * 100) / 100;

  const parcelas = Array.from({ length: numeroParcelas }, (_, i) => ({
    gasto_id: gastoId,
    numero_parcela: i + 1,
    valor_parcela: i === numeroParcelas - 1 ? valorUltima : valorBase,
    paga: false,
  }));

  const { error } = await supabase.from(TABLE_NAME).insert(parcelas);

  if (error) {
    console.error('Erro ao criar parcelas:', error);
    throw error;
  }
};

/**
 * Marca ou desmarca uma parcela como paga
 */
export const toggleParcelaPaga = async (id: string, paga: boolean): Promise<Parcela> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({
      paga,
      data_pagamento: paga ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar parcela:', error);
    throw error;
  }

  return data;
};