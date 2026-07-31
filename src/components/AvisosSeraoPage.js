import React, { useEffect, useState } from 'react';
import { FiMenu, FiPlus, FiChevronDown, FiChevronUp, FiTrash2, FiUsers, FiClock } from 'react-icons/fi';
import api from '../api';
import { formatarDataHora } from '../utils';

export const RESPOSTA_LABELS = {
  nao_vai: 'Não vou ficar',
  ate_1825: 'Vou ficar até 18:25',
  ate_1930: 'Vou ficar até 19:30',
  ate_2000: 'Vou ficar até 20:00',
  ate_2100: 'Vou ficar até 21:00',
};

const formatarData = (data) => {
  if (!data) return '—';
  const parsedDate = new Date(`${data}T00:00:00`);
  if (isNaN(parsedDate)) return '—';
  return parsedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const datetimeLocalParaTexto = (valor) => valor.replace('T', ' ') + ':00';

const AvisosSeraoPage = ({ setSidebarOpen }) => {
  const [avisos, setAvisos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [data, setData] = useState('');
  const [horarioLimite, setHorarioLimite] = useState('');

  const [avisoAbertoId, setAvisoAbertoId] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  const carregar = () => {
    setCarregando(true);
    api.get('/avisos-serao')
      .then((r) => setAvisos(r.data))
      .catch((e) => setMensagem('Erro ao carregar avisos: ' + (e.response?.data?.message || e.message)))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
  }, []);

  const criarAviso = async (e) => {
    e.preventDefault();
    if (!data || !horarioLimite) {
      setMensagem('Preencha data e horário limite.');
      return;
    }
    setMensagem('');
    setSalvando(true);
    try {
      await api.post('/avisos-serao', {
        data,
        horarioLimite: datetimeLocalParaTexto(horarioLimite),
      });
      setData('');
      setHorarioLimite('');
      carregar();
    } catch (error) {
      setMensagem('Erro ao criar aviso: ' + (error.response?.data?.message || error.message));
    } finally {
      setSalvando(false);
    }
  };

  const toggleDetalhe = (aviso) => {
    if (avisoAbertoId === aviso.id) {
      setAvisoAbertoId(null);
      setDetalhe(null);
      return;
    }
    setAvisoAbertoId(aviso.id);
    setDetalhe(null);
    setCarregandoDetalhe(true);
    api.get(`/avisos-serao/${aviso.id}`)
      .then((r) => setDetalhe(r.data))
      .catch((e) => setMensagem('Erro ao carregar respostas: ' + (e.response?.data?.message || e.message)))
      .finally(() => setCarregandoDetalhe(false));
  };

  const encerrarAviso = async (aviso) => {
    if (!window.confirm(`Encerrar o aviso de serão de ${formatarData(aviso.data)}? As respostas registradas serão apagadas junto.`)) return;
    try {
      await api.delete(`/avisos-serao/${aviso.id}`);
      if (avisoAbertoId === aviso.id) {
        setAvisoAbertoId(null);
        setDetalhe(null);
      }
      carregar();
    } catch (error) {
      setMensagem('Erro ao encerrar aviso: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <>
      <header className="topbar">
        <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
          <FiMenu />
        </button>
        <h1>Avisos de Serão</h1>
      </header>

      {mensagem && <p className="erro">{mensagem}</p>}

      <form className="chicote-dados-form" onSubmit={criarAviso}>
        <div>
          <label htmlFor="serao-data">Data do serão</label>
          <input id="serao-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="serao-horario-limite">Horário limite pra responder</label>
          <input
            id="serao-horario-limite"
            type="datetime-local"
            value={horarioLimite}
            onChange={(e) => setHorarioLimite(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-submit" disabled={salvando}>
          <FiPlus /> {salvando ? 'Criando...' : 'Criar aviso'}
        </button>
      </form>

      <h2 className="op-detalhe-titulo secao-titulo">Avisos abertos</h2>
      {carregando ? (
        <p className="loading">Carregando...</p>
      ) : avisos.length === 0 ? (
        <p className="pedido-grid-empty">Nenhum aviso de serão aberto no momento.</p>
      ) : (
        <div className="op-itens-list">
          {avisos.map((aviso) => {
            const expirado = new Date(aviso.horarioLimite) < new Date();
            return (
              <div key={aviso.id} className="usuario-colaborador-bloco">
                <div className="op-item-row pcp-usuario-row">
                  <span className="op-item-codigo">
                    Serão {formatarData(aviso.data)}
                    <span className="chicote-desenho-tamanho">
                      {' '}— respondem até {formatarDataHora(aviso.horarioLimite)}
                      {expirado ? ' (encerrado pra respostas)' : ''}
                    </span>
                  </span>
                  <div className="usuario-colaborador-acoes">
                    <span className={`pcp-status ${aviso.totalRespondidos >= aviso.totalConvocados ? 'pcp-status-andamento' : ''}`}>
                      <FiUsers /> {aviso.totalRespondidos}/{aviso.totalConvocados} respondidos
                    </span>
                    <button type="button" className="btn-editar" onClick={() => toggleDetalhe(aviso)}>
                      <FiClock /> Respostas {avisoAbertoId === aviso.id ? <FiChevronUp /> : <FiChevronDown />}
                    </button>
                    <button type="button" className="btn-excluir" onClick={() => encerrarAviso(aviso)}>
                      <FiTrash2 /> Encerrar
                    </button>
                  </div>
                </div>

                {avisoAbertoId === aviso.id && (
                  <div className="usuario-colaborador-historico">
                    {carregandoDetalhe && <p className="loading">Carregando respostas...</p>}
                    {!carregandoDetalhe && detalhe && detalhe.colaboradores.length === 0 && (
                      <p className="pedido-grid-empty">Nenhum colaborador cadastrado ainda.</p>
                    )}
                    {!carregandoDetalhe && detalhe && detalhe.colaboradores.length > 0 && (
                      <table className="tabela-itens">
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>Matrícula</th>
                            <th>Setor</th>
                            <th>Resposta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detalhe.colaboradores.map((c) => (
                            <tr key={c.id}>
                              <td>{c.nome}</td>
                              <td>{c.matricula}</td>
                              <td>{c.setor}</td>
                              <td>
                                {c.resposta ? (
                                  <span className="pcp-status pcp-status-andamento">{RESPOSTA_LABELS[c.resposta] || c.resposta}</span>
                                ) : (
                                  <span className="pcp-status">ainda não respondeu</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default AvisosSeraoPage;
