const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'seuSegredoSuperSecretoParaJWT-MUDEISSO';

app.use(cors());
app.use(express.json());

const dbConfig = {
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'meu_app_user',
    password: process.env.DB_PASSWORD || 'meu_app_password',
    database: process.env.DB_NAME || 'meu_app_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool;

async function initializeDb(retries = 5, delay = 5000) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`[BACKEND] Tentativa de conexão DB ${i + 1}/${retries}... Host: ${dbConfig.host}, User: ${dbConfig.user}, DB: ${dbConfig.database}`);
            pool = mysql.createPool(dbConfig);
            const connection = await pool.getConnection();
            const [rows] = await connection.query('SELECT 1 AS db_status');
            connection.release();
            console.log('[BACKEND] >>> Checagem do DB retornou:', rows[0] ? rows[0].db_status : 'N/A', '<<<<');
            console.log('[BACKEND] ***** Conexão com MySQL estabelecida com SUCESSO! *****');
            return;
        } catch (error) {
            console.error(`[BACKEND] FALHA na tentativa de conexão DB ${i + 1}/${retries}: ${error.message}`);
            if (error.code) console.error(`[BACKEND] Código de Erro MySQL: ${error.code}, Estado SQL: ${error.sqlState}`);
            
            if (i === retries - 1) {
                console.error('[BACKEND] ERRO FATAL: Não foi possível conectar ao MySQL após múltiplas tentativas. O backend será encerrado.');
                process.exit(1);
            }
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}


initializeDb();

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // Se não há token, não autorizado

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("Erro na verificação do JWT:", err.message);
            return res.sendStatus(403); // Token não é mais válido
        }
        req.user = user; // Adiciona os dados do usuário (do token) à requisição
        next();
    });
};

// --- Rotas ---

// Rota de Registro (POST /register)
app.post('/register', async (req, res) => {
    console.log('[BACKEND] Rota /register ACIONADA.');
    console.log('[BACKEND] Conteúdo de req.body (registro):', JSON.stringify(req.body, null, 2)); // Crucial para ver o que chega

    const { username, password } = req.body;

    if (!username || !password) {
        console.warn('[BACKEND] /register: Usuário ou senha ausentes no req.body.');
        return res.status(400).json({ message: 'Dados incompletos: Usuário e senha são obrigatórios.' });
    }
    console.log(`[BACKEND] /register: Processando registro para usuário: ${username}`);

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(`[BACKEND] /register: Senha hashada para ${username}.`);

        const sqlQuery = 'INSERT INTO users (username, password) VALUES (?, ?)';
        console.log(`[BACKEND] /register: SQL Query a ser executada: ${sqlQuery}`);
        console.log(`[BACKEND] /register: Parâmetros: [${username}, 'SENHA_HASHADA']`);

        if (!pool) { // Verifica se o pool de conexões está disponível
            console.error('[BACKEND] /register: ERRO CRÍTICO - Pool de conexões do banco não está inicializado!');
            return res.status(500).json({ message: 'Erro interno no servidor: Problema com a conexão do banco de dados.' });
        }

        const [result] = await pool.query(sqlQuery, [username, hashedPassword]);
        console.log('[BACKEND] /register: Resultado da query de inserção:', result);

        if (result && result.affectedRows > 0) {
            console.log(`[BACKEND] /register: Usuário ${username} registrado com SUCESSO. ID: ${result.insertId}`);
            res.status(201).json({ message: 'Usuário registrado com sucesso!', userId: result.insertId });
        } else {
            console.error(`[BACKEND] /register: Inserção FALHOU para ${username}. affectedRows: ${result ? result.affectedRows : 'N/A'}.`);
            res.status(500).json({ message: 'Falha ao registrar usuário (nenhuma linha afetada).' });
        }
    } catch (error) {
        console.error(`[BACKEND] /register: ERRO no bloco catch durante o registro de ${username}: ${error.message}`);
        if (error.code === 'ER_DUP_ENTRY') {
            console.warn(`[BACKEND] /register: Tentativa de registrar usuário duplicado: ${username}.`);
            return res.status(409).json({ message: 'Este nome de usuário já está em uso.' });
        }
        if (error.sqlMessage) { // Log mais detalhado do erro SQL
             console.error(`[BACKEND] /register: Detalhes do Erro SQL: Code: ${error.code}, Message: ${error.sqlMessage}`);
        }
        res.status(500).json({ message: 'Erro interno no servidor ao tentar registrar usuário.' });
    }
});


// Rota de Login (POST /login)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Usuário não encontrado.' });
        }

        const user = rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ message: 'Senha inválida.' });
        }

        const tokenPayload = { userId: user.id, username: user.username };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' }); // Token expira em 1 hora

        res.json({
            message: 'Login bem-sucedido!',
            token,
            userId: user.id,
            username: user.username
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro no servidor durante o login.' });
    }
});

