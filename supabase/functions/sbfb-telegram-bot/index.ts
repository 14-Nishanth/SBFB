import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const token = (Deno.env.get("TELEGRAM_BOT_TOKEN") || "").trim();
const webhookSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") || "";
const admins = (Deno.env.get("ADMIN_TELEGRAM_IDS") || "").split(",").map(x => x.trim()).filter(Boolean);
const cors = { "Content-Type": "application/json" };

type Role = "admin" | "manager" | "staff";
type FlowKind = "stock" | "sale" | "expense";
const specs: Record<FlowKind, { key: string; prompt: string; numeric?: boolean; min?: number }[]> = {
  stock: [
    { key: "material", prompt: "Material name?" },
    { key: "quantity", prompt: "Quantity? Enter a number greater than 0.", numeric: true, min: 0.000001 },
    { key: "unit", prompt: "Unit? (kg, ton, bag, unit, etc.)" },
    { key: "amount", prompt: "Total purchase amount in ₹?", numeric: true, min: 0 },
    { key: "supplier", prompt: "Supplier name? Type - if not applicable." },
    { key: "paid_amount", prompt: "Amount already paid in ₹? Enter 0 if unpaid.", numeric: true, min: 0 }
  ],
  sale: [
    { key: "material", prompt: "Product/material sold?" },
    { key: "quantity", prompt: "Quantity sold? Enter a number greater than 0.", numeric: true, min: 0.000001 },
    { key: "unit", prompt: "Unit? (pcs, kg, ton, etc.)" },
    { key: "selling_price", prompt: "Selling price per unit in ₹?", numeric: true, min: 0 },
    { key: "customer", prompt: "Customer name?" },
    { key: "paid_amount", prompt: "Amount received in ₹? Enter 0 if unpaid.", numeric: true, min: 0 }
  ],
  expense: [
    { key: "category", prompt: "Expense category? (fuel, repair, wages, etc.)" },
    { key: "amount", prompt: "Expense amount in ₹?", numeric: true, min: 0.01 },
    { key: "description", prompt: "Description? Type - if none." },
    { key: "paid_to", prompt: "Paid to? Type - if not applicable." }
  ]
};

