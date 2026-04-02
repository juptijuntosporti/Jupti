// Arquivo: netlify/functions/get-followers.js

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
        const userId = decodedToken.userId;

        const client = await pool.connect();

        // 2. Busca todos os seguidores do usuário (pessoas que seguem o usuário)
        const followersResult = await client.query(`
            SELECT 
                u.id,
                u.username,
                u.profile_picture_url,
                f.created_at,
                EXISTS(
                    SELECT 1 FROM followers f2 
                    WHERE f2.follower_id = $1 AND f2.following_id = u.id
                ) as is_following
            FROM followers f
            JOIN users u ON f.follower_id = u.id
            WHERE f.following_id = $1
            ORDER BY f.created_at DESC
        `, [userId]);

        client.release();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                followers: followersResult.rows
            })
        };

    } catch (error) {
        console.error('Erro ao buscar seguidores:', error);
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    }
};

