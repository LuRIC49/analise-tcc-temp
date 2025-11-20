(function(window) {

    let notifierDiv = null;
    let hideTimer = null;

    
    function createNotifier() {
        notifierDiv = document.createElement('div');
        notifierDiv.className = 'global-notifier';
        document.body.appendChild(notifierDiv);
    }

    
    function show(message, type = 'success', duration = 3000) {
        if (!notifierDiv) {
            createNotifier();
        }

        
        if (hideTimer) {
            clearTimeout(hideTimer);
        }

        
        notifierDiv.textContent = message;
        notifierDiv.className = 'global-notifier'; 
        notifierDiv.classList.add(type);      
        notifierDiv.classList.add('show');    

        
        hideTimer = setTimeout(() => {
            notifierDiv.classList.remove('show');
        }, duration);
    }

    
    window.Notifier = {
        /**
         * @param {string} message
         * @param {number} [duration=2000]
         */
        showSuccess: function(message, duration = 2000) {
            
            show(message, 'success', duration);
        },

        /**
         * @param {string} message
         * @param {number} [duration=4000]
         */
        showError: function(message, duration = 4000) {
            
            show(message, 'error', duration);
        }
    };

})(window);