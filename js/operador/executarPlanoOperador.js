import { inicializarPaginaBaseOperador } from './operadorPageSetup.js';
import * as ApiService from '../apiService.js';
import { obterToken } from '../authService.js';

document.addEventListener('DOMContentLoaded', async () => {
    const setupOk = await inicializarPaginaBaseOperador();
    if (!setupOk) return;

    const dom = {
        planoTitulo: document.getElementById('planoTitulo'),
        detalhesPlano: document.getElementById('detalhes-plano'),
        etapasList: document.getElementById('etapasList'),
    };
    
    let planoCompleto = null;
    let execucaoAtual = null;
    let timers = {};
    
    const urlParams = new URLSearchParams(window.location.search);
    const idPlano = urlParams.get('id');

    function formatarStatus(status) {
        if (!status) return 'INDEFINIDO';
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    function formatarTempo(totalSegundos) {
        if (isNaN(totalSegundos) || totalSegundos < 0) totalSegundos = 0;
        const horas = Math.floor(totalSegundos / 3600);
        const minutos = Math.floor((totalSegundos % 3600) / 60);
        const segundos = totalSegundos % 60;
        return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
    }

    function pararCronometro(idAcao) {
        if (timers[idAcao]) {
            clearInterval(timers[idAcao]);
            delete timers[idAcao];
        }
    }
    
    function iniciarCronometro(idAcao) {
        pararCronometro(idAcao);
        if (!execucaoAtual || !execucaoAtual.openingDate) return;
        
        const tsInicio = new Date(execucaoAtual.openingDate).getTime();
        if (isNaN(tsInicio) || tsInicio <= 0) return;

        timers[idAcao] = setInterval(() => {
            const decorridoSegundos = Math.floor((Date.now() - tsInicio) / 1000);
            const cronometroEl = document.getElementById(`cronometro-${idAcao}`);
            if(cronometroEl) cronometroEl.textContent = formatarTempo(decorridoSegundos);
        }, 1000);
    }

    function renderizarEtapas(etapas) {
        dom.etapasList.innerHTML = '';
        if(!etapas || etapas.length === 0) return;

        etapas.forEach(etapa => {
            const etapaItem = document.createElement('div');
            etapaItem.className = 'etapa-item';
            
            const acoesHtml = (etapa.actionResponseDTOs || []).map(acao => {
                const isDone = acao.isDone;
                return `
                <div class="acao-item" data-id-acao="${acao.id}">
                    <span class="acao-titulo">${acao.title}</span>
                    <div class="acao-actions">
                        <button class="btn-concluir" data-id="${acao.id}" ${isDone ? 'disabled' : ''}>Concluir</button>
                        <button class="btn-reabrir" data-id="${acao.id}" ${!isDone ? 'disabled' : ''}>Reabrir</button>
                    </div>
                </div>`;
            }).join('');

            etapaItem.innerHTML = `
                <div class="etapa-cabecalho">
                    <h4>${etapa.title}</h4>
                    <span class="etapa-status ${etapa.status.toLowerCase()}">${formatarStatus(etapa.status)}</span>
                </div>
                <div class="etapa-info">
                    <p><strong>Área Responsável:</strong> ${etapa.responsibleArea}</p>
                    <div class="etapa-cronometro">
                        <i class="fa-regular fa-clock"></i>&nbsp;
                        <span class="cronometro" id="cronometro-plano-${planoCompleto.id}">00:00:00</span>
                    </div>
                </div>
                <div class="etapa-acoes-container">
                    ${acoesHtml}
                </div>
            `;
            dom.etapasList.appendChild(etapaItem);
        });
        if(execucaoAtual && execucaoAtual.status === 'IN_PROGRESS') {
            iniciarCronometro(planoCompleto.id);
        }
    }
    
    async function carregarDados() {
        const token = obterToken();
        const [planoResp, execucaoResp] = await Promise.all([
            ApiService.buscarPlanoAcaoPorId(idPlano, token),
            ApiService.buscarExecucaoPorPlano(idPlano, token)
        ]);

        if (planoResp.ok) {
            planoCompleto = planoResp.data;
            dom.planoTitulo.textContent = planoCompleto.title;
            dom.detalhesPlano.innerHTML = `<p>${planoCompleto.incidentDescription}</p>`;
            if(execucaoResp.ok && execucaoResp.data.length > 0) {
                execucaoAtual = execucaoResp.data[0];
            }
            renderizarEtapas(planoCompleto.stepResponseDTOs);
        } else {
            dom.planoTitulo.textContent = "Erro ao Carregar Plano";
        }
    }
    
    async function iniciarPlano() {
        if (execucaoAtual) {
            renderizarEtapas(planoCompleto.stepResponseDTOs);
            return;
        }
        // Aqui está a correção da chamada
        const resposta = await ApiService.iniciarExecucaoPlano(idPlano, {}, obterToken());
        if(resposta.ok) {
            await carregarDados();
        } else {
            alert('Falha ao iniciar a execução do plano.');
        }
    }
    
    dom.etapasList.addEventListener('click', async e => {
        const idAcao = e.target.dataset.id;
        if (!idAcao) return;

        let concluir = false;
        if (e.target.classList.contains('btn-concluir')) concluir = true;
        else if (e.target.classList.contains('btn-reabrir')) concluir = false;
        else return;

        const resposta = await ApiService.concluirAcao(idAcao, obterToken(), concluir);
        if (resposta.ok) {
            await carregarDados();
        } else {
            alert('Falha ao atualizar status da ação.');
        }
    });

    if (idPlano) {
        iniciarPlano();
    } else {
        window.location.href = 'visualizar_planos_operador.html';
    }
});
