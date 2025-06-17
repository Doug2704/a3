import { inicializarPaginaBaseAdmin } from './adminPageSetup.js';
import { obterToken } from '../authService.js';
import { criarUsuario, buscarTodasAsAreas } from '../apiService.js';

async function popularSelectAreas() {
    const selectAreaEl = document.getElementById('usuarioAreaId');
    if (!selectAreaEl) return;

    selectAreaEl.innerHTML = '<option value="">Carregando áreas...</option>';
    selectAreaEl.disabled = true;

    try {
        const resposta = await buscarTodasAsAreas(obterToken());
        if (resposta.ok && Array.isArray(resposta.data)) {
            selectAreaEl.innerHTML = '<option value="">Selecione uma área...</option>';
            if (resposta.data.length > 0) {
                resposta.data.forEach(area => {
                    const idArea = area.id;
                    const nomeDaArea = area.name || area.nomeArea;
                    if (idArea && nomeDaArea) {
                        const option = document.createElement('option');
                        option.value = idArea;
                        option.textContent = nomeDaArea;
                        selectAreaEl.appendChild(option);
                    }
                });
                selectAreaEl.disabled = false;
            } else {
                selectAreaEl.innerHTML = '<option value="">Nenhuma área cadastrada</option>';
            }
        } else {
            selectAreaEl.innerHTML = '<option value="">Erro ao carregar áreas</option>';
        }
    } catch (error) {
        selectAreaEl.innerHTML = '<option value="">Erro de conexão</option>';
    }
}

async function inicializarPaginaCadastro() {
    const setupOk = await inicializarPaginaBaseAdmin();
    if (!setupOk) return;

    await popularSelectAreas();

    const formCadastro = document.getElementById('formCadastroUsuario');
    const senhaInput = document.getElementById('senhaUsuario');
    const confirmarSenhaInput = document.getElementById('confirmarSenhaUsuario');
    const msgErroSenha = document.getElementById('msgErroSenha');
    const selectAreaEl = document.getElementById('usuarioAreaId');

    if (senhaInput && confirmarSenhaInput && msgErroSenha) {
        const validarSenhas = () => {
            if (senhaInput.value !== confirmarSenhaInput.value) {
                msgErroSenha.textContent = 'As senhas não coincidem.';
                confirmarSenhaInput.setCustomValidity('As senhas não coincidem.');
            } else {
                msgErroSenha.textContent = '';
                confirmarSenhaInput.setCustomValidity('');
            }
        };
        senhaInput.addEventListener('input', validarSenhas);
        confirmarSenhaInput.addEventListener('input', validarSenhas);
    }

    if (formCadastro) {
        formCadastro.addEventListener('submit', async (evento) => {
            evento.preventDefault();
            
            if (msgErroSenha) msgErroSenha.textContent = '';

            if (senhaInput.value !== confirmarSenhaInput.value) {
                if (msgErroSenha) {
                    msgErroSenha.textContent = 'As senhas não coincidem. Verifique por favor.';
                } else {
                    alert('As senhas não coincidem. Verifique por favor.');
                }
                confirmarSenhaInput.focus();
                return;
            }
            
            if (selectAreaEl && !selectAreaEl.value) {
                alert('Por favor, selecione uma área para o usuário.');
                selectAreaEl.focus();
                return;
            }

            const dadosForm = new FormData(formCadastro);
            
            const dadosUsuarioParaApi = {
                name: dadosForm.get('nomeCompleto'),
                username: dadosForm.get('loginUsuario'),
                email: dadosForm.get('email'),
                password: dadosForm.get('senhaUsuario'),
                profile: dadosForm.get('perfilUsuario').toUpperCase(),
                actuationAreaId: dadosForm.get('usuarioAreaId')
            };

            const token = obterToken();
            const resposta = await criarUsuario(dadosUsuarioParaApi, token);

            if (resposta.ok) {
                alert(resposta.data?.mensagem || "Usuário cadastrado com sucesso!");
                window.location.href = 'usuarios.html';
            } else {
                alert(`Erro ao cadastrar usuário: ${resposta.data?.mensagem || 'Erro desconhecido.'}`);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', inicializarPaginaCadastro);