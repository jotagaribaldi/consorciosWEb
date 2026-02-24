const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/usuarios – ADMIN vê todos
router.get('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT u.id, u.nome, u.email, u.role, u.ativo, u.created_at,
        COUNT(DISTINCT g.id) AS grupos_gerenciados
      FROM usuarios u
      LEFT JOIN grupos g ON g.gerente_id = u.id
      GROUP BY u.id
      ORDER BY u.role, u.nome
    `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});

// PUT /api/usuarios/:id – ADMIN atualiza role/ativo
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { role, ativo, nome } = req.body;
        if (parseInt(id) === req.user.id)
            return res.status(400).json({ error: 'Você não pode alterar seu próprio perfil aqui' });

        const result = await pool.query(
            'UPDATE usuarios SET role = COALESCE($1, role), ativo = COALESCE($2, ativo), nome = COALESCE($3, nome) WHERE id = $4 RETURNING id, nome, email, role, ativo',
            [role, ativo, nome, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});

// DELETE /api/usuarios/:id – ADMIN desativa (soft delete)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('UPDATE usuarios SET ativo = FALSE WHERE id = $1', [id]);
        res.json({ message: 'Usuário desativado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao desativar usuário' });
    }
});

module.exports = router;
