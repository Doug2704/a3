import { inicializarPaginaBaseOperador } from './operadorPageSetup.js';
import { obterUsuarioInfo } from '../authService.js';

async function configurarPaginaHomeOperador() {
    const setupOk = await inicializarPaginaBaseOperador();
    if (!setupOk) return;

    const greetingEl = document.getElementById('greeting');
    const usuarioInfo = obterUsuarioInfo();
    const togglerIntroducao = document.getElementById('toggler-introducao-operador');
    const cardIntroducao = document.getElementById('cardIntroducaoOperador');
    
    if (greetingEl && usuarioInfo) {
        greetingEl.innerHTML = `<i class="fa-solid fa-user"></i> Olá, ${usuarioInfo.nome || 'Operador'}!`;
    }

    if (togglerIntroducao && cardIntroducao) {
        const iconeToggler = togglerIntroducao.querySelector('.btn-toggler-responsabilidades i');
        togglerIntroducao.addEventListener('click', () => {
            const isAberto = cardIntroducao.style.display === 'block';
            cardIntroducao.style.display = isAberto ? 'none' : 'block';
            togglerIntroducao.classList.toggle('aberto', !isAberto);
            if(iconeToggler){
                iconeToggler.classList.toggle('fa-chevron-down', isAberto);
                iconeToggler.classList.toggle('fa-chevron-up', !isAberto);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', configurarPaginaHomeOperador);