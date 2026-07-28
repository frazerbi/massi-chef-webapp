-- Fase 1 (seguito) — BUG-001: consente più prodotti (bevande) sotto la stessa
-- categoria di beveraggio in un preventivo. Prima un preventivo poteva avere
-- un solo bevanda_id per categoria (colonna su preventivo_beveraggio_riga),
-- e assegnarne un secondo sovrascriveva il primo.
--
-- Migrazione additiva (regola §8: mai editare migrazioni già applicate):
-- preventivo_beveraggio_riga.bevanda_id NON viene rimossa né alterata; resta
-- nello schema ma l'applicazione smette di scriverci, con un backfill una
-- tantum verso la nuova tabella qui sotto.

create table preventivo_beveraggio_prodotto (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  preventivo_beveraggio_riga_id uuid not null
    references preventivo_beveraggio_riga (id) on delete cascade,
  bevanda_id uuid not null references bevanda (id),
  -- quota della quantità teorica/corretta della categoria coperta da questo
  -- prodotto; la somma delle quote di una riga non deve superare 100
  -- (validato lato applicazione, come le altre percentuali del progetto)
  quota_pct numeric(5, 2) not null check (quota_pct > 0 and quota_pct <= 100),
  ordine integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (preventivo_beveraggio_riga_id, bevanda_id)
);

create trigger trg_preventivo_beveraggio_prodotto_updated
  before update on preventivo_beveraggio_prodotto
  for each row execute function set_updated_at();

alter table preventivo_beveraggio_prodotto enable row level security;
create policy preventivo_beveraggio_prodotto_own on preventivo_beveraggio_prodotto
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index idx_preventivo_beveraggio_prodotto_riga
  on preventivo_beveraggio_prodotto (preventivo_beveraggio_riga_id);

-- Backfill una tantum: i preventivi esistenti avevano al più un prodotto per
-- categoria -> diventa una riga con quota 100%.
insert into preventivo_beveraggio_prodotto
  (user_id, preventivo_beveraggio_riga_id, bevanda_id, quota_pct)
select user_id, id, bevanda_id, 100
from preventivo_beveraggio_riga
where bevanda_id is not null
on conflict (preventivo_beveraggio_riga_id, bevanda_id) do nothing;
