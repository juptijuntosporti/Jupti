// Arquivo: netlify/functions/update-profile.js (VERSÃO CORRIGIDA E COMPLETA)

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2; // ✅ 1. Importa a biblioteca do Cloudinary

// ✅ 2. Configura o Cloudinary com suas variáveis de ambiente
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Função para autenticar o token JWT.
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
 * ✅ 3. Nova função para extrair o public_id da URL do Cloudinary.
 * Isso é necessário para dizer ao Cloudinary qual arquivo deletar.
 * @param {string} url - A URL completa da imagem no Cloudinary.
 * @returns {string|null} - O public_id ou null se a URL for inválida.
 */
const getPublicIdFromUrl = (url) => {
    if (!url || !url.includes('cloudinary.com')) return null;
    try {
        // Exemplo: https://res.cloudinary.com/demo/image/upload/v123/jupti/avatars/abc.jpg
        // Queremos: jupti/avatars/abc
        const parts = url.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex === -1) return null;
        
        const publicIdWithExtension = parts.slice(uploadIndex + 2).join('/');
        const publicId = publicIdWithExtension.substring(0, publicIdWithExtension.lastIndexOf('.'));
        return publicId;
    } catch (error) {
        console.error("Erro ao extrair public_id da URL:", url, error);
        return null;
    }
};


exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'PUT, PATCH, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }

    if (event.httpMethod !== 'PUT' && event.httpMethod !== 'PATCH') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        const decodedToken = authenticateToken(event.headers);
        const userId = decodedToken.userId;
        const data = JSON.parse(event.body);

        const client = await pool.connect();

        // ✅ 4. LÓGICA DE EXCLUSÃO
        // Antes de qualquer coisa, busca o usuário para saber as URLs antigas.
        const currentUserResult = await client.query('SELECT profile_picture_url, cover_picture_url FROM users WHERE id = $1', [userId]);
        if (currentUserResult.rows.length === 0) {
            client.release();
            throw new Error('Usuário não encontrado para atualização.');
        }
        const currentUser = currentUserResult.rows[0];

        // Se o frontend enviou `profile_picture_url: null` e existia uma URL antiga...
        if (data.profile_picture_url === null && currentUser.profile_picture_url) {
            const publicId = getPublicIdFromUrl(currentUser.profile_picture_url);
            if (publicId) {
                console.log(`Deletando avatar antigo do Cloudinary: ${publicId}`);
                await cloudinary.uploader.destroy(publicId);
            }
        }

        // Se o frontend enviou `cover_picture_url: null` e existia uma URL antiga...
        if (data.cover_picture_url === null && currentUser.cover_picture_url) {
            const publicId = getPublicIdFromUrl(currentUser.cover_picture_url);
            if (publicId) {
                console.log(`Deletando capa antiga do Cloudinary: ${publicId}`);
                await cloudinary.uploader.destroy(publicId);
            }
        }
        // Fim da lógica de exclusão

        const fieldsToUpdate = {};
        const allowedFields = {
            username: 'username',
            bio: 'bio',
            profile_picture_url: 'profile_picture_url',
            cover_picture_url: 'cover_picture_url',
            profile_type_visible: 'profile_type_visible',
            location_visible: 'location_visible',
        };

        // Adiciona apenas os campos que foram enviados e são permitidos
        // IMPORTANTE: Agora permitimos `null` para os campos de imagem.
        for (const [key, dbColumn] of Object.entries(allowedFields)) {
            if (data[key] !== undefined) { // Mudança de `data[key] !== null` para `!== undefined`
                fieldsToUpdate[dbColumn] = data[key];
            }
        }

        if (Object.keys(fieldsToUpdate).length === 0) {
            client.release();
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Nenhum campo válido foi enviado para atualização.' }) };
        }

        if (fieldsToUpdate.username) {
            const existingUser = await client.query('SELECT id FROM users WHERE username = $1 AND id != $2', [fieldsToUpdate.username, userId]);
            if (existingUser.rows.length > 0) {
                client.release();
                return { statusCode: 409, headers, body: JSON.stringify({ success: false, message: 'Este nome de usuário já está em uso por outro usuário.' }) };
            }
        }

        const queryParts = [];
        const values = [];
        let paramIndex = 1;
        for (const [column, value] of Object.entries(fieldsToUpdate)) {
            queryParts.push(`${column} = $${paramIndex++}`);
            values.push(value);
        }

        values.push(userId);
        const updateQuery = `UPDATE users SET ${queryParts.join(', ')} WHERE id = $${paramIndex} RETURNING *;`;

        const result = await client.query(updateQuery, values);
        client.release();

        if (result.rowCount === 0) {
            throw new Error('Usuário não encontrado para atualização (pós-update).');
        }

        const updatedUser = result.rows[0];
        delete updatedUser.password_hash;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Perfil atualizado com sucesso!',
                user: updatedUser
            })
        };

    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` })
        };
    }
};
