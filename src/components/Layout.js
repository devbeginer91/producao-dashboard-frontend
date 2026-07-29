import React from 'react';
import { Outlet } from 'react-router-dom';
import { FiX } from 'react-icons/fi';
import Sidebar from './Sidebar';
import PedidoForm from './pedidoForm';
import ModalObservacao from './ModalObservacao';
import ModalPesoVolume from './ModalPesoVolume';

const Layout = ({
  sidebarCounts,
  onNavigateAndamento,
  onLogout,
  sidebarOpen,
  setSidebarOpen,
  mostrarFormulario,
  setMostrarFormulario,
  novoPedido,
  setNovoPedido,
  pedidoParaEditar,
  setPedidoParaEditar,
  setMensagem,
  carregarPedidos,
  setPedidos,
  setPedidosAndamento,
  setPedidosConcluidos,
  setMostrarModalPesoVolume,
  pedidoParaConcluir,
  setPedidoParaConcluir,
  formatDateToLocalISO,
  mostrarModal,
  pedidoSelecionado,
  observacao,
  setObservacao,
  setMostrarModal,
  mostrarModalPesoVolume,
  peso,
  setPeso,
  volume,
  setVolume,
}) => {
  return (
    <div className="app-shell">
      <Sidebar
        counts={sidebarCounts}
        onNavigateAndamento={onNavigateAndamento}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="app-main">
        <Outlet />
      </main>

      {mostrarFormulario && (
        <div className="form-drawer-overlay" onClick={() => setMostrarFormulario(false)}>
          <div className="form-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="form-drawer-header">
              <h2>{pedidoParaEditar ? 'Editar Pedido' : 'Adicionar Pedido Novo'}</h2>
              <button className="btn-fechar-drawer" onClick={() => setMostrarFormulario(false)} aria-label="Fechar">
                <FiX />
              </button>
            </div>
            <PedidoForm
              novoPedido={novoPedido}
              setNovoPedido={setNovoPedido}
              pedidoParaEditar={pedidoParaEditar}
              setPedidoParaEditar={setPedidoParaEditar}
              mostrarFormulario={mostrarFormulario}
              setMostrarFormulario={setMostrarFormulario}
              setMensagem={setMensagem}
              carregarPedidos={carregarPedidos}
              setPedidos={setPedidos}
              setPedidosAndamento={setPedidosAndamento}
              setPedidosConcluidos={setPedidosConcluidos}
              setMostrarModalPesoVolume={setMostrarModalPesoVolume}
              setPedidoParaConcluir={setPedidoParaConcluir}
              formatDateToLocalISO={formatDateToLocalISO}
            />
          </div>
        </div>
      )}

      {mostrarModal && (
        <ModalObservacao
          pedidoSelecionado={pedidoSelecionado}
          observacao={observacao}
          setObservacao={setObservacao}
          setMostrarModal={setMostrarModal}
          setMensagem={setMensagem}
        />
      )}

      {mostrarModalPesoVolume && (
        <ModalPesoVolume
          pedidoParaConcluir={pedidoParaConcluir}
          peso={peso}
          setPeso={setPeso}
          volume={volume}
          setVolume={setVolume}
          setMostrarModalPesoVolume={setMostrarModalPesoVolume}
          setPedidoParaConcluir={setPedidoParaConcluir}
          setPedidos={setPedidos}
          setPedidosConcluidos={setPedidosConcluidos}
          setMensagem={setMensagem}
          carregarPedidos={carregarPedidos}
        />
      )}
    </div>
  );
};

export default Layout;
