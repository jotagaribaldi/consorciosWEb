const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, authorize, requireGroupOwner } = require('../middleware/auth');

// POST /api/sorteio/:grupoId – realizar sorteio (ADMIN ou GERENTE dono)
router.post('/:grupoId', authenticate, authorize('admin', 'gerente'), requireGroupOwner, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { grupoId } = req.params;
        const { force } = req.body;

        const grupoRes = await client.query('SELECT * FROM grupos WHERE id = $1', [grupoId]);
        if (grupoRes.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Grupo não encontrado' }); }

        const sorteioExiste = await client.query('SELECT COUNT(*) FROM sorteio_log WHERE grupo_id = $1', [grupoId]);
        if (parseInt(sorteioExiste.rows[0].count) > 0 && !force) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Sorteio já realizado. Use force=true para refazer.', jaRealizado: true });
        }

        if (force) {
            await client.query('DELETE FROM sorteio_log WHERE grupo_id = $1', [grupoId]);
            await client.query('UPDATE participantes SET ordem_sorteio = NULL, mes_contemplado = NULL WHERE grupo_id = $1', [grupoId]);
        }

        const participantesRes = await client.query('SELECT id FROM participantes WHERE grupo_id = $1 ORDER BY id', [grupoId]);
        const ids = participantesRes.rows.map(p => p.id);
        if (ids.length === 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Nenhum participante encontrado' }); }

        // Fisher-Yates
        for (let i = ids.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ids[i], ids[j]] = [ids[j], ids[i]];
        }

        for (let i = 0; i < ids.length; i++) {
            await client.query('UPDATE participantes SET ordem_sorteio = $1, mes_contemplado = $2 WHERE id = $3', [i + 1, i + 1, ids[i]]);
            await client.query('INSERT INTO sorteio_log (grupo_id, participante_id, mes_sorteado) VALUES ($1,$2,$3)', [grupoId, ids[i], i + 1]);
        }
        await client.query('COMMIT');

        const finalRes = await pool.query(
            'SELECT id, nome, ordem_sorteio, mes_contemplado FROM participantes WHERE grupo_id = $1 ORDER BY ordem_sorteio',
            [grupoId]
        );
        res.json({ message: 'Sorteio realizado com sucesso!', resultado: finalRes.rows });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Erro ao realizar sorteio' });
    } finally {
        client.release();
    }
});

// GET /api/sorteio/:grupoId – resultado do sorteio
router.get('/:grupoId', authenticate, async (req, res) => {
    try {
        const { grupoId } = req.params;
        // CONSORCIADO só pode ver grupos em que participa
        if (req.user.role === 'consorciado') {
            const member = await pool.query(
                'SELECT id FROM participantes WHERE grupo_id = $1 AND usuario_id = $2',
                [grupoId, req.user.id]
            );
            if (member.rows.length === 0)
                return res.status(403).json({ error: 'Acesso negado' });
        }

        const result = await pool.query(`
      SELECT p.id, p.nome, p.email, p.telefone, p.ordem_sorteio, p.mes_contemplado, sl.data_sorteio
      FROM participantes p
      LEFT JOIN sorteio_log sl ON sl.participante_id = p.id AND sl.grupo_id = p.grupo_id
      WHERE p.grupo_id = $1
      ORDER BY p.ordem_sorteio NULLS LAST
    `, [grupoId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar resultado do sorteio' });
    }
});

// PUT /api/sorteio/:grupoId/ajustar – GERENTE ajusta manualmente a ordem
router.put('/:grupoId/ajustar', authenticate, authorize('admin', 'gerente'), requireGroupOwner, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { grupoId } = req.params;
        const { ordens } = req.body; // [{ participante_id, ordem_sorteio }]

        if (!Array.isArray(ordens) || ordens.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Informe o array de ordens' });
        }

        // Validar que todas as ordens são únicas
        const ordemNums = ordens.map(o => o.ordem_sorteio);
        if (new Set(ordemNums).size !== ordemNums.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Ordens duplicadas detectadas' });
        }

        for (const { participante_id, ordem_sorteio } of ordens) {
            await client.query(
                'UPDATE participantes SET ordem_sorteio = $1, mes_contemplado = $1 WHERE id = $2 AND grupo_id = $3',
                [ordem_sorteio, participante_id, grupoId]
            );
        }

        // Atualizar log de sorteio
        await client.query('DELETE FROM sorteio_log WHERE grupo_id = $1', [grupoId]);
        for (const { participante_id, ordem_sorteio } of ordens) {
            await client.query(
                'INSERT INTO sorteio_log (grupo_id, participante_id, mes_sorteado) VALUES ($1,$2,$3)',
                [grupoId, participante_id, ordem_sorteio]
            );
        }

        await client.query('COMMIT');

        const finalRes = await pool.query(
            'SELECT id, nome, ordem_sorteio, mes_contemplado FROM participantes WHERE grupo_id = $1 ORDER BY ordem_sorteio',
            [grupoId]
        );
        res.json({ message: 'Ordem ajustada com sucesso!', resultado: finalRes.rows });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Erro ao ajustar ordem' });
    } finally {
        client.release();
    }
});

module.exports = router;
