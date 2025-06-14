// js/operador/operador.js
import { NOME_DO_SOFTWARE } from '../config.js';
import * as AuthService from '../authService.js';
import * as ApiService from '../apiService.js';
import * as ThemeManager from '../themeManager.js';

document.addEventListener('DOMContentLoaded', () => {
    // Referências do DOM
    const softwareNameEl = document.getElementById('softwareName');
    const greetingEl = document.getElementById('greeting');
    const searchIconBtn = document.getElementById('searchIconBtn');
    const filterInputContainer = document.getElementById('filterInputContainer');
    const filterPlanosInputEl = document.getElementById('filterPlanosInput');
    const clearFilterBtn = document.getElementById('clearFilterBtn');
    const planosListEl = document.getElementById('planosList');
    
    const modalDetalhesPlano = document.getElementById('modalDetalhesPlano');
    const modalPlanoTituloEl = document.getElementById('modalPlanoTitulo');
    const modalPlanoDescricaoEl = document.getElementById('modalPlanoDescricao');
    // const modalPlanoAreaEl = document.getElementById('modalPlanoArea'); // REMOVIDO
    // const modalPlanoAtivoEl = document.getElementById('modalPlanoAtivo'); // REMOVIDO
    const modalPlanoAreasImpactadasEl = document.getElementById('modalPlanoAreasImpactadas'); 
    const modalPlanoAtivosImpactadosEl = document.getElementById('modalPlanoAtivosImpactados'); 
    const modalEtapasListEl = document.getElementById('modalEtapasList');
    
    let closeModalButton = null; 
    if (modalDetalhesPlano) {
        closeModalButton = modalDetalhesPlano.querySelector('.close-button');
        if (!closeModalButton) {
            console.warn("Atenção: O elemento do modal principal (modalDetalhesPlano) foi encontrado, mas o botão de fechar interno (.close-button) não foi encontrado dentro dele.");
        }
    } else {
        console.error("ERRO CRÍTICO: Elemento do modal principal com id 'modalDetalhesPlano' NÃO encontrado no DOM! O modal não funcionará corretamente.");
    }
    
    const themeToggleButton = document.getElementById('btn-alternar-tema');
    const logoutButton = document.getElementById('logoutBtn');

    let todosPlanosGlobais = [];
    let timers = {};

    // --- Funções Utilitárias ---
    function formatarTempo(totalSegundos) {
        if (isNaN(totalSegundos) || totalSegundos < 0) totalSegundos = 0;
        const horas = Math.floor(totalSegundos / 3600);
        const minutos = Math.floor((totalSegundos % 3600) / 60);
        const segundos = totalSegundos % 60;
        return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
    }

    function formatarStatus(status) {
        if (!status) return 'Indefinido';
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    function formatarListaOuNaoDisponivel(lista, tipoSingular = 'item', tipoPlural = '') {
        if (!tipoPlural) tipoPlural = tipoSingular + 's'; // Simples pluralização com 's'

        if (Array.isArray(lista) && lista.length > 0) {
            return lista.join(', ');
        }
        return `Nenhum(a) ${tipoSingular}/${tipoPlural} impactado(a).`;
    }

    // --- Configuração Inicial e Tema (como antes) ---
    // ... (código de configuração inicial e tema como antes) ...
    if (softwareNameEl) softwareNameEl.textContent = NOME_DO_SOFTWARE;
    ThemeManager.aplicarTemaInicial();
    function atualizarIconeBotaoTema() { 
        if (themeToggleButton) {
            const iconeTema = themeToggleButton.querySelector('i');
            if (ThemeManager.isDarkModeAtivo()) {
                iconeTema.className = 'fas fa-sun';
                iconeTema.style.color = '#ffd700'; // Amarelo para o sol
                themeToggleButton.title = 'Mudar para tema claro';
                themeToggleButton.setAttribute('aria-label', 'Mudar para tema claro');
            } else {
                iconeTema.className = 'fas fa-moon';
                iconeTema.style.color = ''; // Volta para a cor padrão
                themeToggleButton.title = 'Mudar para tema escuro';
                themeToggleButton.setAttribute('aria-label', 'Mudar para tema escuro');
            }
        }
    }
    atualizarIconeBotaoTema();
    if (themeToggleButton) themeToggleButton.addEventListener('click', () => { ThemeManager.alternarTema(); atualizarIconeBotaoTema(); });
    if (logoutButton) logoutButton.addEventListener('click', () => { AuthService.logoutUsuario(); });


    // --- Autenticação e Saudação (como antes) ---
    // ... (código de autenticação e saudação como antes) ...
    const usuarioLogado = AuthService.obterUsuarioInfo();
    if (greetingEl) { 
        if (usuarioLogado && usuarioLogado.perfil === 'operator' && usuarioLogado.nome) {
            greetingEl.textContent = `Olá, ${usuarioLogado.nome}!`;
        } else if (usuarioLogado && usuarioLogado.perfil === 'operator') {
            greetingEl.textContent = `Olá, Operador!`;
        } else {
            greetingEl.textContent = `Painel do Operador`;
        }
    }


    // --- Lógica da Interface de Filtro/Pesquisa (como antes) ---
    // ... (código do filtro como antes) ...
    if (searchIconBtn && filterInputContainer && filterPlanosInputEl) {
        searchIconBtn.addEventListener('click', () => {
            const isVisible = filterInputContainer.style.display === 'flex';
            if (isVisible) {
                filterInputContainer.style.display = 'none';
                searchIconBtn.classList.remove('active'); 
            } else {
                filterInputContainer.style.display = 'flex';
                searchIconBtn.classList.add('active'); 
                filterPlanosInputEl.focus();
            }
        });

        filterPlanosInputEl.addEventListener('input', () => {
            atualizarVistaPrincipalPlanos();
            if (clearFilterBtn) {
                clearFilterBtn.style.display = filterPlanosInputEl.value ? 'inline-block' : 'none';
            }
        });
        
        if (clearFilterBtn) {
            clearFilterBtn.addEventListener('click', () => {
                filterPlanosInputEl.value = '';
                atualizarVistaPrincipalPlanos(); 
                clearFilterBtn.style.display = 'none';
            });
        }
    }

    // --- Carregamento, Cálculo de Status Geral e Renderização dos Planos ---
    async function carregarPlanos() {
        // ... (lógica de carregarPlanos como antes, já inicializa areasImpactadas/ativosImpactados como []) ...
        try {
            const resultado = await ApiService.getPlanosDeAcaoOperador(AuthService.obterToken());
            if (resultado.ok && Array.isArray(resultado.data)) {
                todosPlanosGlobais = resultado.data.map(plano => {
                    const etapasProcessadas = (plano.etapas || []).map(etapa => ({
                        ...etapa,
                        tempoDecorridoSegundos: Number(etapa.tempoDecorridoSegundos) || 0,
                        tempoRecomendadoSegundos: Number(etapa.tempoRecomendadoSegundos) || 0,
                        status: etapa.status || 'NAO_INICIADO',
                        areasImpactadasEtapa: etapa.areasImpactadasEtapa || [], 
                        ativosImpactadosEtapa: etapa.ativosImpactadosEtapa || []  
                    }));
                    const statusGeralCalculado = calcularStatusGeralPlanoComBaseEmEtapas(etapasProcessadas);
                    return {
                        ...plano,
                        etapas: etapasProcessadas,
                        statusGeralPlano: statusGeralCalculado,
                        areasImpactadas: plano.areasImpactadas || [], 
                        ativosImpactados: plano.ativosImpactados || []  
                    };
                });
                atualizarVistaPrincipalPlanos();
            } else {
                throw new Error(resultado.data?.mensagem || 'Falha ao buscar planos de ação.');
            }
        } catch (error) {
            console.error('Erro ao carregar planos de ação:', error);
            if (planosListEl) {
                planosListEl.innerHTML = `<p class="empty-message">Erro ao carregar planos: ${error.message}. Tente novamente mais tarde.</p>`;
            }
        }
    }
    
    function calcularStatusGeralPlanoComBaseEmEtapas(etapas) {
        // ... (como antes) ...
        if (!etapas || etapas.length === 0) {
            return 'Indefinido';
        }
        const totalEtapas = etapas.length;
        const concluidas = etapas.filter(e => e.status === 'CONCLUIDO').length;
        const emAndamento = etapas.filter(e => e.status === 'EM_ANDAMENTO').length;
        const naoIniciadas = etapas.filter(e => e.status === 'NAO_INICIADO').length;

        if (concluidas === totalEtapas) {
            return 'Concluído';
        } else if (emAndamento > 0) {
            return 'Em Andamento';
        } else if (naoIniciadas === totalEtapas) {
            return 'Não Iniciado';
        } else if (concluidas > 0 || naoIniciadas > 0) { 
            return 'Em Andamento'; 
        }
        return 'Indefinido';
    }

    function calcularEAtualizarStatusGeralPlanoNoObjeto(idPlano) {
        // ... (como antes) ...
        const plano = todosPlanosGlobais.find(p => p.idPlano === idPlano);
        if (!plano) return;
        plano.statusGeralPlano = calcularStatusGeralPlanoComBaseEmEtapas(plano.etapas);
        atualizarVistaPrincipalPlanos();
    }
    
    function atualizarVistaPrincipalPlanos() {
        // ... (como antes) ...
        const termoFiltro = filterPlanosInputEl ? filterPlanosInputEl.value.toLowerCase().trim() : "";
        let planosParaRenderizar;
        if (termoFiltro) {
            planosParaRenderizar = todosPlanosGlobais.filter(p =>
                (p.nomePlano || '').toLowerCase().includes(termoFiltro)
            );
        } else {
            planosParaRenderizar = todosPlanosGlobais;
        }
        renderizarPlanos(planosParaRenderizar);
    }

    function renderizarPlanos(planosParaRenderizar) {
        if (!planosListEl) return;
        planosListEl.innerHTML = '';
        if (!planosParaRenderizar || planosParaRenderizar.length === 0) {
            const mensagem = filterPlanosInputEl && filterPlanosInputEl.value ? 'Nenhum plano corresponde ao filtro.' : 'Nenhum plano de ação encontrado.';
            planosListEl.innerHTML = `<p class="empty-message">${mensagem}</p>`;
            return;
        }

        planosParaRenderizar.forEach(plano => {
            const planoItem = document.createElement('div');
            planoItem.classList.add('plano-item');

            // Formata as listas de áreas e ativos para exibição no card
            const areasImpactadasCard = formatarListaOuNaoDisponivel(plano.areasImpactadas, 'área', 'áreas');
            const ativosImpactadosCard = formatarListaOuNaoDisponivel(plano.ativosImpactados, 'ativo', 'ativos');

            planoItem.innerHTML = `
                <h3>${plano.nomePlano || 'Plano sem nome'}</h3>
                <p><strong>Descrição:</strong> ${plano.descricaoPlano || 'N/A'}</p>
                <p><strong>Status Geral:</strong> ${plano.statusGeralPlano || 'Não especificado'}</p> 
                <p><strong>Áreas Impactadas:</strong> <span class="info-card-lista">${areasImpactadasCard}</span></p>
                <p><strong>Ativos Impactados:</strong> <span class="info-card-lista">${ativosImpactadosCard}</span></p>
                <button class="detalhes-btn" data-id-plano="${plano.idPlano}">Detalhes</button>
            `;
            planosListEl.appendChild(planoItem);
        });
    }

    // --- Modal de Detalhes ---
    if (planosListEl) {
        planosListEl.addEventListener('click', (e) => {
            if (e.target.classList.contains('detalhes-btn')) {
                const idPlano = e.target.dataset.idPlano;
                abrirModalDetalhes(idPlano);
            }
        });
    }

    if (closeModalButton) { 
        closeModalButton.addEventListener('click', fecharModal);
    }
    
    if (modalDetalhesPlano) {
        modalDetalhesPlano.addEventListener('click', (event) => {
            if (event.target === modalDetalhesPlano) {
                fecharModal();
            }
        });
    }
    
    function fecharModal() {
        if (modalDetalhesPlano) modalDetalhesPlano.style.display = 'none';
    }

    function abrirModalDetalhes(idPlano) {
        const plano = todosPlanosGlobais.find(p => p.idPlano === idPlano);
        if (!plano || !modalDetalhesPlano) return;

        if (modalPlanoTituloEl) modalPlanoTituloEl.textContent = plano.nomePlano || 'Detalhes do Plano';
        if (modalPlanoDescricaoEl) modalPlanoDescricaoEl.textContent = plano.descricaoPlano || 'N/A';
        // if (modalPlanoAreaEl) modalPlanoAreaEl.textContent = plano.areaRelacionada || 'N/A'; // REMOVIDO
        // if (modalPlanoAtivoEl) modalPlanoAtivoEl.textContent = plano.ativoRelacionado || 'N/A'; // REMOVIDO
        
        if (modalPlanoAreasImpactadasEl) {
            const areasFormatadas = formatarListaOuNaoDisponivel(plano.areasImpactadas, 'área', 'áreas');
            modalPlanoAreasImpactadasEl.innerHTML = `<span class="lista-impacto ${(!plano.areasImpactadas || plano.areasImpactadas.length === 0) ? 'nenhum' : ''}">${areasFormatadas}</span>`;
        }
        if (modalPlanoAtivosImpactadosEl) {
            const ativosFormatados = formatarListaOuNaoDisponivel(plano.ativosImpactados, 'ativo', 'ativos');
            modalPlanoAtivosImpactadosEl.innerHTML = `<span class="lista-impacto ${(!plano.ativosImpactados || plano.ativosImpactados.length === 0) ? 'nenhum' : ''}">${ativosFormatados}</span>`;
        }
        
        renderizarEtapasModal(plano);
        modalDetalhesPlano.style.display = 'block';
    }

    function renderizarEtapasModal(plano) {
        // ... (lógica de renderizarEtapasModal como antes, já exibe areasImpactadasEtapa e ativosImpactadosEtapa) ...
        if (!modalEtapasListEl) return;
        modalEtapasListEl.innerHTML = '';
        const etapasDoPlano = plano.etapas || []; 
        if (etapasDoPlano.length === 0) {
            modalEtapasListEl.innerHTML = '<p>Nenhuma etapa cadastrada para este plano.</p>';
            return;
        }
        etapasDoPlano.sort((a, b) => a.ordem - b.ordem).forEach(etapa => {
            const etapaItemModal = document.createElement('div');
            etapaItemModal.classList.add('etapa-item-modal');
            etapaItemModal.dataset.idEtapa = etapa.idEtapa;
            const statusClass = (etapa.status || 'NAO_INICIADO').toLowerCase().replace(/_/g, '-');
            const areasEtapaFormatadas = formatarListaOuNaoDisponivel(etapa.areasImpactadasEtapa, 'área', 'áreas');
            const ativosEtapaFormatados = formatarListaOuNaoDisponivel(etapa.ativosImpactadosEtapa, 'ativo', 'ativos');

            etapaItemModal.innerHTML = `
                <h5>${etapa.ordem || '-'}. ${etapa.nomeEtapa || 'Etapa sem nome'}</h5>
                <p>${etapa.descricaoEtapaDetalhada || ''}</p>
                <p><strong>Áreas Impactadas (Etapa):</strong> <span class="lista-impacto-etapa ${(!etapa.areasImpactadasEtapa || etapa.areasImpactadasEtapa.length === 0) ? 'nenhum' : ''}">${areasEtapaFormatadas}</span></p>
                <p><strong>Ativos Impactados (Etapa):</strong> <span class="lista-impacto-etapa ${(!etapa.ativosImpactadosEtapa || etapa.ativosImpactadosEtapa.length === 0) ? 'nenhum' : ''}">${ativosEtapaFormatados}</span></p>
                <p><strong>Status:</strong> <span class="etapa-status ${statusClass}">${formatarStatus(etapa.status)}</span></p>
                <p><strong>Tempo Recomendado:</strong> ${formatarTempo(etapa.tempoRecomendadoSegundos)}</p>
                <p><strong>Tempo Decorrido:</strong> <span class="cronometro" id="cronometro-${etapa.idEtapa}">${formatarTempo(etapa.tempoDecorridoSegundos)}</span></p>
                <div class="etapa-actions">
                    <button class="iniciar-btn" data-id-plano="${plano.idPlano}" data-id-etapa="${etapa.idEtapa}" ${etapa.status !== 'NAO_INICIADO' ? 'disabled' : ''}>Iniciar</button>
                    <button class="parar-btn" data-id-plano="${plano.idPlano}" data-id-etapa="${etapa.idEtapa}" ${etapa.status !== 'EM_ANDAMENTO' ? 'disabled' : ''}>Concluir</button>
                    <button class="reabrir-btn" data-id-plano="${plano.idPlano}" data-id-etapa="${etapa.idEtapa}" ${etapa.status !== 'CONCLUIDO' ? 'disabled' : ''}>Reabrir</button>
                </div>
            `;
            modalEtapasListEl.appendChild(etapaItemModal);
            if (etapa.status === 'EM_ANDAMENTO') {
                iniciarOuAtualizarCronometro(plano.idPlano, etapa.idEtapa);
            } else {
                pararCronometro(etapa.idEtapa);
                atualizarDisplayCronometro(etapa.idEtapa, etapa.tempoDecorridoSegundos, etapa.tempoRecomendadoSegundos);
            }
        });
    }

    // --- Lógica das Etapas (Status, Cronômetro - como antes) ---
    // ... (código do event listener e funções de cronômetro como antes) ...
    if (modalEtapasListEl) {
        modalEtapasListEl.addEventListener('click', async (e) => {
            const targetButton = e.target.closest('button');
            if (!targetButton) return;
            const idPlano = targetButton.dataset.idPlano;
            const idEtapa = targetButton.dataset.idEtapa;
            if (!idPlano || !idEtapa) return;
            const plano = todosPlanosGlobais.find(p => p.idPlano === idPlano);
            if (!plano) return;
            const etapa = plano.etapas.find(et => et.idEtapa === idEtapa);
            if (!etapa) return;
            let mudancaStatus = false;

            if (targetButton.classList.contains('iniciar-btn') && etapa.status === 'NAO_INICIADO') {
                etapa.status = 'EM_ANDAMENTO';
                etapa.tempoIniciadoTimestamp = Date.now();
                etapa.tempoDecorridoSegundos = 0;
                iniciarOuAtualizarCronometro(idPlano, idEtapa);
                mudancaStatus = true;
            } else if (targetButton.classList.contains('parar-btn') && etapa.status === 'EM_ANDAMENTO') {
                etapa.status = 'CONCLUIDO';
                pararCronometro(idEtapa);
                if (etapa.tempoIniciadoTimestamp) {
                    etapa.tempoDecorridoSegundos = Math.floor((Date.now() - etapa.tempoIniciadoTimestamp) / 1000);
                }
                atualizarDisplayCronometro(idEtapa, etapa.tempoDecorridoSegundos, etapa.tempoRecomendadoSegundos);
                mudancaStatus = true;
                const proximaEtapa = encontrarProximaEtapa(plano, etapa.ordem);
                if (proximaEtapa && proximaEtapa.status === 'NAO_INICIADO') {
                    proximaEtapa.status = 'EM_ANDAMENTO';
                    proximaEtapa.tempoIniciadoTimestamp = Date.now();
                    proximaEtapa.tempoDecorridoSegundos = 0;
                    iniciarOuAtualizarCronometro(idPlano, proximaEtapa.idEtapa);
                     try { 
                         await ApiService.atualizarStatusEtapaOperador(idPlano, proximaEtapa.idEtapa, proximaEtapa.status, { tempoDecorridoSegundos: proximaEtapa.tempoDecorridoSegundos, tempoIniciadoTimestamp: proximaEtapa.tempoIniciadoTimestamp }, AuthService.obterToken());
                     } catch (apiError) { console.error("Erro ao atualizar status da próxima etapa (mock):", apiError); }
                }
            } else if (targetButton.classList.contains('reabrir-btn') && etapa.status === 'CONCLUIDO') {
                etapa.status = 'NAO_INICIADO';
                pararCronometro(idEtapa);
                etapa.tempoDecorridoSegundos = 0;
                etapa.tempoIniciadoTimestamp = null;
                atualizarDisplayCronometro(idEtapa, 0, etapa.tempoRecomendadoSegundos);
                mudancaStatus = true;
            }

            if (mudancaStatus) {
                try {
                    await ApiService.atualizarStatusEtapaOperador(idPlano, idEtapa, etapa.status, {
                        tempoDecorridoSegundos: etapa.tempoDecorridoSegundos,
                        tempoIniciadoTimestamp: etapa.tempoIniciadoTimestamp
                    }, AuthService.obterToken());
                    calcularEAtualizarStatusGeralPlanoNoObjeto(idPlano);
                } catch (error) {
                    console.error("Erro ao simular atualização de status da etapa:", error);
                }
                renderizarEtapasModal(plano); 
            }
        });
    }
    function encontrarProximaEtapa(plano, ordemAtual) { 
        const etapasDoPlano = plano.etapas || [];
        return etapasDoPlano
            .filter(et => et.ordem > ordemAtual)
            .sort((a, b) => a.ordem - b.ordem)[0];
    }
    function iniciarOuAtualizarCronometro(idPlano, idEtapa) { 
        pararCronometro(idEtapa); 
        const plano = todosPlanosGlobais.find(p => p.idPlano === idPlano);
        if (!plano) return;
        const etapa = plano.etapas.find(et => et.idEtapa === idEtapa);
        if (!etapa || etapa.status !== 'EM_ANDAMENTO') {
            pararCronometro(idEtapa);
            if (etapa) { 
                atualizarDisplayCronometro(etapa.idEtapa, etapa.tempoDecorridoSegundos, etapa.tempoRecomendadoSegundos);
            }
            return;
        }
        if (!etapa.tempoIniciadoTimestamp) { 
            etapa.tempoIniciadoTimestamp = Date.now() - (etapa.tempoDecorridoSegundos * 1000);
        }
        timers[idEtapa] = setInterval(() => {
            const planoAtual = todosPlanosGlobais.find(p => p.idPlano === idPlano); 
            const etapaAtualizada = planoAtual?.etapas.find(et => et.idEtapa === idEtapa);
            if(etapaAtualizada && etapaAtualizada.status === 'EM_ANDAMENTO' && etapaAtualizada.tempoIniciadoTimestamp) {
                etapaAtualizada.tempoDecorridoSegundos = Math.floor((Date.now() - etapaAtualizada.tempoIniciadoTimestamp) / 1000);
                atualizarDisplayCronometro(etapaAtualizada.idEtapa, etapaAtualizada.tempoDecorridoSegundos, etapaAtualizada.tempoRecomendadoSegundos);
            } else {
                pararCronometro(idEtapa); 
            }
        }, 1000);
        if(etapa.tempoIniciadoTimestamp) { 
             etapa.tempoDecorridoSegundos = Math.floor((Date.now() - etapa.tempoIniciadoTimestamp) / 1000);
        }
        atualizarDisplayCronometro(etapa.idEtapa, etapa.tempoDecorridoSegundos, etapa.tempoRecomendadoSegundos);
    }
    function pararCronometro(idEtapa) { 
        if (timers[idEtapa]) {
            clearInterval(timers[idEtapa]);
            delete timers[idEtapa];
        }
    }
    function atualizarDisplayCronometro(idEtapa, tempoDecorrido, tempoRecomendado) { 
        const cronometroEl = document.getElementById(`cronometro-${idEtapa}`);
        if (cronometroEl) {
            cronometroEl.textContent = formatarTempo(tempoDecorrido);
            if (tempoRecomendado > 0 && tempoDecorrido > tempoRecomendado) {
                cronometroEl.classList.add('tempo-excedido');
            } else {
                cronometroEl.classList.remove('tempo-excedido');
            }
        }
    }

    // --- Inicialização ---
    if (AuthService.estaLogado() && AuthService.obterUsuarioInfo()?.perfil === 'operator') {
        carregarPlanos();
    } else {
        console.warn("Usuário não é operador ou não está logado. Não carregando planos.");
        if (greetingEl) greetingEl.textContent = "Acesso não autorizado";
        if (planosListEl) planosListEl.innerHTML = '<p class="empty-message">Você precisa estar logado como operador para ver esta página.</p>';
    }
});