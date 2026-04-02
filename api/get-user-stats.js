// Importa as bibliotecas necessárias
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

/**
 * Função para autenticar o token JWT enviado no cabeçalho da requisição.
 * @param {object} headers - Os cabeçalhos da requisição (event.headers).
 * @returns {object} - O payload decodificado do token, contendo o userId.
 * @throws {Error} - Lança um erro se o token for inválido, ausente ou mal formatado.
 */
const authenticateToken = (headers) => {
    // Pega o cabeçalho de autorização
    const authHeader = headers.authorization;
    if (!authHeader) {
        throw new Error('Token de autenticação não fornecido.');
    }
    
    // O token vem no formato "Bearer TOKEN", então separamos o token real
    const token = authHeader.split(' ')[1]; 
    if (!token) {
        throw new Error('Token mal formatado.');
    }

    try {
        // Verifica o token usando a chave secreta e retorna os dados decodificados (payload)
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        // Captura erros comuns de JWT, como expiração ou assinatura inválida
        throw new Error('Token inválido ou expirado.');
    }
};

/**
 * Handler principal da função Netlify.
 * É o ponto de entrada que executa quando a função é chamada.
 */
exports.handler = async (event, context) => {
    // Headers CORS para permitir que o frontend acesse esta API
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Responde a requisições OPTIONS (pre-flight) do navegador
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }
    
    // Garante que apenas o método GET seja aceito por esta função
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    // Cria uma nova conexão com o banco de dados
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        // 1. Autentica o token para obter o ID do usuário que está fazendo a requisição
        const decodedToken = authenticateToken(event.headers);
        const userId = decodedToken.userId;

        const client = await pool.connect();

        // 2. Busca TODAS as informações (*) do usuário no banco de dados usando o ID obtido do token
        const result = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        
        client.release(); // Libera a conexão de volta para o pool

        // Verifica se o usuário foi encontrado
        if (result.rows.length === 0) {
            return { 
                statusCode: 404, 
                headers, 
                body: JSON.stringify({ success: false, message: 'Usuário não encontrado.' }) 
            };
        }

        // Pega o primeiro (e único) resultado
        const userData = result.rows[0];

        // 3. Medida de segurança CRÍTICA: Remove o hash da senha antes de enviar os dados para o frontend
        delete userData.password_hash;

        // 4. Retorna os dados do usuário com sucesso (status 200)
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                user: userData // Envia o objeto completo do usuário (sem a senha)
            })
        };

    } catch (error) {
        console.error('Erro ao buscar dados do perfil:', error);
        
        // Retorna um erro específico se for problema de token, ou um erro genérico do servidor
        const statusCode = error.message.includes('Token') ? 401 : 500;
        
        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    }
};
