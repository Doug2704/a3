import { inicializarPaginaBaseGerenciador } from './gerenciadorPageSetup.js';
import * as ApiService from '../apiService.js';
import { obterToken } from '../authService.js';

document.addEventListener('DOMContentLoaded', async () => {
    await inicializarPaginaBaseGerenciador();

    // --- ELEMENTOS DO DOM ---
    const viewListaPlanosEl = document.getElementById('viewListaPlanos');
    const viewDetalhesPlanoEl = document.getElementById('viewDetalhesPlano');
    const filtroNomePlanoEl = document.getElementById('filtroNomePlano');
    const containerListaPlanosEl = document.getElementById('containerListaPlanos');
    const btnVoltarParaListaEl = document.getElementById('btnVoltarParaLista');
    const btnEditarPlanoEl = document.getElementById('btnEditarPlano');
    
    // Elementos da tela de detalhes
    const detalhePlanoTituloEl = document.getElementById('detalhePlanoTitulo');
    const detalhePlanoDescricaoIncidenteEl = document.getElementById('detalhePlanoDescricaoIncidente');
    const detalhePlanoAreaResponsavelEl = document.getElementById('detalhePlanoAreaResponsavel');
    const detalhePlanoNivelUrgenciaEl = document.getElementById('detalhePlanoNivelUrgencia');
    const detalhePlanoNivelImpactoEl = document.getElementById('detalhePlanoNivelImpacto');
    const detalhePlanoMaxDurationEl = document.getElementById('detalhePlanoMaxDuration');
    const detalhePlanoAreasImpactadasEl = document.getElementById('detalhePlanoAreasImpactadas');
    const listaEtapasDoPlanoEl = document.getElementById('listaEtapasDoPlano');
    
    let todosOsPlanos = [];

    // --- FUNÇÕES DE FORMATAÇÃO ---
    function formatarStatus(status) { 
        if (!status) return 'Indefinido';
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    function normalizarStringParaClasse(str) {
        if (!str) return 'desconhecido';
        return str.toString().toLowerCase().replace('_', '-');
    }

    // --- FUNÇÕES DE RENDERIZAÇÃO ---

    function renderizarListaPlanos(planos) {
        containerListaPlanosEl.innerHTML = ''; 
        if (!planos || planos.length === 0) {
            containerListaPlanosEl.innerHTML = `<p class="nenhum-plano-encontrado">Nenhum plano de ação encontrado.</p>`;
            return;
        }

        planos.forEach(plano => {
            const cardPlano = document.createElement('div');
            cardPlano.className = 'plano-item-card-gerenciador';
            // CORREÇÃO: Usando 'responsibleArea' e 'status' (quando o backend adicionar)
            cardPlano.innerHTML = `
                <h3>${plano.title || 'Plano Sem Título'}</h3>
                <p><strong>Área Resp.:</strong> ${plano.responsibleArea || 'N/A'}</p>
               
                <div class="plano-card-acoes">
                    <button class="btn-ver-detalhes-plano" data-id-plano="${plano.id}">Ver Detalhes</button>
                </div>
            `;
            cardPlano.querySelector('.btn-ver-detalhes-plano').addEventListener('click', () => mostrarDetalhesPlano(plano.id));
            containerListaPlanosEl.appendChild(cardPlano);
        });
    }
    
    function renderizarEtapasDoPlano(etapas) {
        listaEtapasDoPlanoEl.innerHTML = ''; 
        if (!etapas || etapas.length === 0) {
            listaEtapasDoPlanoEl.innerHTML = '<p class="nenhuma-etapa-encontrada">Nenhuma etapa cadastrada para este plano.</p>';
            return;
        }

        etapas.forEach(etapa => {
            const itemEtapa = document.createElement('div');
            itemEtapa.className = 'etapa-item-detalhe-gerenciador';
            
            let acoesHtml = '<p>Nenhuma ação definida.</p>';
            // CORREÇÃO: Usando 'actionResponseDTOs' que já estava correto
            if(etapa.actionResponseDTOs && etapa.actionResponseDTOs.length > 0) {
                acoesHtml = `<ul>${etapa.actionResponseDTOs.map(acao => `<li>${acao.title}</li>`).join('')}</ul>`;
            }

            // CORREÇÃO: Usando 'responsibleArea'
            itemEtapa.innerHTML = `
                <div class="etapa-titulo-posicao-gerenciador">
                    <h4 class="etapa-titulo-gerenciador">${etapa.title || 'Etapa sem título'}</h4>
                </div>
                <div class="etapa-info-adicional-gerenciador">
                    
                    <span><strong>Área Resp.:</strong> ${etapa.responsibleArea || 'N/A'}</span>
                </div>
                <div class="etapa-acoes-container">
                    <h5>Ações a Realizar:</h5>
                    ${acoesHtml}
                </div>
            `;
            listaEtapasDoPlanoEl.appendChild(itemEtapa);
        });
    }
    
    async function mostrarDetalhesPlano(idPlano) { 
        const resposta = await ApiService.buscarPlanoAcaoPorId(idPlano, obterToken());
        if(!resposta.ok || !resposta.data) {
            alert("Não foi possível carregar os detalhes do plano.");
            return;
        }
        const plano = resposta.data;

        // CORREÇÃO: Usando os nomes dos campos do novo DTO de Resposta
        detalhePlanoTituloEl.textContent = plano.title || 'Plano Sem Título';
        detalhePlanoDescricaoIncidenteEl.textContent = plano.incidentDescription || 'Não informada.';
        detalhePlanoAreaResponsavelEl.textContent = plano.responsibleArea || 'Não informada.';
        detalhePlanoNivelUrgenciaEl.textContent = formatarStatus(plano.urgencyLevel) || 'N/A';
        detalhePlanoNivelUrgenciaEl.className = `nivel-tag nivel-${normalizarStringParaClasse(plano.urgencyLevel)}`;
        detalhePlanoNivelImpactoEl.textContent = formatarStatus(plano.impactLevel) || 'N/A';
        detalhePlanoNivelImpactoEl.className = `nivel-tag nivel-${normalizarStringParaClasse(plano.impactLevel)}`;
        detalhePlanoMaxDurationEl.textContent = plano.planMaxDuration || 'Não definida'; // DTO envia como String
        detalhePlanoAreasImpactadasEl.textContent = (plano.affectedAreas && plano.affectedAreas.length > 0) ? plano.affectedAreas.join(', ') : 'Nenhuma';

        btnEditarPlanoEl.href = `formulario_plano_acao.html?id=${idPlano}`;

        renderizarEtapasDoPlano(plano.stepResponseDTOs || []);
        
        viewListaPlanosEl.style.display = 'none';
        viewDetalhesPlanoEl.style.display = 'block';
        window.scrollTo(0, 0); 
    }

    function filtrarPlanos() {
        const termoFiltro = filtroNomePlanoEl.value.toLowerCase().trim();
        const planosFiltrados = todosOsPlanos.filter(plano => 
            (plano.title || '').toLowerCase().includes(termoFiltro)
        );
        renderizarListaPlanos(planosFiltrados);
    }
    
    async function carregarEExibirPlanos() {
        containerListaPlanosEl.innerHTML = '<p class="carregando-dados-planos">Carregando planos de ação...</p>';
        const resposta = await ApiService.buscarPlanosAcaoTodos(obterToken()); 
        
        if (resposta.ok && Array.isArray(resposta.data)) {
            todosOsPlanos = resposta.data;
            renderizarListaPlanos(todosOsPlanos);
        } else {
            console.error("Falha ao carregar planos de ação:", resposta?.data?.mensagem);
            containerListaPlanosEl.innerHTML = '<p class="nenhum-plano-encontrado">Não foi possível carregar os planos de ação.</p>';
        }
    }

    // --- EVENT LISTENERS ---
    btnVoltarParaListaEl.addEventListener('click', () => {
        viewDetalhesPlanoEl.style.display = 'none';
        viewListaPlanosEl.style.display = 'block';
    });

    filtroNomePlanoEl.addEventListener('input', filtrarPlanos);

    // --- INICIALIZAÇÃO ---
    carregarEExibirPlanos();
});