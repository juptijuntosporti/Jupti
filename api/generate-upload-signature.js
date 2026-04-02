// Arquivo: netlify/functions/generate-upload-signature.js (VERSÃO CORRIGIDA)

const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }

    try {
        // Pega a pasta do corpo da requisição, ou usa padrão
        let folder = 'jupti/avatars'; // Padrão
        
        if (event.body) {
            try {
                const body = JSON.parse(event.body);
                if (body.folder) {
                    folder = body.folder;
                }
            } catch (e) {
                // Se não conseguir fazer parse, usa o padrão
            }
        }

        const timestamp = Math.round((new Date).getTime()/1000);

        // ✅ CORREÇÃO: Assina com a pasta correta enviada pelo frontend
        const signature = cloudinary.utils.api_sign_request({
            timestamp: timestamp,
            folder: folder
        }, process.env.CLOUDINARY_API_SECRET);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                signature: signature,
                timestamp: timestamp,
                folder: folder,
                api_key: process.env.CLOUDINARY_API_KEY,
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME
            }),
        };
    } catch (error) {
        console.error("Erro ao gerar assinatura:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: 'Erro ao gerar assinatura de upload.' })
        };
    }
};
