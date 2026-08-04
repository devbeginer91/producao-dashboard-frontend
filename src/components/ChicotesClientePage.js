import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiMenu, FiArrowLeft, FiCheckCircle, FiAlertTriangle, FiClock, FiSearch, FiPlus, FiSave, FiX } from 'react-icons/fi';
import api from '../api';

const chicoteVazio = { codigoItemCliente: '', codigoDca: '', tempoIdeal: '' };

const ChicotesClientePage = ({
  setSidebarOpen,
  voltarRoute = '/chicotes-eletricos',
  destinoChicote = (id) => `/chicotes-eletricos/chicote/${id}`,
  mostrarTemExecucoes = false,
  permitirCriar = true,
}) => {
  const { cliente } = useParams();
  const navigate = useNavigate();
  const [chicotes, setChicotes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [busca, setBusca] = useState('');
  const [mostrarFormNovo, setMostrarFormNovo] = useState(false);
  const [novoChicote, setNovoChicote] = useState(chicoteVazio);
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    setCarregando(true);
    api.get('/chicotes', { params: { cliente } })
      .then((r) => {
        const dados = mostrarTemExecucoes
          ? [...r.data].sort((a, b) => (b.totalExecucoes || 0) - (a.totalExecucoes || 0))
          : r.data;
        setChicotes(dados);
      })
      .catch((e) => setMensagem('Erro: ' + (e.response?.data?.message || e.message)))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line
  }, [cliente]);

  const criarChicote = async (e) => {
    e.preventDefault();
    if (!novoChicote.codigoItemCliente.trim()) return;
    setSalvando(true);
    try {
      const resposta = await api.post('/chicotes', {
        cliente,
        codigoItemCliente: novoChicote.codigoItemCliente,
        codigoDca: novoChicote.codigoDca || null,
        tempoIdeal: novoChicote.tempoIdeal === '' ? null : parseFloat(novoChicote.tempoIdeal),
      });
      navigate(destinoChicote(resposta.data.id));
    } catch (error) {
      setMensagem('Erro ao criar chicote: ' + (error.response?.data?.message || error.message));
      setSalvando(false);
    }
  };

  const termo = busca.trim().toLowerCase();
  const chicotesFiltrados = termo
    ? chicotes.filter((c) =>
        c.codigoItemCliente.toLowerCase().includes(termo) ||
        (c.codigoDca || '').toLowerCase().includes(termo)
      )
    : chicotes;

  return (
    <>
      <header className="topbar">
        {setSidebarOpen && (
          <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <FiMenu />
          </button>
        )}
        <h1>{cliente}</h1>
      </header>

      <button className="op-voltar" onClick={() => navigate(voltarRoute)}>
        <FiArrowLeft /> Voltar aos clientes
      </button>

      <div className="chicotes-cliente-acoes">
        <div className="busca busca-inline">
          <div className="busca-input-wrapper">
            <FiSearch className="busca-icon" />
            <input
              type="text"
              placeholder="Buscar chicote por código ou DCA"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
        {permitirCriar && !mostrarFormNovo && (
          <button type="button" className="btn-adicionar-pedido" onClick={() => setMostrarFormNovo(true)}>
            <FiPlus /> Criar Chicote
          </button>
        )}
      </div>

      {permitirCriar && mostrarFormNovo && (
        <form className="chicote-dados-form" onSubmit={criarChicote}>
          <div>
            <label htmlFor="novo-chicote-codigo">Código do item cliente</label>
            <input
              id="novo-chicote-codigo"
              value={novoChicote.codigoItemCliente}
              onChange={(e) => setNovoChicote({ ...novoChicote, codigoItemCliente: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="novo-chicote-dca">Código DCA</label>
            <input
              id="novo-chicote-dca"
              value={novoChicote.codigoDca}
              onChange={(e) => setNovoChicote({ ...novoChicote, codigoDca: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="novo-chicote-tempo">Tempo cadastrado (min)</label>
            <input
              id="novo-chicote-tempo"
              type="number"
              min="0"
              value={novoChicote.tempoIdeal}
              onChange={(e) => setNovoChicote({ ...novoChicote, tempoIdeal: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-submit" disabled={salvando}>
            <FiSave /> {salvando ? 'Criando...' : 'Criar'}
          </button>
          <button
            type="button"
            className="btn-editar"
            onClick={() => { setMostrarFormNovo(false); setNovoChicote(chicoteVazio); }}
          >
            <FiX /> Cancelar
          </button>
        </form>
      )}

      {mensagem && <p className="erro">{mensagem}</p>}
      {carregando && <p className="loading">Carregando chicotes...</p>}
      {!carregando && termo && chicotesFiltrados.length === 0 && (
        <p className="pedido-grid-empty">Nenhum chicote encontrado pra "{busca}".</p>
      )}

      <div className="op-itens-list chicotes-list">
        {chicotesFiltrados.map((c) => (
          <button
            key={c.id}
            className={`op-item-row ${mostrarTemExecucoes && c.totalExecucoes > 0 ? 'chicote-row-com-execucoes' : ''}`}
            onClick={() => navigate(destinoChicote(c.id))}
          >
            <span className="op-item-codigo">{c.codigoItemCliente}</span>
            <span className="chicote-dca">{c.codigoDca ? `DCA ${c.codigoDca}` : '—'}</span>
            <span className="chicote-tempo">{c.tempoIdeal ? `${c.tempoIdeal} min cadastrado` : 'sem tempo cadastrado'}</span>
            {c.temEtapas ? (
              <span className="chicote-status chicote-status-ok"><FiCheckCircle /> com etapas</span>
            ) : (
              <span className="chicote-status chicote-status-alerta"><FiAlertTriangle /> sem etapas</span>
            )}
            {mostrarTemExecucoes && (
              c.totalExecucoes > 0 ? (
                <span className="chicote-status chicote-status-execucoes">
                  <FiClock /> {c.totalExecucoes} execuç{c.totalExecucoes === 1 ? 'ão' : 'ões'} registrada{c.totalExecucoes === 1 ? '' : 's'}
                </span>
              ) : (
                <span className="chicote-status chicote-status-sem-execucoes"><FiClock /> sem registros de tempo</span>
              )
            )}
          </button>
        ))}
      </div>
    </>
  );
};

export default ChicotesClientePage;
