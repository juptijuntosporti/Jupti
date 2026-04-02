// Arquivo: netlify/functions/get-child-posts.js
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// ==========================================
// Função para autenticar o token JWT
// ==========================================
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

// ==========================================
// Função para formatar tempo relativo
// ==========================================
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

// ==========================================
// Handler principal
// ==========================================
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
        return { 
            statusCode: 405, 
            headers, 
            body: JSON.stringify({ success: false, message: 'Método não permitido.' }) 
        };
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        // 1️⃣ Autenticar usuário logado
        const decodedToken = authenticateToken(event.headers);
        const loggedInUserId = decodedToken.userId;

        // 2️⃣ Obter child_id da query string
        const childId = event.queryStringParameters?.child_id;
        if (!childId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: 'child_id é obrigatório.' })
            };
        }

        console.log(`[get-child-posts] Buscando posts da criança ${childId}. Visualizador: ${loggedInUserId}`);

        const client = await pool.connect();

        // 3️⃣ Query para buscar posts do filho
        const query = `
            SELECT 
                p.id, p.user_id, p.caption AS text, p.media_url AS media, p.media_type, p.created_at,
                c.full_name AS author, c.profile_picture_url AS "authorAvatar",
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments,
                (SELECT COUNT(*) FROM shares WHERE post_id = p.id) AS shares,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = $1) > 0 AS "isStarred",
                (SELECT COUNT(*) FROM favorites WHERE post_id = p.id AND user_id = $1) > 0 AS "isRegistered"
            FROM posts p
            JOIN children c ON p.child_id = c.id
            WHERE p.child_id = $2
            ORDER BY p.created_at DESC;
        `;

        const result = await client.query(query, [loggedInUserId, childId]);
        client.release();

        console.log(`[get-child-posts] Encontrados ${result.rows.length} posts.`);

        // 4️⃣ Formatar posts
        const posts = result.rows.map(post => ({
            ...post,
            time: formatRelativeTime(post.created_at),
            likes: parseInt(post.likes) || 0,
            comments: parseInt(post.comments) || 0,
            shares: parseInt(post.shares) || 0
        }));

        // 5️⃣ Retornar resultado
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                posts: posts,
                totalPosts: posts.length
            })
        };

    } catch (error) {
        console.error('❌ Erro em get-child-posts:', error);
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return {
            statusCode,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    }
};