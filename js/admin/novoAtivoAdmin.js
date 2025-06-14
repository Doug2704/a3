// js/admin/novoAtivoAdmin.js
import { inicializarPaginaBaseAdmin } from './adminPageSetup.js';
import { obterToken } from '../authService.js';
import { buscarAreasEAtivosAdmin, criarNovoAtivoAdmin } from '../apiService.js';

/**
 * Popula o select de Áreas no formulário.
 */
async function carregarAreasParaSelecao() {
    const selectArea = document.getElementById('areaVinculada');
    if (!selectArea) return;

    const token = obterToken(); // O token pode não ser necessário para buscar áreas no mock
    const resposta = await buscarAreasEAtivosAdmin(token);

    if (resposta.ok && resposta.data) {
        selectArea.innerHTML = '<option value="">Selecione uma área...</option>'; // Opção padrão
        resposta.data.forEach(area => {
            const option = document.createElement('option');
            option.value = area.id;
            option.textContent = area.nome;
            selectArea.appendChild(option);
        });
    } else {
        console.error("Falha ao carregar áreas para seleção:", resposta.data.mensagem);
        selectArea.innerHTML = '<option value="">Não foi possível carregar as áreas</option>';
    }
}

async function inicializarPaginaNovoAtivo() {
    const setupOk = await inicializarPaginaBaseAdmin();
    if (!setupOk) return;

    await carregarAreasParaSelecao(); // Carrega as áreas no dropdown

    const formNovoAtivo = document.getElementById('formNovoAtivo');

    if (formNovoAtivo) {
        formNovoAtivo.addEventListener('submit', async (evento) => {
            evento.preventDefault();

            const nomeAtivoInput = document.getElementById('nomeAtivo');
            const tipoAtivoInput = document.getElementById('tipoAtivo');
            const localizacaoAtivoInput = document.getElementById('localizacaoAtivo');
            const statusAtivoSelect = document.getElementById('statusAtivo');
            const areaVinculadaSelect = document.getElementById('areaVinculada');

            if (!areaVinculadaSelect.value) {
                alert("Por favor, selecione uma área para vincular o ativo.");
                areaVinculadaSelect.focus();
                return;
            }

            const dadosAtivo = {
                nomeAtivo: nomeAtivoInput.value.trim(),
                tipoAtivo: tipoAtivoInput.value.trim(),
                localizacaoAtivo: localizacaoAtivoInput.value.trim(),
                statusAtivo: statusAtivoSelect.value,
                areaId: areaVinculadaSelect.value // ID da área selecionada
            };

            const token = obterToken();
            const respostaApi = await criarNovoAtivoAdmin(dadosAtivo, token);

            if (respostaApi.ok) {
                alert(respostaApi.data.mensagem || "Ativo criado com sucesso!");
                window.location.href = 'areas-ativos.html'; // Redireciona para a listagem
            } else {
                alert(`Erro ao criar ativo: ${respostaApi.data.mensagem || 'Erro desconhecido.'}`);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', inicializarPaginaNovoAtivo);