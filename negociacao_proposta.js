/**
 * =================================================================
 * 🧠 JavaScript — Negociação de Proposta (VERSÃO COM MODAIS CUSTOMIZADOS)
 * =================================================================
 * Descrição:
 * - Mantém toda a lógica original de carregamento e renderização.
 * - ✅ ADICIONA modais customizados para cada tipo de card
 * - ✅ Cada modal tem campos específicos conforme o tipo
 * - ✅ Garante que os dados sejam salvos no formato correto
 * =================================================================
 */

// ✅ PASSO 1: Importa a função do apiService.js
import { respondToCommitment } from './apiService.js';

// --- ESTADO GLOBAL DA PÁGINA ---
let proposalDetails = null;
let negotiationState = {};
let currentCommitmentType = null; // Rastreia qual tipo de modal está aberto

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    initializePage();
});

async function initializePage() {
    setupEventListeners();
    await loadProposalData();
}

// --- CARREGAMENTO DE DADOS ---
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
            renderHeader();
            renderCommitmentCards();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showError(error.message);
    }
}

// --- RENDERIZAÇÃO DINÂMICA ---
function renderHeader() {
    document.getElementById('proposalTitle').textContent = `Proposta para ${proposalDetails.child_name}`;
    document.getElementById('proposalSender').textContent = `Enviada por ${proposalDetails.created_by_user_name}`;
    
    const statusBadge = document.getElementById('proposalStatus');
    const statusSpan = statusBadge.querySelector('span');
    const statusIcon = statusBadge.querySelector('i');

    switch (proposalDetails.negotiation_status) {
        case 'PROPOSED':
            statusSpan.textContent = 'Aguardando sua resposta';
            statusIcon.className = 'fas fa-clock';
            statusBadge.className = 'np-status-badge';
            break;
        case 'ACCEPTED':
            statusSpan.textContent = 'Acordo Aceito';
            statusIcon.className = 'fas fa-check-circle';
            statusBadge.className = 'np-status-badge accepted';
            break;
        case 'REJECTED':
            statusSpan.textContent = 'Acordo Rejeitado';
            statusIcon.className = 'fas fa-times-circle';
            statusBadge.className = 'np-status-badge rejected';
            break;
        default:
            statusSpan.textContent = 'Pendente';
            statusIcon.className = 'fas fa-spinner fa-spin';
    }
}

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
            const details = commitments[key];
            negotiationState[key] = { status: 'pending' };

            const card = document.createElement('div');
            card.className = 'np-commitment-card';
            card.dataset.commitment = key;

            let detailsHtml = '';
            if (key === 'postings' || key === 'jupti_moments') {
                if(details.goal) detailsHtml += `<div class="np-detail-item"><span class="np-detail-label">Meta Semanal</span><span class="np-detail-value">${details.goal}</span></div>`;
                if(details.preferred_days && details.preferred_days.length > 0) detailsHtml += `<div class="np-detail-item"><span class="np-detail-label">Dias Preferenciais</span><span class="np-detail-value">${details.preferred_days.join(', ')}</span></div>`;
            }
            if (key === 'visits') {
                if(details.type) detailsHtml += `<div class="np-detail-item"><span class="np-detail-label">Tipo</span><span class="np-detail-value">${details.type}</span></div>`;
                if(details.recurrent_days && details.recurrent_days.length > 0) detailsHtml += `<div class="np-detail-item"><span class="np-detail-label">Dias Recorrentes</span><span class="np-detail-value">${details.recurrent_days.join(', ')}</span></div>`;
                if(details.start_date) detailsHtml += `<div class="np-detail-item"><span class="np-detail-label">Data de Início</span><span class="np-detail-value">${new Date(details.start_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span></div>`;
                if(details.end_date) detailsHtml += `<div class="np-detail-item"><span class="np-detail-label">Data de Fim</span><span class="np-detail-value">${new Date(details.end_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span></div>`;
            }
            if (key === 'calls') {
                if (Array.isArray(details.days) && details.days.length > 0) {
                    detailsHtml += `<div class="np-detail-item"><span class="np-detail-label">Dias</span><span class="np-detail-value">${details.days.join(', ')}</span></div>`;
                }
                if (details.time) {
                    detailsHtml += `<div class="np-detail-item"><span class="np-detail-label">Horário</span><span class="np-detail-value">${details.time}</span></div>`;
                }
            }
            if (key === 'pension') {
                if(details.value) detailsHtml += `<div class="np-detail-item"><span class="np-detail-label">Valor</span><span class="np-detail-value">R$ ${Number(details.value).toFixed(2).replace('.', ',')}</span></div>`;
                if(details.date) detailsHtml += `<div class="np-detail-item"><span class="np-detail-label">Data de Pagamento</span><span class="np-detail-value">${new Date(details.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span></div>`;
            }
            if (details.observations) {
                detailsHtml += `<div class="np-detail-observation"><strong>Observação:</strong> <em>"${details.observations}"</em></div>`;
            }

            card.innerHTML = `
                <div class="np-card-header">
                    <div class="np-card-icon"><i class="fas ${icons[key]}"></i></div>
                    <h3 class="np-card-title">${titles[key]}</h3>
                </div>
                <div class="np-card-body">${detailsHtml}</div>
                <div class="np-card-actions">
                    <button class="np-action-btn np-accept-btn" title="Aceitar"><i class="fas fa-check"></i> Aceitar</button>
                    <button class="np-action-btn np-suggest-btn" title="Sugerir Alteração"><i class="fas fa-edit"></i> Sugerir</button>
                </div>
            `;
            container.appendChild(card);
        }
    }
    setupCardActionListeners();
}

