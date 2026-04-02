const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Função de autenticação
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

// Função para formatar tempo relativo
const formatRelativeTime = (date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInSeconds = Math.floor((now - postDate) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}sem`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mes`;
    return `${Math.floor(diffInSeconds / 31536000)}a`;
};

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        // 1. Autenticar o usuário
        const decodedToken = authenticateToken(event.headers);
        const userId = decodedToken.userId;

        const client = await pool.connect();

        // 2. Buscar posts favoritados pelo usuário
        const query = `
            SELECT 
                p.id,
                p.user_id,
                p.caption AS text,
                p.media_url AS media,
                p.media_type,
                p.created_at,
                u.username AS author,
                u.profile_picture_url AS "authorAvatar",
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments,
                (SELECT COUNT(*) FROM shares WHERE post_id = p.id) AS shares,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = $1) > 0 AS "isStarred",
                true AS "isRegistered"
            FROM favorites f
            JOIN posts p ON f.post_id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE f.user_id = $1
            ORDER BY f.created_at DESC
        `;
        
        const result = await client.query(query, [userId]);
        client.release();

        // 3. Formatar os posts
        const posts = result.rows.map(post => ({
            ...post,
            time: formatRelativeTime(post.created_at),
            authorAvatar: post.authorAvatar || 'icone.png',
            likes: parseInt(post.likes) || 0,
            comments: parseInt(post.comments) || 0,
            shares: parseInt(post.shares) || 0
        }));

        // 4. Retornar os posts favoritados
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                posts: posts
            })
        };

    } catch (error) {
        console.error('Erro ao buscar posts favoritados:', error);
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    }
};

