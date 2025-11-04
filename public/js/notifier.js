/**
 * Notifier.js
 * Um sistema de notificação global self-contained.
 * Ele cria e gerencia seu próprio elemento HTML.
 */
(function(window) {

    let notifierDiv = null;
    let hideTimer = null;

    // 1. Cria o elemento <div> no DOM
    function createNotifier() {
        notifierDiv = document.createElement('div');
        notifierDiv.className = 'global-notifier';
        document.body.appendChild(notifierDiv);
    }

    // 2. A função principal que mostra a notificação
    function show(message, type = 'success', duration = 3000) {
        if (!notifierDiv) {
            createNotifier();
        }

        // Limpa qualquer timer anterior se uma nova notificação chegar
        if (hideTimer) {
            clearTimeout(hideTimer);
        }

        // Define o conteúdo e as classes de estilo
        notifierDiv.textContent = message;
        notifierDiv.className = 'global-notifier'; // Limpa classes antigas
        notifierDiv.classList.add(type);      // Adiciona 'success' ou 'error'
        notifierDiv.classList.add('show');    // Torna visível

        // 3. Define o timer para esconder
        hideTimer = setTimeout(() => {
            notifierDiv.classList.remove('show');
        }, duration);
    }

    // 4. Expõe as funções para o 'window' (para que outros scripts possam usá-las)
    window.Notifier = {
        /**
         * Mostra uma notificação de sucesso (verde, checkmark).
         * @param {string} message - O texto a ser exibido.
         * @param {number} [duration=2000] - Duração em milissegundos (Padrão: 2s).
         */
        showSuccess: function(message, duration = 2000) {
            // Usamos 2s (2000ms) como padrão de sucesso, 1s é muito rápido.
            show(message, 'success', duration);
        },

        /**
         * Mostra uma notificação de erro (vermelha, X).
         * @param {string} message - O texto a ser exibido.
         * @param {number} [duration=4000] - Duração em milissegundos (Padrão: 4s).
         */
        showError: function(message, duration = 4000) {
            // Erros precisam de mais tempo de leitura.
            show(message, 'error', duration);
        }
    };

})(window);