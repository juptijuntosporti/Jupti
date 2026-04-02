/**
 * =================================================================
 * 👤 JUPTI - API para Buscar Perfil Público de Filho (get-child-public-profile.js)
 * =================================================================
 * Descrição:
 * - Recebe o ID de uma criança via query parameter.
 * - Busca e retorna os dados públicos da criança, incluindo o nome do genitor principal.
 * - Endpoint: GET /.netlify/functions/get-child-public-profile?id=...
 * =================================================================
 */

const { Pool } = require('pg');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    let client;

    try {
        const childId = event.queryStringParameters?.id;

        if (!childId) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID da criança não fornecido.' }) };
        }

        client = await pool.connect();

        // Query principal para buscar os dados da criança e o nome do seu guardião principal
        const query = `
            SELECT 
                c.id, 
                c.full_name, 
                c.birth_date, 
                c.profile_picture_url,
                u.username AS primary_guardian_name
            FROM children c
            JOIN child_guardians cg ON c.id = cg.child_id
            JOIN users u ON cg.user_id = u.id
            WHERE c.id = $1 AND cg.relationship_type = 'PRIMARY_GUARDIAN';
        `;
        
        const result = await client.query(query, [childId]);

        if (result.rows.length === 0) {
            client.release();
            return { statusCode: 404, headers, body: JSON.stringify({ success: false, message: 'Perfil da criança não encontrado ou sem guardião principal definido.' }) };
        }

        // Futuramente, aqui podemos adicionar uma segunda query para buscar as 3 fotos mais recentes.
        // Por enquanto, vamos focar nos dados principais.

        client.release();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                child: result.rows[0],
                recentPhotos: [] // Placeholder para as fotos
            })
        };

    } catch (error) {
        console.error('❌ Erro na API de perfil público de filho:', error);
        if (client) client.release();
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: 'Erro interno do servidor.' })
        };
    }
};
