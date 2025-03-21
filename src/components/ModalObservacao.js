import React, { useState, useEffect } from 'react';
import './ModalObservacao.css';

const ModalObservacao = ({ pedidoSelecionado, observacao, setObservacao, setMostrarModal, setMensagem }) => {
  const [historicoObservacoes, setHistoricoObservacoes] = useState([]);
  const [editandoObservacao, setEditandoObservacao] = useState(null);
  const [novaObservacao, setNovaObservacao] = useState(observacao || '');

  // Carregar o histórico de observações ao abrir o modal
  useEffect(() => {
    const fetchHistorico = async () => {
      try {
        const observacoesResponse = await fetch(`/historico-observacoes/${pedidoSelecionado.id}`);
        const observacoesData = await observacoesResponse.json();
        setHistoricoObservacoes(observacoesData);
      } catch (error) {
        console.error('Erro ao carregar histórico de observações:', error);
        setMensagem('Erro ao carregar histórico de observações: ' + error.message);
      }
    };
    fetchHistorico();
  }, [pedidoSelecionado, setMensagem]);

  const handleSalvarObservacao = async () => {
    if (!novaObservacao.trim()) {
      setMensagem('A observação não pode estar vazia.');
      return;
    }

    try {
      if (editandoObservacao) {
        const response = await fetch(`/historico-observacoes/${editandoObservacao.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ observacao: novaObservacao })
        });
        if (!response.ok) throw new Error('Erro ao editar observação');
        const updatedObservacao = await response.json();
        setHistoricoObservacoes(prev => 
          prev.map(obs => (obs.id === updatedObservacao.id ? updatedObservacao : obs))
        );
        setMensagem('Observação editada com sucesso.');
        setEditandoObservacao(null);
      } else {
        const response = await fetch('/enviar-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pedido: pedidoSelecionado, observacao: novaObservacao })
        });
        if (!response.ok) throw new Error('Erro ao enviar observação');
        const data = await response.json();
        setMensagem(data.message);
        const historicoResponse = await fetch(`/historico-observacoes/${pedidoSelecionado.id}`);
        const updatedHistorico = await historicoResponse.json();
        setHistoricoObservacoes(updatedHistorico);
      }
      setNovaObservacao('');
    } catch (error) {
      setMensagem('Erro: ' + error.message);
    }
  };

  const handleEditarObservacao = (obs) => {
    setEditandoObservacao(obs);
    setNovaObservacao(obs.observacao);
  };

  const handleExcluirObservacao = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta observação?')) return;

    try {
      const response = await fetch(`/historico-observacoes/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Erro ao excluir observação');
      setHistoricoObservacoes(prev => prev.filter(obs => obs.id !== id));
      setMensagem('Observação excluída com sucesso.');
    } catch (error) {
      setMensagem('Erro ao excluir observação: ' + error.message);
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
                  <p><strong>{new Date(obs.dataEdicao).toLocaleString('pt-BR')}:</strong> {obs.observacao}</p>
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