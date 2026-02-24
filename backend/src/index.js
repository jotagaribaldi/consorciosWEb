require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());

// Rotas públicas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/invite', require('./routes/invite'));

// Rotas protegidas
app.use('/api/grupos', require('./routes/grupos'));
app.use('/api/participantes', require('./routes/participantes'));
app.use('/api/parcelas', require('./routes/parcelas'));
app.use('/api/sorteio', require('./routes/sorteio'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/usuarios', require('./routes/usuarios'));

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected', timestamp: new Date() });
    } catch (err) {
        res.status(503).json({ status: 'error', database: 'disconnected', error: err.message });
    }
});

// Inicializar schema
async function initSchema() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await pool.query(sql);
        console.log('✅ Schema inicializado');
    } catch (err) {
        console.error('❌ Erro no schema:', err.message);
    }
}

app.listen(PORT, async () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    await initSchema();
});
