import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiHash, FiLock, FiLogIn, FiAlertCircle } from 'react-icons/fi';
import api from '../api';

const LoginColaborador = ({ onLogin }) => {
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post('/colaboradores/login', { matricula, senha });
      onLogin({ tipo: 'colaborador', ...response.data });
      navigate('/colaborador');
    } catch (err) {
      setError(err.response?.data?.message || 'Matrícula ou senha incorretos');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <img src="/logoNF.jpg" alt="Logo" className="login-logo" />
        <h2>Colaborador</h2>
        <p className="login-subtitle">Ordens de produção</p>
        <form onSubmit={handleLogin}>
          <div className="login-field">
            <label htmlFor="colab-matricula">Matrícula</label>
            <div className="input-with-icon">
              <FiHash className="input-icon" />
              <input
                id="colab-matricula"
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>
          <div className="login-field">
            <label htmlFor="colab-senha">Senha</label>
            <div className="input-with-icon">
              <FiLock className="input-icon" />
              <input
                id="colab-senha"
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
          <Link to="/cadastro-colaborador">Ainda não tenho cadastro</Link>
          <Link to="/login">Entrar como admin</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginColaborador;
