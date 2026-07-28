import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiMenu, FiArrowLeft, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import api from '../api';

const ChicotesClientePage = ({ setSidebarOpen }) => {
  const { cliente } = useParams();
  const navigate = useNavigate();
  const [chicotes, setChicotes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    setCarregando(true);
    api.get('/chicotes', { params: { cliente } })
      .then((r) => setChicotes(r.data))
      .catch((e) => setMensagem('Erro: ' + (e.response?.data?.message || e.message)))
      .finally(() => setCarregando(false));
  }, [cliente]);

  return (
    <>
      <header className="topbar">
        <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
          <FiMenu />
        </button>
        <h1>{cliente}</h1>
      </header>

      <button className="op-voltar" onClick={() => navigate('/chicotes-eletricos')}>
        <FiArrowLeft /> Voltar aos clientes
      </button>

      {mensagem && <p className="erro">{mensagem}</p>}
      {carregando && <p className="loading">Carregando chicotes...</p>}

      <div className="op-itens-list chicotes-list">
        {chicotes.map((c) => (
          <button key={c.id} className="op-item-row" onClick={() => navigate(`/chicotes-eletricos/chicote/${c.id}`)}>
            <span className="op-item-codigo">{c.codigoItemCliente}</span>
            <span className="chicote-dca">{c.codigoDca ? `DCA ${c.codigoDca}` : '—'}</span>
            <span className="chicote-tempo">{c.tempoIdeal ? `${c.tempoIdeal} min cadastrado` : 'sem tempo cadastrado'}</span>
            {c.temEtapas ? (
              <span className="chicote-status chicote-status-ok"><FiCheckCircle /> com etapas</span>
            ) : (
              <span className="chicote-status chicote-status-alerta"><FiAlertTriangle /> sem etapas</span>
            )}
          </button>
        ))}
      </div>
    </>
  );
};

export default ChicotesClientePage;
