// js/authService.js
const TOKEN_KEY = 'meuTokenDeAcesso';
const USER_INFO_KEY = 'meuUsuarioInfo';

export function salvarToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

export function obterToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function removerToken() {
    localStorage.removeItem(TOKEN_KEY);
}

export function salvarUsuarioInfo(usuario) {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(usuario));
}

export function obterUsuarioInfo() {
    const userInfo = localStorage.getItem(USER_INFO_KEY);
    return userInfo ? JSON.parse(userInfo) : null;
}

export function removerUsuarioInfo() {
    localStorage.removeItem(USER_INFO_KEY);
}

export function estaLogado() {
    return !!obterToken();
}

export function logoutUsuario() {
    removerToken();
    removerUsuarioInfo();
    window.location.href = '../../index.html';
}