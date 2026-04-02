/**
 * =================================================================
 * ❤️ JUPTI - API para Registrar Interesse (add-interest.js)
 * =================================================================
 * Descrição:
 * - Registra o interesse de um usuário em um post específico.
 * - Insere um registro na tabela 'interests'.
 * - Não possui lógica de "desfazer", é apenas um registro de ação.
 * =================================================================
 */

// --- 1. IMPORTAÇÕES ---
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// --- 2. FUNÇÃO DE AUTENTICAÇÃO ---
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

// --- 3. HANDLER PRINCIPAL DA FUNÇÃO ---
exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers };
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    let client;

    try {
        // Etapa 1: Autenticar o usuário
        const decodedToken = authenticateToken(event.headers);
        const userId = decodedToken.userId;

        // Etapa 2: Obter o ID do post do corpo da requisição
        const { postId } = JSON.parse(event.body);

        // Etapa 3: Validar os dados
        if (!postId) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID do post é obrigatório.' }) };
        }

        client = await pool.connect();

        // Etapa 4: Inserir o registro de interesse na tabela 'interests'
        // Usamos "ON CONFLICT DO NOTHING" para que, se o usuário clicar várias vezes,
        // o interesse seja registrado apenas uma vez, sem gerar erro.
        const insertQuery = `
            INSERT INTO interests (user_id, post_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, post_id) DO NOTHING;
        `;
        
        await client.query(insertQuery, [userId, postId]);

        console.log(`✅ Interesse do usuário ${userId} no post ${postId} foi registrado.`);

        // Etapa 5: Retornar sucesso
        return {
            statusCode: 200, // Usamos 200 OK pois a ação pode não criar um novo recurso se já existir.
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Interesse registrado com sucesso.'
            })
        };

    } catch (error) {
        console.error('❌ Erro ao registrar interesse:', error);
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    } finally {
        if (client) client.release();
    }
};
