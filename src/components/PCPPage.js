import React, { useEffect, useState } from 'react';
import { FiMenu, FiStar, FiSearch } from 'react-icons/fi';
import api from '../api';
import { filtrarPedidosPorBusca } from '../utils';

const PCPPage = ({ setSidebarOpen, pcpNome, onLogout }) => {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [busca, setBusca] = useState('');

  const carregar = async () => {
    setCarregando(true);
    setMensagem('');
    try {
      const response = await api.get('/pedidos');
      const relevantes = response.data
        .filter((p) => p.status === 'novo' || p.status === 'andamento')
        .sort((a, b) => {
          const oa = a.ordemPrioridade ?? Infinity;
          const ob = b.ordemPrioridade ?? Infinity;
          if (oa !== ob) return oa - ob;
          return a.numeroOS.localeCompare(b.numeroOS);
        });
      setPedidos(relevantes);
    } catch (error) {
      setMensagem('Erro ao carregar pedidos: ' + (error.response?.data?.message || error.message));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const alternarPrioridade = async (pedido) => {
    try {
      await api.put(`/pedidos/${pedido.id}/prioridade`, { prioritario: !pedido.prioritario });
      await carregar();
    } catch (error) {
      setMensagem('Erro: ' + (error.response?.data?.message || error.message));
    }
  };

  const salvarOrdem = async (pedido, valor) => {
    const ordemPrioridade = valor === '' ? null : parseInt(valor, 10);
    if (ordemPrioridade === pedido.ordemPrioridade) return;
    try {
      await api.put(`/pedidos/${pedido.id}/ordem-prioridade`, { ordemPrioridade });
      await carregar();
    } catch (error) {
      setMensagem('Erro: ' + (error.response?.data?.message || error.message));
    }
  };

  const pedidosFiltrados = filtrarPedidosPorBusca(pedidos, busca);

  const porCliente = new Map();
  pedidosFiltrados.forEach((pedido) => {
    if (!porCliente.has(pedido.empresa)) porCliente.set(pedido.empresa, []);
    porCliente.get(pedido.empresa).push(pedido);
  });
  const clientesOrdenados = Array.from(porCliente.keys()).sort((a, b) => a.localeCompare(b));

  return (
    <>
      <header className="topbar">
        {setSidebarOpen && (
          <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <FiMenu />
          </button>
        )}
        <h1>Priorizar Produção</h1>
        {onLogout && (
          <button className="btn-editar" onClick={onLogout}>
            Sair{pcpNome ? ` (${pcpNome})` : ''}
          </button>
        )}
      </header>

      <div className="busca">
        <div className="busca-input-wrapper">
          <FiSearch className="busca-icon" />
          <input
            type="text"
            placeholder="Buscar por empresa ou Nº OS"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {mensagem && <p className="erro">{mensagem}</p>}
      {carregando && <p className="loading">Carregando pedidos...</p>}
      {!carregando && pedidosFiltrados.length === 0 && (
        <p className="pedido-grid-empty">
          {busca ? 'Nenhum pedido encontrado pra essa busca.' : 'Nenhum pedido novo ou em andamento no momento.'}
        </p>
      )}

      {clientesOrdenados.map((cliente) => (
        <div key={cliente} className="pcp-cliente-grupo">
          <h2 className="pcp-cliente-header">
            {cliente} <span className="pcp-cliente-count">{porCliente.get(cliente).length}</span>
          </h2>
          <div className="pcp-list">
            {porCliente.get(cliente).map((pedido) => (
              <div key={pedido.id} className={`pcp-row ${pedido.prioritario ? 'pcp-row-prioritario' : ''}`}>
                <div className="pcp-row-info">
                  <span className="pcp-row-os">OS {pedido.numeroOS}</span>
                  <span className={`pcp-status pcp-status-${pedido.status}`}>{pedido.status}</span>
                </div>

                {pedido.prioritario && (
                  <div className="pcp-row-ordem">
                    <label htmlFor={`ordem-${pedido.id}`}>Ordem</label>
                    <input
                      id={`ordem-${pedido.id}`}
                      type="number"
                      min="1"
                      defaultValue={pedido.ordemPrioridade ?? ''}
                      onBlur={(e) => salvarOrdem(pedido, e.target.value)}
                    />
                  </div>
                )}

                <button
                  className={pedido.prioritario ? 'btn-concluir' : 'btn-observacao'}
                  onClick={() => alternarPrioridade(pedido)}
                >
                  <FiStar /> {pedido.prioritario ? 'Prioridade ativa' : 'Marcar prioridade'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
};

export default PCPPage;
