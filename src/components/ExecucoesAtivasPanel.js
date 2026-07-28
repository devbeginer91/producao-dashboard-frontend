import React, { useEffect, useRef, useState } from 'react';
import { FiActivity, FiUser } from 'react-icons/fi';
import api from '../api';

const formatarCronometro = (segundos) => {
  const totalSegundos = Math.max(0, Math.round(segundos));
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

const ExecucoesAtivasPanel = () => {
  const [execucoes, setExecucoes] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [, forcarTick] = useState(0);
  const referencias = useRef({});

  const carregar = () => {
    api.get('/execucoes-etapa/ativas')
      .then((r) => {
        setExecucoes(r.data);
        const mapa = {};
        r.data.forEach((exec) => {
          mapa[exec.id] = {
            baseSegundos: exec.tempoAcumuladoBase,
            referenciaInicio: new Date(exec.referenciaInicio).getTime(),
          };
        });
        referencias.current = mapa;
      })
      .catch(() => {})
      .finally(() => setCarregado(true));
  };

  useEffect(() => {
    carregar();
    const poll = setInterval(carregar, 30000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    const t = setInterval(() => forcarTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const tempoAtual = (exec) => {
    const ref = referencias.current[exec.id];
    if (!ref) return exec.tempoAcumuladoBase;
    return ref.baseSegundos + (Date.now() - ref.referenciaInicio) / 1000;
  };

  if (!carregado || execucoes.length === 0) return null;

  return (
    <div className="execucoes-ativas-panel">
      <h2 className="secao-titulo"><FiActivity /> Em Execução Agora</h2>
      <div className="execucoes-ativas-grid">
        {execucoes.map((exec) => (
          <div key={exec.id} className="execucao-ativa-card">
            <div className="execucao-ativa-header">
              <span className="execucao-ativa-empresa">{exec.empresa}</span>
              <span className="execucao-ativa-os">OS {exec.numeroOS}</span>
            </div>
            <div className="execucao-ativa-item">{exec.codigoDesenho}</div>
            <div className="execucao-ativa-etapa">{exec.etapaOrdem}. {exec.etapaNome}</div>
            <div className="execucao-ativa-rodape">
              <span className="execucao-ativa-colaborador"><FiUser /> {exec.colaboradorNome}</span>
              <span className="execucao-ativa-tempo">{formatarCronometro(tempoAtual(exec))}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExecucoesAtivasPanel;
