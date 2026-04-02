// Arquivo: netlify/functions/get-profile-data.js

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Função para autenticar o token enviado no cabeçalho da requisição
const authenticateToken = (headers) => {
    const authHeader = headers.authorization;
    if (!authHeader) throw new Error('Token de autenticação não fornecido.');
    
    const token = authHeader.split(' ')[1]; // Formato "Bearer TOKEN"
    if (!token) throw new Error('Token mal formatado.');

    try {
        // Verifica o token usando a chave secreta e retorna os dados decodificados (payload)
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw new Error('Token inválido ou expirado.');
    }
};

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS', // Permitir método GET
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }
    // Apenas o método GET é permitido para esta função
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        // 1. Autentica o token para obter o ID do usuário
        const decodedToken = authenticateToken(event.headers);
        const userId = decodedToken.userId;

        const client = await pool.connect();

        // 2. Busca todas as informações do usuário no banco de dados usando o ID
        const result = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        client.release();

        if (result.rows.length === 0) {
            return { statusCode: 404, headers, body: JSON.stringify({ success: false, message: 'Usuário não encontrado.' }) };
        }

        const userData = result.rows[0];

        // 3. Remove o hash da senha antes de enviar os dados para o frontend
        delete userData.password_hash;

        // 4. Retorna os dados do usuário com sucesso
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                user: userData
            })
        };

    } catch (error) {
        console.error('Erro ao buscar dados do perfil:', error);
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    }
};
