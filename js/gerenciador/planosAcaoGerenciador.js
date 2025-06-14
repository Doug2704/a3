import { inicializarPaginaBaseGerenciador } from './gerenciadorPageSetup.js';
import * as ApiService from '../apiService.js';
import { obterToken } from '../authService.js';

document.addEventListener('DOMContentLoaded', async () => {
    const setupOk = await inicializarPaginaBaseGerenciador();
    if (!setupOk) {
        console.error("Falha no setup base da página do gerenciador. Funcionalidades podem estar indisponíveis.");
        const mainContent = document.getElementById('conteudoPrincipalGerenciador');
        if (mainContent) mainContent.innerHTML = "<p style='color:red; text-align:center; padding-top:50px;'>Erro ao carregar a página. Tente novamente mais tarde.</p>";
        return;
    }

    const viewListaPlanosEl = document.getElementById('viewListaPlanos');
    const viewDetalhesPlanoEl = document.getElementById('viewDetalhesPlano');
    const filtroNomePlanoEl = document.getElementById('filtroNomePlanoGerenciador');
    const containerListaPlanosEl = document.getElementById('containerListaPlanos');
    const btnVoltarParaListaEl = document.getElementById('btnVoltarParaLista');

    const detalhePlanoTituloEl = document.getElementById('detalhePlanoTitulo');
    const detalhePlanoIdEl = document.getElementById('detalhePlanoId');
    const detalhePlanoStatusGeralEl = document.getElementById('detalhePlanoStatusGeral');
    const detalhePlanoDescricaoIncidenteEl = document.getElementById('detalhePlanoDescricaoIncidente');
    const detalhePlanoAreaResponsavelEl = document.getElementById('detalhePlanoAreaResponsavel');
    const detalhePlanoNivelUrgenciaEl = document.getElementById('detalhePlanoNivelUrgencia');
    const detalhePlanoNivelImpactoEl = document.getElementById('detalhePlanoNivelImpacto');
    const detalhePlanoAreasImpactadasEl = document.getElementById('detalhePlanoAreasImpactadas');
    const detalhePlanoAtivosImpactadosEl = document.getElementById('detalhePlanoAtivosImpactados');
    const listaEtapasDoPlanoEl = document.getElementById('listaEtapasDoPlano');
    
    let todosOsPlanos = [];
    let timersGerenciador = {}; 

    function formatarDataUserFriendly(timestampISO) {
        if (!timestampISO) return 'Não definida';
        try { const data = new Date(timestampISO); return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
        catch (e) { return timestampISO; }
    }

    function formatarTempoSegundos(totalSegundos) {
        if (isNaN(totalSegundos) || totalSegundos === null || totalSegundos < 0) return 'Não definido';
        const horas = Math.floor(totalSegundos / 3600);
        const minutos = Math.floor((totalSegundos % 3600) / 60);
        const segundos = totalSegundos % 60;
        return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
    }

    function formatarListaOuNaoDisponivel(lista, tipoSingular = 'item', tipoPlural = '') {
        if (!tipoPlural) tipoPlural = tipoSingular + (tipoSingular.endsWith('l') || tipoSingular.endsWith('r') || tipoSingular.endsWith('z') ? 'es' : 's');
        if (Array.isArray(lista) && lista.length > 0) { return lista.join(', '); }
        return `Nenhum(a) ${tipoSingular}/${tipoPlural} informado(a).`;
    }
    
    function normalizarStringParaClasse(str) {
        if (!str) return 'desconhecido';
        return str.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }

    function formatarStatus(status) { 
        if (!status) return 'Indefinido';
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    function pararCronometroGerenciador(idEtapa) {
        if (timersGerenciador[idEtapa]) {
            clearInterval(timersGerenciador[idEtapa]);
            delete timersGerenciador[idEtapa];
        }
    }

    function pararTodosCronometrosGerenciador() {
        Object.keys(timersGerenciador).forEach(pararCronometroGerenciador);
    }

    function iniciarCronometroGerenciador(etapa) {
        const idEtapa = etapa.idEtapa;
        pararCronometroGerenciador(idEtapa); 

        const cronometroEl = document.getElementById(`cronometro-gerenciador-${idEtapa}`);
        const tsInicio = Number(etapa.tempoIniciadoTimestamp);
        const agora = Date.now();

        if (!cronometroEl || etapa.status !== "EM_ANDAMENTO" || isNaN(tsInicio) || tsInicio <= 0 || tsInicio > agora + 60000) {
            if (cronometroEl) {
                cronometroEl.textContent = (etapa.status === "EM_ANDAMENTO") ? "T. Inválido" : formatarTempoSegundos(etapa.tempoDecorridoSegundos || 0);
                cronometroEl.classList.remove('tempo-excedido-admin-gerenciador');
            }
            const avisoEl = document.getElementById(`aviso-tempo-gerenciador-${idEtapa}`);
            if (avisoEl) avisoEl.style.display = 'none';
            return;
        }
        
        const tempoRecomendado = etapa.tempoRecomendadoSegundos || 0;

        function atualizar() {
            const momentoAtual = Date.now();
            const decorridoMs = momentoAtual - tsInicio;
            let decorridoSegundos = Math.floor(decorridoMs / 1000);
            if (decorridoSegundos < 0) decorridoSegundos = 0;
            
            if (cronometroEl) cronometroEl.textContent = formatarTempoSegundos(decorridoSegundos);
            const avisoEl = document.getElementById(`aviso-tempo-gerenciador-${idEtapa}`);
            if (avisoEl) {
                const excedido = tempoRecomendado > 0 && decorridoSegundos > tempoRecomendado;
                cronometroEl.classList.toggle('tempo-excedido-admin-gerenciador', excedido);
                avisoEl.style.display = excedido ? 'inline' : 'none';
            }
        }
        timersGerenciador[idEtapa] = setInterval(atualizar, 1000);
        atualizar(); 
    }

    function renderizarListaPlanos(planos) {
        if (!containerListaPlanosEl) { return; }
        containerListaPlanosEl.innerHTML = ''; 
        pararTodosCronometrosGerenciador(); 
        
        if (!planos || planos.length === 0) {
            const mensagem = filtroNomePlanoEl.value ? 'Nenhum plano encontrado com este filtro.' : 'Nenhum plano de ação cadastrado.';
            containerListaPlanosEl.innerHTML = `<p class="nenhum-plano-encontrado">${mensagem}</p>`;
            return;
        }

        planos.forEach(plano => {
            const idDoPlano = plano.idPlano || plano.id; 
            const nomeDoPlano = plano.nomePlano || plano.titulo || 'Plano Sem Título';
            const statusGeral = plano.statusGeralPlano || plano.statusPlano || 'N/A';
            const areasImpactadasFormatado = formatarListaOuNaoDisponivel(plano.areasImpactadas, 'área', 'áreas');
            const ativosImpactadosFormatado = formatarListaOuNaoDisponivel(plano.ativosImpactados, 'ativo', 'ativos');

            const cardPlano = document.createElement('div');
            cardPlano.className = 'plano-item-card-gerenciador';
            cardPlano.innerHTML = `
                <h3>${nomeDoPlano}</h3>
                <p><strong>ID:</strong> ${idDoPlano}</p>
                <p><strong>Status Geral:</strong> <span class="status-tag status-plano-${normalizarStringParaClasse(statusGeral)}">${formatarStatus(statusGeral)}</span></p>
                <p><strong>Áreas Impactadas:</strong> <span class="info-card-lista ${(!plano.areasImpactadas || plano.areasImpactadas.length === 0) ? 'nenhum' : ''}">${areasImpactadasFormatado}</span></p>
                <p><strong>Ativos Impactados:</strong> <span class="info-card-lista ${(!plano.ativosImpactados || plano.ativosImpactados.length === 0) ? 'nenhum' : ''}">${ativosImpactadosFormatado}</span></p>
                <div class="plano-card-acoes">
                    <button class="btn-ver-detalhes-plano" data-id-plano="${idDoPlano}">Ver Detalhes</button>
                    <a href="formulario_plano_acao.html?id=${idDoPlano}" class="btn-editar-plano-lista" title="Editar Plano de Ação">Editar Plano</a>
                </div>
            `;
            cardPlano.querySelector('.btn-ver-detalhes-plano').addEventListener('click', () => mostrarDetalhesPlano(idDoPlano));
            containerListaPlanosEl.appendChild(cardPlano);
        });
    }
    
    function renderizarEtapasDoPlano(etapas) {
        if (!listaEtapasDoPlanoEl) return;
        listaEtapasDoPlanoEl.innerHTML = ''; 
        pararTodosCronometrosGerenciador(); 
        
        if (!etapas || etapas.length === 0) {
            listaEtapasDoPlanoEl.innerHTML = '<p class="nenhuma-etapa-encontrada">Nenhuma etapa cadastrada para este plano.</p>';
            return;
        }

        const etapasOrdenadas = etapas.sort((a, b) => (a.ordem || a.posicaoEtapa || 0) - (b.ordem || b.posicaoEtapa || 0));
        
        etapasOrdenadas.forEach(etapa => {
            const nomeDaEtapa = etapa.nomeEtapa || etapa.tituloEtapa || 'Etapa Sem Título';
            const statusDaEtapa = etapa.status || etapa.statusEtapa || 'N/A';
            const ordemDaEtapa = etapa.ordem || etapa.posicaoEtapa || '?';
            const descricaoDaEtapa = etapa.descricaoEtapaDetalhada || etapa.acaoRealizar || 'Não definida';
            const tempoRecomendadoFmt = formatarTempoSegundos(etapa.tempoRecomendadoSegundos);
            const areasImpactadasEtapaFmt = formatarListaOuNaoDisponivel(etapa.areasImpactadasEtapa, 'área', 'áreas');
            const ativosImpactadosEtapaFmt = formatarListaOuNaoDisponivel(etapa.ativosImpactadosEtapa, 'ativo', 'ativos');

            const itemEtapa = document.createElement('div');
            itemEtapa.className = 'etapa-item-detalhe-gerenciador';
            itemEtapa.innerHTML = `
                <div class="etapa-titulo-posicao-gerenciador">
                    <span class="etapa-posicao-gerenciador">#${ordemDaEtapa}</span>
                    <h4 class="etapa-titulo-gerenciador">${nomeDaEtapa}</h4>
                </div>
                <p class="etapa-descricao-gerenciador"><strong>Ação:</strong> ${descricaoDaEtapa}</p>
                <div class="etapa-info-adicional-gerenciador">
                    <span><strong>Status:</strong> <span class="status-tag status-etapa-${normalizarStringParaClasse(statusDaEtapa)}">${formatarStatus(statusDaEtapa)}</span></span>
                    ${etapa.areaResponsavelEtapa ? `<span><strong>Área Resp. (Etapa):</strong> ${etapa.areaResponsavelEtapa}</span>` : ''}
                    <span><strong>Tempo Rec.:</strong> ${tempoRecomendadoFmt}</span>
                    <span style="width:100%;"><strong>Áreas Impactadas (Etapa):</strong> <span class="lista-impacto-etapa-gerenciador ${(!etapa.areasImpactadasEtapa || etapa.areasImpactadasEtapa.length === 0) ? 'nenhum' : ''}">${areasImpactadasEtapaFmt}</span></span>
                    <span style="width:100%;"><strong>Ativos Impactados (Etapa):</strong> <span class="lista-impacto-etapa-gerenciador ${(!etapa.ativosImpactadosEtapa || etapa.ativosImpactadosEtapa.length === 0) ? 'nenhum' : ''}">${ativosImpactadosEtapaFmt}</span></span>
                </div>
            `;
            
            if (statusDaEtapa === 'EM_ANDAMENTO' && etapa.tempoIniciadoTimestamp) {
                const divMonitoramento = document.createElement('div');
                divMonitoramento.className = 'etapa-monitoramento-admin';
                divMonitoramento.innerHTML = `
                    <strong>Tempo Decorrido:</strong> 
                    <span class="cronometro-admin-gerenciador" id="cronometro-gerenciador-${etapa.idEtapa}">00:00:00</span>
                    <span class="aviso-tempo-admin-gerenciador" id="aviso-tempo-gerenciador-${etapa.idEtapa}" style="display:none;">Tempo recomendado excedido!</span>
                `;
                itemEtapa.appendChild(divMonitoramento);
                iniciarCronometroGerenciador(etapa);
            }
            listaEtapasDoPlanoEl.appendChild(itemEtapa);
        });
    }

    async function mostrarDetalhesPlano(idPlano) { 
        pararTodosCronometrosGerenciador(); 
        const plano = todosOsPlanos.find(p => (p.idPlano || p.id) === idPlano);
        if (!plano) {
            alert("Erro: Plano não encontrado.");
            return;
        }

        detalhePlanoTituloEl.textContent = plano.nomePlano || plano.titulo || 'Plano Sem Título';
        detalhePlanoIdEl.textContent = plano.idPlano || plano.id;
        const statusGeral = plano.statusGeralPlano || plano.statusPlano || 'N/A';
        detalhePlanoStatusGeralEl.textContent = formatarStatus(statusGeral);
        detalhePlanoStatusGeralEl.className = `status-tag status-plano-${normalizarStringParaClasse(statusGeral)}`;
        detalhePlanoDescricaoIncidenteEl.textContent = plano.descricaoIncidente || 'Não informada.';
        detalhePlanoAreaResponsavelEl.textContent = plano.areaResponsavelPlano || 'Não informada.';
        detalhePlanoNivelUrgenciaEl.textContent = plano.nivelUrgencia ? formatarStatus(plano.nivelUrgencia) : 'N/A';
        detalhePlanoNivelUrgenciaEl.className = `nivel-tag nivel-${normalizarStringParaClasse(plano.nivelUrgencia || 'desconhecido')}`;
        detalhePlanoNivelImpactoEl.textContent = plano.nivelImpacto ? formatarStatus(plano.nivelImpacto) : 'N/A';
        detalhePlanoNivelImpactoEl.className = `nivel-tag nivel-${normalizarStringParaClasse(plano.nivelImpacto || 'desconhecido')}`;
        const areasFormatado = formatarListaOuNaoDisponivel(plano.areasImpactadas, 'área', 'áreas');
        detalhePlanoAreasImpactadasEl.textContent = areasFormatado;
        detalhePlanoAreasImpactadasEl.classList.toggle('nenhum', !plano.areasImpactadas || plano.areasImpactadas.length === 0);
        const ativosFormatado = formatarListaOuNaoDisponivel(plano.ativosImpactados, 'ativo', 'ativos');
        detalhePlanoAtivosImpactadosEl.textContent = ativosFormatado;
        detalhePlanoAtivosImpactadosEl.classList.toggle('nenhum', !plano.ativosImpactados || plano.ativosImpactados.length === 0);

        renderizarEtapasDoPlano(plano.etapas || []);
        viewListaPlanosEl.style.display = 'none';
        viewDetalhesPlanoEl.style.display = 'block';
        window.scrollTo(0,0); 
    }

    function filtrarPlanos() {
        const termoFiltro = filtroNomePlanoEl.value.toLowerCase().trim();
        const planosFiltrados = todosOsPlanos.filter(plano => 
            (plano.nomePlano || plano.titulo || '').toLowerCase().includes(termoFiltro)
        );
        renderizarListaPlanos(planosFiltrados);
    }
    
    async function carregarEExibirPlanos() {
        containerListaPlanosEl.innerHTML = '<p class="carregando-dados-planos">Carregando planos de ação...</p>';
        viewDetalhesPlanoEl.style.display = 'none'; 
        viewListaPlanosEl.style.display = 'block'; 
        
        const resposta = await ApiService.buscarPlanosAcaoTodos(obterToken()); 
        
        if (resposta.ok && Array.isArray(resposta.data)) {
            todosOsPlanos = resposta.data.map(plano => ({ 
                ...plano,
                areasImpactadas: plano.areasImpactadas || [],
                ativosImpactados: plano.ativosImpactados || [],
                etapas: (plano.etapas || []).map(etapa => ({
                    ...etapa,
                    areasImpactadasEtapa: etapa.areasImpactadasEtapa || [],
                    ativosImpactadosEtapa: etapa.ativosImpactadosEtapa || []
                }))
            }));
            renderizarListaPlanos(todosOsPlanos);
        } else {
            console.error("Falha ao carregar planos de ação para Gerenciador:", resposta?.data?.mensagem);
            containerListaPlanosEl.innerHTML = '<p class="nenhum-plano-encontrado">Não foi possível carregar os planos de ação.</p>';
        }
    }

    btnVoltarParaListaEl.addEventListener('click', () => {
        pararTodosCronometrosGerenciador();
        viewDetalhesPlanoEl.style.display = 'none';
        viewListaPlanosEl.style.display = 'block';
        filtrarPlanos(); 
    });

    filtroNomePlanoEl.addEventListener('input', filtrarPlanos);

    carregarEExibirPlanos();
});