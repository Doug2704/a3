import { inicializarPaginaBaseGerenciador } from './gerenciadorPageSetup.js';
import { obterUsuarioInfo } from '../authService.js';

async function configurarPaginaHomeGerenciador() {
    const setupOk = await inicializarPaginaBaseGerenciador();
    if (!setupOk) return;

    const greetingEl = document.getElementById('greeting');
    const usuarioInfo = obterUsuarioInfo();
    const btnTogglerResponsabilidades = document.getElementById('btn-toggle-responsabilidades');
    const cardIntroducao = document.getElementById('cardIntroducaoGerenciador');

    if (greetingEl && usuarioInfo) {
        let nomeExibicao = "Gerenciador";
        if (usuarioInfo.nome) {
            nomeExibicao = `Gerenciador ${usuarioInfo.nome}`;
        }
        greetingEl.innerHTML = `<i class="fa-solid fa-user-shield"></i> Olá, ${nomeExibicao}!`;
    }

    if (btnTogglerResponsabilidades && cardIntroducao) {
        btnTogglerResponsabilidades.addEventListener('click', () => {
            const isAberto = cardIntroducao.style.display === 'block';
            cardIntroducao.style.display = isAberto ? 'none' : 'block';
            btnTogglerResponsabilidades.classList.toggle('aberto', !isAberto);
            const icone = btnTogglerResponsabilidades.querySelector('i');
            if (icone) {
                icone.classList.toggle('fa-chevron-down', isAberto);
                icone.classList.toggle('fa-chevron-up', !isAberto);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', configurarPaginaHomeGerenciador);