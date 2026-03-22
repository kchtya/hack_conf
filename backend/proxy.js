const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());

// Раздаём статические файлы игры из папки frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Проксируем API запросы на бэкенд (порт 3000)
app.use('/api', createProxyMiddleware({
    target: 'http://localhost:3000',
    changeOrigin: true
}));

const PORT = 5501;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Serving static files from ../frontend`);
    console.log(`Proxying /api/* to http://localhost:3000/api/*`);
});