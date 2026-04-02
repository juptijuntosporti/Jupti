const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

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

    const { full_name, email, phone_number, password } = requestData;

    // Validar campos obrigatórios
    if (!full_name || !email || !password) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Nome completo, email e senha são obrigatórios.' 
            })
        };
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Por favor, insira um email válido.' 
            })
        };
    }

    // Validar senha (mínimo 6 caracteres)
    if (password.length < 6) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'A senha deve ter pelo menos 6 caracteres.' 
            })
        };
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const client = await pool.connect();
        
        // Verificar se o email já existe
        const existingUser = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            client.release();
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Este email já está em uso.' 
                })
            };
        }

        // Inserir novo usuário
        const result = await client.query(
            'INSERT INTO users (full_name, email, phone_number, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name',
            [full_name, email, phone_number, hashedPassword]
        );
        
        client.release();

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({ 
                success: true,
                message: 'Usuário registrado com sucesso!', 
                user: {
                    id: result.rows[0].id,
                    email: result.rows[0].email,
                    full_name: result.rows[0].full_name
                }
            })
        };

    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        
        // Tratar erro de violação de unicidade (caso não tenha sido pego antes)
        if (error.code === '23505') {
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Este email já está em uso.' 
                })
            };
        }

        // Erro de conexão com banco de dados
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return {
                statusCode: 503,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.' 
                })
            };
        }

        // Outros erros internos
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Erro interno do servidor. Tente novamente mais tarde.' 
            })
        };

    }
    // O bloco 'finally' foi removido daqui. Essa é a única alteração.
};
