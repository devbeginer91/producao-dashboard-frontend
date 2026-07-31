import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiX } from 'react-icons/fi';
import api from '../api';
import { formatarDataHora } from '../utils';

const POLL_MS = 8000;
const TOAST_DURACAO_MS = 8000;

const NotificacoesSino = () => {
  const [notificacoes, setNotificacoes] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [toasts, setToasts] = useState([]);
  const ultimoIdVistoRef = useRef(null);
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const dispensarToast = (toastId) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  };

  const buscar = () => {
    api.get('/notificacoes')
      .then((r) => {
        const dados = r.data;
        setNotificacoes(dados);
        const maiorId = dados.length > 0 ? dados[0].id : 0;

        if (ultimoIdVistoRef.current === null) {
          ultimoIdVistoRef.current = maiorId;
          return;
        }

        const novas = dados.filter((n) => n.id > ultimoIdVistoRef.current);
        if (novas.length > 0) {
          const novosToasts = novas.map((n) => ({ ...n, toastId: `${n.id}-${Date.now()}` }));
          setToasts((prev) => [...novosToasts, ...prev]);
          novosToasts.forEach((t) => {
            setTimeout(() => dispensarToast(t.toastId), TOAST_DURACAO_MS);
          });
          ultimoIdVistoRef.current = maiorId;
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    buscar();
    const poll = setInterval(buscar, POLL_MS);
    return () => clearInterval(poll);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const fecharFora = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', fecharFora);
    return () => document.removeEventListener('mousedown', fecharFora);
  }, []);

  const abrirNotificacao = (n) => {
    setAberto(false);
    if (n.rota) navigate(n.rota);
  };

  return (
    <>
      <div className="notificacoes-sino-container" ref={containerRef}>
        <button className="notificacoes-sino-botao" onClick={() => setAberto((v) => !v)} aria-label="Notificações">
          <FiBell />
          {notificacoes.length > 0 && (
            <span className="notificacoes-sino-badge">{notificacoes.length > 9 ? '9+' : notificacoes.length}</span>
          )}
        </button>
        {aberto && (
          <div className="notificacoes-sino-dropdown">
            {notificacoes.length === 0 ? (
              <p className="notificacoes-sino-vazio">Nenhuma notificação ainda.</p>
            ) : (
              notificacoes.map((n) => (
                <button key={n.id} type="button" className="notificacoes-sino-item" onClick={() => abrirNotificacao(n)}>
                  <span className="notificacoes-sino-item-titulo">{n.titulo}</span>
                  {n.mensagem && <span className="notificacoes-sino-item-mensagem">{n.mensagem}</span>}
                  <span className="notificacoes-sino-item-data">{formatarDataHora(n.criadoEm)}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="notificacoes-toast-stack">
        {toasts.map((t) => (
          <div key={t.toastId} className="notificacoes-toast" onClick={() => { dispensarToast(t.toastId); abrirNotificacao(t); }}>
            <div className="notificacoes-toast-conteudo">
              <span className="notificacoes-toast-titulo">{t.titulo}</span>
              {t.mensagem && <span className="notificacoes-toast-mensagem">{t.mensagem}</span>}
            </div>
            <button
              type="button"
              className="notificacoes-toast-fechar"
              onClick={(e) => { e.stopPropagation(); dispensarToast(t.toastId); }}
              aria-label="Fechar"
            >
              <FiX />
            </button>
          </div>
        ))}
      </div>
    </>
  );
};

export default NotificacoesSino;
