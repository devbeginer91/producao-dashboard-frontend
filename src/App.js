import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import debounce from 'lodash/debounce';
import './App.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Layout from './components/Layout';
import DashboardPage from './components/DashboardPage';
import PedidoListPage from './components/PedidoListPage';
import ImportarChicotesPage from './components/ImportarChicotesPage';
import UsuariosPage from './components/UsuariosPage';
import ClientesChicotesPage from './components/ClientesChicotesPage';
import ChicotesClientePage from './components/ChicotesClientePage';
import ChicoteDetalhePage from './components/ChicoteDetalhePage';
import PCPPage from './components/PCPPage';
import AvisosSeraoPage from './components/AvisosSeraoPage';
import AcompanhamentoProducaoPage from './components/AcompanhamentoProducaoPage';
import RelatorioColaboradorChicotePage from './components/RelatorioColaboradorChicotePage';
import RelatorioChicoteDetalhePage from './components/RelatorioChicoteDetalhePage';
import FinanceiroPage from './components/FinanceiroPage';
import FinanceiroClientePage from './components/FinanceiroClientePage';
import FinanceiroRelatorioPage from './components/FinanceiroRelatorioPage';
import ColaboradorPage from './components/ColaboradorPage';
import Login from './components/Login';
import LoginPCP from './components/LoginPCP';
import LoginColaborador from './components/LoginColaborador';
import CadastroColaborador from './components/CadastroColaborador';
import api from './api';
import { formatarDataHora } from './utils';

const homeFor = (auth) => {
  if (!auth) return '/login';
  if (auth.tipo === 'admin') return '/';
  if (auth.tipo === 'pcp') return '/priorizar-producao';
  if (auth.tipo === 'colaborador') return '/colaborador';
  return '/login';
};

