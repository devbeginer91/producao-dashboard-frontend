import React, { useState } from 'react';
import PedidoCard from './PedidoCard';
import { filtrarPedidosPorBusca } from '../utils';

const PedidoColumn = ({
  tipo,
  label,
  icon: Icon,
  pedidos,
  busca,
  columnRef,
  setPedidos,
  setPedidosAndamento,
  ordenavel,
  ...cardProps
}) => {
  const [sortOrder, setSortOrder] = useState('desc');

  const alternarOrdenacao = () => {
    const ordenado = [...pedidos].sort((a, b) => {
      const dateA = new Date(a.previsaoEntrega);
      const dateB = new Date(b.previsaoEntrega);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    if (tipo === 'andamento') {
      setPedidos(ordenado);
    } else if (tipo === 'novo') {
      setPedidosAndamento(ordenado);
    }
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const listaFiltradaBusca = filtrarPedidosPorBusca(pedidos, busca);
  const listaFiltrada = tipo === 'andamento'
    ? [...listaFiltradaBusca].sort((a, b) => {
        const chaveA = a.prioritario ? (a.ordemPrioridade ?? 0) : Infinity;
        const chaveB = b.prioritario ? (b.ordemPrioridade ?? 0) : Infinity;
        return chaveA - chaveB;
      })
    : listaFiltradaBusca;

  return (
    <section className={`board-column board-column-${tipo}`} ref={columnRef}>
      <header className="column-header">
        <div className="column-header-title">
          <Icon /> <h2>{label}</h2>
          <span className="column-count">{listaFiltrada.length}</span>
        </div>
        <div className="column-header-actions">
          {ordenavel && (
            <button className="btn-sort" onClick={alternarOrdenacao} title="Ordenar por previsão de entrega">
              Previsão {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
          )}
        </div>
      </header>
      <div className="column-body">
        {listaFiltrada.length === 0 ? (
          <p className="column-empty">Nenhum pedido aqui.</p>
        ) : (
          listaFiltrada.map((pedido) => (
            <PedidoCard
              key={pedido.id}
              pedido={pedido}
              tipo={tipo}
              setPedidos={setPedidos}
              setPedidosAndamento={setPedidosAndamento}
              {...cardProps}
            />
          ))
        )}
      </div>
    </section>
  );
};

export default PedidoColumn;
