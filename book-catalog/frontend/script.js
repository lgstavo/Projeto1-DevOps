document.addEventListener('DOMContentLoaded', () => {
    // Seletores de elementos
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const userListEl = document.getElementById('userList'); // Used in loadUsers()
    const receivedRequestsListEl = document.getElementById('receivedRequestsList'); // Used in loadReceivedFriendRequests()
    const logoutButton = document.getElementById('logoutButton');
    const currentUserSpan = document.getElementById('currentUser');
    const viewUsersButton = document.getElementById('viewUsersButton');
    const viewRequestsButton = document.getElementById('viewRequestsButton');
    const usersSection = document.getElementById('usersSection');
    const requestsSection = document.getElementById('requestsSection');
    const requestCountSpan = document.getElementById('requestCount'); // Used in updateReceivedRequestsCount()

    const API_URL = 'http://localhost:3000';

    // --- Funções Auxiliares ---
    function getToken() { return localStorage.getItem('token'); }
    // Removed unused function getUserId
    function getUsername() { return localStorage.getItem('username'); }

    function showSection(sectionId) {
        [usersSection, requestsSection].forEach(section => {
            if (section) section.style.display = 'none';
        });
        const activeSection = document.getElementById(sectionId);
        if (activeSection) activeSection.style.display = 'block';
    }

    async function makeApiRequest(endpoint, method = 'GET', body = null) {
        console.log(`[FRONTEND] Iniciando requisição: ${method} para ${API_URL}${endpoint}`);
        
        const token = getToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            console.log('[FRONTEND] Token JWT adicionado ao cabeçalho.');
        }
    
        const config = { method, headers };
        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) { // Adicionado PATCH
            config.body = JSON.stringify(body);
        }
    
        try {
            const response = await fetch(`${API_URL}${endpoint}`, config);
            console.log(`[FRONTEND] Resposta recebida para ${method} ${endpoint}. Status: ${response.status}`);
            const responseText = await response.text(); // Pega o texto bruto da resposta
            console.log(`[FRONTEND] Texto bruto da resposta para ${method} ${endpoint}:`, responseText);
    
            if (response.status === 401) {
                console.error('[FRONTEND] Erro 401 (Não Autorizado).');
                alert('Sua sessão é inválida ou expirou. Por favor, faça login novamente.');
                handleLogout(); // Garanta que handleLogout está definida e funcionando
                throw new Error('Não Autorizado');
            }
    
            let responseData = null;
            if (responseText) {
                try {
                    responseData = JSON.parse(responseText);
                    console.log(`[FRONTEND] Dados da resposta (JSON parseado) para ${method} ${endpoint}:`, responseData);
                } catch (e) {
                    console.warn(`[FRONTEND] Resposta para ${method} ${endpoint} não é um JSON válido. Usando texto bruto se o status for OK.`);
                    if (response.ok) { // Se o status for 2xx mas não for JSON (ex: 204 No Content)
                        responseData = responseText || null; // Pode ser string vazia
                    }
                }
            }
    
    
            if (!response.ok) {
                // Tenta pegar a mensagem de erro do JSON, ou usa o texto bruto, ou o status
                const errorMessage = responseData?.message || responseText || `Erro HTTP: ${response.status}`;
                console.error(`[FRONTEND] Erro na requisição API para ${method} ${endpoint}: ${errorMessage}`);
                throw new Error(errorMessage);
            }
    
            return responseData; // Retorna os dados parseados (ou texto se não for JSON e OK)
        } catch (error) {
            console.error(`[FRONTEND] Erro pego no bloco CATCH para ${method} ${API_URL}${endpoint}:`, error.message);
            // Não lançar alert aqui para não duplicar, o chamador pode decidir
            throw error; // Re-lança o erro para ser tratado pelo chamador
        }
    }
    
    
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = e.target.username.value;
            const password = e.target.password.value;
            console.log(`[FRONTEND] Tentativa de registro para usuário: ${username}`);
    
            if (!username || !password) {
                alert('Usuário e senha são obrigatórios.');
                console.warn('[FRONTEND] Registro: Usuário ou senha em branco.');
                return;
            }
            if (password.length < 6) { // Assumindo que você tem essa validação
                alert('A senha deve ter pelo menos 6 caracteres.');
                console.warn('[FRONTEND] Registro: Senha curta.');
                return;
            }
    
            try {
                const data = await makeApiRequest('/register', 'POST', { username, password });
                console.log('[FRONTEND] Resposta da API de registro:', data);
                alert(data.message || 'Usuário aparentemente registrado! Faça o login.'); // Mensagem mais cautelosa
                window.location.href = 'login.html';
            } catch (error) {
                console.error('[FRONTEND] Erro no processo de registro (interface):', error.message);
                alert(`Erro no registro: ${error.message}`); // Mostra o erro que veio da API ou do fetch
            }
        });
    }
    

    if (loginForm) {
        const loginSubmitButton = document.getElementById('loginSubmitButton');
        const loginSuccessStateDiv = document.getElementById('loginSuccessState'); // Div de sucesso
        const goToDashboardButton = document.getElementById('goToDashboardButton'); // Botão para ir ao dashboard

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (loginSubmitButton) loginSubmitButton.disabled = true; // Desabilita durante a requisição

            const username = e.target.username.value;
            const password = e.target.password.value;

            if (!username || !password) {
                alert('Usuário e senha são obrigatórios.');
                if (loginSubmitButton) loginSubmitButton.disabled = false; // Reabilita se falhar a validação
                return;
            }

            try {
                const data = await makeApiRequest('/login', 'POST', { username, password });
                if (data.token && data.userId && data.username) {
                    // Login bem-sucedido
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('userId', data.userId);
                    localStorage.setItem('username', data.username);

                    // ANTES: window.location.href = 'dashboard.html';
                    // AGORA: Mostrar mensagem de sucesso e botão para o dashboard

                    if (loginForm) {
                        // Opcional: Esconder o formulário de login
                        // loginForm.style.display = 'none';
                        // Ou apenas os campos e o botão de submit original
                        loginForm.querySelector('div:nth-of-type(1)').style.display = 'none'; // Campo username
                        loginForm.querySelector('div:nth-of-type(2)').style.display = 'none'; // Campo password
                        if (loginSubmitButton) loginSubmitButton.style.display = 'none'; // Botão Entrar
                        loginForm.querySelector('p:nth-of-type(1)').style.display = 'none'; // Link Registrar
                        loginForm.querySelector('p:nth-of-type(2)').style.display = 'none'; // Link Voltar
                    }

                    if (loginSuccessStateDiv) {
                        loginSuccessStateDiv.style.display = 'block'; // Exibe a seção de sucesso
                    }

                    if (goToDashboardButton) {
                        goToDashboardButton.addEventListener('click', () => {
                            window.location.href = 'dashboard.html';
                        });
                    }

                } else {
                    // Falha no login (resposta da API indicando falha)
                    alert(data.message || 'Falha no login. Verifique suas credenciais.');
                    if (loginSubmitButton) loginSubmitButton.disabled = false; // Reabilita em caso de falha
                }
            } catch (error) {
                // Erro na requisição (ex: rede, servidor offline)
                alert(`Erro no login: ${error.message}`);
                if (loginSubmitButton) loginSubmitButton.disabled = false; // Reabilita em caso de erro
            }
        });
    }



    function handleLogout() {
        const token = getToken();
        if (token) {
             makeApiRequest('/logout', 'POST').catch(err => console.warn("Logout no servidor falhou:", err.message));
        }
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        window.location.href = 'index.html';
    }

    // --- Lógica da Página Principal (index.html) ---
    if (window.location.pathname.endsWith('dashboard.html')) { // ALTERADO DE index.html
        if (!getToken()) { // Movido para cima para checar antes de tentar pegar username
            window.location.href = 'login.html';
            return;
        }
    
        const username = getUsername(); // Pega o username só se tiver token
    
        // ... (resto da lógica para dashboard.html: currentUserSpan, botões, loadUsers, etc.)
        // Certifique-se que os IDs dos elementos (currentUserSpan, logoutButton, etc.)
        // ainda correspondem aos elementos em dashboard.html (que era o antigo index.html)
    
        if (currentUserSpan && username) currentUserSpan.textContent = username; // Adicionado check para username
        if (logoutButton) logoutButton.addEventListener('click', handleLogout);
    
        // ... (viewUsersButton, viewRequestsButton, loadUsers, updateReceivedRequestsCount)
        // Se você tiver essas funções, garanta que elas sejam chamadas aqui
        if (viewUsersButton) { // Exemplo
            viewUsersButton.addEventListener('click', () => {
                showSection('usersSection'); // Supondo que showSection ainda é relevante
                loadUsers();
            });
        }
         if (viewRequestsButton) { // Exemplo
            viewRequestsButton.addEventListener('click', () => {
                showSection('requestsSection');
                loadReceivedFriendRequests();
            });
        }
        // Carregar inicialmente
        if (usersSection) { // Garanta que usersSection existe antes de tentar mostrar
             showSection('usersSection'); // Se showSection for usada
             loadUsers();
        } else if (requestsSection && !usersSection) { // Caso a primeira aba seja a de requests
             showSection('requestsSection');
             loadReceivedFriendRequests();
        } else {
            // Carregar padrão se as seções não forem imediatamente visíveis ou controladas por botões
            loadUsers();
        }
        updateReceivedRequestsCount();
    
    
    }
    async function loadUsers() {
        if (!userListEl) return;
        userListEl.innerHTML = '<li>Carregando usuários...</li>';
        try {
            const users = await makeApiRequest('/users');
            userListEl.innerHTML = '';
            if (!users || users.length === 0) {
                userListEl.innerHTML = '<li>Nenhum outro usuário encontrado para interagir.</li>';
                return;
            }
            users.forEach(user => {
                const li = document.createElement('li');
                li.textContent = user.username;

                const sendBtn = document.createElement('button');
                sendBtn.textContent = 'Enviar Solicitação';
                sendBtn.classList.add('send-request-btn');
                sendBtn.dataset.userId = user.id;
                sendBtn.onclick = async () => {
                    try {
                        const data = await makeApiRequest('/friend-request', 'POST', { toUserId: user.id });
                        alert(data.message);
                        sendBtn.textContent = 'Solicitação Enviada';
                        sendBtn.disabled = true;
                    } catch (error) {
                        alert(`Erro ao enviar solicitação: ${error.message}`);
                    }
                };
                li.appendChild(sendBtn);
                userListEl.appendChild(li);
            });
        } catch (error) {
            userListEl.innerHTML = `<li>Erro ao carregar usuários: ${error.message}. Tente recarregar.</li>`;
        }
    }

    async function loadReceivedFriendRequests() {
        if (!receivedRequestsListEl) return;
        receivedRequestsListEl.innerHTML = '<li>Carregando solicitações...</li>';
        try {
            const requests = await makeApiRequest('/friend-requests/received');
            receivedRequestsListEl.innerHTML = '';
            if (!requests || requests.length === 0) {
                receivedRequestsListEl.innerHTML = '<li>Nenhuma solicitação de amizade recebida.</li>';
                if (requestCountSpan) requestCountSpan.textContent = '0';
                return;
            }
            if (requestCountSpan) requestCountSpan.textContent = requests.length;

            requests.forEach(req => {
                const li = document.createElement('li');
                li.innerHTML = `<span>De: <strong>${req.from_username}</strong></span>`;

                const btnDiv = document.createElement('div');
                const acceptBtn = document.createElement('button');
                acceptBtn.textContent = 'Aceitar';
                acceptBtn.classList.add('accept-request-btn');
                acceptBtn.onclick = () => respondToRequest(req.id, 'aceita');

                const rejectBtn = document.createElement('button');
                rejectBtn.textContent = 'Recusar';
                rejectBtn.classList.add('reject-request-btn');
                rejectBtn.onclick = () => respondToRequest(req.id, 'recusada');

                btnDiv.appendChild(acceptBtn);
                btnDiv.appendChild(rejectBtn);
                li.appendChild(btnDiv);
                receivedRequestsListEl.appendChild(li);
            });
        } catch (error) {
            receivedRequestsListEl.innerHTML = `<li>Erro ao carregar solicitações: ${error.message}</li>`;
            if (requestCountSpan) requestCountSpan.textContent = '0';
        }
    }

    async function updateReceivedRequestsCount() {
        if (!requestCountSpan) return;
        try {
            const requests = await makeApiRequest('/friend-requests/received');
            requestCountSpan.textContent = (requests && requests.length) ? requests.length.toString() : '0';
        } catch (error) {
            console.warn("Não foi possível atualizar a contagem de solicitações:", error.message);
            requestCountSpan.textContent = '0'; // Ou '?'
        }
    }


    async function respondToRequest(requestId, status) {
        try {
            const data = await makeApiRequest('/friend-requests/respond', 'POST', { requestId, status });
            alert(data.message);
            loadReceivedFriendRequests(); // Recarrega a lista de solicitações
            loadUsers(); // Recarrega usuários (pois o status de amizade pode ter mudado)
            updateReceivedRequestsCount(); // Atualiza o contador
        } catch (error) {
            alert(`Erro ao responder solicitação: ${error.message}`);
        }
    }

    if (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('register.html')) {
        if (getToken() && !document.getElementById('loginSuccessState')?.style.display?.includes('block')) { // Adicionada condição para não redirecionar se a mensagem de sucesso já estiver visível
            window.location.href = 'dashboard.html';
        }
    }
});