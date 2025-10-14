function initializeAuth() {
    const authContainerDesktop = document.querySelector('.registrologin');
    const mainNavList = document.querySelector('#main-nav-list');
    
    const authToken = localStorage.getItem('authToken');

    if (authContainerDesktop) authContainerDesktop.innerHTML = '';
    document.querySelectorAll('.auth-link-item').forEach(item => item.remove());

    let links = [];


    const handleLogout = (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = 'login.html';
    };

    if (authToken) {
        document.body.classList.remove('guest');
        document.body.classList.add('logged-in');

        const profileLink = document.createElement('a');
        profileLink.href = 'perfil.html';
        profileLink.textContent = 'MEU PERFIL';

        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.textContent = 'SAIR';

        links.push(profileLink, logoutLink);

        if (mainNavList && !mainNavList.querySelector('a[href*="inventario"]')) {
            const inventoryLi = document.createElement('li');
            const inventoryLink = document.createElement('a');
            inventoryLink.href = 'inventario.html';
            inventoryLink.textContent = 'INVENTÁRIO';
            inventoryLi.appendChild(inventoryLink);
            mainNavList.appendChild(inventoryLi);
        }

    } else { // Usuário deslogado
        document.body.classList.remove('logged-in');
        document.body.classList.add('guest');

        const registerLink = document.createElement('a');
        registerLink.href = 'registro.html';
        registerLink.textContent = 'CADASTRAR-SE';

        const loginLink = document.createElement('a');
        loginLink.href = 'login.html';
        loginLink.textContent = 'LOGIN';
        links.push(registerLink, loginLink);
    }
    

    links.forEach(link => {
        if (authContainerDesktop) {
            const desktopClone = link.cloneNode(true);
            

            if (desktopClone.textContent === 'SAIR') {
                desktopClone.addEventListener('click', handleLogout);
            }
            authContainerDesktop.appendChild(desktopClone);
        }

        // Para o menu Mobile
        if (mainNavList) {
            const mobileLi = document.createElement('li');
            mobileLi.className = 'auth-link-item';
            const mobileClone = link.cloneNode(true);
            
            if (mobileClone.textContent === 'SAIR') {
                mobileClone.addEventListener('click', handleLogout);
            }
            mobileLi.appendChild(mobileClone);
            mainNavList.appendChild(mobileLi);
        }
    });
}

document.addEventListener('layoutReady', initializeAuth);