// Rota para Listar Usuários (GET /users - protegida)
app.get('/users', authenticateToken, async (req, res) => {
    try {
        const currentUserId = req.user.userId;
        // Lista todos os usuários exceto o próprio usuário logado e que não são amigos ainda (simplificado aqui)
        // Para uma lógica de "não amigos", você precisaria checar a tabela friend_requests
        const [users] = await pool.query(
            `SELECT id, username FROM users WHERE id != ? 
             AND id NOT IN (
                 SELECT CASE
                            WHEN from_user_id = ? THEN to_user_id
                            WHEN to_user_id = ? THEN from_user_id
                        END
                 FROM friend_requests
                 WHERE (from_user_id = ? OR to_user_id = ?) AND status = 'aceita'
             )
             AND id NOT IN (
                 SELECT to_user_id FROM friend_requests WHERE from_user_id = ? AND status = 'pendente'
             )`,
            [currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, currentUserId]
        );
        res.json(users);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ message: 'Erro ao buscar usuários.' });
    }
});

// Rota para Enviar Solicitação de Amizade (POST /friend-request - protegida)
app.post('/friend-request', authenticateToken, async (req, res) => {
    const fromUserId = req.user.userId;
    const { toUserId } = req.body;

    if (!toUserId) {
        return res.status(400).json({ message: 'ID do destinatário é obrigatório.' });
    }
    if (fromUserId === parseInt(toUserId)) {
        return res.status(400).json({ message: 'Você não pode enviar uma solicitação para si mesmo.' });
    }

    try {
        // Verificar se já existe uma solicitação ou amizade
        const [existing] = await pool.query(
            'SELECT * FROM friend_requests WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)',
            [fromUserId, toUserId, toUserId, fromUserId]
        );
        if (existing.length > 0) {
            if (existing[0].status === 'aceita') {
                 return res.status(409).json({ message: 'Vocês já são amigos.' });
            } else if (existing[0].status === 'pendente') {
                 return res.status(409).json({ message: 'Solicitação já enviada ou recebida e pendente.' });
            }
        }

        await pool.query(
            'INSERT INTO friend_requests (from_user_id, to_user_id, status) VALUES (?, ?, ?)',
            [fromUserId, toUserId, 'pendente']
        );
        res.status(201).json({ message: 'Solicitação de amizade enviada!' });
    } catch (error) {
        console.error('Erro ao enviar solicitação de amizade:', error);
        res.status(500).json({ message: 'Erro ao enviar solicitação.' });
    }
});

// Rota para Ver Solicitações de Amizade Recebidas (GET /friend-requests/received - protegida)
app.get('/friend-requests/received', authenticateToken, async (req, res) => {
    const currentUserId = req.user.userId;
    try {
        const [requests] = await pool.query(
            `SELECT fr.id, fr.from_user_id, u.username as from_username, fr.status
             FROM friend_requests fr
             JOIN users u ON fr.from_user_id = u.id
             WHERE fr.to_user_id = ? AND fr.status = 'pendente'`,
            [currentUserId]
        );
        res.json(requests);
    } catch (error) {
        console.error('Erro ao buscar solicitações recebidas:', error);
        res.status(500).json({ message: 'Erro ao buscar solicitações.' });
    }
});

// Rota para Responder Solicitação de Amizade (POST /friend-requests/respond - protegida)
app.post('/friend-requests/respond', authenticateToken, async (req, res) => {
    const currentUserId = req.user.userId;
    const { requestId, status } = req.body; // status pode ser 'aceita' ou 'recusada'

    if (!requestId || !status || !['aceita', 'recusada'].includes(status)) {
        return res.status(400).json({ message: 'ID da solicitação e status (aceita/recusada) são obrigatórios.' });
    }

    try {
        const [requestCheck] = await pool.query(
            'SELECT * FROM friend_requests WHERE id = ? AND to_user_id = ? AND status = "pendente"',
            [requestId, currentUserId]
        );

        if (requestCheck.length === 0) {
            return res.status(404).json({ message: 'Solicitação não encontrada ou já respondida, ou não destinada a você.' });
        }

        await pool.query(
            'UPDATE friend_requests SET status = ? WHERE id = ?',
            [status, requestId]
        );
        res.json({ message: `Solicitação ${status === 'aceita' ? 'aceita' : 'recusada'} com sucesso!` });
    } catch (error) {
        console.error('Erro ao responder solicitação:', error);
        res.status(500).json({ message: 'Erro ao responder solicitação.' });
    }
});

// Rota de Logout (POST /logout - protegida)
// Para um logout real do lado do servidor com JWT, você precisaria de uma blacklist de tokens.
// Por simplicidade, esta rota apenas confirma o logout, o frontend remove o token.
app.post('/logout', authenticateToken, (req, res) => {
    // Aqui você poderia adicionar o token a uma blacklist se estivesse usando uma.
    // Ex: redis.sadd('jwt_blacklist', req.headers['authorization'].split(' ')[1]);
    res.json({ message: 'Logout bem-sucedido no servidor.' });
});


// Rota de Teste
app.get('/', (req, res) => {
    res.send('Backend Meu App Simples funcionando!');
});

app.listen(PORT, '0.0.0.0', () => { // Escuta em todas as interfaces de rede dentro do container
    console.log(`Backend rodando na porta ${PORT}`);
});