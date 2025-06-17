import { inicializarPaginaBaseOperador } from './operadorPageSetup.js';
import * as ApiService from '../apiService.js';
import { obterToken } from '../authService.js';

document.addEventListener('DOMContentLoaded', async () => {
    const setupOk = await inicializarPaginaBaseOperador();
    if (!setupOk) return;

    const dom = {
        planosList: document.getElementById('planosList'),
        filtroTexto: document.getElementById('filtroPlanosTexto'),
        filtroArea: document.getElementById('filtroPlanosArea')
    };
    
    let todosOsPlanos = [];
    
    function renderizarPlanos(planos) {
        dom.planosList.innerHTML = '';
        if (planos.length === 0) {
            dom.planosList.innerHTML = '<p class="nenhum-item-encontrado">Nenhum plano de ação encontrado.</p>';
            return;
        }
        planos.forEach(plano => {
            const planoItem = document.createElement('div');
            planoItem.className = 'plano-item';
            planoItem.innerHTML = `
                <div class="plano-info">
                    <h3>${plano.title}</h3>
                    <p><strong>Área Responsável:</strong> ${plano.responsibleArea}</p>
                    <p>${plano.incidentDescription}</p>
                </div>
                <a href="executar_plano_operador.html?id=${plano.id}" class="btn-detalhes">Ver Etapas e Executar</a>`;
            dom.planosList.appendChild(planoItem);
        });
    }

    function aplicarFiltros() {
        const termoTexto = dom.filtroTexto.value.toLowerCase();
        const nomeArea = dom.filtroArea.value;

        let planosFiltrados = todosOsPlanos;

        if (termoTexto) {
            planosFiltrados = planosFiltrados.filter(p => p.title.toLowerCase().includes(termoTexto));
        }
        if (nomeArea) {
            planosFiltrados = planosFiltrados.filter(p => p.responsibleArea === nomeArea);
        }
        renderizarPlanos(planosFiltrados);
    }

    async function carregarDadosIniciais() {
        const token = obterToken();
        const [planosResp, areasResp] = await Promise.all([
            ApiService.buscarPlanosAcaoTodos(token),
            ApiService.buscarTodasAsAreas(token)
        ]);

        if (areasResp.ok) {
            const areas = areasResp.data || [];
            dom.filtroArea.innerHTML = '<option value="">Todas as Áreas</option>';
            areas.forEach(area => {
                dom.filtroArea.innerHTML += `<option value="${area.name}">${area.name}</option>`;
            });
        }

        if (planosResp.ok) {
            todosOsPlanos = planosResp.data || [];
            renderizarPlanos(todosOsPlanos);
        } else {
            dom.planosList.innerHTML = '<p class="erro-dados">Falha ao carregar planos de ação.</p>';
        }
    }

    dom.filtroTexto.addEventListener('input', aplicarFiltros);
    dom.filtroArea.addEventListener('change', aplicarFiltros);

    carregarDadosIniciais();
});