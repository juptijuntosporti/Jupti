/**
 * =================================================================
 * 🚩 JUPTI - API para Denunciar Post (report-post.js)
 * =================================================================
 * Descrição:
 * - Recebe uma denúncia de um usuário autenticado sobre um post.
 * - Valida os dados e insere na nova tabela 'reports'.
 * =================================================================
 */

// --- 1. IMPORTAÇÕES ---
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// --- 2. FUNÇÃO DE AUTENTICAÇÃO ---
// (Reutilizada de outras funções para manter a consistência)
const authenticateToken = (headers) => {
    const authHeader = headers.authorization;
    if (!authHeader) {
        throw new Error('Token de autenticação não fornecido.');
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        throw new Error('Token mal formatado.');
    }
    try {
        // Retorna o payload decodificado (que contém o userId)
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw new Error('Token inválido ou expirado.');
    }
};

// --- 3. HANDLER PRINCIPAL DA FUNÇÃO ---
exports.handler = async (event) => {
    // Headers de resposta para permitir CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Resposta para a requisição pre-flight do navegador
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }
    // Garante que o método seja POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    // Inicia a conexão com o banco de dados
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    let client;

    try {
        // Etapa 1: Autenticar o usuário e obter seu ID (reporter_id)
        const decodedToken = authenticateToken(event.headers);
        const reporterId = decodedToken.userId;

        // Etapa 2: Extrair dados do corpo da requisição
        const { postId, reason, details } = JSON.parse(event.body);

        // Etapa 3: Validar os dados recebidos
        if (!postId || !reason) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID do post e motivo da denúncia são obrigatórios.' }) };
        }

        client = await pool.connect();

        // Etapa 4: Inserir a denúncia na tabela 'reports'
        const insertQuery = `
            INSERT INTO reports (reporter_id, post_id, reason, details)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
        `;
        
        const result = await client.query(insertQuery, [reporterId, postId, reason, details || null]);

        console.log(`✅ Denúncia registrada com sucesso. ID da denúncia: ${result.rows[0].id}`);

        // Etapa 5: Retornar uma resposta de sucesso
        return {
            statusCode: 201, // 201 Created
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Sua denúncia foi registrada e será analisada por nossa equipe. Obrigado por ajudar a manter a comunidade segura.'
            })
        };

    } catch (error) {
        console.error('❌ Erro ao registrar denúncia:', error);
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    } finally {
        // Garante que a conexão com o banco seja sempre liberada
        if (client) {
            client.release();
        }
    }
};
