/**
 * =================================================================
 * 🧠 JUPTI - Lógica da Tela "Acordo Fechado" (VERSÃO 2.1)
 * =================================================================
 * Versão: 2.1 - Final Fixes
 *
 * Funcionalidades:
 * - Busca os detalhes de um acordo finalizado a partir da API.
 * - Interpreta corretamente a estrutura de dados para propostas diretas e contrapropostas.
 * - ✅ CORREÇÃO: Garante que a data do acordo e da revisão sejam exibidas corretamente.
 * - ✅ CORREÇÃO: Exibe os detalhes da pensão mesmo em uma contraproposta.
 * - Formata todas as informações para exibição amigável.
 * =================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const commitmentId = urlParams.get('id');

    if (!commitmentId) {
        showError("ID do acordo não encontrado na URL. Volte e tente novamente.");
        return;
    }

    loadAgreementDetails(commitmentId);

    document.getElementById('generatePdfBtn').addEventListener('click', () => {
        alert('Funcionalidade "Gerar PDF" será implementada em breve.');
    });

    document.getElementById('supportBtn').addEventListener('click', () => {
        alert('Funcionalidade "Abrir Suporte para Revisão" será implementada em breve.');
    });
});

async function loadAgreementDetails(id) {
    const loadingEl = document.getElementById('loadingState');
    const contentEl = document.getElementById('content');

    try {
        const token = localStorage.getItem('authTokenJUPTI');
        if (!token) {
            throw new Error('Você não está autenticado. Por favor, faça o login novamente.');
        }

        const apiUrl = `/.netlify/functions/get-commitment-details?commitment_id=${id}`;
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Erro ${response.status} ao buscar o acordo.`);
        }

        const result = await response.json();
        if (!result.success || !result.commitment) {
            throw new Error('Não foi possível carregar os detalhes do acordo.');
        }

        const data = result.commitment;

        // --- Preenche a tela com os dados reais ---

        document.getElementById('childName').textContent = data.child_name;
        
        // ✅ CORREÇÃO: Garante que a data é válida antes de formatar
        const agreementDate = data.created_at ? new Date(data.created_at) : null;
        if (agreementDate && !isNaN(agreementDate)) {
            document.getElementById('agreementDate').textContent = agreementDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

            const reviewDate = new Date(agreementDate);
            reviewDate.setMonth(reviewDate.getMonth() + 3);
            document.getElementById('nextReviewDate').textContent = `A partir de ${reviewDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`;
        } else {
            // Se a data não vier da API, exibe a mensagem de indisponível.
            document.getElementById('agreementDate').textContent = "Data indisponível";
            document.getElementById('nextReviewDate').textContent = "Data indisponível";
        }

        const container = document.getElementById('detailsContainer');
        container.innerHTML = createDetailCards(data.details);

        loadingEl.style.display = 'none';
        contentEl.style.display = 'block';

    } catch (error) {
        showError(error.message);
    }
}

function createDetailCards(details) {
    const icons = {
        postings: 'fa-camera-retro', jupti_moments: 'fa-star',
        calls: 'fa-phone-alt', visits: 'fa-home', pension: 'fa-money-bill-wave'
    };
    const titles = {
        postings: 'Postagens', jupti_moments: 'Momentos JUPTI',
        calls: 'Ligações', visits: 'Visitas', pension: 'Pensão'
    };

    let html = '';
    for (const key in titles) {
        if (details[key]) {
            html += `
                <div class="detail-card">
                    <div class="card-title"><i class="fas ${icons[key]}"></i> ${titles[key]}</div>
                    <div class="card-body">${formatDetailBody(key, details[key])}</div>
                </div>
            `;
        }
    }
    return html;
}

/**
 * ✅ FUNÇÃO CORRIGIDA E FINAL: Formata o corpo de um card,
 * tratando corretamente propostas diretas e contrapropostas para todos os campos.
 */
function formatDetailBody(key, detail) {
    let bodyHtml = '';

    if (!detail) {
        return '<div class="detail-item"><p>Termos não especificados.</p></div>';
    }

    let finalDetail = {};

    // ✅ CONTRAPROPOSTA ACEITA → mescla original + suggestion
    if (detail.status === 'accepted' && detail.original) {
        // Se há uma sugestão, usa os dados da sugestão
        // A estrutura é: suggestion: { suggestion: "500", justification: "..." }
        let suggestionData = {};
        if (detail.suggestion) {
            // Se suggestion tem um campo 'suggestion', extrai ele
            if (detail.suggestion.suggestion !== undefined) {
                suggestionData = { value: detail.suggestion.suggestion };
            } else {
                // Caso contrário, usa a sugestão como está
                suggestionData = detail.suggestion;
            }
        }
        
        finalDetail = {
            ...detail.original,
            ...suggestionData,  // ✅ Sobrescreve com dados da sugestão
            ...(detail.value ? { value: detail.value } : {})
        };
    }
    // ✅ AINDA SUGERIDO
    else if (detail.status === 'suggested' && detail.suggestion) {
        finalDetail = detail.suggestion;
    }
    // ✅ PROPOSTA DIRETA
    else {
        finalDetail = detail;
    }

    // ---------- RENDERIZAÇÃO ----------
    if (finalDetail.goal)
        bodyHtml += `<div class="detail-item"><label>Meta Semanal</label><p>${finalDetail.goal}</p></div>`;

    if (finalDetail.preferred_days?.length)
        bodyHtml += `<div class="detail-item"><label>Dias Acordados</label><p>${finalDetail.preferred_days.join(', ')}</p></div>`;

    if (finalDetail.days?.length)
        bodyHtml += `<div class="detail-item"><label>Dias Acordados</label><p>${finalDetail.days.join(', ')}</p></div>`;

    if (finalDetail.time)
        bodyHtml += `<div class="detail-item"><label>Horário Combinado</label><p>${finalDetail.time}</p></div>`;

    if (finalDetail.type)
        bodyHtml += `<div class="detail-item"><label>Tipo</label><p>${finalDetail.type}</p></div>`;

    if (finalDetail.recurrent_days?.length)
        bodyHtml += `<div class="detail-item"><label>Dias Recorrentes</label><p>${finalDetail.recurrent_days.join(', ')}</p></div>`;

    if (finalDetail.start_date && finalDetail.end_date) {
        const start = new Date(finalDetail.start_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        const end = new Date(finalDetail.end_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        bodyHtml += `<div class="detail-item"><label>Período Acordado</label><p>${start} a ${end}</p></div>`;
    }

    if (finalDetail.value)
        bodyHtml += `<div class="detail-item"><label>Valor Acordado</label><p>R$ ${Number(finalDetail.value).toFixed(2).replace('.', ',')}</p></div>`;

    if (finalDetail.date)
        bodyHtml += `<div class="detail-item"><label>Data de Pagamento</label><p>Dia ${new Date(finalDetail.date).getUTCDate()} de cada mês</p></div>`;

    const obs = detail.observation || finalDetail.observations;
    if (obs)
        bodyHtml += `<div class="detail-item"><p class="observation"><strong>Observação:</strong> ${obs}</p></div>`;

    return bodyHtml || '<div class="detail-item"><p>Termos não especificados.</p></div>';
}

function showError(message) {
    const loadingEl = document.getElementById('loadingState');
    const contentEl = document.getElementById('content');
    
    loadingEl.innerHTML = `<p style="color: #D8000C; font-weight: bold; font-size: 18px;">Ocorreu um Erro</p><p>${message}</p>`;
    loadingEl.style.display = 'block';
    contentEl.style.display = 'none';
}
