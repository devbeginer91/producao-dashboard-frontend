import React, { useEffect, useState } from 'react';
import { FiMenu, FiUserPlus, FiTrash2, FiUser, FiHash, FiLock, FiBriefcase, FiChevronDown, FiChevronUp, FiClock } from 'react-icons/fi';
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

const UsuariosPCPTab = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    setCarregando(true);
    api.get('/pcp/usuarios')
      .then((r) => setUsuarios(r.data))
      .catch((e) => setMensagem('Erro ao carregar usuários: ' + (e.response?.data?.message || e.message)))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
  }, []);

  const criarUsuario = async (e) => {
    e.preventDefault();
    setMensagem('');
    setSalvando(true);
    try {
      await api.post('/pcp/usuarios', { username, senha, nome });
      setUsername('');
      setSenha('');
      setNome('');
      carregar();
    } catch (error) {
      setMensagem('Erro ao criar login: ' + (error.response?.data?.message || error.message));
    } finally {
      setSalvando(false);
    }
  };

  const removerUsuario = async (usuario) => {
    if (!window.confirm(`Remover o login "${usuario.username}" (${usuario.nome})? Ele não vai mais conseguir entrar no sistema.`)) return;
    try {
      await api.delete(`/pcp/usuarios/${usuario.id}`);
      carregar();
    } catch (error) {
      setMensagem('Erro ao remover: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <>
      {mensagem && <p className="erro">{mensagem}</p>}

      <form className="chicote-dados-form" onSubmit={criarUsuario}>
        <div>
          <label htmlFor="pcp-username"><FiHash /> Usuário</label>
          <input
            id="pcp-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            required
          />
        </div>
        <div>
          <label htmlFor="pcp-senha"><FiLock /> Senha</label>
          <input
            id="pcp-senha"
            type="text"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="off"
            required
          />
        </div>
        <div>
          <label htmlFor="pcp-nome"><FiUser /> Nome</label>
          <input
            id="pcp-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="off"
            required
          />
        </div>
        <button type="submit" className="btn-submit" disabled={salvando}>
          <FiUserPlus /> {salvando ? 'Criando...' : 'Criar login'}
        </button>
      </form>

      <h2 className="op-detalhe-titulo secao-titulo">Logins cadastrados</h2>
      {carregando ? (
        <p className="loading">Carregando...</p>
      ) : usuarios.length === 0 ? (
        <p className="pedido-grid-empty">Nenhum login de PCP cadastrado ainda.</p>
      ) : (
        <div className="op-itens-list">
          {usuarios.map((u) => (
            <div key={u.id} className="op-item-row pcp-usuario-row">
              <span className="op-item-codigo">{u.nome} <span className="chicote-desenho-tamanho">({u.username})</span></span>
              <button type="button" className="btn-excluir" onClick={() => removerUsuario(u)}>
                <FiTrash2 /> Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

const ColaboradoresTab = () => {
  const [colaboradores, setColaboradores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [matricula, setMatricula] = useState('');
  const [nome, setNome] = useState('');
  const [setor, setSetor] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    setCarregando(true);
    api.get('/colaboradores')
      .then((r) => setColaboradores(r.data))
      .catch((e) => setMensagem('Erro ao carregar colaboradores: ' + (e.response?.data?.message || e.message)))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
  }, []);

  const criarColaborador = async (e) => {
    e.preventDefault();
    setMensagem('');
    setSalvando(true);
    try {
      await api.post('/colaboradores', { matricula, nome, setor });
      setMatricula('');
      setNome('');
      setSetor('');
      carregar();
    } catch (error) {
      setMensagem('Erro ao criar login: ' + (error.response?.data?.message || error.message));
    } finally {
      setSalvando(false);
    }
  };

  const [historicoAbertoId, setHistoricoAbertoId] = useState(null);
  const [historico, setHistorico] = useState(null);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  const toggleHistorico = (colaborador) => {
    if (historicoAbertoId === colaborador.id) {
      setHistoricoAbertoId(null);
      setHistorico(null);
      return;
    }
    setHistoricoAbertoId(colaborador.id);
    setHistorico(null);
    setCarregandoHistorico(true);
    api.get(`/colaboradores/${colaborador.id}/execucoes`)
      .then((r) => setHistorico(r.data))
      .catch((e) => setMensagem('Erro ao carregar histórico: ' + (e.response?.data?.message || e.message)))
      .finally(() => setCarregandoHistorico(false));
  };

  const removerExecucao = async (execucaoId, colaboradorId) => {
    if (!window.confirm('Apagar essa execução de tempo? Essa ação não pode ser desfeita.')) return;
    try {
      await api.delete(`/execucoes-etapa/${execucaoId}`);
      const r = await api.get(`/colaboradores/${colaboradorId}/execucoes`);
      setHistorico(r.data);
    } catch (error) {
      setMensagem('Erro ao apagar execução: ' + (error.response?.data?.message || error.message));
    }
  };

  const removerColaborador = async (colaborador) => {
    if (!window.confirm(`Remover o login de "${colaborador.nome}" (matrícula ${colaborador.matricula})? Ele não vai mais conseguir entrar no sistema.`)) return;
    try {
      await api.delete(`/colaboradores/${colaborador.id}`);
      if (historicoAbertoId === colaborador.id) {
        setHistoricoAbertoId(null);
        setHistorico(null);
      }
      carregar();
    } catch (error) {
      const execucoes = error.response?.data?.execucoes;
      if (error.response?.status === 409 && execucoes) {
        const confirmarComHistorico = window.confirm(
          `"${colaborador.nome}" tem ${execucoes} execuç${execucoes === 1 ? 'ão' : 'ões'} de tempo registrada${execucoes === 1 ? '' : 's'}. Remover o login também vai apagar esse histórico. Continuar mesmo assim?`
        );
        if (!confirmarComHistorico) return;
        try {
          await api.delete(`/colaboradores/${colaborador.id}?apagarHistorico=true`);
          if (historicoAbertoId === colaborador.id) {
            setHistoricoAbertoId(null);
            setHistorico(null);
          }
          carregar();
        } catch (error2) {
          setMensagem('Erro ao remover: ' + (error2.response?.data?.message || error2.message));
        }
        return;
      }
      setMensagem('Erro ao remover: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <>
      {mensagem && <p className="erro">{mensagem}</p>}

      <p className="import-desenhos-instrucoes">
        Colaboradores entram com a matrícula cadastrada aqui e a senha padrão compartilhada
        (não é uma senha individual, como no login de PCP).
      </p>

      <form className="chicote-dados-form" onSubmit={criarColaborador}>
        <div>
          <label htmlFor="colab-matricula"><FiHash /> Matrícula</label>
          <input
            id="colab-matricula"
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            autoComplete="off"
            required
          />
        </div>
        <div>
          <label htmlFor="colab-nome"><FiUser /> Nome</label>
          <input
            id="colab-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="off"
            required
          />
        </div>
        <div>
          <label htmlFor="colab-setor"><FiBriefcase /> Setor</label>
          <input
            id="colab-setor"
            value={setor}
            onChange={(e) => setSetor(e.target.value)}
            autoComplete="off"
            required
          />
        </div>
        <button type="submit" className="btn-submit" disabled={salvando}>
          <FiUserPlus /> {salvando ? 'Criando...' : 'Criar login'}
        </button>
      </form>

      <h2 className="op-detalhe-titulo secao-titulo">Logins cadastrados</h2>
      {carregando ? (
        <p className="loading">Carregando...</p>
      ) : colaboradores.length === 0 ? (
        <p className="pedido-grid-empty">Nenhum colaborador cadastrado ainda.</p>
      ) : (
        <div className="op-itens-list">
          {colaboradores.map((c) => (
            <div key={c.id} className="usuario-colaborador-bloco">
              <div className="op-item-row pcp-usuario-row">
                <span className="op-item-codigo">
                  {c.nome} <span className="chicote-desenho-tamanho">(matrícula {c.matricula} · {c.setor})</span>
                </span>
                <div className="usuario-colaborador-acoes">
                  <button type="button" className="btn-editar" onClick={() => toggleHistorico(c)}>
                    <FiClock /> Histórico {historicoAbertoId === c.id ? <FiChevronUp /> : <FiChevronDown />}
                  </button>
                  <button type="button" className="btn-excluir" onClick={() => removerColaborador(c)}>
                    <FiTrash2 /> Remover
                  </button>
                </div>
              </div>

              {historicoAbertoId === c.id && (
                <div className="usuario-colaborador-historico">
                  {carregandoHistorico && <p className="loading">Carregando histórico...</p>}
                  {!carregandoHistorico && historico && historico.execucoes.length === 0 && (
                    <p className="pedido-grid-empty">Nenhuma execução registrada pra esse colaborador.</p>
                  )}
                  {!carregandoHistorico && historico && historico.execucoes.length > 0 && (
                    <table className="tabela-itens">
                      <thead>
                        <tr>
                          <th>Cliente / Chicote</th>
                          <th>Etapa</th>
                          <th>OS</th>
                          <th>Início</th>
                          <th>Fim</th>
                          <th>Tempo</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {historico.execucoes.map((ex) => (
                          <tr key={ex.id}>
                            <td>{ex.cliente} — {ex.codigoItemCliente}</td>
                            <td>{ex.etapaNome}</td>
                            <td>{ex.empresa} — {ex.numeroOS}</td>
                            <td>{formatarDataHora(ex.inicio)}</td>
                            <td>{ex.dataConclusao ? formatarDataHora(ex.dataConclusao) : '—'}</td>
                            <td className="tabela-itens-tempo">{formatarCronometro(ex.tempoSegundos)}</td>
                            <td>{ex.status}</td>
                            <td>
                              <button type="button" className="btn-excluir" onClick={() => removerExecucao(ex.id, c.id)}>
                                <FiTrash2 />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

const UsuariosPage = ({ setSidebarOpen }) => {
  const [aba, setAba] = useState('pcp');

  return (
    <>
      <header className="topbar">
        <button className="btn-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
          <FiMenu />
        </button>
        <h1>Criar Usuários</h1>
      </header>

      <div className="subtabs">
        <button className={`subtab ${aba === 'pcp' ? 'subtab-ativa' : ''}`} onClick={() => setAba('pcp')}>
          PCP
        </button>
        <button className={`subtab ${aba === 'colaboradores' ? 'subtab-ativa' : ''}`} onClick={() => setAba('colaboradores')}>
          Colaboradores
        </button>
      </div>

      {aba === 'pcp' ? <UsuariosPCPTab /> : <ColaboradoresTab />}
    </>
  );
};

export default UsuariosPage;
