// js/gerenciador/gerenciadorPageSetup.js
import * as AuthService from '../authService.js';
import * as ThemeManager from '../themeManager.js';

// Variáveis de escopo do módulo para os elementos da sidebar e botão de toggle
let sidebarElement = null;
let toggleButtonElement = null;
let mainContentElement = null; // Referência ao conteúdo principal para ajuste de margem

// Função para carregar e injetar a sidebar (como antes)
async function carregarSidebarGerenciador() {
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    if (sidebarPlaceholder) {
        try {
            const response = await fetch('_sidebar_gerenciador.html'); 
            if (!response.ok) {
                throw new Error(`Erro ao carregar sidebar: ${response.status} ${response.statusText}`);
            }
            const sidebarHTML = await response.text();
            sidebarPlaceholder.innerHTML = sidebarHTML;
            
            // Após injetar, pegamos a referência ao elemento principal da sidebar
            sidebarElement = document.getElementById('sidebarGerenciador'); 
            if (!sidebarElement) {
                console.warn("#sidebarGerenciador (tag <aside>) não encontrado dentro de _sidebar_gerenciador.html ou o ID está diferente.");
            }

            configurarLogoutSidebar();
            marcarLinkAtivoSidebar();
        } catch (error) {
            console.error("Falha ao carregar a sidebar do gerenciador:", error);
            sidebarPlaceholder.innerHTML = "<p style='color:red;padding:10px;'>Erro ao carregar sidebar.</p>";
        }
    } else {
        console.warn("#sidebar-placeholder não encontrado na página HTML.");
    }
}

function configurarLogoutSidebar() {
    // O botão de logout agora está dentro da sidebar, então buscamos após carregar
    const btnLogoutSidebar = document.getElementById('btn-logout-sidebar');
    if (btnLogoutSidebar) {
        btnLogoutSidebar.addEventListener('click', () => {
            AuthService.logoutUsuario();
        });
    } else {
        console.warn("Botão de logout #btn-logout-sidebar não encontrado na sidebar.")
    }
}

function marcarLinkAtivoSidebar() {
    if (!sidebarElement) return; // Precisa da sidebar carregada
    const links = sidebarElement.querySelectorAll('.sidebar-nav .nav-link');
    const paginaAtual = window.location.pathname.split('/').pop();

    links.forEach(link => {
        const linkPagina = link.dataset.page || link.getAttribute('href').split('/').pop();
        if (linkPagina === paginaAtual) {
            link.classList.add('ativo');
        } else {
            link.classList.remove('ativo');
        }
    });
}

// --- Novas funções para controlar o estado da sidebar ---
function abrirSidebar() {
    if (sidebarElement && toggleButtonElement && document.body) {
        sidebarElement.classList.add('aberta');
        document.body.classList.add('sidebar-gerenciador-aberta');
        const icone = toggleButtonElement.querySelector('i');
        if (icone) {
            icone.classList.remove('fa-bars');
            icone.classList.add('fa-times');
        }
    }
}

function fecharSidebar() {
    if (sidebarElement && toggleButtonElement && document.body) {
        sidebarElement.classList.remove('aberta');
        document.body.classList.remove('sidebar-gerenciador-aberta');
        const icone = toggleButtonElement.querySelector('i');
        if (icone) {
            icone.classList.remove('fa-times');
            icone.classList.add('fa-bars');
        }
    }
}
// --- Fim das novas funções de controle ---

function configurarToggleSidebarEAutofechamento() {
    // As referências são pegas aqui, após o DOM estar pronto e a sidebar potencialmente carregada
    toggleButtonElement = document.getElementById('btn-toggle-sidebar');
    // sidebarElement já é pego em carregarSidebarGerenciador
    // mainContentElement não é estritamente necessário para o toggle, mas para o CSS de layout.

    if (toggleButtonElement && sidebarElement) {
        toggleButtonElement.addEventListener('click', (event) => {
            event.stopPropagation(); // Impede que o clique no botão seja pego pelo listener do documento
            if (sidebarElement.classList.contains('aberta')) {
                fecharSidebar();
            } else {
                abrirSidebar();
            }
        });

        // Event listener no documento para fechar ao clicar fora
        document.addEventListener('click', (event) => {
            // Verifica se a sidebar está aberta E
            // se o clique NÃO foi na sidebar ou em algo dentro dela E
            // se o clique NÃO foi no botão de toggle ou em algo dentro dele
            if (sidebarElement.classList.contains('aberta') &&
                !sidebarElement.contains(event.target) &&
                toggleButtonElement && !toggleButtonElement.contains(event.target) &&
                event.target !== toggleButtonElement // Garante que o clique no próprio botão não feche
                ) {
                fecharSidebar();
            }
        });

    } else {
        if (!toggleButtonElement) console.warn("#btn-toggle-sidebar não encontrado.");
        if (!sidebarElement) console.warn("#sidebarGerenciador não foi carregado ou ID está incorreto.");
    }
}


export async function inicializarPaginaBaseGerenciador() {
    if (!AuthService.estaLogado()) {
        console.warn("Usuário não logado. Redirecionando para login...");
        AuthService.logoutUsuario();
        return false;
    }
    const usuarioInfo = AuthService.obterUsuarioInfo();
    if (!usuarioInfo || usuarioInfo.perfil !== 'manager') {
        console.warn(`Usuário não é gerenciador (perfil: ${usuarioInfo?.perfil}). Redirecionando...`);
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
    
    await carregarSidebarGerenciador(); // Espera a sidebar carregar e define sidebarElement
    configurarToggleSidebarEAutofechamento(); // Configura o toggle E o autofechamento

    console.log("Página base do Gerenciador inicializada com sidebar e autofechamento.");
    return true;
}