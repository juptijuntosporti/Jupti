// Arquivo: netlify/functions/check-follow-status.js

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Função para autenticar o token enviado no cabeçalho da requisição
const authenticateToken = (headers) => {
    const authHeader = headers.authorization;
    if (!authHeader) throw new Error('Token de autenticação não fornecido.');
    
    const token = authHeader.split(' ')[1]; // Formato "Bearer TOKEN"
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
        // 1. Autentica o token para obter o ID do usuário logado
        const decodedToken = authenticateToken(event.headers);
        const followerId = decodedToken.userId;

        // 2. Obtém o ID do usuário para verificar
        const params = event.queryStringParameters || {};
        const followingId = params.following_id;

        if (!followingId) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID do usuário não fornecido.' }) };
        }

        const client = await pool.connect();

        // 3. Verifica se está seguindo
        const result = await client.query(
            'SELECT * FROM followers WHERE follower_id = $1 AND following_id = $2',
            [followerId, followingId]
        );

        client.release();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                isFollowing: result.rows.length > 0
            })
        };

    } catch (error) {
        console.error('Erro ao verificar status de follow:', error);
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    }
};

