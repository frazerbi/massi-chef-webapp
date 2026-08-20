-- CL-1 (preventivo raggruppato per categorie): distinzione fra materiale di
-- APPARECCHIATURA (piatti, bicchieri, posate, tovaglie) e CONSUMABILI veri e
-- propri, che nel preventivo e nel PDF devono comparire in due gruppi
-- separati. La colonna `categoria` esistente è testo libero (default
-- 'generico') e non è affidabile per separarli: serve un enum chiuso.
--
-- Migrazione additiva e idempotente (regola §8: mai editare migrazioni già
-- applicate). Enum e colonna stanno nello stesso file: è un CREATE TYPE, non
-- un ALTER TYPE ... ADD VALUE, quindi nessun vincolo di transazione.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'categoria_consumabile_tipo') then
    create type categoria_consumabile_tipo as enum ('apparecchiatura', 'consumabile');
  end if;
end
$$;

alter table consumabile
  add column if not exists tipo_consumabile categoria_consumabile_tipo
  not null default 'consumabile';
