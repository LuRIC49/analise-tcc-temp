document.addEventListener('DOMContentLoaded', function() {

    const form = document.getElementById('companyRegistrationForm');
    const nomeInput = document.getElementById('nome');
    const cnpjInput = document.getElementById('cnpj');
    const senhaInput = document.getElementById('senha');
    const confirmarSenhaInput = document.getElementById('confirmarSenha');
    const enderecoInput = document.getElementById('endereco');
    const emailInput = document.getElementById('email');
    const submitButton = document.querySelector('.submit-button');

    /**
     * @param {HTMLElement} inputElement 
     * @returns {boolean} 
     */
    function validateCnpj(inputElement) {
        const cnpjValue = inputElement.value.trim().replace(/\D/g, '');
        if (cnpjValue.length !== 14 || !/^\d+$/.test(cnpjValue)) {
            displayError(inputElement, 'CNPJ deve conter 14 dígitos numéricos.');
            return false;
        }
        clearError(inputElement);
        return true;
    }

    /**
     * @param {HTMLElement} senhaInput 
     * @param {HTMLElement} confirmarSenhaInput 
     * @returns {boolean} 
     */
    function validateConfirmarSenha(senhaInput, confirmarSenhaInput) {
        if (senhaInput.value !== confirmarSenhaInput.value) {
            displayError(confirmarSenhaInput, 'As senhas não coincidem.');
            return false;
        }
        clearError(confirmarSenhaInput);
        return true;
    }

    /**
     * @param {HTMLElement} inputElement
     * @param {number} maxLength
     */
    const applyMaxLength = (inputElement, maxLength) => {
        inputElement.addEventListener('input', function(event) {
            if (event.target.value.length > maxLength) {
                event.target.value = event.target.value.substring(0, maxLength);
            }
        });
    };

    applyMaxLength(nomeInput, 256);
    applyMaxLength(emailInput, 256);
    applyMaxLength(senhaInput, 256);
    applyMaxLength(confirmarSenhaInput, 256);

    //CNPJ format
    cnpjInput.addEventListener('input', function(event) {
        let value = event.target.value.replace(/\D/g, '');
        let formattedValue = '';
        if (value.length > 0) {
            formattedValue = value.substring(0, 2);
            if (value.length > 2) formattedValue += '.' + value.substring(2, 5);
            if (value.length > 5) formattedValue += '.' + value.substring(5, 8);
            if (value.length > 8) formattedValue += '/' + value.substring(8, 12);
            if (value.length > 12) formattedValue += '-' + value.substring(12, 14);
        }
        event.target.value = formattedValue;
    });



    form.addEventListener('submit', async function(event) { 
        event.preventDefault();

        let isValid = true;
        isValid = validateRequired(nomeInput, 'Nome da Empresa') && isValid;
        isValid = validateCnpj(cnpjInput) && isValid;
        isValid = validateSenha(senhaInput) && isValid;
        isValid = validateConfirmarSenha(senhaInput, confirmarSenhaInput) && isValid;
        isValid = validateRequired(enderecoInput, 'Endereço da Matriz') && isValid;
        isValid = validateEmail(emailInput) && isValid;

        if (isValid) {
            submitButton.disabled = true;

            const data = {
                nome: nomeInput.value,
                cnpj: cnpjInput.value.replace(/\D/g, ''),
                senha: senhaInput.value,
                endereco: enderecoInput.value,
                email: emailInput.value
            };

            try {
                const response = await fetch('http://localhost:3001/api/auth/registrar-empresa', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    Notifier.showSuccess(result.message || 'Cadastro realizado com sucesso!');
                    form.reset();
                    //Redireciona para a login pag
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    Notifier.showError(result.message || 'Erro no cadastro: Erro desconhecido.');
                }
            } catch (error) {
                console.error('Erro na requisição:', error);
                Notifier.showError('Ocorreu um erro ao tentar conectar com o servidor. Verifique sua conexão.');
            } finally {
                submitButton.disabled = false;
            }

        } else {
            Notifier.showError('Por favor, corrija os erros no formulário antes de enviar.');
        }
    });

    nomeInput.addEventListener('input', () => validateRequired(nomeInput, 'Nome da Empresa'));
    cnpjInput.addEventListener('blur', () => validateCnpj(cnpjInput));
    senhaInput.addEventListener('input', () => {
        validateSenha(senhaInput);
        validateConfirmarSenha(senhaInput, confirmarSenhaInput);
    });
    confirmarSenhaInput.addEventListener('input', () => validateConfirmarSenha(senhaInput, confirmarSenhaInput));
    emailInput.addEventListener('input', () => validateEmail(emailInput));
});