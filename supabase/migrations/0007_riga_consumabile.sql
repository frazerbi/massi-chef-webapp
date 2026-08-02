-- FEATURE-018 (seguito di 0006): colonne e vincoli per righe consumabile
-- dirette in menu_riga e preventivo_riga (piatti, bicchieri, posate,
-- tovaglioli monouso — non passano da una ricetta). Quantità = "a persona"
-- nell'unità d'uso del consumabile; la quantità evento si calcola live in
-- bozza e non viene mai salvata, coerente con l'invariante "le bozze
-- ricalcolano sempre live". A differenza delle righe materia_prima
-- (FEATURE-017), la quantità evento dei consumabili NON applica lo sfrido:
-- decisione esplicita dell'utente, non dedotta in silenzio.
--
-- Migrazione additiva (regola §8: mai editare migrazioni già applicate).

alter table menu_riga
  add column consumabile_id uuid references consumabile (id);

alter table menu_riga drop constraint riga_menu_coerente;
alter table menu_riga
  add constraint riga_menu_coerente check (
    (ricetta_id is not null and materia_prima_id is null and consumabile_id is null
      and quantita_persona is null)
    or
    (ricetta_id is null and materia_prima_id is not null and consumabile_id is null
      and quantita_persona is not null)
    or
    (ricetta_id is null and materia_prima_id is null and consumabile_id is not null
      and quantita_persona is not null)
  );

alter table preventivo_riga
  add column consumabile_id uuid references consumabile (id);

alter table preventivo_riga drop constraint riga_coerente;
alter table preventivo_riga
  add constraint riga_coerente check (
    (tipo_riga = 'ricetta' and ricetta_id is not null and materia_prima_id is null
      and consumabile_id is null)
    or
    (tipo_riga = 'materia_prima' and materia_prima_id is not null and ricetta_id is null
      and consumabile_id is null)
    or
    (tipo_riga = 'consumabile' and consumabile_id is not null and ricetta_id is null
      and materia_prima_id is null)
    or
    (tipo_riga = 'extra' and ricetta_id is null and materia_prima_id is null
      and consumabile_id is null)
  );

create index idx_menu_riga_consumabile on menu_riga (consumabile_id);
create index idx_preventivo_riga_consumabile on preventivo_riga (consumabile_id);
