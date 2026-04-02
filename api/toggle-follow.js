// Arquivo: netlify/functions/toggle-follow.js
// VERSÃO ATUALIZADA COM CRIAÇÃO DE NOTIFICAÇÃO

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Função para autenticar o token (continua a mesma)
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

exports.handler = async (event, context) => {
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
    let client; // Declaramos o client aqui para usá-lo no bloco 'finally'

    try {
        // 1. Autentica o token para obter o ID do usuário logado (quem está seguindo)
        const decodedToken = authenticateToken(event.headers);
        const followerId = decodedToken.userId; 

        // 2. Obtém o ID do usuário a ser seguido
        const { following_id } = JSON.parse(event.body);

        if (!following_id) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID do usuário a seguir não fornecido.' }) };
        }

        if (followerId === following_id) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Você não pode seguir a si mesmo.' }) };
        }

        client = await pool.connect();

        // 3. Verifica se já está seguindo
        const checkResult = await client.query(
            'SELECT * FROM followers WHERE follower_id = $1 AND following_id = $2',
            [followerId, following_id]
        );

        let isFollowing = false;
        let message = '';

        if (checkResult.rows.length > 0) {
            // Já está seguindo, então remove o follow (unfollow)
            await client.query(
                'DELETE FROM followers WHERE follower_id = $1 AND following_id = $2',
                [followerId, following_id]
            );
            isFollowing = false;
            message = 'Você deixou de acompanhar este usuário.';
            
            // ✅ NOVO: Lógica para remover a notificação se o usuário deixar de seguir.
            // Isso evita que a notificação permaneça se o usuário se arrepender.
            await client.query(
                'DELETE FROM notifications WHERE type = $1 AND sender_id = $2 AND recipient_id = $3',
                ['follow', followerId, following_id]
            );

        } else {
            // Não está seguindo, então adiciona o follow
            await client.query(
                'INSERT INTO followers (follower_id, following_id) VALUES ($1, $2)',
                [followerId, following_id]
            );
            isFollowing = true;
            message = 'Agora você está acompanhando este usuário!';

            // ✅ NOVO: Insere a notificação na tabela 'notifications'
            // Este é o coração da nova funcionalidade.
            const notificationQuery = `
                INSERT INTO notifications (recipient_id, sender_id, type)
                VALUES ($1, $2, $3)
            `;
            await client.query(notificationQuery, [following_id, followerId, 'follow']);
        }

        // Retorna a resposta de sucesso (continua a mesma)
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                isFollowing: isFollowing,
                message: message
            })
        };

    } catch (error) {
        console.error('Erro ao alternar follow:', error);
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    } finally {
        // Garante que a conexão com o banco seja sempre liberada
        if (client) {
            client.release();
        }
    }
};
