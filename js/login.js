// js/login.js
import { apiLogin } from './apiService.js';
import { salvarToken, salvarUsuarioInfo } from './authService.js';

// Função para salvar as credenciais no localStorage
function salvarCredenciais(login, senha, manterConectado) {
    if (manterConectado) {
        localStorage.setItem('loginSalvo', login);
        localStorage.setItem('senhaSalva', btoa(senha)); // Codifica a senha em base64
        localStorage.setItem('manterConectado', 'true');
    } else {
        localStorage.removeItem('loginSalvo');
        localStorage.removeItem('senhaSalva');
        localStorage.removeItem('manterConectado');
    }
}

// Função para preencher automaticamente os campos de login
function preencherCredenciaisSalvas() {
    const manterConectado = localStorage.getItem('manterConectado') === 'true';
    if (manterConectado) {
        const loginSalvo = localStorage.getItem('loginSalvo');
        const senhaSalva = localStorage.getItem('senhaSalva');
        
        if (loginSalvo && senhaSalva) {
            const loginInput = document.getElementById('login');
            const senhaInput = document.getElementById('senha');
            const manterConectadoCheckbox = document.getElementById('manter-conectado');
            
            if (loginInput) loginInput.value = loginSalvo;
            if (senhaInput) senhaInput.value = atob(senhaSalva); // Decodifica a senha
            if (manterConectadoCheckbox) manterConectadoCheckbox.checked = true;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('form-login');
    const btnMostrarSenha = document.getElementById('btn-mostrar-senha');
    const campoSenha = document.getElementById('senha');
    const iconeSenha = btnMostrarSenha ? btnMostrarSenha.querySelector('i') : null;
    
    // Preenche as credenciais salvas, se existirem
    preencherCredenciaisSalvas();

    if (formLogin) {
        formLogin.addEventListener('submit', async (evento) => {
            evento.preventDefault(); 

            const loginInput = document.getElementById('login');
            const senhaInput = document.getElementById('senha');
            const login = loginInput.value;
            const senha = senhaInput.value;

            if (!login || !senha) {
                alert("Por favor, preencha o login e a senha.");
                return;
            }

            const resposta = await apiLogin(login, senha);

            if (resposta.ok && resposta.data && resposta.data.usuario) {
                // Salva o token e as informações do usuário
                salvarToken(resposta.data.token);
                salvarUsuarioInfo(resposta.data.usuario);
                
                // Salva as credenciais se o usuário marcou "Manter conectado"
                const manterConectado = document.getElementById('manter-conectado').checked;
                const login = document.getElementById('login').value;
                const senha = document.getElementById('senha').value;
                salvarCredenciais(login, senha, manterConectado);
                
                const perfilUsuario = resposta.data.usuario.perfil;

                switch (perfilUsuario) {
                    case 'admin':
                        window.location.href = 'pages/admin/home.html'; 
                        break;
                    case 'operator':
                        window.location.href = 'pages/operador/home_operador.html';
                        break;
                    case 'manager': // Redirecionamento para o Gerenciador
                        window.location.href = 'pages/gerenciador/home_gerenciador.html';
                        break;
                    default:
                        console.error("Login OK, mas perfil desconhecido ou sem regra de redirecionamento:", perfilUsuario);
                        alert(`Login bem-sucedido, mas o seu perfil ('${perfilUsuario}') não tem uma página de destino configurada. Contate o administrador.`);
                        break;
                }
            } else {
                console.error("Falha no login ou dados do usuário ausentes:", resposta.data?.mensagem || "Resposta da API inválida");
                alert(`Falha no login: ${resposta.data?.mensagem || 'Erro desconhecido. Verifique suas credenciais.'}`);
                if(senhaInput) { 
                    senhaInput.value = ''; 
                    senhaInput.focus();
                }
            }
        });
    }

    if (btnMostrarSenha && campoSenha && iconeSenha) {
        btnMostrarSenha.addEventListener('click', () => {
            if (campoSenha.type === 'password') {
                campoSenha.type = 'text';
                iconeSenha.classList.remove('fa-eye');
                iconeSenha.classList.add('fa-eye-slash');
            } else {
                campoSenha.type = 'password';
                iconeSenha.classList.remove('fa-eye-slash');
                iconeSenha.classList.add('fa-eye');
            }
        });
    }
});