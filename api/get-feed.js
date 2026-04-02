/**
 * =================================================================
 * 🧠 GET-FEED.JS - VERSÃO INTELIGENTE COM FILTRO DE BLOQUEIO
 * =================================================================
 */

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Função de autenticação (opcional, mas necessária para saber quem está logado)
const authenticateToken = (headers) => {
    const authHeader = headers.authorization;
    if (!authHeader) return null;
    const token = authHeader.split(' ')[1];
    if (!token) return null;
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
};

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers };
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        const decodedToken = authenticateToken(event.headers);
        const userId = decodedToken ? decodedToken.userId : null;

        // Se não houver usuário logado, não podemos filtrar bloqueios, então retornamos um erro ou um feed genérico.
        // Por segurança, vamos exigir login para ver o feed.
        if (!userId) {
            return { statusCode: 401, headers, body: JSON.stringify({ success: false, message: 'Autenticação necessária para ver o feed.' }) };
        }

        const client = await pool.connect();
        
        // ✅ A MÁGICA ESTÁ AQUI: A NOVA QUERY
        const query = `
            SELECT 
                p.id, p.user_id, p.caption AS text, p.media_url AS media, p.media_type, p.created_at,
                u.username AS author, u.profile_picture_url AS "authorAvatar",
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments,
                (SELECT COUNT(*) FROM shares WHERE post_id = p.id) AS shares,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = $1) > 0 AS "isStarred",
                (SELECT COUNT(*) FROM favorites WHERE post_id = p.id AND user_id = $1) > 0 AS "isRegistered"
            FROM 
                posts p
            JOIN 
                users u ON p.user_id = u.id
            -- ✅ CONDIÇÃO DE FILTRO DE BLOQUEIO:
            -- A cláusula LEFT JOIN + WHERE b.blocker_id IS NULL garante que só pegamos posts
            -- cujo autor (p.user_id) NÃO está na lista de bloqueados pelo usuário logado (userId).
            LEFT JOIN 
                blocks b ON p.user_id = b.blocked_id AND b.blocker_id = $1
WHERE 
    b.blocker_id IS NULL
    AND p.child_id IS NULL
            ORDER BY 
                p.created_at DESC
            LIMIT 20; -- Mantemos a paginação/limite
        `;
        
        const result = await client.query(query, [userId]);
        
        client.release();

        const posts = result.rows.map(post => ({
            ...post,
            time: formatRelativeTime(post.created_at),
            likes: parseInt(post.likes) || 0,
            comments: parseInt(post.comments) || 0,
            shares: parseInt(post.shares) || 0,
            isStarred: post.isStarred || false,
            isRegistered: post.isRegistered || false
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                posts: posts
            })
        };

    } catch (error) {
        console.error('Erro ao buscar feed com filtro de bloqueio:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    }
};

// Função auxiliar para formatar tempo relativo (sem alterações)
function formatRelativeTime(dateString) {
    if (!dateString) return 'agora';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return 'agora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
