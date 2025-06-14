// js/admin/novaAreaAdmin.js
import { inicializarPaginaBaseAdmin } from './adminPageSetup.js';
import { obterToken } from '../authService.js';
import { criarNovaArea } from '../apiService.js';

async function inicializarPaginaNovaArea() {
    const setupOk = await inicializarPaginaBaseAdmin();
    if (!setupOk) return; // Interrompe se o setup base falhar (ex: não logado)

    const formNovaArea = document.getElementById('formNovaArea');

    if (formNovaArea) {
        formNovaArea.addEventListener('submit', async (evento) => {
            evento.preventDefault();

            // Coleta dos dados do formulário
            const nomeAreaInput = document.getElementById('nomeArea');
            const descricaoInput = document.getElementById('descricaoArea');

            if (!nomeAreaInput.value.trim()) {
                alert("Por favor, informe o nome da área.");
                return;
            }

            const dadosCriacao = {
                area: {
                    nomeArea: nomeAreaInput.value.trim(),
                    descricao: descricaoInput?.value.trim() || ''
                }
            };

            const token = obterToken();
            const resposta = await criarNovaArea(dadosCriacao, token);

            if (resposta.ok) {
                alert(resposta.data.mensagem || "Área criada com sucesso!");
                window.location.href = 'areas-ativos.html'; // Redireciona para a listagem
            } else {
                alert(`Erro ao criar área: ${resposta.data.mensagem || 'Erro desconhecido.'}`);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', inicializarPaginaNovaArea);
