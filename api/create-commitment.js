/**
 * =================================================================
 * 🤝 JUPTI - API para Criar Compromisso de Convivência (create-commitment.js)
 * VERSÃO CIRURGICAMENTE CORRIGIDA
 * =================================================================
 * Descrição:
 * - Mantém toda a lógica original de criação de compromisso.
 * - ✅ CORREÇÃO: A query que insere a notificação na tabela `notifications`
 *   agora inclui a coluna `child_id` e o valor correspondente. Isso garante
 *   que a notificação tenha o contexto da criança, permitindo que o frontend
 *   exiba o nome correto.
 * =================================================================
 */

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

/**
 * Função de autenticação (sem alterações)
 */
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

/**
 * Função auxiliar para retornar respostas (sem alterações)
 */
const createResponse = (statusCode, data, customHeaders = {}) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
        ...customHeaders
    };

    return {
        statusCode,
        headers,
        body: JSON.stringify(data)
    };
};

/**
 * Handler principal da função
 */
exports.handler = async (event) => {
    // Lidar com CORS preflight (sem alterações)
    if (event.httpMethod === 'OPTIONS') {
        return createResponse(200, { message: 'OK' });
    }

    // Apenas POST é permitido (sem alterações)
    if (event.httpMethod !== 'POST') {
        return createResponse(405, {
            success: false,
            message: 'Método não permitido. Use POST.'
        });
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        // 1. Autenticar o usuário (sem alterações)
        const decodedToken = authenticateToken(event.headers);
        const userId = decodedToken.userId;

        // 2. Obter os dados do compromisso (sem alterações)
        const data = JSON.parse(event.body);
        const {
            child_id,
            other_parent_id,
            type = 'CONVIVENCIA',
            negotiation_status = 'PROPOSED',
            details,
            created_at,
            updated_at
        } = data;

        // 3. Validação básica (sem alterações)
        if (!child_id || !details) {
            return createResponse(400, {
                success: false,
                message: 'child_id e details são obrigatórios.'
            });
        }
        const hasDetails = details.postings || details.jupti_moments || details.calls || details.visits || details.pension;
        if (!hasDetails) {
            return createResponse(400, {
                success: false,
                message: 'Pelo menos um detalhe de compromisso é obrigatório.'
            });
        }

        const client = await pool.connect();

        try {
            // 4. Inserir no banco de dados (sem alterações)
            const query = `
                INSERT INTO "commitments" (child_id, created_by_user_id, other_parent_id, type, negotiation_status, details, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING "id";
            `;
            const values = [
                child_id, userId, other_parent_id || null, type, negotiation_status,
                JSON.stringify(details), created_at || new Date().toISOString(), updated_at || new Date().toISOString()
            ];
            const result = await client.query(query, values);
            const commitment = result.rows[0];

            // 5. ✅✅✅ CORREÇÃO APLICADA AQUI ✅✅✅
            // Gerar notificação para o outro genitor, agora incluindo o child_id
            if (other_parent_id) {
                try {
                    // A query de inserção de notificação foi atualizada para incluir a coluna 'child_id'
                    const notificationQuery = `
                        INSERT INTO notifications (recipient_id, sender_id, type, related_entity_id, is_read, child_id)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `;
                    // O valor de 'child_id' foi adicionado ao array de valores da query
                    await client.query(notificationQuery, [other_parent_id, userId, 'PROPOSAL_RECEIVED', commitment.id, false, child_id]);
                    console.log(`✅ Notificação de proposta criada para: ${other_parent_id} referente à criança ${child_id}`);
                } catch (notificationError) {
                    console.error('⚠️ Erro ao criar notificação:', notificationError.message);
                }
            }
            // ✅✅✅ FIM DA CORREÇÃO ✅✅✅

            // 6. Retornar sucesso (sem alterações)
            return createResponse(201, {
                success: true,
                message: 'Compromisso criado com sucesso!',
                commitment_id: commitment.id
            });

        } finally {
            client.release();
        }

    } catch (error) {
        // Bloco de tratamento de erro (sem alterações)
        console.error('❌ Erro ao criar compromisso:', error);
        let statusCode = 500;
        let message = `Erro do servidor: ${error.message}`;
        if (error.message.includes('Token')) {
            statusCode = 401;
            message = 'Token de autenticação inválido ou expirado.';
        } else if (error.message.includes('JSON')) {
            statusCode = 400;
            message = 'Dados enviados em formato inválido.';
        } else if (error.message.includes('relation')) {
            statusCode = 500;
            message = 'Erro ao acessar o banco de dados. Verifique se a tabela commitments existe.';
        }
        return createResponse(statusCode, {
            success: false,
            message,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
