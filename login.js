// Arquivo: login.js (Frontend)
// VERSÃO COMPLETA E ATUALIZADA COM REDIRECIONAMENTO INTELIGENTE

document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const senhaInput = document.getElementById("senha");
    const submitButton = form.querySelector("button[type='submit']");

    /**
     * Envia as credenciais para a API de login e retorna a resposta.
     * @param {string} email - O email do usuário.
     * @param {string} senha - A senha do usuário.
     * @returns {Promise<object>} - Retorna uma promessa que resolve com o objeto { token, user }.
     */
    async function autenticarUsuario(email, senha) {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: email, password: senha }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            // Lança um erro com a mensagem do servidor ou uma mensagem padrão.
            throw new Error(data.message || `Erro ${response.status}: Falha na comunicação com o servidor`);
        }

        // Retorna o objeto com 'token' e 'user' que o backend envia.
        return {
            token: data.token,
            user: data.user
        };
    }

    // --- EVENTO DE SUBMISSÃO DO FORMULÁRIO ---
    form.addEventListener("submit", async function(event) {
        event.preventDefault();

        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = "Entrando...";

        const email = emailInput.value;
        const senha = senhaInput.value;

        try {
            // Chama a função de autenticação e desestrutura o resultado.
            const { token, user } = await autenticarUsuario(email, senha);
            
            // Salva o TOKEN no localStorage para ser usado em outras páginas.
            localStorage.setItem("authTokenJUPTI", token);

            // ✅✅✅ LÓGICA DE REDIRECIONAMENTO INTELIGENTE ✅✅✅
            
            // Verifica a flag 'is_profile_complete' que veio do backend.
            if (user.is_profile_complete) {
                // Se o perfil está completo, vai direto para o feed.
                alert("Bem-vindo(a) de volta, " + user.full_name.split(' ')[0] + "!");
                window.location.href = "feed.html";
            } else {
                // Se o perfil não está completo, inicia o fluxo de configuração.
                alert("Login bem-sucedido! Agora, vamos completar seu perfil.");
                window.location.href = "selecao_perfil.html";
            }

        } catch (error) {
            // Em caso de erro no login (senha errada, usuário não existe, etc.)
            alert("Falha no login: " + error.message);
            
            // Restaura o botão para permitir uma nova tentativa.
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
});
