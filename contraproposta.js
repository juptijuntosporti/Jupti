/**
 * =================================================================
 * 🧠 JavaScript — Responder Contraproposta (VERSÃO MELHORADA v2)
 * =================================================================
 * Melhorias Implementadas:
 * 1. ✅ Exibe quem CRIOU a proposta (não o usuário atual)
 * 2. ✅ Mostra detalhes completos: dias da semana, horários, datas
 * 3. ✅ Sistema de observações sem alterar o acordo
 * 4. ✅ Seletor visual de datas/dias (melhorado)
 * =================================================================
 */

import { respondToCommitment } from './apiService.js';

let proposalDetails = null;
let negotiationState = {};
let currentUserId = null;

document.addEventListener('DOMContentLoaded', () => {
    initializePage();
});

async function initializePage() {
    currentUserId = localStorage.getItem('userIdJUPTI');
    setupEventListeners();
    await loadProposalData();
}

async function loadProposalData() {
    const urlParams = new URLSearchParams(window.location.search);
    const commitmentId = urlParams.get('id');

    if (!commitmentId) {
        showError("ID da proposta não encontrado na URL.");
        return;
    }

    try {
        const response = await fetch(`/api/get-commitment-details?commitment_id=${commitmentId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authTokenJUPTI')}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Erro ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            proposalDetails = result.commitment;
            
            if (proposalDetails.negotiation_status !== 'COUNTER_PROPOSED') {
                showError("Esta proposta não é uma contraproposta. Use a tela de negociação normal.");
                return;
            }

            renderHeader();
            renderCommitmentCards();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showError(error.message);
    }
}

// ✅ MELHORIA 1: Exibe quem criou a proposta (não o usuário atual)
function renderHeader() {
    const creatorName = proposalDetails.created_by_user_name || 'Outro genitor';
    document.getElementById('proposalTitle').textContent = `Respondendo Contraproposta - ${proposalDetails.child_name}`;
    document.getElementById('proposalSender').textContent = `De ${creatorName}`;
    
    const statusBadge = document.getElementById('proposalStatus');
    const statusSpan = statusBadge.querySelector('span');
    const statusIcon = statusBadge.querySelector('i');

    statusSpan.textContent = '🔄 Contraproposta recebida';
    statusIcon.className = 'fas fa-exchange-alt';
    statusBadge.className = 'cp-status-badge';
}

// ✅ MELHORIA 2: Renderização com detalhes completos
function renderCommitmentCards() {
    const container = document.getElementById('commitments-container');
    container.innerHTML = '';

    const commitments = proposalDetails.details;
    const icons = {
        postings: 'fa-camera-retro',
        jupti_moments: 'fa-star',
        calls: 'fa-phone-alt',
        visits: 'fa-home',
        pension: 'fa-money-bill-wave'
    };
    const titles = {
        postings: 'Postagens',
        jupti_moments: 'Momentos JUPTI',
        calls: 'Ligações',
        visits: 'Visitas',
        pension: 'Pensão'
    };

    for (const key in commitments) {
        if (Object.hasOwnProperty.call(commitments, key) && commitments[key]) {
            
            const item = commitments[key];
            const card = document.createElement('div');
            card.className = 'cp-commitment-card';
            card.dataset.commitment = key;

            let detailsHtml = '';
            let cardActionsHtml = '';

            if (item.status === 'suggested') {
                card.classList.add('suggested');

                // ✅ DETALHES MELHORADOS - CORREÇÃO APLICADA
                const originalDetails = formatDetail(key, item.original);
                const suggestionDetails = formatDetail(key, item.suggestion);

                detailsHtml = `
                    <div class="cp-detail-item" style="background-color: #f8f9fa; padding: 10px; border-radius: 8px; margin-bottom: 12px;">
                        <span class="cp-detail-label" style="font-weight: bold;">SUA PROPOSTA ORIGINAL</span>
                        <div class="cp-detail-value">${originalDetails}</div>
                    </div>
                    <div class="cp-detail-item" style="background-color: #fff9e6; padding: 10px; border-radius: 8px;">
                        <span class="cp-detail-label" style="font-weight: bold; color: #b4770f;">SUGESTÃO RECEBIDA</span>
                        <div class="cp-detail-value" style="color: #b4770f; font-weight: bold;">${suggestionDetails}</div>
                    </div>
                `;
                if (item.suggestion && item.suggestion.justification) {
                    detailsHtml += `<div class="cp-detail-observation"><strong>Justificativa:</strong> <em>"${item.suggestion.justification}"</em></div>`;
                }

                // ✅ MELHORIA 3: Adiciona campo de observação
                detailsHtml += `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #ddd;">
                        <label class="cp-detail-label" style="display: block; margin-bottom: 6px;">Adicionar Observação (opcional):</label>
                        <textarea class="cp-observation-field" data-commitment="${key}" placeholder="Ex: Se conseguir licença da escola, tudo certo pra mim." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9rem; resize: vertical; min-height: 60px;"></textarea>
                    </div>
                `;

                cardActionsHtml = `
                    <button class="cp-action-btn cp-accept-btn" data-action="accept-suggestion" title="Aceitar Sugestão"><i class="fas fa-check"></i> Aceitar Sugestão</button>
                    <button class="cp-action-btn cp-keep-btn" data-action="keep-original" title="Manter Proposta Original"><i class="fas fa-undo"></i> Manter Original</button>
                `;

            } else if (item.status === 'accepted') {
                card.classList.add('accepted');
                const acceptedDetails = formatDetail(key, item.original);
                detailsHtml = `<div class="cp-detail-item"><div class="cp-detail-value">${acceptedDetails}</div></div>`;
                cardActionsHtml = `<button class="cp-action-btn cp-accept-btn" disabled><i class="fas fa-check-circle"></i> Aceito por ambos</button>`;
            }

            card.innerHTML = `
                <div class="cp-card-header">
                    <div class="cp-card-icon"><i class="fas ${icons[key]}"></i></div>
                    <h3 class="cp-card-title">${titles[key]}</h3>
                </div>
                <div class="cp-card-body">${detailsHtml}</div>
                <div class="cp-card-actions">${cardActionsHtml}</div>
            `;
            container.appendChild(card);
        }
    }
    
    setupCardActionListeners();
}

// ✅ FUNÇÃO DE FORMATAÇÃO: Formata detalhes de forma robusta e simples
function formatDetail(key, detail) {
    if (!detail) return 'Não definido';
    if (typeof detail !== 'object' || detail === null) {
        if (key === 'pension') return `R$ ${Number(detail).toFixed(2).replace('.', ',')}`;
        return detail;
    }
    let parts = [];
    if (detail.goal) parts.push(`Meta: ${detail.goal}`);
    if (detail.preferred_days && detail.preferred_days.length > 0) parts.push(`Dias: ${detail.preferred_days.join(', ')}`);
    if (detail.type) parts.push(`Tipo: ${detail.type}`);
    if (detail.recurrent_days && detail.recurrent_days.length > 0) parts.push(`Dias Recorrentes: ${detail.recurrent_days.join(', ')}`);
    if (detail.days && detail.days.length > 0) parts.push(`Dias: ${detail.days.join(', ')}`);
    if (detail.time) parts.push(`Horário: ${detail.time}`);
    if (detail.start_date) {
        const startDate = new Date(detail.start_date);
        startDate.setUTCDate(startDate.getUTCDate() + 1);
        parts.push(`Início: ${startDate.toLocaleDateString('pt-BR')}`);
    }
    if (detail.end_date) {
        const endDate = new Date(detail.end_date);
        endDate.setUTCDate(endDate.getUTCDate() + 1);
        parts.push(`Fim: ${endDate.toLocaleDateString('pt-BR')}`);
    }
    if (detail.value) parts.push(`Valor: R$ ${Number(detail.value).toFixed(2).replace('.', ',')}`);    
    if (detail.date) {
        const d = new Date(detail.date);
        d.setUTCDate(d.getUTCDate() + 1);
        parts.push(`Data: ${d.toLocaleDateString('pt-BR')}`);
    }
    if (parts.length === 0 && detail.suggestion) return formatDetail(key, detail.suggestion);
    return parts.length > 0 ? parts.join(' | ') : 'Detalhes não especificados';
}

function showError(message) {
    const container = document.getElementById('commitments-container');
    container.innerHTML = `<div class="cp-intro-box" style="border-color: var(--cor-erro);"><i class="fas fa-exclamation-triangle" style="color: var(--cor-erro);"></i><p>${message}</p></div>`;
    document.querySelector('.cp-action-buttons').style.display = 'none';
}

function setupEventListeners() {
    document.getElementById('backButton')?.addEventListener('click', () => window.history.back());
    document.getElementById('finalizeBtn')?.addEventListener('click', handleFinalize);
    
    const modal = document.getElementById('confirmationModal');
    modal.querySelector('.cp-modal-overlay').addEventListener('click', () => closeModal());
    modal.querySelector('.cp-modal-close').addEventListener('click', () => closeModal());
    modal.querySelector('.cp-modal-btn-cancel').addEventListener('click', () => closeModal());
}

function setupCardActionListeners() {
    document.querySelectorAll('.cp-accept-btn').forEach(btn => {
        if (!btn.disabled) {
            btn.addEventListener('click', handleAcceptClick);
        }
    });
    document.querySelectorAll('.cp-keep-btn').forEach(btn => {
        btn.addEventListener('click', handleKeepClick);
    });
}

function handleAcceptClick(e) {
    const card = e.target.closest('.cp-commitment-card');
    const commitmentType = card.dataset.commitment;
    const observation = card.querySelector('.cp-observation-field')?.value || '';

    negotiationState[commitmentType] = { 
        status: 'accepted',
        observation: observation
    };
    card.classList.remove('suggested');
    card.classList.add('accepted');

    card.querySelectorAll('.cp-action-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
    });
    
    console.log(`✔️ Sugestão para "${commitmentType}" aceita. Observação: "${observation}"`);
    updateFinalButton();
}

function handleKeepClick(e) {
    const card = e.target.closest('.cp-commitment-card');
    const commitmentType = card.dataset.commitment;
    const observation = card.querySelector('.cp-observation-field')?.value || '';

    negotiationState[commitmentType] = { 
        status: 'kept_original',
        observation: observation
    };
    card.classList.remove('suggested');
    card.classList.add('accepted');

    card.querySelectorAll('.cp-action-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
    });
    
    console.log(`↶ Proposta original para "${commitmentType}" mantida. Observação: "${observation}"`);
    updateFinalButton();
}

function updateFinalButton() {
    const finalizeBtn = document.getElementById('finalizeBtn');
    const commitments = proposalDetails.details;
    
    let suggestedCount = 0;
    for (const key in commitments) {
        if (commitments[key]?.status === 'suggested') {
            suggestedCount++;
        }
    }

    if (suggestedCount === Object.keys(negotiationState).length) {
        finalizeBtn.disabled = false;
    }
}

function openConfirmationModal() {
    const modal = document.getElementById('confirmationModal');
    const modalBody = document.getElementById('modalBody');
    
    let summaryHtml = '<p style="margin-bottom: 16px;"><strong>Resumo das suas decisões:</strong></p><ul style="list-style: none; padding: 0;">';
    
    for (const key in negotiationState) {
        const decision = negotiationState[key];
        const item = proposalDetails.details[key];
        const titles = {
            postings: 'Postagens',
            jupti_moments: 'Momentos JUPTI',
            calls: 'Ligações',
            visits: 'Visitas',
            pension: 'Pensão'
        };

        if (decision.status === 'accepted') {
            summaryHtml += `<li style="padding: 8px 0; border-bottom: 1px solid #eee;">✅ <strong>${titles[key]}</strong>: Aceitar sugestão`;
            if (decision.observation) {
                summaryHtml += `<br/><span style="color: #666; font-size: 0.9rem; margin-left: 20px;">📝 Observação: "${decision.observation}"</span>`;
            }
            summaryHtml += `</li>`;
        } else if (decision.status === 'kept_original') {
            summaryHtml += `<li style="padding: 8px 0; border-bottom: 1px solid #eee;">↶ <strong>${titles[key]}</strong>: Manter original`;
            if (decision.observation) {
                summaryHtml += `<br/><span style="color: #666; font-size: 0.9rem; margin-left: 20px;">📝 Observação: "${decision.observation}"</span>`;
            }
            summaryHtml += `</li>`;
        }
    }
    
    summaryHtml += '</ul><p style="margin-top: 16px; color: #666; font-size: 0.9rem;">Após confirmar, o acordo será finalizado e não poderá ser alterado.</p>';
    
    modalBody.innerHTML = summaryHtml;
    
    const submitBtn = modal.querySelector('.cp-modal-btn-submit');
    submitBtn.onclick = () => submitFinalResponse();

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('confirmationModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function handleFinalize() {
    openConfirmationModal();
}

async function submitFinalResponse() {
    const finalizeBtn = document.getElementById('finalizeBtn');
    finalizeBtn.disabled = true;
    finalizeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finalizando...';

    try {
        const responses = {};
        for (const key in negotiationState) {
            const decision = negotiationState[key];
            responses[key] = { 
                status: 'accepted',
                observation: decision.observation || null
            };
        }

        const finalResponse = {
            commitmentId: proposalDetails.id,
            responses: responses
        };

        console.log("✅ ENVIANDO RESPOSTA FINAL:", finalResponse);

        const result = await respondToCommitment(finalResponse.commitmentId, finalResponse.responses);

        if (result.success) {
            alert('Acordo finalizado com sucesso!');
            setTimeout(() => { window.history.back(); }, 1500);
        } else {
            throw new Error(result.message || 'Falha ao finalizar o acordo.');
        }

    } catch (error) {
        console.error('❌ Erro ao finalizar:', error);
        alert(`Erro: ${error.message}`);
        
        finalizeBtn.disabled = false;
        finalizeBtn.innerHTML = '<i class="fas fa-check-circle"></i> Firmar Acordo Final';
    }

    closeModal();
}
