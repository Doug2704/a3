import * as AuthService from '../authService.js';
import * as ThemeManager from '../themeManager.js';
import { NOME_DO_SOFTWARE } from '../config.js';

let sidebarElement = null;
let toggleButtonElement = null;

function fecharSidebar() {
    if (sidebarElement && toggleButtonElement) {
        sidebarElement.classList.remove('aberta');
        document.body.classList.remove('sidebar-operador-aberta');
        const icone = toggleButtonElement.querySelector('i');
        if (icone) {
            icone.classList.remove('fa-times');
            icone.classList.add('fa-bars');
        }
    }
}

async function carregarSidebar() {
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    if (!sidebarPlaceholder) return;
    try {
        const response = await fetch('_sidebar_operador.html');
        if (!response.ok) throw new Error(`Erro ao carregar sidebar: ${response.status}`);
        sidebarPlaceholder.innerHTML = await response.text();
        sidebarElement = document.getElementById('sidebarOperador');
        if (sidebarElement) {
            const nomeSoftwareEl = sidebarElement.querySelector('#nome-software-sidebar');
            if (nomeSoftwareEl) nomeSoftwareEl.textContent = NOME_DO_SOFTWARE;
            
            const btnLogoutSidebar = document.getElementById('btn-logout-sidebar');
            if (btnLogoutSidebar) btnLogoutSidebar.addEventListener('click', AuthService.logoutUsuario);

            const links = sidebarElement.querySelectorAll('.sidebar-nav .nav-link');
            const paginaAtual = window.location.pathname.split('/').pop().split('.')[0];
            links.forEach(link => {
                if (link.dataset.page === paginaAtual) link.classList.add('ativo');
            });
        }
    } catch (error) {
        console.error("OPERADOR SETUP: Falha ao carregar a sidebar:", error);
    }
}

function configurarToggleSidebar() {
    toggleButtonElement = document.getElementById('btn-toggle-sidebar');
    if (toggleButtonElement && sidebarElement) {
        toggleButtonElement.addEventListener('click', (event) => {
            event.stopPropagation();
            sidebarElement.classList.toggle('aberta');
            document.body.classList.toggle('sidebar-operador-aberta');
            const icone = toggleButtonElement.querySelector('i');
            if (icone) {
                icone.classList.toggle('fa-bars', !sidebarElement.classList.contains('aberta'));
                icone.classList.toggle('fa-times', sidebarElement.classList.contains('aberta'));
            }
        });
        document.addEventListener('click', (event) => {
            if (sidebarElement.classList.contains('aberta') && !sidebarElement.contains(event.target) && !toggleButtonElement.contains(event.target)) {
                fecharSidebar();
            }
        });
    }
}

export async function inicializarPaginaBaseOperador() {
    if (!AuthService.estaLogado()) {
        AuthService.logoutUsuario();
        return false;
    }
    const usuarioInfo = AuthService.obterUsuarioInfo();
    if (!usuarioInfo || usuarioInfo.perfil !== 'operator') {
        alert("Acesso negado. Apenas operadores podem acessar esta página.");
        AuthService.logoutUsuario();
        return false;
    }
    ThemeManager.aplicarTemaInicial();
    const themeToggleButton = document.getElementById('btn-alternar-tema');
    if (themeToggleButton) {
        themeToggleButton.textContent = ThemeManager.isDarkModeAtivo() ? '☀️' : '🌙';
        themeToggleButton.addEventListener('click', () => {
            ThemeManager.alternarTema();
            themeToggleButton.textContent = ThemeManager.isDarkModeAtivo() ? '☀️' : '🌙';
        });
    }
    await carregarSidebar();
    configurarToggleSidebar();
    return true;
}