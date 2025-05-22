-- Cria o banco de dados se ele não existir
CREATE DATABASE IF NOT EXISTS meu_app_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seleciona o banco de dados para usar
USE meu_app_db;

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Armazenará o hash da senha
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Solicitações de Amizade/Amizades
CREATE TABLE IF NOT EXISTS friend_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    status ENUM('pendente', 'aceita', 'recusada', 'desfeita') DEFAULT 'pendente',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_request_pair (from_user_id, to_user_id), -- Impede solicitações duplicadas diretas
    CONSTRAINT check_different_users CHECK (from_user_id <> to_user_id) -- Garante que um usuário não pode ser amigo de si mesmo
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices para melhorar a performance de buscas
CREATE INDEX idx_friend_requests_from_user_id ON friend_requests(from_user_id);
CREATE INDEX idx_friend_requests_to_user_id ON friend_requests(to_user_id);
CREATE INDEX idx_friend_requests_status ON friend_requests(status);

-- Adicionar um usuário de teste (opcional, mas bom para desenvolvimento inicial)
-- Lembre-se que a senha é 'senha123' antes do hash. O frontend/backend fará o hash.
-- INSERT INTO users (username, password) VALUES ('teste', '$2a$10$...'); -- Insira um hash válido se for popular manualmente