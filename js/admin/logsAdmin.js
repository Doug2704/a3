import { inicializarPaginaBaseAdmin } from './adminPageSetup.js';
import { obterToken } from '../authService.js';
import { buscarLogs } from '../apiService.js';

function parseLogString(logString) {
    const regex = /\[(.*?)\s+com id:\s*(\d+)\]\s+(\S+)\s+(.*?)\s+em\s+(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/;
    const parts = regex.exec(logString);

    if (parts && parts.length === 6) {
        return {
            timestamp: parts[5],
            username: parts[3],
            action: parts[4],
            details: `Perfil: ${parts[1]}, ID do Usuário: ${parts[2]}`
        };
    }
    
    return {
        timestamp: 'N/A',
        username: 'N/A',
        action: 'Formato de log não reconhecido',
        details: logString 
    };
}

async function carregarEExibirLogs() {
    const corpoTabela = document.getElementById('corpo-tabela-logs');
    if (!corpoTabela) return;

    const token = obterToken();
    try {
        const resposta = await buscarLogs(token);

        if (resposta.ok && Array.isArray(resposta.data)) {
            const logs = resposta.data;
            
            corpoTabela.innerHTML = '';
            
            if (logs.length === 0) {
                corpoTabela.innerHTML = `<tr><td colspan="4" class="nenhum-log">Nenhum log encontrado.</td></tr>`;
                return;
            }

            logs.forEach(logString => {
                const logData = parseLogString(logString);
                const linha = corpoTabela.insertRow(0);
                linha.innerHTML = `
                    <td>${logData.timestamp}</td>
                    <td>${logData.username}</td>
                    <td>${logData.action}</td>
                    <td>${logData.details}</td>
                `;
            });
        } else {
            console.error("Falha ao carregar logs:", resposta.data?.mensagem);
        }
    } catch (error) {
        console.error("Erro na requisição de logs:", error);
    }
}

async function inicializarPaginaLogs() {
    const setupOk = await inicializarPaginaBaseAdmin();
    if (!setupOk) return;

    const corpoTabela = document.getElementById('corpo-tabela-logs');
    if (corpoTabela) {
        corpoTabela.innerHTML = `<tr><td colspan="4" class="carregando-dados">Carregando logs do sistema...</td></tr>`;
    }

    await carregarEExibirLogs();

    setInterval(carregarEExibirLogs, 10000);
}

document.addEventListener('DOMContentLoaded', inicializarPaginaLogs);