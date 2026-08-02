# Chef Manager

Gestionale web per un professionista che opera in due modalità: **catering** e **chef privato**. Specifica funzionale completa in `docs/documento-progetto-chef-manager.md`; regole operative in `CLAUDE.md`.

## Stato: Fase 1 — Core

Auth, materie prime, consumabili, ricette con costi (sotto-ricette incluse), menu, bevande e profili beveraggio, preventivi scalati con snapshot di immutabilità e PDF.

## Setup

1. **Supabase**: crea un progetto su [supabase.com](https://supabase.com), poi applica la migrazione:
   ```bash
   # con la CLI Supabase collegata al progetto
   supabase db push
   # oppure incolla supabase/migrations/0001_fase1_core.sql nel SQL Editor del dashboard
   ```
2. **Utente**: crea l'utente (email + password) da Dashboard → Authentication → Add user.
3. **Variabili d'ambiente**: copia `.env.local.example` in `.env.local` e inserisci URL e anon key del progetto.
4. **Avvio**:
   ```bash
   npm install
   npm run dev
   ```

## Comandi

| Comando | Descrizione |
|---|---|
| `npm run dev` | sviluppo locale |
| `npm run build` | build di produzione |
| `npm test` | test unitari di `/lib/calc/` e `/lib/db/` (Vitest) |
| `npm run lint` | ESLint |

## Materie prime: fattore di conversione, resa e unità

Il campo che genera più dubbi in fase di inserimento è `fattore_conversione`. Riepilogo (dettaglio completo anche nella pagina **Materie prime → "Come si calcola il costo?"** del gestionale):

- **Cos'è**: quante unità d'uso (`g`, `ml`, `pz`) ci sono in una unità di acquisto (`kg`, `l`, `pz`, `conf`). È solo lo scalare di conversione tra le due unità, **non** ha a che fare con lo scarto.
- **Come si usa**: entra nella formula del costo reale (§5.1 della specifica, implementata in `lib/calc/materiaPrima.ts`):
  ```
  costo_per_unita_uso = prezzo_acquisto / fattore_conversione / (resa_percentuale / 100)
  ```
- **Valori tipici**:

  | Acquisti in | Usi in | Fattore di conversione |
  |---|---|---|
  | kg | g | 1000 |
  | l | ml | 1000 |
  | pz | pz | 1 |
  | conf da 500 g | g | 500 |
  | conf da 6 pz | pz | 6 |

- **Non confondere con la resa**: lo scarto di lavorazione (es. pulizia del pesce) è un campo separato, `resa_percentuale`, applicato dopo nella stessa formula.
- **Vincolo**: deve essere sempre `> 0` (`unita_acquisto` e `unita_uso` devono restare dimensionalmente coerenti — mai conversioni implicite peso↔volume, invariante §4 di `CLAUDE.md`).

## Limitazioni note

### Beveraggio: aggiungere più prodotti nella stessa categoria

Nel modulo "aggiungi prodotto" di una riga beveraggio (es. bibite, acqua, caffè), il campo quota % è precompilato con la quota ancora residua per la categoria (100% se non è ancora assegnato nessun prodotto). Se si aggiunge il primo prodotto senza modificare quel valore, la categoria risulta coperta al 100% e il modulo per aggiungerne altri **sparisce del tutto**, anche se esistono altri prodotti compatibili non ancora assegnati — non c'è tetto sul numero di prodotti, ma non c'è modo di liberare quota. Inoltre non è possibile modificare la quota di un prodotto già assegnato: l'unica via è rimuoverlo (con conseguente perdita dell'assegnazione) e reinserirlo con una quota più bassa.

**Per inserire più prodotti nella stessa categoria** (es. Aranciata + Tè + Coca Cola sotto "bibite"): al momento di aggiungere il primo prodotto, scrivere a mano nel campo quota una percentuale più bassa del 100% (es. 34), invece di accettare il valore proposto — così il modulo resta visibile per aggiungerne altri.

Riferimenti: `app/(app)/preventivi/[id]/page.tsx` (condizione che nasconde il modulo, riga ~677) e `lib/db/preventivi.ts` (`aggiungiProdottoBeveraggio`). Non ancora corretto.

## Struttura

```
/app                  → route Next.js (una cartella per schermata)
/lib/db/              → UNICO punto di accesso a Supabase
/lib/calc/            → funzioni PURE di calcolo (testate, condivise da UI e PDF)
/lib/pdf/             → generazione PDF preventivo
/components/          → componenti UI (solo Tailwind)
/supabase/migrations/ → migrazioni SQL versionate
/tests/               → test unitari
```
