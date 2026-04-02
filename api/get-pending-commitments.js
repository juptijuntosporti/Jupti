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
 * Função auxiliar para retornar respostas
 */
const createResponse = (statusCode, data) => {
    return {
        statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    };
};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return createResponse(200, { message: 'OK' });
    }

    if (event.httpMethod !== 'GET') {
        return createResponse(405, { success: false, message: 'Método não permitido.' });
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        const decodedToken = authenticateToken(event.headers);
        const userId = decodedToken.userId;
        const childId = event.queryStringParameters?.child_id;

        const client = await pool.connect();

        try {
            // ✅ ATUALIZAÇÃO: Adicionado JOIN com a tabela 'children' para buscar o avatar e nome
            let query = `
                SELECT 
                    pc.id, 
                    pc.title, 
                    pc.type, 
                    pc.due_date, 
                    pc.urgency, 
                    pc.status, 
                    pc.details, 
                    pc.child_id,
                    c.full_name as child_name,
                    c.profile_picture_url as child_avatar
                FROM pending_commitments pc
                LEFT JOIN children c ON pc.child_id = c.id
                WHERE pc.user_id = $1
            `;
            const params = [userId];

            if (childId) {
                query += ` AND pc.child_id = $2`;
                params.push(childId);
            }

            query += ` ORDER BY pc.due_date ASC`;

            const result = await client.query(query, params);

            return createResponse(200, {
                success: true,
                commitments: result.rows
            });

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Erro ao buscar compromissos pendentes:', error);
        return createResponse(error.message.includes('Token') ? 401 : 500, {
            success: false,
            message: error.message
        });
    }
};
