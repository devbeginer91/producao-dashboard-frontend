import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import debounce from 'lodash/debounce';
import './App.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PedidoForm from './components/pedidoForm';
import PedidoTable from './components/PedidoTable';
import ModalObservacao from './components/ModalObservacao';
import ModalPesoVolume from './components/ModalPesoVolume';
import Busca from './components/Busca';
import Login from './components/Login';
import api from './api';
import { formatarDataHora } from './utils';

// Função para formatar datas no formato YYYY-MM-DD HH:MM:SS com fuso horário America/Sao_Paulo (UTC-3)
export const formatDateToLocalISO = (date, context = 'unknown') => {
  const d = date ? new Date(date) : new Date();
  if (isNaN(d.getTime()) || (typeof date === 'string' && date.includes('undefined'))) {
    console.warn(`[formatDateToLocalISO - ${context}] Data inválida detectada, usando data atual:`, date);
    return new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 19);
  }
  const isoString = d.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 19);
  console.log(`[formatDateToLocalISO - ${context}] Data capturada: ${d.toString()}, Data formatada: ${isoString}`);
  return isoString;
};

// Função para formatar data de YYYY-MM-DD para DD/MM/YYYY sem ajuste de fuso
const formatarDataSimples = (data) => {
  if (!data || typeof data !== 'string') return 'Não informado';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
};

