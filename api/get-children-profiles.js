/**
 * =================================================================
 * 👶 JUPTI - API para Buscar Perfis dos Filhos (get-children-profiles.js)
 * =================================================================
 * Descrição:
 * - Busca todos os perfis de filhos vinculados ao usuário autenticado.
 * - Retorna os dados completos de cada filho (nome, data de nascimento, foto, etc.).
 * - Usa a tabela de ligação 'child_guardians' para identificar os filhos do usuário.
 * =================================================================
 */

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Função de autenticação padrão
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

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        // Autentica o usuário
        const decodedToken = authenticateToken(event.headers);
        const userId = decodedToken.userId;

        // Busca todos os filhos vinculados ao usuário através da tabela child_guardians
        const query = `
            SELECT 
                c.id,
                c.full_name,
                c.birth_date,
                c.city_of_birth,
                c.state_of_birth,
                c.profile_picture_url,
                c.cpf,
                c.birth_certificate,
                c.created_at,
                cg.relationship_type
            FROM children c
            INNER JOIN child_guardians cg ON c.id = cg.child_id
            WHERE cg.user_id = $1
            ORDER BY c.created_at DESC;
        `;

        const result = await pool.query(query, [userId]);

        console.log(`✅ Buscando perfis de filhos para o usuário ID ${userId}: ${result.rows.length} perfis encontrados.`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                children: result.rows
            })
        };

    } catch (error) {
        console.error('❌ Erro ao buscar perfis de filhos:', error);
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return { 
            statusCode, 
            headers, 
            body: JSON.stringify({ 
                success: false, 
                message: `Erro do servidor: ${error.message}` 
            }) 
        };
    } finally {
        await pool.end();
    }
};
