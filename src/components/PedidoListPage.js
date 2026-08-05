import React, { useEffect, useState } from 'react';
import { FiInbox, FiCheckCircle, FiMenu } from 'react-icons/fi';
import Busca from './Busca';
import PedidoCard from './PedidoCard';
import { filtrarPedidosPorBusca } from '../utils';
import api from '../api';

const ICONS = {
  novo: FiInbox,
  concluido: FiCheckCircle,
};

const PedidoListPage = ({
  tipo,
  titulo,
  pedidos,
  busca,
  setBusca,
  carregarPedidos,
  todosPedidos,
  exportarPDF,
  setSidebarOpen,
  ...cardProps
}) => {
  const Icon = ICONS[tipo];

  // Concluídos não ficam todos carregados o tempo todo (são centenas) — essa página busca
  // só o ano selecionado, sob demanda, em vez de depender de um array global gigante.
  const anoAtual = new Date().getFullYear();
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual);
  const [pedidosConcluidosAno, setPedidosConcluidosAno] = useState([]);
  const [carregandoConcluidos, setCarregandoConcluidos] = useState(false);

  useEffect(() => {
    if (tipo !== 'concluido') return;
    api.get('/pedidos/concluidos/resumo')
      .then((r) => {
        const anos = (r.data.anos || []).map((a) => Number(a.ano)).filter((a) => !isNaN(a));
        setAnosDisponiveis(anos);
        setAnoSelecionado((atual) => (anos.length > 0 && !anos.includes(atual) ? anos[0] : atual));
      })
      .catch(() => setAnosDisponiveis([]));
    // eslint-disable-next-line
  }, [tipo]);

  useEffect(() => {
    if (tipo !== 'concluido') return;
    setCarregandoConcluidos(true);
    api.get('/pedidos', { params: { status: 'concluido', ano: anoSelecionado } })
      .then((r) => setPedidosConcluidosAno(r.data))
      .catch(() => setPedidosConcluidosAno([]))
      .finally(() => setCarregandoConcluidos(false));
  }, [tipo, anoSelecionado]);

  const listaBase = tipo === 'concluido' ? pedidosConcluidosAno : pedidos;
  const listaFiltrada = filtrarPedidosPorBusca(listaBase, busca);

  // Pra concluído, o "excluir" precisa atualizar a lista local do ano, não o estado
  // global (que não existe mais pra essa tela).
  const cardPropsFinal = tipo === 'concluido'
    ? { ...cardProps, setPedidosConcluidos: (updater) => setPedidosConcluidosAno((prev) => updater(prev)) }
    : cardProps;

  return (
    <>
      <header className="topbar">
        <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
          <FiMenu />
        </button>
        <h1><Icon /> {titulo}</h1>
      </header>

      <Busca
        busca={busca}
        setBusca={setBusca}
        carregarPedidos={carregarPedidos}
        todosPedidos={todosPedidos}
        exportarPDF={exportarPDF}
      />

      <div className="list-page-header">
        {tipo === 'concluido' && (
          <label className="filtro-ano-concluidos">
            Ano
            <select value={anoSelecionado} onChange={(e) => setAnoSelecionado(Number(e.target.value))}>
              {(anosDisponiveis.length > 0 ? anosDisponiveis : [anoAtual]).map((ano) => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </label>
        )}
        <span className="column-count">{listaFiltrada.length} pedido(s)</span>
      </div>

      {tipo === 'concluido' && carregandoConcluidos ? (
        <p className="loading">Carregando pedidos concluídos...</p>
      ) : listaFiltrada.length === 0 ? (
        <p className="pedido-grid-empty">Nenhum pedido aqui.</p>
      ) : (
        <div className="pedido-grid">
          {listaFiltrada.map((pedido) => (
            <PedidoCard key={pedido.id} pedido={pedido} tipo={tipo} {...cardPropsFinal} />
          ))}
        </div>
      )}
    </>
  );
};

export default PedidoListPage;