// Função para formatar datas no formato YYYY-MM-DD HH:MM:SS com fuso horário America/Sao_Paulo (UTC-3)
export const formatDateToLocalISO = (date, context = 'unknown') => {
  const d = date ? new Date(date) : new Date();
  if (isNaN(d.getTime()) || (typeof date === 'string' && date.includes('undefined'))) {
    return new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 19);
  }
  return d.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 19);
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
  const [auth, setAuth] = useState(() => {
    const stored = localStorage.getItem('auth');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    // Compatibilidade com o login antigo (só admin, flag booleana)
    if (localStorage.getItem('isAuthenticated') === 'true') {
      return { tipo: 'admin' };
    }
    return null;
  });
  // "admin" e "pcp" acessam o mesmo Layout/Sidebar; Importar Arquivos e Financeiro
  // ficam restritos a admin (ver rotas abaixo e a prop isAdmin no Sidebar).
  const isAuthenticated = auth?.tipo === 'admin' || auth?.tipo === 'pcp';
  const isAdmin = auth?.tipo === 'admin';

  useEffect(() => {
    if (auth) {
      localStorage.setItem('auth', JSON.stringify(auth));
    } else {
      localStorage.removeItem('auth');
    }
    localStorage.removeItem('isAuthenticated');
  }, [auth]);
  const [pedidos, setPedidos] = useState([]);
  const [pedidosAndamento, setPedidosAndamento] = useState([]);
  // Total de concluídos vem de um resumo leve (GET /pedidos/concluidos/resumo) — os
  // pedidos concluídos em si (centenas) só são buscados sob demanda, por ano, na própria
  // tela de Concluídos (PedidoListPage), não ficam carregados o tempo todo aqui.
  const [totalConcluidos, setTotalConcluidos] = useState(0);
  const [pedidosConcluidos, setPedidosConcluidos] = useState([]);
  const [novoPedido, setNovoPedido] = useState(() => {
    const inicioInicial = formatDateToLocalISO(new Date(), 'novoPedido init');
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isFetching = useRef(false);
  const lastFetchTimestamp = useRef(0);
  const pollingIntervalRef = useRef(null);
  const recentlyUpdatedPedidos = useRef(new Map());
  const columnRefs = useRef({ novo: null, andamento: null });
  const pendingScrollTipo = useRef(null);

  const scrollToColumn = useCallback((tipo) => {
    columnRefs.current[tipo]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  }, []);

  const onNavigateAndamento = () => {
    if (columnRefs.current.andamento) {
      scrollToColumn('andamento');
    } else {
      pendingScrollTipo.current = 'andamento';
    }
  };

  const parseDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.includes('undefined')) {
      return new Date();
    }
    const parsedDate = new Date(dateStr);
    if (isNaN(parsedDate)) {
      return new Date();
    }
    return parsedDate;
  };

  const calcularTempo = (inicio, fim = formatDateToLocalISO(new Date(), 'calcularTempo')) => {
    const inicioDate = parseDate(inicio);
    const fimDate = parseDate(fim);
    if (isNaN(inicioDate) || isNaN(fimDate)) {
      return 0;
    }
    const diffMs = fimDate - inicioDate;
    return diffMs < 0 ? 0 : diffMs / (1000 * 60);
  };

  const fetchPedidos = async (dados = null, isPolling = false) => {
    const now = Date.now();
    if (!isPolling && now - lastFetchTimestamp.current < 5000 && !dados) {
      return;
    }

    if (isFetching.current) {
      return;
    }
    isFetching.current = true;
    try {
      // status=ativo traz só novo+andamento — concluídos (centenas) são buscados sob
      // demanda, por ano, direto na tela de Concluídos (ver PedidoListPage).
      const [response] = await Promise.all([
        dados ? Promise.resolve({ data: dados }) : api.get('/pedidos', { params: { status: 'ativo' } }),
        dados
          ? Promise.resolve()
          : api.get('/pedidos/concluidos/resumo').then((r) => setTotalConcluidos(r.data.total)).catch(() => {}),
      ]);
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
        const recentlyUpdated = recentlyUpdatedPedidos.current.get(pedido.id);
        if (recentlyUpdated) {
          return {
            ...pedido,
            ...recentlyUpdated,
            inicio: inicioValido,
            dataConclusao: recentlyUpdated.dataConclusao ? formatDateToLocalISO(recentlyUpdated.dataConclusao) : dataConclusaoValida,
            tempo: recentlyUpdated.tempo || tempoFinal,
            tempoPausado: recentlyUpdated.tempoPausado || tempoPausado,
            pausado: recentlyUpdated.pausado || pedido.pausado,
            itens: recentlyUpdated.itens || (Array.isArray(pedido.itens) ? pedido.itens : []),
          };
        }
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
      setIsLoading(false);
      lastFetchTimestamp.current = now;

      setTimeout(() => {
        recentlyUpdatedPedidos.current.clear();
      }, 5000);
    } catch (error) {
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
          return { ...p, tempo: tempoAtual };
        });
        return [...novosPedidos];
      });
    }, 60000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchPedidos(null, true);

    pollingIntervalRef.current = setInterval(() => {
      fetchPedidos(null, true);
    }, 60000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isAuthenticated]);

  const exportarPDF = async () => {
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
    // Concluídos não ficam pré-carregados (são centenas) — o PDF traz só o ano corrente;
    // pra outros anos, exportar direto da tela de Concluídos com o ano selecionado.
    const anoAtual = new Date().getFullYear();
    let concluidosDoAno = [];
    try {
      const resposta = await api.get('/pedidos', { params: { status: 'concluido', ano: anoAtual } });
      concluidosDoAno = resposta.data;
    } catch (error) {
      setMensagem('Erro ao buscar concluídos pra exportar: ' + error.message);
    }
    addTable(`Pedidos Concluídos (${anoAtual})`, concluidosDoAno, headersConcluidos);
    doc.save('pedidos_controle_producao.pdf');
  };

  const handleLogout = () => {
    setAuth(null);
  };

  const cardActionProps = {
    setPedidos,
    setPedidosAndamento,
    setPedidosConcluidos,
    setMensagem,
    setMostrarModal,
    setPedidoSelecionado,
    setMostrarModalPesoVolume,
    setPedidoParaConcluir,
    setPedidoParaEditar,
    setNovoPedido,
    setMostrarFormulario,
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          !auth ? (
            <Login onLogin={setAuth} />
          ) : (
            <Navigate to={homeFor(auth)} />
          )
        } />
        <Route path="/login-pcp" element={
          !auth ? (
            <LoginPCP onLogin={setAuth} />
          ) : (
            <Navigate to={homeFor(auth)} />
          )
        } />
        <Route path="/login-colaborador" element={
          !auth ? (
            <LoginColaborador onLogin={setAuth} />
          ) : (
            <Navigate to={homeFor(auth)} />
          )
        } />
        <Route path="/cadastro-colaborador" element={
          !auth ? (
            <CadastroColaborador />
          ) : (
            <Navigate to={homeFor(auth)} />
          )
        } />
        <Route path="/pcp" element={<Navigate to={homeFor(auth)} />} />
        <Route path="/colaborador" element={
          auth?.tipo === 'colaborador' ? (
            <ColaboradorPage colaborador={auth} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login-colaborador" />
          )
        } />
        <Route path="/colaborador/chicotes-eletricos" element={
          auth?.tipo === 'colaborador' ? (
            <ClientesChicotesPage baseRoute="/colaborador/chicotes-eletricos" voltarRoute="/colaborador" />
          ) : (
            <Navigate to="/login-colaborador" />
          )
        } />
        <Route path="/colaborador/chicotes-eletricos/:cliente" element={
          auth?.tipo === 'colaborador' ? (
            <ChicotesClientePage
              voltarRoute="/colaborador/chicotes-eletricos"
              destinoChicote={(id) => `/colaborador/chicotes-eletricos/chicote/${id}`}
              permitirCriar={false}
            />
          ) : (
            <Navigate to="/login-colaborador" />
          )
        } />
        <Route path="/colaborador/chicotes-eletricos/chicote/:id" element={
          auth?.tipo === 'colaborador' ? (
            <ChicoteDetalhePage
              voltarRoute={(cliente) => `/colaborador/chicotes-eletricos/${encodeURIComponent(cliente)}`}
              somenteLeitura
            />
          ) : (
            <Navigate to="/login-colaborador" />
          )
        } />
        <Route
          element={
            isAuthenticated ? (
              <Layout
                isAdmin={isAdmin}
                sidebarCounts={{
                  novo: pedidosAndamento.length,
                  andamento: pedidos.length,
                  concluido: totalConcluidos,
                }}
                onNavigateAndamento={onNavigateAndamento}
                onLogout={handleLogout}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                mostrarFormulario={mostrarFormulario}
                setMostrarFormulario={setMostrarFormulario}
                novoPedido={novoPedido}
                setNovoPedido={setNovoPedido}
                pedidoParaEditar={pedidoParaEditar}
                setPedidoParaEditar={setPedidoParaEditar}
                setMensagem={setMensagem}
                carregarPedidos={carregarPedidos}
                setPedidos={setPedidos}
                setPedidosAndamento={setPedidosAndamento}
                setPedidosConcluidos={setPedidosConcluidos}
                setMostrarModalPesoVolume={setMostrarModalPesoVolume}
                pedidoParaConcluir={pedidoParaConcluir}
                setPedidoParaConcluir={setPedidoParaConcluir}
                formatDateToLocalISO={formatDateToLocalISO}
                mostrarModal={mostrarModal}
                pedidoSelecionado={pedidoSelecionado}
                observacao={observacao}
                setObservacao={setObservacao}
                setMostrarModal={setMostrarModal}
                mostrarModalPesoVolume={mostrarModalPesoVolume}
                peso={peso}
                setPeso={setPeso}
                volume={volume}
                setVolume={setVolume}
              />
            ) : (
              <Navigate to={homeFor(auth)} />
            )
          }
        >
          <Route
            path="/"
            element={
              <DashboardPage
                mensagem={mensagem}
                isLoading={isLoading}
                novos={pedidosAndamento}
                andamento={pedidos}
                concluidos={pedidosConcluidos}
                concluidosTotal={totalConcluidos}
                busca={busca}
                setBusca={setBusca}
                carregarPedidos={carregarPedidos}
                exportarPDF={exportarPDF}
                columnRefs={columnRefs}
                pendingScrollTipo={pendingScrollTipo}
                scrollToColumn={scrollToColumn}
                setSidebarOpen={setSidebarOpen}
                {...cardActionProps}
              />
            }
          />
          <Route
            path="/pedidos/novos"
            element={
              <PedidoListPage
                tipo="novo"
                titulo="Pedidos Novos"
                pedidos={pedidosAndamento}
                busca={busca}
                setBusca={setBusca}
                carregarPedidos={carregarPedidos}
                todosPedidos={[...pedidos, ...pedidosAndamento, ...pedidosConcluidos]}
                exportarPDF={exportarPDF}
                setSidebarOpen={setSidebarOpen}
                {...cardActionProps}
              />
            }
          />
          <Route
            path="/pedidos/concluidos"
            element={
              <PedidoListPage
                tipo="concluido"
                titulo="Pedidos Concluídos"
                pedidos={pedidosConcluidos}
                busca={busca}
                setBusca={setBusca}
                carregarPedidos={carregarPedidos}
                todosPedidos={[...pedidos, ...pedidosAndamento, ...pedidosConcluidos]}
                exportarPDF={exportarPDF}
                setSidebarOpen={setSidebarOpen}
                {...cardActionProps}
              />
            }
          />
          <Route
            path="/importar-chicotes"
            element={isAdmin ? <ImportarChicotesPage setSidebarOpen={setSidebarOpen} /> : <Navigate to="/" />}
          />
          <Route
            path="/usuarios"
            element={isAdmin ? <UsuariosPage setSidebarOpen={setSidebarOpen} /> : <Navigate to="/" />}
          />
          <Route
            path="/priorizar-producao"
            element={<PCPPage setSidebarOpen={setSidebarOpen} />}
          />
          <Route
            path="/avisos-serao"
            element={<AvisosSeraoPage setSidebarOpen={setSidebarOpen} />}
          />
          <Route
            path="/chicotes-eletricos"
            element={<ClientesChicotesPage setSidebarOpen={setSidebarOpen} mostrarBuscaChicote />}
          />
          <Route
            path="/chicotes-eletricos/:cliente"
            element={<ChicotesClientePage setSidebarOpen={setSidebarOpen} />}
          />
          <Route
            path="/chicotes-eletricos/chicote/:id"
            element={<ChicoteDetalhePage setSidebarOpen={setSidebarOpen} />}
          />
          <Route
            path="/acompanhamento-producao"
            element={<AcompanhamentoProducaoPage setSidebarOpen={setSidebarOpen} />}
          />
          <Route
            path="/relatorios/colaboradores"
            element={
              <ClientesChicotesPage
                setSidebarOpen={setSidebarOpen}
                titulo="Tempos por Colaborador"
                baseRoute="/relatorios/colaboradores"
                mostrarBuscaChicote
                destinoBuscaChicote={(id) => `/relatorios/colaboradores/chicote/${id}`}
              />
            }
          />
          <Route
            path="/relatorios/colaboradores/:cliente"
            element={
              <ChicotesClientePage
                setSidebarOpen={setSidebarOpen}
                voltarRoute="/relatorios/colaboradores"
                destinoChicote={(id) => `/relatorios/colaboradores/chicote/${id}`}
                mostrarTemExecucoes
                permitirCriar={false}
              />
            }
          />
          <Route
            path="/relatorios/colaboradores/chicote/:chicoteId"
            element={<RelatorioColaboradorChicotePage setSidebarOpen={setSidebarOpen} />}
          />
          <Route
            path="/relatorios/chicotes"
            element={
              <ClientesChicotesPage
                setSidebarOpen={setSidebarOpen}
                titulo="Tempos por Chicote"
                baseRoute="/relatorios/chicotes"
                mostrarBuscaChicote
                destinoBuscaChicote={(id) => `/relatorios/chicotes/chicote/${id}`}
                mostrarPdfPorCliente
              />
            }
          />
          <Route
            path="/relatorios/chicotes/:cliente"
            element={
              <ChicotesClientePage
                setSidebarOpen={setSidebarOpen}
                voltarRoute="/relatorios/chicotes"
                destinoChicote={(id) => `/relatorios/chicotes/chicote/${id}`}
                mostrarTemExecucoes
                permitirCriar={false}
              />
            }
          />
          <Route
            path="/relatorios/chicotes/chicote/:chicoteId"
            element={<RelatorioChicoteDetalhePage setSidebarOpen={setSidebarOpen} />}
          />
          <Route
            path="/financeiro"
            element={
              isAdmin ? (
                <FinanceiroPage
                  setSidebarOpen={setSidebarOpen}
                  mostrarFormulario={mostrarFormulario}
                  setMostrarFormulario={setMostrarFormulario}
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/financeiro/:cliente"
            element={
              isAdmin ? (
                <FinanceiroClientePage
                  setSidebarOpen={setSidebarOpen}
                  mostrarFormulario={mostrarFormulario}
                  setMostrarFormulario={setMostrarFormulario}
                  setNovoPedido={setNovoPedido}
                  setPedidoParaEditar={setPedidoParaEditar}
                  formatDateToLocalISO={formatDateToLocalISO}
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/financeiro-relatorio"
            element={isAdmin ? <FinanceiroRelatorioPage setSidebarOpen={setSidebarOpen} /> : <Navigate to="/" />}
          />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;