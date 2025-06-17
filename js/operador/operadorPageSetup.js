import * as AuthService from '../authService.js';
import * as ThemeManager from '../themeManager.js';
import { NOME_DO_SOFTWARE } from '../config.js';

let sidebarElement = null;
let toggleButtonElement = null;

function fecharSidebar() {
    if (sidebarElement) {
        sidebarElement.classList.remove('aberta');
        document.body.classList.remove('sidebar-operador-aberta');
    }
}

function configurarEventosSidebar() {
    toggleButtonElement = document.getElementById('btn-toggle-sidebar');
    const btnLogout = document.getElementById('btn-logout');
    const btnCloseSidebar = document.getElementById('btn-close-sidebar');

    if (btnLogout) btnLogout.addEventListener('click', AuthService.logoutUsuario);
    if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', fecharSidebar);
    
    if (toggleButtonElement && sidebarElement) {
        toggleButtonElement.addEventListener('click', (event) => {
            event.stopPropagation();
            sidebarElement.classList.toggle('aberta');
            document.body.classList.toggle('sidebar-operador-aberta');
        });
        document.addEventListener('click', (event) => {
            if (sidebarElement.classList.contains('aberta') && !sidebarElement.contains(event.target) && !toggleButtonElement.contains(event.target)) {
                fecharSidebar();
            }
        });
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
            if (nomeSoftwareEl) nomeSoftwareEl.textContent = NOME_DO_SOFTWARE || "Incidex";
            const links = sidebarElement.querySelectorAll('.sidebar-nav .nav-link');
            const paginaAtual = window.location.pathname.split('/').pop();
            links.forEach(link => {
                if (link.getAttribute('href') === paginaAtual) {
                    link.classList.add('ativo');
                }
            });
            configurarEventosSidebar();
        }
    } catch (error) {
        console.error("OPERADOR SETUP: Falha ao carregar a sidebar:", error);
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
        themeToggleButton.innerHTML = ThemeManager.isDarkModeAtivo() ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        themeToggleButton.addEventListener('click', () => {
            ThemeManager.alternarTema();
            themeToggleButton.innerHTML = ThemeManager.isDarkModeAtivo() ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        });
    }
    await carregarSidebar();
    return true;
}