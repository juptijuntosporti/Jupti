// Substitua o conteúdo do seu respond-to-connection.js por este:

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const authenticateToken = (headers) => {
    // ... (função de autenticação sem alterações)
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
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Content-Type': 'application/json' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
        const decodedToken = authenticateToken(event.headers);
        const guardianId = decodedToken.userId;

        const { notificationId, response } = JSON.parse(event.body);

        // ✅✅✅ LOG DE DEBUG NO BACKEND ✅✅✅
        console.log('[respond-to-connection] DADOS RECEBIDOS DO FRONTEND:', { notificationId, response });

        // ✅✅✅ VALIDAÇÃO ROBUSTA NO BACKEND ✅✅✅
        if (!notificationId || notificationId === 'undefined' || notificationId === 'null' || isNaN(parseInt(notificationId))) {
            // Se o notificationId for inválido, retornamos um erro 400 (Bad Request) claro.
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: `ID da notificação inválido recebido: ${notificationId}` }) };
        }
        if (!response || !['ACCEPTED', 'DECLINED'].includes(response)) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Resposta inválida.' }) };
        }

        // O resto do código continua o mesmo...
        const notificationQuery = `SELECT id, recipient_id, sender_id, child_id, status FROM notifications WHERE id = $1 AND type = 'CONNECTION_REQUEST'`;
        const notificationResult = await client.query(notificationQuery, [notificationId]);

        if (notificationResult.rows.length === 0) throw new Error('Notificação de pedido de conexão não encontrada.');
        
        const notification = notificationResult.rows[0];
        if (notification.recipient_id !== guardianId) return { statusCode: 403, headers, body: JSON.stringify({ success: false, message: 'Você não tem permissão para responder a este pedido.' }) };
        if (notification.status !== 'PENDING') return { statusCode: 409, headers, body: JSON.stringify({ success: false, message: `Este pedido já foi ${notification.status.toLowerCase()}.` }) };

        await client.query('BEGIN');
        if (response === 'ACCEPTED') {
            // Validação final para child_id antes de usar
            if (!notification.child_id) throw new Error('Inconsistência de dados: Pedido de conexão não tem um ID de filho associado.');
            
            const insertGuardianQuery = `INSERT INTO child_guardians (child_id, user_id, relationship_type) VALUES ($1, $2, 'SECONDARY_GUARDIAN') ON CONFLICT (child_id, user_id) DO NOTHING;`;
            await client.query(insertGuardianQuery, [notification.child_id, notification.sender_id]);

            const acceptanceNotificationQuery = `INSERT INTO notifications (recipient_id, sender_id, type, child_id) VALUES ($1, $2, 'CONNECTION_ACCEPTED', $3);`;
            await client.query(acceptanceNotificationQuery, [notification.sender_id, guardianId, notification.child_id]);
        }
        const updateNotificationQuery = `UPDATE notifications SET status = $1, is_read = TRUE WHERE id = $2;`;
        await client.query(updateNotificationQuery, [response, notificationId]);
        await client.query('COMMIT');

        return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: `Pedido de conexão ${response === 'ACCEPTED' ? 'aceito' : 'recusado'} com sucesso.` }) };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro detalhado ao responder ao pedido:', error);
        const statusCode = error.message.includes('Token') ? 401 : 500;
        return { statusCode, headers, body: JSON.stringify({ success: false, message: `Erro do servidor: ${error.message}` }) };
    } finally {
        client.release();
    }
};
