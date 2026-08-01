# CLAUDE.md — Istruzioni operative del progetto Chef Manager

Questo file è rivolto all'assistente AI (Claude Code) che sviluppa il progetto. Va tenuto nella radice del repository. La specifica funzionale completa è in `docs/documento-progetto-chef-manager.md`: **leggila prima di qualsiasi intervento** e considerala la fonte di verità sul dominio. Questo file ne è il distillato operativo: regole, convenzioni e invarianti da rispettare a ogni modifica.

---

## 1. Contesto in una frase

Web app gestionale per un singolo professionista che lavora in due modalità — catering per grandi gruppi e chef privato a domicilio — con catena centrale: *materie prime → ricette con costo porzione → menu → preventivo scalato per ospiti (cibo + beveraggio) → evento → spesa, produzione, pagamenti, consuntivo*.

## 2. Stack vincolante

- **Next.js** (App Router, TypeScript strict) — frontend e API routes nello stesso repo.
- **Supabase** — Postgres, Auth (email+password), Storage per i PDF. RLS attiva su tutte le tabelle con `user_id`.
- **Tailwind CSS** — niente altre librerie CSS; componenti UI propri, semplici.
- **PDF lato server** tramite API route.
- Lingua dell'interfaccia: **italiano**. Lingua del codice (nomi variabili, tabelle, funzioni): **italiano per le entità di dominio** (coerente con la specifica: `ricetta`, `preventivo`, `materia_prima`), inglese per il resto tecnico.

Non introdurre altre dipendenze pesanti (ORM alternativi, state manager globali, component library) senza necessità dimostrata: preferisci sempre la soluzione più semplice che rispetta la specifica.

## 3. Struttura del repository

```
/app                  → route Next.js (una cartella per schermata della specifica §6)
/lib/db/              → UNICO punto di accesso a Supabase (un modulo per entità)
/lib/calc/            → funzioni PURE di calcolo (nessun accesso a DB o rete)
/lib/pdf/             → generazione documenti
/components/          → componenti UI riusabili
/supabase/migrations/ → migrazioni SQL versionate, mai modificate retroattivamente
/tests/               → test unitari di /lib/calc/ e /lib/db/
/docs/                → specifica funzionale e questo genere di documenti
```

Regola dura: **nessuna query Supabase nei componenti**. Tutto passa da `/lib/db/`. Tutte le formule vivono in `/lib/calc/` e sono importate sia dalla UI (anteprima live) sia dal server (PDF, aggregazioni): mai duplicare una formula.

## 4. Invarianti di dominio — MAI violarli

Questi sono i vincoli che definiscono la correttezza del sistema. Qualsiasi modifica che li rompe è un bug, anche se "funziona".

1. **Immutabilità dei preventivi inviati.** Al passaggio `bozza → inviato` si congela `food_cost_snapshot` (costi unitari di ogni riga, beveraggio incluso). Da quel momento cambi ai prezzi delle materie prime o alle ricette NON alterano il preventivo. Le modifiche creano una **revisione** (`revisione_di_id`). Le bozze invece ricalcolano sempre live.
2. **Immutabilità dei documenti emessi** (proforma, ricevute, note): numerazione progressiva per tipo/anno assegnata in transazione, mai riutilizzata; correzioni solo con nuovo documento.
3. **Soft delete** per tutto ciò che è referenziato da storico (materie prime, ricette, clienti, bevande, attrezzature): `deleted_at`, mai `DELETE` fisico.
4. **Anti-ciclo sotto-ricette**: una ricetta non può contenersi direttamente o indirettamente; profondità massima 5; vincolo verificato lato server, non solo in UI.
5. **Unità di misura chiuse** (enum) con conversioni esplicite; mai testo libero, mai conversioni implicite peso↔volume.
6. **Denaro in centesimi interi** nei calcoli; arrotondamento a 2 decimali SOLO in presentazione. Quantità a 3 decimali. Quantità di acquisto (spesa, colli beveraggio) arrotondate **per eccesso**.
7. **Le quote di ammortamento consolidate su eventi conclusi non cambiano mai**, anche se la quota dell'attrezzatura viene poi ricalcolata.
8. **Il ricalcolo evento** (cambio ospiti dopo conferma) usa lo snapshot dei costi unitari, non i prezzi correnti.

