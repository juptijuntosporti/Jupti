// Arquivo: api/login.js
// VERSÃO CORRIGIDA PARA VERCEL

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// A Vercel espera uma função exportada como padrão (export default)
// que recebe os parâmetros (request, response)
export default async function handler(request, response) {
    // Configura os Headers CORS para permitir requisições do seu site
    response.setHeader('Access-Control-Allow-Origin', '*'); // Em produção, troque '*' pelo seu domínio
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    // Responde a requisições OPTIONS (preflight do navegador para CORS)
    if (request.method === 'OPTIONS') {
        return response.status(200).json({ message: 'CORS preflight' });
    }

    // Garante que apenas o método POST seja aceito
    if (request.method !== 'POST') {
        return response.status(405).json({ 
            success: false, 
            message: 'Método não permitido. Use POST.' 
        });
    }

    // Pega os dados do corpo da requisição. A Vercel já faz o "parse" do JSON.
    const { email, password } = request.body;

    // Valida se os campos foram enviados
    if (!email || !password) {
        return response.status(400).json({ 
            success: false, 
            message: 'Email e senha são obrigatórios.' 
        });
    }

    // Configura a conexão com o banco de dados
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false 
        }
    });

    try {
        const client = await pool.connect();
        
        // Busca o usuário no banco de dados pelo email
        const result = await client.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        client.release();

        const user = result.rows[0];

        // Se o usuário não for encontrado, retorna erro
        if (!user) {
            return response.status(401).json({ 
                success: false, 
                message: 'Email ou senha incorretos.' 
            });
        }

        // Compara a senha enviada com o hash salvo no banco
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        // Se a senha não bater, retorna erro
        if (!passwordMatch) {
            return response.status(401).json({ 
                success: false, 
                message: 'Email ou senha incorretos.' 
            });
        }

        // Se tudo estiver certo, gera o token de autenticação
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Token expira em 1 hora
        );

        // Remove o hash da senha do objeto antes de enviá-lo ao frontend
        delete user.password_hash;

        // Retorna a resposta de sucesso com o token e os dados do usuário
        return response.status(200).json({ 
            success: true,
            message: 'Login realizado com sucesso!', 
            token, 
            user 
        });

    } catch (error) {
        // Em caso de qualquer outro erro (ex: falha na conexão com o DB), registra no log e retorna erro 500
        console.error('Erro detalhado ao fazer login:', error);
        
        return response.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor. Tente novamente mais tarde.' 
        });
    }
}
