// Arquivo: netlify/functions/login.js
// VERSÃO COMPLETA E ATUALIZADA PARA REDIRECIONAMENTO INTELIGENTE

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.handler = async (event, context) => {
    // Headers CORS para permitir requisições do frontend
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Responder a requisições OPTIONS (preflight)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight' })
        };
    }

    // Verificar se é método POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Método não permitido. Use POST.' 
            })
        };
    }

    let requestData;
    try {
        requestData = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Dados inválidos. Verifique o formato JSON.' 
            })
        };
    }

    const { email, password } = requestData;

    // Validar campos obrigatórios
    if (!email || !password) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Email e senha são obrigatórios.' 
            })
        };
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        const client = await pool.connect();
        
        // ✅ ALTERAÇÃO PRINCIPAL: Buscamos todos os campos necessários do usuário, incluindo 'is_profile_complete'.
        const result = await client.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        client.release();

        const user = result.rows[0];

        if (!user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Email ou senha incorretos.' 
                })
            };
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Email ou senha incorretos.' 
                })
            };
        }

        // Gera o token de autenticação
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Token expira em 1 hora
        );

        // ✅ IMPORTANTE: Removemos o hash da senha do objeto antes de enviá-lo ao frontend.
        delete user.password_hash;

        // Retorna sucesso, o token e o objeto 'user' completo para o frontend.
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true,
                message: 'Login realizado com sucesso!', 
                token, 
                user // O objeto 'user' agora contém a flag 'is_profile_complete'
            })
        };

    } catch (error) {
        console.error('Erro ao fazer login:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Erro interno do servidor. Tente novamente mais tarde.' 
            })
        };
    }
};
