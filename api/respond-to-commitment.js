/**
 * =================================================================
 * 🤝 JUPTI - API para Responder a um Compromisso (respond-to-commitment.js)
 * =================================================================
 * ✅ VERSÃO REFINADA - LIGAÇÃO PARA AMBOS OS PAIS
 */

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

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
 * Função Auxiliar: Obter o segundo domingo a partir de uma data
 */
function getSecondSunday(date) {
    const d = new Date(date);
    d.setDate(1);
    let sundays = 0;
    while (sundays < 2) {
        if (d.getDay() === 0) sundays++;
        if (sundays < 2) d.setDate(d.getDate() + 1);
    }
    return d;
}

/**
 * Função Auxiliar: Obter o próximo dia da semana a partir de uma data
 */
function getNextDayOfWeek(startDate, dayName) {
    const daysMap = {
        'domingo': 0, 'segunda': 1, 'terça': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6,
        'segunda-feira': 1, 'terça-feira': 2, 'quarta-feira': 3, 'quinta-feira': 4, 'sexta-feira': 5, 'sábado-feira': 6
    };
    const targetDay = daysMap[dayName.toLowerCase()];
    if (targetDay === undefined) return startDate;

    const resultDate = new Date(startDate);
    resultDate.setDate(startDate.getDate() + (targetDay + 7 - startDate.getDay()) % 7);
    return resultDate;
}

/**
 * ✅ FUNÇÃO: Gerar Compromissos Pendentes
 */