## 5. Formule di riferimento (dettaglio completo in specifica §5)

```
costo_unita_uso     = prezzo_acquisto / fattore_conversione / (resa_pct/100)
costo_porzione      = Σ(quantità × costo_unita_uso) / porzioni_base + extra   [ricorsivo su sotto-ricette]
quantità_evento     = quantità_porzione × ospiti × (1 + sfrido_pct/100)       [sfrido: 10% catering, 5% privato]
prezzo_suggerito    = costo_totale / (1 − margine_target_pct/100)
quota_attrezzatura  = (costo − valore_dismissione) / (anni × eventi_anno)     [soglia spesatura: 100 €]
utile_servizio      = ricavo − food − lavoro − trasferta/consumabili/noleggi − quote_attrezzature
```

**Beveraggio** (specifica §5.11): profilo standard a testa = acqua 600 naturale + 400 frizzante, vino 200 bianco + 200 rosso, spumante 100, birra 400, bibite 400 ml, 1 caffè. Se vino E birra sono entrambi attivi, applicare il **fattore di distribuzione** (default −25% sulla somma vino+birra, ripartito proporzionalmente, spumante escluso). Ordine delle operazioni: correttivi rapidi → fattore di distribuzione → scalatura ospiti (bambini: solo analcolico, bibite al 50%) → arrotondamento per eccesso a unità e poi a collo. Mostrare sempre teorico e corretto.

## 6. Modalità Catering / Chef Privato

Una sola base dati. `evento.tipo ∈ {catering, privato}` con tabelle 1:1 `dettaglio_catering` e `dettaglio_privato`. Le logiche trasversali (pagamenti, spesa aggregata, storico cliente, agenda) operano su `evento` e NON devono mai contenere `if tipo == ...` se non per i dettagli specifici. Il selettore di modalità in UI è solo un filtro di visualizzazione.

## 7. Ordine di sviluppo e definition of done

Seguire le fasi della specifica §7 nell'ordine: 1) core ricette+beveraggio+preventivo PDF, 2) clienti/eventi/pagamenti/agenda, 3) chef privato, 4) spesa e produzione aggregata, 5) magazzino HACCP, 6) brigata/logistica/attrezzature, 7) documenti. Non anticipare moduli di fasi successive "già che ci siamo".

Una funzionalità è finita quando:
- le funzioni di calcolo coinvolte hanno **test unitari** (inclusi i casi limite: resa 100%, sfrido 0, ricetta senza sotto-ricette e con, ospiti bambini = totale, una sola categoria alcolica, attrezzatura sotto soglia);
- le validazioni esistono **lato server** (quantità > 0, resa 1–100, margine < 100, date coerenti, anti-ciclo);
- la migrazione SQL è versionata e idempotente;
- la schermata funziona su mobile per le sezioni da campo (agenda, spesa, HACCP, evento);
- nessun invariante della sezione 4 è violato.

## 8. Convenzioni operative

- **Migrazioni**: solo additive dopo il primo deploy; mai editare migrazioni già applicate.
- **Commit** piccoli e descrittivi in italiano, un tema per commit.
- **created_at / updated_at** su ogni tabella; storico stati su preventivi, eventi, pagamenti.
- **Errori espliciti**: le funzioni di `/lib/calc/` lanciano su input invalidi, non restituiscono valori di ripiego silenziosi.
- **Niente dati inventati** nei seed: usare i default della specifica (profili beveraggio, sfrido, soglie) e lasciare vuoto il resto.
- I default configurabili (sfrido, fattore distribuzione, acconto 30%, soglia spesatura 100 €, avviso scadenze 3 gg) vivono in una tabella `impostazioni` per utente, non hardcoded.

## 9. Cosa NON fare

- Niente fatturazione elettronica / XML FatturaPA: fuori perimetro, i documenti sono amministrativi di supporto.
- Niente multi-tenant o gestione team: utente singolo.
- Niente scarico automatico del magazzino dalla produzione (fase 1: manuale).
- Niente cache o denormalizzazioni dei costi calcolati live: l'unica persistenza dei costi è lo snapshot dei preventivi inviati.
- Non "migliorare" le formule o i default di dominio senza chiedere: vengono dalla pratica professionale dell'utente.

