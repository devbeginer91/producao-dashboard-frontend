import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiPlus, FiDollarSign, FiChevronRight, FiSearch, FiEyeOff, FiEye } from 'react-icons/fi';
import api from '../api';

const formatarMoeda = (valor) =>
  (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const FinanceiroPage = ({ setSidebarOpen, mostrarFormulario, setMostrarFormulario }) => {
  const [resumo, setResumo] = useState(null);
  const [ocultos, setOcultos] = useState([]);
  const [mostrarOcultos, setMostrarOcultos] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [busca, setBusca] = useState('');
  const navigate = useNavigate();

  const carregar = () => {
    Promise.all([
      api.get('/financeiro/resumo'),
      api.get('/financeiro/clientes-ocultos'),
    ])
      .then(([resumoResp, ocultosResp]) => {
        setResumo(resumoResp.data);
        setOcultos(ocultosResp.data);
      })
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

  const ocultarCliente = (empresa) => {
    if (!window.confirm(`Esconder "${empresa}" do Financeiro? Os pedidos dele continuam intactos em Produção — dá pra reexibir depois em "Clientes ocultos".`)) return;
    api.post('/financeiro/clientes-ocultos', { empresa })
      .then(carregar)
      .catch((e) => setMensagem('Erro ao esconder cliente: ' + (e.response?.data?.message || e.message)));
  };

  const reexibirCliente = (empresa) => {
    api.delete(`/financeiro/clientes-ocultos/${encodeURIComponent(empresa)}`)
      .then(carregar)
      .catch((e) => setMensagem('Erro ao reexibir cliente: ' + (e.response?.data?.message || e.message)));
  };

  const termo = busca.trim().toLowerCase();
  const clientesFiltrados = resumo
    ? resumo.clientes.filter((c) => c.empresa.toLowerCase().includes(termo))
    : [];

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
              Nenhum pedido cadastrado ainda. Use "Cadastrar Pedido" pra começar.
            </p>
          ) : (
            <>
              <div className="busca">
                <div className="busca-input-wrapper">
                  <FiSearch className="busca-icon" />
                  <input
                    type="text"
                    placeholder="Buscar cliente"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
              </div>

              {clientesFiltrados.length === 0 ? (
                <p className="pedido-grid-empty">Nenhum cliente encontrado pra essa busca.</p>
              ) : (
                <div className="op-grid">
                  {clientesFiltrados.map((c) => (
                    <div
                      key={c.empresa}
                      className="op-card op-card-clicavel"
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/financeiro/${encodeURIComponent(c.empresa)}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/financeiro/${encodeURIComponent(c.empresa)}`); }}
                    >
                      <div className="op-card-header">
                        <span className="op-card-empresa">{c.empresa}</span>
                        <button
                          type="button"
                          className="financeiro-btn-ocultar"
                          title="Esconder cliente do Financeiro"
                          onClick={(e) => { e.stopPropagation(); ocultarCliente(c.empresa); }}
                        >
                          <FiEyeOff />
                        </button>
                      </div>
                      <span className="op-card-itens-count">
                        {formatarMoeda(c.valorEmAberto)} em aberto <FiChevronRight />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {ocultos.length > 0 && (
            <div className="financeiro-ocultos">
              <button type="button" className="financeiro-ocultos-toggle" onClick={() => setMostrarOcultos((v) => !v)}>
                <FiEye /> {mostrarOcultos ? 'Esconder' : 'Ver'} clientes ocultos ({ocultos.length})
              </button>
              {mostrarOcultos && (
                <div className="financeiro-ocultos-lista">
                  {ocultos.map((o) => (
                    <div key={o.empresa} className="financeiro-ocultos-item">
                      <span>{o.empresa}</span>
                      <button type="button" className="btn-editar" onClick={() => reexibirCliente(o.empresa)}>
                        <FiEye /> Reexibir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default FinanceiroPage;
