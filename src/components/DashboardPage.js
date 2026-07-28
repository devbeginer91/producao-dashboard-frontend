import React, { useEffect } from 'react';
import { FiMenu, FiPlus } from 'react-icons/fi';
import StatsBar from './StatsBar';
import Busca from './Busca';
import PedidoBoard from './PedidoBoard';
import ExecucoesAtivasPanel from './ExecucoesAtivasPanel';

const DashboardPage = ({
  mensagem,
  isLoading,
  novos,
  andamento,
  concluidos,
  busca,
  setBusca,
  carregarPedidos,
  exportarPDF,
  columnRefs,
  pendingScrollTipo,
  scrollToColumn,
  setMostrarFormulario,
  setSidebarOpen,
  ...boardProps
}) => {
  useEffect(() => {
    if (pendingScrollTipo.current) {
      const tipo = pendingScrollTipo.current;
      pendingScrollTipo.current = null;
      requestAnimationFrame(() => scrollToColumn(tipo));
    }
  }, [pendingScrollTipo, scrollToColumn]);

  return (
    <>
      <header className="topbar">
        <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
          <FiMenu />
        </button>
        <h1>Controle de Produção</h1>
        <button className="btn-adicionar-pedido" onClick={() => setMostrarFormulario(true)}>
          <FiPlus /> Adicionar Pedido
        </button>
      </header>

      {mensagem && <p className={mensagem.includes('Erro') ? 'erro' : 'sucesso'}>{mensagem}</p>}
      {isLoading && <p className="loading">Carregando pedidos...</p>}

      <StatsBar novos={novos} andamento={andamento} concluidos={concluidos} />

      <ExecucoesAtivasPanel />

      <Busca
        busca={busca}
        setBusca={setBusca}
        carregarPedidos={carregarPedidos}
        todosPedidos={[...andamento, ...novos, ...concluidos]}
        exportarPDF={exportarPDF}
      />

      <PedidoBoard
        novos={novos}
        andamento={andamento}
        busca={busca}
        columnRefs={columnRefs}
        setMostrarFormulario={setMostrarFormulario}
        {...boardProps}
      />
    </>
  );
};

export default DashboardPage;
