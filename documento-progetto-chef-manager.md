# Chef Manager — Documento di progetto

**Versione:** 1.0 · **Data:** 16 luglio 2026
**Tipo:** Web app gestionale per professionista catering e chef privato

---

## 1. Visione e obiettivo

Un gestionale web personale che accompagna l'intero ciclo di lavoro di un professionista della ristorazione che opera in due modalità: **catering per grandi gruppi** e **chef privato a domicilio per gruppi piccoli**.

Il cuore del sistema è la catena: *materie prime con costi reali → ricette con costo per porzione → menu → preventivo scalato sul numero di ospiti → evento confermato → spesa, produzione, pagamenti e consuntivo*.

L'obiettivo pratico è duplice: generare preventivi accurati e professionali in pochi minuti, e sapere sempre quanto costa davvero ogni piatto e quanto margine produce ogni evento.

### Non-obiettivi (fuori perimetro)

Il sistema non gestisce fatturazione elettronica italiana e non genera XML FatturaPA: i documenti prodotti (proforma, ricevute, note di pagamento) sono documenti amministrativi di supporto. Non è previsto un uso multi-azienda o multi-tenant: l'app serve un singolo professionista, eventualmente con collaboratori in sola consultazione in fasi future.

---

## 2. Le due modalità operative

Un selettore in alto permette di passare tra **Catering** e **Chef Privato**. Il cambio modalità è solo un filtro di interfaccia: non esistono due database separati. Materie prime, consumabili, ricette, clienti, agenda e storico sono un patrimonio unico e condiviso.

Ciò che cambia tra le due modalità è il tipo di evento e i moduli visibili attorno ad esso:

| Aspetto | Catering | Chef Privato |
|---|---|---|
| Volume tipico | 50–300+ ospiti | 2–20 ospiti |
| Entità evento | Evento catering | Servizio privato |
| Dettagli specifici | Logistica, noleggi, brigata, lista produzione | Sopralluogo cucina, ore chef, trasferta |
| Preventivo | Menu a portate × N ospiti + personale + logistica | Menu + lavoro chef + trasferta |
| Moduli condivisi | Ricette, materie prime, clienti, pagamenti, spesa aggregata, HACCP, documenti, agenda | Gli stessi |

**Regola di modellazione:** esiste una sola entità `evento` con campo `tipo` (`catering` | `privato`). I dettagli specifici vivono in tabelle collegate 1:1 (`dettaglio_catering`, `dettaglio_privato`). Tutte le logiche trasversali (pagamenti, spesa, storico cliente, agenda) operano su `evento` e funzionano identiche per entrambe le modalità senza duplicazione di codice.

---

## 3. Architettura tecnica

| Livello | Tecnologia | Motivazione |
|---|---|---|
| Frontend + backend | Next.js (React, App Router) | Un solo progetto; API routes per PDF e aggregazioni |
| Database | Supabase (Postgres) | Modello fortemente relazionale; backup automatici; auth inclusa |
| Stile | Tailwind CSS | Velocità di sviluppo, UI coerente |
| Hosting | Vercel | Deploy automatico da GitHub, gratuito a questo volume |
| PDF | Generazione lato server (API route) | Preventivi e documenti con layout controllato |
| Autenticazione | Supabase Auth (email + password) | Accesso singolo utente, estendibile |

Principi architetturali:

1. **Accesso ai dati centralizzato.** Tutte le query passano da un livello di servizio (`/lib/db/`), mai chiamate Supabase sparse nei componenti. Facilita test, migrazioni e regole di business coerenti.
2. **Calcoli lato server o in funzioni pure condivise.** Le formule di costo vivono in `/lib/calc/` come funzioni pure testabili, usate sia dall'interfaccia (anteprima live) sia dalla generazione documenti.
3. **Row Level Security attiva** su tutte le tabelle: ogni riga appartiene a `user_id`.
4. **Soft delete** (`deleted_at`) per ricette, materie prime e clienti: nulla di referenziato da preventivi storici viene mai cancellato fisicamente.

---

## 4. Modello dati

### 4.1 Anagrafiche di base

