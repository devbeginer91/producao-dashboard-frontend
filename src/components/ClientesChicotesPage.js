import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiArrowLeft, FiChevronRight, FiSearch, FiZap, FiFileText } from 'react-icons/fi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api';

const ClientesChicotesPage = ({
  setSidebarOpen,
  titulo = 'Chicotes Elétricos',
  baseRoute = '/chicotes-eletricos',
  mostrarBuscaChicote = false,
  destinoBuscaChicote = (id) => `/chicotes-eletricos/chicote/${id}`,
  mostrarPdfPorCliente = false,
  voltarRoute = null,
}) => {
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [todosChicotes, setTodosChicotes] = useState([]);
  const [busca, setBusca] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/chicotes/clientes')
      .then((r) => setClientes(r.data))
      .catch((e) => setMensagem('Erro ao carregar clientes: ' + (e.response?.data?.message || e.message)))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    if (!mostrarBuscaChicote && !mostrarPdfPorCliente) return;
    api.get('/chicotes').then((r) => setTodosChicotes(r.data)).catch(() => setTodosChicotes([]));
  }, [mostrarBuscaChicote, mostrarPdfPorCliente]);

  const emitirPdfPorCliente = () => {
    const doc = new jsPDF();
    const porCliente = new Map();
    todosChicotes.forEach((c) => {
      if (!porCliente.has(c.cliente)) porCliente.set(c.cliente, []);
      porCliente.get(c.cliente).push(c);
    });
    const clientesOrdenados = Array.from(porCliente.keys()).sort((a, b) => a.localeCompare(b));

    doc.setFontSize(14);
    doc.text('Relatório de Tempos por Chicote', 14, 18);
    doc.setFontSize(9);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 24);

    let cursorY = 32;
    clientesOrdenados.forEach((cliente) => {
      const chicotesDoCliente = porCliente.get(cliente).sort((a, b) => a.codigoItemCliente.localeCompare(b.codigoItemCliente));
      if (cursorY > 265) {
        doc.addPage();
        cursorY = 20;
      }
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(cliente, 14, cursorY);
      doc.setFont(undefined, 'normal');
      cursorY += 4;

      autoTable(doc, {
        head: [['Código', 'DCA', 'Tempo total']],
        body: chicotesDoCliente.map((c) => [
          c.codigoItemCliente,
          c.codigoDca || '—',
          c.tempoIdeal != null ? `${c.tempoIdeal} min` : 'não cadastrado',
        ]),
        startY: cursorY,
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });
      cursorY = doc.lastAutoTable.finalY + 10;
    });

    doc.save('relatorio_tempos_por_chicote.pdf');
  };

  const irParaChicoteEncontrado = (id) => {
    navigate(destinoBuscaChicote(id));
    setBusca('');
  };

  const termo = busca.trim().toLowerCase();
  const chicotesEncontrados = termo
    ? todosChicotes.filter((c) =>
        c.cliente.toLowerCase().includes(termo) ||
        c.codigoItemCliente.toLowerCase().includes(termo) ||
        (c.codigoDca || '').toLowerCase().includes(termo)
      )
    : [];

  return (
    <>
      <header className="topbar">
        {setSidebarOpen && (
          <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <FiMenu />
          </button>
        )}
        <h1>{titulo}</h1>
      </header>

      {voltarRoute && (
        <button className="op-voltar" onClick={() => navigate(voltarRoute)}>
          <FiArrowLeft /> Voltar
        </button>
      )}

      {mostrarPdfPorCliente && todosChicotes.length > 0 && (
        <button type="button" className="btn-editar chicote-btn-pdf" onClick={emitirPdfPorCliente}>
          <FiFileText /> Emitir PDF
        </button>
      )}

      {mostrarBuscaChicote && (
        <div className="busca">
          <div className="busca-input-wrapper">
            <FiSearch className="busca-icon" />
            <input
              type="text"
              placeholder="Buscar chicote por cliente ou código"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          {termo && (
            <ul className="lista-suspensa">
              {chicotesEncontrados.length === 0 ? (
                <li>Nenhum chicote encontrado</li>
              ) : (
                chicotesEncontrados.map((c) => (
                  <li key={c.id} className="lista-suspensa-chicote" onClick={() => irParaChicoteEncontrado(c.id)}>
                    <FiZap /> {c.cliente} · {c.codigoItemCliente}{c.codigoDca ? ` (DCA ${c.codigoDca})` : ''}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}

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
            onClick={() => navigate(`${baseRoute}/${encodeURIComponent(c.cliente)}`)}
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
