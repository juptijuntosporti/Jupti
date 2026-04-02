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

        // 2. Obter os dados do post
        const data = JSON.parse(event.body);
        const { caption, media_url, media_type, privacy, location, child_id } = data;

        // 3. Validação básica
        if (!caption && !media_url) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'O post deve ter pelo menos uma legenda ou uma mídia.' }) };
        }

        const client = await pool.connect();

        // 4. Inserir no banco de dados (Incluindo child_id)
        const query = `
            INSERT INTO posts (user_id, caption, media_url, media_type, privacy, location, child_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const values = [userId, caption, media_url, media_type, privacy, location, child_id || null];
        
        const result = await client.query(query, values);
        client.release();

        // 5. Retornar sucesso
        return {
            statusCode: 201, 
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Post criado com sucesso!',
                post: result.rows[0]
            })
        };

    } catch (error) {
        console.error('Erro ao criar post:', error);
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    }
};
