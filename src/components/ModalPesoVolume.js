import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
  const [pedidoCompleto, setPedidoCompleto] = useState(false);

  const formatDateToLocalISO = (date, context = 'unknown') => {
    const d = date ? new Date(date) : new Date();
    if (isNaN(d.getTime()) || (typeof date === 'string' && date.includes('undefined'))) {
      console.warn(`[formatDateToLocalISO - ${context}] Data inválida detectada, usando data atual:`, date);
      return new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 19);
    }
    const isoString = d.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 19);
    console.log(`[formatDateToLocalISO - ${context}] Data formatada: ${isoString}`);
    return isoString;
  };

  const verificarPedidoCompleto = (novasQuantidadesEntregues) => {
    return pedidoParaConcluir?.itens.every((item, index) => {
      const novaQuantidadeEntregue = (item.quantidadeEntregue || 0) + (parseInt(novasQuantidadesEntregues[index], 10) || 0);
      return novaQuantidadeEntregue >= (item.quantidadePedido || 0);
    });
  };

  useEffect(() => {
    if (pedidoParaConcluir?.itemParaEditar) {
      const completo = verificarPedidoCompleto(quantidadesParaAdicionar);
      setPedidoCompleto(completo);
    }
  }, [quantidadesParaAdicionar, pedidoParaConcluir]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const novasQuantidadesEntregues = pedidoParaConcluir.itens.map((item, index) => {
      const quantidadeAdicionadaInput = quantidadesParaAdicionar[index];
      const quantidadeAdicionada = quantidadeAdicionadaInput === '' 
        ? (item.quantidadePedido || 0) - (item.quantidadeEntregue || 0)
        : parseInt(quantidadeAdicionadaInput, 10) || 0;
      return (item.quantidadeEntregue || 0) + quantidadeAdicionada;
    });

    const algumaQuantidadePreenchida = quantidadesParaAdicionar.some(q => q !== '');
    const pedidoEstaCompleto = pedidoParaConcluir?.itemParaEditar ? verificarPedidoCompleto(quantidadesParaAdicionar) : true;

    if ((pedidoEstaCompleto || algumaQuantidadePreenchida) && (!peso || !volume)) {
      alert('Por favor, preencha os campos de peso e volume para prosseguir.');
      return;
    }

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
          tempo: pedidoParaConcluir.tempo, // Preserva o tempo de "Em Andamento"
        };

        console.log('Enviando pedido concluído:', pedidoConcluido);

        const resposta = await axios.put(`http://localhost:5000/pedidos/${pedidoParaConcluir.id}`, pedidoConcluido);
        await axios.post('http://localhost:5000/enviar-email', { pedido: resposta.data, observacao: '' });
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

        console.log('Enviando pedido atualizado:', pedidoAtualizado);

        const resposta = await axios.put(`http://localhost:5000/pedidos/${pedidoParaConcluir.id}`, pedidoAtualizado);
        await axios.post('http://localhost:5000/enviar-email', { pedido: resposta.data, observacao: '' });
        setPedidos((prev) => prev.map((p) => (p.id === pedidoAtualizado.id ? resposta.data : p)));
        setMensagem('Quantidades entregues atualizadas e e-mail enviado!');
      }

      setPeso('');
      setVolume('');
      setMostrarModalPesoVolume(false);
      setPedidoParaConcluir(null);
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

  return (
    <div className="modal">
      <div className="modal-content">
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

export default ModalPesoVolume;