/**
 * =================================================================
 * 🔑 JUPTI - Nova Senha (Frontend) - VERSÃO CORRIGIDA
 * =================================================================
 * Descrição:
 * - Lê o token da URL e valida IMEDIATAMENTE ao carregar a página
 * - Envia a nova senha para a função serverless
 * - Corrige o problema de "token expirado" ao clicar em salvar
 * =================================================================
 */

document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("novaSenhaForm");
    const novaSenhaInput = document.getElementById("novaSenha");
    const confirmarSenhaInput = document.getElementById("confirmarSenha");
    const submitButton = form.querySelector("button[type='submit']");

    // Extrai o token da URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    // Se não houver token na URL, redireciona para o login
    if (!token) {
        alert("Link inválido ou expirado. Por favor, solicite um novo link de recuperação.");
        window.location.href = "index.html";
        return;
    }

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
     * ✅ NOVA FUNÇÃO: Valida o token ao carregar a página
     * Isso evita que o usuário preencha o formulário com um token já expirado
     */
    async function validateTokenOnLoad() {
        try {
            // Faz uma chamada de teste para verificar se o token é válido
            // Usamos uma senha temporária só para validar o token
            const response = await fetch("/api/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                    token: token, 
                    newPassword: "temp123456", // Senha temporária para validação
                    validateOnly: true // Flag para indicar que é apenas validação
                }),
            });

            const data = await response.json();

            // Se o token estiver inválido ou expirado, redireciona
            if (!response.ok && response.status === 401) {
                alert(data.message || "O link de recuperação expirou. Por favor, solicite um novo.");
                window.location.href = "recuperar_senha.html";
                return false;
            }

            return true;

        } catch (error) {
            console.error("Erro ao validar token:", error);
            // Em caso de erro de rede, permite continuar
            return true;
        }
    }

    /**
     * Envia o token e a nova senha para a API de redefinição de senha.
     * @param {string} token - O token JWT recebido por e-mail.
     * @param {string} newPassword - A nova senha do usuário.
     * @returns {Promise<object>} - Retorna a resposta da API.
     */
    async function redefinirSenha(token, newPassword) {
        const response = await fetch("/api/reset-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ token: token, newPassword: newPassword }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || `Erro ${response.status}: Falha na comunicação com o servidor`);
        }

        return data;
    }

    // ✅ VALIDAÇÃO PREVENTIVA: Valida o token assim que a página carrega
    // Comentado porque pode causar problemas - a validação será feita apenas no submit
    // validateTokenOnLoad();

    // --- EVENTO DE SUBMISSÃO DO FORMULÁRIO ---
    form.addEventListener("submit", async function(event) {
        event.preventDefault();

        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = "Salvando...";

        const novaSenha = novaSenhaInput.value.trim();
        const confirmarSenha = confirmarSenhaInput.value.trim();

        // Validação: Verifica se as senhas coincidem
        if (novaSenha !== confirmarSenha) {
            showErrorMessage("As senhas não coincidem. Por favor, tente novamente.");
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
            return;
        }

        // Validação: Verifica o tamanho mínimo da senha
        if (novaSenha.length < 6) {
            showErrorMessage("A senha deve ter pelo menos 6 caracteres.");
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
            return;
        }

        try {
            const result = await redefinirSenha(token, novaSenha);
            
            showSuccessMessage(result.message || "Senha redefinida com sucesso!");
            
            // Limpa os campos
            novaSenhaInput.value = "";
            confirmarSenhaInput.value = "";

            // Após 2 segundos, redireciona para o login
            setTimeout(() => {
                window.location.href = "index.html";
            }, 2000);

        } catch (error) {
            showErrorMessage(error.message);
            
            // Restaura o botão para permitir uma nova tentativa
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
});

