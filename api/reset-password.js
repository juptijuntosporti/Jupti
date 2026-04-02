// ARQUIVO: netlify/functions/reset-password.js
// VERSÃO COM A CORREÇÃO FINAL NA QUERY

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }
    
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    try {
        const { token, newPassword } = JSON.parse(event.body);
        
        if (!token || !newPassword || newPassword.length < 6) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Token e uma senha válida (mín. 6 caracteres) são obrigatórios.' }) };
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.purpose !== 'password-reset') {
            return { statusCode: 401, headers, body: JSON.stringify({ success: false, message: 'Token inválido para esta operação.' }) };
        }
        
        const userId = decoded.userId;
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });
        
        const client = await pool.connect();
        
        // ✅✅✅ MUDANÇA CRÍTICA AQUI ✅✅✅
        // Removemos a atualização da coluna 'updated_at' para evitar o erro caso ela não exista.
        const result = await client.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [hashedPassword, userId]
        );
        client.release();
        
        if (result.rowCount === 0) {
            return { statusCode: 404, headers, body: JSON.stringify({ success: false, message: 'Usuário não encontrado.' }) };
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                message: 'Senha redefinida com sucesso! Você será redirecionado para o login.' 
            })
        };
        
    } catch (error) {
        console.error('Erro final ao redefinir senha:', error);
        
        if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ success: false, message: 'O link de recuperação é inválido ou expirou.' })
            };
        }
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: 'Erro interno do servidor. Tente novamente mais tarde.' })
        };
    }
};
