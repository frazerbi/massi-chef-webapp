-- =============================================================
-- Migrazione 0001 — Fase 1: core
-- Materie prime, consumabili, clienti (minimo), ricette con
-- distinta base e sotto-ricette, menu, bevande e profili
-- beveraggio, preventivi con righe e beveraggio, impostazioni.
-- Tutti gli importi sono in CENTESIMI DI EURO (integer).
-- Tutte le quantità usano numeric(12,3).
-- =============================================================

-- ---------- Enum (unità di misura e domini chiusi) ----------

create type unita_acquisto as enum ('kg', 'l', 'pz', 'conf');
create type unita_uso as enum ('g', 'ml', 'pz');
create type categoria_portata as enum
  ('antipasto', 'primo', 'secondo', 'contorno', 'dessert', 'finger', 'altro');
create type tipo_evento as enum ('catering', 'privato');
create type stato_preventivo as enum
  ('bozza', 'inviato', 'confermato', 'rifiutato', 'scaduto');
create type tipo_cliente as enum ('privato', 'azienda');
create type categoria_bevanda as enum
  ('acqua_naturale', 'acqua_frizzante', 'vino_bianco', 'vino_rosso',
   'bollicine', 'birra', 'soft_drink', 'succhi', 'caffe', 'amari_distillati');
create type unita_bevanda as enum ('ml', 'pz');
create type tipo_riga_preventivo as enum ('ricetta', 'extra');
create type categoria_riga_extra as enum
  ('personale', 'trasferta', 'noleggio', 'consumabile', 'sconto', 'altro');
create type correttivo_pubblico as enum ('normale', 'beve_poco', 'beve_molto');
create type esposizione_beveraggio as enum ('a_corpo', 'a_testa', 'dettaglio');

-- ---------- Funzione comune per updated_at ----------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Impostazioni per utente ----------

