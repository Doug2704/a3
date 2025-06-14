import * as AuthService from '../authService.js';
import * as ThemeManager from '../themeManager.js';
import { NOME_DO_SOFTWARE } from '../config.js';

let sidebarElement = null;
let toggleButtonElement = null;

function fecharSidebar() {
    if (sidebarElement && toggleButtonElement) {
        sidebarElement.classList.remove('aberta');
        document.body.classList.remove('sidebar-admin-aberta');
        const icone = toggleButtonElement.querySelector('i');
        if (icone) {
            icone.classList.remove('fa-times');
            icone.classList.add('fa-bars');
        }
    }
}

function configurarSidebar() {
    toggleButtonElement = document.getElementById('btn-toggle-sidebar');
    const btnLogoutSidebar = document.getElementById('btn-logout');
    const btnCloseSidebar = document.getElementById('btn-close-sidebar');

    if (btnLogoutSidebar) {
        btnLogoutSidebar.addEventListener('click', AuthService.logoutUsuario);
    }

    if (btnCloseSidebar) {
        btnCloseSidebar.addEventListener('click', fecharSidebar);
    }

    if (toggleButtonElement && sidebarElement) {
        toggleButtonElement.addEventListener('click', (event) => {
            event.stopPropagation();
            sidebarElement.classList.toggle('aberta');
            document.body.classList.toggle('sidebar-admin-aberta');
            const icone = toggleButtonElement.querySelector('i');
            if (icone) {
                if (sidebarElement.classList.contains('aberta')) {
                    icone.classList.remove('fa-bars');
                    icone.classList.add('fa-times');
                } else {
                    icone.classList.remove('fa-times');
                    icone.classList.add('fa-bars');
                }
            }
        });

        document.addEventListener('click', (event) => {
            if (sidebarElement.classList.contains('aberta') &&
                !sidebarElement.contains(event.target) &&
                toggleButtonElement && !toggleButtonElement.contains(event.target)) {
                fecharSidebar();
            }
        });
    }
}

function marcarLinkAtivoSidebar() {
    if (!sidebarElement) return;
    const links = sidebarElement.querySelectorAll('.sidebar-nav a');
    const paginaAtual = window.location.pathname.split('/').pop();
    links.forEach(link => {
        if (link.getAttribute('href') === paginaAtual) {
            link.classList.add('ativo');
        }
    });
}

async function carregarSidebar() {
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    if (!sidebarPlaceholder) {
        console.error("ADMIN SETUP: #sidebar-placeholder não encontrado.");
        return;
    }
    try {
        const response = await fetch('_sidebarAdmin.html');
        if (!response.ok) {
            throw new Error(`Erro ao carregar sidebar: ${response.status}`);
        }
        
        sidebarPlaceholder.innerHTML = await response.text();
        sidebarElement = document.getElementById('sidebarAdmin');

        if (sidebarElement) {
            const nomeSoftwareEl = sidebarElement.querySelector('#nome-software-sidebar');
            if (nomeSoftwareEl) nomeSoftwareEl.textContent = NOME_DO_SOFTWARE || "Incidex";
            configurarSidebar();
            marcarLinkAtivoSidebar();
        } else {
            console.error("ADMIN SETUP: Tag <aside id='sidebarAdmin'> não encontrada no arquivo _sidebarAdmin.html.");
        }
    } catch (error) {
        console.error("ADMIN SETUP: Falha ao carregar a sidebar do admin:", error);
    }
}

export function obterInformacoesUsuarioLogado() {
    return AuthService.obterUsuarioInfo();
}

export async function inicializarPaginaBaseAdmin() {
    if (!AuthService.estaLogado()) {
        AuthService.logoutUsuario();
        return false;
    }
    const usuarioInfo = AuthService.obterUsuarioInfo();
    if (!usuarioInfo || usuarioInfo.perfil !== 'admin') {
        alert("Acesso negado. Apenas administradores podem acessar esta página.");
        AuthService.logoutUsuario();
        return false;
    }

    ThemeManager.aplicarTemaInicial();
    const themeToggleButton = document.getElementById('btn-alternar-tema');
    function atualizarIconeBotaoTemaGlobal() {
        if (themeToggleButton) {
            themeToggleButton.textContent = ThemeManager.isDarkModeAtivo() ? '☀️' : '🌙';
            themeToggleButton.title = ThemeManager.isDarkModeAtivo() ? 'Mudar para tema claro' : 'Mudar para tema escuro';
        }
    }
    atualizarIconeBotaoTemaGlobal();
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            ThemeManager.alternarTema();
            atualizarIconeBotaoTemaGlobal();
        });
    }
    
    await carregarSidebar();
    
    return true;
}