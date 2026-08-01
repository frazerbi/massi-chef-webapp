-- FEATURE-017 (seguito di 0004): colonne e vincoli per righe materia prima
-- dirette in menu_riga e preventivo_riga (frutta, olive, patatine — non
-- passano da una ricetta). Quantità = "a persona" nell'unità d'uso della
-- materia prima; la quantità evento (a persona × ospiti × (1+sfrido%), §5)
-- si calcola live in bozza e non viene mai salvata, coerente con
-- l'invariante "le bozze ricalcolano sempre live".
--
-- Migrazione additiva (regola §8: mai editare migrazioni già applicate).

alter table menu_riga
  alter column ricetta_id drop not null,
  add column materia_prima_id uuid references materia_prima (id),
  add column quantita_persona numeric(12, 3)
    check (quantita_persona is null or quantita_persona > 0);

alter table menu_riga
  add constraint riga_menu_coerente check (
    (ricetta_id is not null and materia_prima_id is null and quantita_persona is null)
    or
    (ricetta_id is null and materia_prima_id is not null and quantita_persona is not null)
  );

alter table preventivo_riga
  add column materia_prima_id uuid references materia_prima (id);

alter table preventivo_riga drop constraint riga_coerente;
alter table preventivo_riga
  add constraint riga_coerente check (
    (tipo_riga = 'ricetta' and ricetta_id is not null and materia_prima_id is null)
    or
    (tipo_riga = 'materia_prima' and materia_prima_id is not null and ricetta_id is null)
    or
    (tipo_riga = 'extra' and ricetta_id is null and materia_prima_id is null)
  );

create index idx_menu_riga_materia_prima on menu_riga (materia_prima_id);
create index idx_preventivo_riga_materia_prima on preventivo_riga (materia_prima_id);
