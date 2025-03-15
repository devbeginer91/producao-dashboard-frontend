const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
      onProxyReq: (proxyReq) => {
        // Desativar CSP para o modo de desenvolvimento
        proxyReq.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-eval';");
      },
    })
  );
};