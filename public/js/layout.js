document.addEventListener('DOMContentLoaded', async () => {
    const headerPlaceholder = document.querySelector('header.header');
    const footerPlaceholder = document.querySelector('footer.footer');
    const layoutReadyEvent = new Event('layoutReady');

    try {
        if (headerPlaceholder) {
            const response = await fetch('_header.html');
            if (!response.ok) throw new Error('Arquivo _header.html não encontrado.');
            headerPlaceholder.innerHTML = await response.text();
        }
        if (footerPlaceholder) {
            const response = await fetch('_footer.html');
            if (!response.ok) throw new Error('Arquivo _footer.html não encontrado.');
            footerPlaceholder.innerHTML = await response.text();
        }
        document.dispatchEvent(layoutReadyEvent);
    } catch (error) {
        console.error('Erro fatal ao carregar o layout:', error);
    }
});

// [NOVO] Adiciona o listener para o clique do menu mobile depois que o layout estiver pronto
document.addEventListener('layoutReady', () => {
    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    const mainNav = document.querySelector('.header nav');

    if (mobileNavToggle && mainNav) {
        mobileNavToggle.addEventListener('click', () => {
            mainNav.classList.toggle('nav-open');
        });
    }
});