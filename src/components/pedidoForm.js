import React, { useEffect } from 'react';
import api from '../api';

const PedidoForm = ({
  novoPedido,
  setNovoPedido,
  pedidoParaEditar,
  setPedidoParaEditar,
  setMostrarFormulario,
  setMensagem,
  carregarPedidos,
  setPedidos,
  setPedidosAndamento,
  setPedidosConcluidos,
  setMostrarModalPesoVolume,
  setPedidoParaConcluir,
  moverParaAndamento,
  formatDateToLocalISO,
}) => {
  useEffect(() => {
    if (pedidoParaEditar) {
      console.log('Carregando pedido para edição:', pedidoParaEditar);
      setNovoPedido({
        ...pedidoParaEditar,
        itens: pedidoParaEditar.itens && pedidoParaEditar.itens.length > 0
          ? pedidoParaEditar.itens.map(item => ({
              ...item,
              quantidadePedido: item.quantidadePedido ? item.quantidadePedido.toString() : '',
              quantidadeEntregue: item.quantidadeEntregue ? item.quantidadeEntregue.toString() : '0',
            }))
          : [{ codigoDesenho: '', quantidadePedido: '' }],
      });
    }
  }, [pedidoParaEditar, setNovoPedido]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNovoPedido((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const novosItens = [...novoPedido.itens];
    novosItens[index] = {
      ...novosItens[index],
      [name]: value,
    };
    console.log(`Atualizando item ${index}:`, novosItens[index]); // Log para depuração
    setNovoPedido((prev) => ({
      ...prev,
      itens: novosItens,
    }));
  };

  const adicionarItem = () => {
    setNovoPedido((prev) => ({
      ...prev,
      itens: [...prev.itens, { codigoDesenho: '', quantidadePedido: '' }],
    }));
  };

  const removerItem = (index) => {
    if (novoPedido.itens.length === 1) {
      setMensagem('O pedido deve ter pelo menos um item.');
      return;
    }
    const novosItens = novoPedido.itens.filter((_, i) => i !== index);
    setNovoPedido((prev) => ({
      ...prev,
      itens: novosItens,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!novoPedido.empresa || !novoPedido.numeroOS || !novoPedido.dataEntrada || !novoPedido.previsaoEntrega) {
      setMensagem('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const itensValidos = novoPedido.itens.every(
      (item) => item.codigoDesenho && item.quantidadePedido && parseInt(item.quantidadePedido, 10) > 0
    );

    if (!itensValidos) {
      setMensagem('Todos os itens devem ter código e quantidade válida (maior que 0).');
      return;
    }

    const pedidoFormatado = {
      ...novoPedido,
      inicio: formatDateToLocalISO(novoPedido.inicio || new Date(), 'handleSubmit - inicio'),
      itens: novoPedido.itens.map((item) => ({
        ...item,
        quantidadePedido: parseInt(item.quantidadePedido, 10), // Converte para número
        quantidadeEntregue: parseInt(item.quantidadeEntregue || 0, 10), // Converte para número
      })),
    };

    console.log('Enviando pedido formatado:', pedidoFormatado); // Log para depuração

    try {
      if (pedidoParaEditar) {
        const resposta = await api.put(`/pedidos/${pedidoParaEditar.id}`, pedidoFormatado);
        await api.post('/enviar-email', { pedido: resposta.data, observacao: '' });
        setMensagem('Pedido atualizado e e-mail enviado!');
        setPedidos((prev) => prev.map((p) => (p.id === pedidoParaEditar.id ? resposta.data : p)));
        setPedidosAndamento((prev) => prev.map((p) => (p.id === pedidoParaEditar.id ? resposta.data : p)));
        setPedidosConcluidos((prev) => prev.map((p) => (p.id === pedidoParaEditar.id ? resposta.data : p)));
      } else {
        const resposta = await api.post('/pedidos', pedidoFormatado);
        setMensagem('Pedido adicionado com sucesso!');
        setPedidosAndamento((prev) => [...prev, resposta.data]);
      }

      setNovoPedido({
        empresa: '',
        numeroOS: '',
        dataEntrada: '',
        previsaoEntrega: '',
        responsavel: '',
        status: 'novo',
        inicio: formatDateToLocalISO(new Date(), 'novoPedido reset'),
        itens: [{ codigoDesenho: '', quantidadePedido: '' }],
      });
      setPedidoParaEditar(null);
      setMostrarFormulario(false);
      carregarPedidos();
    } catch (error) {
      setMensagem('Erro ao processar pedido: ' + (error.response?.data.message || error.message));
      carregarPedidos();
    }
  };

  const handleAndamento = async () => {
    if (!pedidoParaEditar) {
      setMensagem('Nenhum pedido selecionado para mover.');
      return;
    }
    await moverParaAndamento(pedidoParaEditar.id);
    setMostrarFormulario(false);
    setNovoPedido({
      empresa: '',
      numeroOS: '',
      dataEntrada: '',
      previsaoEntrega: '',
      responsavel: '',
      status: 'novo',
      inicio: formatDateToLocalISO(new Date(), 'novoPedido reset'),
      itens: [{ codigoDesenho: '', quantidadePedido: '' }],
    });
    setPedidoParaEditar(null);
  };

  const handleConcluir = () => {
    if (!pedidoParaEditar) {
      setMensagem('Nenhum pedido selecionado para concluir.');
      return;
    }
    const pedidoParaConcluirAtualizado = {
      ...pedidoParaEditar,
      inicio: formatDateToLocalISO(pedidoParaEditar.inicio || new Date(), 'handleConcluir - inicio'),
    };
    setPedidoParaConcluir(pedidoParaConcluirAtualizado);
    setMostrarModalPesoVolume(true);
    setMostrarFormulario(false);
    setNovoPedido({
      empresa: '',
      numeroOS: '',
      dataEntrada: '',
      previsaoEntrega: '',
      responsavel: '',
      status: 'novo',
      inicio: formatDateToLocalISO(new Date(), 'novoPedido reset'),
      itens: [{ codigoDesenho: '', quantidadePedido: '' }],
    });
    setPedidoParaEditar(null);
  };

  return (
    <form onSubmit={handleSubmit} className={`formulario ${!mostrarFormulario ? 'hidden' : ''}`}>
      <div>
        <label htmlFor="empresa">Empresa *</label>
        <input
          type="text"
          id="empresa"
          name="empresa"
          value={novoPedido.empresa}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="numeroOS">Nº OS *</label>
        <input
          type="text"
          id="numeroOS"
          name="numeroOS"
          value={novoPedido.numeroOS}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="dataEntrada">Data Entrada *</label>
        <input
          type="date"
          id="dataEntrada"
          name="dataEntrada"
          value={novoPedido.dataEntrada}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="previsaoEntrega">Previsão Entrega *</label>
        <input
          type="date"
          id="previsaoEntrega"
          name="previsaoEntrega"
          value={novoPedido.previsaoEntrega}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="responsavel">Responsável</label>
        <input
          type="text"
          id="responsavel"
          name="responsavel"
          value={novoPedido.responsavel}
          onChange={handleChange}
        />
      </div>

      {novoPedido.itens.map((item, index) => (
        <div key={index} className="item-group">
          <div>
            <label htmlFor={`codigoDesenho-${index}`}>Código do Desenho *</label>
            <input
              type="text"
              id={`codigoDesenho-${index}`}
              name="codigoDesenho"
              value={item.codigoDesenho}
              onChange={(e) => handleItemChange(index, e)}
              required
            />
          </div>
          <div>
            <label htmlFor={`quantidadePedido-${index}`}>Quantidade Pedida *</label>
            <input
              type="number"
              id={`quantidadePedido-${index}`}
              name="quantidadePedido"
              value={item.quantidadePedido}
              onChange={(e) => handleItemChange(index, e)}
              min="1"
              required
            />
          </div>
          <button
            type="button"
            onClick={() => removerItem(index)}
            className="btn-excluir"
            style={{ marginTop: '24px' }}
          >
            Remover
          </button>
        </div>
      ))}

      <button type="button" onClick={adicionarItem} className="btn-adicionar-item">
        Adicionar Item
      </button>

      <div className="form-buttons">
        <button type="submit" className="btn-submit">
          {pedidoParaEditar ? 'Salvar' : 'Adicionar Pedido'}
        </button>
        {pedidoParaEditar && (
          <>
            <button type="button" onClick={handleAndamento} className="btn-mover">
              Mover para Andamento
            </button>
            <button type="button" onClick={handleConcluir} className="btn-concluir">
              Concluir Pedido
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setMostrarFormulario(false);
            setNovoPedido({
              empresa: '',
              numeroOS: '',
              dataEntrada: '',
              previsaoEntrega: '',
              responsavel: '',
              status: 'novo',
              inicio: formatDateToLocalISO(new Date(), 'novoPedido reset'),
              itens: [{ codigoDesenho: '', quantidadePedido: '' }],
            });
            setPedidoParaEditar(null);
          }}
          className="btn-cancelar"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default PedidoForm;