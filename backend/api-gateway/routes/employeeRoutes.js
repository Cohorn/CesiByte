
const express = require('express');
const router = express.Router();
const { createProxyMiddleware } = require('http-proxy-middleware');

// Environment variables
const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3006';

// Proxy all employee service requests
router.use('/', createProxyMiddleware({
  target: EMPLOYEE_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/employee': '/api'  // rewrite path
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[${new Date().toISOString()}] Forwarding employee request to: ${EMPLOYEE_SERVICE_URL}${req.url.replace(/^\/employee/, '/api')}`);
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[${new Date().toISOString()}] Employee service responded with status: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
  },
  onError: (err, req, res) => {
    console.error(`Employee service proxy error: ${err.message}`);
    console.error('Error details:', err.code, err.stack);
    
    if (err.code === 'ECONNREFUSED') {
      res.status(503).json({ error: 'Employee service unavailable', details: 'Connection refused' });
    } else if (err.code === 'ETIMEDOUT') {
      res.status(504).json({ error: 'Employee service timeout', details: 'Request timed out' });
    } else {
      res.status(500).json({ error: 'Employee service error', details: err.message });
    }
  }
}));

module.exports = router;
