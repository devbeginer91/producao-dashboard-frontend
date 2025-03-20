import React from 'react';
import api from '../api';
import { formatDateToLocalISO } from '../App'; // Mantido como prop
import { formatarDataHora } from '../utils'; // Importando do utils.js

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
  formatDateToLocalISO, // Recebendo como prop
}) => {
  const handleSubmit = async (e) => {
    e.preventDefault();
    const camposObrigatorios = ['empresa', 'numeroOS', 'dataEntrada', 'previsaoEntrega'];
    const erros = camposObrigatorios.filter((campo) => !novoPedido[campo]);
    if (erros.length > 0 || !Array.isArray(novoPedido.itens) || !novoPedido.itens.length || novoPedido.itens.some(item => !item.codigoDesenho || !item.quantidadePedido)) {
      setMensagem('Preencha todos os campos obrigatórios e adicione ao menos um item com código e quantidade.');
      return;
    }

    const dataEntrada = new Date(novoPedido.dataEntrada);
    const previsaoEntrega = new Date(novoPedido.previsaoEntrega);
    if (isNaN(dataEntrada.getTime()) || isNaN(previsaoEntrega.getTime())) {
      setMensagem('Datas inválidas.');
      return;
    }

    const inicioValido = formatDateToLocalISO(new Date(), 'handleSubmit');

    const pedidoParaEnviar = {
      ...novoPedido,
      inicio: inicioValido,
      tempo: novoPedido.status === 'novo' ? 0 : novoPedido.tempo || 0,
      status: novoPedido.status, // Permite qualquer status
      itens: novoPedido.itens.map(item => ({
        codigoDesenho: item.codigoDesenho,
        quantidadePedido: parseInt(item.quantidadePedido, 10) || 0,
        quantidadeEntregue: parseInt(item.quantidadeEntregue || 0, 10),
      })),
    };

    console.log('Dados enviados ao backend:', pedidoParaEnviar);

    try {
      let resposta;
      if (pedidoParaEditar) {
        if (novoPedido.status === 'andamento' && pedidoParaEditar.status !== 'andamento') {
          setPedidoParaConcluir(pedidoParaEnviar);
          setMostrarModalPesoVolume(true);
          setMensagem('Preencha peso e volume para mover para "Em Andamento".');
          resetForm();
          return;
        } else if (novoPedido.status === 'concluido' && pedidoParaEditar.status !== 'concluido') {
          setPedidoParaConcluir(pedidoParaEnviar);
          setMostrarModalPesoVolume(true);
          setMensagem('Preencha peso e volume para concluir o pedido.');
          resetForm();
          return;
        }
        resposta = await api.put(`/pedidos/${pedidoParaEditar.id}`, pedidoParaEnviar);
        await api.post('/enviar-email', { pedido: resposta.data, observacao: '' });
        atualizarListas(resposta.data);
        setMensagem('Pedido atualizado e e-mail enviado!');
      } else {
        resposta = await api.post('/pedidos', pedidoParaEnviar);
        await api.post('/enviar-email', { pedido: resposta.data, observacao: '' });
        if (resposta.data.status === 'novo') {
          setPedidosAndamento((prev) => [...prev, resposta.data]);
          setMensagem('Pedido adicionado como "Novo" e e-mail enviado!');
        } else if (resposta.data.status === 'andamento') {
          setPedidos((prev) => [...prev, resposta.data]);
          setMostrarModalPesoVolume(true);
          setPedidoParaConcluir(resposta.data);
          setMensagem('Preencha peso e volume para "Em Andamento".');
        } else if (resposta.data.status === 'concluido') {
          setPedidosConcluidos((prev) => [...prev, resposta.data]);
          setMostrarModalPesoVolume(true);
          setPedidoParaConcluir(resposta.data);
          setMensagem('Preencha peso e volume para concluir.');
        }
      }
      resetForm();
    } catch (error) {
      setMensagem('Erro ao processar pedido: ' + (error.response?.data.message || error.message));
      await carregarPedidos();
    }
  };

  const atualizarListas = (pedido) => {
    if (pedido.status === 'novo') {
      setPedidosAndamento((prev) => [...prev.filter((p) => p.id !== pedido.id), pedido]);
      setPedidos((prev) => prev.filter((p) => p.id !== pedido.id));
      setPedidosConcluidos((prev) => prev.filter((p) => p.id !== pedido.id));
    } else if (pedido.status === 'andamento') {
      setPedidos((prev) => [...prev.filter((p) => p.id !== pedido.id), pedido]);
      setPedidosAndamento((prev) => prev.filter((p) => p.id !== pedido.id));
      setPedidosConcluidos((prev) => prev.filter((p) => p.id !== pedido.id));
    } else if (pedido.status === 'concluido') {
      setPedidosConcluidos((prev) => [...prev.filter((p) => p.id !== pedido.id), pedido]);
      setPedidos((prev) => prev.filter((p) => p.id !== pedido.id));
      setPedidosAndamento((prev) => prev.filter((p) => p.id !== pedido.id));
    }
  };

  const resetForm = () => {
    const novoInicio = formatDateToLocalISO(new Date(), 'resetForm');
    setNovoPedido({
      empresa: '',
      numeroOS: '',
      dataEntrada: '',
      previsaoEntrega: '',
      responsavel: '',
      status: 'novo',
      inicio: novoInicio,
      tempo: 0,
      peso: null,
      volume: null,
      dataConclusao: null,
      pausado: '0', // Alterado de 0 para '0' para consistência com o backend
      tempoPausado: 0,
      dataPausada: null,
      itens: [{ codigoDesenho: '', quantidadePedido: '' }],
    });
    setMostrarFormulario(false);
    setPedidoParaEditar(null);
  };

  const adicionarItem = () => {
    setNovoPedido({
      ...novoPedido,
      itens: Array.isArray(novoPedido.itens) ? [...novoPedido.itens, { codigoDesenho: '', quantidadePedido: '' }] : [{ codigoDesenho: '', quantidadePedido: '' }],
    });
  };

  const removerItem = (index) => {
    setNovoPedido({
      ...novoPedido,
      itens: Array.isArray(novoPedido.itens) ? novoPedido.itens.filter((_, i) => i !== index) : [{ codigoDesenho: '', quantidadePedido: '' }],
    });
  };

  const atualizarItem = (index, campo, valor) => {
    const itensAtuais = Array.isArray(novoPedido.itens) ? [...novoPedido.itens] : [{ codigoDesenho: '', quantidadePedido: '' }];
    itensAtuais[index] = { ...itensAtuais[index], [campo]: valor };
    setNovoPedido({ ...novoPedido, itens: itensAtuais });
  };

  const itens = Array.isArray(novoPedido.itens) ? novoPedido.itens : [{ codigoDesenho: '', quantidadePedido: '' }];

  return (
    <form onSubmit={handleSubmit} className="formulario">
      <div>
        <label htmlFor="empresa">Empresa *</label>
        <input
          type="text"
          id="empresa"
          value={novoPedido.empresa}
          onChange={(e) => setNovoPedido({ ...novoPedido, empresa: e.target.value })}
          required
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
      </div>
      <div>
        <label htmlFor="numeroOS">Número da OS *</label>
        <input
          type="text"
          id="numeroOS"
          value={novoPedido.numeroOS}
          onChange={(e) => setNovoPedido({ ...novoPedido, numeroOS: e.target.value })}
          required
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
      </div>
      <div>
        <label htmlFor="dataEntrada">Data de Entrada *</label>
        <input
          type="date"
          id="dataEntrada"
          value={novoPedido.dataEntrada}
          onChange={(e) => setNovoPedido({ ...novoPedido, dataEntrada: e.target.value })}
          required
        />
      </div>
      <div>
        <label htmlFor="previsaoEntrega">Previsão de Entrega *</label>
        <input
          type="date"
          id="previsaoEntrega"
          value={novoPedido.previsaoEntrega}
          onChange={(e) => setNovoPedido({ ...novoPedido, previsaoEntrega: e.target.value })}
          required
        />
      </div>
      <div>
        <label htmlFor="responsavel">Responsável</label>
        <input
          type="text"
          id="responsavel"
          value={novoPedido.responsavel}
          onChange={(e) => setNovoPedido({ ...novoPedido, responsavel: e.target.value })}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
      </div>
      <div>
        <label htmlFor="status">Status</label>
        <select
          id="status"
          value={novoPedido.status}
          onChange={(e) => {
            const novoStatus = e.target.value;
            setNovoPedido({ ...novoPedido, status: novoStatus });
            if (pedidoParaEditar && moverParaAndamento && novoStatus === 'andamento') {
              moverParaAndamento(pedidoParaEditar.id);
            }
          }}
        >
          <option value="novo">Novo</option>
          <option value="andamento">Em Andamento</option>
          <option value="concluido">Concluído</option>
        </select>
      </div>

      <h3>Itens do Pedido</h3>
      {itens.map((item, index) => (
        <div key={index} className="item-group">
          <div>
            <label htmlFor={`codigoDesenho-${index}`}>Código do Desenho *</label>
            <input
              type="text"
              id={`codigoDesenho-${index}`}
              value={item.codigoDesenho}
              onChange={(e) => atualizarItem(index, 'codigoDesenho', e.target.value)}
              required
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
          </div>
          <div>
            <label htmlFor={`quantidadePedido-${index}`}>Quantidade Pedida *</label>
            <input
              type="number"
              id={`quantidadePedido-${index}`}
              value={item.quantidadePedido}
              onChange={(e) => atualizarItem(index, 'quantidadePedido', e.target.value)}
              min="0"
              required
            />
          </div>
          {itens.length > 1 && (
            <button type="button" onClick={() => removerItem(index)}>Remover</button>
          )}
        </div>
      ))}
      <div className="form-buttons">
        <button type="button" onClick={adicionarItem} className="btn-adicionar-item">Adicionar Item</button>
        <button type="submit" className="btn-submit">{pedidoParaEditar ? 'Salvar | QTD a Entregar' : 'Adicionar Pedido'}</button>
        <button type="button" onClick={resetForm} className="btn-cancelar">Cancelar</button>
      </div>
    </form>
  );
};

export default PedidoForm;