**`materia_prima`** — l'ingrediente acquistabile.

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | |
| nome | text | es. "Farina 00", "Branzino intero" |
| categoria | text | ortofrutta, carne, pesce, dispensa, latticini… |
| unita_acquisto | enum | kg, l, pz, conf |
| prezzo_acquisto | numeric | prezzo per unità di acquisto |
| unita_uso | enum | g, ml, pz |
| fattore_conversione | numeric | quante unità d'uso in una di acquisto (kg→g = 1000) |
| resa_percentuale | numeric | default 100; vedi §5.1 (scarto) |
| fornitore_preferito | text | opzionale |
| allergeni | text[] | glutine, crostacei, uova… (14 allergeni UE) |
| note | text | |

**`consumabile`** — materiale non alimentare a consumo (tovaglioli, contenitori, gas): stessi campi di costo, senza resa e allergeni.

**`cliente`**

| Campo | Note |
|---|---|
| nome / ragione_sociale | |
| tipo | privato, azienda |
| contatti | telefono, email |
| indirizzi | testo libero, più indirizzi possibili |
| note | preferenze, allergie ricorrenti del nucleo |

### 4.2 Ricette

**`ricetta`**

| Campo | Note |
|---|---|
| nome, descrizione | |
| categoria_portata | antipasto, primo, secondo, contorno, dessert, finger… |
| porzioni_base | per quante porzioni è scritta la ricetta (es. 4) |
| tempo_preparazione_min | per pianificare la produzione |
| costo_manuale_extra | eventuale costo fisso aggiuntivo per porzione |
| istruzioni | testo libero / passi |
| attiva | bool — le ricette ritirate non compaiono nei nuovi menu |

**`ricetta_ingrediente`** (riga della distinta base)

| Campo | Note |
|---|---|
| ricetta_id, materia_prima_id | |
| quantita | in unità d'uso della materia prima, riferita a `porzioni_base` |
| opzionale | bool (guarnizioni, varianti) |

Una ricetta può includere come ingrediente **un'altra ricetta** (sotto-ricetta: un fondo, una salsa base). Campo alternativo `sotto_ricetta_id` con `quantita_porzioni`. Il calcolo costi è ricorsivo con controllo anti-ciclo (una ricetta non può contenersi, direttamente o indirettamente).

### 4.3 Menu e preventivi

**`menu`** — una composizione riutilizzabile di ricette ordinate per portata (es. "Menu Mare 3 portate"). Serve come template; il preventivo ne fa una copia.

**`preventivo`**

| Campo | Note |
|---|---|
| cliente_id, evento_id (nullable finché non confermato) | |
| tipo | catering / privato |
| data_evento, numero_ospiti | |
| stato | bozza → inviato → confermato / rifiutato / scaduto |
| righe (tabella `preventivo_riga`) | vedi sotto |
| food_cost_snapshot | jsonb — vedi §5.4 (immutabilità) |
| margine_target_pct | usato per suggerire il prezzo |
| prezzo_totale | quello effettivamente proposto |
| validita_giorni | default 30 |
| note_cliente, condizioni | testo che finisce sul PDF |

**`preventivo_riga`** — una riga per ricetta/portata (con n. porzioni, costo unitario congelato, prezzo unitario) e righe libere per voci non-ricetta: personale, trasferta, noleggi, consumabili, sconti.

### 4.4 Eventi ed esecuzione

**`evento`** — nasce alla conferma di un preventivo (o creato a mano).

| Campo | Note |
|---|---|
| tipo, cliente_id, preventivo_id | |
| data, ora_inizio, ora_fine, indirizzo | |
| numero_ospiti_confermato | può differire dal preventivo → ricalcolo, vedi §5.5 |
| stato | pianificato → in_corso → concluso → annullato |

**`dettaglio_privato`** (1:1 con evento di tipo privato): ore_chef_previste, tariffa_oraria, km_trasferta, costo_trasferta, sopralluogo_id.

**`sopralluogo_cucina`**: piano cottura (tipo, n. fuochi), forno, frigo, congelatore, parcheggio, ascensore, spazio di lavoro, note e foto. Collegabile al cliente (riutilizzabile per servizi successivi nella stessa casa).

**`dettaglio_catering`** (1:1 con evento catering): location, referente in loco, e collegamenti a brigata e logistica.

### 4.5 Personale, logistica, HACCP

**`collaboratore`**: nome, ruolo (chef, sous, sala, lavaggio…), tipo compenso (orario / a chiamata), tariffa.

**`turno`**: evento_id, collaboratore_id, ora inizio/fine previste ed effettive, costo pianificato e consuntivo.

