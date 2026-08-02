-- FEATURE-018: consente di inserire un consumabile (piatti, bicchieri,
-- posate, tovaglioli monouso) direttamente in una riga di menu/preventivo,
-- collegato all'anagrafica, sullo stesso pattern di FEATURE-017 per le
-- materie prime dirette. Nuovo valore enum isolato in una migrazione a
-- parte: ALTER TYPE ... ADD VALUE non può essere usato nella stessa
-- transazione di uno statement che referenzia il nuovo valore (limite di
-- Postgres).
--
-- Migrazione additiva (regola §8: mai editare migrazioni già applicate).

alter type tipo_riga_preventivo add value 'consumabile';
