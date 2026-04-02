const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

/**
 * Função de autenticação
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
 * Função auxiliar para retornar respostas com JSON garantido
 */
const createResponse = (statusCode, data, customHeaders = {}) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
 * Handler para verificar se existe proposta em andamento ou acordo fechado para uma criança
 * 
 * Endpoint: GET /.netlify/functions/check-existing-proposal?child_id=...
 * 
 * Resposta:
 * - { exists: true, commitment_id: '...', status: 'PROPOSED', type: 'proposal_in_progress' }
 * - { exists: true, commitment_id: '...', status: 'ACCEPTED', type: 'agreement_closed' }
 * - { exists: false, type: 'no_commitment' }
 */
exports.handler = async (event) => {
    // Lidar com CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return createResponse(200, { message: 'OK' });
    }

    // Apenas GET é permitido
    if (event.httpMethod !== 'GET') {
        return createResponse(405, {
            success: false,
            message: 'Método não permitido. Use GET.'
        });
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        // 1. Autenticar o usuário
        const decodedToken = authenticateToken(event.headers);
        const userId = decodedToken.userId;

        // 2. Obter child_id dos query parameters
        const childId = event.queryStringParameters?.child_id;

        if (!childId) {
            return createResponse(400, {
                success: false,
                message: 'child_id é obrigatório.'
            });
        }

        const client = await pool.connect();

        try {
            // ===== PORTEIRO INTELIGENTE MELHORADO =====
            // Verifica em ordem: 1) Proposta em andamento, 2) Acordo fechado, 3) Nada

            // ETAPA 1: Procura por propostas em andamento (PROPOSED ou COUNTER_PROPOSED)
            // Não filtra por created_by_user_id para que ambos os pais vejam a mesma proposta
            const queryInProgress = `
                SELECT 
                    "id",
                    "child_id",
                    "created_by_user_id",
                    "negotiation_status",
                    "created_at"
                FROM "commitments"
                WHERE 
                    "child_id" = $1 
                    AND "negotiation_status" IN ('PROPOSED', 'COUNTER_PROPOSED')
                ORDER BY "created_at" DESC
                LIMIT 1;
            `;

            const resultInProgress = await client.query(queryInProgress, [childId]);

            // Se encontrou proposta em andamento
            if (resultInProgress.rows.length > 0) {
                const commitment = resultInProgress.rows[0];
                console.log(`✅ Proposta em andamento encontrada para child_id ${childId}: ${commitment.id}`);
                return createResponse(200, {
                    success: true,
                    exists: true,
                    commitment_id: commitment.id,
                    status: commitment.negotiation_status,
                    type: 'proposal_in_progress',
                    created_at: commitment.created_at
                });
            }

            // ETAPA 2: Se não encontrou proposta em andamento, procura por acordo fechado (ACCEPTED)
            const queryAgreed = `
                SELECT 
                    "id",
                    "child_id",
                    "created_by_user_id",
                    "negotiation_status",
                    "created_at"
                FROM "commitments"
                WHERE 
                    "child_id" = $1 
                    AND "negotiation_status" = 'ACCEPTED'
                ORDER BY "created_at" DESC
                LIMIT 1;
            `;

            const resultAgreed = await client.query(queryAgreed, [childId]);

            // Se encontrou acordo fechado
            if (resultAgreed.rows.length > 0) {
                const commitment = resultAgreed.rows[0];
                console.log(`✅ Acordo fechado encontrado para child_id ${childId}: ${commitment.id}`);
                return createResponse(200, {
                    success: true,
                    exists: true,
                    commitment_id: commitment.id,
                    status: commitment.negotiation_status,
                    type: 'agreement_closed',
                    created_at: commitment.created_at
                });
            }

            // ETAPA 3: Se não encontrou nada, retorna que não existe
            console.log(`✅ Nenhuma proposta ou acordo encontrado para child_id ${childId}`);
            return createResponse(200, {
                success: true,
                exists: false,
                type: 'no_commitment'
            });

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Erro ao verificar proposta existente:', error);
        
        let statusCode = 500;
        let message = `Erro do servidor: ${error.message}`;

        if (error.message.includes('Token')) {
            statusCode = 401;
            message = 'Token de autenticação inválido ou expirado.';
        } else if (error.message.includes('relation')) {
            statusCode = 500;
            message = 'Erro ao acessar o banco de dados.';
        }

        return createResponse(statusCode, {
            success: false,
            message,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
