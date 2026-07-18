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
