// Arquivo: netlify/functions/get-user-posts.js

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Função para autenticar o token (necessária para saber quem é o usuário logado)
const authenticateToken = (headers) => {
    const authHeader = headers.authorization;
    if (!authHeader) throw new Error('Token de autenticação não fornecido.');
    const token = authHeader.split(' ')[1];
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw new Error('Token inválido ou expirado.');
    }
};

// Função para formatar tempo relativo
function formatRelativeTime(dateString) {
    if (!dateString) return 'agora';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return `${seconds}s`;
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        // Autentica para saber quem é o "visualizador"
        const decodedToken = authenticateToken(event.headers);
        const loggedInUserId = decodedToken.userId;

        // ✅ ALTERAÇÃO PRINCIPAL: Verifica se um ID foi passado na URL
        const userIdToFetch = event.queryStringParameters?.id || loggedInUserId;
        console.log(`[get-user-posts] Buscando posts para o usuário ID: ${userIdToFetch}. Visualizador: ${loggedInUserId}`);

        const client = await pool.connect();
        
        // A query agora usa o 'userIdToFetch' para buscar os posts
        // E o 'loggedInUserId' para verificar se o visualizador curtiu/favoritou
        const query = `
            SELECT 
                p.id, p.user_id, p.caption AS text, p.media_url AS media, p.media_type, p.created_at,
                u.username AS author, u.profile_picture_url AS "authorAvatar",
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments,
                (SELECT COUNT(*) FROM shares WHERE post_id = p.id) AS shares,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = $1) > 0 AS "isStarred",
                (SELECT COUNT(*) FROM favorites WHERE post_id = p.id AND user_id = $1) > 0 AS "isRegistered"
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id = $2
  AND p.child_id IS NULL -- Busca posts do usuário alvo
            ORDER BY p.created_at DESC;
        `;
        
        // Passamos os dois IDs para a query
        const result = await client.query(query, [loggedInUserId, userIdToFetch]);
        client.release();
        
        console.log(`[get-user-posts] Encontrados ${result.rows.length} posts para o usuário ${userIdToFetch}.`);

        const posts = result.rows.map(post => ({
            ...post,
            time: formatRelativeTime(post.created_at),
            likes: parseInt(post.likes) || 0,
            comments: parseInt(post.comments) || 0,
            shares: parseInt(post.shares) || 0
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, posts: posts })
        };

    } catch (error) {
        console.error('❌ Erro em get-user-posts:', error);
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    }
};
