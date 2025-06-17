import { inicializarPaginaBaseAdmin } from './adminPageSetup.js';
import { obterToken } from '../authService.js';
import { buscarUsuarioPorId, buscarTodasAsAreas, atualizarUsuario } from '../apiService.js';

async function preencherFormulario(usuario, areas) {
    document.getElementById('nomeCompleto').value = usuario.name || '';
    document.getElementById('email').value = usuario.email || '';
    document.getElementById('loginUsuario').value = usuario.username || '';
    
    const perfilSelect = document.getElementById('perfilUsuario');
    if (perfilSelect && usuario.profile) {
        perfilSelect.value = usuario.profile.toUpperCase();
    }

    const areaSelect = document.getElementById('usuarioAreaId');
    if (areaSelect) {
        areaSelect.innerHTML = '<option value="">Selecione uma área...</option>';
        areas.forEach(area => {
            const option = document.createElement('option');
            option.value = area.id;
            option.textContent = area.name || area.nomeArea;
            areaSelect.appendChild(option);
        });
        
        if (usuario.actuationArea) {
            const areaDoUsuario = areas.find(area => area.name === usuario.actuationArea);
            if (areaDoUsuario) {
                areaSelect.value = areaDoUsuario.id;
            }
        }
    }
}

async function inicializarPaginaEdicao() {
    const setupOk = await inicializarPaginaBaseAdmin();
    if (!setupOk) return;

    const mainContent = document.getElementById('main-content');
    const form = document.getElementById('formEditarUsuario');

    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    if (!userId) {
        mainContent.innerHTML = '<p class="erro-dados">ID do usuário não fornecido na URL.</p>';
        return;
    }

    try {
        const token = obterToken();
        const [respostaUsuario, respostaAreas] = await Promise.all([
            buscarUsuarioPorId(userId, token),
            buscarTodasAsAreas(token)
        ]);

        if (respostaUsuario.ok && respostaAreas.ok) {
            await preencherFormulario(respostaUsuario.data, respostaAreas.data);
            form.style.display = 'block'; 
            mainContent.querySelector('.carregando-dados').style.display = 'none';
        } else {
            throw new Error(respostaUsuario.data?.mensagem || respostaAreas.data?.mensagem || "Erro ao carregar dados.");
        }
    } catch (error) {
        mainContent.innerHTML = `<p class="erro-dados">Não foi possível carregar os dados para edição: ${error.message}</p>`;
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const senhaInput = document.getElementById('senhaUsuario');
            const confirmarSenhaInput = document.getElementById('confirmarSenhaUsuario');
            const msgErroSenha = document.getElementById('msgErroSenha');
            
            if (senhaInput.value !== confirmarSenhaInput.value) {
                if (msgErroSenha) msgErroSenha.textContent = 'As senhas não coincidem.';
                return;
            }

            const dadosForm = new FormData(form);
            const dadosParaAtualizar = {
                name: dadosForm.get('name'),
                email: dadosForm.get('email'),
                profile: dadosForm.get('profile'),
                actuationAreaId: dadosForm.get('actuationAreaId'),
            };

            if (dadosForm.get('password')) {
                dadosParaAtualizar.password = dadosForm.get('password');
            }

            const token = obterToken();
            const respostaApi = await atualizarUsuario(userId, dadosParaAtualizar, token);

            if (respostaApi.ok) {
                alert("Usuário atualizado com sucesso!");
                window.location.href = 'usuarios.html';
            } else {
                alert(`Falha ao atualizar usuário: ${respostaApi.data?.mensagem || "Erro desconhecido."}`);
            }
        });
    }

    const senhaInput = document.getElementById('senhaUsuario');
    const confirmarSenhaInput = document.getElementById('confirmarSenhaUsuario');
    const msgErroSenha = document.getElementById('msgErroSenha');
    if (senhaInput && confirmarSenhaInput && msgErroSenha) {
        const validarSenhas = () => {
            if (senhaInput.value !== confirmarSenhaInput.value) {
                msgErroSenha.textContent = 'As senhas não coincidem.';
            } else {
                msgErroSenha.textContent = '';
            }
        };
        senhaInput.addEventListener('input', validarSenhas);
        confirmarSenhaInput.addEventListener('input', validarSenhas);
    }
}

document.addEventListener('DOMContentLoaded', inicializarPaginaEdicao);