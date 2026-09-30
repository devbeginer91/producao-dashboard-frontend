import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiArrowLeft, FiClock } from 'react-icons/fi';
import api from '../api';
import OsCardModal from './OsCardModal';

const formatarCronometro = (segundos) => {
  if (segundos == null) return '—';
  const totalSegundos = Math.max(0, Math.round(segundos));
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

const statusLabel = {
  em_andamento: 'Em andamento',
  pausado: 'Pausado',
  concluido: 'Concluído',
};

const pad = (n) => String(n).padStart(2, '0');
const hoje = new Date();
const hojeISO = `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;

// Datas do backend vêm como "AAAA-MM-DD HH:mm:ss" (horário de São Paulo).
const dataBR = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const hora = (valor) => (valor ? valor.slice(11, 16) : '');
const dataHoraCurta = (valor, diaReferencia) =>
  !valor ? '—' : valor.slice(0, 10) === diaReferencia ? hora(valor) : `${dataBR(valor).slice(0, 5)} ${hora(valor)}`;

// "de"/"ate" (AAAA-MM-DD, inclusivos) conforme o tipo de período escolhido.
const intervaloDoPeriodo = (tipo, dia, mes, ano) => {
  if (tipo === 'dia') return dia ? { de: dia, ate: dia } : null;
  if (tipo === 'mes') {
    if (!/^\d{4}-\d{2}$/.test(mes)) return null;
    const [a, m] = mes.split('-').map(Number);
    const ultimoDia = new Date(a, m, 0).getDate();
    return { de: `${mes}-01`, ate: `${mes}-${pad(ultimoDia)}` };
  }
  return /^\d{4}$/.test(ano) ? { de: `${ano}-01-01`, ate: `${ano}-12-31` } : null;
};

const RelatorioColaboradorPeriodoPage = ({ setSidebarOpen }) => {
  const navigate = useNavigate();
  const [colaboradores, setColaboradores] = useState([]);
  const [colaboradorId, setColaboradorId] = useState('');
  const [tipoPeriodo, setTipoPeriodo] = useState('dia');
  const [dia, setDia] = useState(hojeISO);
  const [mes, setMes] = useState(hojeISO.slice(0, 7));
  const [ano, setAno] = useState(hojeISO.slice(0, 4));
  const [execucoes, setExecucoes] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [osCardAbertaId, setOsCardAbertaId] = useState(null);

  useEffect(() => {
    api.get('/colaboradores')
      .then((r) => setColaboradores(r.data))
      .catch((e) => setMensagem('Erro ao carregar colaboradores: ' + (e.response?.data?.message || e.message)));
  }, []);

  const intervalo = intervaloDoPeriodo(tipoPeriodo, dia, mes, ano);
  const de = intervalo?.de;
  const ate = intervalo?.ate;

  useEffect(() => {
    if (!colaboradorId || !de) {
      setExecucoes(null);
      return;
    }
    let cancelado = false;
    setCarregando(true);
    setMensagem('');
    api.get(`/colaboradores/${colaboradorId}/execucoes-periodo`, { params: { de, ate } })
      .then((r) => { if (!cancelado) setExecucoes(r.data.execucoes); })
      .catch((e) => { if (!cancelado) setMensagem('Erro ao carregar execuções: ' + (e.response?.data?.message || e.message)); })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, [colaboradorId, de, ate]);

  const totalSegundos = (lista) => lista.reduce((soma, ex) => soma + ex.tempoSegundos, 0);

  // Agrupa por dia de início — no filtro por dia sai um grupo só.
  const dias = [];
  (execucoes || []).forEach((ex) => {
    const chave = ex.inicio.slice(0, 10);
    if (dias.length === 0 || dias[dias.length - 1].dia !== chave) dias.push({ dia: chave, execucoes: [] });
    dias[dias.length - 1].execucoes.push(ex);
  });

  return (
    <>
      <header className="topbar">
        {setSidebarOpen && (
          <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <FiMenu />
          </button>
        )}
        <h1>Tempos por Colaborador</h1>
      </header>

      <button className="op-voltar" onClick={() => navigate('/relatorios/colaboradores')}>
        <FiArrowLeft /> Voltar
      </button>

      <h2 className="op-detalhe-titulo">Produção por colaborador e período</h2>

      <div className="chicote-dados-form relatorio-periodo-filtros">
        <div>
          <label htmlFor="filtro-colaborador">Colaborador</label>
          <select id="filtro-colaborador" value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value)}>
            <option value="">Selecione...</option>
            {colaboradores.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filtro-tipo-periodo">Período</label>
          <select id="filtro-tipo-periodo" value={tipoPeriodo} onChange={(e) => setTipoPeriodo(e.target.value)}>
            <option value="dia">Dia</option>
            <option value="mes">Mês</option>
            <option value="ano">Ano</option>
          </select>
        </div>
        <div>
          {tipoPeriodo === 'dia' && (
            <>
              <label htmlFor="filtro-dia">Dia</label>
              <input id="filtro-dia" type="date" value={dia} onChange={(e) => setDia(e.target.value)} />
            </>
          )}
          {tipoPeriodo === 'mes' && (
            <>
              <label htmlFor="filtro-mes">Mês</label>
              <input id="filtro-mes" type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
            </>
          )}
          {tipoPeriodo === 'ano' && (
            <>
              <label htmlFor="filtro-ano">Ano</label>
              <input id="filtro-ano" type="number" min="2020" max="2100" value={ano} onChange={(e) => setAno(e.target.value)} />
            </>
          )}
        </div>
      </div>

      {mensagem && <p className="erro">{mensagem}</p>}

      {!colaboradorId ? (
        <p className="pedido-grid-empty">Selecione um colaborador pra ver o que ele fez no período.</p>
      ) : carregando ? (
        <p className="loading">Carregando execuções...</p>
      ) : execucoes && execucoes.length === 0 ? (
        <p className="pedido-grid-empty">Nenhuma etapa iniciada nesse período.</p>
      ) : execucoes && (
        <>
          <p className="relatorio-media-destaque">
            <FiClock /> Tempo total: <strong>{formatarCronometro(totalSegundos(execucoes))}</strong>
            {' '}({execucoes.length} execuç{execucoes.length === 1 ? 'ão' : 'ões'}
            {dias.length > 1 && ` em ${dias.length} dias`})
          </p>

          {dias.map((grupo) => (
            <section key={grupo.dia} className="relatorio-periodo-dia">
              {tipoPeriodo !== 'dia' && (
                <h3 className="relatorio-periodo-dia-titulo">
                  {dataBR(grupo.dia)}
                  <span>{formatarCronometro(totalSegundos(grupo.execucoes))}</span>
                </h3>
              )}
              <div className="relatorio-periodo-tabela">
                <table className="tabela-itens">
                  <thead>
                    <tr>
                      <th>Início</th>
                      <th>Fim</th>
                      <th>OS</th>
                      <th>Item</th>
                      <th>Etapa</th>
                      <th>Peças</th>
                      <th>Status</th>
                      <th>Tempo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.execucoes.map((ex) => (
                      <tr key={ex.id}>
                        <td>{hora(ex.inicio)}</td>
                        <td>{dataHoraCurta(ex.dataConclusao || ex.dataPausada, grupo.dia)}</td>
                        <td>
                          {ex.pedidoId ? (
                            <button type="button" className="btn-os-clicavel" onClick={() => setOsCardAbertaId(ex.pedidoId)}>
                              {ex.empresa} — {ex.numeroOS}
                            </button>
                          ) : 'pedido removido'}
                        </td>
                        <td>
                          {ex.codigoDesenho || '—'}
                          {ex.codigoItemCliente && ex.codigoItemCliente !== ex.codigoDesenho && (
                            <span className="chicote-desenho-tamanho"> · {ex.codigoItemCliente}</span>
                          )}
                        </td>
                        <td>{ex.etapaNome ? `${ex.etapaOrdem}. ${ex.etapaNome}` : 'etapa removida'}</td>
                        <td>
                          {ex.quantidadeProduzida ?? '—'}
                          {ex.quantidadePedido != null && <span className="chicote-desenho-tamanho"> / {ex.quantidadePedido}</span>}
                        </td>
                        <td>{statusLabel[ex.status] || ex.status}</td>
                        <td className="tabela-itens-tempo">{formatarCronometro(ex.tempoSegundos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </>
      )}

      {osCardAbertaId && (
        <OsCardModal pedidoId={osCardAbertaId} onClose={() => setOsCardAbertaId(null)} />
      )}
    </>
  );
};

export default RelatorioColaboradorPeriodoPage;
