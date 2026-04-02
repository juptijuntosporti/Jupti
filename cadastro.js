document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("formCadastro");
    const emailInput = document.getElementById("email");
    const senhaInput = document.getElementById("senha");
    const confirmarInput = document.getElementById("confirmar");
    const erroSenha = document.getElementById("erroSenha");
    const submitButton = form.querySelector("button[type='submit']");

    // --- FUNÇÕES DE LÓGICA ---

    /**
     * Função principal que lida com o cadastro do usuário.
     * Agora conecta com o backend vercel em vez do localStorage.
     * @param {object} dadosUsuario - Os dados do usuário a serem cadastrados.
     * @returns {Promise<object>} - Retorna uma promessa que resolve com o resultado da operação.
     */
    async function cadastrarUsuario(dadosUsuario) {
        const response = await fetch("/api/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                full_name: dadosUsuario.nome,
                email: dadosUsuario.email,
                phone_number: dadosUsuario.telefone,
                password: dadosUsuario.senha
            }),
        });

        let data;
        try {
            // Tentar fazer parse do JSON
            data = await response.json();
        } catch (jsonError) {
            // Se não conseguir fazer parse do JSON, criar uma resposta de erro padrão
            console.error('Erro ao fazer parse do JSON:', jsonError);
            data = { 
                success: false, 
                message: response.ok ? 'Resposta inválida do servidor' : `Erro ${response.status}: ${response.statusText}` 
            };
        }

        if (!response.ok) {
            throw new Error(data.message || `Erro ${response.status}: Falha na comunicação com o servidor`);
        }

        return { success: true, message: data.message };
    }

    /**
     * Valida se as senhas digitadas são iguais.
     */
    function validarSenhas() {
        if (senhaInput.value !== confirmarInput.value && confirmarInput.value.length > 0) {
            erroSenha.style.display = "block";
            return false;
        }
        erroSenha.style.display = "none";
        return true;
    }

    // --- EVENT LISTENERS ---

    // Validação em tempo real das senhas
    confirmarInput.addEventListener("input", validarSenhas);
    senhaInput.addEventListener("input", validarSenhas);

    // Evento de submissão do formulário
    form.addEventListener("submit", async function(event) {
        event.preventDefault();

        if (!validarSenhas()) {
            return;
        }

        // Feedback visual de carregamento
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = "Cadastrando...";

        // Coleta os dados do formulário
        const dadosDoFormulario = {
            nome: document.getElementById("nome").value,
            email: emailInput.value,
            telefone: document.getElementById("telefone").value,
            senha: senhaInput.value
        };

        try {
            // Chama a função de cadastro e aguarda o resultado
            const resultado = await cadastrarUsuario(dadosDoFormulario);
            
            // Se deu certo (sucesso)
            alert(resultado.message + " Você será redirecionado para o login.");
            window.location.href = "index.html";

        } catch (error) {
            // Se deu erro (usuário já existe)
            alert("Erro: " + error.message);
            
            // Restaura o botão para permitir nova tentativa
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
});
