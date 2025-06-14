import { inicializarPaginaBaseAdmin } from './adminPageSetup.js';
import { obterToken } from '../authService.js';
import { buscarAreaPorId, atualizarArea } from '../apiService.js';

async function preencherFormulario(area) {
    document.getElementById('nomeArea').value = area.name || '';
    document.getElementById('descricaoArea').value = area.description || '';
}

async function inicializarPaginaEdicao() {
    const setupOk = await inicializarPaginaBaseAdmin();
    if (!setupOk) return;

    const mainContent = document.getElementById('main-content');
    const form = document.getElementById('formEditarArea');
    const urlParams = new URLSearchParams(window.location.search);
    const areaId = urlParams.get('id');

    if (!areaId) {
        mainContent.innerHTML = '<p class="erro-dados">ID da área não fornecido na URL.</p>';
        return;
    }

    try {
        const resposta = await buscarAreaPorId(areaId, obterToken());
        if (resposta.ok) {
            await preencherFormulario(resposta.data);
            form.style.display = 'block';
            mainContent.querySelector('.carregando-dados').style.display = 'none';
        } else {
            throw new Error(resposta.data?.mensagem || "Erro ao carregar dados da área.");
        }
    } catch (error) {
        mainContent.innerHTML = `<p class="erro-dados">Não foi possível carregar os dados para edição: ${error.message}</p>`;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dadosForm = new FormData(form);
        const dadosParaAtualizar = Object.fromEntries(dadosForm.entries());
        
        const respostaApi = await atualizarArea(areaId, dadosParaAtualizar, obterToken());
        if (respostaApi.ok) {
            alert("Área atualizada com sucesso!");
            window.location.href = 'areas-ativos.html';
        } else {
            alert(`Falha ao atualizar área: ${respostaApi.data?.mensagem || "Erro desconhecido."}`);
        }
    });
}

document.addEventListener('DOMContentLoaded', inicializarPaginaEdicao);