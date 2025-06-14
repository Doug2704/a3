// js/mainApp.js
import { aplicarTemaInicial, alternarTema, isDarkModeAtivo } from './themeManager.js';
import { NOME_DO_SOFTWARE } from './config.js'; // Importa NOME_DO_SOFTWARE

console.log('DOM completamente carregado');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded disparado');
    // Aplica o tema salvo ou padrão ao carregar a página
    try {
        aplicarTemaInicial();
        console.log('Tema inicial aplicado');
    } catch (error) {
        console.error('Erro ao aplicar tema inicial:', error);
    }

    // Configura o nome do software no título (se existir)
    const elementoNomeSoftware = document.getElementById('nome-software-titulo');
    if (elementoNomeSoftware) {
        elementoNomeSoftware.textContent = NOME_DO_SOFTWARE;
    }

    // Configura o botão de alternar tema
    console.log('Configurando botão de alternar tema...');
    const btnAlternarTema = document.getElementById('btn-alternar-tema');
    console.log('Botão encontrado:', btnAlternarTema);
    if (btnAlternarTema) {
        
        const iconeTema = btnAlternarTema.querySelector('i');
        
        // Função para atualizar o ícone com base no tema atual
        const atualizarIconeTema = () => {
            if (isDarkModeAtivo()) {
                iconeTema.className = 'fas fa-sun';
                iconeTema.style.color = '#ffd700'; // Amarelo para o sol
            } else {
                iconeTema.className = 'fas fa-moon';
                iconeTema.style.color = ''; // Volta para a cor padrão
            }
        };
        
        // Atualiza o ícone inicial
        atualizarIconeTema();
        
        // Adiciona o evento de clique
        btnAlternarTema.addEventListener('click', (event) => {
            event.preventDefault();
            alternarTema();
            atualizarIconeTema();
        });
        
    }
});