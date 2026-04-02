// ARQUIVO: netlify/functions/send-reset-email.js
// VERSÃO ULTRA DETALHADA PARA DEBUG

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }
    
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Método não permitido.' }) };
    }

    try {
        const { email } = JSON.parse(event.body);
        
        console.log('='.repeat(60));
        console.log('📧 DEBUG DETALHADO - SEND RESET EMAIL');
        console.log('='.repeat(60));
        
        if (!email) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'O e-mail é obrigatório.' }) };
        }
        
        console.log('1️⃣ E-MAIL RECEBIDO:', email);
        
        // 2. Verificar JWT_SECRET
        console.log('\n2️⃣ VERIFICANDO JWT_SECRET:');
        const JWT_SECRET = process.env.JWT_SECRET;
        console.log(`   - JWT_SECRET presente: ${!!JWT_SECRET}`);
        console.log(`   - JWT_SECRET length: ${JWT_SECRET ? JWT_SECRET.length : 0}`);
        console.log(`   - JWT_SECRET (primeiros 10 chars): ${JWT_SECRET ? JWT_SECRET.substring(0, 10) : 'N/A'}...`);
        
        if (!JWT_SECRET) {
            console.log('❌ ERRO CRÍTICO: JWT_SECRET não configurado!');
            return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Configuração do servidor incorreta.' }) };
        }
        
        // 3. Buscar usuário no banco
        console.log('\n3️⃣ BUSCANDO USUÁRIO NO BANCO:');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const client = await pool.connect();
        console.log('   - Conectado ao banco de dados');
        
        const userResult = await client.query('SELECT id, email, full_name FROM users WHERE email = $1', [email]);
        client.release();
        
        console.log(`   - Usuários encontrados: ${userResult.rows.length}`);
        
        if (userResult.rows.length === 0) {
            console.log('   ⚠️ E-mail não cadastrado (retornando sucesso por segurança)');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: 'Se o e-mail estiver cadastrado, você receberá um link de recuperação em breve.' })
            };
        }
        
        const user = userResult.rows[0];
        console.log('   ✅ Usuário encontrado:');
        console.log('   - ID:', user.id);
        console.log('   - Nome:', user.full_name);
        console.log('   - Email:', user.email);
        
        // 4. Gerar token
        console.log('\n4️⃣ GERANDO TOKEN JWT:');
        const now = Date.now();
        const expiresInMs = 60 * 60 * 1000; // 1 hora em milissegundos
        const expiresAt = now + expiresInMs;
        
        console.log(`   - Horário atual: ${new Date(now).toISOString()}`);
        console.log(`   - Expira em: ${new Date(expiresAt).toISOString()}`);
        console.log(`   - Duração: 1 hora (${expiresInMs / 1000} segundos)`);
        
        const token = jwt.sign(
            { userId: user.id, purpose: 'password-reset' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        console.log(`   - Token gerado (length: ${token.length})`);
        console.log(`   - Token (primeiros 50 chars): ${token.substring(0, 50)}...`);
        
        // 5. Decodificar para confirmar
        console.log('\n5️⃣ VERIFICANDO TOKEN GERADO:');
        const decoded = jwt.decode(token, { complete: true });
        console.log('   - Payload:', JSON.stringify(decoded.payload, null, 2));
        console.log(`   - IAT: ${new Date(decoded.payload.iat * 1000).toISOString()}`);
        console.log(`   - EXP: ${new Date(decoded.payload.exp * 1000).toISOString()}`);
        
        const tokenExpiresInMinutes = Math.floor((decoded.payload.exp * 1000 - now) / 1000 / 60);
        console.log(`   - Tempo de validade: ${tokenExpiresInMinutes} minutos`);
        
        // 6. Validar imediatamente (teste)
        console.log('\n6️⃣ VALIDANDO TOKEN IMEDIATAMENTE (teste):');
        try {
            const verified = jwt.verify(token, JWT_SECRET);
            console.log('   ✅ Token válido!');
            console.log('   - User ID:', verified.userId);
            console.log('   - Purpose:', verified.purpose);
        } catch (verifyError) {
            console.log('   ❌ ERRO: Token inválido logo após criação!');
            console.log('   - Erro:', verifyError.message);
        }
        
        // 7. Construir link
        console.log('\n7️⃣ CONSTRUINDO LINK DE RECUPERAÇÃO:');
        const SITE_URL = process.env.URL || 'http://localhost:8888';
        const resetLink = `${SITE_URL}/nova_senha.html?token=${token}`;
        console.log(`   - Site URL: ${SITE_URL}`);
        console.log(`   - Link completo: ${resetLink.substring(0, 100)}...`);
        
        // 8. Enviar e-mail
        console.log('\n8️⃣ ENVIANDO E-MAIL:');
        const msg = {
            to: user.email,
            from: 'nao-responda@jupti.com.br',
            subject: 'JUPTI - Redefinição de Senha',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Olá, ${user.full_name}!</h2>
                    <p>Recebemos uma solicitação para redefinir a senha da sua conta no JUPTI.</p>
                    <p>Para criar uma nova senha, clique no botão abaixo:</p>
                    <p style="text-align: center;">
                        <a href="${resetLink}" style="background-color: #0f4c5c; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;">Redefinir Senha</a>
                    </p>
                    <p><strong>Este link é válido por 1 hora.</strong></p>
                    <p>Se você não solicitou esta alteração, pode ignorar este e-mail com segurança.</p>
                    <hr>
                    <p style="font-size: 12px; color: #777;">Atenciosamente,<br>Equipe JUPTI</p>
                    <p style="font-size: 10px; color: #999;">Debug: Token gerado em ${new Date(now).toISOString()}, expira em ${new Date(expiresAt).toISOString()}</p>
                </div>
            `,
        };
        
        await sgMail.send(msg);
        console.log('   ✅ E-mail enviado com sucesso!');
        console.log('='.repeat(60));
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                message: 'Se o e-mail estiver cadastrado, você receberá um link de recuperação em breve.',
                // ⚠️ APENAS PARA DEBUG - REMOVER EM PRODUÇÃO
                debug: {
                    tokenCreatedAt: new Date(now).toISOString(),
                    tokenExpiresAt: new Date(expiresAt).toISOString(),
                    tokenLength: token.length,
                    resetLink: resetLink
                }
            })
        };
        
    } catch (error) {
        console.log('\n❌ ERRO NÃO TRATADO:');
        console.log('   - Nome:', error.name);
        console.log('   - Mensagem:', error.message);
        console.log('   - Stack:', error.stack);
        console.log('='.repeat(60));
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Ocorreu um erro interno. Tente novamente mais tarde.' 
            })
        };
    }
};

