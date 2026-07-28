import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiChevronRight } from 'react-icons/fi';
import api from '../api';

const ClientesChicotesPage = ({ setSidebarOpen }) => {
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/chicotes/clientes')
      .then((r) => setClientes(r.data))
      .catch((e) => setMensagem('Erro ao carregar clientes: ' + (e.response?.data?.message || e.message)))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <>
      <header className="topbar">
        <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
          <FiMenu />
        </button>
        <h1>Chicotes Elétricos</h1>
      </header>

      {mensagem && <p className="erro">{mensagem}</p>}
      {carregando && <p className="loading">Carregando clientes...</p>}
      {!carregando && clientes.length === 0 && (
        <p className="pedido-grid-empty">Nenhum chicote cadastrado ainda.</p>
      )}

      <div className="op-grid">
        {clientes.map((c) => (
          <button
            key={c.cliente}
            className="op-card op-card-clicavel"
            onClick={() => navigate(`/chicotes-eletricos/${encodeURIComponent(c.cliente)}`)}
          >
            <div className="op-card-header">
              <span className="op-card-empresa">{c.cliente}</span>
            </div>
            <span className="op-card-itens-count">
              {c.total} chicote(s) <FiChevronRight />
            </span>
          </button>
        ))}
      </div>
    </>
  );
};

export default ClientesChicotesPage;
