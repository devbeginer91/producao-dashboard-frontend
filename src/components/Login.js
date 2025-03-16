import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const Login = ({ setIsAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (username === 'admin' && password === '123456') {
      // Simulação de autenticação (você pode adicionar uma requisição ao backend aqui)
      setIsAuthenticated(true);
      localStorage.setItem('isAuthenticated', 'true'); // Persistir login
      navigate('/'); // Redireciona para o dashboard
    } else {
      try {
        // Se você tiver uma rota de login no backend, use:
        const response = await api.post('/login', { username, password });
        if (response.data.success) {
          setIsAuthenticated(true);
          localStorage.setItem('isAuthenticated', 'true');
          navigate('/');
        } else {
          setError('Usuário ou senha incorretos');
        }
      } catch (err) {
        setError('Erro ao fazer login: ' + err.message);
      }
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>Usuário:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Senha:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
};

export default Login;