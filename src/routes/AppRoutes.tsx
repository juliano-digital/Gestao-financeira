/**
 * Configuração de Rotas da Aplicação
 * Define todos os paths e componentes de páginas
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import { NewExpense } from '../pages/NewExpense';
import { PersonExpenses } from '../pages/PersonExpenses';

/**
 * Componente que define as rotas da aplicação
 */
export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Rota inicial - Dashboard */}
      <Route path="/" element={<Dashboard />} />

      {/* Rota para novo gasto */}
      <Route path="/novo-gasto" element={<NewExpense />} />

      {/* Rota de gastos + saldo por pessoa (Juliano ou Lidiane) */}
      <Route path="/gastos/:pessoa" element={<PersonExpenses />} />

      {/* Rota 404 - página não encontrada */}
      <Route path="*" element={<Dashboard />} />
    </Routes>
  );
};