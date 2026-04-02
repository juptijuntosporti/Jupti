// Arquivo: api/login.js
// VERSÃO CORRIGIDA PARA VERCEL

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// A Vercel espera uma função exportada como padrão (export default)
export default async function handler(request, response) {
    // Headers CORS para permitir requisições do frontend
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    // Responder a requisições OPTIONS (preflight)
    if (request.method === 'OPTIONS') {
        return response.status(200).json({ message: 'CORS preflight' });
    }

    // Verificar se é método POST
    if (request.method !== 'POST') {
        return response.status(405).json({ 
            success: false, 
            message: 'Método não permitido. Use POST.' 
        });
    }

    // Na Vercel, os dados do corpo já vêm parseados se o header estiver correto
    const { email, password } = request.body;

    // Validar campos obrigatórios
    if (!email || !password) {
        return response.status(400).json({ 
            success: false, 
            message: 'Email e senha são obrigatórios.' 
        });
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Adicionado para compatibilidade com alguns provedores de DBaaS como Neon/Heroku
        }
    });

    try {
        const client = await pool.connect();
        
        const result = await client.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        client.release();

        const user = result.rows[0];

        if (!user) {
            return response.status(401).json({ 
                success: false, 
                message: 'Email ou senha incorretos.' 
            });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return response.status(401).json({ 
                success: false, 
                message: 'Email ou senha incorretos.' 
            });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        delete user.password_hash;

        // Retorna a resposta de sucesso usando o objeto 'response'
        return response.status(200).json({ 
            success: true,
            message: 'Login realizado com sucesso!', 
            token, 
            user 
        });

    } catch (error) {
        console.error('Erro ao fazer login:', error);
        
        return response.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor. Tente novamente mais tarde.' 
        });
    }
}
