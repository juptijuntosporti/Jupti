// Substitua o conteúdo do seu connection_request.js por este:

import { respondToConnectionRequest } from './apiService.js';

// --- SELETORES E VARIÁVEIS ---
const steps = { request: document.getElementById('requestStep'), acceptance: document.getElementById('acceptanceStep'), rejection: document.getElementById('rejectionStep'), loading: document.getElementById('loadingStep') };
const acceptButton = document.getElementById('acceptButton');
const refuseButton = document.getElementById('refuseButton');
const acceptanceOkButton = document.getElementById('acceptanceOkButton');
const rejectionOkButton = document.getElementById('rejectionOkButton');
let notificationId = null;

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    notificationId = urlParams.get('notificationId');
    
    if (!notificationId || notificationId === 'undefined' || notificationId === 'null') {
        showFatalError("Erro Crítico: O ID da notificação não foi recebido. Por favor, volte e tente novamente.");
        acceptButton.disabled = true;
        refuseButton.disabled = true;
        return;
    }

    const senderName = urlParams.get('senderName');
    const senderAvatar = urlParams.get('senderAvatar');
    const childName = urlParams.get('childName');
    // ✅ NOVO: Lê o novo parâmetro `childAvatar` da URL.
    const childAvatar = urlParams.get('childAvatar');

    if (!senderName || !childName) {
        showFatalError("Informações do pedido estão incompletas.");
        return;
    }

    // Passa o novo parâmetro para a função que preenche os dados
    populateInitialData(senderName, senderAvatar, childName, childAvatar);
    setupEventListeners();
});


// ✅ FUNÇÃO ATUALIZADA para aceitar e usar o avatar do filho
function populateInitialData(senderName, senderAvatar, childName, childAvatar) {
    document.getElementById('senderName').textContent = senderName;
    document.getElementById('childName').textContent = childName;
    
    const senderAvatarEl = document.getElementById('senderAvatar');
    if (senderAvatar) {
        senderAvatarEl.style.backgroundImage = `url('${senderAvatar}')`;
    }

    // ✅ NOVO: Lógica para preencher o avatar do filho
    const childAvatarEl = document.getElementById('childAvatar');
    if (childAvatar) {
        childAvatarEl.style.backgroundImage = `url('${childAvatar}')`;
    }
}


// --- O RESTANTE DO ARQUIVO CONTINUA EXATAMENTE O MESMO ---

function setupEventListeners() {
    acceptButton.addEventListener('click', () => handleDecision('ACCEPTED'));
    refuseButton.addEventListener('click', () => handleDecision('DECLINED'));
    acceptanceOkButton.addEventListener('click', redirectToFeed);
    rejectionOkButton.addEventListener('click', redirectToFeed);
}

function showStep(stepName) {
    for (const key in steps) { steps[key].classList.remove('active'); }
    if (steps[stepName]) { steps[stepName].classList.add('active'); }
}

function redirectToFeed() { window.location.href = 'feed.html'; }

function showFatalError(message) {
    const pane = document.querySelector('.conn-pane');
    if (pane) {
        pane.innerHTML = `<div class="conn-icon red"><i class="fas fa-exclamation-triangle"></i></div>
                          <h2 class="conn-title">Erro</h2>
                          <p class="conn-body">${message}</p>
                          <div class="conn-footer"><button class="conn-btn secondary" onclick="history.back()">Voltar</button></div>`;
    }
}

async function handleDecision(decision) {
    if (!notificationId || notificationId === 'undefined' || notificationId === 'null') {
        alert("Erro: Não é possível processar a decisão sem um ID de notificação válido.");
        return;
    }

    showStep('loading');

    try {
        const result = await respondToConnectionRequest(notificationId, decision);
        if (result.success) {
            showStep(decision === 'ACCEPTED' ? 'acceptance' : 'rejection');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error(`Erro ao responder ao pedido: ${error.message}`);
        alert(`Ocorreu um erro: ${error.message}. Por favor, tente novamente.`);
        showStep('request');
    }
}
