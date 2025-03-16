import axios from 'axios';

const api = axios.create({
  baseURL: 'https://producao-dashboard-backend.onrender.com',
});

export default api;