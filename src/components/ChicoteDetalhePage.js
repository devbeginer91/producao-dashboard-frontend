import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiMenu, FiArrowLeft, FiSave, FiLink, FiX } from 'react-icons/fi';
import api from '../api';

const ChicoteDetalhePage = ({ setSidebarOpen }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chicote, setChicote] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [form, setForm] = useState({ codigoItemCliente: '', codigoDca: '', tempoIdeal: '' });
  const [itensDisponiveis, setItensDisponiveis] = useState([]);
  const [itemParaVincular, setItemParaVincular] = useState('');

  const carregar = () => {
    setCarregando(true);
    api.get(`/chicotes/${id}`)
      .then((r) => {
        setChicote(r.data);
        setForm({
          codigoItemCliente: r.data.codigoItemCliente || '',
          codigoDca: r.data.codigoDca || '',
          tempoIdeal: r.data.tempoIdeal ?? '',
        });
      })
      .catch((e) => setMensagem('Erro: ' + (e.response?.data?.message || e.message)))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => {
    if (!chicote) return;
    api.get('/itens-pedidos')
      .then((r) => {
        const disponiveis = r.data.filter(
          (item) => !item.chicoteId && item.empresa.trim().toUpperCase() === chicote.cliente.trim().toUpperCase()
        );
        setItensDisponiveis(disponiveis);
      })
      .catch(() => setItensDisponiveis([]));
  }, [chicote]);

  const salvarChicote = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/chicotes/${id}`, {
        codigoItemCliente: form.codigoItemCliente,
        codigoDca: form.codigoDca || null,
        tempoIdeal: form.tempoIdeal === '' ? null : parseFloat(form.tempoIdeal),
      });
      setMensagem('Chicote atualizado.');
      carregar();
    } catch (error) {
      setMensagem('Erro ao salvar: ' + (error.response?.data?.message || error.message));
    }
  };

  const vincularItem = async () => {
    if (!itemParaVincular) return;
    try {
      await api.put(`/itens-pedidos/${itemParaVincular}/chicote`, { chicoteId: parseInt(id, 10) });
      setItemParaVincular('');
      carregar();
    } catch (error) {
      setMensagem('Erro ao vincular: ' + (error.response?.data?.message || error.message));
    }
  };

  const desvincularItem = async (itemId) => {
    try {
      await api.put(`/itens-pedidos/${itemId}/chicote`, { chicoteId: null });
      carregar();
    } catch (error) {
      setMensagem('Erro ao desvincular: ' + (error.response?.data?.message || error.message));
    }
  };

  if (carregando) return <p className="loading">Carregando chicote...</p>;
  if (!chicote) return <p className="erro">{mensagem || 'Chicote não encontrado.'}</p>;

  return (
    <>
      <header className="topbar">
        <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
          <FiMenu />
        </button>
        <h1>{chicote.cliente} — {chicote.codigoItemCliente}</h1>
      </header>

      <button className="op-voltar" onClick={() => navigate(`/chicotes-eletricos/${encodeURIComponent(chicote.cliente)}`)}>
        <FiArrowLeft /> Voltar aos chicotes de {chicote.cliente}
      </button>

      {mensagem && <p className={mensagem.includes('Erro') ? 'erro' : 'sucesso'}>{mensagem}</p>}

      <form className="chicote-dados-form" onSubmit={salvarChicote}>
        <div>
          <label htmlFor="chicote-codigo">Código do item cliente</label>
          <input
            id="chicote-codigo"
            value={form.codigoItemCliente}
            onChange={(e) => setForm({ ...form, codigoItemCliente: e.target.value })}
            required
          />
        </div>
        <div>
          <label htmlFor="chicote-dca">Código DCA</label>
          <input id="chicote-dca" value={form.codigoDca} onChange={(e) => setForm({ ...form, codigoDca: e.target.value })} />
        </div>
        <div>
          <label htmlFor="chicote-tempo">Tempo cadastrado (min)</label>
          <input
            id="chicote-tempo"
            type="number"
            min="0"
            value={form.tempoIdeal}
            onChange={(e) => setForm({ ...form, tempoIdeal: e.target.value })}
          />
        </div>
        <button type="submit" className="btn-submit"><FiSave /> Salvar</button>
      </form>

      <h2 className="op-detalhe-titulo secao-titulo">Etapas</h2>
      {chicote.etapas.length === 0 ? (
        <p className="pedido-grid-empty">Nenhuma etapa cadastrada ainda.</p>
      ) : (
        <ol className="chicote-etapas-list">
          {chicote.etapas.map((e) => (
            <li key={e.id} className="chicote-etapa-item">
              <span className="chicote-etapa-ordem">{e.ordem}</span>
              <div>
                <div className="chicote-etapa-nome">{e.nome}</div>
                <div className="chicote-etapa-meta">
                  {e.setor} · {e.quemTexto} {e.tempoIdeal ? `· meta ${e.tempoIdeal} min` : ''}
                </div>
                {e.instrucoes && <div className="chicote-etapa-instrucoes">{e.instrucoes}</div>}
              </div>
            </li>
          ))}
        </ol>
      )}

      <h2 className="op-detalhe-titulo secao-titulo">Itens de pedido vinculados</h2>
      {chicote.itensVinculados.length === 0 ? (
        <p className="pedido-grid-empty">Nenhum item vinculado ainda.</p>
      ) : (
        <div className="op-itens-list">
          {chicote.itensVinculados.map((item) => (
            <div key={item.id} className="op-item-row op-item-row-estatico">
              <span className="op-item-codigo">{item.empresa} · OS {item.numeroOS} · {item.codigoDesenho}</span>
              <span className={`pcp-status pcp-status-${item.status}`}>{item.status}</span>
              <button type="button" className="btn-excluir" onClick={() => desvincularItem(item.id)}>
                <FiX /> Desvincular
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="chicote-vincular-item">
        <select value={itemParaVincular} onChange={(e) => setItemParaVincular(e.target.value)}>
          <option value="">— selecionar item de pedido pra vincular —</option>
          {itensDisponiveis.map((item) => (
            <option key={item.id} value={item.id}>
              {item.empresa} · OS {item.numeroOS} · {item.codigoDesenho}
            </option>
          ))}
        </select>
        <button type="button" className="btn-editar" onClick={vincularItem} disabled={!itemParaVincular}>
          <FiLink /> Vincular
        </button>
      </div>
    </>
  );
};

export default ChicoteDetalhePage;
