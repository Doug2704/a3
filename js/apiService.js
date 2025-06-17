import { API_BASE_URL } from './config.js';

async function handleResponse(resposta) {
    let dados = null;
    try {
        const texto = await resposta.text();
        if (texto) {
            dados = JSON.parse(texto);
        }
    } catch (err) {
        dados = { mensagem: "Resposta do servidor em formato inesperado." };
    }
    if (!resposta.ok) {
        return {
            ok: false,
            data: { mensagem: (typeof dados === 'object' && dados !== null ? dados.erro || dados.mensagem : dados) || `Erro HTTP ${resposta.status}` },
            status: resposta.status
        };
    }
    return { ok: true, data: dados, status: resposta.status };
}

async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
    let url = `${API_BASE_URL}${endpoint}`;
    const options = {
        method: method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (method === 'GET') {
        const cacheBustParam = `_=${Date.now()}`;
        url += url.includes('?') ? `&${cacheBustParam}` : `?${cacheBustParam}`;
    }
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    if (body) {
        options.body = JSON.stringify(body);
    }
    try {
        const resposta = await fetch(url, options);
        return await handleResponse(resposta);
    } catch (error) {
        console.error(`Erro de conexão para ${method} ${url}:`, error);
        return { ok: false, data: { mensagem: "Erro de conexão com o servidor." }, status: 0 };
    }
}

function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

export async function apiLogin(login, senha) {
    const endpoint = `/auth/login`;
    const payload = { username: login, password: senha };
    
    try {
        const resposta = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const resultado = await handleResponse(resposta);
        
        if (!resultado.ok) return resultado; 

        if (resultado.data && resultado.data.token) {
            const token = resultado.data.token;
            const decodedToken = parseJwt(token);

            if (!decodedToken) {
                return { ok: false, data: { mensagem: "Token recebido é inválido ou malformado." }, status: 500 };
            }

            const perfilBruto = decodedToken.scope || decodedToken.roles || decodedToken.authorities || decodedToken.profile;
            const nomeDoUsuario = decodedToken.name || decodedToken.sub || login;

            if (!perfilBruto) {
                 return { ok: false, data: { mensagem: "Token não contém informação de perfil (role/scope)." }, status: 500 };
            }
            
            const perfilDoUsuario = Array.isArray(perfilBruto) ? perfilBruto[0]?.toLowerCase() : perfilBruto.toString().toLowerCase();

            resultado.data = {
                token: token,
                usuario: {
                    login: login,
                    nome: nomeDoUsuario,
                    perfil: perfilDoUsuario
                }
            };
            return resultado;
        } else {
            return { ok: false, data: { mensagem: "Resposta da API de login não contém um token." }, status: resultado.status };
        }
    } catch (error) {
        console.error("Falha na comunicação com a API de login:", error);
        return { ok: false, data: { mensagem: "Não foi possível conectar ao servidor." }, status: 0 };
    }
}

export async function apiLogout(token) { return apiRequest(`/auth/logout`, 'POST', {}, token); }

export async function buscarTodasAsAreas(token) { return apiRequest(`/areas/find/all`, 'GET', null, token); }
export async function buscarAreaPorId(areaId, token) { return apiRequest(`/areas/find/${areaId}`, 'GET', null, token); }
export async function criarArea(dadosArea, token) { return apiRequest(`/areas/create`, 'POST', dadosArea, token); }
export async function atualizarArea(areaId, dadosArea, token) { return apiRequest(`/areas/update/${areaId}`, 'PUT', dadosArea, token); }
export async function excluirArea(areaId, token) { return apiRequest(`/areas/delete/${areaId}`, 'DELETE', null, token); }

export async function buscarTodosUsuarios(token) { return apiRequest(`/users/find/all`, 'GET', null, token); }
export async function buscarUsuarioPorId(userId, token) { return apiRequest(`/users/find/${userId}`, 'GET', null, token); }
export async function buscarUsuariosPorArea(areaId, token) { return apiRequest(`/users/find/byAreaId/${areaId}`, 'GET', null, token); }
export async function criarUsuario(dadosUsuario, token) { return apiRequest(`/users/create`, 'POST', dadosUsuario, token); }
export async function atualizarUsuario(userId, dadosUsuario, token) { return apiRequest(`/users/update/${userId}`, 'PUT', dadosUsuario, token); }
export async function excluirUsuario(userId, token) { return apiRequest(`/users/delete/${userId}`, 'DELETE', null, token); }

export async function buscarTodosAtivos(token) { return apiRequest(`/assets/find/all`, 'GET', null, token); }
export async function buscarAtivosPorArea(areaId, token) { return apiRequest(`/assets/find/byAreaId/${areaId}`, 'GET', null, token); }
export async function buscarAtivoPorId(ativoId, token) { return apiRequest(`/assets/find/${ativoId}`, 'GET', null, token); }
export async function criarAtivo(dadosAtivo, token) { return apiRequest(`/assets/create`, 'POST', dadosAtivo, token); }
export async function atualizarAtivo(ativoId, dadosAtivo, token) { return apiRequest(`/assets/update/${ativoId}`, 'PUT', dadosAtivo, token); }
export async function excluirAtivo(ativoId, token) { return apiRequest(`/assets/delete/${ativoId}`, 'DELETE', null, token); }

export async function buscarPlanosAcaoTodos(token) { return apiRequest(`/plans/find/all`, 'GET', null, token); }
export async function buscarPlanoAcaoPorId(idPlano, token) { return apiRequest(`/plans/find/${idPlano}`, 'GET', null, token); }
export async function buscarPlanosPorArea(areaId, token) { return apiRequest(`/plans/find/byAreaId/${areaId}`, 'GET', null, token); }
export async function criarPlanoAcaoGerenciador(dadosPlano, token) { return apiRequest(`/plans/create`, 'POST', dadosPlano, token); }
export async function atualizarPlanoAcao(idPlano, dadosPlano, token) { return apiRequest(`/plans/update/${idPlano}`, 'PUT', dadosPlano, token); }
export async function apagarPlanoAcao(idPlano, token) { return apiRequest(`/plans/delete/${idPlano}`, 'DELETE', null, token); }

export async function criarEtapa(dadosEtapa, token) { return apiRequest(`/steps/create`, 'POST', dadosEtapa, token); }
export async function buscarEtapasPorPlano(planId, token) { return apiRequest(`/steps/find/byPlanId/${planId}`, 'GET', null, token); }
export async function atualizarEtapa(stepId, dadosEtapa, token) { return apiRequest(`/steps/update/${stepId}`, 'PUT', dadosEtapa, token); }
export async function apagarEtapa(stepId, token) { return apiRequest(`/steps/delete/${stepId}`, 'DELETE', null, token); }

export async function marcarAcaoFeita(actionId, isDone, token) {
    const endpoint = isDone ? `/actions/${actionId}/done` : `/actions/${actionId}/reopen`;
    return apiRequest(endpoint, 'PUT', {}, token);
}

export async function iniciarOuBuscarExecucaoPlano(planId, token) {
    return apiRequest(`/exec/start/${planId}`, 'POST', {}, token);
}
export async function finalizarExecucaoPlano(executionId, token) { 
    return apiRequest(`/executions/finish/${executionId}`, 'PUT', {}, token); 
}

export async function buscarLogs(token) { return apiRequest(`/audit/logs`, 'GET', null, token); }

export async function testarApi(token) { return apiRequest(`/test`, 'GET', null, token); }