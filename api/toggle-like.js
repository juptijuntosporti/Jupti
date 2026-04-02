// Arquivo: netlify/functions/toggle-like.js
// VERSÃO ATUALIZADA COM CRIAÇÃO DE NOTIFICAÇÃO

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Função de autenticação (sem alterações)
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

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    let client;

    try {
        // 1. Autenticar o usuário (quem está curtindo)
        const decodedToken = authenticateToken(event.headers);
        const userId = decodedToken.userId;

        // 2. Obter o ID do post
        const data = JSON.parse(event.body);
        const { post_id } = data;

        if (!post_id) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID do post não fornecido.' }) };
        }

        client = await pool.connect();

        // 3. Verificar se o usuário já curtiu o post
        const checkQuery = 'SELECT id FROM likes WHERE user_id = $1 AND post_id = $2';
        const checkResult = await client.query(checkQuery, [userId, post_id]);

        let liked = false;

        // ✅ NOVO: Buscar o ID do dono do post para enviar a notificação
        const postOwnerResult = await client.query('SELECT user_id FROM posts WHERE id = $1', [post_id]);
        if (postOwnerResult.rows.length === 0) {
            throw new Error('Post não encontrado.');
        }
        const postOwnerId = postOwnerResult.rows[0].user_id;

        if (checkResult.rows.length > 0) {
            // Usuário já curtiu, então remove a curtida (unlike)
            const deleteQuery = 'DELETE FROM likes WHERE user_id = $1 AND post_id = $2';
            await client.query(deleteQuery, [userId, post_id]);
            liked = false;

            // ✅ NOVO: Remove a notificação de curtida correspondente
            await client.query(
                'DELETE FROM notifications WHERE type = $1 AND sender_id = $2 AND post_id = $3',
                ['like', userId, post_id]
            );

        } else {
            // Usuário não curtiu ainda, então adiciona a curtida (like)
            const insertQuery = 'INSERT INTO likes (user_id, post_id) VALUES ($1, $2)';
            await client.query(insertQuery, [userId, post_id]);
            liked = true;

            // ✅ NOVO: Insere a notificação, APENAS se o usuário não estiver curtindo o próprio post
            if (userId !== postOwnerId) {
                const notificationQuery = `
                    INSERT INTO notifications (recipient_id, sender_id, type, post_id)
                    VALUES ($1, $2, $3, $4)
                `;
                await client.query(notificationQuery, [postOwnerId, userId, 'like', post_id]);
            }
        }

        // 4. Buscar o total de curtidas do post (sem alterações)
        const countQuery = 'SELECT COUNT(*) as count FROM likes WHERE post_id = $1';
        const countResult = await client.query(countQuery, [post_id]);
        const likeCount = parseInt(countResult.rows[0].count);

        // 5. Retornar sucesso (sem alterações)
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                liked: liked,
                likeCount: likeCount,
                message: liked ? 'Post curtido!' : 'Curtida removida.'
            })
        };

    } catch (error) {
        console.error('Erro ao processar curtida:', error);
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
