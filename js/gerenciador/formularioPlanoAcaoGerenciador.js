// js/gerenciador/formularioPlanoAcaoGerenciador.js
import { inicializarPaginaBaseGerenciador } from './gerenciadorPageSetup.js';
import * as ApiService from '../apiService.js';
import { obterToken } from '../authService.js';

document.addEventListener('DOMContentLoaded', async () => {
    const setupOk = await inicializarPaginaBaseGerenciador();
    if (!setupOk) {
        console.error("FORM: Falha no setup base da página do gerenciador. O formulário pode não funcionar corretamente.");
        const formEl = document.getElementById('formPlanoAcao');
        if (formEl) formEl.innerHTML = "<p class='erro-dados'>Erro crítico ao carregar a página. Funcionalidades de formulário indisponíveis.</p>";
        return;
    }

    // --- Referências do DOM ---
    const formPlanoAcao = document.getElementById('formPlanoAcao');
    const nomePlanoInput = document.getElementById('nomePlano');
    const areaResponsavelPlanoSelect = document.getElementById('areaResponsavelPlano');
    const descricaoIncidenteTextarea = document.getElementById('descricaoIncidente');
    const nivelUrgenciaSelect = document.getElementById('nivelUrgencia');
    const nivelImpactoSelect = document.getElementById('nivelImpacto');
    const containerAreasImpactadasEl = document.getElementById('containerAreasImpactadas');
    const containerAtivosImpactadosEl = document.getElementById('containerAtivosImpactados');
    const etapasContainer = document.getElementById('etapasContainer');
    const btnAdicionarEtapa = document.getElementById('btnAdicionarEtapa');
    const msgSemEtapasOriginalHTML = '<p class="sem-etapas-mensagem">Nenhuma etapa adicionada ainda.</p>';
    const btnCancelarPlano = document.getElementById('btnCancelarPlano');
    const tituloPaginaEl = document.querySelector('.cabecalho-pagina-gerenciador h1');
    const btnSubmitForm = formPlanoAcao ? formPlanoAcao.querySelector('button[type="submit"]') : null;


    let contadorIdInternoEtapa = 0;
    let listaDeAreasDisponiveis = [];
    let listaDeAtivosDisponiveis = [];
    let modoEdicao = false;
    let idPlanoParaEditar = null;

    // --- Funções Utilitárias ---
    function limparFeedbackErro(inputElement) {
        if (!inputElement || !inputElement.parentElement) return;
        const parentErrorContainer = inputElement.classList.contains('multiselect-trigger') || inputElement.id === 'btnAdicionarEtapa' || inputElement.id === 'etapasContainer' ? 
                                     inputElement.closest('.form-grupo') || inputElement.parentElement : 
                                     inputElement.parentElement;
        if (parentErrorContainer) {
             inputElement.classList.remove('input-erro');
             if(inputElement.id === 'etapasContainer') inputElement.classList.remove('input-erro'); 
            const errorMsgElement = parentErrorContainer.querySelector(`.mensagem-erro-campo[data-for="${inputElement.id}"]`) || parentErrorContainer.querySelector('.mensagem-erro-campo:not([data-for])');
             if (errorMsgElement) {
                if (inputElement.id !== 'etapasContainer' && errorMsgElement.dataset.for === inputElement.id) {
                    errorMsgElement.remove();
                } else if (!errorMsgElement.dataset.for && !inputElement.classList.contains('multiselect-trigger') && inputElement.id !== 'btnAdicionarEtapa' && inputElement.id !== 'etapasContainer') {
                    errorMsgElement.remove();
                } else if ( (inputElement.id === 'etapasContainer' || inputElement.id === 'btnAdicionarEtapa') && errorMsgElement.classList.contains('erro-container-etapas')) { 
                    errorMsgElement.remove();
                }
            }
        }
    }

    function exibirFeedbackErro(inputElement, mensagem, isContainerOrButtonError = false) {
        if (!inputElement) return;
        let anchorElement = inputElement;
        let parentForErrorMsg = inputElement.parentElement;

        if (inputElement.classList.contains('multiselect-trigger')) {
            anchorElement = inputElement.closest('.custom-multiselect-wrapper') || inputElement;
            parentForErrorMsg = anchorElement.parentElement;
        } else if (inputElement.id === 'etapasContainer') {
             anchorElement = btnAdicionarEtapa; // Coloca erro após o botão de adicionar etapa
             parentForErrorMsg = btnAdicionarEtapa.parentElement;
        } else if (inputElement.id === 'btnAdicionarEtapa') {
            anchorElement = inputElement;
            parentForErrorMsg = inputElement.parentElement;
        }
        
        if (!parentForErrorMsg) { console.warn("Não foi possível exibir feedback de erro, elemento pai não encontrado para:", anchorElement); return; }
        
        const existingError = parentForErrorMsg.querySelector(`.mensagem-erro-campo[data-for="${inputElement.id}"]`);
        if(existingError) existingError.remove();
        
        inputElement.classList.add('input-erro'); 
        const errorMsgElement = document.createElement('div');
        errorMsgElement.classList.add('mensagem-erro-campo');
        errorMsgElement.dataset.for = inputElement.id; 
        if(inputElement.id === 'etapasContainer' || (isContainerOrButtonError && inputElement.id === 'btnAdicionarEtapa')) {
            errorMsgElement.classList.add('erro-container-etapas'); // Classe específica para erro do container de etapas
        }
        errorMsgElement.textContent = mensagem;
        parentForErrorMsg.insertBefore(errorMsgElement, anchorElement.nextSibling);
    }
    
    function limparTodosFeedbacksErro() {
        if (!formPlanoAcao) return;
        formPlanoAcao.querySelectorAll('.input-erro').forEach(el => el.classList.remove('input-erro'));
        formPlanoAcao.querySelectorAll('.mensagem-erro-campo').forEach(el => el.remove());
        if (etapasContainer) etapasContainer.classList.remove('input-erro');
    }

    // --- Lógica da UI de Multi-Select Customizado ---
    function criarComponenteMultiSelect(containerEl, placeholderText, items, idPrefix, nameAttribute, dataAttributeNameForItemDisplay, valoresSelecionados = []) {
        if (!containerEl) { console.warn(`FORM: Container para multi-select (para ${nameAttribute}) não encontrado.`); return; }
        containerEl.innerHTML = ''; containerEl.classList.remove('input-erro'); 
        const wrapper = document.createElement('div'); wrapper.className = 'custom-multiselect-wrapper';
        const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'multiselect-trigger'; trigger.setAttribute('aria-haspopup', 'listbox'); trigger.setAttribute('aria-expanded', 'false');
        trigger.innerHTML = `<span class="multiselect-trigger-text">${placeholderText}</span><span class="multiselect-arrow">&#9660;</span>`;
        const dropdown = document.createElement('div'); dropdown.className = 'multiselect-dropdown'; dropdown.style.display = 'none'; dropdown.setAttribute('role', 'listbox');
        
        if (items && items.length > 0) {
            items.forEach(item => {
                const divCheck = document.createElement('div'); divCheck.classList.add('checkbox-item'); divCheck.setAttribute('role', 'option');
                const isChecked = valoresSelecionados.map(v => v.toString()).includes(item.id.toString());
                divCheck.setAttribute('aria-selected', isChecked.toString());
                const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.id = `${idPrefix}-${item.id}`; checkbox.name = nameAttribute; checkbox.value = item.id; checkbox.checked = isChecked;
                if (dataAttributeNameForItemDisplay) { checkbox.dataset[dataAttributeNameForItemDisplay] = item.nomeDisplay || item.nomeArea || item.nomeAtivo; }
                const label = document.createElement('label'); label.htmlFor = checkbox.id; label.textContent = item.nomeDisplay || item.nomeArea || item.nomeAtivo;
                checkbox.addEventListener('change', () => { divCheck.setAttribute('aria-selected', checkbox.checked.toString()); atualizarTextoTriggerMultiSelect(trigger, nameAttribute, placeholderText, dataAttributeNameForItemDisplay); });
                divCheck.appendChild(checkbox); divCheck.appendChild(label); dropdown.appendChild(divCheck);
            });
        } else { dropdown.innerHTML = `<p class="multiselect-no-options">Nenhuma opção disponível.</p>`; }
        
        trigger.addEventListener('click', (e) => { // Listener de clique CORRETO DENTRO da função
            e.stopPropagation(); const isVisible = dropdown.style.display === 'block';
            document.querySelectorAll('.multiselect-dropdown').forEach(d => { if (d !== dropdown) d.style.display = 'none'; const otherTrigger = d.previousElementSibling; if (otherTrigger && otherTrigger.classList.contains('multiselect-trigger')) { otherTrigger.setAttribute('aria-expanded', 'false'); otherTrigger.querySelector('.multiselect-arrow').innerHTML = '&#9660;'; } });
            dropdown.style.display = isVisible ? 'none' : 'block'; trigger.setAttribute('aria-expanded', (!isVisible).toString()); trigger.querySelector('.multiselect-arrow').innerHTML = isVisible ? '&#9660;' : '&#9650;';
        });

        wrapper.appendChild(trigger); wrapper.appendChild(dropdown); containerEl.appendChild(wrapper);
        atualizarTextoTriggerMultiSelect(trigger, nameAttribute, placeholderText, dataAttributeNameForItemDisplay);
    }
    function atualizarTextoTriggerMultiSelect(triggerElement, checkboxName, placeholder, dataAttributeNameForItemDisplay) {
        const parentDropdown = triggerElement.closest('.custom-multiselect-wrapper').querySelector('.multiselect-dropdown');
        if (!parentDropdown) return; 
        const checkboxes = parentDropdown.querySelectorAll(`input[name="${checkboxName}"]:checked`);
        const triggerTextEl = triggerElement.querySelector('.multiselect-trigger-text');
        if (checkboxes.length === 0) { triggerTextEl.textContent = placeholder; triggerTextEl.classList.remove('has-selection');
        } else if (checkboxes.length <= 2) { 
            let selectedNames = []; checkboxes.forEach(cb => { const name = cb.dataset[dataAttributeNameForItemDisplay] || document.querySelector(`label[for="${cb.id}"]`)?.textContent; if (name) selectedNames.push(name); });
            triggerTextEl.textContent = selectedNames.join(', ') || placeholder; 
            triggerTextEl.classList.add('has-selection');
        } else { triggerTextEl.textContent = `${checkboxes.length} selecionados`; triggerTextEl.classList.add('has-selection'); }
    }
    document.addEventListener('click', (e) => {
        document.querySelectorAll('.custom-multiselect-wrapper').forEach(wrapper => {
            if (!wrapper.contains(e.target)) {
                const dropdown = wrapper.querySelector('.multiselect-dropdown'); const trigger = wrapper.querySelector('.multiselect-trigger');
                if (dropdown) dropdown.style.display = 'none'; if (trigger) { trigger.setAttribute('aria-expanded', 'false'); trigger.querySelector('.multiselect-arrow').innerHTML = '&#9660;'; }
            }
        });
    });

    async function carregarDadosParaFormulario(dadosPlanoExistente = null) {
        console.log("FORM: Iniciando carregamento de dados. Modo Edição:", !!dadosPlanoExistente);
        try {
            const respostaAreas = await ApiService.buscarAreasEAtivosAdmin(obterToken());
            console.log("FORM: Resposta da API para áreas.json:", JSON.parse(JSON.stringify(respostaAreas)));
            if (respostaAreas.ok && Array.isArray(respostaAreas.data)) {
                listaDeAreasDisponiveis = respostaAreas.data.filter(area => area && typeof area.id === 'string' && area.id.trim() !== '' && typeof area.nomeArea === 'string' && area.nomeArea.trim() !== '').map(area => ({ id: area.id, nomeArea: area.nomeArea, nomeDisplay: area.nomeArea, ativos: area.ativos || [] }));
                console.log(`FORM: ${listaDeAreasDisponiveis.length} áreas válidas processadas.`);
                if (areaResponsavelPlanoSelect) {
                    areaResponsavelPlanoSelect.innerHTML = '<option value="">Selecione uma área...</option>';
                    listaDeAreasDisponiveis.forEach(area => { const option = document.createElement('option'); option.value = area.id; option.textContent = area.nomeArea; areaResponsavelPlanoSelect.appendChild(option); });
                    if (dadosPlanoExistente && dadosPlanoExistente.areaResponsavelPlano) { areaResponsavelPlanoSelect.value = dadosPlanoExistente.areaResponsavelPlano; }
                } else { console.warn("FORM: areaResponsavelPlanoSelect não encontrado."); }
                const areasImpactadasSelecionadas = dadosPlanoExistente?.areasImpactadas || [];
                if (containerAreasImpactadasEl) { criarComponenteMultiSelect( containerAreasImpactadasEl, "Selecione as áreas impactadas...", listaDeAreasDisponiveis, 'plano-area-impactada', 'areasImpactadasPlano', 'itemName', areasImpactadasSelecionadas ); } else { console.warn("FORM: containerAreasImpactadasEl não encontrado."); }
                listaDeAtivosDisponiveis = [];
                listaDeAreasDisponiveis.forEach(area => {
                    if (Array.isArray(area.ativos)) {
                        area.ativos.forEach(ativo => {
                            if (ativo && typeof ativo.id === 'string' && ativo.id.trim() !== '' && typeof ativo.nomeAtivo === 'string' && ativo.nomeAtivo.trim() !== '' && !listaDeAtivosDisponiveis.find(a => a.id === ativo.id)) {
                                listaDeAtivosDisponiveis.push({ id: ativo.id, nomeAtivo: ativo.nomeAtivo, nomeDisplay: `${ativo.nomeAtivo} (Área: ${area.nomeArea})` });
                            }
                        });
                    }
                });
                console.log(`FORM: ${listaDeAtivosDisponiveis.length} ativos únicos processados.`);
                const ativosImpactadosSelecionados = dadosPlanoExistente?.ativosImpactados || [];
                if (containerAtivosImpactadosEl) { criarComponenteMultiSelect( containerAtivosImpactadosEl, "Selecione os ativos impactados...", listaDeAtivosDisponiveis, 'plano-ativo-impactado', 'ativosImpactadosPlano', 'itemName', ativosImpactadosSelecionados );
                } else { console.warn("FORM: containerAtivosImpactadosEl não encontrado."); }
            } else { const errorMsg = respostaAreas.data?.mensagem || "Nenhuma área encontrada ou erro na API."; console.error("FORM: Não foi possível carregar lista de áreas:", errorMsg); if (areaResponsavelPlanoSelect) areaResponsavelPlanoSelect.innerHTML = `<option value="">${errorMsg}</option>`; }
        } catch (error) { console.error("FORM: Erro crítico na requisição de dados para formulário:", error); if (areaResponsavelPlanoSelect) areaResponsavelPlanoSelect.innerHTML = '<option value="">Erro ao carregar</option>';}
    }
    
    function renderizarEtapaNoFormulario(etapaParaRenderizar = null, novaPosicaoAutomatica = true) {
        contadorIdInternoEtapa++;
        const msgSemEtapas = etapasContainer.querySelector('.sem-etapas-mensagem');
        if (msgSemEtapas) msgSemEtapas.style.display = 'none';

        const divEtapa = document.createElement('div');
        divEtapa.classList.add('etapa-item-form');
        divEtapa.dataset.idInternoEtapa = contadorIdInternoEtapa;
        if (etapaParaRenderizar && etapaParaRenderizar.idEtapa) {
            divEtapa.dataset.originalIdEtapa = etapaParaRenderizar.idEtapa;
        }

        let opcoesAreasEtapa = '<option value="">Selecione uma área...</option>';
        listaDeAreasDisponiveis.forEach(area => {
            opcoesAreasEtapa += `<option value="${area.id}" ${ (etapaParaRenderizar && etapaParaRenderizar.areaResponsavelEtapa === area.id) ? 'selected' : '' }>${area.nomeArea}</option>`;
        });
        
        const numEtapasAtuaisNoDOM = etapasContainer.querySelectorAll('.etapa-item-form').length;
        const valorPosicaoCorreto = etapaParaRenderizar && typeof etapaParaRenderizar.ordem !== 'undefined' ? 
                                    etapaParaRenderizar.ordem : 
                                    (novaPosicaoAutomatica ? numEtapasAtuaisNoDOM + 1 : numEtapasAtuaisNoDOM + 1);

        divEtapa.innerHTML = `
            <fieldset>
                <legend class="etapa-legenda">Etapa ${valorPosicaoCorreto}</legend> 
                <input type="hidden" name="idEtapaOriginal" value="${etapaParaRenderizar?.idEtapa || ''}">
                <div class="form-grupo">
                    <label for="nomeEtapa-${contadorIdInternoEtapa}">Título da Etapa <span class="obrigatorio">*</span></label>
                    <input type="text" id="nomeEtapa-${contadorIdInternoEtapa}" name="nomeEtapa" required value="${etapaParaRenderizar?.nomeEtapa || ''}" placeholder="Ex: Isolar sistema afetado">
                </div>
                <div class="form-grupo">
                    <label for="ordemEtapa-${contadorIdInternoEtapa}">Posição <span class="obrigatorio">*</span></label>
                    <input type="number" class="input-ordem-etapa" id="ordemEtapa-${contadorIdInternoEtapa}" name="ordemEtapa" value="${valorPosicaoCorreto}" required min="1">
                </div>
                <div class="form-grupo">
                    <label for="areaResponsavelEtapa-${contadorIdInternoEtapa}">Área Responsável (Etapa) <span class="obrigatorio">*</span></label>
                    <select id="areaResponsavelEtapa-${contadorIdInternoEtapa}" name="areaResponsavelEtapa" required>
                        ${opcoesAreasEtapa}
                    </select>
                </div>
                <div class="form-grupo">
                    <label for="descricaoEtapaDetalhada-${contadorIdInternoEtapa}">Ação a ser Realizada <span class="obrigatorio">*</span></label>
                    <textarea id="descricaoEtapaDetalhada-${contadorIdInternoEtapa}" name="descricaoEtapaDetalhada" rows="3" required placeholder="Descreva a ação...">${etapaParaRenderizar?.descricaoEtapaDetalhada || ''}</textarea>
                </div>
                <div class="form-grupo">
                    <label for="tempoRecomendadoSegundos-${contadorIdInternoEtapa}">Duração Recomendada (segundos)</label>
                    <input type="number" id="tempoRecomendadoSegundos-${contadorIdInternoEtapa}" name="tempoRecomendadoSegundos" value="${etapaParaRenderizar?.tempoRecomendadoSegundos || ''}" placeholder="Ex: 3600" min="0">
                </div>
                <div class="form-grupo">
                    <label>Áreas Impactadas (Etapa)</label>
                    <div id="containerAreasImpactadasEtapa-${contadorIdInternoEtapa}" class="multi-selecao-container-etapa"></div>
                </div>
                <div class="form-grupo">
                    <label>Ativos Impactados (Etapa)</label>
                    <div id="containerAtivosImpactadosEtapa-${contadorIdInternoEtapa}" class="multi-selecao-container-etapa"></div>
                </div>
                <button type="button" class="btn-remover-etapa" data-remover-etapa-id="${contadorIdInternoEtapa}">Remover Esta Etapa</button>
            </fieldset>
        `;
        if (!etapasContainer) { console.error("FORM: etapasContainer não encontrado ao tentar adicionar etapa."); return; } 
        etapasContainer.appendChild(divEtapa);
        
        const areasEtapaSelecionadas = etapaParaRenderizar?.areasImpactadasEtapa || [];
        criarComponenteMultiSelect( 
            divEtapa.querySelector(`#containerAreasImpactadasEtapa-${contadorIdInternoEtapa}`), 
            "Selecione áreas da etapa...", listaDeAreasDisponiveis,
            `etapa-${contadorIdInternoEtapa}-area-impactada`, `areasImpactadasEtapa-${contadorIdInternoEtapa}`, 
            'itemName', areasEtapaSelecionadas 
        );

        const ativosEtapaSelecionados = etapaParaRenderizar?.ativosImpactadosEtapa || [];
        criarComponenteMultiSelect(
            divEtapa.querySelector(`#containerAtivosImpactadosEtapa-${contadorIdInternoEtapa}`), 
            "Selecione ativos da etapa...", listaDeAtivosDisponiveis,
            `etapa-${contadorIdInternoEtapa}-ativo-impactado`, `ativosImpactadosEtapa-${contadorIdInternoEtapa}`, 
            'itemName', ativosEtapaSelecionados
        );
        
        if (etapaParaRenderizar && etapaParaRenderizar.areaResponsavelEtapa) {
            const selectAreaEtapa = divEtapa.querySelector(`#areaResponsavelEtapa-${contadorIdInternoEtapa}`);
            if (selectAreaEtapa) selectAreaEtapa.value = etapaParaRenderizar.areaResponsavelEtapa;
        }
    }

    function reajustarIndicesEtapas() {
        const etapasForms = etapasContainer.querySelectorAll('.etapa-item-form');
        etapasForms.forEach((etapaForm, index) => {
            const novaPosicao = index + 1; const legenda = etapaForm.querySelector('.etapa-legenda'); if (legenda) legenda.textContent = `Etapa ${novaPosicao}`;
            const inputOrdem = etapaForm.querySelector('input[name="ordemEtapa"]'); if (inputOrdem) inputOrdem.value = novaPosicao;
        });
        if (etapasForms.length === 0) { const msgSemEtapas = etapasContainer.querySelector('.sem-etapas-mensagem'); if (!msgSemEtapas && msgSemEtapasOriginalHTML) { etapasContainer.innerHTML = msgSemEtapasOriginalHTML; } else if (msgSemEtapas) { msgSemEtapas.style.display = 'block'; } }
    }

    if (btnAdicionarEtapa) {
        btnAdicionarEtapa.addEventListener('click', () => renderizarEtapaNoFormulario(null, true));
    }

    if (etapasContainer) {
        etapasContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remover-etapa')) {
                const etapaFieldset = e.target.closest('.etapa-item-form');
                if (etapaFieldset) { etapaFieldset.remove(); reajustarIndicesEtapas(); }
            }
        });
    }
    
    async function preencherFormularioParaEdicao(idPlano) {
        const respostaPlano = await ApiService.buscarPlanoAcaoPorId(idPlano, obterToken());
        if (respostaPlano.ok && respostaPlano.data) {
            const plano = respostaPlano.data; console.log("FORM: Dados do plano para edição (bruto):", JSON.parse(JSON.stringify(plano)));
            if (nomePlanoInput && plano.nomePlano) nomePlanoInput.value = plano.nomePlano;
            if (descricaoIncidenteTextarea && plano.descricaoIncidente) descricaoIncidenteTextarea.value = plano.descricaoIncidente;
            if (nivelUrgenciaSelect && plano.nivelUrgencia) nivelUrgenciaSelect.value = plano.nivelUrgencia;
            if (nivelImpactoSelect && plano.nivelImpacto) nivelImpactoSelect.value = plano.nivelImpacto;
            await carregarDadosParaFormulario(plano); 
            if (etapasContainer && plano.etapas && plano.etapas.length > 0) {
                etapasContainer.innerHTML = ''; 
                plano.etapas.sort((a,b) => (a.ordem || 0) - (b.ordem || 0)).forEach(etapa => { renderizarEtapaNoFormulario(etapa, false); });
                reajustarIndicesEtapas(); 
            } else if (etapasContainer) { etapasContainer.innerHTML = msgSemEtapasOriginalHTML; }
        } else { console.error(`FORM: Erro ao buscar plano ${idPlano} para edição:`, respostaPlano.data?.mensagem); alert(`Não foi possível carregar dados: ${respostaPlano.data?.mensagem || 'Plano não encontrado.'}`); if (tituloPaginaEl) tituloPaginaEl.innerHTML = `<i class="fa-solid fa-file-signature"></i> Erro ao Carregar Plano`; }
    }

    if (formPlanoAcao) {
        formPlanoAcao.addEventListener('submit', async (evento) => {
            evento.preventDefault();
            limparTodosFeedbacksErro();
            let formValido = true;

            const dadosPlano = {
                nomePlano: nomePlanoInput.value.trim(),
                areaResponsavelPlano: areaResponsavelPlanoSelect.value,
                descricaoIncidente: descricaoIncidenteTextarea.value.trim(),
                nivelUrgencia: nivelUrgenciaSelect.value,
                nivelImpacto: nivelImpactoSelect.value,
                areasImpactadas: Array.from(formPlanoAcao.querySelectorAll('input[name="areasImpactadasPlano"]:checked')).map(cb => cb.value),
                ativosImpactados: Array.from(formPlanoAcao.querySelectorAll('input[name="ativosImpactadosPlano"]:checked')).map(cb => cb.value),
                etapas: []
            };
            if (modoEdicao && idPlanoParaEditar) {
                dadosPlano.idPlano = idPlanoParaEditar;
            }

            if (!dadosPlano.nomePlano) { exibirFeedbackErro(nomePlanoInput, "Título do plano é obrigatório."); formValido = false; }
            if (!dadosPlano.areaResponsavelPlano) { exibirFeedbackErro(areaResponsavelPlanoSelect, "Área responsável é obrigatória."); formValido = false; }
            if (!dadosPlano.descricaoIncidente) { exibirFeedbackErro(descricaoIncidenteTextarea, "Descrição do incidente é obrigatória."); formValido = false; }
            if (!dadosPlano.nivelUrgencia) { exibirFeedbackErro(nivelUrgenciaSelect, "Nível de urgência é obrigatório."); formValido = false; }
            if (!dadosPlano.nivelImpacto) { exibirFeedbackErro(nivelImpactoSelect, "Nível de impacto é obrigatório."); formValido = false; }
            
            const triggerAreasPlano = containerAreasImpactadasEl.querySelector('.multiselect-trigger');
            if (dadosPlano.areasImpactadas.length === 0) {
                if(triggerAreasPlano) exibirFeedbackErro(triggerAreasPlano, "Selecione ao menos uma Área Impactada.", true); 
                else alert("Selecione ao menos uma Área Impactada para o plano.");
                formValido = false;
            }

            const triggerAtivosPlano = containerAtivosImpactadosEl.querySelector('.multiselect-trigger');
            if (dadosPlano.ativosImpactados.length === 0) {
                if(triggerAtivosPlano) exibirFeedbackErro(triggerAtivosPlano, "Selecione ao menos um Ativo Impactado.", true);
                else alert("Selecione ao menos um Ativo Impactado para o plano."); 
                formValido = false;
            }

            const fieldsetsEtapas = etapasContainer.querySelectorAll('.etapa-item-form');
            if (fieldsetsEtapas.length === 0) { 
                exibirFeedbackErro(btnAdicionarEtapa, "É obrigatório adicionar ao menos uma etapa ao plano de ação.", true);
                if (etapasContainer) etapasContainer.classList.add('input-erro');
                formValido = false;
            } else {
                if (etapasContainer) etapasContainer.classList.remove('input-erro');
                limparFeedbackErro(btnAdicionarEtapa); 
            }
            
            const nomesEtapasUnicos = new Set();
            const posicoesEtapasUnicas = new Set();

            fieldsetsEtapas.forEach((fieldsetEtapa) => {
                const idInterno = fieldsetEtapa.dataset.idInternoEtapa;
                const idOriginalEtapa = fieldsetEtapa.querySelector('input[name="idEtapaOriginal"]')?.value || null;
                const nomeEtapaEl = fieldsetEtapa.querySelector(`input[name="nomeEtapa"]`);
                const ordemEtapaEl = fieldsetEtapa.querySelector(`input[name="ordemEtapa"]`);
                const areaRespEtapaEl = fieldsetEtapa.querySelector(`select[name="areaResponsavelEtapa"]`);
                const descEtapaEl = fieldsetEtapa.querySelector(`textarea[name="descricaoEtapaDetalhada"]`);
                const tempoRecEtapaEl = fieldsetEtapa.querySelector(`input[name="tempoRecomendadoSegundos"]`);

                const etapa = {
                    idEtapa: modoEdicao && idOriginalEtapa ? idOriginalEtapa : undefined, 
                    nomeEtapa: nomeEtapaEl.value.trim(),
                    ordem: parseInt(ordemEtapaEl.value, 10),
                    areaResponsavelEtapa: areaRespEtapaEl.value,
                    descricaoEtapaDetalhada: descEtapaEl.value.trim(),
                    tempoRecomendadoSegundos: parseInt(tempoRecEtapaEl.value, 10) || null,
                    areasImpactadasEtapa: Array.from(fieldsetEtapa.querySelectorAll(`input[name="areasImpactadasEtapa-${idInterno}"]:checked`)).map(cb => cb.value),
                    ativosImpactadosEtapa: Array.from(fieldsetEtapa.querySelectorAll(`input[name="ativosImpactadosEtapa-${idInterno}"]:checked`)).map(cb => cb.value),
                    status: etapaParaRenderizar?.status || 'NAO_INICIADO' // Mantém status original se editando, senão NAO_INICIADO
                };
                // Correção: 'etapaParaRenderizar' não está no escopo aqui. Para etapas existentes, o status não deveria ser resetado para NAO_INICIADO.
                // O backend geralmente lida com o status. Para mocks, se uma etapa existente é editada, seu status não deve ser alterado aqui
                // a menos que seja uma edição de status. Para novas etapas, NAO_INICIADO é correto.
                // Vamos simplificar: se idEtapa existe (edição de etapa), não definimos o status aqui, o backend manteria.
                // Se idEtapa não existe (nova etapa), então NAO_INICIADO.
                if (!etapa.idEtapa) {
                    etapa.status = 'NAO_INICIADO';
                }


                if (!etapa.nomeEtapa) { exibirFeedbackErro(nomeEtapaEl, "Título da etapa é obrigatório."); formValido = false; }
                if (isNaN(etapa.ordem) || etapa.ordem < 1) { exibirFeedbackErro(ordemEtapaEl, "Posição inválida."); formValido = false; }
                if (!etapa.areaResponsavelEtapa) { exibirFeedbackErro(areaRespEtapaEl, "Área da etapa é obrigatória."); formValido = false; }
                if (!etapa.descricaoEtapaDetalhada) { exibirFeedbackErro(descEtapaEl, "Ação da etapa é obrigatória."); formValido = false; }

                if (etapa.nomeEtapa && nomesEtapasUnicos.has(etapa.nomeEtapa.toLowerCase())) {
                    exibirFeedbackErro(nomeEtapaEl, "Título da etapa duplicado."); formValido = false;
                } else if (etapa.nomeEtapa) { nomesEtapasUnicos.add(etapa.nomeEtapa.toLowerCase()); }

                if (!isNaN(etapa.ordem) && posicoesEtapasUnicas.has(etapa.ordem)) {
                    exibirFeedbackErro(ordemEtapaEl, "Posição da etapa duplicada."); formValido = false;
                } else if (!isNaN(etapa.ordem)) { posicoesEtapasUnicas.add(etapa.ordem); }
                
                if (formValido) dadosPlano.etapas.push(etapa);
            });

            if (!formValido) {
                alert("Existem erros no formulário. Por favor, verifique os campos destacados e as mensagens.");
                const primeiroErro = formPlanoAcao.querySelector('.input-erro, .mensagem-erro-campo');
                if(primeiroErro) primeiroErro.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            
            dadosPlano.etapas.sort((a,b) => a.ordem - b.ordem);
            console.log("Dados Finais do Plano a serem enviados (mock):", dadosPlano);

            try {
                let respostaApi;
                if (modoEdicao) {
                    respostaApi = await ApiService.atualizarPlanoAcaoGerenciador(idPlanoParaEditar, dadosPlano, obterToken());
                } else {
                    respostaApi = await ApiService.criarPlanoAcaoGerenciador(dadosPlano, obterToken());
                }

                if (respostaApi.ok) {
                    alert(respostaApi.data.mensagem || `Plano de ação ${modoEdicao ? 'atualizado' : 'salvo'} com sucesso!`);
                    window.location.href = 'visualizar_planos_gerenciador.html'; 
                } else {
                    alert(`Erro ao ${modoEdicao ? 'atualizar' : 'salvar'} plano: ${respostaApi.data?.mensagem || 'Erro desconhecido.'}`);
                }
            } catch(error) {
                console.error(`Erro ao chamar API para ${modoEdicao ? 'atualizar' : 'criar'} plano:`, error);
                alert(`Ocorreu um erro ao tentar ${modoEdicao ? 'atualizar' : 'salvar'} o plano.`);
            }
        });
    }

    if (btnCancelarPlano) {
        btnCancelarPlano.addEventListener('click', async () => {
            if (confirm("Tem certeza que deseja cancelar? Todas as informações não salvas serão perdidas.")) {
                if (modoEdicao) {
                    window.location.href = 'visualizar_planos_gerenciador.html'; 
                } else {
                    formPlanoAcao.reset(); 
                    etapasContainer.innerHTML = msgSemEtapasOriginalHTML; 
                    const msgSemEtapas = etapasContainer.querySelector('.sem-etapas-mensagem'); 
                    if (msgSemEtapas) msgSemEtapas.style.display = 'block';
                    contadorIdInternoEtapa = 0;
                    await carregarDadosParaFormulario(); 
                }
            }
        });
    }

    async function inicializarFormulario() {
        const urlParams = new URLSearchParams(window.location.search); idPlanoParaEditar = urlParams.get('id'); modoEdicao = !!idPlanoParaEditar;
        if (modoEdicao) {
            if (tituloPaginaEl) tituloPaginaEl.innerHTML = `<i class="fa-solid fa-edit"></i> Editar Plano de Ação`;
            if (btnSubmitForm) btnSubmitForm.textContent = 'Atualizar Plano de Ação';
            await preencherFormularioParaEdicao(idPlanoParaEditar);
        } else {
            if (tituloPaginaEl) tituloPaginaEl.innerHTML = `<i class="fa-solid fa-file-signature"></i> Criar Novo Plano de Ação`;
            if (btnSubmitForm) btnSubmitForm.textContent = 'Salvar Plano de Ação';
            await carregarDadosParaFormulario();
            if (etapasContainer) etapasContainer.innerHTML = msgSemEtapasOriginalHTML;
        }
        console.log(`Página Formulário Plano de Ação (Gerenciador) configurada. Modo Edição: ${modoEdicao}`);
    }

    inicializarFormulario();
});