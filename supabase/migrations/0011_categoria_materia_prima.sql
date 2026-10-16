-- CL-2 / FEATURE-007-008: categorie delle materie prime come lista chiusa ma
-- modificabile dall'utente (aggiungi, rinomina, riordina, elimina se vuota).
-- Prima `materia_prima.categoria` era testo libero con un semplice
-- suggerimento in UI: valori scritti in modi diversi finivano in gruppi
-- diversi e non c'era modo di raggrupparli in modo affidabile.
--
-- Tabella per utente invece di un enum: con l'enum ogni categoria nuova
-- richiederebbe una migrazione (e ALTER TYPE ... ADD VALUE va isolato in un
-- file a parte, come in 0004 e 0006). Una sola profondita' (nessuna
-- sotto-categoria): nessuna richiesta in tal senso.
--
-- La vecchia colonna testo `materia_prima.categoria` resta (migrazioni solo
-- additive) ma non viene piu' letta ne' scritta dal codice.
--
-- Migrazione additiva e idempotente (regola §8).

create table if not exists categoria_materia_prima (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  nome text not null check (length(trim(nome)) > 0),
  ordine integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- soft delete (invariante 3): materie prime eliminate possono ancora puntarvi
  deleted_at timestamptz
);

-- nome univoco per utente, senza distinzione di maiuscole, solo fra le attive:
-- una categoria eliminata non blocca la ricreazione dello stesso nome
create unique index if not exists categoria_materia_prima_nome_unico
  on categoria_materia_prima (user_id, lower(trim(nome)))
  where deleted_at is null;

drop trigger if exists trg_categoria_materia_prima_updated on categoria_materia_prima;
create trigger trg_categoria_materia_prima_updated before update on categoria_materia_prima
  for each row execute function set_updated_at();

alter table categoria_materia_prima enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'categoria_materia_prima' and policyname = 'categoria_materia_prima_own'
  ) then
    create policy categoria_materia_prima_own on categoria_materia_prima
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end
$$;

-- Nullable: una materia prima senza categoria (o con categoria eliminata) e'
-- mostrata in "Senza categoria". L'obbligo vale lato server (lib/db).
alter table materia_prima
  add column if not exists categoria_id uuid references categoria_materia_prima (id);

create index if not exists materia_prima_categoria_idx on materia_prima (categoria_id);

-- 1. Categorie iniziali, solo per gli utenti che non ne hanno ancora nessuna.
--    Stessa lista di CATEGORIE_MATERIA_PRIMA_INIZIALI in
--    lib/db/categorieMateriaPrima.ts (usata per gli utenti creati dopo).
insert into categoria_materia_prima (user_id, nome, ordine)
select u.id, d.nome, d.ordine
from auth.users u
cross join (values
  ('Carne', 1),
  ('Pesce', 2),
  ('Ortofrutta', 3),
  ('Latticini e uova', 4),
  ('Dispensa', 5),
  ('Surgelati', 6),
  ('Panetteria', 7)
) as d (nome, ordine)
where not exists (select 1 from categoria_materia_prima c where c.user_id = u.id);

-- 2. Ogni altro valore scritto a mano su materie prime attive diventa una
--    categoria in coda, cosi' nessuna classificazione esistente va persa.
--    "latticini" non conta: confluisce in "Latticini e uova" (passo 3).
insert into categoria_materia_prima (user_id, nome, ordine)
select
  v.user_id,
  upper(left(v.valore, 1)) || substr(v.valore, 2),
  (select coalesce(max(c2.ordine), 0) from categoria_materia_prima c2 where c2.user_id = v.user_id)
    + row_number() over (partition by v.user_id order by v.valore)
from (
  select distinct mp.user_id, lower(trim(mp.categoria)) as valore
  from materia_prima mp
  where mp.categoria_id is null
    and mp.deleted_at is null
    and length(trim(mp.categoria)) > 0
    and lower(trim(mp.categoria)) <> 'latticini'
) v
where not exists (
  select 1 from categoria_materia_prima c
  where c.user_id = v.user_id and c.deleted_at is null and lower(trim(c.nome)) = v.valore
);

-- 3. Backfill: ogni materia prima (anche eliminata, se il nome corrisponde)
--    punta alla categoria con lo stesso nome.
update materia_prima mp
set categoria_id = c.id
from categoria_materia_prima c
where mp.categoria_id is null
  and c.user_id = mp.user_id
  and c.deleted_at is null
  and lower(trim(c.nome)) = case
    when lower(trim(mp.categoria)) = 'latticini' then 'latticini e uova'
    else lower(trim(mp.categoria))
  end;
