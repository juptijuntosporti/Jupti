/**
 * =================================================================
 * 🤝 JUPTI - API para Solicitar Conexão com Filho (request-child-connection.js)
 * =================================================================
 * CHECKLIST: Item 1.1
 *
 * Descrição:
 * - Recebe um pedido de um usuário autenticado para se conectar a um perfil de filho.
 * - Verifica se o pedido é válido (não é para si mesmo, não está duplicado).
 * - Encontra o guardião principal da criança.
 * - Cria uma notificação do tipo 'CONNECTION_REQUEST' para o guardião principal.
 *
 * Endpoint: POST /.netlify/functions/request-child-connection
 * Body: { "childId": "uuid-do-filho" }
 * =================================================================
 */

// --- 1. IMPORTAÇÕES ---
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// --- 2. FUNÇÃO DE AUTENTICAÇÃO (Padrão) ---
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
    // Headers de resposta para permitir CORS
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
    let client;

    try {
        // --- ETAPA 1: AUTENTICAR O SOLICITANTE E OBTER DADOS ---
        const decodedToken = authenticateToken(event.headers);
        const requesterId = decodedToken.userId; // ID de quem está pedindo (o pai)

        const { childId } = JSON.parse(event.body);

        if (!childId) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID da criança é obrigatório.' }) };
        }

        client = await pool.connect();

        // --- ETAPA 2: BUSCAR O GUARDIÃO PRINCIPAL ---
        const guardianQuery = `
            SELECT user_id 
            FROM child_guardians 
            WHERE child_id = $1 AND relationship_type = 'PRIMARY_GUARDIAN'
        `;
        const guardianResult = await client.query(guardianQuery, [childId]);

        if (guardianResult.rows.length === 0) {
            throw new Error('Não foi possível encontrar um guardião principal para este perfil.');
        }
        const primaryGuardianId = guardianResult.rows[0].user_id; // ID de quem vai receber o pedido (a mãe)

        // --- ETAPA 3: VALIDAÇÕES DE SEGURANÇA ---
        // a) O usuário não pode pedir para se conectar a um perfil que ele mesmo criou.
        if (requesterId === primaryGuardianId) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Você já é o guardião principal deste perfil.' }) };
        }

        // b) Verificar se já não existe um pedido pendente para evitar duplicatas.
        const existingRequestQuery = `
            SELECT id FROM notifications 
            WHERE sender_id = $1 AND child_id = $2 AND type = 'CONNECTION_REQUEST' AND status = 'PENDING'
        `;
        const existingRequestResult = await client.query(existingRequestQuery, [requesterId, childId]);

        if (existingRequestResult.rows.length > 0) {
            return { statusCode: 409, headers, body: JSON.stringify({ success: false, message: 'Você já enviou um pedido de conexão para este perfil. Aguarde a aprovação.' }) };
        }

        // --- ETAPA 4: CRIAR A NOTIFICAÇÃO DE PEDIDO DE CONEXÃO ---
        const notificationQuery = `
            INSERT INTO notifications (recipient_id, sender_id, type, status, child_id)
            VALUES ($1, $2, 'CONNECTION_REQUEST', 'PENDING', $3)
            RETURNING id;
        `;
        await client.query(notificationQuery, [primaryGuardianId, requesterId, childId]);
        
        console.log(`✅ Pedido de conexão criado. Solicitante: ${requesterId}, Guardião: ${primaryGuardianId}, Criança: ${childId}`);

        client.release();

        // --- ETAPA 5: RETORNAR SUCESSO ---
        return {
            statusCode: 201, // 201 Created
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Seu pedido de conexão foi enviado com sucesso! Você será notificado quando for aprovado.'
            })
        };

    } catch (error) {
        console.error('❌ Erro na API request-child-connection:', error);
        if (client) client.release();
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    }
};
