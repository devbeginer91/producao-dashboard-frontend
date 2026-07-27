import React from 'react';
import { FiLogOut, FiClipboard } from 'react-icons/fi';

const ColaboradorPage = ({ colaborador, onLogout }) => {
  return (
    <div className="colaborador-page">
      <header className="topbar">
        <h1>Ordens de Produção</h1>
        <button className="btn-editar" onClick={onLogout}>
          <FiLogOut /> Sair
        </button>
      </header>

      <p className="colaborador-saudacao">
        Olá, {colaborador?.nome} (matrícula {colaborador?.matricula} — {colaborador?.setor})
      </p>

      <div className="pedido-grid-empty">
        <FiClipboard style={{ fontSize: 28, marginBottom: 8 }} />
        <p>Nenhuma ordem de produção priorizada por enquanto.</p>
      </div>
    </div>
  );
};

export default ColaboradorPage;
