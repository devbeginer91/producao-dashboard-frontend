import React, { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import api from '../api';
import PedidoCard from './PedidoCard';
import ModalObservacao from './ModalObservacao';

const tipoDoStatus = (status) => {
  if (status === 'novo') return 'novo';
  if (status === 'concluido') return 'concluido';
  return 'andamento';
};

const OsCardModal = ({ pedidoId, onClose }) => {
  const [pedido, setPedido] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [mostrarModalObs, setMostrarModalObs] = useState(false);
  const [pedidoSelecionadoObs, setPedidoSelecionadoObs] = useState(null);
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    api.get('/pedidos', { params: { id: pedidoId } })
      .then((response) => setPedido(response.data[0] || null))
      .catch((error) => setMensagem('Erro ao carregar pedido: ' + (error.response?.data?.message || error.message)))
      .finally(() => setCarregando(false));
  }, [pedidoId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="btn-fechar-modal" onClick={onClose}>
          <FiX /> Fechar
        </button>
        {carregando && <p className="loading">Carregando pedido...</p>}
        {mensagem && <p className="erro">{mensagem}</p>}
        {!carregando && !mensagem && !pedido && <p>Pedido não encontrado.</p>}
        {pedido && (
          <PedidoCard
            pedido={pedido}
            tipo={tipoDoStatus(pedido.status)}
            readOnly
            setMensagem={setMensagem}
            setMostrarModal={setMostrarModalObs}
            setPedidoSelecionado={setPedidoSelecionadoObs}
          />
        )}
      </div>

      {mostrarModalObs && pedidoSelecionadoObs && (
        <ModalObservacao
          pedidoSelecionado={pedidoSelecionadoObs}
          observacao={observacao}
          setObservacao={setObservacao}
          setMostrarModal={setMostrarModalObs}
          setMensagem={setMensagem}
        />
      )}
    </div>
  );
};

export default OsCardModal;
