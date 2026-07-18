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
