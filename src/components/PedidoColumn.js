import React, { useState } from 'react';
import PedidoCard from './PedidoCard';

const filtrarPedidos = (lista, busca) => {
  if (!busca) return lista;
  const termo = busca.toLowerCase();
  return lista.filter((pedido) =>
    pedido.empresa.toLowerCase().includes(termo) ||
    pedido.numeroOS.toLowerCase().includes(termo)
  );
};

const PedidoColumn = ({
  tipo,
  label,
  icon: Icon,
  pedidos,
  busca,
  headerActions,
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

  const listaFiltrada = filtrarPedidos(pedidos, busca);

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
          {headerActions}
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
