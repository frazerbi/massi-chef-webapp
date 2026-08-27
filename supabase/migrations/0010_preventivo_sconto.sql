-- FEATURE-021: sconto commerciale percentuale sul preventivo (es. "amico 20%").
--
-- Lo sconto vive sul preventivo, non su una riga: e' una percentuale applicata
-- al prezzo proposto DOPO la somma delle righe (o dopo il prezzo totale
-- impostato a mano, che da qui in poi si intende SEMPRE al lordo dello sconto).
-- Non tocca i costi: food cost, costo extra e costo totale restano quelli;
-- cambiano prezzo finale, utile e margine effettivo, che ora si calcolano sul
-- prezzo netto effettivamente proposto al cliente.
--
-- Le bozze ricalcolano live come sempre; sui preventivi inviati il valore e'
-- gia' immutabile (nessuna scrittura passa il controllo di stato), quindi non
-- serve congelarlo nello snapshot.
--
-- Default 0: tutti i preventivi esistenti restano identici, senza sconto.
-- Migrazione additiva e idempotente (regola §8).

alter table preventivo
  add column if not exists sconto_pct numeric(5, 2) not null default 0,
  add column if not exists sconto_descrizione text;

do $$
begin
  alter table preventivo add constraint sconto_pct_valido
    check (sconto_pct >= 0 and sconto_pct < 100);
exception
  when duplicate_object then null;
end
$$;

comment on column preventivo.sconto_pct is
  'FEATURE-021: sconto commerciale in % sul prezzo proposto lordo (0 = nessuno)';
comment on column preventivo.sconto_descrizione is
  'FEATURE-021: motivo dello sconto mostrato al cliente sul PDF (es. "Sconto amico")';
comment on column preventivo.prezzo_totale_cent is
  'Prezzo proposto AL LORDO dello sconto (vuoto = somma dei prezzi riga)';
