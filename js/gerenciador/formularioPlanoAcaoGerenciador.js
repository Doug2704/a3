import { inicializarPaginaBaseGerenciador } from './gerenciadorPageSetup.js';
import * as ApiService from '../apiService.js';
import { obterToken } from '../authService.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- SETUP INICIAL DA PÁGINA ---
    const setupOk = await inicializarPaginaBaseGerenciador();
    if (!setupOk) {
        const formEl = document.getElementById('formPlanoAcao');
        if (formEl) formEl.innerHTML = "<p class='erro-dados'>Erro crítico ao carregar a página.</p>";
        return;
    }

    // --- REFERÊNCIAS DO DOM ---
    const formPlanoAcao = document.getElementById('formPlanoAcao');
    const tituloPlanoInput = document.getElementById('tituloPlano');
    const areaResponsavelPlanoSelect = document.getElementById('areaResponsavelPlano');
    const descricaoIncidenteTextarea = document.getElementById('descricaoIncidente');
    const nivelUrgenciaSelect = document.getElementById('nivelUrgencia');
    const nivelImpactoSelect = document.getElementById('nivelImpacto');
    const planMaxDurationInput = document.getElementById('planMaxDuration');
    const containerAreasImpactadasEl = document.getElementById('containerAreasImpactadas');
    const etapasContainer = document.getElementById('etapasContainer');
    const btnAdicionarEtapa = document.getElementById('btnAdicionarEtapa');

    // --- VARIÁVEIS DE ESTADO ---
    let contadorIdInternoEtapa = 0;
    let listaDeAreasDisponiveis = [];

    // --- FUNÇÕES DE FEEDBACK DE ERRO ---
    function exibirFeedbackErro(inputElement, mensagem) {
        if (!inputElement) return;
        inputElement.classList.add('input-erro');
        const errorMsgElement = document.createElement('div');
        errorMsgElement.className = 'mensagem-erro-campo';
        errorMsgElement.textContent = mensagem;
        inputElement.parentElement.insertBefore(errorMsgElement, inputElement.nextSibling);
    }

    function limparTodosFeedbacksErro() {
        formPlanoAcao.querySelectorAll('.input-erro').forEach(el => el.classList.remove('input-erro'));
        formPlanoAcao.querySelectorAll('.mensagem-erro-campo').forEach(el => el.remove());
    }

    // --- FUNÇÕES DO COMPONENTE MULTI-SELECT ---
    function atualizarTextoTriggerMultiSelect(trigger, name, placeholder) {
        const checkboxes = trigger.closest('.custom-multiselect-wrapper').querySelectorAll(`input[name="${name}"]:checked`);
        const triggerTextEl = trigger.querySelector('.multiselect-trigger-text');
        if (checkboxes.length === 0) {
            triggerTextEl.textContent = placeholder;
            triggerTextEl.classList.remove('has-selection');
        } else {
            triggerTextEl.textContent = `${checkboxes.length} selecionados`;
            triggerTextEl.classList.add('has-selection');
        }
    }

    function criarComponenteMultiSelect(containerEl, placeholder, items, idPrefix, name) {
        containerEl.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-multiselect-wrapper';
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'multiselect-trigger';
        trigger.innerHTML = `<span class="multiselect-trigger-text">${placeholder}</span><span class="multiselect-arrow">&#9660;</span>`;
        const dropdown = document.createElement('div');
        dropdown.className = 'multiselect-dropdown';
        dropdown.style.display = 'none';

        if (items && items.length > 0) {
            items.forEach(item => {
                const divCheck = document.createElement('div');
                divCheck.className = 'checkbox-item';
                divCheck.innerHTML = `<input type="checkbox" id="${idPrefix}-${item.id}" name="${name}" value="${item.id}"><label for="${idPrefix}-${item.id}">${item.nomeDisplay}</label>`;
                divCheck.querySelector('input').addEventListener('change', () => atualizarTextoTriggerMultiSelect(trigger, name, placeholder));
                dropdown.appendChild(divCheck);
            });
        } else {
            dropdown.innerHTML = `<p class="multiselect-no-options">Nenhuma opção.</p>`;
        }

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = dropdown.style.display === 'block';
            document.querySelectorAll('.multiselect-dropdown').forEach(d => d.style.display = 'none');
            dropdown.style.display = isVisible ? 'none' : 'block';
        });

        wrapper.append(trigger, dropdown);
        containerEl.appendChild(wrapper);
    }
    
    document.addEventListener('click', (e) => {
        document.querySelectorAll('.custom-multiselect-wrapper').forEach(wrapper => {
            if (!wrapper.contains(e.target)) {
                wrapper.querySelector('.multiselect-dropdown').style.display = 'none';
            }
        });
    });

    // --- FUNÇÕES DE RENDERIZAÇÃO DINÂMICA ---
    function adicionarAcaoInput(containerAcoes) {
        const divAcao = document.createElement('div');
        divAcao.className = 'acao-item';
        divAcao.innerHTML = `<input type="text" name="actionTitle" required placeholder="Digite o título da ação..."><button type="button" class="btn-remover-acao" title="Remover esta ação">&times;</button>`;
        containerAcoes.appendChild(divAcao);
    }

    function renderizarEtapaNoFormulario() {
        contadorIdInternoEtapa++;
        const msgSemEtapas = etapasContainer.querySelector('.sem-etapas-mensagem');
        if (msgSemEtapas) msgSemEtapas.style.display = 'none';
        const divEtapa = document.createElement('div');
        divEtapa.className = 'etapa-item-form';
        let opcoesAreas = '<option value="">Selecione...</option>';
        listaDeAreasDisponiveis.forEach(area => {
            opcoesAreas += `<option value="${area.id}">${area.nomeDisplay}</option>`;
        });
        const numEtapas = etapasContainer.querySelectorAll('.etapa-item-form').length;
        divEtapa.innerHTML = `<div class="etapa-legenda">Etapa ${numEtapas + 1}</div><div class="form-grupo"><label>Título da Etapa <span class="obrigatorio">*</span></label><input type="text" name="stepTitle" required placeholder="Ex: Isolar sistema afetado"></div><div class="form-grupo"><label>Área Responsável (Etapa) <span class="obrigatorio">*</span></label><select name="stepResponsibleAreaId" required>${opcoesAreas}</select></div><div class="form-grupo"><label>Ações da Etapa <span class="obrigatorio">*</span></label><div class="acoes-container"></div><button type="button" class="btn-adicionar-acao btn-adicionar-item-secundario"><i class="fa-solid fa-plus"></i> Adicionar Ação</button></div><button type="button" class="btn-remover-etapa">Remover Etapa</button>`;
        etapasContainer.appendChild(divEtapa);
        adicionarAcaoInput(divEtapa.querySelector('.acoes-container'));
    }

    // --- CARREGAMENTO DE DADOS INICIAIS ---
    async function carregarDadosIniciaisFormulario() {
        try {
            const resposta = await ApiService.buscarTodasAsAreas(obterToken());
            if (resposta.ok && Array.isArray(resposta.data)) {
                listaDeAreasDisponiveis = resposta.data.map(area => ({ id: area.id, nomeDisplay: area.name }));
                areaResponsavelPlanoSelect.innerHTML = '<option value="">Selecione...</option>';
                listaDeAreasDisponiveis.forEach(area => {
                    areaResponsavelPlanoSelect.innerHTML += `<option value="${area.id}">${area.nomeDisplay}</option>`;
                });
                // CORREÇÃO 1: Readicionada a criação do componente multi-select
                criarComponenteMultiSelect(containerAreasImpactadasEl, "Selecione as áreas impactadas...", listaDeAreasDisponiveis, 'plano-area-impactada', 'affectedAreasIds');
            }
        } catch (error) {
            console.error("Erro ao carregar áreas:", error);
        }
    }

    // --- LISTENERS DE EVENTOS ---
    etapasContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remover-etapa')) {
            e.target.closest('.etapa-item-form').remove();
            if(etapasContainer.querySelectorAll('.etapa-item-form').length === 0) {
                const msg = etapasContainer.querySelector('.sem-etapas-mensagem');
                if (msg) msg.style.display = 'block';
            }
        }
        if (e.target.classList.contains('btn-adicionar-acao')) {
            adicionarAcaoInput(e.target.previousElementSibling);
        }
        if (e.target.classList.contains('btn-remover-acao')) {
            const acaoItem = e.target.closest('.acao-item');
            if (acaoItem.parentElement.children.length > 1) {
                acaoItem.remove();
            } else {
                alert("Uma etapa deve ter pelo menos uma ação.");
            }
        }
    });

    btnAdicionarEtapa.addEventListener('click', renderizarEtapaNoFormulario);

    formPlanoAcao.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        limparTodosFeedbacksErro();
        let formValido = true;

        if (!areaResponsavelPlanoSelect.value) { exibirFeedbackErro(areaResponsavelPlanoSelect, "Área responsável é obrigatória."); formValido = false; }
        
        const affectedAreasSelecionadas = Array.from(formPlanoAcao.querySelectorAll('input[name="affectedAreasIds"]:checked'));
        if (affectedAreasSelecionadas.length === 0) {
            exibirFeedbackErro(containerAreasImpactadasEl.querySelector('.multiselect-trigger'), "Selecione ao menos uma área impactada.");
            formValido = false;
        }

        const stepRequestDTOs = [];
        const fieldsetsEtapas = etapasContainer.querySelectorAll('.etapa-item-form');
        if (fieldsetsEtapas.length === 0) { exibirFeedbackErro(btnAdicionarEtapa, "Adicione ao menos uma etapa."); formValido = false; }

        fieldsetsEtapas.forEach(fieldset => {
            const stepTitleInput = fieldset.querySelector('input[name="stepTitle"]');
            const stepRespAreaSelect = fieldset.querySelector('select[name="stepResponsibleAreaId"]');
            const acoesInputs = fieldset.querySelectorAll('input[name="actionTitle"]');
            if (!stepTitleInput.value.trim()) { exibirFeedbackErro(stepTitleInput, "Título da etapa é obrigatório."); formValido = false; }
            if (!stepRespAreaSelect.value) { exibirFeedbackErro(stepRespAreaSelect, "Área da etapa é obrigatória."); formValido = false; }
            const actionRequestDTOS = [];
            acoesInputs.forEach(input => {
                if(input.value.trim()) {
                    actionRequestDTOS.push({ title: input.value.trim() });
                } else {
                    exibirFeedbackErro(input, "Título da ação não pode ser vazio.");
                    formValido = false;
                }
            });
            if(actionRequestDTOS.length === 0 && acoesInputs.length > 0) {
                formValido = false; // Garante que não prossiga se todos os campos de ação estiverem vazios
            }

            if (formValido) {
                stepRequestDTOs.push({
                    title: stepTitleInput.value.trim(),
                    responsibleAreaId: parseInt(stepRespAreaSelect.value, 10),
                    actionRequestDTOS: actionRequestDTOS,
                    status: 'NOT_STARTED'
                });
            }
        });

        if (!formValido) {
            alert("Verifique os erros no formulário.");
            return;
        }

        const planRequestDTO = {
            title: tituloPlanoInput.value.trim(),
            responsibleAreaId: parseInt(areaResponsavelPlanoSelect.value, 10),
            incidentDescription: descricaoIncidenteTextarea.value.trim(),
            urgencyLevel: nivelUrgenciaSelect.value,
            impactLevel: nivelImpactoSelect.value,
            planMaxDuration: parseInt(planMaxDurationInput.value, 10),
            // CORREÇÃO 2: Readicionada a coleta dos valores do multi-select
            affectedAreasIds: affectedAreasSelecionadas.map(cb => parseInt(cb.value, 10)),
            stepRequestDTOs: stepRequestDTOs
        };

        try {
            const token = obterToken();
            const respostaApi = await ApiService.criarPlanoAcaoGerenciador(planRequestDTO, token);
            if (respostaApi.ok) {
                alert('Plano de ação salvo com sucesso!');
                window.location.href = 'visualizar_planos_gerenciador.html';
            } else {
                const erroMsg = respostaApi.data?.message || respostaApi.data?.mensagem || 'O servidor não retornou uma mensagem de erro específica.';
                console.error('Falha na API:', { status: respostaApi.status, data: respostaApi.data });
                alert(`Erro ao salvar [${respostaApi.status}]: ${erroMsg}`);
            }
        } catch (error) {
            console.error("Erro inesperado na aplicação:", error);
            alert('Um erro inesperado ocorreu. Verifique o console para detalhes técnicos.');
        }
    });

    // --- INICIALIZAÇÃO ---
    await carregarDadosIniciaisFormulario();
});