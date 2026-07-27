import React from 'react';
import { FiInbox, FiClock, FiCheckCircle } from 'react-icons/fi';
import PedidoColumn from './PedidoColumn';

const PedidoBoard = ({
  novos,
  andamento,
  concluidos,
  busca,
  columnRefs,
  andamentoHeaderActions,
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
        headerActions={andamentoHeaderActions}
        columnRef={(el) => { columnRefs.current.andamento = el; }}
        {...sharedProps}
      />
      <PedidoColumn
        tipo="concluido"
        label="Concluídos"
        icon={FiCheckCircle}
        pedidos={concluidos}
        busca={busca}
        columnRef={(el) => { columnRefs.current.concluido = el; }}
        {...sharedProps}
      />
    </div>
  );
};

export default PedidoBoard;