## 10. Quando la specifica è ambigua

Se un requisito non è coperto dalla specifica: scegliere l'interpretazione più semplice coerente con gli invarianti, implementarla dietro un default configurabile, e segnalarlo esplicitamente all'utente nel riepilogo del lavoro. Mai bloccare lo sviluppo in attesa, mai decidere in silenzio su questioni di dominio (prezzi, percentuali, regole commerciali): quelle vanno sempre chieste.

---

## 11. Stato di avanzamento

- **Fase 1 (core) completata il 18/07/2026** e verificata dall'utente su Supabase reale: auth, materie prime, consumabili, ricette con sotto-ricette, menu, bevande, profili beveraggio, preventivi con snapshot e PDF.
- **Deploy su Vercel attivo dal 23/07/2026** (`https://massi-chef-webapp.vercel.app`), con flusso di recupero password implementato (era un gap: fase 1 copriva solo login email+password). Vedi §12 per i dettagli infrastrutturali.
- **Prossima: fase 2** — clienti (schermata completa), eventi da preventivo, pagamenti, storico cliente, agenda.
- La migrazione `0001_fase1_core.sql` è applicata sul progetto: da qui in poi **solo migrazioni additive nuove**, mai modificare la 0001.
- **Bug fix beveraggio (28/07/2026)**: risolti due bug segnalati dal cliente sul modulo preventivi — vedi §13 per le decisioni di dominio prese. Migrazione `0002_beveraggio_multi_prodotto.sql` creata e **applicata su Supabase** (28/07/2026): fix attivo in produzione.
- **Bug fix "Segna come inviato" (01/08/2026)**: `impostaRigaBeveraggio` non validava l'unità contro un prodotto beveraggio già assegnato, permettendo un disallineamento silenzioso che faceva fallire l'invio del preventivo. Guardia aggiunta in `lib/db/preventivi.ts`; due preventivi già affetti in produzione corretti via SQL Editor. Dettagli nella roadmap artifact.
- **Eliminazione preventivi in bozza (01/08/2026)**: aggiunta `eliminaPreventivo` (DELETE fisico, non soft delete — vedi §13) con pulsante "Elimina bozza" visibile solo finché `stato === 'bozza'`; sui preventivi inviati resta impossibile, come da invariante 1.
- **Beveraggio: valore "corretto" inseribile a mano (01/08/2026, FEATURE-016)**: nella riga di beveraggio ora si può sovrascrivere il valore finale ("corretto") calcolato dalla pipeline correttivi→distribuzione→scalatura, tenendo il "teorico" come suggerimento sempre visibile — vedi §13 per la decisione di dominio. Migrazione `0003_beveraggio_correzione_manuale.sql` creata e **applicata su Supabase** (01/08/2026).
- **Materia prima diretta in menu/preventivo, senza ricetta (01/08/2026, FEATURE-017)**: si può ora aggiungere una materia prima (es. frutta, olive, patatine) come riga di menu o di preventivo senza passare da una ricetta — vedi §13 per le decisioni di dominio (ambito, scalatura con sfrido). Migrazioni `0004_riga_materia_prima_enum.sql` (nuovo valore enum `materia_prima` per `tipo_riga_preventivo`, isolato in un file a parte per il vincolo Postgres su `ALTER TYPE ... ADD VALUE`) e `0005_riga_materia_prima.sql` (colonne `materia_prima_id`/`quantita_persona` su `menu_riga` e `preventivo_riga`, nuovi vincoli) create e **applicate su Supabase** (01/08/2026): fix attivo in produzione.
- **Roadmap unica bug/feature**: tenuta in un artifact vivente (changelog + schede per bug/feature/decisioni), non in questo file. Aggiornare quello, non duplicarne il contenuto qui, quando arrivano nuove richieste. URL in memoria (`roadmap-artifact.md`).

## 12. Note operative dell'ambiente

