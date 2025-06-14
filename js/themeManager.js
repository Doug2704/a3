// js/themeManager.js

const CHAVE_STORAGE_TEMA = 'incidexTemaPreference';
const CLASSE_DARK_MODE = 'dark-mode';

export function aplicarTemaInicial() {
    const temaSalvo = localStorage.getItem(CHAVE_STORAGE_TEMA);

    if (temaSalvo === 'dark') {
        document.body.classList.add(CLASSE_DARK_MODE);
    } else if (temaSalvo === 'light') {
        document.body.classList.remove(CLASSE_DARK_MODE);
    }
    // Opcional: Adicionar detecção de preferência do sistema aqui se não houver tema salvo
}

export function alternarTema() {
    let temaAtual;
    if (document.body.classList.contains(CLASSE_DARK_MODE)) {
        document.body.classList.remove(CLASSE_DARK_MODE);
        localStorage.setItem(CHAVE_STORAGE_TEMA, 'light');
        temaAtual = 'light';
    } else {
        document.body.classList.add(CLASSE_DARK_MODE);
        localStorage.setItem(CHAVE_STORAGE_TEMA, 'dark');
        temaAtual = 'dark';
    }
    console.log(`Tema alterado para: ${temaAtual}`);
    return temaAtual;
}

export function isDarkModeAtivo() {
    return document.body.classList.contains(CLASSE_DARK_MODE);
}