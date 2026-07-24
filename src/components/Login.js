import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiLock, FiLogIn, FiAlertCircle } from 'react-icons/fi';
import api from '../api';

const Login = ({ setIsAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/login', { username, password });
      if (response.data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
        navigate('/');
      } else {
        setError('Usuário ou senha incorretos');
      }
    } catch (err) {
      setError('Usuário ou senha incorretos');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <img src="/logoNF.jpg" alt="Logo" className="login-logo" />
        <h2>Controle de Produção</h2>
        <p className="login-subtitle">Entre com suas credenciais para continuar</p>
        <form onSubmit={handleLogin}>
          <div className="login-field">
            <label htmlFor="username">Usuário</label>
            <div className="input-with-icon">
              <FiUser className="input-icon" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>
          <div className="login-field">
            <label htmlFor="password">Senha</label>
            <div className="input-with-icon">
              <FiLock className="input-icon" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
      </div>
    </div>
  );
};

export default Login;