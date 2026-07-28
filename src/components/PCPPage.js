import React, { useEffect, useState } from 'react';
import { FiMenu, FiStar } from 'react-icons/fi';
import api from '../api';

const PCPPage = ({ setSidebarOpen, pcpNome, onLogout }) => {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');

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
          return a.empresa.localeCompare(b.empresa);
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

      {mensagem && <p className="erro">{mensagem}</p>}
      {carregando && <p className="loading">Carregando pedidos...</p>}
      {!carregando && pedidos.length === 0 && (
        <p className="pedido-grid-empty">Nenhum pedido novo ou em andamento no momento.</p>
      )}

      <div className="pcp-list">
        {pedidos.map((pedido) => (
          <div key={pedido.id} className={`pcp-row ${pedido.prioritario ? 'pcp-row-prioritario' : ''}`}>
            <div className="pcp-row-info">
              <span className="pcp-row-empresa">{pedido.empresa}</span>
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
    </>
  );
};

export default PCPPage;
