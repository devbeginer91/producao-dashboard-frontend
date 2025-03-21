import React, { useState, useEffect } from 'react';
import api from '../api';
import './ModalObservacao.css';

const ModalObservacao = ({
  pedidoSelecionado,
  observacao,
  setObservacao,
  setMostrarModal,
  setMensagem,
}) => {
  const [historicoObservacoes, setHistoricoObservacoes] = useState([]);
  const [editandoObservacao, setEditandoObservacao] = useState(null);
  const [novaObservacao, setNovaObservacao] = useState(observacao || '');

  // Função para formatar a data com segurança
  const formatarData = (data) => {
    if (!data || isNaN(new Date(data).getTime())) {
      return 'Data inválida';
    }
    return new Date(data).toLocaleString('pt-BR');
  };

  // Carregar o histórico de observações ao abrir o modal
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

  const handleSalvarObservacao = async () => {
    if (!novaObservacao.trim()) {
      setMensagem('A observação não pode estar vazia.');
      return;
    }

    try {
      if (editandoObservacao) {
        const response = await api.put(`/historico-observacoes/${editandoObservacao.id}`, {
          observacao: novaObservacao
        });
        if (!response.data) throw new Error('Erro ao editar observação');
        const updatedObservacao = response.data;
        setHistoricoObservacoes(prev => 
          prev.map(obs => (obs.id === updatedObservacao.id ? updatedObservacao : obs))
        );
        setMensagem('Observação editada com sucesso.');
        setEditandoObservacao(null);
      } else {
        const response = await api.post('/enviar-email', {
          pedido: pedidoSelecionado,
          observacao: novaObservacao
        });
        if (!response.data) throw new Error('Erro ao enviar observação');
        setMensagem('E-mail com observação enviado com sucesso!');
        await fetchHistorico(); // Atualiza o histórico após enviar
      }
      setNovaObservacao('');
    } catch (error) {
      setMensagem('Erro: ' + (error.response?.data.message || error.message));
    }
  };

  const handleEditarObservacao = (obs) => {
    setEditandoObservacao(obs);
    setNovaObservacao(obs.observacao);
  };

  const handleExcluirObservacao = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta observação?')) return;

    try {
      await api.delete(`/historico-observacoes/${id}`);
      setHistoricoObservacoes(prev => prev.filter(obs => obs.id !== id));
      setMensagem('Observação excluída com sucesso.');
    } catch (error) {
      setMensagem('Erro ao excluir observação: ' + (error.response?.data.message || error.message));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Observações do Pedido {pedidoSelecionado.numeroOS}</h2>

        <div className="historico-observacoes">
          <h3>Histórico de Observações</h3>
          {historicoObservacoes.length > 0 ? (
            <ul>
              {historicoObservacoes.map(obs => (
                <li key={obs.id}>
                  <p><strong>{formatarData(obs.dataEdicao)}:</strong> {obs.observacao}</p>
                  <button onClick={() => handleEditarObservacao(obs)}>Editar</button>
                  <button onClick={() => handleExcluirObservacao(obs.id)}>Excluir</button>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhuma observação registrada.</p>
          )}
        </div>

        <div className="nova-observacao">
          <h3>{editandoObservacao ? 'Editar Observação' : 'Adicionar Observação'}</h3>
          <textarea
            value={novaObservacao}
            onChange={(e) => setNovaObservacao(e.target.value)}
            placeholder="Digite sua observação aqui..."
            rows="4"
            cols="50"
          />
          <button onClick={handleSalvarObservacao}>
            {editandoObservacao ? 'Salvar Edição' : 'Adicionar Observação'}
          </button>
        </div>

        <button onClick={() => { setMostrarModal(false); setEditandoObservacao(null); setNovaObservacao(''); }}>
          Fechar
        </button>
      </div>
    </div>
  );
};

export default ModalObservacao;