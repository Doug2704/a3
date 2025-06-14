import { inicializarPaginaBaseAdmin } from './adminPageSetup.js';
import { obterToken } from '../authService.js';
import {
    buscarTodasAsAreas, 
    buscarAtivosPorArea,
    criarArea,
    criarAtivo,
    excluirArea,
    excluirAtivo
} from '../apiService.js';

let todasAsAreas = [];
const container = document.getElementById('containerAreas');
const formContainer = document.getElementById('form-container-admin');
const filtroEl = document.getElementById('filtroNomeAreaAtivo');

const ICONS = {
    CHEVRON_DOWN: `<svg aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"></path></svg>`,
    ELLIPSIS: `<svg aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 512"><path fill="currentColor" d="M64 360a56 56 0 1 0 0 112 56 56 0 1 0 0-112zM0 256a56 56 0 1 0 112 0A56 56 0 1 0 0 256zM112 96a56 56 0 1 0 -112 0 56 56 0 1 0 112 0z"></path></svg>`,
    PENCIL: `<svg aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M471.6 21.7c-21.9-21.9-57.3-21.9-79.2 0L362.3 51.7l97.9 97.9 30.1-30.1c21.9-21.9 21.9-57.3 0-79.2L471.6 21.7zm-299.2 220c-6.1 6.1-10.8 13.6-13.5 21.9l-29.6 88.8c-2.9 8.6-.6 18.1 5.8 24.6s15.9 8.7 24.6 5.8l88.8-29.6c8.2-2.7 15.7-7.4 21.9-13.5l124.4-124.4-97.9-97.9L172.4 241.7zM96 64C43 64 0 107 0 160V416c0 53 43 96 96 96H352c53 0 96-43 96-96V320c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32V160c0-17.7 14.3-32 32-32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H96z"></path></svg>`,
    TRASH: `<svg aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M135.2 17.7C140.6 6.8 151.7 0 163.8 0H284.2c12.1 0 23.2 6.8 28.6 17.7L320 32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64S14.3 32 32 32h96l7.2-14.3zM32 128H416V448c0 35.3-28.7 64-64 64H96c-35.3 0-64-28.7-64-64V128z"></path></svg>`
};

function fecharFormulario() {
    if (formContainer) formContainer.innerHTML = '';
}

function renderizarFormulario(templateId, onMount) {
    fecharFormulario();
    const template = document.getElementById(templateId);
    if (template) {
        const clone = template.content.cloneNode(true);
        formContainer.appendChild(clone);
        if (onMount) onMount();
    }
}

async function handleNovaAreaSubmit(e) {
    e.preventDefault();
    const nomeArea = document.getElementById('nomeNovaArea').value;
    if (!nomeArea) {
        alert('O nome da área é obrigatório.');
        return;
    }
    const resposta = await criarArea({ name: nomeArea, description: '' }, obterToken());
    if (resposta.ok) {
        alert('Área criada com sucesso!');
        fecharFormulario();
        carregarDadosIniciais();
    } else {
        alert(`Erro ao criar área: ${resposta.data?.mensagem || 'Erro desconhecido.'}`);
    }
}

async function handleNovoAtivoSubmit(e) {
    e.preventDefault();
    const areaId = document.getElementById('areaPaiAtivo').value;
    const nomeAtivo = document.getElementById('nomeNovoAtivo').value;
    if (!areaId || !nomeAtivo) {
        alert('A área e o nome do ativo são obrigatórios.');
        return;
    }
    const dadosAtivo = { name: nomeAtivo, responsibleAreaId: areaId };
    const resposta = await criarAtivo(dadosAtivo, obterToken());
    if (resposta.ok) {
        alert('Ativo criado com sucesso!');
        fecharFormulario();
        carregarDadosIniciais();
    } else {
        alert(`Erro ao criar ativo: ${resposta.data?.mensagem || 'Erro desconhecido.'}`);
    }
}

function renderizarAtivos(containerAtivosEl, areaId, ativos) {
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
        const itemAtivo = clone.querySelector('.ativo-item');
        itemAtivo.dataset.idAtivo = ativo.id;
        clone.querySelector('.ativo-nome').textContent = ativo.name || 'Ativo sem nome';
        
        const btnMenu = clone.querySelector('.btn-menu-acoes');
        btnMenu.dataset.idAtivo = ativo.id;
        btnMenu.dataset.idArea = areaId;
        btnMenu.innerHTML = ICONS.ELLIPSIS;

        clone.querySelector('.editar').innerHTML = `${ICONS.PENCIL} Editar`;
        clone.querySelector('.excluir').innerHTML = `${ICONS.TRASH} Excluir`;

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
        if(area.description) {
            descricaoEl.textContent = area.description;
        } else {
            descricaoEl.style.display = 'none';
        }
        
        const btnMenu = clone.querySelector('.btn-menu-acoes');
        btnMenu.dataset.idArea = area.id;
        btnMenu.innerHTML = ICONS.ELLIPSIS;

        const btnEditar = clone.querySelector('.editar');
        btnEditar.innerHTML = `${ICONS.PENCIL} Editar`;

        const btnExcluir = clone.querySelector('.excluir');
        btnExcluir.innerHTML = `${ICONS.TRASH} Excluir`;
        clone.querySelector('.area-toggle').innerHTML = ICONS.CHEVRON_DOWN;

        container.appendChild(clone);
    });
}

