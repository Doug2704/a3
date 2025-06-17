import { inicializarPaginaBaseOperador } from './operadorPageSetup.js';
import * as ApiService from '../apiService.js';
import { obterToken } from '../authService.js';

document.addEventListener('DOMContentLoaded', async () => {
    await inicializarPaginaBaseOperador();

    const dom = {
        planoTitulo: document.getElementById('planoTitulo'),
        detalhesPlano: document.getElementById('detalhes-plano'),
        etapasList: document.getElementById('etapasList'),
        statusTexto: document.getElementById('status-texto'),
        cronometroGeralContainer: document.getElementById('cronometro-geral-container'),
        cronometroGeral: document.getElementById('cronometro-geral'),
        botoesControlePlano: document.getElementById('botoes-controle-plano'),
        btnIniciarPlano: document.getElementById('btn-iniciar-plano'),
    };
    
    let timerGeral;
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
        const segundos = Math.floor(totalSegundos % 60);
        return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
    }

    function iniciarCronometroGeral(startTime) {
        if (timerGeral) clearInterval(timerGeral);
        const tsInicio = new Date(startTime).getTime();
        if (isNaN(tsInicio) || tsInicio <= 0) return;

        timerGeral = setInterval(() => {
            const decorridoSegundos = (Date.now() - tsInicio) / 1000;
            dom.cronometroGeral.textContent = formatarTempo(decorridoSegundos);
        }, 1000);
    }

    function renderizarPagina(plano, execucao) {
        // Renderiza informações gerais
        dom.planoTitulo.textContent = plano.title;
        dom.detalhesPlano.innerHTML = `<p>${plano.incidentDescription}</p>`;

        // Controla a visibilidade dos botões e status
        if (execucao && execucao.status === "EXECUTING") {
            dom.btnIniciarPlano.style.display = 'none';
            dom.statusTexto.textContent = "Em Execução";
            dom.cronometroGeralContainer.style.display = 'flex';
            iniciarCronometroGeral(execucao.openingDate);
        } else if (execucao && execucao.status === "FINISHED") {
            dom.btnIniciarPlano.style.display = 'none';
            dom.statusTexto.textContent = "Finalizado";
            dom.cronometroGeralContainer.style.display = 'flex';
            const duracao = (new Date(execucao.finishDate) - new Date(execucao.openingDate)) / 1000;
            dom.cronometroGeral.textContent = formatarTempo(duracao);
        } else {
            dom.btnIniciarPlano.style.display = 'block';
            dom.statusTexto.textContent = "Não Iniciado";
            dom.cronometroGeralContainer.style.display = 'none';
        }

        // Renderiza as etapas e ações
        dom.etapasList.innerHTML = '';
        (plano.stepResponseDTOs || []).forEach(etapa => {
            const etapaItem = document.createElement('div');
            etapaItem.className = 'etapa-item';
            const acoesHtml = (etapa.actionResponseDTOs || []).map(acao => {
                const isDone = acao.isDone;
                const doneClass = isDone ? 'done' : '';
                // O botão só aparece se a execução já começou
                const botaoHtml = execucao ? (isDone
                    ? `<button class="btn-reabrir-acao" data-id="${acao.id}">Reabrir</button>`
                    : `<button class="btn-concluir-acao" data-id="${acao.id}">Concluir</button>`) : '';

                return `<div class="acao-item ${doneClass}" data-id-acao="${acao.id}">
                            <span class="acao-titulo">${acao.title}</span>
                            <div class="acao-actions">${botaoHtml}</div>
                        </div>`;
            }).join('');
            etapaItem.innerHTML = `<div class="etapa-cabecalho"><h4>${etapa.title}</h4></div>
                                 <div class="etapa-acoes-container">${acoesHtml}</div>`;
            dom.etapasList.appendChild(etapaItem);
        });
    }
    
    async function carregarDadosIniciais() {
        if (!idPlano) {
            window.location.href = 'visualizar_planos_operador.html';
            return;
        }

        const token = obterToken();
        // Tentamos buscar uma execução existente primeiro, para saber o estado do plano
        const execucaoResp = await ApiService.iniciarOuBuscarExecucaoPlano(idPlano, token);
        const plano = execucaoResp.ok ? execucaoResp.data.planResponseDTO : (await ApiService.buscarPlanoAcaoPorId(idPlano, token)).data;
        const execucao = execucaoResp.ok ? execucaoResp.data : null;
        
        renderizarPagina(plano, execucao);
    }
    
    dom.btnIniciarPlano.addEventListener('click', async () => {
        const token = obterToken();
        const execucaoResp = await ApiService.iniciarOuBuscarExecucaoPlano(idPlano, token);
        if (execucaoResp.ok) {
            renderizarPagina(execucaoResp.data.planResponseDTO, execucaoResp.data);
        } else {
            alert('Falha ao iniciar a execução do plano.');
        }
    });

    dom.etapasList.addEventListener('click', async e => {
        const idAcao = e.target.dataset.id;
        if (!idAcao) return;
    
        const token = obterToken();
        let resposta = null;
        let marcarComoFeita = false;
    
        if (e.target.classList.contains('btn-concluir-acao')) {
            marcarComoFeita = true;
        } else if (e.target.classList.contains('btn-reabrir-acao')) {
            marcarComoFeita = false;
        } else {
            return;
        }
        
        resposta = await ApiService.marcarAcaoFeita(idAcao, marcarComoFeita, token);
    
        if (resposta && resposta.ok) {
            await carregarDadosIniciais();
        } else {
            alert('Falha ao atualizar o status da ação.');
        }
    });

    carregarDadosIniciais();
});