**`attrezzatura`** — il parco strumenti di proprietà (piastre, forni, impastatrici, abbattitore, coltelleria, gastronorm…), con i dati per l'ammortamento per evento (logica in §5.10):

| Campo | Tipo | Note |
|---|---|---|
| nome | text | es. "Impastatrice a spirale 20 l" |
| categoria | text | cottura, preparazione, freddo, trasporto, servizio, utensili |
| costo_acquisto | numeric | prezzo pagato, IVA inclusa o esclusa a scelta coerente |
| data_acquisto | date | |
| anni_ammortamento | int | orizzonte di ritorno sull'investimento, es. 3, 5, 8 |
| eventi_stimati_anno | int | quanti eventi/anno si prevede di usarla |
| quota_per_evento | numeric | calcolata, sovrascrivibile a mano |
| stato | enum | in_uso / in_riparazione / dismessa / venduta |
| valore_dismissione | numeric | opzionale, se venduta |
| note, foto | | manuali, seriale, garanzia |

**`evento_attrezzatura`** — collega le attrezzature effettivamente impiegate a ciascun evento (spuntabile dalla scheda evento o generato dai movimenti logistici). È la base sia del conteggio di ammortamento sia della checklist di carico/scarico furgone.

**`noleggio`** (attrezzatura di terzi con costo per evento) e **`movimento_logistico`**: evento_id, articolo (attrezzatura o noleggio), quantità, uscita, rientro previsto, rientro confermato (data + flag), costo. Un articolo non rientrato oltre la data prevista genera un avviso.

**`lotto`** (HACCP): materia_prima_id, numero_lotto, fornitore, data_ricevimento, scadenza, quantita_ricevuta, quantita_residua, documento di trasporto. Avvisi automatici per lotti scaduti o in scadenza entro X giorni (configurabile, default 3).

### 4.6 Pagamenti e documenti

**`pagamento`**: evento_id (o preventivo_id), tipo (acconto / saldo / rimborso), importo, scadenza, data_incasso, metodo (contanti, bonifico, POS, altro), stato (previsto / incassato / scaduto).

**`documento`**: tipo (proforma / ricevuta / nota_pagamento), numero progressivo per tipo e anno, preventivo/evento collegato, pdf generato e archiviato, data emissione. I documenti emessi sono immutabili: correzioni tramite nuovo documento.

### 4.7 Beveraggio

**`bevanda`** — l'articolo acquistabile da bere.

| Campo | Note |
|---|---|
| nome | es. "Acqua naturale", "Vermentino", "Birra chiara" |
| categoria | acqua_naturale, acqua_frizzante, vino_bianco, vino_rosso, bollicine, birra, soft_drink, succhi, caffe, amari_distillati |
| formato_confezione | es. bottiglia 0,75 l, lattina 0,33 l, cassa 6×1 l |
| capacita_unitaria_ml | contenuto della singola unità |
| unita_per_collo | per l'arrotondamento all'acquisto (es. cartone da 6) |
| prezzo_unitario | costo della singola unità |
| alcolica | bool — esclusa automaticamente per la quota bambini |

