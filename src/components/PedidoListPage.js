import React from 'react';
import { FiInbox, FiCheckCircle, FiMenu } from 'react-icons/fi';
import Busca from './Busca';
import PedidoCard from './PedidoCard';
import { filtrarPedidosPorBusca } from '../utils';

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
  const listaFiltrada = filtrarPedidosPorBusca(pedidos, busca);

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
        <span className="column-count">{listaFiltrada.length} pedido(s)</span>
      </div>

      {listaFiltrada.length === 0 ? (
        <p className="pedido-grid-empty">Nenhum pedido aqui.</p>
      ) : (
        <div className="pedido-grid">
          {listaFiltrada.map((pedido) => (
            <PedidoCard key={pedido.id} pedido={pedido} tipo={tipo} {...cardProps} />
          ))}
        </div>
      )}
    </>
  );
};

export default PedidoListPage;
