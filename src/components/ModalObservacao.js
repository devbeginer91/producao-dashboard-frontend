import React from 'react';
import axios from 'axios';

const ModalObservacao = ({ pedidoSelecionado, observacao, setObservacao, setMostrarModal, setMensagem }) => {
  const enviarObservacao = async () => {
    if (!observacao) {
      setMensagem('Digite uma observação.');
      return;
    }
    if (observacao.length > 500) { // Limite opcional
      setMensagem('A observação não pode exceder 500 caracteres.');
      return;
    }
    try {
      await axios.post('http://localhost:5000/enviar-email', { pedido: pedidoSelecionado, observacao });
      setMensagem('Observação enviada por e-mail!');
      setMostrarModal(false);
    } catch (error) {
      console.error('Erro no enviarObservacao:', error);
      setMensagem('Erro ao enviar observação: ' + error.message);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h3>Observações para {pedidoSelecionado.numeroOS}</h3>
        <textarea
          id="observacao"
          name="observacao"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Digite sua observação aqui"
          rows="5"
          maxLength="500" // Limite opcional
        />
        <div className="modal-buttons">
          <button className="btn-enviar" onClick={enviarObservacao}>Enviar</button>
          <button className="btn-cancelar" onClick={() => setMostrarModal(false)}>Cancelar</button>
        </div>
      </div>
    </div>
  );
};

export default ModalObservacao;