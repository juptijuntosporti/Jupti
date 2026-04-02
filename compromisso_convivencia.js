/**
 * ================================================================
 * 🧠 JavaScript — Compromisso de Convivência (VERSÃO CORRIGIDA E ATUALIZADA)
 * ================================================================
 * 
 * ✅ CORREÇÃO CRÍTICA:
 * 1.  **Busca Automática do Outro Genitor:** Ao carregar a página, o script agora chama a API
 *     `/get-child-guardians` para identificar silenciosamente o ID do outro genitor.
 * 2.  **Lógica Assíncrona:** O botão "Enviar Proposta" começa desabilitado e só é ativado
 *     APÓS o ID do outro genitor ser carregado com sucesso, evitando o envio de dados nulos.
 * 3.  **Tratamento de Erro:** Se o outro genitor não for encontrado (ainda não conectado),
 *     o formulário permanece bloqueado e uma mensagem clara é exibida.
 * 4.  **Inclusão do ID:** O `other_parent_id` obtido é agora incluído no payload enviado
 *     para a API `create-commitment`, permitindo que a notificação seja criada corretamente.
 * 
 * Nenhuma funcionalidade original foi removida.
 */

// --- 1. VARIÁVEL GLOBAL PARA ARMAZENAR O ID DO OUTRO GENITOR ---
let otherParentId = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Compromisso de Convivência - JS ATUALIZADO carregado');

    // --- 2. SELETORES (sem alterações) ---
    const form = document.getElementById('commitmentForm');
    const backButton = document.getElementById('backButton');
    const submitBtn = document.getElementById('submitBtn');
    const formStatus = document.getElementById('formStatus');
    const postingGoalSelect = document.getElementById('postingGoal');
    const momentsGoalSelect = document.getElementById('momentsGoal');
    const visitTypeRadios = document.querySelectorAll('input[name="visit_type"]');
    const recurrentVisitsSection = document.getElementById('recurrentVisits');
    const specificDatesVisitsSection = document.getElementById('specificDatesVisits');

    // --- 3. INICIALIZAÇÃO DA PÁGINA ---
    
    // Desabilita o botão de envio por padrão. Ele só será ativado se o outro genitor for encontrado.
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando conexão...';
    }

    // Inicia a busca pelo outro genitor assim que a página carrega.
    loadOtherParentId();

    // --- 4. FUNÇÕES AUXILIARES (sem alterações) ---
    function showStatus(message, type = 'info') { /* ...código original sem alteração... */ }
    function getCheckboxValues(name) { /* ...código original sem alteração... */ }
    function clearCheckboxes(name) { /* ...código original sem alteração... */ }
    function validateFrequencyDays(frequency, selectedDays, fieldName) { /* ...código original sem alteração... */ }
    function validateNoDuplicateDays(days1, days2, fieldName) { /* ...código original sem alteração... */ }
    function getAuthToken() { /* ...código original sem alteração... */ }
    function getChildId() { /* ...código original sem alteração... */ }
    function getUserId() { /* ...código original sem alteração... */ }

    // --- 5. ✅ NOVA FUNÇÃO: BUSCA O ID DO OUTRO GENITOR ---
    /**
     * Chama a API para buscar os guardiões da criança e armazena o ID do outro genitor.
     * Habilita o formulário se o outro genitor for encontrado.
     */
    async function loadOtherParentId() {
        const childId = getChildId();
        const token = getAuthToken();
        const submitBtn = document.getElementById('submitBtn');

        if (!childId || !token) {
            showStatus('❌ Erro crítico: Não foi possível identificar a criança ou o usuário. Volte e tente novamente.', 'error');
            return;
        }

        try {
            console.log(`Buscando outro genitor para a criança com ID: ${childId}`);
            const response = await fetch(`/api/get-child-guardians?child_id=${childId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();

            if (response.ok && result.success && result.other_parent_id) {
                // SUCESSO! Armazena o ID e habilita o formulário.
                otherParentId = result.other_parent_id;
                console.log(`✅ Outro genitor encontrado: ${otherParentId}`);
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Proposta de Acordo';
                showStatus('✅ Conexão com o outro genitor verificada. Você pode criar a proposta.', 'success');
            } else {
                // FALHA: Outro genitor não encontrado ou erro na API.
                throw new Error(result.message || 'O outro genitor precisa estar conectado ao perfil do filho para criar uma proposta.');
            }
        } catch (error) {
            console.error('Erro ao buscar outro genitor:', error);
            showStatus(`❌ ${error.message}`, 'error');
            // Mantém o botão desabilitado em caso de erro.
            submitBtn.innerHTML = '<i class="fas fa-times-circle"></i> Envio Bloqueado';
        }
    }

    // --- 6. EVENT LISTENERS (sem alterações) ---
    if (backButton) { backButton.addEventListener('click', (e) => { e.preventDefault(); history.back(); }); }
    visitTypeRadios.forEach(radio => { /* ...código original sem alteração... */ });
    postingGoalSelect.addEventListener('change', () => { /* ...código original sem alteração... */ });
    momentsGoalSelect.addEventListener('change', () => { /* ...código original sem alteração... */ });
    document.querySelectorAll('input[name="posting_days"]').forEach(checkbox => { /* ...código original sem alteração... */ });
    document.querySelectorAll('input[name="moments_days"]').forEach(checkbox => { /* ...código original sem alteração... */ });

    // --- 7. SUBMISSÃO DO FORMULÁRIO (LÓGICA ATUALIZADA) ---
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        console.log('📝 Iniciando validação e coleta de dados...');

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        try {
            // Validações (sem alterações)
            const postingGoal = document.getElementById('postingGoal').value;
            const postingDays = getCheckboxValues('posting_days');
            if (!postingGoal || !validateFrequencyDays(postingGoal, postingDays, 'Postagens')) {
                throw new Error('Verifique a configuração de dias de postagem.');
            }
            const momentsGoal = document.getElementById('momentsGoal').value;
            const momentsDays = getCheckboxValues('moments_days');
            if (!momentsGoal || !validateFrequencyDays(momentsGoal, momentsDays, 'Momentos JUPTI')) {
                throw new Error('Verifique a configuração de dias de momentos.');
            }
            if (!validateNoDuplicateDays(postingDays, momentsDays, 'Dias de Postagens e Momentos')) {
                throw new Error('Conflito de dias entre postagens e momentos.');
            }

            // Coleta de Dados (com a inclusão do otherParentId)
            const formData = new FormData(form);
            const childId = getChildId();
            const userId = getUserId();

            // ✅✅✅ PONTO-CHAVE DA CORREÇÃO ✅✅✅
            // O otherParentId, que foi carregado no início, agora é incluído aqui.
            const commitmentData = {
                child_id: childId,
                created_by_user_id: userId,
                other_parent_id: otherParentId, // <-- AQUI ESTÁ A MÁGICA!
                type: 'CONVIVENCIA',
                negotiation_status: 'PROPOSED',
                details: {
                    postings: { goal: postingGoal, preferred_days: postingDays, observations: formData.get('posting_observations') || null },
                    jupti_moments: { goal: momentsGoal, preferred_days: momentsDays, observations: formData.get('moments_observations') || null },
                    calls: { days: getCheckboxValues('call_days'), time: formData.get('call_time') || null, observations: formData.get('call_observations') || null },
                    visits: { type: formData.get('visit_type'), observations: formData.get('visit_observations') || null },
                    pension: { date: formData.get('pension_date') || null, value: formData.get('pension_value') ? parseFloat(formData.get('pension_value')) : null, observations: formData.get('pension_observations') || null }
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Adicionar dados específicos de visitas (sem alterações)
            const visitType = formData.get('visit_type');
            if (visitType === 'recorrente') {
                commitmentData.details.visits.recurrent_days = getCheckboxValues('recurrent_visit_days');
            } else if (visitType === 'datas_especificas') {
                commitmentData.details.visits.start_date = formData.get('visit_start_date') || null;
                commitmentData.details.visits.end_date = formData.get('visit_end_date') || null;
            }

            console.log('✅ Dados coletados com sucesso (com other_parent_id):', commitmentData);

            // Envio para a API (sem alterações)
            submitToBackend(commitmentData);

        } catch (error) {
            console.error('❌ Erro na validação:', error.message);
            showStatus(`❌ ${error.message}`, 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Proposta de Acordo';
        }
    });

    // --- 8. FUNÇÃO DE ENVIO PARA O BACKEND (sem alterações) ---
    async function submitToBackend(commitmentData) {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Você não está autenticado.');

            const apiUrl = `${window.location.origin}/api/create-commitment`;
            console.log('📤 Enviando para API:', apiUrl);

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(commitmentData)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || `Erro na API: ${response.status}`);
            
            console.log('✅ Resposta do servidor:', result);
            showStatus(`✅ Proposta enviada com sucesso!`, 'success');
            
            const commitmentId = result.commitment_id || result.id;
            if (commitmentId) {
                window.location.href = `proposta_confirmada.html?id=${commitmentId}`;
            } else {
                setTimeout(() => { history.back(); }, 2000);
            }

        } catch (error) {
            console.error('❌ Erro ao enviar para API:', error.message);
            showStatus(`❌ Erro ao enviar: ${error.message}`, 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Proposta de Acordo';
        }
    }

    // --- CÓDIGO ORIGINAL SEM ALTERAÇÕES ---
    // (As funções auxiliares que não foram modificadas estão aqui para manter a completude)
    function showStatus(message, type = 'info') {
        const statusDiv = document.getElementById('formStatus');
        if (!statusDiv) {
            alert(message); // Fallback
            return;
        }
        statusDiv.className = `form-status ${type}`;
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';
        statusDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
    function getCheckboxValues(name) { return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(el => el.value); }
    function clearCheckboxes(name) { document.querySelectorAll(`input[name="${name}"]`).forEach(c => c.checked = false); }
    function validateFrequencyDays(frequency, selectedDays, fieldName) { const freq = parseInt(frequency); if (selectedDays.length !== freq) { throw new Error(`${fieldName}: Selecione exatamente ${freq} dias.`); } return true; }
    function validateNoDuplicateDays(days1, days2, fieldName) { const intersection = days1.filter(day => days2.includes(day)); if (intersection.length > 0) { throw new Error(`${fieldName}: Não pode haver compromissos no mesmo dia.`); } return true; }
    function getAuthToken() { return localStorage.getItem('authTokenJUPTI') || localStorage.getItem('authToken'); }
    function getChildId() { try { const perfilFilhoString = localStorage.getItem('perfilFilhoAtivo'); if (perfilFilhoString) { const perfil = JSON.parse(perfilFilhoString); return perfil.id; } return null; } catch (e) { return null; } }
    function getUserId() { return localStorage.getItem('user_id') || sessionStorage.getItem('user_id'); }
    visitTypeRadios.forEach(radio => { radio.addEventListener('change', (event) => { if (event.target.value === 'recorrente') { recurrentVisitsSection.classList.remove('hidden'); specificDatesVisitsSection.classList.add('hidden'); } else { recurrentVisitsSection.classList.add('hidden'); specificDatesVisitsSection.classList.remove('hidden'); } }); });
    postingGoalSelect.addEventListener('change', () => { clearCheckboxes('posting_days'); });
    momentsGoalSelect.addEventListener('change', () => { clearCheckboxes('moments_days'); });
    document.querySelectorAll('input[name="posting_days"]').forEach(checkbox => { checkbox.addEventListener('change', () => { const freq = postingGoalSelect.value; const selected = getCheckboxValues('posting_days'); if (freq && selected.length > parseInt(freq)) { checkbox.checked = false; showStatus(`⚠️ Você já selecionou ${freq} dias!`, 'error'); } }); });
    document.querySelectorAll('input[name="moments_days"]').forEach(checkbox => { checkbox.addEventListener('change', () => { const freq = momentsGoalSelect.value; const selected = getCheckboxValues('moments_days'); if (freq && selected.length > parseInt(freq)) { checkbox.checked = false; showStatus(`⚠️ Você já selecionou ${freq} dias!`, 'error'); } }); });
});
