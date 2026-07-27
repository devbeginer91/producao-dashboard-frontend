import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiHash, FiUser, FiBriefcase, FiUserPlus, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import api from '../api';

const CadastroColaborador = () => {
  const [matricula, setMatricula] = useState('');
  const [nome, setNome] = useState('');
  const [setor, setSetor] = useState('');
  const [error, setError] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const navigate = useNavigate();

  const handleCadastro = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/colaboradores', { matricula, nome, setor });
      setSucesso(true);
      setTimeout(() => navigate('/login-colaborador'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao cadastrar. Tente novamente.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <img src="/logoNF.jpg" alt="Logo" className="login-logo" />
        <h2>Cadastro de Colaborador</h2>
        <p className="login-subtitle">Preencha seus dados para começar</p>

        {sucesso ? (
          <p className="sucesso-cadastro">
            <FiCheckCircle /> Cadastro realizado! Redirecionando para o login...
          </p>
        ) : (
          <form onSubmit={handleCadastro}>
            <div className="login-field">
              <label htmlFor="cad-matricula">Número de matrícula</label>
              <div className="input-with-icon">
                <FiHash className="input-icon" />
                <input
                  id="cad-matricula"
                  type="text"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>
            </div>
            <div className="login-field">
              <label htmlFor="cad-nome">Nome</label>
              <div className="input-with-icon">
                <FiUser className="input-icon" />
                <input
                  id="cad-nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>
            </div>
            <div className="login-field">
              <label htmlFor="cad-setor">Setor</label>
              <div className="input-with-icon">
                <FiBriefcase className="input-icon" />
                <input
                  id="cad-setor"
                  type="text"
                  value={setor}
                  onChange={(e) => setSetor(e.target.value)}
                  autoComplete="off"
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
              <FiUserPlus /> Cadastrar
            </button>
          </form>
        )}

        <div className="login-links">
          <Link to="/login-colaborador">Já tenho cadastro</Link>
        </div>
      </div>
    </div>
  );
};

export default CadastroColaborador;
