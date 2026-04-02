/**
 * =================================================================
 * 🔑 JUPTI - Recuperar Senha (Frontend)
 * =================================================================
 * Descrição:
 * - Envia o e-mail do usuário para a função serverless que gera
 *   o token JWT e envia o link de recuperação por e-mail.
 * =================================================================
 */

document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("recuperarSenhaForm");
    const emailInput = document.getElementById("email");
    const submitButton = form.querySelector("button[type='submit']");

    /**
     * Exibe uma mensagem de sucesso na tela.
     * @param {string} message - A mensagem a ser exibida.
     */
    function showSuccessMessage(message) {
        // Remove mensagens anteriores
        const existingMessages = document.querySelectorAll('.success-message, .error-message');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = 'success-message';
        messageDiv.textContent = message;
        form.insertBefore(messageDiv, form.firstChild);
    }

    /**
     * Exibe uma mensagem de erro na tela.
     * @param {string} message - A mensagem a ser exibida.
     */
    function showErrorMessage(message) {
        // Remove mensagens anteriores
        const existingMessages = document.querySelectorAll('.success-message, .error-message');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = 'error-message';
        messageDiv.textContent = message;
        form.insertBefore(messageDiv, form.firstChild);
    }

    /**
     * Envia o e-mail para a API de recuperação de senha.
     * @param {string} email - O e-mail do usuário.
     * @returns {Promise<object>} - Retorna a resposta da API.
     */
    async function enviarLinkRecuperacao(email) {
        const response = await fetch("/api/send-reset-email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: email }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || `Erro ${response.status}: Falha na comunicação com o servidor`);
        }

        return data;
    }

    // --- EVENTO DE SUBMISSÃO DO FORMULÁRIO ---
    form.addEventListener("submit", async function(event) {
        event.preventDefault();

        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = "Enviando...";

        const email = emailInput.value.trim();

        try {
            const result = await enviarLinkRecuperacao(email);
            
            showSuccessMessage(result.message || "Link de recuperação enviado! Verifique seu e-mail.");
            
            // Limpa o campo de e-mail
            emailInput.value = "";

            // Após 3 segundos, redireciona para o login
            setTimeout(() => {
                window.location.href = "index.html";
            }, 3000);

        } catch (error) {
            showErrorMessage(error.message);
            
            // Restaura o botão para permitir uma nova tentativa
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
});

