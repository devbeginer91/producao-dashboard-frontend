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

const MESES = [
  { valor: '01', nome: 'Janeiro' },
  { valor: '02', nome: 'Fevereiro' },
  { valor: '03', nome: 'Março' },
  { valor: '04', nome: 'Abril' },
  { valor: '05', nome: 'Maio' },
  { valor: '06', nome: 'Junho' },
  { valor: '07', nome: 'Julho' },
  { valor: '08', nome: 'Agosto' },
  { valor: '09', nome: 'Setembro' },
  { valor: '10', nome: 'Outubro' },
  { valor: '11', nome: 'Novembro' },
  { valor: '12', nome: 'Dezembro' },
];

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
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [clientesDisponiveis, setClientesDisponiveis] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState('');
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
    api.get('/pedidos/empresas').then((r) => setClientesDisponiveis(r.data)).catch(() => setClientesDisponiveis([]));
    // eslint-disable-next-line
  }, [tipo]);

  useEffect(() => {
    if (tipo !== 'concluido') return;
    setCarregandoConcluidos(true);
    const params = { status: 'concluido', ano: anoSelecionado };
    if (mesSelecionado) params.mes = mesSelecionado;
    if (clienteSelecionado) params.empresa = clienteSelecionado;
    api.get('/pedidos', { params })
      .then((r) => setPedidosConcluidosAno(r.data))
      .catch(() => setPedidosConcluidosAno([]))
      .finally(() => setCarregandoConcluidos(false));
  }, [tipo, anoSelecionado, mesSelecionado, clienteSelecionado]);

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
          <>
            <label className="filtro-ano-concluidos">
              Cliente
              <select value={clienteSelecionado} onChange={(e) => setClienteSelecionado(e.target.value)}>
                <option value="">Todos os clientes</option>
                {clientesDisponiveis.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="filtro-ano-concluidos">
              Mês
              <select value={mesSelecionado} onChange={(e) => setMesSelecionado(e.target.value)}>
                <option value="">Todos os meses</option>
                {MESES.map((m) => (
                  <option key={m.valor} value={m.valor}>{m.nome}</option>
                ))}
              </select>
            </label>
            <label className="filtro-ano-concluidos">
              Ano
              <select value={anoSelecionado} onChange={(e) => setAnoSelecionado(Number(e.target.value))}>
                {(anosDisponiveis.length > 0 ? anosDisponiveis : [anoAtual]).map((ano) => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </label>
          </>
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
