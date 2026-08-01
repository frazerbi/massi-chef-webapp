-- FEATURE-017: consente di inserire una materia prima direttamente in una
-- riga di menu/preventivo, senza passare da una ricetta (es. frutta, olive,
-- patatine già pronte). Nuovo valore enum isolato in una migrazione a parte:
-- ALTER TYPE ... ADD VALUE non può essere usato nella stessa transazione di
-- uno statement che referenzia il nuovo valore (limite di Postgres).
--
-- Migrazione additiva (regola §8: mai editare migrazioni già applicate).

alter type tipo_riga_preventivo add value 'materia_prima';
