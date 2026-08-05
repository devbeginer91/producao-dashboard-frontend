import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiDownload, FiZap } from 'react-icons/fi';
import api from '../api';

const Busca = ({ busca, setBusca, carregarPedidos, todosPedidos, exportarPDF }) => {
  const [chicotes, setChicotes] = useState([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  // `todosPedidos` só tem os pedidos ativos (novo/andamento) carregados em memória — pedidos
  // concluídos não ficam mais todos ali. Pra continuar achando OS antigas, complementa com
  // uma busca leve no backend (debounced), que varre o histórico inteiro sem trazer produção.
  const [resultadosBackend, setResultadosBackend] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/chicotes').then((r) => setChicotes(r.data)).catch(() => setChicotes([]));
  }, []);

  useEffect(() => {
    const termo = busca.trim();
    if (termo.length < 2) {
      setResultadosBackend([]);
      return;
    }
    const timeoutId = setTimeout(() => {
      api.get('/pedidos/buscar', { params: { termo } })
        .then((r) => setResultadosBackend(r.data))
        .catch(() => setResultadosBackend([]));
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [busca]);

  const filtrarPedidos = (lista) => {
    if (!busca) return [];
    return lista.filter((pedido) =>
      pedido.empresa.toLowerCase().includes(busca.toLowerCase()) ||
      pedido.numeroOS.toLowerCase().includes(busca.toLowerCase())
    );
  };

  const filtrarChicotes = (lista) => {
    if (!busca) return [];
    const termo = busca.toLowerCase();
    return lista.filter((c) =>
      c.cliente.toLowerCase().includes(termo) ||
      c.codigoItemCliente.toLowerCase().includes(termo) ||
      (c.codigoDca || '').toLowerCase().includes(termo)
    );
  };

  const irParaChicote = (id) => {
    navigate(`/chicotes-eletricos/chicote/${id}`);
    setBusca('');
    setMostrarSugestoes(false);
  };

  const pedidosLocais = filtrarPedidos(todosPedidos);
  const idsLocais = new Set(pedidosLocais.map((p) => p.id));
  const pedidosEncontrados = [
    ...pedidosLocais,
    ...resultadosBackend.filter((p) => !idsLocais.has(p.id)),
  ];
  const chicotesEncontrados = filtrarChicotes(chicotes);

  return (
    <div className="busca">
      <div className="busca-container">
        <div className="busca-input-wrapper">
          <FiSearch className="busca-icon" />
          <input
            type="text"
            id="buscaInput"
            name="buscaInput"
            placeholder="Buscar por Empresa, Nº OS ou Chicote"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setMostrarSugestoes(true); }}
            onFocus={() => setMostrarSugestoes(true)}
            onBlur={() => setTimeout(() => setMostrarSugestoes(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setMostrarSugestoes(false);
              }
            }}
          />
        </div>
        <button className="btn-exportar" onClick={exportarPDF}><FiDownload /> Exportar PDF</button>
      </div>
      {busca && mostrarSugestoes && (
        <ul className="lista-suspensa">
          {pedidosEncontrados.length === 0 && chicotesEncontrados.length === 0 ? (
            <li>Nenhum resultado encontrado</li>
          ) : (
            <>
              {pedidosEncontrados.map((pedido) => (
                <li
                  key={`pedido-${pedido.id}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setMostrarSugestoes(false)}
                >
                  {pedido.empresa} - {pedido.numeroOS} ({pedido.status})
                </li>
              ))}
              {chicotesEncontrados.map((c) => (
                <li
                  key={`chicote-${c.id}`}
                  className="lista-suspensa-chicote"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => irParaChicote(c.id)}
                >
                  <FiZap /> {c.cliente} · {c.codigoItemCliente}{c.codigoDca ? ` (DCA ${c.codigoDca})` : ''}
                </li>
              ))}
            </>
          )}
        </ul>
      )}
    </div>
  );
};

export default Busca;
