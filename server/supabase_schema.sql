-- =======================================================
-- SCRIPT DE CRIAÇÃO E CARGA DE DADOS PARA SUPABASE
-- Cole este script no painel SQL Editor do seu Supabase
-- =======================================================

-- 1. Criação das Tabelas

CREATE TABLE IF NOT EXISTS users (
    id SERIAL UNIQUE,
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    home_score INTEGER,
    away_score INTEGER,
    date TIMESTAMP WITH TIME ZONE,
    stage TEXT,
    group_name TEXT,
    locked BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS guesses (
    user_name TEXT,
    match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
    guess_home INTEGER,
    guess_away INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_name, match_id)
);

CREATE TABLE IF NOT EXISTS group_qualifiers (
    user_name TEXT,
    group_name TEXT,
    first_place TEXT,
    second_place TEXT,
    third_place TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_name, group_name)
);

CREATE TABLE IF NOT EXISTS group_qualifiers_results (
    group_name TEXT PRIMARY KEY,
    first_place TEXT,
    second_place TEXT,
    third_place TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS bracket_guesses (
    user_name TEXT PRIMARY KEY,
    oitavas JSONB,
    quartas JSONB,
    semis JSONB,
    finalists JSONB,
    champion TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS bracket_results (
    id INTEGER PRIMARY KEY DEFAULT 1,
    oitavas JSONB,
    quartas JSONB,
    semis JSONB,
    finalists JSONB,
    champion TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS oracle_guesses (
    user_name TEXT PRIMARY KEY,
    champion TEXT,
    top_scorer TEXT,
    best_attack TEXT,
    zebra TEXT,
    first_red_card TEXT,
    deception TEXT,
    most_goals_match TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS oracle_results (
    id INTEGER PRIMARY KEY DEFAULT 1,
    champion TEXT,
    top_scorer TEXT,
    best_attack TEXT,
    zebra TEXT,
    first_red_card TEXT,
    deception TEXT,
    most_goals_match TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar acesso público
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE guesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_qualifiers DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_qualifiers_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE bracket_guesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE bracket_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_guesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_results DISABLE ROW LEVEL SECURITY;

-- Limpar dados antigos
TRUNCATE TABLE guesses CASCADE;
TRUNCATE TABLE group_qualifiers CASCADE;
TRUNCATE TABLE group_qualifiers_results CASCADE;
TRUNCATE TABLE bracket_guesses CASCADE;
TRUNCATE TABLE bracket_results CASCADE;
TRUNCATE TABLE oracle_guesses CASCADE;
TRUNCATE TABLE oracle_results CASCADE;
TRUNCATE TABLE matches CASCADE;
TRUNCATE TABLE users CASCADE;

-- 2. Inserir Usuários Iniciais
INSERT INTO users (username, password) VALUES
('andre', '123'),
('Maicon', '123'),
('Brenno', '123'),
('Victor', '123');

-- 3. Inserir Partidas Iniciais
INSERT INTO matches (id, home_team, away_team, home_score, away_score, date, stage, group_name) VALUES
(1, 'México', 'África do Sul', 2, 0, '2026-06-11T16:00:00', 'group', 'Grupo A'),
(2, 'Coreia do Sul', 'Tchéquia', 2, 1, '2026-06-11T23:00:00', 'group', 'Grupo A'),
(3, 'Tchéquia', 'África do Sul', NULL, NULL, '2026-06-18T13:00:00', 'group', 'Grupo A'),
(4, 'México', 'Coreia do Sul', NULL, NULL, '2026-06-18T22:00:00', 'group', 'Grupo A'),
(5, 'Tchéquia', 'México', NULL, NULL, '2026-06-24T22:00:00', 'group', 'Grupo A'),
(6, 'África do Sul', 'Coreia do Sul', NULL, NULL, '2026-06-24T22:00:00', 'group', 'Grupo A'),
(7, 'Canadá', 'Bósnia e Herzegovina', NULL, NULL, '2026-06-12T16:00:00', 'group', 'Grupo B'),
(8, 'Catar', 'Suíça', NULL, NULL, '2026-06-13T16:00:00', 'group', 'Grupo B'),
(9, 'Suíça', 'Bósnia e Herzegovina', NULL, NULL, '2026-06-18T16:00:00', 'group', 'Grupo B'),
(10, 'Canadá', 'Catar', NULL, NULL, '2026-06-18T19:00:00', 'group', 'Grupo B'),
(11, 'Suíça', 'Canadá', NULL, NULL, '2026-06-24T16:00:00', 'group', 'Grupo B'),
(12, 'Bósnia e Herzegovina', 'Catar', NULL, NULL, '2026-06-24T16:00:00', 'group', 'Grupo B'),
(13, 'Brasil', 'Marrocos', NULL, NULL, '2026-06-13T19:00:00', 'group', 'Grupo C'),
(14, 'Haiti', 'Escócia', NULL, NULL, '2026-06-13T22:00:00', 'group', 'Grupo C'),
(15, 'Escócia', 'Marrocos', NULL, NULL, '2026-06-19T19:00:00', 'group', 'Grupo C'),
(16, 'Brasil', 'Haiti', NULL, NULL, '2026-06-19T21:30:00', 'group', 'Grupo C'),
(17, 'Escócia', 'Brasil', NULL, NULL, '2026-06-24T19:00:00', 'group', 'Grupo C'),
(18, 'Marrocos', 'Haiti', NULL, NULL, '2026-06-24T19:00:00', 'group', 'Grupo C'),
(19, 'Estados Unidos', 'Paraguai', NULL, NULL, '2026-06-12T22:00:00', 'group', 'Grupo D'),
(20, 'Austrália', 'Turquia', NULL, NULL, '2026-06-14T01:00:00', 'group', 'Grupo D'),
(21, 'Estados Unidos', 'Austrália', NULL, NULL, '2026-06-19T16:00:00', 'group', 'Grupo D'),
(22, 'Turquia', 'Paraguai', NULL, NULL, '2026-06-19T01:00:00', 'group', 'Grupo D'),
(23, 'Turquia', 'Estados Unidos', NULL, NULL, '2026-06-25T23:00:00', 'group', 'Grupo D'),
(24, 'Paraguai', 'Austrália', NULL, NULL, '2026-06-25T23:00:00', 'group', 'Grupo D'),
(25, 'Alemanha', 'Curaçao', NULL, NULL, '2026-06-14T14:00:00', 'group', 'Grupo E'),
(26, 'Costa do Marfim', 'Equador', NULL, NULL, '2026-06-14T20:00:00', 'group', 'Grupo E'),
(27, 'Alemanha', 'Costa do Marfim', NULL, NULL, '2026-06-20T17:00:00', 'group', 'Grupo E'),
(28, 'Equador', 'Curaçao', NULL, NULL, '2026-06-20T21:00:00', 'group', 'Grupo E'),
(29, 'Equador', 'Alemanha', NULL, NULL, '2026-06-25T17:00:00', 'group', 'Grupo E'),
(30, 'Curaçao', 'Costa do Marfim', NULL, NULL, '2026-06-25T17:00:00', 'group', 'Grupo E'),
(31, 'Holanda', 'Japão', NULL, NULL, '2026-06-14T17:00:00', 'group', 'Grupo F'),
(32, 'Suécia', 'Tunísia', NULL, NULL, '2026-06-14T23:00:00', 'group', 'Grupo F'),
(33, 'Holanda', 'Suécia', NULL, NULL, '2026-06-20T14:00:00', 'group', 'Grupo F'),
(34, 'Tunísia', 'Japão', NULL, NULL, '2026-06-21T01:00:00', 'group', 'Grupo F'),
(35, 'Japão', 'Suécia', NULL, NULL, '2026-06-25T20:00:00', 'group', 'Grupo F'),
(36, 'Tunísia', 'Holanda', NULL, NULL, '2026-06-25T20:00:00', 'group', 'Grupo F'),
(37, 'Bélgica', 'Egito', NULL, NULL, '2026-06-15T16:00:00', 'group', 'Grupo G'),
(38, 'Irã', 'Nova Zelândia', NULL, NULL, '2026-06-15T22:00:00', 'group', 'Grupo G'),
(39, 'Bélgica', 'Irã', NULL, NULL, '2026-06-21T16:00:00', 'group', 'Grupo G'),
(40, 'Nova Zelândia', 'Egito', NULL, NULL, '2026-06-21T22:00:00', 'group', 'Grupo G'),
(41, 'Egito', 'Irã', NULL, NULL, '2026-06-26T00:00:00', 'group', 'Grupo G'),
(42, 'Nova Zelândia', 'Bélgica', NULL, NULL, '2026-06-26T00:00:00', 'group', 'Grupo G'),
(43, 'Espanha', 'Cabo Verde', NULL, NULL, '2026-06-15T13:00:00', 'group', 'Grupo H'),
(44, 'Arábia Saudita', 'Uruguai', NULL, NULL, '2026-06-15T19:00:00', 'group', 'Grupo H'),
(45, 'Espanha', 'Arábia Saudita', NULL, NULL, '2026-06-21T13:00:00', 'group', 'Grupo H'),
(46, 'Uruguai', 'Cabo Verde', NULL, NULL, '2026-06-21T19:00:00', 'group', 'Grupo H'),
(47, 'Cabo Verde', 'Arábia Saudita', NULL, NULL, '2026-06-26T21:00:00', 'group', 'Grupo H'),
(48, 'Uruguai', 'Espanha', NULL, NULL, '2026-06-26T21:00:00', 'group', 'Grupo H'),
(49, 'França', 'Senegal', NULL, NULL, '2026-06-16T16:00:00', 'group', 'Grupo I'),
(50, 'Iraque', 'Noruega', NULL, NULL, '2026-06-16T19:00:00', 'group', 'Grupo I'),
(51, 'França', 'Iraque', NULL, NULL, '2026-06-22T18:00:00', 'group', 'Grupo I'),
(52, 'Noruega', 'Senegal', NULL, NULL, '2026-06-22T21:00:00', 'group', 'Grupo I'),
(53, 'Noruega', 'França', NULL, NULL, '2026-06-26T16:00:00', 'group', 'Grupo I'),
(54, 'Senegal', 'Iraque', NULL, NULL, '2026-06-26T16:00:00', 'group', 'Grupo I'),
(55, 'Argentina', 'Argélia', NULL, NULL, '2026-06-16T22:00:00', 'group', 'Grupo J'),
(56, 'Áustria', 'Jordânia', NULL, NULL, '2026-06-17T01:00:00', 'group', 'Grupo J'),
(57, 'Argentina', 'Áustria', NULL, NULL, '2026-06-22T14:00:00', 'group', 'Grupo J'),
(58, 'Jordânia', 'Argélia', NULL, NULL, '2026-06-23T00:00:00', 'group', 'Grupo J'),
(59, 'Argélia', 'Áustria', NULL, NULL, '2026-06-27T23:00:00', 'group', 'Grupo J'),
(60, 'Jordânia', 'Argentina', NULL, NULL, '2026-06-27T23:00:00', 'group', 'Grupo J'),
(61, 'Portugal', 'RD Congo', NULL, NULL, '2026-06-17T14:00:00', 'group', 'Grupo K'),
(62, 'Uzbequistão', 'Colômbia', NULL, NULL, '2026-06-17T23:00:00', 'group', 'Grupo K'),
(63, 'Portugal', 'Uzbequistão', NULL, NULL, '2026-06-23T14:00:00', 'group', 'Grupo K'),
(64, 'Colômbia', 'RD Congo', NULL, NULL, '2026-06-23T23:00:00', 'group', 'Grupo K'),
(65, 'Colômbia', 'Portugal', NULL, NULL, '2026-06-27T19:30:00', 'group', 'Grupo K'),
(66, 'RD Congo', 'Uzbequistão', NULL, NULL, '2026-06-27T19:30:00', 'group', 'Grupo K'),
(67, 'Inglaterra', 'Croácia', NULL, NULL, '2026-06-17T17:00:00', 'group', 'Grupo L'),
(68, 'Gana', 'Panamá', NULL, NULL, '2026-06-17T20:00:00', 'group', 'Grupo L'),
(69, 'Inglaterra', 'Gana', NULL, NULL, '2026-06-23T17:00:00', 'group', 'Grupo L'),
(70, 'Panamá', 'Croácia', NULL, NULL, '2026-06-23T20:00:00', 'group', 'Grupo L'),
(71, 'Panamá', 'Inglaterra', NULL, NULL, '2026-06-27T17:00:00', 'group', 'Grupo L'),
(72, 'Croácia', 'Gana', NULL, NULL, '2026-06-27T17:00:00', 'group', 'Grupo L'),
(73, '16-avos (Casa #1)', '16-avos (Fora #1)', NULL, NULL, '2026-06-28T17:00:00', 'knockout', '16-avos de Final'),
(74, '16-avos (Casa #2)', '16-avos (Fora #2)', NULL, NULL, '2026-06-28T21:00:00', 'knockout', '16-avos de Final'),
(75, '16-avos (Casa #3)', '16-avos (Fora #3)', NULL, NULL, '2026-06-29T17:00:00', 'knockout', '16-avos de Final'),
(76, '16-avos (Casa #4)', '16-avos (Fora #4)', NULL, NULL, '2026-06-29T21:00:00', 'knockout', '16-avos de Final'),
(77, '16-avos (Casa #5)', '16-avos (Fora #5)', NULL, NULL, '2026-06-30T17:00:00', 'knockout', '16-avos de Final'),
(78, '16-avos (Casa #6)', '16-avos (Fora #6)', NULL, NULL, '2026-06-30T21:00:00', 'knockout', '16-avos de Final'),
(79, '16-avos (Casa #7)', '16-avos (Fora #7)', NULL, NULL, '2026-07-01T17:00:00', 'knockout', '16-avos de Final'),
(80, '16-avos (Casa #8)', '16-avos (Fora #8)', NULL, NULL, '2026-07-01T21:00:00', 'knockout', '16-avos de Final'),
(81, '16-avos (Casa #9)', '16-avos (Fora #9)', NULL, NULL, '2026-07-02T17:00:00', 'knockout', '16-avos de Final'),
(82, '16-avos (Casa #10)', '16-avos (Fora #10)', NULL, NULL, '2026-07-02T17:00:00', 'knockout', '16-avos de Final'),
(83, '16-avos (Casa #11)', '16-avos (Fora #11)', NULL, NULL, '2026-07-02T21:00:00', 'knockout', '16-avos de Final'),
(84, '16-avos (Casa #12)', '16-avos (Fora #12)', NULL, NULL, '2026-07-03T17:00:00', 'knockout', '16-avos de Final'),
(85, '16-avos (Casa #13)', '16-avos (Fora #13)', NULL, NULL, '2026-07-03T17:00:00', 'knockout', '16-avos de Final'),
(86, '16-avos (Casa #14)', '16-avos (Fora #14)', NULL, NULL, '2026-07-03T21:00:00', 'knockout', '16-avos de Final'),
(87, '16-avos (Casa #15)', '16-avos (Fora #15)', NULL, NULL, '2026-07-03T21:00:00', 'knockout', '16-avos de Final'),
(88, '16-avos (Casa #16)', '16-avos (Fora #16)', NULL, NULL, '2026-07-03T22:00:00', 'knockout', '16-avos de Final'),
(89, 'Oitavas (Casa #1)', 'Oitavas (Fora #1)', NULL, NULL, '2026-07-04T17:00:00', 'knockout', 'Oitavas de Final'),
(90, 'Oitavas (Casa #2)', 'Oitavas (Fora #2)', NULL, NULL, '2026-07-04T21:30:00', 'knockout', 'Oitavas de Final'),
(91, 'Oitavas (Casa #3)', 'Oitavas (Fora #3)', NULL, NULL, '2026-07-05T17:00:00', 'knockout', 'Oitavas de Final'),
(92, 'Oitavas (Casa #4)', 'Oitavas (Fora #4)', NULL, NULL, '2026-07-05T21:30:00', 'knockout', 'Oitavas de Final'),
(93, 'Oitavas (Casa #5)', 'Oitavas (Fora #5)', NULL, NULL, '2026-07-06T17:00:00', 'knockout', 'Oitavas de Final'),
(94, 'Oitavas (Casa #6)', 'Oitavas (Fora #6)', NULL, NULL, '2026-07-06T21:30:00', 'knockout', 'Oitavas de Final'),
(95, 'Oitavas (Casa #7)', 'Oitavas (Fora #7)', NULL, NULL, '2026-07-07T17:00:00', 'knockout', 'Oitavas de Final'),
(96, 'Oitavas (Casa #8)', 'Oitavas (Fora #8)', NULL, NULL, '2026-07-07T21:30:00', 'knockout', 'Oitavas de Final'),
(97, 'Quartas (Casa #1)', 'Quartas (Fora #1)', NULL, NULL, '2026-07-09T17:00:00', 'knockout', 'Quartas de Final'),
(98, 'Quartas (Casa #2)', 'Quartas (Fora #2)', NULL, NULL, '2026-07-10T17:00:00', 'knockout', 'Quartas de Final'),
(99, 'Quartas (Casa #3)', 'Quartas (Fora #3)', NULL, NULL, '2026-07-11T17:00:00', 'knockout', 'Quartas de Final'),
(100, 'Quartas (Casa #4)', 'Quartas (Fora #4)', NULL, NULL, '2026-07-11T21:00:00', 'knockout', 'Quartas de Final'),
(101, 'Semifinalista #1', 'Semifinalista #2', NULL, NULL, '2026-07-14T21:00:00', 'knockout', 'Semifinal'),
(102, 'Semifinalista #3', 'Semifinalista #4', NULL, NULL, '2026-07-15T21:00:00', 'knockout', 'Semifinal'),
(103, 'Perdedor Semi 1', 'Perdedor Semi 2', NULL, NULL, '2026-07-18T17:00:00', 'knockout', 'Disputa do 3º Lugar'),
(104, 'Finalista #1', 'Finalista #2', NULL, NULL, '2026-07-19T16:00:00', 'knockout', 'Final');


-- 4. Inserir Palpites de Placar
INSERT INTO guesses (user_name, match_id, guess_home, guess_away) VALUES
('Brenno', 1, 2, 0),
('Brenno', 2, 2, 0),
('andre', 1, 2, 0),
('andre', 2, 1, 1),
('Maicon', 1, 1, 0),
('Maicon', 2, 2, 1),
('Victor', 1, 2, 0),
('Victor', 2, 1, 2),
('andre', 7, 1, 0),
('andre', 19, 2, 1),
('Brenno', 7, 2, 0),
('Brenno', 19, 0, 1),
('Maicon', 7, 2, 0),
('Maicon', 19, 2, 0),
('Victor', 7, 1, 1),
('Victor', 19, 1, 1);


-- 6. Inserir Resultados Oficiais dos Grupos
INSERT INTO group_qualifiers_results (group_name, first_place, second_place, third_place) VALUES
('Grupo A', NULL, NULL, NULL),
('Grupo B', NULL, NULL, NULL),
('Grupo C', NULL, NULL, NULL),
('Grupo D', NULL, NULL, NULL),
('Grupo E', NULL, NULL, NULL),
('Grupo F', NULL, NULL, NULL),
('Grupo G', NULL, NULL, NULL),
('Grupo H', NULL, NULL, NULL),
('Grupo I', NULL, NULL, NULL),
('Grupo J', NULL, NULL, NULL),
('Grupo K', NULL, NULL, NULL),
('Grupo L', NULL, NULL, NULL);


-- 8. Inserir Resultados Oficiais de Chaveamento
INSERT INTO bracket_results (id, oitavas, quartas, semis, finalists, champion) VALUES
(1, '[]', '[]', '[]', '[]', NULL);


-- 10. Inserir Resultados Oficiais do Oraculo
INSERT INTO oracle_results (id, champion, top_scorer, best_attack, zebra, first_red_card, deception, most_goals_match) VALUES
(1, NULL, NULL, NULL, NULL, NULL, NULL, NULL);


-- 11. Triggers de Trava de Palpites (Segurança do Banco de Dados)
CREATE OR REPLACE FUNCTION check_guess_lock()
RETURNS TRIGGER AS $$
DECLARE
    match_date TIMESTAMP WITH TIME ZONE;
    match_locked BOOLEAN;
BEGIN
    -- Obter a data e o status de bloqueio da partida
    SELECT date, locked INTO match_date, match_locked
    FROM matches
    WHERE id = NEW.match_id;

    -- Verificar se a partida já começou ou se foi travada pelo admin
    IF match_locked = TRUE OR (match_date IS NOT NULL AND NOW() >= match_date) THEN
        RAISE EXCEPTION 'Esta partida já começou! Palpites bloqueados.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_check_guess_lock
BEFORE INSERT OR UPDATE ON guesses
FOR EACH ROW
EXECUTE FUNCTION check_guess_lock();


