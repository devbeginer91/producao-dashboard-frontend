import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiLock, FiLogIn, FiAlertCircle } from 'react-icons/fi';
import api from '../api';

const LoginPCP = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post('/pcp/login', { username, senha });
      onLogin({ tipo: 'pcp', ...response.data });
      navigate('/pcp');
    } catch (err) {
      setError(err.response?.data?.message || 'Usuário ou senha incorretos');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <img src="/logoNF.jpg" alt="Logo" className="login-logo" />
        <h2>PCP</h2>
        <p className="login-subtitle">Planejamento e Controle de Produção</p>
        <form onSubmit={handleLogin}>
          <div className="login-field">
            <label htmlFor="pcp-username">Usuário</label>
            <div className="input-with-icon">
              <FiUser className="input-icon" />
              <input
                id="pcp-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>
          <div className="login-field">
            <label htmlFor="pcp-senha">Senha</label>
            <div className="input-with-icon">
              <FiLock className="input-icon" />
              <input
                id="pcp-senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>
          {error && (
            <p className="error">
              <FiAlertCircle /> {error}
            </p>
          )}
          <button type="submit" className="btn-login">
            <FiLogIn /> Entrar
          </button>
        </form>
        <div className="login-links">
          <Link to="/login">Entrar como admin</Link>
          <Link to="/login-colaborador">Entrar como colaborador</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPCP;
