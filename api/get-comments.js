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
        authenticateToken(event.headers);

        // 2. Obter o ID do post da query string
        const post_id = event.queryStringParameters?.post_id;

        if (!post_id) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID do post não fornecido.' }) };
        }

        const client = await pool.connect();

        // 3. Buscar todos os comentários do post
        const query = `
            SELECT 
                c.id,
                c.text AS content,
                c.created_at,
                u.username AS author,
                u.profile_picture_url AS "authorAvatar"
            FROM 
                comments c
            JOIN 
                users u ON c.user_id = u.id
            WHERE 
                c.post_id = $1
            ORDER BY 
                c.created_at ASC
        `;
        
        const result = await client.query(query, [post_id]);
        client.release();

        // 4. Retornar os comentários
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                comments: result.rows.map(comment => ({
                    ...comment,
                    authorAvatar: comment.authorAvatar || 'icone.png'
                }))
            })
        };

    } catch (error) {
        console.error('Erro ao buscar comentários:', error);
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    }
};

