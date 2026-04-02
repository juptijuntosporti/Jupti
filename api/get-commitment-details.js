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
 * Handler para obter detalhes de uma proposta de convivência
 * 
 * Endpoint: GET /.netlify/functions/get-commitment-details?commitment_id=...
 * 
 * Resposta:
 * {
 *   success: true,
 *   commitment: {
 *     id: '...',
 *     child_id: '...',
 *     child_name: '...',
 *     created_by_user_id: '...',
 *     other_parent_id: '...',
 *     type: 'CONVIVENCIA',
 *     negotiation_status: 'PROPOSED',
 *     details: { ... },
 *     created_at: '...',
 *     updated_at: '...'
 *   }
 * }
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

        // 2. Obter commitment_id dos query parameters
        const commitmentId = event.queryStringParameters?.commitment_id;

        if (!commitmentId) {
            return createResponse(400, {
                success: false,
                message: 'commitment_id é obrigatório.'
            });
        }

        const client = await pool.connect();

        try {
            // 3. Buscar proposta com dados da criança (JOIN com tabela children)
            // ⚠️ NOTA: Ajuste o nome da tabela 'children' se for diferente no seu banco
            const query = `
            SELECT 
    comm.id,
    comm.child_id,
    comm.created_by_user_id,
    creator.username AS created_by_user_name,
    comm.other_parent_id,
    comm.negotiation_status,
    comm.details,
    comm.created_at,
    child.full_name AS child_name
FROM commitments AS comm
LEFT JOIN users AS creator 
    ON comm.created_by_user_id = creator.id
LEFT JOIN children AS child 
    ON comm.child_id = child.id
WHERE 
    comm.id = $1
    AND (
        comm.created_by_user_id = $2
        OR comm.other_parent_id = $2
    );
            `;

            const result = await client.query(query, [commitmentId, userId]);

            if (result.rows.length === 0) {
                return createResponse(404, {
                    success: false,
                    message: 'Proposta não encontrada ou você não tem permissão para acessá-la.'
                });
            }

            const commitment = result.rows[0];

            // 4. Processar dados e retornar
            return createResponse(200, {
                success: true,
           commitment: {
    id: commitment.id,
    child_id: commitment.child_id,
    child_name: commitment.child_name || 'Criança',
    created_by_user_id: commitment.created_by_user_id,
    created_by_user_name: commitment.created_by_user_name, // ✅ AQUI
    other_parent_id: commitment.other_parent_id,
    negotiation_status: commitment.negotiation_status,
    details: typeof commitment.details === 'string' 
        ? JSON.parse(commitment.details) 
        : commitment.details,
    created_at: commitment.created_at
}
            });

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Erro ao obter detalhes da proposta:', error);
        
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
