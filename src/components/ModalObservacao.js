import React, { useState, useEffect } from 'react';
import api from '../api';
import { formatarDataHora } from '../utils';

const ModalObservacao = ({
  pedidoSelecionado,
  observacao,
  setObservacao,
  setMostrarModal,
  setMensagem,
}) => {
  const [historicoObservacoes, setHistoricoObservacoes] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!observacao.trim()) {
      setMensagem('Digite uma observação antes de enviar.');
      return;
    }

    try {
      const resposta = await api.post('/enviar-email', {
        pedido: pedidoSelecionado,
        observacao,
      });
      setMensagem('E-mail com observação enviado com sucesso!');
      setObservacao('');
      setMostrarModal(false);
      fetchHistorico(); // Atualiza o histórico após enviar
    } catch (error) {
      setMensagem('Erro ao enviar observação: ' + (error.response?.data.message || error.message));
    }
  };

  const fetchHistorico = async () => {
    if (!pedidoSelecionado?.id) {
      console.log('Nenhum pedido selecionado para buscar histórico de observações');
      setHistoricoObservacoes([]);
      return;
    }

    try {
      console.log(`Buscando histórico de observações para pedido ${pedidoSelecionado.id}`);
      const response = await api.get(`/historico-observacoes/${pedidoSelecionado.id}`);
      console.log('Resposta da API /historico-observacoes:', response.data);
      const historico = Array.isArray(response.data) ? response.data : [];
      setHistoricoObservacoes(historico);
      console.log('Estado historicoObservacoes atualizado:', historico);
      if (historico.length === 0) {
        console.log(`Nenhum histórico de observações retornado para pedido ${pedidoSelecionado.id}`);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico de observações:', error);
      setMensagem('Erro ao carregar histórico de observações: ' + (error.response?.data.message || error.message));
      setHistoricoObservacoes([]);
    }
  };

  useEffect(() => {
    console.log('useEffect disparado com pedidoSelecionado:', pedidoSelecionado);
    fetchHistorico();
  }, [pedidoSelecionado]);

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Adicionar Observação</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="observacao">Observação</label>
            <textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows="4"
              placeholder="Digite sua observação aqui"
            />
          </div>
          <div>
            <h3>Histórico de Observações</h3>
            {historicoObservacoes.length > 0 ? (
              <table className="tabela-historico">
                <thead>
                  <tr>
                    <th>Edição</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoObservacoes.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.observacao || 'N/A'}</td>
                      <td>{entry.dataedicao ? formatarDataHora(entry.dataedicao) : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Nenhuma observação registrada.</p>
            )}
          </div>
          <div className="modal-buttons">
            <button type="submit">Enviar</button>
            <button
              type="button"
              onClick={() => {
                setObservacao('');
                setMostrarModal(false);
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalObservacao;