/**
 * =================================================================
 * 👶 JUPTI - API para Criar Perfil do Filho (create-child-profile.js)
 * VERSÃO ATUALIZADA COM TABELA DE LIGAÇÃO (child_guardians)
 * =================================================================
 * Descrição:
 * - Cria um novo perfil na tabela 'children'.
 * - Cria um vínculo na tabela 'child_guardians', designando o criador como 'PRIMARY_GUARDIAN'.
 * - Executa ambas as operações dentro de uma transação para garantir a integridade dos dados.
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

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
        // Autentica o usuário para obter o ID do pai/mãe
        const decodedToken = authenticateToken(event.headers);
        const parentId = decodedToken.userId;

        // Extrai os dados do corpo da requisição
        const {
            nomeCompleto, dataNascimento, cidadeNascimento, estadoNascimento,
            profilePictureUrl, cpf, certidaoNascimento
        } = JSON.parse(event.body);

        // Validação dos campos obrigatórios
        if (!nomeCompleto || !dataNascimento || !cidadeNascimento || !estadoNascimento) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Nome, data e local de nascimento são obrigatórios.' }) };
        }

        // Inicia a transação
        await client.query('BEGIN');

        // 1. Insere na tabela 'children'
        const insertChildQuery = `
            INSERT INTO children (full_name, birth_date, city_of_birth, state_of_birth, profile_picture_url, cpf, birth_certificate)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, full_name;
        `;
        const childValues = [
            nomeCompleto, dataNascimento, cidadeNascimento, estadoNascimento,
            profilePictureUrl || null, cpf || null, certidaoNascimento || null
        ];
        const childResult = await client.query(insertChildQuery, childValues);
        const newChild = childResult.rows[0];

        // 2. Insere na tabela 'child_guardians'
        const insertGuardianQuery = `
            INSERT INTO child_guardians (child_id, user_id, relationship_type)
            VALUES ($1, $2, $3);
        `;
        const guardianValues = [newChild.id, parentId, 'PRIMARY_GUARDIAN'];
        await client.query(insertGuardianQuery, guardianValues);

        // Confirma a transação
        await client.query('COMMIT');

        console.log(`✅ [TRANSAÇÃO COMPLETA] Perfil do filho '${newChild.full_name}' e vínculo de guardião primário criados com sucesso.`);

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                success: true,
                message: `Perfil para ${newChild.full_name} criado com sucesso!`,
                child: newChild
            })
        };

    } catch (error) {
        // Em caso de erro, desfaz a transação
        await client.query('ROLLBACK');
        console.error('❌ [TRANSAÇÃO REVERTIDA] Erro ao criar perfil do filho:', error);

        if (error.code === '23505') { // Conflito de chave única (CPF ou Certidão)
            return { statusCode: 409, headers, body: JSON.stringify({ success: false, message: 'O CPF ou a Certidão de Nascimento informada já está cadastrada.' }) };
        }
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return { statusCode, headers, body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` }) };
    } finally {
        client.release();
    }
};
