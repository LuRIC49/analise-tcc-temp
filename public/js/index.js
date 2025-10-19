document.addEventListener('DOMContentLoaded', () => {
    
    const swiperWrapper = document.querySelector('.swiper-wrapper');

    // buscar insumos api
    async function fetchInsumos() {
        try {
            const response = await fetch('/api/insumos');
            if (!response.ok) {
                throw new Error('Não foi possível buscar os insumos.');
            }
            const insumos = await response.json();
            return insumos;
        } catch (error) {
            console.error('Erro:', error);
            swiperWrapper.innerHTML = '<p>Não foi possível carregar os insumos no momento.</p>';
            return []; 
        }
    }


async function initializeCarousel() {
    const insumos = await fetchInsumos();

    if (insumos.length === 0) {
        return;
    }

    // cria o html e insere o carossel 
    let slidesHTML = ''; 
    insumos.forEach(insumo => {
        slidesHTML += `
            <div class="swiper-slide">
                <div class="product-card">
                    <img src="${insumo.image_url || 'images/logotipo.png'}" alt="${insumo.name}">
                    <h3>${insumo.name}</h3>
                    <p>${insumo.stock} Unidades</p>
                    <a href="/insumos.html" class="more-info-btn">Mais informações</a>
                </div>
            </div>
        `;
    });
    //add o HTML de uma só vez, melhora a perfomance.
    document.querySelector('.swiper-wrapper').innerHTML = slidesHTML;
    const swiper = new Swiper('.swiper', {
        //parâmetros existentes
        loop: true,
        slidesPerView: 1,
        spaceBetween: 30,
        
        // autoplay carrossel
        autoplay: {
            delay: 3000, // time para trocar a img
            disableOnInteraction: false,
            pauseOnMouseEnter: true, // Pausa o autoplay quando o mouse está sobre a img
        },

        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        breakpoints: {
            640: { slidesPerView: 2, spaceBetween: 20 },
            768: { slidesPerView: 3, spaceBetween: 40 },
            1024: { slidesPerView: 4, spaceBetween: 50 },
        }
    });
}

    initializeCarousel();
});