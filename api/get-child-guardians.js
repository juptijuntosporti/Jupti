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
 * Handler para buscar guardiões de uma criança
 * 
 * Endpoint: GET /.netlify/functions/get-child-guardians?child_id=<uuid>
 * 
 * Retorna: { success: true, guardians: ['uuid-pai-A', 'uuid-pai-B'] }
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
                message: 'child_id é obrigatório como query parameter.'
            });
        }

        console.log('🔍 Buscando guardiões para criança:', childId);
        console.log('👤 Usuário autenticado:', userId);

        const client = await pool.connect();

        try {
            // 3. Buscar todos os guardiões da criança na tabela child_guardians
            const query = `
                SELECT DISTINCT "user_id"
                FROM "child_guardians"
                WHERE "child_id" = $1
                ORDER BY "user_id";
            `;

            console.log('📝 Executando query para buscar guardiões...');
            const result = await client.query(query, [childId]);

            if (result.rows.length === 0) {
                console.warn('⚠️ Nenhum guardião encontrado para criança:', childId);
                return createResponse(404, {
                    success: false,
                    message: 'Nenhum guardião encontrado para esta criança.'
                });
            }

            // 4. Extrair os UUIDs dos guardiões
            const guardians = result.rows.map(row => row.user_id);

            console.log('✅ Guardiões encontrados:', guardians);
            console.log('📊 Total de guardiões:', guardians.length);

            // 5. Encontrar o "outro genitor" (aquele que não é o usuário logado)
            const otherParent = guardians.find(guardianId => guardianId !== userId);

            if (!otherParent) {
                console.warn('⚠️ Não foi possível encontrar outro genitor. Guardiões:', guardians, 'Usuário:', userId);
                return createResponse(400, {
                    success: false,
                    message: 'Não foi possível identificar o outro genitor. Verifique se há múltiplos guardiões cadastrados.',
                    guardians: guardians
                });
            }

            console.log('🎯 Outro genitor identificado:', otherParent);

            // 6. Retornar sucesso com a lista de guardiões e o outro genitor
            return createResponse(200, {
                success: true,
                message: 'Guardiões encontrados com sucesso.',
                guardians: guardians,
                other_parent_id: otherParent,
                current_user_id: userId,
                total_guardians: guardians.length
            });

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Erro ao buscar guardiões:', error);

        // Determinar o código de status apropriado
        let statusCode = 500;
        let message = `Erro do servidor: ${error.message}`;

        if (error.message.includes('Token')) {
            statusCode = 401;
            message = 'Token de autenticação inválido ou expirado.';
        } else if (error.message.includes('relation')) {
            statusCode = 500;
            message = 'Erro ao acessar o banco de dados. Verifique se a tabela child_guardians existe.';
        }

        return createResponse(statusCode, {
            success: false,
            message,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
