// public/js/utils/validation.js

/**
 * Exibe uma mensagem de erro abaixo de um campo de formulário.
 */
function displayError(inputElement, message) {
    if (!inputElement) return;
    let errorDiv = inputElement.parentElement.querySelector('.field-error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'field-error-message';
        errorDiv.style.color = '#d32f2f';
        errorDiv.style.fontSize = '0.9em';
        errorDiv.style.marginTop = '5px';
        inputElement.parentNode.insertBefore(errorDiv, inputElement.nextSibling);
    }
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    inputElement.classList.add('invalid');
}

/**
 * Limpa a mensagem de erro de um campo.
 */
function clearError(inputElement) {
    if (!inputElement) return;
    let errorDiv = inputElement.parentElement.querySelector('.field-error-message');
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }
    inputElement.classList.remove('invalid');
}

/**
 * Valida se um campo obrigatório (texto) está preenchido.
 * @returns {boolean} True se for válido.
 */
function validateRequired(inputElement, fieldName) {
    if (!inputElement || inputElement.value.trim() === '') {
        displayError(inputElement, `${fieldName} é obrigatório.`);
        return false;
    }
    clearError(inputElement);
    return true;
}

/**
 * Valida se uma data é obrigatória e não está no passado.
 * @returns {boolean} True se for válida.
 */
function validateDate(inputElement) {
    if (!inputElement || inputElement.value.trim() === '') {
        displayError(inputElement, 'Data de validade é obrigatória.');
        return false;
    }
    const hoje = new Date().toISOString().split('T')[0];
    if (inputElement.value < hoje) {
        displayError(inputElement, 'A data não pode ser anterior a hoje.');
        return false;
    }
    clearError(inputElement);
    return true;
}

/**
 * Valida um formato de e-mail.
 * @returns {boolean} True se for válido.
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
 * Valida o tamanho mínimo da senha.
 * @returns {boolean} True se for válida.
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
 * Valida o tamanho mínimo da senha.
 * @returns {boolean} True se for válida.
 */
function validatePasswordLength(inputElement) {
    if (inputElement.value.length < 8) {
        displayError(inputElement, 'A senha deve ter no mínimo 8 caracteres.');
        return false;
    }
    clearError(inputElement);
    return true;
}


/**
 * Converte uma string de data (AAAA-MM-DD) ou timestamp para um objeto Date local.
 * @param {string|Date} dateInput - A data do banco (pode vir com 'T').
 * @returns {Date|null}
 */
function parseDateAsLocal(dateInput) {
    if (!dateInput) return null;
    if (dateInput instanceof Date) return dateInput;
    if (typeof dateInput === 'string') {
        const dateString = dateInput.split('T')[0]; // Pega apenas AAAA-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            console.error('Formato de data inválido recebido:', dateInput);
            return null;
        }
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day); // Mês é 0-indexado
    }
    return null;
}

/**
 * Formata um objeto Date ou string de data para o padrão 'DD/MM/AAAA'.
 * @param {Date|string} date - O objeto de data ou a string do banco.
 * @returns {string} A data formatada ou 'N/A'.
 */
function formatDateForClient(date) {
    if (!date) return 'N/A';
    const dateObj = parseDateAsLocal(date);
    if (!dateObj || isNaN(dateObj)) return 'Data Inválida';
    return dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}
