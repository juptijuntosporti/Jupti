// Arquivo: netlify/functions/get-public-profile-data.js

const { Pool } = require('pg');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    const userId = event.queryStringParameters.id;
    if (!userId) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'ID do usuário não fornecido.' }) };
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        const client = await pool.connect();
        // Seleciona apenas os campos que são seguros para serem públicos
        const result = await client.query(
            'SELECT id, username, profile_picture_url, cover_picture_url, bio, profile_type, city, state, profile_type_visible, location_visible FROM users WHERE id = $1',
            [userId]
        );
        client.release();

        if (result.rows.length === 0) {
            return { statusCode: 404, headers, body: JSON.stringify({ success: false, message: 'Usuário não encontrado.' }) };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                user: result.rows[0]
            })
        };

    } catch (error) {
        console.error('Erro ao buscar perfil público:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    }
};
