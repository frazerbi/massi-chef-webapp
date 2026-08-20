-- FEATURE-009: marca del prodotto sulla materia prima (es. "Mutti", "Barilla").
-- Campo puramente descrittivo: non entra in nessun calcolo di costo, serve a
-- ritrovare in negozio esattamente il prodotto su cui e' tarato il food cost.
-- Nullable, nessun default: le materie prime esistenti restano senza marca.
--
-- Migrazione additiva e idempotente (regola §8).

alter table materia_prima
  add column if not exists marca text;
