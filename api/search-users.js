/**
 * =================================================================
 * 👤 JUPTI - API para Buscar Usuários (search-users.js) - VERSÃO ATUALIZADA
 * =================================================================
 * Descrição:
 * - Busca usuários na plataforma com base em um termo de pesquisa.
 * - ✅ NOVO: Agora filtra os resultados para não exibir usuários
 *   que foram bloqueados por quem realiza a busca.
 * =================================================================
 */

// --- 1. IMPORTAÇÕES ---
const { Pool } = require('pg');
const jwt = require('jsonwebtoken'); // Necessário para autenticar o usuário

// --- 2. FUNÇÃO DE AUTENTICAÇÃO ---
// (Essencial para saber QUEM está fazendo a busca e filtrar seus bloqueados)
const authenticateToken = (headers) => {
    const authHeader = headers.authorization;
    if (!authHeader) {
        // Se não houver token, não podemos filtrar, então lançamos um erro.
        // A busca de usuários deve ser uma ação para usuários logados.
        throw new Error('Token de autenticação não fornecido.');
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        throw new Error('Token mal formatado.');
    }
    try {
        // Verifica o token e retorna os dados do usuário (payload)
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
        'Content-Type': 'application/json'
    };

    // Resposta padrão para pre-flight do CORS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }

    // Garante que o método seja GET
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    let client;

    try {
        // ETAPA 1: Autenticar o usuário para obter o ID de quem está buscando
        const decodedToken = authenticateToken(event.headers);
        const searcherId = decodedToken.userId; // ID do usuário que faz a busca

        // ETAPA 2: Obter o termo de busca da URL (funcionalidade original mantida)
        const searchTerm = event.queryStringParameters?.term;
        if (!searchTerm || searchTerm.trim() === '') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, users: [] })
            };
        }

        client = await pool.connect();

        // ETAPA 3: Executar a consulta SQL ATUALIZADA
        // Esta é a principal modificação. Adicionamos o LEFT JOIN e a condição WHERE.
        const query = `
            SELECT 
                u.id, 
                u.username, 
                u.profile_picture_url, 
                u.profile_type 
            FROM 
                users u
            LEFT JOIN 
                blocks b ON u.id = b.blocked_id AND b.blocker_id = $1
            WHERE 
                u.username ILIKE $2      -- Condição original: busca pelo nome
                AND b.blocker_id IS NULL -- ✅ NOVA CONDIÇÃO: só traz resultados onde o bloqueio NÃO existe
                AND u.id != $1           -- Opcional: impede que o usuário se encontre na própria busca
            LIMIT 10;
        `;
        
        // Passamos o ID de quem busca ($1) e o termo da busca ($2)
        const result = await client.query(query, [searcherId, `%${searchTerm}%`]);
        
        // ETAPA 4: Formatar e retornar os resultados (funcionalidade original mantida)
        const users = result.rows.map(user => ({
            ...user,
            profile_picture_url: user.profile_picture_url || 'icone.png'
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                users: users
            })
        };

    } catch (error) {
        console.error('❌ Erro ao buscar usuários:', error);
        // Se o erro for de token, retorna 401 (Não Autorizado)
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    } finally {
        if (client) {
            client.release();
        }
    }
};