**`profilo_beveraggio`** — template riutilizzabile di consumi **a testa** per un tipo di servizio (es. "Pranzo placée", "Cena estiva", "Aperitivo rinforzato", "Matrimonio con open bar"). Righe: categoria di bevanda + ml a persona (+ eventuale ml/persona/ora per le voci a durata, come l'open bar).

**`preventivo_beveraggio`** — la copia del profilo agganciata al singolo preventivo, con i valori modificabili caso per caso e lo snapshot dei prezzi alla conferma (stessa regola di immutabilità delle ricette, §5.4).

---

## 5. Logiche di business (il cuore del sistema)

Tutte le formule vivono in funzioni pure in `/lib/calc/` con test unitari. Gli importi sono in centesimi di euro (interi) nei calcoli interni; l'arrotondamento a 2 decimali avviene solo alla presentazione. Le quantità usano 3 decimali.

### 5.1 Costo unitario di una materia prima

Il costo per unità d'uso tiene conto della conversione e dello **scarto** (resa):

```
costo_per_unita_uso = prezzo_acquisto / fattore_conversione / (resa_percentuale / 100)
```

Esempio: branzino intero a 18 €/kg con resa 45% (dopo pulizia e sfilettatura) → costo reale del filetto = 18 / 1000 / 0,45 = **0,04 €/g**, cioè 40 €/kg effettivi. È questa la differenza tra un food cost realistico e uno illusorio.

### 5.2 Costo di una ricetta

```
costo_ricetta_base = Σ (quantita_ingrediente × costo_per_unita_uso)
                   + Σ (porzioni_sottoricetta × costo_porzione_sottoricetta)   [ricorsivo]
costo_porzione     = costo_ricetta_base / porzioni_base + costo_manuale_extra
```

Regole: gli ingredienti `opzionale = true` sono inclusi di default ma escludibili nel preventivo; la ricorsione sulle sotto-ricette ha profondità massima 5 e controllo anti-ciclo alla scrittura (vincolo verificato lato server, non solo UI).

Il costo porzione mostrato nell'app è **sempre calcolato live** dai prezzi correnti delle materie prime: aggiornare il prezzo della farina aggiorna istantaneamente il costo di tutte le ricette che la usano.

### 5.3 Scalatura per numero di ospiti

```
quantita_totale_ingrediente = quantita_per_porzione × numero_ospiti × (1 + sfrido_pct/100)
```

Lo **sfrido di servizio** (default 10% catering, 5% privato, modificabile per preventivo) copre assaggi, porzioni extra e imprevisti: è distinto dalla resa della materia prima (§5.1), che riguarda la pulizia del prodotto. La scalatura è lineare; eventuali non-linearità (es. sale, fondi) si gestiscono a buon senso in fase di spesa, non nel modello.

### 5.4 Preventivo: prezzo, margine e immutabilità

Per ogni riga-ricetta del preventivo:

```
costo_riga  = costo_porzione × numero_ospiti
food_cost   = Σ costo_righe_ricette
costo_extra = personale previsto + trasferta + noleggi + consumabili
costo_totale = food_cost + costo_extra
prezzo_suggerito = costo_totale / (1 − margine_target_pct/100)
```

Il prezzo suggerito è un aiuto: il prezzo finale lo decide l'utente riga per riga o a totale. L'app mostra sempre, in tempo reale: food cost %, utile stimato in € e margine effettivo %.

**Regola di immutabilità (fondamentale):** al passaggio di stato `bozza → inviato`, il preventivo **congela uno snapshot** dei costi unitari di ogni riga (`food_cost_snapshot`). Da quel momento i cambi di prezzo delle materie prime o le modifiche alle ricette **non alterano più** il preventivo inviato: ciò che il cliente ha ricevuto resta esattamente quello. Una bozza, invece, ricalcola sempre live. Per aggiornare un preventivo inviato si crea una **revisione** (nuovo record con `revisione_di_id`), mantenendo lo storico di ogni versione mandata al cliente.

### 5.5 Dal preventivo all'evento

Alla conferma: si crea l'`evento`, si copiano data/ospiti/righe, si generano i pagamenti previsti (es. acconto 30% a conferma, saldo a 7 giorni dall'evento — percentuali configurabili). Se il numero ospiti confermato cambia rispetto al preventivo, l'app ricalcola quantità e costi dell'evento **usando lo snapshot dei costi unitari** (non i prezzi correnti) e mostra il delta di prezzo suggerito; la decisione commerciale resta manuale.

### 5.6 Spesa e preparazione aggregata (periodo)

Input: intervallo di date (+ filtro modalità opzionale). Il sistema prende tutti gli eventi **confermati o pianificati** nel periodo e:

1. Esplode ogni riga-ricetta in ingredienti scalati (con sfrido), ricorsivamente sulle sotto-ricette.
2. **Aggrega per materia prima** sommando le quantità in unità d'uso.
3. Converte in unità di acquisto e arrotonda **per eccesso** al taglio d'acquisto (non si compra 1,3 confezioni).
4. Sottrae la **disponibilità di magazzino** (Σ `quantita_residua` dei lotti non scaduti) → quantità da acquistare.
5. Calcola il costo stimato della spesa ai prezzi correnti.
6. Aggrega allo stesso modo il **beveraggio** degli eventi nel periodo (§5.11): unità da acquistare per bevanda, arrotondate al collo.
7. Genera la **checklist delle preparazioni**: ricette da produrre con porzioni totali, ordinate per data evento e tempo di preparazione, raggruppando le ricette comuni a più eventi.

