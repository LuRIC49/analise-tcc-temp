document.addEventListener('DOMContentLoaded', () => {
    
    const swiperWrapper = document.querySelector('.swiper-wrapper');
    const token = localStorage.getItem('authToken');

    
    const btnAbrirModalNovo = document.getElementById('btnAbrirModalNovo');
    const modal = document.getElementById('tipoModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('tipoForm');
    const tipoIdInput = document.getElementById('tipoId');
    const tipoDescricaoInput = document.getElementById('tipoDescricao');
    const tipoImagemInput = document.getElementById('tipoImagem');
    const previewContainer = document.getElementById('previewContainer');
    const imagemPreview = document.getElementById('imagemPreview');
    const btnCancel = modal.querySelector('.btn-cancel');
    const btnClose = modal.querySelector('.modal-close-btn');

    let modoEdicao = false;

    const confirmDeleteModal = document.getElementById('confirmDeleteModal');
    const confirmDeleteTitle = document.getElementById('confirmDeleteTitle');
    const confirmDeleteText = document.getElementById('confirmDeleteText');
    const confirmDeleteCancelBtn = document.getElementById('confirmDeleteCancelBtn');
    const confirmDeleteConfirmBtn = document.getElementById('confirmDeleteConfirmBtn');
    const confirmDeleteCloseBtn = document.getElementById('confirmDeleteCloseBtn');
    
    let idParaExcluir = null;

    


    async function fetchInsumos() {
        
        
        let url = '/api/insumos/public-tipos'; 
        let options = {};

        if (token) {
            
            url = '/api/insumos/tipos'; 
            options = { headers: { 'Authorization': `Bearer ${token}` } };
        }
        

        try {
            const response = await fetch(url, options); 
            
            if (!response.ok) {
                if (!token) throw new Error('Não foi possível carregar o catálogo de insumos.');
                else throw new Error('Sessão expirada. Faça login novamente para ver os insumos.');
            }
            
            const insumos = await response.json();
            return insumos;
        } catch (error) {
            console.error('Erro:', error);
            swiperWrapper.innerHTML = `<p>${error.message}</p>`;
            return []; 
        }
    }

async function initializeCarousel() {
        const insumos = await fetchInsumos();

        if (insumos.length === 0 && token) {
             swiperWrapper.innerHTML = '<p>Nenhum tipo de insumo cadastrado.</p>';
        }
        
        swiperWrapper.innerHTML = ''; 

        
        insumos.forEach(insumo => {
            const imgPath = insumo.imagem ? `/${insumo.imagem}` : 'images/logotipo.png';
            
            
            
            const isBase = insumo.is_base === 1;

            
            const crudButtonsHTML = !isBase ? `
                <div class="crud-buttons card-footer" style="display: flex; gap: 5px; margin-top: 10px;">
                    <button class="btn-action btn-delete" data-id="${insumo.codigo}" data-descricao="${insumo.descricao}" style="background-color: #dc3545; color: white; padding: 5px 8px; border: none; cursor: pointer; font-size: 0.9em; flex: 1;">Excluir</button>
                    <button class="btn-action btn-edit" data-id="${insumo.codigo}" style="background-color: #007bff; color: white; padding: 5px 8px; border: none; cursor: pointer; font-size: 0.9em; flex: 1;">Editar</button>
                </div>
            ` : `
                <div class="crud-buttons" style="display: flex; gap: 5px; margin-top: 10px; height: 31px; justify-content: center; align-items: center;">
                    <span style="font-size: 0.9em; color: #777;">(Insumo Padrão)</span>
                </div>
            `;
            

            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            slide.innerHTML = `
                <div class="product-card">
                    <img src="${imgPath}" alt="${insumo.descricao}" style="width: 100%; height: 150px; object-fit: contain;">
                    <h3>${insumo.descricao}</h3>
                    ${crudButtonsHTML} 
                </div>
            `;
            swiperWrapper.appendChild(slide);
        });

        
        if (insumos.length > 0) {
            const swiper = new Swiper('.swiper', {
                loop: true,
                slidesPerView: 1,
                spaceBetween: 30,
                autoplay: {
                    delay: 3000,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true,
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
    }

    

            function openModal(modo, tipo = null) {
            form.reset(); 
            imagemPreview.src = '#';
            previewContainer.style.display = 'none';
            clearError(tipoDescricaoInput);
            clearError(tipoImagemInput);
            

            if (modo === 'editar' && tipo) {
            modoEdicao = true;
            modalTitle.textContent = 'Editar Tipo de Insumo';
            tipoIdInput.value = tipo.codigo;
            tipoDescricaoInput.value = tipo.descricao;
            if (tipo.imagem) {
                imagemPreview.src = `/${tipo.imagem}`;
                previewContainer.style.display = 'block';
            }
        } else {
            modoEdicao = false;
            modalTitle.textContent = 'Cadastrar Novo Tipo';
            tipoIdInput.value = '';
        }
        modal.style.display = 'flex';
    }

function closeModal() {
        modal.style.display = 'none';
        form.reset();
        
        
        
        clearError(tipoDescricaoInput);
        clearError(tipoImagemInput);
        
        
        modoEdicao = false; 
        
    }
    function openConfirmDeleteModal(id, descricao) {
        idParaExcluir = id; 
        if(confirmDeleteTitle) confirmDeleteTitle.textContent = `Excluir "${descricao}"`;
        if(confirmDeleteText) confirmDeleteText.textContent = `Tem certeza que deseja excluir este tipo de Insumo?`;
        if (confirmDeleteModal) confirmDeleteModal.style.display = 'flex';
    }

    function closeConfirmDeleteModal() {
        idParaExcluir = null; 
        if (confirmDeleteModal) confirmDeleteModal.style.display = 'none';
    }

async function handleExcluir(id, descricao) {
        
        
        if (!confirm(`Tem certeza que deseja excluir o tipo "${descricao}"? \n\nAtenção: Isso só funcionará se nenhum item de inventário estiver usando este tipo.`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/insumos/tipos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            
            Notifier.showSuccess('Tipo excluído com sucesso!');
            

            initializeCarousel(); 
        } catch (error) {
            
            Notifier.showError(error.message); 
            
        }
    }

    function handlePreviewImagem(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagemPreview.src = e.target.result;
                previewContainer.style.display = 'block';
            }
            reader.readAsDataURL(file);
        } else {
            imagemPreview.src = '#';
            previewContainer.style.display = 'none';
        }
    }

async function handleSubmit(event) {
        event.preventDefault();
        
        const isDescricaoValid = validateRequired(tipoDescricaoInput, 'Descrição (Nome do Tipo)');
        const isImagemValid = validateFileRequired(tipoImagemInput, 'Imagem');

        if (!isDescricaoValid || !isImagemValid) {
            return; 
        }

        const formData = new FormData(form);
        const id = tipoIdInput.value;
        const url = modoEdicao ? `/api/insumos/tipos/${id}` : '/api/insumos/tipos';
        const method = modoEdicao ? 'PUT' : 'POST';

        const saveButton = form.querySelector('.btn-save');
        saveButton.disabled = true;
        saveButton.textContent = 'Salvando...';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData 
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            Notifier.showSuccess(result.message); 
            closeModal();
            initializeCarousel(); 

        } catch (error) {
            Notifier.showError(error.message); 
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Salvar';
        }
    }

    async function handleExcluir() {
        if (!idParaExcluir) return; 
        
        const id = idParaExcluir; 
        
        
        
        try {
            const response = await fetch(`/api/insumos/tipos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            Notifier.showSuccess('Tipo excluído com sucesso!'); 
            initializeCarousel(); 
        } catch (error) {
            Notifier.showError(error.message); 
        } finally {
            closeConfirmDeleteModal(); 
        }
    }


    
   if (btnAbrirModalNovo) {
        btnAbrirModalNovo.addEventListener('click', () => openModal('novo'));
    }

    
    if (btnCancel) {
        btnCancel.addEventListener('click', closeModal);
    }
    if (btnClose) {
        btnClose.addEventListener('click', closeModal);
    }
    
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
        if (e.target === confirmDeleteModal) closeConfirmDeleteModal(); 
    });

    
    if (tipoImagemInput) {
        tipoImagemInput.addEventListener('change', (event) => {
            handlePreviewImagem(event);
            validateFileRequired(tipoImagemInput, 'Imagem');
        });
    }
    if (tipoDescricaoInput) {
        tipoDescricaoInput.addEventListener('blur', () => {
            validateRequired(tipoDescricaoInput, 'Descrição (Nome do Tipo)');
        });
    }

    
    if (form) {
        form.addEventListener('submit', handleSubmit);
    } else {
        console.error("ERRO CRÍTICO: O <form id='tipoForm'> não foi encontrado. O submit não vai funcionar.");
    }

    
    
    
    if (confirmDeleteCancelBtn) {
        confirmDeleteCancelBtn.addEventListener('click', closeConfirmDeleteModal);
    }
    if (confirmDeleteCloseBtn) {
        confirmDeleteCloseBtn.addEventListener('click', closeConfirmDeleteModal);
    }
    if (confirmDeleteConfirmBtn) {
        confirmDeleteConfirmBtn.addEventListener('click', handleExcluir); 
    }
    
    

    
if (swiperWrapper) {
        swiperWrapper.addEventListener('click', async (e) => {
            
            if (e.target.classList.contains('btn-delete')) {
                const id = e.target.dataset.id;
                
                const descricao = e.target.dataset.descricao; 
                
                openConfirmDeleteModal(id, descricao); 
            }
            
            if (e.target.classList.contains('btn-edit')) {
                const id = e.target.dataset.id;
                try {
                    const response = await fetch(`/api/insumos/tipos/${id}`, {
                         headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) throw new Error('Falha ao buscar dados para edição.');
                    const tipo = await response.json();
                    openModal('editar', tipo);
                } catch (error) {
                    Notifier.showError(error.message); 
                }
            }
        });
    }

function validateFileRequired(inputElement, fieldName) {
    
    if (modoEdicao) {
        clearError(inputElement);
        return true; 
    }
    
    
    if (inputElement.files.length === 0) {
        displayError(inputElement, `${fieldName} é obrigatória.`);
        return false;
    }
    
    clearError(inputElement);
    return true;
}

    initializeCarousel();
});