- **Supabase**: progetto ref `xaxsvmurnfygjlaimgsk`. Credenziali in `.env.local` (mai committarlo; template in `.env.local.example`). La chiave è nel nuovo formato `sb_publishable_…`. **La CLI Supabase non è installata**: le migrazioni si applicano incollando il file SQL nel SQL Editor del dashboard.
- **Hosting: Vercel, non SiteGround.** Il piano SiteGround disponibile (`francescoz125.sg-host.com`) non ha il Node.js App Manager di Site Tools (niente Devs → Node.js) e via SSH manca `pm2`/`crontab`, senza reverse-proxy verso un processo Node persistente: non è utilizzabile come host applicativo per una app Next.js con route server/API. L'app è quindi deployata su **Vercel**, collegato al repo GitHub `frazerbi/massi-chef-webapp` con deploy automatico ad ogni push su `main`. SiteGround resta eventualmente utilizzabile solo per il DNS di un dominio custom (record verso Vercel), non per l'hosting applicativo.
- **Variabili d'ambiente su Vercel**: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` vanno impostate anche in Project → Settings → Environment Variables su Vercel (non bastano nel solo `.env.local` locale), perché le `NEXT_PUBLIC_*` sono incorporate a build time.
- **Supabase Auth URL Configuration**: Site URL e Redirect URLs (Authentication → URL Configuration nel dashboard Supabase) devono includere il dominio Vercel effettivo (es. `https://massi-chef-webapp.vercel.app/**`) e, per test in locale, `http://localhost:3000/**`. Senza questo, i link via email (recupero password, inviti) falliscono con redirect non autorizzato.
- **Recupero password**: implementato in `app/login/recupera/` (richiesta email), `app/auth/callback/route.ts` (scambio del `code` PKCE per la sessione) e `app/login/recupera/imposta/` (nuova password). L'URL di redirect è costruito dinamicamente dagli header della richiesta (`host`/`x-forwarded-host`), non hardcoded: funziona sia in locale sia su qualunque dominio Vercel senza bisogno di una variabile d'ambiente dedicata al site URL.
- **Next.js 16**: il middleware usa la convenzione `proxy.ts` (non `middleware.ts`). Le pagine in `app/(app)/` sono `force-dynamic` (impostato nel layout del gruppo): leggono dati per-utente, mai prerender statico. Il proxy considera pubbliche (accessibili senza sessione) solo `/login` e `/auth/callback` con le rispettive sottopagine; solo `/login` esatto respinge un utente già autenticato — le sottopagine di recupero password restano accessibili anche con una sessione di recovery attiva.
- **Comandi**: `npm run dev` (sviluppo), `npm test` (Vitest su `/lib/calc/` e `/lib/db/`), `npm run build`, `npm run lint`. Prima di consegnare: tutti e tre verdi.
- **Denaro**: nel DB gli importi sono `integer` in centesimi con suffisso `_cent`; i form accettano euro con virgola e convertono in `lib/form.ts`.
- **Debug di errori in produzione**: Next.js in produzione redige il messaggio degli errori dei Server Component/Server Action (`app/error.tsx` mostra solo un digest generico), quindi non è mai visibile all'utente. Se il bug è sui dati di un altro utente e non è riproducibile in locale, diagnosticare direttamente via query mirate nel SQL Editor di Supabase (bypassa le RLS come proprietario del progetto) invece di fidarsi del messaggio a schermo.
- **PDF cliente**: mostra solo i prezzi, mai i costi interni. Archiviazione su Storage rimandata alla fase 7.

## 13. Decisioni interpretative già prese (fase 1)

Comunicate all'utente e accettate; non ridiscuterle in silenzio, ma se una crea problemi nelle fasi successive va segnalata:

