-- FEATURE-016: consente di inserire a mano il valore "corretto" di una riga
-- di beveraggio al posto del calcolo automatico (correttivi → fattore di
-- distribuzione → scalatura ospiti). Il "teorico" resta sempre calcolato e
-- mostrato come suggerimento (§5.11): l'override sostituisce solo il
-- risultato finale usato per prezzare la categoria.
--
-- Migrazione additiva (regola §8: mai editare migrazioni già applicate).

alter table preventivo_beveraggio_riga
  add column if not exists volume_corretto_override numeric(12, 3)
    check (volume_corretto_override is null or volume_corretto_override >= 0);
