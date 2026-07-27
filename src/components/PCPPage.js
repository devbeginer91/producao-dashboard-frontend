import React, { useEffect, useState } from 'react';
import { FiMenu, FiLogOut, FiStar, FiSave, FiAlertTriangle } from 'react-icons/fi';
import api from '../api';

const PCPPage = ({ setSidebarOpen, pcpNome, onLogout }) => {
  const [itens, setItens] = useState([]);
  const [chicotes, setChicotes] = useState([]);
  const [selecoes, setSelecoes] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');

  const carregar = async () => {
    setCarregando(true);
    setMensagem('');
    try {
      const [itensResp, chicotesResp] = await Promise.all([
        api.get('/itens-pedidos'),
        api.get('/chicotes'),
      ]);
      setItens(itensResp.data);
      setChicotes(chicotesResp.data);
      const iniciais = {};
      itensResp.data.forEach((item) => {
        iniciais[item.id] = item.chicoteVinculado?.id || item.chicoteSugerido?.id || '';
      });
      setSelecoes(iniciais);
    } catch (error) {
      setMensagem('Erro ao carregar itens: ' + (error.response?.data?.message || error.message));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const salvarVinculo = async (item) => {
    const chicoteId = selecoes[item.id] ? parseInt(selecoes[item.id], 10) : null;
    try {
      await api.put(`/itens-pedidos/${item.id}/chicote`, { chicoteId });
      setMensagem('Chicote vinculado com sucesso.');
      carregar();
    } catch (error) {
      setMensagem('Erro ao vincular chicote: ' + (error.response?.data?.message || error.message));
    }
  };

  const alternarPrioridade = async (item) => {
    try {
      await api.put(`/itens-pedidos/${item.id}/prioridade`, { prioritario: !item.prioritario });
      setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, prioritario: !i.prioritario } : i)));
    } catch (error) {
      setMensagem('Erro ao atualizar prioridade: ' + (error.response?.data?.message || error.message));
    }
  };

  const opcoesChicote = (item) =>
    chicotes.filter((c) => c.cliente.trim().toUpperCase() === (item.empresa || '').trim().toUpperCase());

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
            <FiLogOut /> Sair{pcpNome ? ` (${pcpNome})` : ''}
          </button>
        )}
      </header>

      {mensagem && <p className={mensagem.includes('Erro') ? 'erro' : 'sucesso'}>{mensagem}</p>}
      {carregando && <p className="loading">Carregando itens...</p>}

      {!carregando && itens.length === 0 && (
        <p className="pedido-grid-empty">Nenhum item de pedido novo ou em andamento no momento.</p>
      )}

      <div className="pcp-list">
        {itens.map((item) => {
          const semChicoteDisponivel = opcoesChicote(item).length === 0;
          return (
            <div key={item.id} className={`pcp-row ${item.prioritario ? 'pcp-row-prioritario' : ''}`}>
              <div className="pcp-row-info">
                <span className="pcp-row-empresa">{item.empresa}</span>
                <span className="pcp-row-os">OS {item.numeroOS}</span>
                <span className="pcp-row-codigo">Cód. {item.codigoDesenho}</span>
                <span className={`pcp-status pcp-status-${item.status}`}>{item.status}</span>
              </div>

              <div className="pcp-row-chicote">
                <select
                  value={selecoes[item.id] || ''}
                  onChange={(e) => setSelecoes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                >
                  <option value="">— sem chicote vinculado —</option>
                  {opcoesChicote(item).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigoItemCliente} {c.codigoDca ? `(DCA ${c.codigoDca})` : ''}
                    </option>
                  ))}
                </select>
                {!item.chicoteVinculado && item.chicoteSugerido && (
                  <span className="pcp-sugestao">sugerido automaticamente</span>
                )}
                {!item.chicoteVinculado && !item.chicoteSugerido && !semChicoteDisponivel && (
                  <span className="pcp-sem-sugestao"><FiAlertTriangle /> sem sugestão automática — selecione manualmente</span>
                )}
                {semChicoteDisponivel && (
                  <span className="pcp-sem-sugestao"><FiAlertTriangle /> nenhum chicote cadastrado para este cliente</span>
                )}
                <button
                  className="btn-editar"
                  onClick={() => salvarVinculo(item)}
                  disabled={(selecoes[item.id] || '') === (item.chicoteVinculado?.id || '')}
                >
                  <FiSave /> Salvar
                </button>
              </div>

              <button
                className={item.prioritario ? 'btn-concluir' : 'btn-observacao'}
                onClick={() => alternarPrioridade(item)}
              >
                <FiStar /> {item.prioritario ? 'Prioridade ativa' : 'Marcar prioridade'}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default PCPPage;
