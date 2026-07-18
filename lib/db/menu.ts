import { creaClientServer } from "./server";
import type { Menu, MenuRiga } from "./types";
import { validaTesto } from "./validazioni";

export async function elencoMenu(): Promise<Menu[]> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("menu")
    .select("*")
    .is("deleted_at", null)
    .order("nome");
  if (error) throw new Error(`Lettura menu fallita: ${error.message}`);
  return (data ?? []) as Menu[];
}

export async function menuPerId(id: string): Promise<Menu> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase.from("menu").select("*").eq("id", id).single();
  if (error) throw new Error(`Menu non trovato: ${error.message}`);
  return data as Menu;
}

export async function righeDiMenu(menuId: string): Promise<MenuRiga[]> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("menu_riga")
    .select("*")
    .eq("menu_id", menuId)
    .order("ordine");
  if (error) throw new Error(`Lettura righe menu fallita: ${error.message}`);
  return (data ?? []) as MenuRiga[];
}

export async function creaMenu(nome: string, descrizione?: string | null): Promise<string> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("menu")
    .insert({ nome: validaTesto(nome, "nome menu"), descrizione })
    .select("id")
    .single();
  if (error) throw new Error(`Creazione menu fallita: ${error.message}`);
  return data.id as string;
}

export async function aggiungiRicettaAMenu(
  menuId: string,
  ricettaId: string,
  ordine: number,
): Promise<void> {
  const supabase = await creaClientServer();
  const { error } = await supabase
    .from("menu_riga")
    .insert({ menu_id: menuId, ricetta_id: ricettaId, ordine });
  if (error) throw new Error(`Aggiunta ricetta al menu fallita: ${error.message}`);
}

export async function rimuoviRigaMenu(id: string): Promise<void> {
  const supabase = await creaClientServer();
  const { error } = await supabase.from("menu_riga").delete().eq("id", id);
  if (error) throw new Error(`Rimozione riga menu fallita: ${error.message}`);
}

export async function eliminaMenu(id: string): Promise<void> {
  const supabase = await creaClientServer();
  const { error } = await supabase
    .from("menu")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Eliminazione menu fallita: ${error.message}`);
}
