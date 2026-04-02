/**
 * =================================================================
 * 💬 JUPTI - API para Adicionar Comentário (add-comment.js) - VERSÃO ATUALIZADA
 * =================================================================
 * Descrição:
 * - Insere um novo comentário na tabela `comments`.
 * - ✅ NOVO: Cria uma notificação para o dono do post.
 * =================================================================
 */

// --- 1. IMPORTAÇÕES ---
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// --- 2. FUNÇÃO DE AUTENTICAÇÃO (sem alterações) ---
const authenticateToken = (headers) => {
    const authHeader = headers.authorization;
    if (!authHeader) {
        throw new Error('Token de autenticação não fornecido.');
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        throw new Error('Token mal formatado.');
    }
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
        // Etapa 1: Autenticar o usuário e obter seu ID (quem está comentando)
        const decodedToken = authenticateToken(event.headers);
        const userId = decodedToken.userId;

        // Etapa 2: Obter os dados do corpo da requisição
        const data = JSON.parse(event.body);
        const { post_id, content } = data;

        if (!post_id || !content || content.trim() === '') {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID do post e conteúdo do comentário são obrigatórios.' }) };
        }

        const postIdInt = parseInt(post_id, 10);
        if (isNaN(postIdInt)) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID do post inválido.' }) };
        }

        client = await pool.connect();

        // ✅ NOVO: Buscar o ID do dono do post para enviar a notificação
        const postOwnerResult = await client.query('SELECT user_id FROM posts WHERE id = $1', [postIdInt]);
        if (postOwnerResult.rows.length === 0) {
            throw new Error('Post não encontrado.');
        }
        const postOwnerId = postOwnerResult.rows[0].user_id;

        // Etapa 3: Inserir o comentário no banco de dados
        const insertQuery = `
            INSERT INTO comments (user_id, post_id, text)
            VALUES ($1, $2, $3)
            RETURNING id, created_at;
        `;
        const insertResult = await client.query(insertQuery, [userId, postIdInt, content.trim()]);
        
        // ✅ NOVO: Insere a notificação, APENAS se o usuário não estiver comentando no próprio post
        if (userId !== postOwnerId) {
            const notificationQuery = `
                INSERT INTO notifications (recipient_id, sender_id, type, post_id)
                VALUES ($1, $2, $3, $4)
            `;
            await client.query(notificationQuery, [postOwnerId, userId, 'comment', postIdInt]);
        }

        // Etapa 4: Buscar informações do usuário que comentou (sem alterações)
        const userQuery = 'SELECT username, profile_picture_url FROM users WHERE id = $1';
        const userResult = await client.query(userQuery, [userId]);

        // Etapa 5: Recalcular o total de comentários do post (sem alterações)
        const countQuery = 'SELECT COUNT(*) as count FROM comments WHERE post_id = $1';
        const countResult = await client.query(countQuery, [postIdInt]);

        // Etapa 6: Montar a resposta de sucesso (sem alterações)
        const newComment = {
            id: insertResult.rows[0].id,
            user_id: userId,
            content: content.trim(),
            created_at: insertResult.rows[0].created_at,
            author: userResult.rows[0].username,
            authorAvatar: userResult.rows[0].profile_picture_url || 'icone.png'
        };

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Comentário adicionado com sucesso!',
                comment: newComment,
                commentCount: parseInt(countResult.rows[0].count, 10)
            })
        };

    } catch (error) {
        console.error('❌ Erro ao adicionar comentário:', error);
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
