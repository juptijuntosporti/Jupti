/**
 * =================================================================
 * 🚫 JUPTI - API para Bloquear Usuário (block-user.js) - VERSÃO ATUALIZADA
 * =================================================================
 * Descrição:
 * - Recebe a ação de um usuário autenticado para bloquear outro.
 * - ✅ NOVO: Agora, além de registrar o bloqueio, a função também
 *   desfaz a relação de "seguir" entre os dois usuários em ambas as direções.
 * - ✅ NOVO: Todas as operações são executadas dentro de uma transação
 *   para garantir a consistência dos dados.
 * =================================================================
 */

// --- 1. IMPORTAÇÕES ---
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// --- 2. FUNÇÃO DE AUTENTICAÇÃO (sem alterações) ---
const authenticateToken = (headers) => {
    const authHeader = headers.authorization;
    if (!authHeader) throw new Error('Token de autenticação não fornecido.');
    const token = authHeader.split(' ')[1];
    if (!token) throw new Error('Token mal formatado.');
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw new Error('Token inválido ou expirado.');
    }
};

// --- 3. HANDLER PRINCIPAL DA FUNÇÃO ---
exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers };
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    let client;

    try {
        // ETAPA 1: Autenticar o usuário que está bloqueando (blocker_id)
        const decodedToken = authenticateToken(event.headers);
        const blockerId = decodedToken.userId;

        // ETAPA 2: Obter o ID do usuário a ser bloqueado (blocked_id)
        const { blockedId } = JSON.parse(event.body);

        // ETAPA 3: Validar os dados (funcionalidade original mantida)
        if (!blockedId) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID do usuário a ser bloqueado é obrigatório.' }) };
        }
        if (blockerId == blockedId) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Um usuário não pode bloquear a si mesmo.' }) };
        }

        client = await pool.connect();

        // ✅ ETAPA 4: INICIAR UMA TRANSAÇÃO NO BANCO DE DADOS
        // Isso garante que todas as operações seguintes aconteçam com sucesso, ou nenhuma delas.
        await client.query('BEGIN');
        console.log(`[TRANSAÇÃO INICIADA] Bloqueio do usuário ${blockerId} para ${blockedId}.`);

        // AÇÃO 4.1: Inserir a relação de bloqueio na tabela 'blocks' (funcionalidade original)
        // Usamos "ON CONFLICT DO NOTHING" para evitar erros caso o bloqueio já exista.
        const insertBlockQuery = `
            INSERT INTO blocks (blocker_id, blocked_id)
            VALUES ($1, $2)
            ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
        `;
        await client.query(insertBlockQuery, [blockerId, blockedId]);
        console.log(` -> Ação 1/3: Registro de bloqueio inserido/confirmado.`);

        // ✅ AÇÃO 4.2: Remover a relação de "seguir" em ambas as direções.
        // Remove o registro onde o "bloqueador" segue o "bloqueado".
        const deleteFollow1Query = `
            DELETE FROM followers WHERE follower_id = $1 AND following_id = $2;
        `;
        await client.query(deleteFollow1Query, [blockerId, blockedId]);
        console.log(` -> Ação 2/3: Relação de seguir (${blockerId} -> ${blockedId}) removida.`);
        
        // Remove o registro onde o "bloqueado" segue o "bloqueador".
        const deleteFollow2Query = `
            DELETE FROM followers WHERE follower_id = $1 AND following_id = $2;
        `;
        await client.query(deleteFollow2Query, [blockedId, blockerId]);
        console.log(` -> Ação 3/3: Relação de seguir (${blockedId} -> ${blockerId}) removida.`);

        // ✅ ETAPA 5: CONFIRMAR A TRANSAÇÃO
        // Se todas as operações acima foram bem-sucedidas, confirma as mudanças no banco.
        await client.query('COMMIT');
        console.log(`[TRANSAÇÃO CONCLUÍDA] Bloqueio e remoção de follows finalizados com sucesso.`);

        // ETAPA 6: Retornar sucesso
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Usuário bloqueado e laços desfeitos com sucesso.'
            })
        };

    } catch (error) {
        // ✅ EM CASO DE ERRO, DESFAZ A TRANSAÇÃO
        if (client) {
            await client.query('ROLLBACK');
            console.error('[TRANSAÇÃO REVERTIDA] Ocorreu um erro durante o processo de bloqueio.');
        }
        console.error('❌ Erro ao bloquear usuário:', error);
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    } finally {
        if (client) {
            client.release();
        }
    }
};
