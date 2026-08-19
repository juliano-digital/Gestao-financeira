/**
 * Tipagem para o objeto de Gasto e Parcela
 */

export interface Expense {
  id: string;
  local: string;
  valor: number;
  forma_pagamento: 'a_vista' | 'parcelado';
  numero_parcelas?: number;
  data_compra: string;
  responsavel: string;
  paga: boolean;
  created_at: string;
}

export type ExpenseFormData = Omit<Expense, 'id' | 'created_at' | 'data_compra' | 'paga'>;

export interface Parcela {
  id: string;
  gasto_id: string;
  numero_parcela: number;
  valor_parcela: number;
  paga: boolean;
  data_pagamento?: string | null;
  created_at: string;
}