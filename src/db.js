import { supabase } from "./supabase";

/* ═══ USERS ══════════════════════════════════════════════════════════ */

export async function getUsers() {
  const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false });
  if (error) { console.error("getUsers:", error); return []; }
  return data;
}

export async function getUserByLogin(login) {
  const { data, error } = await supabase.from("users").select("*").ilike("login", login).eq("active", true).maybeSingle();
  if (error) { console.error("getUserByLogin:", error); return null; }
  return data;
}

export async function createUser(user) {
  const { data, error } = await supabase.from("users").insert([user]).select().single();
  if (error) { console.error("createUser:", error); return null; }
  return data;
}

export async function updateUser(id, fields) {
  const { data, error } = await supabase.from("users").update(fields).eq("id", id).select().single();
  if (error) { console.error("updateUser:", error); return null; }
  return data;
}

export async function deleteUser(id) {
  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) { console.error("deleteUser:", error); return false; }
  return true;
}

/* ═══ CLIENTS ════════════════════════════════════════════════════════ */

export async function getClients(userId) {
  const { data, error } = await supabase.from("clients").select("*").eq("user_id", userId).order("name");
  if (error) { console.error("getClients:", error); return []; }
  return data;
}

export async function createClient(client) {
  const { data, error } = await supabase.from("clients").insert([client]).select().single();
  if (error) { console.error("createClient:", error); return null; }
  return data;
}

export async function updateClient(id, fields) {
  const { data, error } = await supabase.from("clients").update(fields).eq("id", id).select().single();
  if (error) { console.error("updateClient:", error); return null; }
  return data;
}

export async function deleteClient(id) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) { console.error("deleteClient:", error); return false; }
  return true;
}

/* ═══ BUDGETS ════════════════════════════════════════════════════════ */

export async function getBudgets(userId) {
  const { data, error } = await supabase.from("budgets").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) { console.error("getBudgets:", error); return []; }
  return data;
}

export async function createBudget(budget) {
  const { data, error } = await supabase.from("budgets").insert([budget]).select().single();
  if (error) { console.error("createBudget:", error); return null; }
  return data;
}

export async function updateBudget(id, fields) {
  const { data, error } = await supabase.from("budgets").update(fields).eq("id", id).select().single();
  if (error) { console.error("updateBudget:", error); return null; }
  return data;
}

export async function deleteBudget(id) {
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) { console.error("deleteBudget:", error); return false; }
  return true;
}

/* ═══ AGENDAMENTOS ═══════════════════════════════════════════════════ */

export async function getAgendamentos(userId) {
  const { data, error } = await supabase.from("agendamentos").select("*").eq("user_id", userId).order("date");
  if (error) { console.error("getAgendamentos:", error); return []; }
  return data;
}

export async function createAgendamento(agendamento) {
  const { data, error } = await supabase.from("agendamentos").insert([agendamento]).select().single();
  if (error) { console.error("createAgendamento:", error); return null; }
  return data;
}

export async function updateAgendamento(id, fields) {
  const { data, error } = await supabase.from("agendamentos").update(fields).eq("id", id).select().single();
  if (error) { console.error("updateAgendamento:", error); return null; }
  return data;
}

export async function deleteAgendamento(id) {
  const { error } = await supabase.from("agendamentos").delete().eq("id", id);
  if (error) { console.error("deleteAgendamento:", error); return false; }
  return true;
}

/* ═══ TEMPLATES ══════════════════════════════════════════════════════ */

export async function getTemplates(userId) {
  const { data, error } = await supabase.from("templates").select("*").eq("user_id", userId).order("name");
  if (error) { console.error("getTemplates:", error); return []; }
  return data;
}

export async function createTemplate(template) {
  const { data, error } = await supabase.from("templates").insert([template]).select().single();
  if (error) { console.error("createTemplate:", error); return null; }
  return data;
}

export async function updateTemplate(id, fields) {
  const { data, error } = await supabase.from("templates").update(fields).eq("id", id).select().single();
  if (error) { console.error("updateTemplate:", error); return null; }
  return data;
}

export async function deleteTemplate(id) {
  const { error } = await supabase.from("templates").delete().eq("id", id);
  if (error) { console.error("deleteTemplate:", error); return false; }
  return true;
}

/* ═══ PROFILES ═══════════════════════════════════════════════════════ */

export async function getProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) { console.error("getProfile:", error); return null; }
  return data;
}

export async function saveProfile(userId, fields) {
  const { data, error } = await supabase.from("profiles").upsert({ ...fields, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: "user_id" }).select().single();
  if (error) { console.error("saveProfile:", error); return null; }
  return data;
}

/* ═══ ACTIVITY ═══════════════════════════════════════════════════════ */

export async function getActivity(userId) {
  const { data, error } = await supabase.from("activity").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
  if (error) { console.error("getActivity:", error); return []; }
  return data;
}

export async function logActivity(userId, action, detail = "") {
  const { error } = await supabase.from("activity").insert([{ user_id: userId, action, detail }]);
  if (error) console.error("logActivity:", error);
}
