import { inicializarPaginaBaseGerenciador } from './gerenciadorPageSetup.js';
import { obterToken } from '../authService.js';
import { buscarTodasAsAreas, buscarAtivosPorArea } from '../apiService.js';

let todasAsAreas = [];
const container = document.getElementById('containerAreas');
const filtroEl = document.getElementById('filtroNomeAreaAtivo');

const ICONS = {
    CHEVRON_DOWN: `<svg aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"></path></svg>`
};

function renderizarAtivos(containerAtivosEl, ativos) {
    if (!containerAtivosEl) return;
    containerAtivosEl.innerHTML = '';
    
    if (!ativos || ativos.length === 0) {
        containerAtivosEl.innerHTML = '<p class="nenhum-ativo">Nenhum ativo cadastrado nesta área.</p>';
        return;
    }
    
    const templateAtivo = document.getElementById('ativo-item-template');
    if (!templateAtivo) return;

    const listaAtivos = document.createElement('ul');
    listaAtivos.className = 'lista-ativos';
    
    ativos.forEach(ativo => {
        const clone = templateAtivo.content.cloneNode(true);
        clone.querySelector('.ativo-nome').textContent = ativo.name || 'Ativo sem nome';
        listaAtivos.appendChild(clone);
    });
    containerAtivosEl.appendChild(listaAtivos);
}

function renderizarAreas(listaParaRenderizar) {
    if (!container) return;
    container.innerHTML = '';

    if (!listaParaRenderizar || listaParaRenderizar.length === 0) {
        container.innerHTML = `<p class="nenhum-item-encontrado">Nenhuma área cadastrada.</p>`;
        return;
    }

    const templateArea = document.getElementById('area-card-template');
    if (!templateArea) return;

    listaParaRenderizar.forEach(area => {
        const clone = templateArea.content.cloneNode(true);
        const areaItemDiv = clone.querySelector('.area-item');
        areaItemDiv.dataset.idArea = area.id;
        
        clone.querySelector('.area-nome').textContent = area.name || area.nomeArea;
        const descricaoEl = clone.querySelector('.area-descricao');
        if (area.description) {
            descricaoEl.textContent = area.description;
        } else {
            descricaoEl.style.display = 'none';
        }
        
        clone.querySelector('.area-toggle').innerHTML = ICONS.CHEVRON_DOWN;

        container.appendChild(clone);
    });
}

async function handleContainerClick(evento) {
    const cabecalhoArea = evento.target.closest('.area-cabecalho[data-role="toggler"]');
    if (!cabecalhoArea) return;

    const areaItem = cabecalhoArea.closest('.area-item');
    const containerAtivos = areaItem.querySelector('.area-assets-container');
    const areaId = areaItem.dataset.idArea;
    const jaCarregou = areaItem.hasAttribute('data-assets-carregados');
    
    areaItem.classList.toggle('aberta');

    if (areaItem.classList.contains('aberta') && !jaCarregou) {
        containerAtivos.innerHTML = '<p class="carregando-ativos">Carregando ativos...</p>';
        const respostaAtivos = await buscarAtivosPorArea(areaId, obterToken());
        if (respostaAtivos.ok) {
            const areaPai = todasAsAreas.find(a => a.id == areaId);
            if(areaPai) areaPai.ativos = respostaAtivos.data || [];
            
            renderizarAtivos(containerAtivos, respostaAtivos.data);
            areaItem.setAttribute('data-assets-carregados', 'true');
        } else {
            containerAtivos.innerHTML = '<p class="nenhum-ativo">Erro ao carregar ativos.</p>';
        }
    }
}

function filtrarDados(termo) {
    const termoBusca = termo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!termoBusca) {
        renderizarAreas(todasAsAreas);
        return;
    }
    
    const resultadoFiltrado = todasAsAreas.filter(area => {
        const nomeAreaNormalizado = (area.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (nomeAreaNormalizado.includes(termoBusca)) return true;
        
        const ativosNaArea = todasAsAreas.find(a => a.id === area.id)?.ativos || [];
        return ativosNaArea.some(ativo => (ativo.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(termoBusca));
    });
    renderizarAreas(resultadoFiltrado);
}

async function carregarDadosIniciais() {
    if (!container) return;
    container.innerHTML = '<p class="carregando-dados">Carregando áreas...</p>';
    const resposta = await buscarTodasAsAreas(obterToken());
    if (resposta && resposta.ok) {
        todasAsAreas = resposta.data || [];
        renderizarAreas(todasAsAreas);
    } else {
        container.innerHTML = '<p class="erro-dados">Não foi possível carregar as áreas.</p>';
    }
}

async function inicializarPagina() {
    const setupOk = await inicializarPaginaBaseGerenciador();
    if (!setupOk) return;

    if (filtroEl) filtroEl.addEventListener('input', (e) => filtrarDados(e.target.value));
    if (container) container.addEventListener('click', handleContainerClick);
    
    await carregarDadosIniciais();
}

document.addEventListener('DOMContentLoaded', inicializarPagina);