- **Bambini nel beveraggio**: acqua al 100%, bibite e succhi alla quota configurabile (default 50%), niente alcolici e **niente caffè**.
- **Caffè** modellato in unità `pz` (le bevande hanno unità chiusa `ml` | `pz`, coerenza verificata nel calcolo).
- **Tabella `cliente` minima** anticipata in fase 1 (il preventivo la richiede); anagrafica completa e storico in fase 2.
- **Food cost del preventivo senza sfrido** (formula §5.4 letterale); lo `sfrido_pct` è salvato sul preventivo e servirà alla lista spesa (fase 4).
- **Margine target senza valore di default**: campo obbligatorio nel wizard (decisione commerciale dell'utente).
- **Suggerimento riparto bianco/rosso da menu di pesce**: non implementato (le portate non codificano il "pesce"); eventualmente derivabile dagli allergeni.
- **Recupero password** (23/07/2026): non era coperto dalla specifica né dalla fase 1; implementato come flusso minimo (email → link → nuova password, min. 8 caratteri) perché necessario per l'uso reale dell'account in produzione. Nessuna UI distingue email esistente/inesistente, per non permettere enumerazione account.
- **Beveraggio: più prodotti per categoria** (28/07/2026, BUG-001): la specifica §5.11 non prevedeva più prodotti sotto la stessa categoria di beveraggio (un solo `bevanda_id` per categoria, sovrascritto se riassegnato). Il cliente ha chiesto esplicitamente di poterne assegnare più di uno (es. due vini diversi sotto "vino bianco"), scegliendo il cambio di modello invece del fix minimo. Implementato con quota % per prodotto (`preventivo_beveraggio_prodotto`); le formule di scalatura/correttivi/distribuzione di §5.11 restano invariate e operano ancora a livello di categoria, solo la copertura/costo si ripartisce tra i prodotti assegnati.
- **Eliminazione preventivi in bozza = DELETE fisico, non soft delete** (01/08/2026): la specifica/invariante 3 elenca solo materie prime, ricette, clienti, bevande, attrezzature tra le entità a soft delete (dati anagrafici referenziati da storico). Un preventivo mai inviato non ha snapshot né storico da preservare, quindi non rientra in quell'invariante: interpretazione scelta come più semplice e coerente, segnalata all'utente invece di aggiungere un `deleted_at` inutile. Resta comunque bloccato (nessuna eliminazione, nessuna riscrittura di stato) non appena il preventivo passa a `inviato`.
- **Beveraggio: override manuale sostituisce l'intera pipeline, non un correttivo aggiuntivo** (01/08/2026, FEATURE-016): richiesta iniziale ambigua ("poter aggiungere bevande oltre ai litri proposti"), chiarita con l'utente come bisogno di inserire direttamente il valore finale per categoria. Scelto di far sostituire all'override l'intero risultato di correttivi→distribuzione→scalatura (non solo un delta sommato), perché più semplice e perché il "teorico" resta comunque visibile come riferimento per capire quanto ci si sta scostando dal calcolo automatico. Override per riga/categoria del singolo preventivo (solo in bozza), non un nuovo tipo di voce libera fuori dall'enum categorie.
- **Materia prima diretta in menu/preventivo (01/08/2026, FEATURE-017)**: tre decisioni prese esplicitamente con l'utente, non dedotte in silenzio. (1) **Ambito**: disponibile sia nel menu (template riutilizzabile) sia nel preventivo, non solo nel preventivo come nella richiesta iniziale — coerente con come già funzionano le ricette. `menu_riga.ricetta_id` è diventato nullable con `materia_prima_id`/`quantita_persona` alternativi (stesso pattern "esattamente un riferimento" di `ricetta_ingrediente`); stesso schema su `preventivo_riga` con nuovo `tipo_riga = 'materia_prima'`. (2) **Quantità**: la quantità inserita è "a persona" (nell'unità d'uso della materia prima) e scala automaticamente con `ospiti × (1 + sfrido%)` (formula §5 letterale) — calcolata **live** in `calcolaPreventivo()`, mai salvata, così una bozza si ricalcola da sola se cambiano gli ospiti (coerente con l'invariante "le bozze ricalcolano sempre live"; dopo l'invio il preventivo è comunque bloccato quindi resta stabile senza bisogno di uno snapshot della quantità, solo del costo unitario). (3) **Sfrido**: applicato al food cost di queste righe. Incoerenza nota e accettata esplicitamente dall'utente: le righe-ricetta calcolano il food cost **senza** sfrido (decisione di fase 1, sopra), le righe-materia-prima **con** sfrido — stesso preventivo, due logiche di costo diverse a seconda del tipo di riga.
