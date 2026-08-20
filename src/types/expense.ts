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
  /** "Pago pelos dois" — calculado automaticamente a partir de paga_juliano && paga_lidiane */
  paga: boolean;
  /** Se o Juliano já pagou a parte dele desta compra */
  paga_juliano: boolean;
  /** Se a Lidiane já pagou a parte dela desta compra */
  paga_lidiane: boolean;
  created_at: string;
}

export type ExpenseFormData = Omit<
  Expense,
  'id' | 'created_at' | 'data_compra' | 'paga' | 'paga_juliano' | 'paga_lidiane'
>;

export interface Parcela {
  id: string;
  gasto_id: string;
  numero_parcela: number;
  valor_parcela: number;
  /** "Pago pelos dois" — calculado automaticamente a partir de paga_juliano && paga_lidiane */
  paga: boolean;
  /** Se o Juliano já pagou a parte dele desta parcela */
  paga_juliano: boolean;
  /** Se a Lidiane já pagou a parte dela desta parcela */
  paga_lidiane: boolean;
  data_pagamento?: string | null;
  created_at: string;
}