Output esportabile in PDF (lista spesa per categoria/fornitore, checklist produzione per giornata).

### 5.7 Servizi privati: utile stimato

```
ricavo        = prezzo_totale concordato
costo_food    = Σ costo righe ricette (snapshot)
costo_lavoro  = ore_chef × tariffa_oraria + costo turni collaboratori
costo_altro   = trasferta + consumabili + noleggi
costo_attrezz = Σ quota_per_evento delle attrezzature impiegate   [§5.10]
utile_stimato = ricavo − costo_food − costo_lavoro − costo_altro − costo_attrezz
```

Il consuntivo post-evento sostituisce ore previste con ore effettive e permette di correggere il food cost reale, alimentando lo storico cliente.

### 5.8 Pagamenti e stati

Stati calcolati automaticamente: un pagamento `previsto` con scadenza superata diventa `scaduto` (evidenziato in dashboard). Lo storico cliente somma per ogni cliente: numero servizi, valore totale, incassato, residuo, utile stimato complessivo. Un rimborso è un pagamento con importo negativo ai fini dei totali.

### 5.9 HACCP: regole di magazzino

Il carico avviene per lotto al ricevimento merce. Lo scarico è **manuale semplificato** (l'utente registra i prelievi o corregge le giacenze dopo la spesa/produzione): non si tenta lo scarico automatico dalla produzione in fase 1, perché la precisione richiesta non ripaga la complessità. Avvisi: lotto scaduto (blocco visivo, non tecnico), scadenza entro N giorni, giacenza negativa (errore di registrazione).

### 5.10 Attrezzature: ammortamento per evento e ritorno sull'investimento

Ogni attrezzatura acquistata "carica" una quota del proprio costo su ciascun evento in cui viene usata, così che l'utile stimato rifletta anche il consumo del capitale investito e non solo i costi vivi.

```
quota_per_evento = (costo_acquisto − valore_dismissione_previsto)
                 / (anni_ammortamento × eventi_stimati_anno)
```

Esempio: impastatrice da 1.800 €, orizzonte 5 anni, 40 eventi/anno stimati → quota = 1.800 / 200 = **9 € per evento**. La quota calcolata è sovrascrivibile a mano (per attrezzature minori si può impostare un forfait, o zero per utensili sotto una soglia di costo configurabile, default 100 €: sotto soglia il costo si considera spesato subito e non ammortizzato).

**Conteggio effettivo.** Ogni evento registra le attrezzature impiegate (`evento_attrezzatura`); a evento concluso la quota si consolida. Per ogni attrezzatura l'app mostra il pannello di ritorno sull'investimento:

```
eventi_effettivi      = n. eventi conclusi che la impiegano
ammortizzato          = eventi_effettivi × quota_per_evento
ritorno_pct           = ammortizzato / costo_acquisto × 100     (tetto 100%)
data_fine_prevista    = data_acquisto + anni_ammortamento
ritmo                 = eventi_effettivi/anno vs eventi_stimati_anno
```

Se il ritmo reale è più lento del previsto, l'app segnala che a fine orizzonte l'attrezzatura non sarà rientrata e suggerisce la quota ricalcolata sul ritmo effettivo; l'adeguamento resta una scelta manuale e vale solo per gli eventi futuri (le quote già consolidate su eventi conclusi non cambiano, coerentemente con la regola di immutabilità dei consuntivi). Un'attrezzatura completamente ammortizzata smette di caricare quote: da lì in poi ogni evento la usa "gratis" e il margine migliora.

**Rapporto con il preventivo.** La quota di ammortamento è un costo interno per il calcolo dell'utile: non compare come voce sul PDF del cliente, ma entra nel `costo_totale` usato per il prezzo suggerito (§5.4), sommata per le attrezzature che si prevede di impiegare. Chiarezza contabile: questo è un ammortamento *gestionale* per decidere prezzi e leggere i margini, non l'ammortamento fiscale del commercialista — i due possono avere durate diverse senza problemi.

### 5.11 Beveraggio: stima a testa

Il calcolo parte da un **profilo** (§4.7) scelto nel preventivo, che definisce i millilitri a persona per categoria. Il **profilo standard** dell'app è questo (valori a persona, servizio completo):

| Categoria | Quantità a testa | Note |
|---|---|---|
| Acqua naturale | 600 ml | |
| Acqua frizzante | 400 ml | totale acqua 1,0 l |
| Vino bianco | 200 ml | |
| Vino rosso | 200 ml | totale vino 0,4 l — riparto modificabile in base al menu |
| Spumante | 100 ml | |
| Birra | 400 ml | |
| Bibite / soft drink | 400 ml | |
| Caffè | 1 tazza | |

Questi sono valori **teorici per singola categoria**: rappresentano quanto berrebbe un ospite se quella fosse la sua bevanda di riferimento. Da qui derivano profili varianti (aperitivo, evento estivo, matrimonio con open bar), tutti modificabili e salvabili come template propri.

**Regola di sovrapposizione degli alcolici (fondamentale per non comprare troppo).** Nella pratica non tutti gli ospiti bevono sia vino sia birra: se il servizio prevede entrambi, il consumo reale si distribuisce tra le due categorie. Quando in un profilo sono attive due o più categorie alcoliche "concorrenti" (vino e birra), l'app applica automaticamente un **fattore di distribuzione** che riduce del 20–30% la somma teorica di vino + birra (default 25%, regolabile per preventivo):

```
volume_teorico_alcolici  = (ml_vino + ml_birra) × ospiti_adulti
volume_corretto_alcolici = volume_teorico_alcolici × (1 − fattore_distribuzione)
```

La riduzione si ripartisce proporzionalmente tra vino e birra mantenendo i rapporti interni (bianco/rosso invariati). Lo spumante resta escluso dalla riduzione: è legato al brindisi/aperitivo, non alternativo al vino a tavola. Se il profilo prevede una sola categoria alcolica, nessuna riduzione. L'interfaccia mostra sempre entrambe le colonne — quantità teorica e quantità corretta — così la scelta resta trasparente e verificabile.

La formula per ogni riga (dopo l'eventuale correzione di distribuzione):

```
volume_totale = ml_a_testa × ospiti_adulti
              + ml_a_testa_ora × ore_servizio × ospiti_adulti     [solo voci a durata]
unita_necessarie = ⌈ volume_totale / capacita_unitaria_ml ⌉
colli_da_acquistare = ⌈ unita_necessarie / unita_per_collo ⌉      [arrotondamento per eccesso]
costo_beveraggio = colli × unita_per_collo × prezzo_unitario
```

Regole di calcolo:

1. **Ospiti divisi in adulti e bambini** nel preventivo: i bambini ricevono le sole categorie analcoliche, con quota ridotta configurabile (default 50% sulle bibite, acqua piena).
2. **Correttivi rapidi** applicabili con un tocco: stagione calda (+30% acqua e birra), evento lungo oltre 4 ore (+20% su tutto), pubblico "beve poco / beve molto" (−20% / +20% sugli alcolici). I correttivi si applicano prima del fattore di distribuzione.
3. **Il riparto bianco/rosso** (default 50/50) è modificabile e l'app suggerisce più bianco se il menu è prevalentemente di pesce, leggendo le categorie delle ricette del preventivo.
4. **Arrotondamento sempre per eccesso** al collo di acquisto: l'avanzo è fisiologico e voluto (meglio una cassa in più che restare senza), e viene mostrato come "scorta residua stimata". Il fattore di distribuzione lavora a monte proprio per evitare che l'eccesso teorico si sommi all'arrotondamento.
5. Nel preventivo il beveraggio compare come voce dedicata, mostrabile al cliente **a corpo, a testa o in dettaglio** a scelta; internamente entra nel `costo_totale` per il prezzo suggerito (§5.4) e viene congelato nello snapshot alla conferma. Se il beveraggio lo porta il cliente, la sezione si disattiva con un flag ("solo servizio") ed eventualmente si aggiunge una riga di diritto di tappo.
6. La lista spesa aggregata (§5.6) somma il beveraggio di tutti gli eventi del periodo per fare un ordine unico al fornitore.

### 5.12 Numerazione documenti

Progressivo separato per tipo e anno (`PRO-2026-001`, `RIC-2026-001`, `NDP-2026-001`), assegnato in transazione al momento dell'emissione, mai riutilizzato. Il PDF generato viene archiviato su Supabase Storage e il documento diventa immutabile.

---

## 6. Interfaccia: mappa delle schermate

1. **Dashboard** — prossimi eventi, pagamenti in scadenza/scaduti, avvisi HACCP e logistica, utile del mese.
2. **Materie prime & consumabili** — tabella con ricerca, modifica rapida prezzi, indicatore "usata in N ricette".
3. **Ricette** — elenco per portata con costo porzione live; editor con distinta ingredienti, anteprima costi in tempo reale, allergeni ereditati automaticamente dagli ingredienti.
4. **Menu** — composizione template a portate.
5. **Preventivi** — wizard: cliente → tipo → data e ospiti (adulti/bambini) → menu/ricette → beveraggio (profilo + correttivi) → extra → margine e prezzo → anteprima PDF → invio. Duplicazione con un clic.
6. **Agenda** — calendario mensile eventi (entrambe le modalità, colori distinti).
7. **Evento / Servizio** — scheda con dettagli, brigata o sopralluogo, logistica, pagamenti, consuntivo.
8. **Spesa & preparazione** — selettore periodo → lista aggregata e checklist.
9. **Magazzino / HACCP** — lotti, scadenze, carico merce.
10. **Bevande & profili beveraggio** — catalogo bevande con formati e prezzi; editor dei profili di consumo a testa.
11. **Attrezzature** — parco strumenti con costo, data acquisto, quota per evento e pannello di ritorno sull'investimento (ammortizzato, %, ritmo effettivo vs stimato).
12. **Clienti** — anagrafica e storico con totali.
13. **Documenti** — archivio emessi, generazione da preventivo/evento.

L'interfaccia è **mobile-first** per le sezioni usate sul campo (agenda, spesa, HACCP, scheda evento) e desktop-oriented per editor ricette e preventivi.

---

## 7. Piano di sviluppo per fasi

| Fase | Contenuto | Criterio di completamento |
|---|---|---|
| **1 — Core** | Auth, materie prime, ricette con costi, menu, beveraggio a testa, preventivo scalato con PDF | Genero un preventivo 3 portate × 100 persone, bevande incluse, in < 10 min |
| **2 — Clienti & incassi** | Clienti, eventi da preventivo, pagamenti, storico, agenda | So sempre chi mi deve cosa |
| **3 — Chef privato** | Dettaglio servizio, sopralluoghi, ore/trasferta, utile stimato | Consuntivo di un servizio reale |
| **4 — Spesa & produzione** | Aggregazione periodo, checklist preparazioni, export PDF | Lista spesa di una settimana reale |
| **5 — Magazzino & HACCP** | Lotti, scadenze, disponibilità in lista spesa | Avvisi scadenza funzionanti |
| **6 — Brigata, logistica & attrezzature** | Collaboratori, turni, parco attrezzature con ammortamento per evento, noleggi, rientri | Consuntivo evento completo di costo personale e quote attrezzature |
| **7 — Documenti** | Proforma, ricevute, note di pagamento, numerazione | Archivio immutabile |

Ogni fase termina con l'uso su un caso reale prima di iniziare la successiva: è il modo più rapido per scoprire gli errori di modello quando correggerli costa poco.

---

## 8. Regole trasversali di qualità

1. **Validazioni server-side**: quantità > 0, resa 1–100%, margine < 100%, date coerenti, anti-ciclo sotto-ricette.
2. **Nessuna cancellazione fisica** di entità referenziate: soft delete + filtro `attiva`.
3. **Unità di misura chiuse** (enum) con conversioni esplicite: mai testo libero, mai conversioni implicite tra peso e volume.
4. **Arrotondamenti**: importi a 2 decimali solo in presentazione; quantità spesa per eccesso al taglio di acquisto.
5. **Backup**: affidati a Postgres/Supabase, più export manuale JSON/CSV completo dalla pagina impostazioni (indipendenza dai fornitori).
6. **Audit minimo**: `created_at` / `updated_at` ovunque; storico stati su preventivi, eventi e pagamenti.

---

## 9. Rischi e decisioni rimandate

Restano volutamente aperti, da decidere quando serviranno: gestione IVA nei prezzi (per ora prezzi netti con nota sul PDF), multi-listino fornitori per materia prima (per ora un prezzo di riferimento), scarico automatico magazzino da produzione (per ora manuale), accesso collaboratori in sola lettura (per ora utente singolo), e integrazione con fatturazione elettronica tramite servizi terzi (esplicitamente fuori perimetro).
