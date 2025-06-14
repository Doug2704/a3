import { inicializarPaginaBaseAdmin, obterInformacoesUsuarioLogado } from './adminPageSetup.js';
import { obterToken } from '../authService.js';
import { API_BASE_URL } from '../config.js';

function configurarConteudoHomeAdmin() {
    const usuarioInfo = obterInformacoesUsuarioLogado();
    const elNomeAdminLogado = document.getElementById('nome-admin-logado');

    if (elNomeAdminLogado) {
        elNomeAdminLogado.textContent = usuarioInfo?.nome || "Administrador";
    }

    const btnTogglerResponsabilidades = document.getElementById('btn-toggle-responsabilidades');
    const cardBoasVindas = document.getElementById('cardBoasVindasAdmin');

    if (btnTogglerResponsabilidades && cardBoasVindas) {
        const iconeToggler = btnTogglerResponsabilidades.querySelector('i');

        btnTogglerResponsabilidades.addEventListener('click', () => {
            const isAberto = cardBoasVindas.style.display === 'block';
            cardBoasVindas.style.display = isAberto ? 'none' : 'block';
            btnTogglerResponsabilidades.classList.toggle('aberto', !isAberto);

            if (iconeToggler) {
                iconeToggler.classList.toggle('fa-chevron-down', isAberto);
                iconeToggler.classList.toggle('fa-chevron-up', !isAberto);
            }
        });
    }
}

async function carregarKPIs() {
    const token = obterToken();
    const headers = { 'Authorization': `Bearer ${token}` };

    const kpiElements = {
        usuarios: document.getElementById('kpi-usuarios-cadastrados'),
        areas: document.getElementById('kpi-areas'),
        ativos: document.getElementById('kpi-ativos')
    };

    const endpoints = {
        usuarios: `${API_BASE_URL}/admin/count/users`,
        areas: `${API_BASE_URL}/admin/count/areas`,
        ativos: `${API_BASE_URL}/admin/count/assets`
    };

    for (const chave in endpoints) {
        const el = kpiElements[chave];
        if (!el) continue;

        el.textContent = '...';
        el.classList.remove('kpi-error-text');

        try {
            const response = await fetch(endpoints[chave], { headers });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const valor = Object.values(data)[0] ?? '0'; // Apenas o número
            el.textContent = valor;
        } catch (error) {
            console.error(`Erro ao carregar KPI de ${chave}:`, error);
            el.textContent = 'Erro';
            el.classList.add('kpi-error-text');
        }
    }
}

async function inicializarPagina() {
    const setupOk = await inicializarPaginaBaseAdmin();
    if (!setupOk) return;

    configurarConteudoHomeAdmin();
    await carregarKPIs();
}

document.addEventListener('DOMContentLoaded', inicializarPagina);
