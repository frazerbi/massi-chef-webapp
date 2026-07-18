import { creaClientServer, utenteCorrente } from "./server";
import type { Impostazioni } from "./types";

/** Legge le impostazioni dell'utente, creando la riga con i default della specifica al primo accesso. */
export async function ottieniImpostazioni(): Promise<Impostazioni> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("impostazioni")
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`Lettura impostazioni fallita: ${error.message}`);
  if (data) return data as Impostazioni;

  const utente = await utenteCorrente();
  const { data: creata, error: erroreCreazione } = await supabase
    .from("impostazioni")
    .insert({ user_id: utente.id })
    .select()
    .single();
  if (erroreCreazione) {
    throw new Error(`Creazione impostazioni fallita: ${erroreCreazione.message}`);
  }
  return creata as Impostazioni;
}

export async function aggiornaImpostazioni(
  campi: Partial<Omit<Impostazioni, "user_id">>,
): Promise<void> {
  const supabase = await creaClientServer();
  const utente = await utenteCorrente();
  const { error } = await supabase
    .from("impostazioni")
    .update(campi)
    .eq("user_id", utente.id);
  if (error) throw new Error(`Aggiornamento impostazioni fallito: ${error.message}`);
}
