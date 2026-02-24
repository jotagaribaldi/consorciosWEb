const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const signToken = (user) =>
    jwt.sign(
        { id: user.id, role: user.role, nome: user.nome, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

// POST /api/auth/register – Cadastro (cria CONSORCIADO)
router.post('/register', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        if (!nome || !email || !senha)
            return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });

        const exists = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
        if (exists.rows.length > 0)
            return res.status(409).json({ error: 'Email já cadastrado' });

        const senha_hash = await bcrypt.hash(senha, 12);
        const result = await pool.query(
            `INSERT INTO usuarios (nome, email, senha_hash, role) VALUES ($1,$2,$3,'consorciado') RETURNING id, nome, email, role`,
            [nome, email, senha_hash]
        );
        const user = result.rows[0];
        res.status(201).json({ token: signToken(user), user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao cadastrar usuário' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha)
            return res.status(400).json({ error: 'Email e senha obrigatórios' });

        const result = await pool.query(
            'SELECT id, nome, email, role, senha_hash, ativo FROM usuarios WHERE email = $1',
            [email]
        );
        if (result.rows.length === 0)
            return res.status(401).json({ error: 'Credenciais inválidas' });

        const user = result.rows[0];
        if (!user.ativo)
            return res.status(403).json({ error: 'Conta desativada. Contate o administrador.' });

        const valid = await bcrypt.compare(senha, user.senha_hash);
        if (!valid)
            return res.status(401).json({ error: 'Credenciais inválidas' });

        const { senha_hash, ...userOut } = user;
        res.json({ token: signToken(userOut), user: userOut });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no login' });
    }
});

// GET /api/auth/me – dados completos do usuário logado (inclui telefone e chave_pix)
router.get('/me', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nome, email, role, ativo, telefone, chave_pix FROM usuarios WHERE id = $1',
            [req.user.id]
        );
        res.json({ user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});

// PUT /api/auth/perfil – atualizar telefone e chave_pix (qualquer usuário logado)
router.put('/perfil', authenticate, async (req, res) => {
    try {
        const { telefone, chave_pix, nome } = req.body;
        const result = await pool.query(
            `UPDATE usuarios SET
                telefone  = COALESCE($1, telefone),
                chave_pix = COALESCE($2, chave_pix),
                nome      = COALESCE($3, nome)
             WHERE id = $4
             RETURNING id, nome, email, role, ativo, telefone, chave_pix`,
            [telefone || null, chave_pix || null, nome || null, req.user.id]
        );
        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
});

// PUT /api/auth/change-password – trocar senha
router.put('/change-password', authenticate, async (req, res) => {
    try {
        const { senha_atual, nova_senha } = req.body;
        if (!senha_atual || !nova_senha)
            return res.status(400).json({ error: 'Informe a senha atual e a nova senha' });

        const result = await pool.query('SELECT senha_hash FROM usuarios WHERE id = $1', [req.user.id]);
        const valid = await bcrypt.compare(senha_atual, result.rows[0].senha_hash);
        if (!valid)
            return res.status(401).json({ error: 'Senha atual incorreta' });

        const nova_hash = await bcrypt.hash(nova_senha, 12);
        await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [nova_hash, req.user.id]);
        res.json({ message: 'Senha alterada com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao alterar senha' });
    }
});

// GET ou POST /api/auth/seed-admin – cria admin inicial via navegador ou curl
// Só funciona se não houver nenhum admin cadastrado ainda
async function seedAdmin(req, res) {
    try {
        const exists = await pool.query("SELECT id FROM usuarios WHERE role = 'admin' LIMIT 1");
        if (exists.rows.length > 0)
            return res.status(409).json({ error: 'Admin já existe. Faça login com suas credenciais.' });

        const email = process.env.ADMIN_EMAIL || 'admin@consorciapp.com';
        const senha = process.env.ADMIN_SENHA || 'Admin@123';
        const senha_hash = await bcrypt.hash(senha, 12);

        const result = await pool.query(
            `INSERT INTO usuarios (nome, email, senha_hash, role) VALUES ('Administrador',$1,$2,'admin') RETURNING id, nome, email, role`,
            [email, senha_hash]
        );
        res.status(201).json({
            message: '✅ Admin criado com sucesso! Acesse /login para entrar.',
            credenciais: { email, senha },
            user: result.rows[0],
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar admin' });
    }
}
router.get('/seed-admin', seedAdmin);
router.post('/seed-admin', seedAdmin);


module.exports = router;
