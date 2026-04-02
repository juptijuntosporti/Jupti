// ARQUIVO: netlify/functions/mark-notifications-as-read.js

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Função de autenticação (padrão)
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS', // Permitimos POST
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    let client;

    try {
        // 1. Autentica o usuário para saber de quem são as notificações
        const decodedToken = authenticateToken(event.headers);
        const userId = decodedToken.userId;

        client = await pool.connect();

        // 2. Executa o UPDATE no banco de dados
        // Atualiza todas as notificações do usuário para is_read = true
        const updateQuery = `
            UPDATE notifications
            SET is_read = TRUE
            WHERE recipient_id = $1 AND is_read = FALSE;
        `;
        
        const result = await client.query(updateQuery, [userId]);

        console.log(`Notificações marcadas como lidas para o usuário ${userId}. Linhas afetadas: ${result.rowCount}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Notificações marcadas como lidas.',
                updatedCount: result.rowCount // Informa quantas foram atualizadas
            })
        };

    } catch (error) {
        console.error('Erro ao marcar notificações como lidas:', error);
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    } finally {
        if (client) {
            client.release();
        }
    }
};