// Função para formatar o tempo
const formatarTempo = (tempo) => {
  if (isNaN(tempo) || tempo < 0) return '0 minutos';
  const minutosTotais = Math.round(tempo);
  const horas = Math.floor(minutosTotais / 60);
  const minutosRestantes = minutosTotais % 60;

  if (horas === 0) {
    return `${minutosRestantes} minuto${minutosRestantes !== 1 ? 's' : ''}`;
  } else {
    return `${horas} hora${horas !== 1 ? 's' : ''} e ${minutosRestantes} minuto${minutosRestantes !== 1 ? 's' : ''}`;
  }
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('isAuthenticated') === 'true'
  );
  const [pedidos, setPedidos] = useState([]);
  const [pedidosAndamento, setPedidosAndamento] = useState([]);
  const [pedidosConcluidos, setPedidosConcluidos] = useState([]);
  const [novoPedido, setNovoPedido] = useState(() => {
    const inicioInicial = formatDateToLocalISO(new Date(), 'novoPedido init');
    console.log('Inicializando novoPedido com inicio:', inicioInicial);
    return {
      empresa: '',
      numeroOS: '',
      dataEntrada: '',
      previsaoEntrega: '',
      responsavel: '',
      status: 'novo',
      inicio: inicioInicial,
      tempo: 0,
      peso: null,
      volume: null,
      dataConclusao: null,
      pausado: '0',
      tempoPausado: 0,
      dataPausada: null,
      dataInicioPausa: null,
      itens: [{ codigoDesenho: '', quantidadePedido: '' }],
    };
  });
  const [pedidoParaEditar, setPedidoParaEditar] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [busca, setBusca] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [observacao, setObservacao] = useState('');
  const [peso, setPeso] = useState('');
  const [volume, setVolume] = useState('');
  const [mostrarModalPesoVolume, setMostrarModalPesoVolume] = useState(false);
  const [pedidoParaConcluir, setPedidoParaConcluir] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isFetching = useRef(false);
  const lastFetchTimestamp = useRef(0);

  const parseDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.includes('undefined')) {
      console.warn('Data inválida fornecida em parseDate, usando data atual:', dateStr);
      return new Date();
    }
    const parsedDate = new Date(dateStr);
    if (isNaN(parsedDate)) {
      console.warn('Data inválida em parseDate, usando data atual:', dateStr);
      return new Date();
    }
    return parsedDate;
  };

  const calcularTempo = (inicio, fim = formatDateToLocalISO(new Date(), 'calcularTempo')) => {
    const inicioDate = parseDate(inicio);
    const fimDate = parseDate(fim);
    console.log(`calcularTempo - inicio: ${inicio}, fim: ${fim}, diffMs: ${fimDate - inicioDate}, inicioDate: ${inicioDate.toISOString()}, fimDate: ${fimDate.toISOString()}`);
    if (isNaN(inicioDate) || isNaN(fimDate)) {
      console.error('Data inválida em calcularTempo:', { inicio, fim });
      return 0;
    }
    const diffMs = fimDate - inicioDate;
    return diffMs < 0 ? 0 : diffMs / (1000 * 60);
  };

  const fetchPedidos = async (dados = null) => {
    const now = Date.now();
    if (now - lastFetchTimestamp.current < 5000 && !dados) return;

    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const response = dados ? { data: dados } : await api.get('/pedidos');
      const pedidosAtualizados = response.data.map((pedido) => {
        const inicioValido = formatDateToLocalISO(pedido.inicio, `fetchPedidos - pedido ${pedido.id}`);
        const dataConclusaoValida = pedido.dataConclusao ? formatDateToLocalISO(pedido.dataConclusao) : null;
        const tempoPausado = Number(pedido.tempoPausado) || 0;
        let tempoFinal = tempoPausado;
        if (pedido.status === 'concluido') {
          tempoFinal = Number(pedido.tempo) || 0;
        } else if (pedido.status === 'andamento' && pedido.pausado !== '1') {
          const dataReferencia = pedido.dataPausada || pedido.inicio;
          const tempoDecorrido = calcularTempo(dataReferencia, formatDateToLocalISO(new Date(), `fetchPedidos - pedido ${pedido.id}`));
          tempoFinal = tempoPausado + tempoDecorrido;
        }
        console.log(`fetchPedidos - pedido ${pedido.id}: tempoFinal = ${tempoFinal}, tempoPausado = ${tempoPausado}, pausado = ${pedido.pausado}`);
        return {
          ...pedido,
          inicio: inicioValido,
          dataConclusao: dataConclusaoValida,
          tempo: tempoFinal,
          tempoPausado: tempoPausado,
          pausado: pedido.pausado,
          itens: Array.isArray(pedido.itens) ? pedido.itens : [],
        };
      });
      const sortByPrevisaoEntrega = (a, b) => {
        const dateA = new Date(a.previsaoEntrega);
        const dateB = new Date(b.previsaoEntrega);
        return isNaN(dateB) - isNaN(dateA) || dateB - dateA;
      };
      setPedidos(pedidosAtualizados.filter((p) => p.status === 'andamento').sort(sortByPrevisaoEntrega));
      setPedidosAndamento(pedidosAtualizados.filter((p) => p.status === 'novo').sort(sortByPrevisaoEntrega));
      setPedidosConcluidos(pedidosAtualizados.filter((p) => p.status === 'concluido'));
      setIsLoading(false);
      lastFetchTimestamp.current = now;
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      setMensagem('Erro ao carregar pedidos: ' + error.message);
    } finally {
      isFetching.current = false;
    }
  };

  const carregarPedidos = useCallback(debounce((dados) => {
    fetchPedidos(dados);
  }, 1000), []);

  useEffect(() => {
    if (isAuthenticated) {
      carregarPedidos();
    }
    return () => {
      carregarPedidos.cancel();
    };
  }, [carregarPedidos, isAuthenticated]);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setPedidos((prev) => {
        const novosPedidos = prev.map((p) => {
          if (p.status !== 'andamento' || p.pausado === '1') {
            return { ...p, tempo: Number(p.tempoPausado) || p.tempo || 0 };
          }
          const dataReferencia = p.dataPausada || p.inicio;
          const tempoAcumulado = Number(p.tempoPausado) || 0;
          const tempoDesdeReferencia = calcularTempo(dataReferencia, formatDateToLocalISO(new Date(), 'intervalo atual'));
          const tempoAtual = Math.round(tempoAcumulado + tempoDesdeReferencia);
          console.log(`Atualizando tempo para pedido ${p.id}: tempoAtual = ${tempoAtual}, tempoPausado = ${tempoAcumulado}, tempoDesdeReferencia = ${tempoDesdeReferencia}`);
          return { ...p, tempo: tempoAtual };
        });
        return [...novosPedidos];
      });
    }, 60000);
    return () => clearInterval(intervalo);
  }, []);

  const exportarPDF = () => {
    const doc = new jsPDF();
    const headersAndamento = ['Empresa', 'Nº OS', 'Data Entrada', 'Previsão', 'Responsável', 'Início', 'Tempo'];
    const headersNovos = ['Empresa', 'Nº OS', 'Data Entrada', 'Previsão', 'Responsável', 'Início', 'Tempo'];
    const headersConcluidos = ['Empresa', 'Nº OS', 'Data Entrada', 'Previsão', 'Responsável', 'Início e Conclusão', 'Tempo'];

    const addTable = (title, data, headers) => {
      doc.text(title, 14, 20);
      autoTable(doc, {
        head: [headers],
        body: data.map((p) => [
          p.empresa,
          p.numeroOS,
          formatarDataSimples(p.dataEntrada),
          formatarDataSimples(p.previsaoEntrega),
          p.responsavel,
          p.status === 'concluido' ? `${formatarDataHora(p.inicio)}\n${formatarDataHora(p.dataConclusao) || 'Não concluído'}` : formatarDataHora(p.inicio),
          formatarTempo(p.tempo),
        ]),
        startY: 30,
      });
    };

    addTable('Pedidos em Andamento', pedidos, headersAndamento);
    doc.addPage();
    addTable('Pedidos Novos', pedidosAndamento, headersNovos);
    doc.addPage();
    addTable('Pedidos Concluídos', pedidosConcluidos, headersConcluidos);
    doc.save('pedidos_controle_producao.pdf');
  };

  const moverParaAndamento = async (id) => {
    const pedido = [...pedidos, ...pedidosAndamento, ...pedidosConcluidos].find((p) => p.id === id);
    if (pedido) {
      const novoInicio = formatDateToLocalISO(new Date(), 'moverParaAndamento');
      const pedidoAtualizado = {
        ...pedido,
        status: 'andamento',
        inicio: novoInicio,
        tempo: 0,
        tempoPausado: 0,
        dataPausada: null,
        dataInicioPausa: null,
        pausado: '0'
      };
      try {
        console.log('Enviando pedido atualizado para andamento:', pedidoAtualizado);
        const resposta = await api.put(`/pedidos/${id}`, pedidoAtualizado);
        await api.post('/enviar-email', { pedido: resposta.data, observacao: '' });
        const pedidoMovido = { ...resposta.data, tempo: 0 };
        setPedidosAndamento((prev) => prev.filter((p) => p.id !== id));
        setPedidos((prev) => [...prev.filter((p) => p.id !== id), pedidoMovido]);
        setPedidosConcluidos((prev) => prev.filter((p) => p.id !== id));
        console.log('Pedido movido para andamento:', pedidoMovido);
        setMensagem('Pedido movido para "Em Andamento" e e-mail enviado.');
        carregarPedidos();
      } catch (error) {
        setMensagem('Erro ao mover pedido: ' + (error.response ? error.response.data.message : error.message));
        carregarPedidos();
      }
    }
  };

  const pausarPedido = async (id) => {
    const pedido = pedidos.find((p) => p.id === id);
    if (!pedido) {
      setMensagem('Erro: Pedido não encontrado.');
      return;
    }
    const dataPausada = formatDateToLocalISO(new Date(), 'pausarPedido');
    const dataInicioPausa = formatDateToLocalISO(new Date(), 'inicioPausa');
    const tempoAtual = pedido.tempo || calcularTempo(pedido.inicio, dataPausada);
    const pedidoPausado = {
      ...pedido,
      pausado: '1',
      tempoPausado: tempoAtual,
      dataPausada,
      dataInicioPausa,
      tempo: tempoAtual,
    };
    try {
      console.log('Pausando pedido:', pedidoPausado);
      await api.put(`/pedidos/${id}`, pedidoPausado);
      setPedidos((prev) => prev.map((p) => (p.id === id ? pedidoPausado : p)));
      setMensagem('Pedido pausado com sucesso.');
      carregarPedidos();
    } catch (error) {
      console.error('Erro ao pausar pedido:', error);
      setMensagem('Erro ao pausar pedido: ' + (error.response?.data.message || error.message));
    }
  };

  const retomarPedido = async (id) => {
    const pedido = pedidos.find((p) => p.id === id);
    if (!pedido) {
      setMensagem('Erro: Pedido não encontrado.');
      return;
    }
    const dataRetomada = formatDateToLocalISO(new Date(), 'retomarPedido');
    const tempoPausadoAnterior = Number(pedido.tempoPausado) || pedido.tempo || 0;
    const pedidoRetomado = {
      ...pedido,
      pausado: '0',
      dataPausada: dataRetomada,
      dataInicioPausa: null,
      tempoPausado: tempoPausadoAnterior,
      tempo: tempoPausadoAnterior,
    };
    try {
      console.log('Enviando pedido atualizado para retomar:', pedidoRetomado);
      await api.put(`/pedidos/${id}`, pedidoRetomado);
      setPedidos((prev) => prev.map((p) => (p.id === id ? pedidoRetomado : p)));
      setMensagem('Pedido retomado com sucesso.');
      carregarPedidos();
    } catch (error) {
      console.error('Erro ao retomar pedido:', error);
      setMensagem('Erro ao retomar pedido: ' + (error.response?.data.message || error.message));
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          !isAuthenticated ? (
            <Login setIsAuthenticated={setIsAuthenticated} />
          ) : (
            <Navigate to="/" />
          )
        } />
        <Route path="/" element={
          isAuthenticated ? (
            <div className="container">
              <div className="header">
                <img src="/logoNF.jpg" alt="Logo" className="logo" />
                <h1>Controle de Produção</h1>
                <button className="btn-desenho" onClick={() => window.open('https://drive.google.com/drive/folders/1vzemVbLeotHD0xirxUPsvNb9qBccQFcd?usp=sharing', '_blank')}>
                  DESENHO
                </button>
                <button className="btn-logout" onClick={handleLogout}>Sair</button>
              </div>

              {mensagem && <p className={mensagem.includes('Erro') ? 'erro' : 'sucesso'}>{mensagem}</p>}
              {isLoading && <p>Carregando pedidos...</p>}

              <button className="btn-adicionar-pedido" onClick={() => setMostrarFormulario(true)}>Adicionar Pedido Novo</button>
              {mostrarFormulario && (
                <PedidoForm
                  novoPedido={novoPedido}
                  setNovoPedido={setNovoPedido}
                  pedidoParaEditar={pedidoParaEditar}
                  setPedidoParaEditar={setPedidoParaEditar}
                  setMostrarFormulario={setMostrarFormulario}
                  setMensagem={setMensagem}
                  carregarPedidos={carregarPedidos}
                  setPedidos={setPedidos}
                  setPedidosAndamento={setPedidosAndamento}
                  setPedidosConcluidos={setPedidosConcluidos}
                  setMostrarModalPesoVolume={setMostrarModalPesoVolume}
                  setPedidoParaConcluir={setPedidoParaConcluir}
                  moverParaAndamento={moverParaAndamento}
                  formatDateToLocalISO={formatDateToLocalISO}
                />
              )}

              <Busca
                busca={busca}
                setBusca={setBusca}
                carregarPedidos={carregarPedidos}
                todosPedidos={[...pedidos, ...pedidosAndamento, ...pedidosConcluidos]}
                exportarPDF={exportarPDF}
              />

              <h2>Pedidos em Andamento</h2>
              <PedidoTable
                pedidos={pedidos}
                tipo="andamento"
                setPedidos={setPedidos}
                setPedidosAndamento={setPedidosAndamento}
                setPedidosConcluidos={setPedidosConcluidos}
                setMensagem={setMensagem}
                setMostrarModal={setMostrarModal}
                setPedidoSelecionado={setPedidoSelecionado}
                setMostrarModalPesoVolume={setMostrarModalPesoVolume}
                setPedidoParaConcluir={setPedidoParaConcluir}
                busca={busca}
                carregarPedidos={carregarPedidos}
                moverParaAndamento={moverParaAndamento}
                pausarPedido={pausarPedido}
                retomarPedido={retomarPedido}
                formatarTempo={formatarTempo}
              />

              <h2>Pedidos Novos</h2>
              <PedidoTable
                pedidos={pedidosAndamento}
                tipo="novo"
                setPedidos={setPedidos}
                setPedidosAndamento={setPedidosAndamento}
                setPedidosConcluidos={setPedidosConcluidos}
                setMensagem={setMensagem}
                setPedidoParaEditar={setPedidoParaEditar}
                setNovoPedido={setNovoPedido}
                setMostrarFormulario={setMostrarFormulario}
                setMostrarModal={setMostrarModal}
                setPedidoSelecionado={setPedidoSelecionado}
                setMostrarModalPesoVolume={setMostrarModalPesoVolume}
                setPedidoParaConcluir={setPedidoParaConcluir}
                busca={busca}
                carregarPedidos={carregarPedidos}
                moverParaAndamento={moverParaAndamento}
                formatarTempo={formatarTempo}
                pausarPedido={pausarPedido}
                retomarPedido={retomarPedido}
              />

              <h2>Pedidos Concluídos</h2>
              <PedidoTable
                pedidos={pedidosConcluidos}
                tipo="concluido"
                setPedidos={setPedidos}
                setPedidosAndamento={setPedidosAndamento}
                setPedidosConcluidos={setPedidosConcluidos}
                setMensagem={setMensagem}
                setPedidoParaEditar={setPedidoParaEditar}
                setNovoPedido={setNovoPedido}
                setMostrarFormulario={setMostrarFormulario}
                setMostrarModal={setMostrarModal}
                setPedidoSelecionado={setPedidoSelecionado}
                setMostrarModalPesoVolume={setMostrarModalPesoVolume}
                setPedidoParaConcluir={setPedidoParaConcluir}
                busca={busca}
                carregarPedidos={carregarPedidos}
                formatarTempo={formatarTempo}
                pausarPedido={pausarPedido}
                retomarPedido={retomarPedido}
              />

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
          ) : (
            <Navigate to="/login" />
          )
        } />
      </Routes>
    </Router>
  );
}

export default App;