const jwt = require('jsonwebtoken');
const pool = require('../db');

// Verifica JWT e carrega usuário
async function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de autenticação necessário' });
    }
    const token = header.slice(7);
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query(
            'SELECT id, nome, email, role, ativo FROM usuarios WHERE id = $1',
            [payload.id]
        );
        if (result.rows.length === 0 || !result.rows[0].ativo) {
            return res.status(401).json({ error: 'Usuário inativo ou não encontrado' });
        }
        req.user = result.rows[0];
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
}

// Restringe acesso a roles específicas
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Acesso não autorizado para este perfil' });
        }
        next();
    };
}

// Verifica se GERENTE é dono do grupo (ou se é ADMIN)
async function requireGroupOwner(req, res, next) {
    if (req.user.role === 'admin') return next();
    const grupoId = req.params.id || req.params.grupoId;
    try {
        const result = await pool.query(
            'SELECT gerente_id FROM grupos WHERE id = $1',
            [grupoId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Grupo não encontrado' });
        }
        if (result.rows[0].gerente_id !== req.user.id) {
            return res.status(403).json({ error: 'Apenas o gerente do grupo pode realizar esta ação' });
        }
        next();
    } catch (err) {
        res.status(500).json({ error: 'Erro ao verificar permissão' });
    }
}

module.exports = { authenticate, authorize, requireGroupOwner };