function filtrarDados(termo) {
    const termoBusca = termo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!termoBusca) {
        renderizarAreas(todasAsAreas);
        return;
    }
    
    let resultadoFiltrado = [];
    todasAsAreas.forEach(area => {
        const nomeAreaNormalizado = (area.name || area.nomeArea || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const ativos = area.ativos || [];
        const ativosFiltrados = ativos.filter(ativo => 
            (ativo.name || ativo.nomeAtivo || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(termoBusca)
        );

        if (nomeAreaNormalizado.includes(termoBusca) || ativosFiltrados.length > 0) {
            const areaParaExibir = { ...area };
            if (!nomeAreaNormalizado.includes(termoBusca)) {
                areaParaExibir.ativos = ativosFiltrados;
            }
            resultadoFiltrado.push(areaParaExibir);
        }
    });
    renderizarAreas(resultadoFiltrado);
}

async function handleContainerClick(evento) {
    const btnMenu = evento.target.closest('.btn-menu-acoes');
    if (btnMenu) {
        evento.stopPropagation();
        const dropdown = btnMenu.nextElementSibling;
        document.querySelectorAll('.dropdown-menu-acoes').forEach(d => {
            if (d !== dropdown) d.classList.remove('visivel');
        });
        dropdown.classList.toggle('visivel');
        return;
    }

    const btnEditar = evento.target.closest('.dropdown-menu-acoes .editar');
    if(btnEditar) {
        evento.stopPropagation();
        const menu = btnEditar.closest('.dropdown-menu-acoes');
        const btnMenuPai = menu.previousElementSibling;
        const tipo = btnMenuPai.dataset.tipo;
        if(tipo === 'area') {
            const areaId = btnMenuPai.dataset.idArea;
            window.location.href = `editar-area.html?id=${areaId}`;
        } else if (tipo === 'ativo') {
            const ativoId = btnMenuPai.dataset.idAtivo;
            const areaId = btnMenuPai.dataset.idArea;
            window.location.href = `editar-ativo.html?id=${ativoId}&areaId=${areaId}`;
        }
        menu.classList.remove('visivel');
        return;
    }
    
    const btnExcluir = evento.target.closest('.dropdown-menu-acoes .excluir');
    if(btnExcluir) {
        evento.stopPropagation();
        const menu = btnExcluir.closest('.dropdown-menu-acoes');
        const btnMenuPai = menu.previousElementSibling;
        const tipo = btnMenuPai.dataset.tipo;
        const token = obterToken();
        let respostaApi;

        if (tipo === 'area') {
            const areaId = btnMenuPai.dataset.idArea;
            if(confirm(`Tem certeza que deseja excluir a Área e todos os seus ativos?`)) {
                respostaApi = await excluirArea(areaId, token);
                if (respostaApi.ok) { alert("Área excluída com sucesso!"); carregarDadosIniciais(); }
                else { alert(`Falha ao excluir área: ${respostaApi.data?.mensagem || "Erro desconhecido."}`); }
            }
        } else if (tipo === 'ativo') {
            const ativoId = btnMenuPai.dataset.idAtivo;
            if(confirm(`Tem certeza que deseja excluir o Ativo?`)) {
                respostaApi = await excluirAtivo(ativoId, token);
                if (respostaApi.ok) { alert("Ativo excluído com sucesso!"); carregarDadosIniciais(); }
                else { alert(`Falha ao excluir ativo: ${respostaApi.data?.mensagem || "Erro desconhecido."}`); }
            }
        }
        menu.classList.remove('visivel');
        return;
    }
    
    const areaToggleBtn = evento.target.closest('.area-toggle');
    if (areaToggleBtn) {
        evento.stopPropagation();
        const areaItem = areaToggleBtn.closest('.area-item');
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
                renderizarAtivos(containerAtivos, areaId, respostaAtivos.data);
                areaItem.setAttribute('data-assets-carregados', 'true');
            } else {
                containerAtivos.innerHTML = '<p class="nenhum-ativo">Erro ao carregar ativos.</p>';
            }
        }
    }
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

async function inicializarPaginaAreasAtivos() {
    const setupOk = await inicializarPaginaBaseAdmin();
    if (!setupOk) return;

    document.getElementById('btnNovaArea').addEventListener('click', () => {
        renderizarFormulario('form-nova-area-template', () => {
            document.getElementById('formNovaArea').addEventListener('submit', handleNovaAreaSubmit);
            document.getElementById('formNovaArea').querySelector('.btn-cancelar-form').addEventListener('click', fecharFormulario);
        });
    });
    
    document.getElementById('btnNovoAtivo').addEventListener('click', () => {
        renderizarFormulario('form-novo-ativo-template', () => {
            const selectArea = document.getElementById('areaPaiAtivo');
            if (selectArea) {
                todasAsAreas.forEach(area => {
                    selectArea.innerHTML += `<option value="${area.id}">${area.name || area.nomeArea}</option>`;
                });
            }
            document.getElementById('formNovoAtivo').addEventListener('submit', handleNovoAtivoSubmit);
            document.getElementById('formNovoAtivo').querySelector('.btn-cancelar-form').addEventListener('click', fecharFormulario);
        });
    });
    
    if (filtroEl) filtroEl.addEventListener('input', (e) => filtrarDados(e.target.value));
    if (container) container.addEventListener('click', handleContainerClick);
    
    await carregarDadosIniciais();
}

document.addEventListener('DOMContentLoaded', inicializarPaginaAreasAtivos);