function showError(message) {
    const container = document.getElementById('commitments-container');
    container.innerHTML = `<div class="np-intro-box" style="border-color: var(--cor-erro);"><i class="fas fa-exclamation-triangle" style="color: var(--cor-erro);"></i><p>${message}</p></div>`;
    document.querySelector('.np-action-buttons').style.display = 'none';
}

// --- GERENCIAMENTO DE EVENTOS ---
function setupEventListeners() {
    document.getElementById('backButton')?.addEventListener('click', () => window.history.back());
    document.getElementById('acceptAllBtn')?.addEventListener('click', handleAcceptAll);
    document.getElementById('sendCounterBtn')?.addEventListener('click', handleSendCounter);
    
    const modal = document.getElementById('suggestionModal');
    modal.querySelector('.np-modal-overlay').addEventListener('click', () => closeModal());
    modal.querySelector('.np-modal-close').addEventListener('click', () => closeModal());
    modal.querySelector('.np-modal-btn-cancel').addEventListener('click', () => closeModal());
}

function setupCardActionListeners() {
    document.querySelectorAll('.np-accept-btn').forEach(btn => {
        btn.addEventListener('click', handleAcceptClick);
    });
    document.querySelectorAll('.np-suggest-btn').forEach(btn => {
        btn.addEventListener('click', handleSuggestClick);
    });
}

// --- LÓGICA DE AÇÕES ---
function handleAcceptClick(e) {
    const card = e.target.closest('.np-commitment-card');
    const commitmentType = card.dataset.commitment;

    negotiationState[commitmentType] = { status: 'accepted' };
    card.classList.remove('suggested');
    card.classList.add('accepted');

    card.querySelectorAll('.np-action-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
    });
    
    console.log(`✔️ Compromisso "${commitmentType}" aceito.`);
    updateFinalActionButtons();
}

function handleSuggestClick(e) {
    const card = e.target.closest('.np-commitment-card');
    const commitmentType = card.dataset.commitment;
    currentCommitmentType = commitmentType;
    openSuggestionModal(commitmentType);
}

function updateFinalActionButtons() {
    const hasSuggestions = Object.values(negotiationState).some(s => s.status === 'suggested');
    document.getElementById('acceptAllBtn').style.display = hasSuggestions ? 'none' : 'flex';
    document.getElementById('sendCounterBtn').style.display = hasSuggestions ? 'flex' : 'none';
}

