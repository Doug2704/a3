import { inicializarPaginaBaseAdmin } from './adminPageSetup.js';
import { obterToken } from '../authService.js';
import { buscarTodosUsuarios, excluirUsuario, buscarTodasAsAreas, buscarUsuariosPorArea } from '../apiService.js';

const corpoTabela = document.getElementById('corpo-tabela-usuarios');
const filtroAreaSelect = document.getElementById('filtroArea');
const btnLimparFiltro = document.getElementById('btnLimparFiltroArea');

function renderizarUsuarios(usuarios) {
    if (!corpoTabela) return;
    corpoTabela.innerHTML = '';

    if (!usuarios || usuarios.length === 0) {
        corpoTabela.innerHTML = `<tr><td colspan="6" class="nenhum-usuario">Nenhum usuário encontrado.</td></tr>`;
        return;
    }

    const token = obterToken();
    usuarios.forEach(usuario => {
        const linha = corpoTabela.insertRow();
        const nomeArea = usuario.actuationArea || 'Não associada';
        const perfilFormatado = (usuario.profile || '').replace(/_/g, ' ');

        linha.innerHTML = `
            <td>${usuario.name || 'N/A'}</td>
            <td>${usuario.username || 'N/A'}</td>
            <td>${usuario.email || 'N/A'}</td>
            <td>${perfilFormatado}</td>
            <td>${nomeArea}</td>
            <td class="acoes-tabela">
                <button class="btn-acao-tabela editar" title="Editar Usuário" data-id="${usuario.id}"><i class="fa-solid fa-pencil"></i></button>
                <button class="btn-acao-tabela excluir" title="Excluir Usuário" data-id="${usuario.id}"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        `;
        
        linha.querySelector('.editar').addEventListener('click', () => {
            window.location.href = `editar-usuario.html?id=${usuario.id}`;
        });
        
        linha.querySelector('.excluir').addEventListener('click', async () => {
            if (confirm(`Tem certeza que deseja excluir o usuário ${usuario.name}?`)) {
                const resposta = await excluirUsuario(usuario.id, token);
                if (resposta.ok) {
                    alert("Usuário excluído com sucesso!");
                    filtrarUsuarios();
                } else {
                    alert(`Falha ao excluir usuário: ${resposta.data?.mensagem || "Erro desconhecido."}`);
                }
            }
        });
    });
}

async function filtrarUsuarios() {
    if (!corpoTabela) return;
    corpoTabela.innerHTML = `<tr><td colspan="6" class="carregando-dados">Carregando usuários...</td></tr>`;

    const areaIdSelecionada = filtroAreaSelect.value;
    const token = obterToken();
    let resposta;

    if (areaIdSelecionada) {
        resposta = await buscarUsuariosPorArea(areaIdSelecionada, token);
        btnLimparFiltro.style.display = 'inline-block';
    } else {
        resposta = await buscarTodosUsuarios(token);
        btnLimparFiltro.style.display = 'none';
    }

    if (resposta.ok && Array.isArray(resposta.data)) {
        renderizarUsuarios(resposta.data);
    } else {
        corpoTabela.innerHTML = `<tr><td colspan="6" class="erro-dados">Erro ao carregar usuários.</td></tr>`;
    }
}

async function popularFiltroDeAreas() {
    if (!filtroAreaSelect) return;
    const respostaAreas = await buscarTodasAsAreas(obterToken());
    if (respostaAreas.ok && Array.isArray(respostaAreas.data)) {
        respostaAreas.data.forEach(area => {
            const option = document.createElement('option');
            option.value = area.id;
            option.textContent = area.name || area.nomeArea;
            filtroAreaSelect.appendChild(option);
        });
    }
}

async function inicializarPaginaUsuarios() {
    const setupOk = await inicializarPaginaBaseAdmin();
    if (!setupOk) return;

    await popularFiltroDeAreas();
    await filtrarUsuarios(); 

    filtroAreaSelect.addEventListener('change', filtrarUsuarios);
    btnLimparFiltro.addEventListener('click', () => {
        filtroAreaSelect.value = '';
        filtrarUsuarios();
    });
}

document.addEventListener('DOMContentLoaded', inicializarPaginaUsuarios);