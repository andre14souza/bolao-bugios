-- ==========================================================
-- SCRIPT DE SEGURANÇA PARA TRAVA AUTOMÁTICA DE PALPITES
-- Cole este script no painel SQL Editor do seu Supabase.
-- ==========================================================

-- 1. Cria a função que valida o bloqueio temporal ou manual da partida
CREATE OR REPLACE FUNCTION check_guess_lock()
RETURNS TRIGGER AS $$
DECLARE
    match_date TIMESTAMP WITH TIME ZONE;
    match_locked BOOLEAN;
BEGIN
    -- Obter a data/hora e o status de bloqueio (locked) da partida
    SELECT date, locked INTO match_date, match_locked
    FROM matches
    WHERE id = NEW.match_id;

    -- Se a partida estiver travada pelo admin, ou se a hora atual do servidor (NOW())
    -- for maior ou igual ao horário do jogo, bloqueia o palpite.
    IF match_locked = TRUE OR (match_date IS NOT NULL AND NOW() >= match_date) THEN
        RAISE EXCEPTION 'Esta partida já começou! Palpites bloqueados.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Cria o trigger que roda a validação antes de qualquer inserção ou alteração na tabela de palpites
CREATE OR REPLACE TRIGGER trg_check_guess_lock
BEFORE INSERT OR UPDATE ON guesses
FOR EACH ROW
EXECUTE FUNCTION check_guess_lock();
