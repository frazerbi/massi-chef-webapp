import { creaClientServer } from "./server";
import type { Cliente, TipoCliente } from "./types";
import { validaTesto } from "./validazioni";

export interface InputCliente {
  nome: string;
  tipo: TipoCliente;
  telefono?: string | null;
  email?: string | null;
  indirizzi?: string | null;
  note?: string | null;
}

export async function elencoClienti(): Promise<Cliente[]> {
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("cliente")
    .select("*")
    .is("deleted_at", null)
    .order("nome");
  if (error) throw new Error(`Lettura clienti fallita: ${error.message}`);
  return (data ?? []) as Cliente[];
}

export async function creaCliente(input: InputCliente): Promise<string> {
  const nome = validaTesto(input.nome, "nome cliente");
  const supabase = await creaClientServer();
  const { data, error } = await supabase
    .from("cliente")
    .insert({ ...input, nome })
    .select("id")
    .single();
  if (error) throw new Error(`Creazione cliente fallita: ${error.message}`);
  return data.id as string;
}