create table impostazioni (
  user_id uuid primary key references auth.users (id) on delete cascade,
  sfrido_catering_pct numeric(5, 2) not null default 10 check (sfrido_catering_pct >= 0),
  sfrido_privato_pct numeric(5, 2) not null default 5 check (sfrido_privato_pct >= 0),
  fattore_distribuzione_pct numeric(5, 2) not null default 25
    check (fattore_distribuzione_pct >= 0 and fattore_distribuzione_pct <= 100),
  quota_bibite_bambini_pct numeric(5, 2) not null default 50
    check (quota_bibite_bambini_pct >= 0 and quota_bibite_bambini_pct <= 100),
  acconto_pct numeric(5, 2) not null default 30 check (acconto_pct >= 0 and acconto_pct <= 100),
  soglia_spesatura_cent integer not null default 10000 check (soglia_spesatura_cent >= 0),
  giorni_avviso_scadenze integer not null default 3 check (giorni_avviso_scadenze >= 0),
  validita_preventivo_giorni integer not null default 30 check (validita_preventivo_giorni > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_impostazioni_updated before update on impostazioni
  for each row execute function set_updated_at();

alter table impostazioni enable row level security;
create policy impostazioni_own on impostazioni
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Materie prime ----------

create table materia_prima (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  nome text not null check (length(trim(nome)) > 0),
  categoria text not null default 'dispensa',
  unita_acquisto unita_acquisto not null,
  prezzo_acquisto_cent integer not null check (prezzo_acquisto_cent >= 0),
  unita_uso unita_uso not null,
  fattore_conversione numeric(12, 3) not null check (fattore_conversione > 0),
  resa_percentuale numeric(5, 2) not null default 100
    check (resa_percentuale >= 1 and resa_percentuale <= 100),
  fornitore_preferito text,
  allergeni text[] not null default '{}',
  note text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- mai conversioni implicite peso <-> volume
  constraint conversione_coerente check (
    (unita_acquisto = 'kg' and unita_uso = 'g') or
    (unita_acquisto = 'l' and unita_uso = 'ml') or
    (unita_acquisto in ('pz', 'conf') and unita_uso = 'pz')
  )
);

create trigger trg_materia_prima_updated before update on materia_prima
  for each row execute function set_updated_at();

alter table materia_prima enable row level security;
create policy materia_prima_own on materia_prima
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Consumabili (non alimentari, senza resa/allergeni) ----------

create table consumabile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  nome text not null check (length(trim(nome)) > 0),
  categoria text not null default 'generico',
  unita_acquisto unita_acquisto not null,
  prezzo_acquisto_cent integer not null check (prezzo_acquisto_cent >= 0),
  unita_uso unita_uso not null,
  fattore_conversione numeric(12, 3) not null check (fattore_conversione > 0),
  fornitore_preferito text,
  note text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversione_coerente check (
    (unita_acquisto = 'kg' and unita_uso = 'g') or
    (unita_acquisto = 'l' and unita_uso = 'ml') or
    (unita_acquisto in ('pz', 'conf') and unita_uso = 'pz')
  )
);

create trigger trg_consumabile_updated before update on consumabile
  for each row execute function set_updated_at();

alter table consumabile enable row level security;
create policy consumabile_own on consumabile
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Clienti (anagrafica minima, schermata completa in fase 2) ----------

create table cliente (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  nome text not null check (length(trim(nome)) > 0),
  tipo tipo_cliente not null default 'privato',
  telefono text,
  email text,
  indirizzi text,
  note text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_cliente_updated before update on cliente
  for each row execute function set_updated_at();

alter table cliente enable row level security;
create policy cliente_own on cliente
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Ricette ----------

create table ricetta (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  nome text not null check (length(trim(nome)) > 0),
  descrizione text,
  categoria_portata categoria_portata not null default 'altro',
  porzioni_base integer not null check (porzioni_base > 0),
  tempo_preparazione_min integer check (tempo_preparazione_min >= 0),
  costo_manuale_extra_cent integer not null default 0 check (costo_manuale_extra_cent >= 0),
  istruzioni text,
  attiva boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_ricetta_updated before update on ricetta
  for each row execute function set_updated_at();

alter table ricetta enable row level security;
create policy ricetta_own on ricetta
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Riga della distinta base: o materia prima o sotto-ricetta.
create table ricetta_ingrediente (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  ricetta_id uuid not null references ricetta (id) on delete cascade,
  materia_prima_id uuid references materia_prima (id),
  sotto_ricetta_id uuid references ricetta (id),
  -- quantità in unità d'uso della materia prima, riferita a porzioni_base
  quantita numeric(12, 3) check (quantita > 0),
  -- porzioni della sotto-ricetta usate, riferite a porzioni_base
  quantita_porzioni numeric(12, 3) check (quantita_porzioni > 0),
  opzionale boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint esattamente_un_riferimento check (
    (materia_prima_id is not null and sotto_ricetta_id is null and quantita is not null and quantita_porzioni is null)
    or
    (materia_prima_id is null and sotto_ricetta_id is not null and quantita_porzioni is not null and quantita is null)
  )
);

create trigger trg_ricetta_ingrediente_updated before update on ricetta_ingrediente
  for each row execute function set_updated_at();

alter table ricetta_ingrediente enable row level security;
create policy ricetta_ingrediente_own on ricetta_ingrediente
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Anti-ciclo e profondità massima 5 sulle sotto-ricette (vincolo lato server).
create or replace function verifica_sotto_ricetta()
returns trigger language plpgsql as $$
declare
  ciclo integer;
  prof_discesa integer;
  prof_salita integer;
begin
  if new.sotto_ricetta_id is null then
    return new;
  end if;

  if new.sotto_ricetta_id = new.ricetta_id then
    raise exception 'Una ricetta non può contenere sé stessa';
  end if;

  -- ciclo indiretto: la ricetta padre compare tra i discendenti della sotto-ricetta?
  with recursive discendenti as (
    select ri.sotto_ricetta_id as id, 1 as prof
    from ricetta_ingrediente ri
    where ri.ricetta_id = new.sotto_ricetta_id and ri.sotto_ricetta_id is not null
    union all
    select ri.sotto_ricetta_id, d.prof + 1
    from ricetta_ingrediente ri
    join discendenti d on ri.ricetta_id = d.id
    where ri.sotto_ricetta_id is not null and d.prof < 10
  )
  select 1 into ciclo from discendenti where id = new.ricetta_id limit 1;
  if ciclo is not null then
    raise exception 'Ciclo di sotto-ricette non ammesso';
  end if;

  -- profondità massima 5 della catena completa (antenati + nuova riga + discendenti)
  with recursive discendenti as (
    select ri.sotto_ricetta_id as id, 1 as prof
    from ricetta_ingrediente ri
    where ri.ricetta_id = new.sotto_ricetta_id and ri.sotto_ricetta_id is not null
    union all
    select ri.sotto_ricetta_id, d.prof + 1
    from ricetta_ingrediente ri
    join discendenti d on ri.ricetta_id = d.id
    where ri.sotto_ricetta_id is not null and d.prof < 10
  )
  select coalesce(max(prof), 0) into prof_discesa from discendenti;

  with recursive antenati as (
    select ri.ricetta_id as id, 1 as prof
    from ricetta_ingrediente ri
    where ri.sotto_ricetta_id = new.ricetta_id
    union all
    select ri.ricetta_id, a.prof + 1
    from ricetta_ingrediente ri
    join antenati a on ri.sotto_ricetta_id = a.id
    where a.prof < 10
  )
  select coalesce(max(prof), 0) into prof_salita from antenati;

  if prof_salita + 1 + prof_discesa > 5 then
    raise exception 'Profondità massima delle sotto-ricette superata (max 5)';
  end if;

  return new;
end;
$$;

create trigger trg_anti_ciclo before insert or update on ricetta_ingrediente
  for each row execute function verifica_sotto_ricetta();

-- ---------- Menu (template riutilizzabile) ----------

create table menu (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  nome text not null check (length(trim(nome)) > 0),
  descrizione text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_menu_updated before update on menu
  for each row execute function set_updated_at();

alter table menu enable row level security;
create policy menu_own on menu
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table menu_riga (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  menu_id uuid not null references menu (id) on delete cascade,
  ricetta_id uuid not null references ricetta (id),
  ordine integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_menu_riga_updated before update on menu_riga
  for each row execute function set_updated_at();

alter table menu_riga enable row level security;
create policy menu_riga_own on menu_riga
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Bevande e profili beveraggio ----------

create table bevanda (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  nome text not null check (length(trim(nome)) > 0),
  categoria categoria_bevanda not null,
  formato_confezione text,
  -- capacità della singola unità nell'unità indicata (ml per liquidi, pz per caffè)
  capacita_unitaria numeric(12, 3) not null check (capacita_unitaria > 0),
  unita unita_bevanda not null default 'ml',
  unita_per_collo integer not null default 1 check (unita_per_collo > 0),
  prezzo_unitario_cent integer not null check (prezzo_unitario_cent >= 0),
  alcolica boolean not null default false,
  note text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_bevanda_updated before update on bevanda
  for each row execute function set_updated_at();

alter table bevanda enable row level security;
create policy bevanda_own on bevanda
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table profilo_beveraggio (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  nome text not null check (length(trim(nome)) > 0),
  note text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profilo_beveraggio_updated before update on profilo_beveraggio
  for each row execute function set_updated_at();

alter table profilo_beveraggio enable row level security;
create policy profilo_beveraggio_own on profilo_beveraggio
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table profilo_beveraggio_riga (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  profilo_id uuid not null references profilo_beveraggio (id) on delete cascade,
  categoria categoria_bevanda not null,
  quantita_a_testa numeric(12, 3) not null check (quantita_a_testa >= 0),
  unita unita_bevanda not null default 'ml',
  -- consumo aggiuntivo per ora di servizio (voci a durata, es. open bar)
  quantita_a_testa_ora numeric(12, 3) not null default 0 check (quantita_a_testa_ora >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profilo_id, categoria)
);

create trigger trg_profilo_beveraggio_riga_updated before update on profilo_beveraggio_riga
  for each row execute function set_updated_at();

alter table profilo_beveraggio_riga enable row level security;
create policy profilo_beveraggio_riga_own on profilo_beveraggio_riga
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Preventivi ----------

create table preventivo (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  cliente_id uuid not null references cliente (id),
  tipo tipo_evento not null,
  data_evento date not null,
  numero_ospiti_adulti integer not null check (numero_ospiti_adulti >= 0),
  numero_ospiti_bambini integer not null default 0 check (numero_ospiti_bambini >= 0),
  stato stato_preventivo not null default 'bozza',
  sfrido_pct numeric(5, 2) not null check (sfrido_pct >= 0),
  margine_target_pct numeric(5, 2) not null default 0
    check (margine_target_pct >= 0 and margine_target_pct < 100),
  prezzo_totale_cent integer check (prezzo_totale_cent >= 0),
  validita_giorni integer not null default 30 check (validita_giorni > 0),
  note_cliente text,
  condizioni text,
  -- congelato al passaggio bozza -> inviato; da lì il preventivo è immutabile
  food_cost_snapshot jsonb,
  revisione_di_id uuid references preventivo (id),
  inviato_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ospiti_presenti check (numero_ospiti_adulti + numero_ospiti_bambini > 0)
);

create trigger trg_preventivo_updated before update on preventivo
  for each row execute function set_updated_at();

alter table preventivo enable row level security;
create policy preventivo_own on preventivo
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Storico degli stati (audit minimo richiesto dalla specifica)
create table preventivo_stato_storico (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  preventivo_id uuid not null references preventivo (id) on delete cascade,
  stato stato_preventivo not null,
  registrato_at timestamptz not null default now()
);

alter table preventivo_stato_storico enable row level security;
create policy preventivo_stato_storico_own on preventivo_stato_storico
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table preventivo_riga (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  preventivo_id uuid not null references preventivo (id) on delete cascade,
  tipo_riga tipo_riga_preventivo not null,
  ricetta_id uuid references ricetta (id),
  categoria_extra categoria_riga_extra,
  descrizione text not null,
  -- per righe ricetta: numero porzioni; per righe extra: quantità libera
  quantita numeric(12, 3) not null check (quantita > 0),
  -- valorizzato dallo snapshot per i preventivi inviati; per le bozze i costi
  -- delle righe ricetta si ricalcolano sempre live
  costo_unitario_cent integer check (costo_unitario_cent >= 0),
  prezzo_unitario_cent integer,
  escludi_opzionali boolean not null default false,
  ordine integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint riga_coerente check (
    (tipo_riga = 'ricetta' and ricetta_id is not null)
    or
    (tipo_riga = 'extra' and ricetta_id is null)
  )
);

create trigger trg_preventivo_riga_updated before update on preventivo_riga
  for each row execute function set_updated_at();

alter table preventivo_riga enable row level security;
create policy preventivo_riga_own on preventivo_riga
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Configurazione beveraggio del preventivo (1:1)
create table preventivo_beveraggio (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  preventivo_id uuid not null unique references preventivo (id) on delete cascade,
  -- false = "solo servizio": il beveraggio lo porta il cliente
  attivo boolean not null default true,
  profilo_origine_id uuid references profilo_beveraggio (id),
  ore_servizio numeric(5, 2) not null default 0 check (ore_servizio >= 0),
  fattore_distribuzione_pct numeric(5, 2) not null default 25
    check (fattore_distribuzione_pct >= 0 and fattore_distribuzione_pct <= 100),
  quota_bibite_bambini_pct numeric(5, 2) not null default 50
    check (quota_bibite_bambini_pct >= 0 and quota_bibite_bambini_pct <= 100),
  correttivo_stagione_calda boolean not null default false,
  correttivo_evento_lungo boolean not null default false,
  correttivo_pubblico correttivo_pubblico not null default 'normale',
  esposizione esposizione_beveraggio not null default 'a_corpo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_preventivo_beveraggio_updated before update on preventivo_beveraggio
  for each row execute function set_updated_at();

alter table preventivo_beveraggio enable row level security;
create policy preventivo_beveraggio_own on preventivo_beveraggio
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table preventivo_beveraggio_riga (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  preventivo_beveraggio_id uuid not null references preventivo_beveraggio (id) on delete cascade,
  categoria categoria_bevanda not null,
  quantita_a_testa numeric(12, 3) not null check (quantita_a_testa >= 0),
  unita unita_bevanda not null default 'ml',
  quantita_a_testa_ora numeric(12, 3) not null default 0 check (quantita_a_testa_ora >= 0),
  -- articolo scelto per prezzare la categoria
  bevanda_id uuid references bevanda (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (preventivo_beveraggio_id, categoria)
);

create trigger trg_preventivo_beveraggio_riga_updated before update on preventivo_beveraggio_riga
  for each row execute function set_updated_at();

alter table preventivo_beveraggio_riga enable row level security;
create policy preventivo_beveraggio_riga_own on preventivo_beveraggio_riga
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Indici ----------

create index idx_materia_prima_user on materia_prima (user_id) where deleted_at is null;
create index idx_ricetta_user on ricetta (user_id) where deleted_at is null;
create index idx_ricetta_ingrediente_ricetta on ricetta_ingrediente (ricetta_id);
create index idx_ricetta_ingrediente_mp on ricetta_ingrediente (materia_prima_id);
create index idx_ricetta_ingrediente_sotto on ricetta_ingrediente (sotto_ricetta_id);
create index idx_menu_riga_menu on menu_riga (menu_id);
create index idx_preventivo_user on preventivo (user_id);
create index idx_preventivo_riga_preventivo on preventivo_riga (preventivo_id);
create index idx_profilo_riga_profilo on profilo_beveraggio_riga (profilo_id);
