import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiMenu, FiArrowLeft, FiChevronRight, FiAward } from 'react-icons/fi';
import api from '../api';
import { formatarDataHora } from '../utils';

const formatarCronometro = (segundos) => {
  if (segundos == null) return '—';
  const totalSegundos = Math.max(0, Math.round(segundos));
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

const RelatorioColaboradorChicotePage = ({ setSidebarOpen }) => {
  const { chicoteId } = useParams();
  const navigate = useNavigate();
  const [chicote, setChicote] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');

  const [etapaSelecionada, setEtapaSelecionada] = useState(null);
  const [ranking, setRanking] = useState(null);
  const [carregandoRanking, setCarregandoRanking] = useState(false);

  const [colaboradorSelecionado, setColaboradorSelecionado] = useState(null);
  const [detalheColaborador, setDetalheColaborador] = useState(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  useEffect(() => {
    setCarregando(true);
    api.get(`/chicotes/${chicoteId}`)
      .then((r) => setChicote(r.data))
      .catch((e) => setMensagem('Erro: ' + (e.response?.data?.message || e.message)))
      .finally(() => setCarregando(false));
  }, [chicoteId]);

  const abrirEtapa = (etapa) => {
    setEtapaSelecionada(etapa);
    setColaboradorSelecionado(null);
    setDetalheColaborador(null);
    setCarregandoRanking(true);
    api.get(`/etapas-chicote/${etapa.id}/colaboradores`)
      .then((r) => setRanking(r.data))
      .catch((e) => setMensagem('Erro: ' + (e.response?.data?.message || e.message)))
      .finally(() => setCarregandoRanking(false));
  };

  const abrirColaborador = (colaborador) => {
    setColaboradorSelecionado(colaborador);
    setCarregandoDetalhe(true);
    api.get(`/etapas-chicote/${etapaSelecionada.id}/colaboradores/${colaborador.colaboradorId}`)
      .then((r) => setDetalheColaborador(r.data))
      .catch((e) => setMensagem('Erro: ' + (e.response?.data?.message || e.message)))
      .finally(() => setCarregandoDetalhe(false));
  };

  if (carregando) {
    return (
      <>
        <header className="topbar">
          <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <FiMenu />
          </button>
          <h1>Tempos por Colaborador</h1>
        </header>
        <p className="loading">Carregando chicote...</p>
      </>
    );
  }

  if (mensagem && !chicote) {
    return (
      <>
        <header className="topbar">
          <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <FiMenu />
          </button>
          <h1>Tempos por Colaborador</h1>
        </header>
        <p className="erro">{mensagem}</p>
      </>
    );
  }

  return (
    <>
      <header className="topbar">
        <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
          <FiMenu />
        </button>
        <h1>Tempos por Colaborador</h1>
      </header>

      {!colaboradorSelecionado && (
        <button
          className="op-voltar"
          onClick={() => {
            if (etapaSelecionada) {
              setEtapaSelecionada(null);
              setRanking(null);
            } else {
              navigate(`/relatorios/colaboradores/${encodeURIComponent(chicote.cliente)}`);
            }
          }}
        >
          <FiArrowLeft /> {etapaSelecionada ? 'Voltar às etapas' : 'Voltar aos chicotes'}
        </button>
      )}
      {colaboradorSelecionado && (
        <button className="op-voltar" onClick={() => { setColaboradorSelecionado(null); setDetalheColaborador(null); }}>
          <FiArrowLeft /> Voltar ao ranking
        </button>
      )}

      {mensagem && <p className="erro">{mensagem}</p>}

      {!etapaSelecionada && (
        <>
          <h2 className="op-detalhe-titulo">{chicote.cliente} — {chicote.codigoItemCliente}</h2>
          {chicote.etapas.length === 0 ? (
            <p className="pedido-grid-empty">Esse chicote ainda não tem etapas cadastradas.</p>
          ) : (
            <div className="op-itens-list">
              {chicote.etapas.map((etapa) => (
                <button key={etapa.id} className="op-item-row" onClick={() => abrirEtapa(etapa)}>
                  <span className="op-item-codigo">{etapa.ordem}. {etapa.nome}</span>
                  <FiChevronRight />
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {etapaSelecionada && !colaboradorSelecionado && (
        <>
          <h2 className="op-detalhe-titulo">
            {chicote.cliente} — {chicote.codigoItemCliente} · {etapaSelecionada.ordem}. {etapaSelecionada.nome}
          </h2>
          {carregandoRanking && <p className="loading">Carregando ranking...</p>}
          {!carregandoRanking && ranking && ranking.ranking.length === 0 && (
            <p className="pedido-grid-empty">Nenhuma execução concluída registrada ainda nessa etapa.</p>
          )}
          {!carregandoRanking && ranking && ranking.ranking.length > 0 && (
            <table className="tabela-itens">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Colaborador</th>
                  <th>Execuções</th>
                  <th>Tempo médio</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ranking.ranking.map((c, idx) => (
                  <tr key={c.colaboradorId} className="tabela-itens-row-clicavel" onClick={() => abrirColaborador(c)}>
                    <td>{idx === 0 ? <FiAward className="ranking-primeiro-icon" /> : idx + 1}</td>
                    <td>{c.colaboradorNome}</td>
                    <td>{c.execucoes}</td>
                    <td className="tabela-itens-tempo">{formatarCronometro(c.tempoMedioSegundos)}</td>
                    <td><FiChevronRight /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {colaboradorSelecionado && (
        <>
          <h2 className="op-detalhe-titulo">
            {chicote.cliente} — {chicote.codigoItemCliente} · {etapaSelecionada.nome} · {colaboradorSelecionado.colaboradorNome}
          </h2>
          {carregandoDetalhe && <p className="loading">Carregando execuções...</p>}
          {!carregandoDetalhe && detalheColaborador && (
            <>
              <p className="relatorio-media-destaque">
                Tempo médio: <strong>{formatarCronometro(detalheColaborador.tempoMedioSegundos)}</strong>
                {' '}({detalheColaborador.execucoes.length} execuç{detalheColaborador.execucoes.length === 1 ? 'ão' : 'ões'})
              </p>
              {detalheColaborador.execucoes.length === 0 ? (
                <p className="pedido-grid-empty">Nenhuma execução concluída registrada ainda.</p>
              ) : (
                <table className="tabela-itens">
                  <thead>
                    <tr>
                      <th>OS</th>
                      <th>Início</th>
                      <th>Fim</th>
                      <th>Tempo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalheColaborador.execucoes.map((ex) => (
                      <tr key={ex.id}>
                        <td>{ex.empresa} — {ex.numeroOS}</td>
                        <td>{formatarDataHora(ex.inicio)}</td>
                        <td>{formatarDataHora(ex.dataConclusao)}</td>
                        <td className="tabela-itens-tempo">{formatarCronometro(ex.tempoSegundos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </>
      )}
    </>
  );
};

export default RelatorioColaboradorChicotePage;
