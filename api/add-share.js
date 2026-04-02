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

    try {
        // 1. Autenticar o usuário
        const decodedToken = authenticateToken(event.headers);
        const userId = decodedToken.userId;

        // 2. Obter os dados do compartilhamento
        const data = JSON.parse(event.body);
        const { post_id, share_type } = data;

        if (!post_id) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID do post não fornecido.' }) };
        }

        const client = await pool.connect();

        // 3. Registrar o compartilhamento
        const insertQuery = `
            INSERT INTO shares (user_id, post_id, share_type)
            VALUES ($1, $2, $3)
            RETURNING id, created_at
        `;
        await client.query(insertQuery, [userId, post_id, share_type || 'link']);

        // 4. Buscar o total de compartilhamentos do post
        const countQuery = 'SELECT COUNT(*) as count FROM shares WHERE post_id = $1';
        const countResult = await client.query(countQuery, [post_id]);

        client.release();

        // 5. Retornar sucesso
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Compartilhamento registrado!',
                shareCount: parseInt(countResult.rows[0].count)
            })
        };

    } catch (error) {
        console.error('Erro ao registrar compartilhamento:', error);
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    }
};

