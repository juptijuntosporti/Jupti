/*
 * =================================================================
 * 🧠 JavaScript — Configurações do Filho (VERSÃO MELHORADA)
 * =================================================================
 * 
 * ✅ MELHORIAS IMPLEMENTADAS:
 * 1. Porteiro Inteligente agora verifica 3 cenários:
 *    - Proposta em andamento (PROPOSED/COUNTER_PROPOSED) → Proposta Confirmada
 *    - Acordo fechado (ACCEPTED) → Acordo Fechado
 *    - Nenhum → Enviar Proposta
 * 2. Ambos os pais veem a mesma tela quando há proposta em andamento
 * 3. Após acordo fechado, ambos são redirecionados para tela de Acordo Fechado
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log("✅ JS da tela de Configurações do Filho iniciado.");

    // --- SELETORES ---
    const backButton = document.getElementById('backButton');
    const settingsList = document.querySelector('.cfg-settings-list');

    // --- EVENT LISTENERS ---

    // 1. Botão de voltar
    if (backButton) {
        backButton.addEventListener('click', () => {
            // Volta para a página anterior no histórico do navegador
            history.back();
        });
    }

    // 2. Cliques na lista de configurações (usando delegação de eventos)
    if (settingsList) {
        settingsList.addEventListener('click', function(event) {
            // Encontra o item de configuração clicado
            const settingItem = event.target.closest('.cfg-setting-item');
            
            if (settingItem && settingItem.dataset.action) {
                const action = settingItem.dataset.action;
                handleSettingAction(action);
            }
        });
    }

    /**
     * Função para lidar com as ações de clique nas configurações.
     * @param {string} action - A ação a ser executada.
     */
    function handleSettingAction(action) {
        switch (action) {
            case 'compromisso':
                // Porteiro Inteligente Melhorado: Verifica proposta, acordo ou nada
                checkExistingProposalAndNavigate();
                break;
            case 'guardioes':
                alert('Funcionalidade "Guardiões Conectados" será implementada em breve!');
                break;
            case 'rede-apoio':
                alert('Funcionalidade "Rede de Apoio" será implementada em breve!');
                break;
            case 'album':
                alert('Funcionalidade "Gerenciar Álbum Físico" será implementada em breve!');
                break;
            case 'relatorios':
                alert('Funcionalidade "Gerar Relatórios" será implementada em breve!');
                break;
            case 'editar':
                alert('Funcionalidade "Editar Perfil" será implementada em breve!');
                break;
            case 'excluir':
                if (confirm('Tem certeza que deseja excluir este perfil? Esta ação é irreversível.')) {
                    alert('Funcionalidade "Excluir Perfil" será implementada em breve!');
                }
                break;
            default:
                console.warn(`Ação desconhecida: ${action}`);
        }
    }

    /**
     * ===== PORTEIRO INTELIGENTE MELHORADO =====
     * Verifica se existe:
     * 1. Proposta em andamento (PROPOSED/COUNTER_PROPOSED) → Proposta Confirmada
     * 2. Acordo fechado (ACCEPTED) → Acordo Fechado
     * 3. Nada → Enviar Proposta
     * 
     * ✅ IMPORTANTE: Ambos os pais veem a mesma tela quando há proposta em andamento
     * Isso evita que ambos consigam enviar proposta simultaneamente
     */
    async function checkExistingProposalAndNavigate() {
        try {
            // Obter child_id do localStorage
            const perfilFilhoAtivo = localStorage.getItem('perfilFilhoAtivo');
            
            if (!perfilFilhoAtivo) {
                console.log('⚠️ Nenhum perfil de filho selecionado');
                alert('Por favor, selecione um filho primeiro.');
                return;
            }

            let childId;
            try {
                const perfil = JSON.parse(perfilFilhoAtivo);
                childId = perfil.id;
            } catch (e) {
                console.error('❌ Erro ao fazer parse de perfilFilhoAtivo:', e);
                alert('Erro ao processar perfil do filho.');
                return;
            }

            if (!childId) {
                console.log('⚠️ child_id não encontrado');
                alert('ID da criança não encontrado.');
                return;
            }

            // Obter token de autenticação
            const token = localStorage.getItem('authTokenJUPTI') || localStorage.getItem('authToken');
            
            if (!token) {
                console.log('⚠️ Token não encontrado');
                alert('Você não está autenticado. Por favor, faça login novamente.');
                window.location.href = 'login.html';
                return;
            }

            // Chamar endpoint check-existing-proposal
            const apiUrl = `${window.location.origin}/api/check-existing-proposal?child_id=${childId}`;
            console.log('🔍 Verificando proposta/acordo existente para child_id:', childId);

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('❌ Erro ao verificar proposta:', response.status);
                // Se houver erro, vai para o formulário normalmente
                window.location.href = 'compromisso_convivencia.html';
                return;
            }

            const result = await response.json();
            console.log('✅ Resposta do porteiro inteligente:', result);

            // ===== LÓGICA DE NAVEGAÇÃO MELHORADA =====
            if (result.exists === true && result.commitment_id) {
                
                // CENÁRIO 1: Proposta em andamento (PROPOSED ou COUNTER_PROPOSED)
                if (result.type === 'proposal_in_progress') {
                    console.log('🚨 Proposta em andamento encontrada! Redirecionando para confirmação...');
                    window.location.href = `proposta_confirmada.html?id=${result.commitment_id}`;
                }
                
                // CENÁRIO 2: Acordo fechado (ACCEPTED)
                else if (result.type === 'agreement_closed') {
                    console.log('✅ Acordo fechado encontrado! Redirecionando para visualização...');
                    window.location.href = `acordo_fechado.html?id=${result.commitment_id}`;
                }
                
                // Fallback (não deveria chegar aqui)
                else {
                    console.log('⚠️ Status desconhecido. Redirecionando para confirmação...');
                    window.location.href = `proposta_confirmada.html?id=${result.commitment_id}`;
                }
            } 
            
            // CENÁRIO 3: Nenhuma proposta ou acordo existente
            else {
                console.log('✅ Nenhuma proposta ou acordo existente. Redirecionando para formulário...');
                window.location.href = 'compromisso_convivencia.html';
            }

        } catch (error) {
            console.error('❌ Erro no porteiro inteligente:', error);
            // Em caso de erro, vai para o formulário normalmente
            window.location.href = 'compromisso_convivencia.html';
        }
    }
});
