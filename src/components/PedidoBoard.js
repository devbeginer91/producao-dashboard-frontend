import React from 'react';
import { FiInbox, FiClock } from 'react-icons/fi';
import PedidoColumn from './PedidoColumn';

const PedidoBoard = ({
  novos,
  andamento,
  busca,
  columnRefs,
  ...sharedProps
}) => {
  return (
    <div className="board">
      <PedidoColumn
        tipo="novo"
        label="Pedidos Novos"
        icon={FiInbox}
        pedidos={novos}
        busca={busca}
        ordenavel
        columnRef={(el) => { columnRefs.current.novo = el; }}
        {...sharedProps}
      />
      <PedidoColumn
        tipo="andamento"
        label="Em Andamento"
        icon={FiClock}
        pedidos={andamento}
        busca={busca}
        ordenavel
        columnRef={(el) => { columnRefs.current.andamento = el; }}
        {...sharedProps}
      />
    </div>
  );
};

export default PedidoBoard;
