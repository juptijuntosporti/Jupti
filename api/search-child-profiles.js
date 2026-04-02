/**
 * =================================================================
 * 🔎 JUPTI - API para Buscar Perfis de Filhos (search-child-profiles.js)
 * VERSÃO CORRIGIDA E ROBUSTA
 * =================================================================
 */

const { Pool } = require('pg');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    let client;

    try {
        // ✅ CORREÇÃO: Inicializa a variável de resultado com um valor padrão.
        let result = { rows: [] }; 
        
        // Verifica se queryStringParameters existe antes de desestruturar.
        const queryParams = event.queryStringParameters || {};
        const { name, phone } = queryParams;

        // Só conecta ao banco se houver um parâmetro válido.
        if (name || phone) {
            client = await pool.connect();

            if (phone) {
                console.log(`Buscando filhos pelo telefone do genitor: ${phone}`);
                const userResult = await client.query('SELECT id FROM users WHERE phone_number = $1', [phone]);
                
                if (userResult.rows.length > 0) {
                    const otherGuardianId = userResult.rows[0].id;
                    const childrenQuery = `
                        SELECT c.id, c.full_name, c.birth_date, c.profile_picture_url
                        FROM children c
                        JOIN child_guardians cg ON c.id = cg.child_id
                        WHERE cg.user_id = $1;
                    `;
                    result = await client.query(childrenQuery, [otherGuardianId]);
                }
            } else if (name) {
                console.log(`Buscando filhos pelo nome: ${name}`);
                const searchQuery = `
                    SELECT id, full_name, birth_date, profile_picture_url
                    FROM children
                    WHERE full_name ILIKE $1;
                `;
                result = await client.query(searchQuery, [`%${name}%`]);
            }
            client.release();
        }

        // ✅ CORREÇÃO: Agora `result.rows` sempre existirá, mesmo que seja um array vazio.
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                children: result.rows
            })
        };

    } catch (error) {
        console.error('❌ Erro na API de busca de filhos:', error);
        if (client) client.release();
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: 'Erro interno do servidor.' })
        };
    }
};
