// Arquivo: netlify/functions/remove-follower.js

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
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }

    if (event.httpMethod !== 'DELETE') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        // 1. Autentica o token para obter o ID do usuário logado
        const decodedToken = authenticateToken(event.headers);
        const userId = decodedToken.userId;

        // 2. Obtém o ID do seguidor a ser removido
        const { follower_id } = JSON.parse(event.body);

        if (!follower_id) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID do seguidor não fornecido.' }) };
        }

        const client = await pool.connect();

        // 3. Remove o seguidor (remove a relação onde follower_id segue userId)
        const result = await client.query(
            'DELETE FROM followers WHERE follower_id = $1 AND following_id = $2',
            [follower_id, userId]
        );

        client.release();

        if (result.rowCount === 0) {
            return { statusCode: 404, headers, body: JSON.stringify({ success: false, message: 'Seguidor não encontrado.' }) };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Seguidor removido com sucesso.'
            })
        };

    } catch (error) {
        console.error('Erro ao remover seguidor:', error);
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    }
};

