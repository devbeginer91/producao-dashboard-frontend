import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiPlus, FiDollarSign, FiChevronRight } from 'react-icons/fi';
import api from '../api';

const formatarMoeda = (valor) =>
  (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const FinanceiroPage = ({ setSidebarOpen, mostrarFormulario, setMostrarFormulario }) => {
  const [resumo, setResumo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const navigate = useNavigate();

  const carregar = () => {
    api.get('/financeiro/resumo')
      .then((r) => setResumo(r.data))
      .catch((e) => setMensagem('Erro ao carregar resumo financeiro: ' + (e.response?.data?.message || e.message)))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line
  }, []);

  // Recarrega ao fechar o drawer de Cadastrar/Editar Pedido, pra refletir o que acabou de ser salvo.
  useEffect(() => {
    if (!mostrarFormulario) {
      carregar();
    }
    // eslint-disable-next-line
  }, [mostrarFormulario]);

  return (
    <>
      <header className="topbar">
        <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
          <FiMenu />
        </button>
        <h1>Financeiro</h1>
        <button className="btn-adicionar-pedido" onClick={() => setMostrarFormulario(true)}>
          <FiPlus /> Cadastrar Pedido
        </button>
      </header>

      {mensagem && <p className="erro">{mensagem}</p>}
      {carregando && <p className="loading">Carregando resumo financeiro...</p>}

      {!carregando && resumo && (
        <>
          <div className="stats-bar">
            <div className="stat-card">
              <span className="stat-icon stat-icon-accent">
                <FiDollarSign />
              </span>
              <div className="stat-card-body">
                <span className="stat-value">{formatarMoeda(resumo.totalGeral)}</span>
                <span className="stat-label">Valor total em aberto</span>
              </div>
            </div>
          </div>

          {resumo.clientes.length === 0 ? (
            <p className="pedido-grid-empty">
              Nenhum pedido com valor unitário cadastrado ainda. Use "Cadastrar Pedido" pra começar.
            </p>
          ) : (
            <div className="op-grid">
              {resumo.clientes.map((c) => (
                <button
                  key={c.empresa}
                  className="op-card op-card-clicavel"
                  onClick={() => navigate(`/financeiro/${encodeURIComponent(c.empresa)}`)}
                >
                  <div className="op-card-header">
                    <span className="op-card-empresa">{c.empresa}</span>
                  </div>
                  <span className="op-card-itens-count">
                    {formatarMoeda(c.valorEmAberto)} em aberto <FiChevronRight />
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default FinanceiroPage;