async function generatePendingCommitments(client, commitmentId, childId, details) {
    console.log(`🚀 Gerando compromissos pendentes para UUID: ${commitmentId}`);

    const guardianQuery = `SELECT user_id, relationship_type FROM child_guardians WHERE child_id = $1;`;
    const guardianResult = await client.query(guardianQuery, [childId]);
    if (guardianResult.rows.length === 0) return;

    const primaryGuardian = guardianResult.rows.find(g => g.relationship_type === 'PRIMARY_GUARDIAN' || g.relationship_type === 'PAI_A')?.user_id;
    const secondaryGuardian = guardianResult.rows.find(g => g.relationship_type === 'SECONDARY_GUARDIAN' || g.relationship_type === 'PAI_B')?.user_id;

    const typeTitles = {
        postings: 'Postagem de Foto/Vídeo',
        postagens: 'Postagem de Foto/Vídeo',
        jupti_moments: 'Momento JUPTI',
        momentos_jupti: 'Momento JUPTI',
        calls: 'Chamada de Vídeo/Voz',
        visits: 'Visita/Convivência',
        pension: 'Pagamento de Pensão'
    };

    const startDate = getSecondSunday(new Date());
    startDate.setHours(0, 0, 0, 0);

    for (const key in details) {
        const item = details[key];

        const isAccepted = item.status === 'accepted' || item.status === 'aceito';
        if (!isAccepted) continue;

        const data = item.suggestion || item.sugestão || item.original || item;

        /**
         * 🎯 CORREÇÃO IMPORTANTE:
         * Normaliza TODOS os nomes usados no banco → nomes usados no sistema.
         */
        const normalizedKey =
            key === 'postagens' ? 'postings' :
            key === 'momentos_jupti' ? 'jupti_moments' :
            key === 'ligacao' ? 'calls' :
            key === 'visita' ? 'visits' :
            key;

        let responsibleIds = [];
        let title = typeTitles[key] || typeTitles[normalizedKey] || 'Compromisso';
        let urgency = 'normal';
        let itemDetails = '';
        let dueDates = [];

        switch (normalizedKey) {
            case 'pension':
                responsibleIds = [secondaryGuardian || primaryGuardian];
                if (data.date) {
                    const day = parseInt(String(data.date).split('-').pop());
                    let dueDate = new Date(startDate.getFullYear(), startDate.getMonth(), day, 23, 59, 59);
                    if (dueDate < startDate) dueDate.setMonth(dueDate.getMonth() + 1);
                    dueDates.push(dueDate);
                }
                urgency = 'high';
                itemDetails = `Valor: R$ ${data.value || '0.00'}. ${data.observations || ''}`;
                break;

            case 'postings':
            case 'jupti_moments':
                responsibleIds = [primaryGuardian || secondaryGuardian];
                const meta = parseInt(data.goal || data.meta || '0');
                const dias = data.preferred_days || data.dias_preferidos || [];
                let nextSunday = new Date(startDate);
                nextSunday.setDate(startDate.getDate() + (0 + 7 - startDate.getDay()) % 7);
                nextSunday.setHours(23, 59, 59, 999);
                dueDates.push(nextSunday);
                itemDetails = `Meta: ${meta}. Dias preferidos: ${Array.isArray(dias) ? dias.join(', ') : ''}`;
                break;

            case 'calls':
                responsibleIds = [primaryGuardian, secondaryGuardian].filter(id => id);
                const callDays = data.preferred_days || data.dias_preferidos || [];
                const callTime = data.time || '18:00';
                const [hours, minutes] = callTime.split(':').map(Number);

                callDays.forEach(dayName => {
                    let callDate = getNextDayOfWeek(startDate, dayName);
                    callDate.setHours(hours, minutes, 0, 0);
                    let expiryDate = new Date(callDate);
                    expiryDate.setHours(expiryDate.getHours() + 1);
                    dueDates.push(expiryDate);
                });

                itemDetails = `Horário agendado: ${callTime}. Duração de tolerância: 1 hora.`;
                break;

            case 'visits':
                responsibleIds = [secondaryGuardian || primaryGuardian];
                if (data.start_date) {
                    let vDate = new Date(data.start_date);
                    vDate.setHours(23, 59, 59);
                    dueDates.push(vDate);
                }
                itemDetails = `Tipo: ${data.type}. Período: ${data.start_date || ''} até ${data.end_date || ''}`;
                break;

            default:
                responsibleIds = [primaryGuardian || secondaryGuardian];
                dueDates.push(new Date(startDate));
        }

        for (const rId of responsibleIds) {
            if (!rId) continue;
            for (const dDate of dueDates) {
                const insertQuery = `
                    INSERT INTO pending_commitments (
                        user_id, original_commitment_id, child_id, title, type, due_date, urgency, status, details
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
                `;
                await client.query(insertQuery, [
                    rId, commitmentId, childId, title, normalizedKey, dDate.toISOString(), urgency, 'pendente', itemDetails
                ]);
            }
        }
    }
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers };

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
        const decodedToken = authenticateToken(event.headers);
        const responderId = decodedToken.userId;
        const { commitmentId, responses } = JSON.parse(event.body);

        await client.query('BEGIN');

        const commitmentQuery = `
            SELECT id, created_by_user_id, other_parent_id, child_id, details, negotiation_status
            FROM commitments WHERE id = $1 FOR UPDATE;
        `;

        const commitmentResult = await client.query(commitmentQuery, [commitmentId]);
        if (commitmentResult.rows.length === 0) throw new Error('Compromisso não encontrado.');

        const commitment = commitmentResult.rows[0];

        let hasSuggestions = false;
        const newDetails = {};

        for (const key in commitment.details) {
            const userResponse = responses[key];
            const originalItem = commitment.details[key];

            if (!userResponse) {
                newDetails[key] = originalItem;
                continue;
            }

            if (userResponse.status === 'suggested') {
                hasSuggestions = true;
                newDetails[key] = {
                    status: 'suggested',
                    original: originalItem.original || originalItem,
                    suggestion: userResponse.data
                };
            } else {
                newDetails[key] = {
                    status: 'accepted',
                    original: originalItem.original || originalItem,
                    suggestion: originalItem.suggestion || originalItem.sugestão || null,
                    observation: userResponse.observation || null
                };
            }
        }

        const newStatus = hasSuggestions ? 'COUNTER_PROPOSED' : 'ACCEPTED';

        await client.query(
            `UPDATE commitments SET details = $1, negotiation_status = $2, updated_at = NOW() WHERE id = $3;`,
            [JSON.stringify(newDetails), newStatus, commitmentId]
        );

        if (newStatus === 'ACCEPTED') {
            await generatePendingCommitments(client, commitmentId, commitment.child_id, newDetails);
        }

        await client.query(
            `UPDATE notifications SET is_read = TRUE, status = 'RESPONDED'
             WHERE recipient_id = $1 AND related_entity_id = $2;`,
            [responderId, commitmentId]
        );

        let recipient =
            commitment.negotiation_status === 'PROPOSED'
                ? commitment.created_by_user_id
                : commitment.other_parent_id;

        await client.query(
            `INSERT INTO notifications 
            (recipient_id, sender_id, type, related_entity_id, child_id) 
            VALUES ($1, $2, $3, $4, $5);`,
            [
                recipient,
                responderId,
                hasSuggestions ? 'COUNTER_PROPOSAL_RECEIVED' : 'PROPOSAL_ACCEPTED',
                commitmentId,
                commitment.child_id
            ]
        );

        await client.query('COMMIT');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Processado com sucesso!',
                finalStatus: newStatus
            })
        };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ ERRO:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: error.message })
        };
    } finally {
        client.release();
    }
};