async function send(chatId: string | number, text: string, extra: Record<string, unknown> = {}) {
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  const response = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, ...extra })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error("Telegram sendMessage failed.");
}
async function getRole(id: string): Promise<Role | null> {
  if (admins.includes(id)) return "admin";
  const { data, error } = await db.from("telegram_user_roles").select("role").eq("telegram_user_id", id).eq("is_active", true).maybeSingle();
  if (error || !data) return null;
  return data.role as Role;
}
async function getSession(id: string) {
  const { data, error } = await db.from("telegram_bot_sessions").select("*").eq("telegram_user_id", id).maybeSingle();
  if (error) throw error;
  return data;
}
async function saveSession(id: string, chatId: string, state: string, payload: Record<string, unknown>) {
  const { error } = await db.from("telegram_bot_sessions").upsert({ telegram_user_id: id, chat_id: chatId, state, payload, updated_at: new Date().toISOString() });
  if (error) throw error;
}
async function clearSession(id: string) {
  const { error } = await db.from("telegram_bot_sessions").delete().eq("telegram_user_id", id);
  if (error) throw error;
}
function menu(role: Role) {
  const common = ["/menu — show options", "/stock — recent stock", "/sales — recent sales", "/addstock — record incoming stock", "/sales add — record a sale", "/cancel — cancel current entry"];
  if (role === "admin") return ["SBFB Company Manager — ADMIN", ...common, "/expense — record expense", "/report — monthly summary", "/setrole ID manager|staff — assign access"];
  if (role === "manager") return ["SBFB Company Manager — MANAGER", ...common, "/expense — record expense", "/report — monthly summary"];
  return ["SBFB Company Manager — STAFF", ...common];
}
async function startFlow(chatId: string, id: string, kind: FlowKind) {
  const payload = { kind, index: 0, values: {} };
  await saveSession(id, chatId, "collect", payload);
  await send(chatId, "📝 " + (kind === "stock" ? "Add Stock" : kind === "sale" ? "Record Sale" : "Record Expense") + "\n\n" + specs[kind][0].prompt + "\n\nSend /cancel to stop.");
}
function rupees(n: unknown) { return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 }); }
async function finishFlow(chatId: string, id: string, payload: any) {
  const kind = payload.kind as FlowKind;
  const v = payload.values || {};
  if (kind === "stock") {
    const amount = Number(v.amount), paid = Number(v.paid_amount);
    const outstanding = Math.max(0, amount - paid);
    const { error } = await db.from("stock_entries").insert({
      material: String(v.material).trim(), quantity: Number(v.quantity), unit: String(v.unit).trim(),
      amount, supplier: String(v.supplier) === "-" ? null : String(v.supplier).trim(),
      paid_amount: paid, outstanding_amount: outstanding,
      payment_status: outstanding === 0 ? "paid" : paid > 0 ? "partial" : "unpaid",
      telegram_user_id: id
    });
    if (error) throw error;
    await send(chatId, "✅ Stock entry saved.\n" + String(v.material) + ": " + v.quantity + " " + v.unit + "\nPurchase: " + rupees(amount) + "\nPaid: " + rupees(paid) + "\nOutstanding: " + rupees(outstanding));
  } else if (kind === "sale") {
    const total = Number(v.quantity) * Number(v.selling_price), paid = Number(v.paid_amount);
    const outstanding = Math.max(0, total - paid);
    const { error } = await db.from("sales_entries").insert({
      material: String(v.material).trim(), quantity: Number(v.quantity), unit: String(v.unit).trim(),
      selling_price: Number(v.selling_price), total_amount: total, customer: String(v.customer).trim(),
      paid_amount: paid, outstanding_amount: outstanding,
      payment_status: outstanding === 0 ? "paid" : paid > 0 ? "partial" : "unpaid",
      telegram_user_id: id
    });
    if (error) throw error;
    await send(chatId, "✅ Sale saved.\n" + String(v.material) + ": " + v.quantity + " " + v.unit + "\nTotal: " + rupees(total) + "\nReceived: " + rupees(paid) + "\nOutstanding: " + rupees(outstanding));
  } else {
    const { error } = await db.from("business_expenses").insert({
      expense_date: new Date().toISOString().slice(0, 10),
      category: String(v.category).trim(),
      amount: Number(v.amount),
      description: String(v.description) === "-" ? null : String(v.description).trim(),
      paid_to: String(v.paid_to) === "-" ? null : String(v.paid_to).trim(),
      telegram_user_id: id
    });
    if (error) throw error;
    await send(chatId, "✅ Expense saved.\nCategory: " + v.category + "\nAmount: " + rupees(v.amount));
  }
  await clearSession(id);
}
async function continueSession(chatId: string, id: string, text: string, session: any) {
  const payload = session.payload || {};
  if (session.state === "confirm") {
    if (text.toLowerCase() !== "/confirm" && text.toLowerCase() !== "yes") {
      await send(chatId, "Please send /confirm to save or /cancel to discard this entry.");
      return;
    }
    await finishFlow(chatId, id, payload);
    return;
  }
  const kind = payload.kind as FlowKind;
  const fields = specs[kind];
  const index = Number(payload.index || 0);
  const field = fields[index];
  if (!field) throw new Error("Entry session is invalid. Send /cancel and start again.");
  let value = text.trim();
  if (!value || value.startsWith("/")) {
    await send(chatId, field.prompt);
    return;
  }
  if (field.numeric) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < (field.min ?? 0)) {
      await send(chatId, field.prompt);
      return;
    }
    value = String(n);
  }
  payload.values = { ...(payload.values || {}), [field.key]: value };
  payload.index = index + 1;
  if (payload.index < fields.length) {
    await saveSession(id, chatId, "collect", payload);
    await send(chatId, fields[payload.index].prompt);
  } else {
    await saveSession(id, chatId, "confirm", payload);
    const v = payload.values;
    const summary = kind === "stock"
      ? "Material: " + v.material + "\nQuantity: " + v.quantity + " " + v.unit + "\nPurchase amount: " + rupees(v.amount) + "\nSupplier: " + v.supplier + "\nPaid: " + rupees(v.paid_amount)
      : kind === "sale"
      ? "Product: " + v.material + "\nQuantity: " + v.quantity + " " + v.unit + "\nRate: " + rupees(v.selling_price) + "\nCustomer: " + v.customer + "\nReceived: " + rupees(v.paid_amount) + "\nTotal: " + rupees(Number(v.quantity) * Number(v.selling_price))
      : "Category: " + v.category + "\nAmount: " + rupees(v.amount) + "\nDescription: " + v.description + "\nPaid to: " + v.paid_to;
    await send(chatId, "Please check before saving:\n\n" + summary + "\n\nSend /confirm to save, or /cancel to discard.");
  }
}
async function showStock(chatId: string, role: Role) {
  const { data, error } = await db.from("stock_entries").select("material,quantity,unit,amount,supplier,created_at").order("created_at", { ascending: false }).limit(8);
  if (error) throw error;
  if (!data?.length) return await send(chatId, "No stock entries yet.");
  const lines = data.map((r: any) => role === "staff"
    ? "• " + r.material + " — " + r.quantity + " " + r.unit
    : "• " + r.material + " — " + r.quantity + " " + r.unit + " | " + rupees(r.amount) + " | " + (r.supplier || "No supplier"));
  await send(chatId, "📦 Recent stock entries\n" + lines.join("\n"));
}
async function showSales(chatId: string, role: Role) {
  const { data, error } = await db.from("sales_entries").select("material,quantity,unit,total_amount,customer,created_at").order("created_at", { ascending: false }).limit(8);
  if (error) throw error;
  if (!data?.length) return await send(chatId, "No sales entries yet. Send /sales add to record a sale.");
  const lines = data.map((r: any) => role === "staff"
    ? "• " + r.material + " — " + r.quantity + " " + r.unit
    : "• " + r.material + " — " + r.quantity + " " + r.unit + " | " + rupees(r.total_amount) + " | " + (r.customer || "No customer"));
  await send(chatId, "🚚 Recent sales\n" + lines.join("\n") + "\n\nSend /sales add to record a sale.");
}
async function showReport(chatId: string) {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  const [sales, expenses, stock] = await Promise.all([
    db.from("sales_entries").select("total_amount").gte("created_at", from + "T00:00:00Z"),
    db.from("business_expenses").select("amount").gte("expense_date", from).lte("expense_date", to),
    db.from("stock_entries").select("id", { count: "exact", head: true })
  ]);
  if (sales.error || expenses.error || stock.error) throw new Error("Could not prepare report.");
  const revenue = (sales.data || []).reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
  const costs = (expenses.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  await send(chatId, "📊 SBFB monthly summary (" + from + " to " + to + ")\nSales recorded: " + rupees(revenue) + "\nExpenses: " + rupees(costs) + "\nSales less expenses: " + rupees(revenue - costs) + "\nStock records: " + (stock.count || 0) + "\n\nNote: this is a simple summary, not inventory-adjusted profit.");
}
async function handleMessage(message: any) {
  const text = String(message.text || "").trim();
  if (!text || !message.from?.id || !message.chat?.id) return;
  const id = String(message.from.id), chatId = String(message.chat.id);
  const first = text.split(/\s+/)[0].split("@")[0].toLowerCase();
  const role = await getRole(id);
  if (first === "/cancel") {
    await clearSession(id);
    return await send(chatId, "Cancelled. No record was saved.");
  }
  if (first === "/start" || first === "/menu") {
    if (!role) return await send(chatId, "Your Telegram ID is " + id + ". This account is not assigned yet; share this ID with the SBFB administrator to receive manager or staff access.");
    return await send(chatId, menu(role).join("\n"));
  }
  if (!role) return await send(chatId, "Access not assigned. Your Telegram ID is " + id + ". Share it with the SBFB administrator.");
  if (first === "/setrole") {
    if (role !== "admin") return await send(chatId, "Only the admin can assign roles.");
    const parts = text.split(/\s+/);
    const target = parts[1], newRole = parts[2]?.toLowerCase();
    if (!target || !/^\d+$/.test(target) || !["manager", "staff"].includes(newRole)) {
      return await send(chatId, "Usage: /setrole TELEGRAM_ID manager\nOr: /setrole TELEGRAM_ID staff\nAdmins are managed through ADMIN_TELEGRAM_IDS.");
    }
    const { error } = await db.from("telegram_user_roles").upsert({ telegram_user_id: target, role: newRole, is_active: true, updated_at: new Date().toISOString() });
    if (error) throw error;
    return await send(chatId, "Role assigned: " + target + " → " + newRole + ". They can now use /start.");
  }
  if (first === "/addstock") {
    if (!["admin", "manager", "staff"].includes(role)) return await send(chatId, "You cannot add stock.");
    return await startFlow(chatId, id, "stock");
  }
  if (first === "/sales") {
    if (text.split(/\s+/)[1]?.toLowerCase() === "add") return await startFlow(chatId, id, "sale");
    return await showSales(chatId, role);
  }
  if (first === "/stock") return await showStock(chatId, role);
  if (first === "/expense") {
    if (role === "staff") return await send(chatId, "Staff cannot record expenses. Ask a manager or admin.");
    return await startFlow(chatId, id, "expense");
  }
  if (first === "/report") {
    if (role === "staff") return await send(chatId, "Reports are available to managers and admins.");
    return await showReport(chatId);
  }
  const session = await getSession(id);
  if (session) return await continueSession(chatId, id, text, session);
  return await send(chatId, "Unknown command. Send /menu to see available options.");
}
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Telegram webhook only", { status: 405 });
  if (!token || !webhookSecret) return new Response(JSON.stringify({ error: "Bot secrets are not configured." }), { status: 503, headers: cors });
  const supplied = req.headers.get("x-telegram-bot-api-secret-token") || "";
  if (supplied !== webhookSecret) return new Response("Unauthorized webhook", { status: 401 });
  try {
    const update = await req.json();
    if (update.message) await handleMessage(update.message);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
  } catch (_error) {
    // Do not echo database internals or secrets to Telegram or logs.
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
  }
});