// --- LÓGICA DOS MODAIS CUSTOMIZADOS ---
function openSuggestionModal(commitmentType) {
    const modal = document.getElementById('suggestionModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const submitBtn = modal.querySelector('.np-modal-btn-submit');

    const titles = {
        postings: 'Postagens',
        jupti_moments: 'Momentos JUPTI',
        calls: 'Ligações',
        visits: 'Visitas',
        pension: 'Pensão'
    };

    modalTitle.textContent = `Sugerir Alteração - ${titles[commitmentType]}`;
    
    let formHtml = `<form class="np-modal-form" id="suggestionForm">`;

    // ✅ MODAIS CUSTOMIZADOS POR TIPO
    if (commitmentType === 'pension') {
        formHtml += `
            <div class="np-form-group">
                <label for="suggestedValue">Novo Valor Sugerido (R$) <span class="np-required">*</span>:</label>
                <input type="number" id="suggestedValue" class="np-form-input" placeholder="Ex: 1200.00" step="0.01" required>
            </div>
            <div class="np-form-group">
                <label for="suggestedDate">Data de Pagamento <span class="np-required">*</span>:</label>
                <input type="date" id="suggestedDate" class="np-form-input" required>
            </div>
            <div class="np-form-group">
                <label for="suggestionJustification">Justificativa <span class="np-required">*</span>:</label>
                <textarea id="suggestionJustification" class="np-form-textarea" rows="3" placeholder="Explique o motivo da alteração." required></textarea>
            </div>
        `;
    } else if (commitmentType === 'calls') {
        formHtml += `
            <div class="np-form-group">
                <label for="suggestedDays">Dias <span class="np-required">*</span>:</label>
                <div class="np-days-selector">
                    <label><input type="checkbox" name="days" value="seg"> Segunda</label>
                    <label><input type="checkbox" name="days" value="ter"> Terça</label>
                    <label><input type="checkbox" name="days" value="qua"> Quarta</label>
                    <label><input type="checkbox" name="days" value="qui"> Quinta</label>
                    <label><input type="checkbox" name="days" value="sex"> Sexta</label>
                    <label><input type="checkbox" name="days" value="sab"> Sábado</label>
                    <label><input type="checkbox" name="days" value="dom"> Domingo</label>
                </div>
            </div>
            <div class="np-form-group">
                <label for="suggestedTime">Horário <span class="np-required">*</span>:</label>
                <input type="time" id="suggestedTime" class="np-form-input" required>
            </div>
            <div class="np-form-group">
                <label for="suggestionJustification">Justificativa <span class="np-required">*</span>:</label>
                <textarea id="suggestionJustification" class="np-form-textarea" rows="3" placeholder="Explique o motivo da alteração." required></textarea>
            </div>
        `;
    } else if (commitmentType === 'visits') {
        formHtml += `
            <div class="np-form-group">
                <label for="suggestedType">Tipo <span class="np-required">*</span>:</label>
                <select id="suggestedType" class="np-form-input" required>
                    <option value="">Selecione um tipo</option>
                    <option value="recorrente">Recorrente</option>
                    <option value="pontual">Pontual</option>
                </select>
            </div>

            <!-- Grupo para Visitas Recorrentes -->
            <div class="np-form-group" id="recurrentDaysGroup" style="display: none;">
                <label for="suggestedVisitDays">Dias da Semana <span class="np-required">*</span>:</label>
                <div class="np-days-selector">
                    <label><input type="checkbox" name="visitDays" value="seg"> Segunda</label>
                    <label><input type="checkbox" name="visitDays" value="ter"> Terça</label>
                    <label><input type="checkbox" name="visitDays" value="qua"> Quarta</label>
                    <label><input type="checkbox" name="visitDays" value="qui"> Quinta</label>
                    <label><input type="checkbox" name="visitDays" value="sex"> Sexta</label>
                    <label><input type="checkbox" name="visitDays" value="sab"> Sábado</label>
                    <label><input type="checkbox" name="visitDays" value="dom"> Domingo</label>
                </div>
            </div>

            <!-- Grupo para Visitas Pontuais -->
            <div id="pontualGroup" style="display: none; flex-direction: column; gap: 16px;">
                <div class="np-form-group">
                    <label for="suggestedStartDate">Data de Início <span class="np-required">*</span>:</label>
                    <input type="date" id="suggestedStartDate" class="np-form-input">
                </div>
                <div class="np-form-group">
                    <label for="suggestedEndDate">Data de Fim:</label>
                    <input type="date" id="suggestedEndDate" class="np-form-input">
                </div>
            </div>

            <div class="np-form-group">
                <label for="suggestionJustification">Justificativa <span class="np-required">*</span>:</label>
                <textarea id="suggestionJustification" class="np-form-textarea" rows="3" placeholder="Explique o motivo da alteração." required></textarea>
            </div>
        `;
    } else if (commitmentType === 'postings' || commitmentType === 'jupti_moments') {
        formHtml += `
            <div class="np-form-group">
                <label for="suggestedGoal">Meta Semanal <span class="np-required">*</span>:</label>
                <input type="number" id="suggestedGoal" class="np-form-input" placeholder="Ex: 3" min="1" required>
            </div>
            <div class="np-form-group">
                <label for="suggestedPostingDays">Dias Preferidos <span class="np-required">*</span>:</label>
                <div class="np-days-selector">
                    <label><input type="checkbox" name="postingDays" value="seg"> Segunda</label>
                    <label><input type="checkbox" name="postingDays" value="ter"> Terça</label>
                    <label><input type="checkbox" name="postingDays" value="qua"> Quarta</label>
                    <label><input type="checkbox" name="postingDays" value="qui"> Quinta</label>
                    <label><input type="checkbox" name="postingDays" value="sex"> Sexta</label>
                    <label><input type="checkbox" name="postingDays" value="sab"> Sábado</label>
                    <label><input type="checkbox" name="postingDays" value="dom"> Domingo</label>
                </div>
            </div>
            <div class="np-form-group">
                <label for="suggestionJustification">Justificativa <span class="np-required">*</span>:</label>
                <textarea id="suggestionJustification" class="np-form-textarea" rows="3" placeholder="Explique o motivo da alteração." required></textarea>
            </div>
        `;
    }

    formHtml += `</form>`;
    modalBody.innerHTML = formHtml;

    // ✅ LÓGICA DO MODAL DINÂMICO DE VISITAS
    if (commitmentType === 'visits') {
        const typeSelect = document.getElementById('suggestedType');
        const recurrentDaysGroup = document.getElementById('recurrentDaysGroup');
        const pontualGroup = document.getElementById('pontualGroup');

        const toggleVisitFields = () => {
            if (typeSelect.value === 'recorrente') {
                recurrentDaysGroup.style.display = 'flex';
                pontualGroup.style.display = 'none';
            } else if (typeSelect.value === 'pontual') {
                recurrentDaysGroup.style.display = 'none';
                pontualGroup.style.display = 'flex';
            } else {
                recurrentDaysGroup.style.display = 'none';
                pontualGroup.style.display = 'none';
            }
        };

        typeSelect.addEventListener('change', toggleVisitFields);
        toggleVisitFields(); // Chama na inicialização para definir o estado correto
    }

    submitBtn.onclick = () => submitSuggestion(commitmentType);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('suggestionModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    currentCommitmentType = null;
}

function submitSuggestion(commitmentType) {
    const form = document.getElementById('suggestionForm');
    const justification = form.querySelector('#suggestionJustification')?.value.trim();

    if (!justification) {
        alert('A justificativa é obrigatória para enviar uma sugestão.');
        return;
    }

    let suggestionData = { justification };

    // ✅ EXTRAÇÃO DE DADOS CUSTOMIZADA POR TIPO
    if (commitmentType === 'pension') {
        const value = form.querySelector('#suggestedValue')?.value;
        const date = form.querySelector('#suggestedDate')?.value;
        
        if (!value || !date) {
            alert('Valor e data de pagamento são obrigatórios.');
            return;
        }

        suggestionData = {
            value: value, // CORREÇÃO: Usar 'value' em vez de 'suggestion'
            date: date,
            justification: justification
        };
    } else if (commitmentType === 'calls') {
        const selectedDays = Array.from(form.querySelectorAll('input[name="days"]:checked')).map(cb => cb.value);
        const time = form.querySelector('#suggestedTime')?.value;

        if (selectedDays.length === 0 || !time) {
            alert('Selecione pelo menos um dia e um horário.');
            return;
        }

        suggestionData = {
            days: selectedDays,
            time: time,
            justification: justification
        };
    } else if (commitmentType === 'visits') {
        const type = form.querySelector('#suggestedType')?.value;
        if (!type) {
            alert('O tipo da visita (recorrente ou pontual) é obrigatório.');
            return;
        }

        suggestionData.type = type;

        if (type === 'recorrente') {
            const selectedDays = Array.from(form.querySelectorAll('input[name="visitDays"]:checked')).map(cb => cb.value);
            if (selectedDays.length === 0) {
                alert('Para visitas recorrentes, selecione pelo menos um dia da semana.');
                return;
            }
            suggestionData.recurrent_days = selectedDays;
        } else if (type === 'pontual') {
            const startDate = form.querySelector('#suggestedStartDate')?.value;
            if (!startDate) {
                alert('Para visitas pontuais, a data de início é obrigatória.');
                return;
            }
            suggestionData.start_date = startDate;
            suggestionData.end_date = form.querySelector('#suggestedEndDate')?.value || null;
        }
    } else if (commitmentType === 'postings' || commitmentType === 'jupti_moments') {
        const goal = form.querySelector('#suggestedGoal')?.value;
        const selectedDays = Array.from(form.querySelectorAll(`input[name="${commitmentType === 'postings' ? 'postingDays' : 'postingDays'}"]:checked`)).map(cb => cb.value);

        if (!goal || selectedDays.length === 0) {
            alert('Meta semanal e dias preferidos são obrigatórios.');
            return;
        }

        suggestionData = {
            goal: goal,
            preferred_days: selectedDays,
            justification: justification
        };
    }

    negotiationState[commitmentType] = {
        status: 'suggested',
        data: suggestionData
    };

    const card = document.querySelector(`.np-commitment-card[data-commitment="${commitmentType}"]`);
    card.classList.remove('accepted');
    card.classList.add('suggested');
    card.querySelectorAll('.np-action-btn').forEach(btn => { btn.disabled = true; btn.style.opacity = '0.6'; });

    console.log(`📝 Sugestão para "${commitmentType}" registrada:`, suggestionData);
    closeModal();
    updateFinalActionButtons();
}

// --- AÇÕES FINAIS ---
function handleAcceptAll() {
    if (confirm("Você tem certeza que deseja aceitar todos os termos desta proposta?")) {
        const finalResponse = {
            commitmentId: proposalDetails.id,
            responses: negotiationState
        };
        console.log("✅ ENVIANDO ACEITAÇÃO TOTAL:", finalResponse);
        submitResponseToBackend(finalResponse);
    }
}

function handleSendCounter() {
    if (confirm("Você tem certeza que deseja enviar esta contraproposta?")) {
        const finalResponse = {
            commitmentId: proposalDetails.id,
            responses: negotiationState
        };
        console.log("📨 Preparando para enviar contraproposta para o backend:", finalResponse);
        submitResponseToBackend(finalResponse);
    }
}

async function submitResponseToBackend(responseData) {
    const acceptBtn = document.getElementById('acceptAllBtn');
    const counterBtn = document.getElementById('sendCounterBtn');

    if (acceptBtn) acceptBtn.disabled = true;
    if (counterBtn) {
        counterBtn.disabled = true;
        counterBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    }

    try {
        const result = await respondToCommitment(responseData.commitmentId, responseData.responses);

        if (result.success) {
            alert(result.message);
            setTimeout(() => { window.history.back(); }, 1500);
        } else {
            throw new Error(result.message || 'Falha ao enviar a resposta.');
        }

    } catch (error) {
        console.error('❌ Erro ao enviar resposta:', error);
        alert(`Erro: ${error.message}`);
        
        if (acceptBtn) acceptBtn.disabled = false;
        if (counterBtn) {
            counterBtn.disabled = false;
            counterBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Contraproposta';
        }
    }
}
