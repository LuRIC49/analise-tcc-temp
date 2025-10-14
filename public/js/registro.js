document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('companyRegistrationForm');
    const nomeInput = document.getElementById('nome');
    const cnpjInput = document.getElementById('cnpj');
    const senhaInput = document.getElementById('senha');
    const confirmarSenhaInput = document.getElementById('confirmarSenha');
    const enderecoInput = document.getElementById('endereco');
    const emailInput = document.getElementById('email');
    const submitButton = document.querySelector('.submit-button');
    


    let notificationDiv = null;


    function showNotification(message, type) {
        if (notificationDiv) {
            notificationDiv.remove();
        }

        notificationDiv = document.createElement('div');
        notificationDiv.classList.add('notification-message', type);
        notificationDiv.textContent = message;

        document.body.appendChild(notificationDiv);

        notificationDiv.style.left = '50%';
        notificationDiv.style.top = '50%';
        notificationDiv.style.transform = 'translate(-50%, -50%)';
        notificationDiv.style.display = 'block';

        setTimeout(() => {
            if (notificationDiv) {
                notificationDiv.remove();
                notificationDiv = null;
            }
        }, 3000);
    }

    /**
     *
     * @param {HTMLElement} inputElement
     * @param {string} message 
     */
    function displayError(inputElement, message) {
        let errorDiv = inputElement.nextElementSibling;
        if (!errorDiv || !errorDiv.classList.contains('error-message')) {
            errorDiv = document.createElement('div');
            errorDiv.classList.add('error-message');
            inputElement.parentNode.insertBefore(errorDiv, inputElement.nextSibling);
        }
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        inputElement.classList.add('invalid');
    }

    /**
     * 
     * @param {HTMLElement} inputElement
     */
    function clearError(inputElement) {
        let errorDiv = inputElement.nextElementSibling;
        if (errorDiv && errorDiv.classList.contains('error-message')) {
            errorDiv.textContent = '';
            errorDiv.style.display = 'none';
        }
        inputElement.classList.remove('invalid');
    }

    /**
     * Valida um campo obrigatório.
     * @param {HTMLElement} inputElement 
     * @param {string} fieldName 
     * @returns {boolean} 
     */
    function validateRequired(inputElement, fieldName) {
        if (inputElement.value.trim() === '') {
            displayError(inputElement, `${fieldName} é obrigatório.`);
            return false;
        }
        clearError(inputElement);
        return true;
    }

    /**
     * Valida o formato de e-mail.
     * @param {HTMLElement} inputElement 
     * @returns {boolean} 
     */
    function validateEmail(inputElement) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(inputElement.value.trim())) {
            displayError(inputElement, 'Formato de e-mail inválido.');
            return false;
        }
        clearError(inputElement);
        return true;
    }

    /**
     * Valida o formato de CNPJ 14 digits only
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
     * Valida a senha 8 númericos only.
     * @param {HTMLElement} inputElement 
     * @returns {boolean} 
     */
    function validateSenha(inputElement) {
        if (inputElement.value.length < 8) {
            displayError(inputElement, 'A senha deve ter no mínimo 8 caracteres.');
            return false;
        }
        clearError(inputElement);
        return true;
    }

    /**
     * Valida se as senhas são iguais.
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

    // impor limite de caracteres 
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

    //formato cpnj
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




    //envio do form
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
            
            console.log('Dados do formulário para enviar:', data);

            try {
                const response = await fetch('http://localhost:3001/api/auth/register-company', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();
                console.log('Resposta do servidor:', result);

                if (response.ok) {
                    showNotification(result.message || 'Cadastro realizado com sucesso!', 'success');
                    form.reset();
                    // Redireciona para a página de login
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    showNotification(result.message || 'Erro no cadastro: Erro desconhecido.', 'error');
                }
            } catch (error) {
                console.error('Erro na requisição:', error);
                showNotification('Ocorreu um erro ao tentar conectar com o servidor. Verifique sua conexão.', 'error');
            } finally {
                submitButton.disabled = false;
            }

        } else {
            showNotification('Por favor, corrija os erros no formulário antes de enviar.', 'error');
        }
    });

    //realtime validação
    nomeInput.addEventListener('input', () => validateRequired(nomeInput, 'Nome da Empresa'));
    cnpjInput.addEventListener('blur', () => validateCnpj(cnpjInput));
    senhaInput.addEventListener('input', () => {
        validateSenha(senhaInput);
        validateConfirmarSenha(senhaInput, confirmarSenhaInput);
    });
    confirmarSenhaInput.addEventListener('input', () => validateConfirmarSenha(senhaInput, confirmarSenhaInput));
    emailInput.addEventListener('input', () => validateEmail(emailInput));
});