import { inicializarPaginaBaseGerenciador } from './gerenciadorPageSetup.js';
import * as ApiService from '../apiService.js';
import { obterToken } from '../authService.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- SETUP INICIAL DA PÁGINA ---
    const setupOk = await inicializarPaginaBaseGerenciador();
    if (!setupOk) {
        document.body.innerHTML = "<p class='erro-dados'>Erro crítico ao carregar a página.</p>";
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
    let listaDeAreasDisponiveis = [];
    const urlParams = new URLSearchParams(window.location.search);
    const planId = urlParams.get('id');
    const MODO_EDICAO = !!planId;

    // --- FUNÇÕES HELPER ---
    
    function parseDurationToMinutes(durationStr) {
        if (!durationStr || typeof durationStr !== 'string') return 0;
        const hoursMatch = durationStr.match(/(\d+)\s*h/);
        const minutesMatch = durationStr.match(/(\d+)\s*m/);
        const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
        const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
        return (hours * 60) + minutes;
    }

    function encontrarIdAreaPeloNome(nomeArea) {
        if (!nomeArea) return null;
        const nomeLimpo = nomeArea.trim();
        const areaEncontrada = listaDeAreasDisponiveis.find(area => area.nomeDisplay.trim() === nomeLimpo);
        return areaEncontrada ? areaEncontrada.id : null;
    }

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

    // --- LÓGICA DO COMPONENTE MULTI-SELECT ---
    
    function atualizarTextoTriggerMultiSelect(trigger, name, placeholder) {
        const checkboxes = trigger.closest('.custom-multiselect-wrapper').querySelectorAll(`input[name="${name}"]:checked`);
        const triggerTextEl = trigger.querySelector('.multiselect-trigger-text');
        if (checkboxes.length === 0) {
            triggerTextEl.textContent = placeholder;
            triggerTextEl.classList.remove('has-selection');
        } else {
            triggerTextEl.textContent = `${checkboxes.length} selecionada(s)`;
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

    // --- FUNÇÕES DE RENDERIZAÇÃO DINÂMICA ---
    
    function adicionarAcaoInput(containerAcoes, acao = null) {
        const divAcao = document.createElement('div');
        divAcao.className = 'acao-item';
        const tituloAcao = acao ? acao.title : '';
        divAcao.innerHTML = `<input type="text" name="actionTitle" required placeholder="Digite o título da ação..." value="${tituloAcao}"><button type="button" class="btn-remover-acao" title="Remover esta ação">&times;</button>`;
        containerAcoes.appendChild(divAcao);
    }

    function renderizarEtapaNoFormulario(etapa = null) {
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

        const containerAcoes = divEtapa.querySelector('.acoes-container');

        if (etapa) {
            divEtapa.querySelector('input[name="stepTitle"]').value = etapa.title;
            const idAreaResponsavelEtapa = encontrarIdAreaPeloNome(etapa.responsibleArea);
            if (idAreaResponsavelEtapa) {
                divEtapa.querySelector('select[name="stepResponsibleAreaId"]').value = idAreaResponsavelEtapa;
            }
            (etapa.actionResponseDTOs || []).forEach(acao => {
                adicionarAcaoInput(containerAcoes, acao);
            });
        } else {
            adicionarAcaoInput(containerAcoes);
        }
    }
    
    // --- LÓGICA PRINCIPAL E DE EVENTOS ---

    async function carregarDadosIniciaisFormulario() {
        try {
            const resposta = await ApiService.buscarTodasAsAreas(obterToken());
            if (resposta.ok && Array.isArray(resposta.data)) {
                listaDeAreasDisponiveis = resposta.data.map(area => ({ id: area.id, nomeDisplay: area.name.trim() }));
                
                areaResponsavelPlanoSelect.innerHTML = '<option value="">Selecione...</option>';
                listaDeAreasDisponiveis.forEach(area => {
                    areaResponsavelPlanoSelect.innerHTML += `<option value="${area.id}">${area.nomeDisplay}</option>`;
                });

                criarComponenteMultiSelect(containerAreasImpactadasEl, "Selecione as áreas impactadas...", listaDeAreasDisponiveis, 'plano-area-impactada', 'affectedAreasIds');
            }
        } catch (error) {
            console.error("Erro ao carregar áreas:", error);
        }
    }

    function preencherFormularioComDados(plano) {
        tituloPlanoInput.value = plano.title;
        descricaoIncidenteTextarea.value = plano.incidentDescription;
        nivelUrgenciaSelect.value = plano.urgencyLevel;
        nivelImpactoSelect.value = plano.impactLevel;
        planMaxDurationInput.value = parseDurationToMinutes(plano.planMaxDuration);

        const idAreaResponsavelPlano = encontrarIdAreaPeloNome(plano.responsibleArea);
        if (idAreaResponsavelPlano) {
            areaResponsavelPlanoSelect.value = idAreaResponsavelPlano;
        }

        const idsAreasImpactadas = plano.affectedAreas.map(nomeArea => encontrarIdAreaPeloNome(nomeArea)).filter(id => id !== null);
        idsAreasImpactadas.forEach(id => {
            const checkbox = document.getElementById(`plano-area-impactada-${id}`);
            if (checkbox) checkbox.checked = true;
        });
        atualizarTextoTriggerMultiSelect(containerAreasImpactadasEl.querySelector('.multiselect-trigger'), 'affectedAreasIds', "Selecione as áreas impactadas...");

        etapasContainer.innerHTML = '';
        if (plano.stepResponseDTOs && plano.stepResponseDTOs.length > 0) {
            plano.stepResponseDTOs.forEach(etapa => renderizarEtapaNoFormulario(etapa));
        } else {
            etapasContainer.innerHTML = `<p class="sem-etapas-mensagem">Este plano ainda não possui etapas. Adicione uma para começar.</p>`;
        }
    }
    
    async function inicializarPagina() {
        await carregarDadosIniciaisFormulario();

        if (MODO_EDICAO) {
            document.querySelector('h1').textContent = 'Editar Plano de Ação';
            try {
                const respostaPlano = await ApiService.buscarPlanoAcaoPorId(planId, obterToken());
                if (respostaPlano.ok) {
                    preencherFormularioComDados(respostaPlano.data);
                } else {
                    throw new Error('Não foi possível carregar os dados do plano.');
                }
            } catch (error) {
                formPlanoAcao.innerHTML = `<p class="erro-dados">${error.message}</p>`;
            }
        } else {
            document.querySelector('h1').textContent = 'Criar Novo Plano de Ação';
            renderizarEtapaNoFormulario();
        }
    }

    document.addEventListener('click', (e) => {
        document.querySelectorAll('.custom-multiselect-wrapper').forEach(wrapper => {
            if (!wrapper.contains(e.target)) {
                wrapper.querySelector('.multiselect-dropdown').style.display = 'none';
            }
        });
    });

    etapasContainer.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remover-etapa')) {
            e.target.closest('.etapa-item-form').remove();
            if(etapasContainer.querySelectorAll('.etapa-item-form').length === 0) {
                const msg = etapasContainer.querySelector('.sem-etapas-mensagem');
                if (msg) msg.style.display = 'block';
            }
        } else if (e.target.closest('.btn-adicionar-acao')) {
            adicionarAcaoInput(e.target.closest('.etapa-item-form').querySelector('.acoes-container'));
        } else if (e.target.closest('.btn-remover-acao')) {
            const acaoItem = e.target.closest('.acao-item');
            if (acaoItem.parentElement.children.length > 1) {
                acaoItem.remove();
            } else {
                alert("Uma etapa deve ter pelo menos uma ação.");
            }
        }
    });

    btnAdicionarEtapa.addEventListener('click', () => renderizarEtapaNoFormulario(null));

    formPlanoAcao.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        limparTodosFeedbacksErro();
        let formValido = true;

        if (!tituloPlanoInput.value) { exibirFeedbackErro(tituloPlanoInput, "Título é obrigatório."); formValido = false; }
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
            
            const actionRequestDTOS = Array.from(acoesInputs)
                .map(input => ({ title: input.value.trim() }))
                .filter(acao => acao.title);

            if (actionRequestDTOS.length === 0) {
                exibirFeedbackErro(acoesInputs[0] || fieldset.querySelector('.btn-adicionar-acao'), "Adicione ao menos uma ação válida.");
                formValido = false;
            }

            stepRequestDTOs.push({
                title: stepTitleInput.value.trim(),
                responsibleAreaId: parseInt(stepRespAreaSelect.value, 10),
                actionRequestDTOS: actionRequestDTOS,
            });
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
            // --- CORREÇÃO APLICADA AQUI ---
            planMaxDuration: (parseInt(planMaxDurationInput.value, 10) || 0) * 60,
            affectedAreasIds: affectedAreasSelecionadas.map(cb => parseInt(cb.value, 10)),
            stepRequestDTOs: stepRequestDTOs
        };

        try {
            const token = obterToken();
            let respostaApi;

            if (MODO_EDICAO) {
                respostaApi = await ApiService.atualizarPlanoAcao(planId, planRequestDTO, token);
            } else {
                respostaApi = await ApiService.criarPlanoAcaoGerenciador(planRequestDTO, token);
            }

            if (respostaApi.ok) {
                alert(`Plano de ação ${MODO_EDICAO ? 'atualizado' : 'salvo'} com sucesso!`);
                window.location.href = 'visualizar_planos_gerenciador.html';
            } else {
                const erroMsg = respostaApi.data?.message || respostaApi.data?.mensagem || 'O servidor não retornou uma mensagem de erro específica.';
                alert(`Erro ao salvar [${respostaApi.status}]: ${erroMsg}`);
            }
        } catch (error) {
            console.error("Erro inesperado na aplicação:", error);
            alert('Um erro inesperado ocorreu. Verifique o console para detalhes técnicos.');
        }
    });

    // --- INICIALIZAÇÃO ---
    inicializarPagina();
});