import React, { useState, useEffect } from 'react';
import api from '../api';
import { formatarDataHora } from '../utils';
import './ModalPesoVolume.css';

const ModalPesoVolume = ({
  pedidoParaConcluir,
  peso,
  setPeso,
  volume,
  setVolume,
  setMostrarModalPesoVolume,
  setPedidoParaConcluir,
  setPedidos,
  setPedidosConcluidos,
  setMensagem,
  carregarPedidos,
}) => {
  const [quantidadesParaAdicionar, setQuantidadesParaAdicionar] = useState(
    pedidoParaConcluir?.itens.map(() => '') || []
  );
  const [historicoEntregas, setHistoricoEntregas] = useState([]);
  const [pedidoCompleto, setPedidoCompleto] = useState(false);
  const [editandoEntrega, setEditandoEntrega] = useState(null);
  const [novaQuantidadeEntregue, setNovaQuantidadeEntregue] = useState('');

  const formatDateToLocalISO = (date, context = 'unknown') => {
    const d = date ? new Date(date) : new Date();
    if (isNaN(d.getTime()) || (typeof date === 'string' && date.includes('undefined'))) {
      return new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 19);
    }
    return d.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 19);
  };

  const verificarPedidoCompleto = (novasQuantidadesEntregues) => {
    return pedidoParaConcluir?.itens.every((item, index) => {
      const novaQuantidadeEntregue = (item.quantidadeEntregue || 0) + (parseInt(novasQuantidadesEntregues[index], 10) || 0);
      return novaQuantidadeEntregue >= (item.quantidadePedido || 0);
    });
  };

  const fetchHistorico = async () => {
    if (!pedidoParaConcluir?.id) {
      setHistoricoEntregas([]);
      return;
    }
  
    try {
      const response = await api.get(`/historico-entregas/${pedidoParaConcluir.id}`);
      const historico = Array.isArray(response.data) ? response.data.map(item => ({
        ...item,
        codigoDesenho: item.codigodesenho || item.codigoDesenho || 'Desconhecido',
        quantidadeEntregue: item.quantidadeentregue || item.quantidadeEntregue || 0,
        dataEdicao: item.dataedicao || item.dataEdicao,
      })) : [];
      console.log(`fetchHistorico - Dados normalizados para pedido ${pedidoParaConcluir.id}:`, historico);
      if (historico.length > 0) {
        historico.sort((a, b) => new Date(a.dataEdicao) - new Date(b.dataEdicao));
        setHistoricoEntregas(historico);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      setMensagem('Erro ao carregar histórico: ' + (error.response?.data.message || error.message));
    }
  };

  useEffect(() => {
    fetchHistorico();
    if (pedidoParaConcluir?.itemParaEditar) {
      const completo = verificarPedidoCompleto(quantidadesParaAdicionar);
      setPedidoCompleto(completo);
    }
  }, [pedidoParaConcluir]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const novasQuantidadesEntregues = pedidoParaConcluir.itens.map((item, index) => {
      const quantidadeAdicionadaInput = quantidadesParaAdicionar[index];
      const quantidadeAdicionada = quantidadeAdicionadaInput === '' ? 0 : parseInt(quantidadeAdicionadaInput, 10) || 0;
      return (item.quantidadeEntregue || 0) + quantidadeAdicionada;
    });

    const mudouAlgo = novasQuantidadesEntregues.some((qtd, index) => qtd !== (pedidoParaConcluir.itens[index].quantidadeEntregue || 0));
    if (!mudouAlgo) {
      setMostrarModalPesoVolume(false);
      setPedidoParaConcluir(null);
      return;
    }

    const algumaQuantidadePreenchida = quantidadesParaAdicionar.some(q => q !== '');
    const pedidoEstaCompleto = pedidoParaConcluir?.itemParaEditar ? verificarPedidoCompleto(quantidadesParaAdicionar) : true;

    if ((pedidoEstaCompleto || algumaQuantidadePreenchida) && (!peso || !volume)) {
      alert('Por favor, preencha os campos de peso e volume antes de prosseguir.');
      return;
    }

    const quantidadesEditadas = pedidoParaConcluir.itens
      .map((item, index) => {
        const quantidadeAdicionada = quantidadesParaAdicionar[index] !== '' ? parseInt(quantidadesParaAdicionar[index], 10) || 0 : 0;
        if (quantidadeAdicionada > 0) {
          return {
            codigoDesenho: item.codigoDesenho,
            quantidade: quantidadeAdicionada,
          };
        }
        return null;
      })
      .filter(edit => edit !== null);

    try {
      const inicioValido = formatDateToLocalISO(pedidoParaConcluir.inicio || new Date(), 'handleSubmit - inicio');
      const novosItens = pedidoParaConcluir.itens.map((item, index) => ({
        ...item,
        quantidadeEntregue: novasQuantidadesEntregues[index],
      }));

      if (pedidoEstaCompleto) {
        const dataConclusao = formatDateToLocalISO(new Date(), 'handleSubmit - conclusao');
        const pedidoConcluido = {
          ...pedidoParaConcluir,
          itens: novosItens,
          status: 'concluido',
          inicio: inicioValido,
          peso: parseFloat(peso),
          volume: parseFloat(volume),
          dataConclusao,
          tempo: pedidoParaConcluir.tempo,
        };

        const resposta = await api.put(`/pedidos/${pedidoParaConcluir.id}`, pedidoConcluido);
        await api.post('/enviar-email', { 
          pedido: resposta.data, 
          observacao: '', 
          quantidadesEditadas 
        });
        window.recentlyUpdatedPedidos = window.recentlyUpdatedPedidos || new Map();
        window.recentlyUpdatedPedidos.set(pedidoConcluido.id, resposta.data);
        setPedidos((prev) => prev.filter((p) => p.id !== pedidoConcluido.id));
        setPedidosConcluidos((prev) => [...prev, resposta.data]);
        setMensagem('Pedido concluído e e-mail enviado!');
      } else {
        const pedidoAtualizado = {
          ...pedidoParaConcluir,
          itens: novosItens,
          inicio: inicioValido,
          peso: peso ? parseFloat(peso) : null,
          volume: volume ? parseFloat(volume) : null,
        };

        const resposta = await api.put(`/pedidos/${pedidoParaConcluir.id}`, pedidoAtualizado);
        await api.post('/enviar-email', { 
          pedido: resposta.data, 
          observacao: '', 
          quantidadesEditadas 
        });
        window.recentlyUpdatedPedidos = window.recentlyUpdatedPedidos || new Map();
        window.recentlyUpdatedPedidos.set(pedidoAtualizado.id, resposta.data);
        setPedidos((prev) => prev.map((p) => (p.id === pedidoAtualizado.id ? resposta.data : p)));
        setMensagem('Quantidades entregues atualizadas e e-mail enviado!');
      }

      setPeso('');
      setVolume('');
      setMostrarModalPesoVolume(false);
      setPedidoParaConcluir(null);
      await fetchHistorico();
      await carregarPedidos();
    } catch (error) {
      setMensagem('Erro ao processar: ' + (error.response?.data.message || error.message));
      await carregarPedidos();
    }
  };

  const handleQuantidadeChange = (index, value) => {
    const novasQuantidades = [...quantidadesParaAdicionar];
    const maxPermitido = (pedidoParaConcluir.itens[index].quantidadePedido || 0) - (pedidoParaConcluir.itens[index].quantidadeEntregue || 0);
    const quantidadeAdicionada = value === '' ? '' : Math.min(parseInt(value, 10) || 0, maxPermitido);
    novasQuantidades[index] = quantidadeAdicionada >= 0 || quantidadeAdicionada === '' ? quantidadeAdicionada : 0;
    setQuantidadesParaAdicionar(novasQuantidades);
  };

  const handleEditarEntrega = (entrega) => {
    setEditandoEntrega(entrega);
    setNovaQuantidadeEntregue(entrega.quantidadeEntregue.toString());
  };

  const handleSalvarEntrega = async () => {
    if (!novaQuantidadeEntregue || isNaN(novaQuantidadeEntregue) || novaQuantidadeEntregue < 0) {
      setMensagem('Quantidade entregue deve ser um número não negativo.');
      return;
    }
  
    try {
      const response = await api.put(`/historico-entregas/${editandoEntrega.id}`, {
        quantidadeEntregue: parseInt(novaQuantidadeEntregue, 10)
      });
      if (!response.data) throw new Error('Erro ao editar entrega');
      const updatedEntrega = {
        ...response.data,
        codigoDesenho: response.data.codigodesenho || response.data.codigoDesenho || 'Desconhecido',
        quantidadeEntregue: response.data.quantidadeentregue || response.data.quantidadeEntregue || 0,
        dataEdicao: response.data.dataedicao || response.data.dataEdicao,
      };
      console.log(`handleSalvarEntrega - Dados normalizados após edição (ID ${editandoEntrega.id}):`, updatedEntrega);
      setHistoricoEntregas(prev =>
        prev.map(ent => (ent.id === updatedEntrega.id ? updatedEntrega : ent))
      );
      console.log(`handleSalvarEntrega - Estado historicoEntregas após atualização:`, historicoEntregas);
      setMensagem('Entrega editada com sucesso.');
      setEditandoEntrega(null);
      setNovaQuantidadeEntregue('');
      await carregarPedidos();
      await fetchHistorico();
    } catch (error) {
      console.error('Erro ao editar entrega:', error);
      setMensagem('Erro ao editar entrega: ' + (error.response?.data.message || error.message));
    }
  };

  const handleExcluirEntrega = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta entrada de entrega?')) return;

    try {
      await api.delete(`/historico-entregas/${id}`);
      setHistoricoEntregas(prev => prev.filter(ent => ent.id !== id));
      setMensagem('Entrada de entrega excluída com sucesso.');
      await carregarPedidos();
      await fetchHistorico();
    } catch (error) {
      setMensagem('Erro ao excluir entrega: ' + (error.response?.data.message || error.message));
    }
  };

  return (
    <div className="modal">
      <div className="modal-content" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <h2>{pedidoParaConcluir?.itemParaEditar ? 'Quantidade a Entregar' : 'Concluir Pedido'}</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <h3>Itens do Pedido</h3>
            {Array.isArray(pedidoParaConcluir?.itens) && pedidoParaConcluir.itens.length > 0 ? (
              <div className="itens-list">
                {pedidoParaConcluir.itens.map((item, index) => {
                  const quantidadeRestante = (item.quantidadePedido || 0) - (item.quantidadeEntregue || 0);
                  return (
                    <div key={index} className="item-row">
                      <div className="item-info">
                        <span><strong>Código:</strong> {item.codigoDesenho}</span>
                        <span><strong>Qtd Pedida:</strong> {item.quantidadePedido}</span>
                        <span><strong>Qtd Entregue:</strong> {item.quantidadeEntregue || 0}</span>
                        <span><strong>A Entregar:</strong> {quantidadeRestante - (parseInt(quantidadesParaAdicionar[index], 10) || 0)}</span>
                      </div>
                      <div className="quantidade-entregue">
                        <label htmlFor={`quantidadeEntregue-${index}`}>Adicionar Qtd Entregue:</label>
                        <input
                          type="number"
                          id={`quantidadeEntregue-${index}`}
                          value={quantidadesParaAdicionar[index]}
                          onChange={(e) => handleQuantidadeChange(index, e.target.value)}
                          min="0"
                          max={quantidadeRestante}
                          disabled={quantidadeRestante <= 0}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p>Sem itens para exibir.</p>
            )}
          </div>

          <div className="historico-entregas">
            <h3>Histórico de Entregas</h3>
            {historicoEntregas.length > 0 ? (
              <table className="tabela-historico">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qtd Adicionada</th>
                    <th>Data</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoEntregas.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.codigoDesenho || 'Desconhecido'}</td>
                      <td>{entry.quantidadeEntregue || 'N/A'}</td>
                      <td>{entry.dataEdicao ? formatarDataHora(entry.dataEdicao) : 'N/A'}</td>
                      <td>
                        <button type="button" onClick={() => handleEditarEntrega(entry)}>Editar</button>
                        <button type="button" onClick={() => handleExcluirEntrega(entry.id)}>Excluir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Nenhuma entrega registrada.</p>
            )}
          </div>

          {editandoEntrega ? (
            <div className="editar-entrega">
              <h3>Editar Quantidade Entregue</h3>
              <input
                type="number"
                value={novaQuantidadeEntregue}
                onChange={(e) => setNovaQuantidadeEntregue(e.target.value)}
                placeholder="Nova quantidade entregue"
                min="0"
              />
              <button type="button" onClick={handleSalvarEntrega}>Salvar</button>
              <button type="button" onClick={() => { setEditandoEntrega(null); setNovaQuantidadeEntregue(''); }}>
                Cancelar
              </button>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="peso">Peso (kg) {pedidoCompleto || !pedidoParaConcluir?.itemParaEditar ? '*' : ''}</label>
                <input
                  type="number"
                  id="peso"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  min="0"
                  step="0.01"
                  required={pedidoCompleto || !pedidoParaConcluir?.itemParaEditar}
                />
              </div>
              <div>
                <label htmlFor="volume">Volume (m³) {pedidoCompleto || !pedidoParaConcluir?.itemParaEditar ? '*' : ''}</label>
                <input
                  type="number"
                  id="volume"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  min="0"
                  step="0.01"
                  required={pedidoCompleto || !pedidoParaConcluir?.itemParaEditar}
                />
              </div>
              <div className="modal-buttons">
                <button type="submit">Concluir</button>
                <button
                  type="button"
                  onClick={() => {
                    setPeso('');
                    setVolume('');
                    setMostrarModalPesoVolume(false);
                    setPedidoParaConcluir(null);
                    setEditandoEntrega(null);
                    setNovaQuantidadeEntregue('');
                  }}
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default ModalPesoVolume;