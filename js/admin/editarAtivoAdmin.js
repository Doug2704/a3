import { inicializarPaginaBaseAdmin } from './adminPageSetup.js';
import { obterToken } from '../authService.js';
import { buscarAtivoPorId, buscarTodasAsAreas, atualizarAtivo } from '../apiService.js';

async function preencherFormulario(ativo, areas) {
    document.getElementById('nomeAtivo').value = ativo.name || '';
    
    const areaSelect = document.getElementById('areaPaiAtivo');
    if (areaSelect) {
        areaSelect.innerHTML = '<option value="">Selecione uma área...</option>';
        areas.forEach(area => {
            const option = document.createElement('option');
            option.value = area.id;
            option.textContent = area.name || area.nomeArea;
            areaSelect.appendChild(option);
        });
        
        if (ativo.responsibleAreaId) {
            areaSelect.value = ativo.responsibleAreaId;
        }
    }
}

async function inicializarPaginaEdicao() {
    const setupOk = await inicializarPaginaBaseAdmin();
    if (!setupOk) return;

    const mainContent = document.getElementById('main-content');
    const form = document.getElementById('formEditarAtivo');
    const urlParams = new URLSearchParams(window.location.search);
    const ativoId = urlParams.get('id');

    if (!ativoId) {
        mainContent.innerHTML = '<p class="erro-dados">ID do ativo não fornecido na URL.</p>';
        return;
    }

    try {
        const token = obterToken();
        const [respostaAtivo, respostaAreas] = await Promise.all([
            buscarAtivoPorId(ativoId, token),
            buscarTodasAsAreas(token)
        ]);

        if (respostaAtivo.ok && respostaAreas.ok) {
            await preencherFormulario(respostaAtivo.data, respostaAreas.data);
            form.style.display = 'block';
            const msgCarregando = mainContent.querySelector('.carregando-dados');
            if (msgCarregando) msgCarregando.style.display = 'none';
        } else {
            throw new Error(respostaAtivo.data?.mensagem || respostaAreas.data?.mensagem || "Erro ao carregar dados.");
        }
    } catch (error) {
        mainContent.innerHTML = `<p class="erro-dados">Não foi possível carregar os dados para edição: ${error.message}</p>`;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const dadosForm = new FormData(form);
        const dadosParaAtualizar = {
            name: dadosForm.get('name'),
            responsibleAreaId: dadosForm.get('responsibleAreaId')
        };
        
        const token = obterToken();
        const respostaApi = await atualizarAtivo(ativoId, dadosParaAtualizar, token);

        if (respostaApi.ok) {
            alert("Ativo atualizado com sucesso!");
            window.location.href = 'areas-ativos.html';
        } else {
            alert(`Falha ao atualizar ativo: ${respostaApi.data?.mensagem || "Erro desconhecido."}`);
        }
    });
}

document.addEventListener('DOMContentLoaded', inicializarPaginaEdicao);