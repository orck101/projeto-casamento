"use strict";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const loginView = document.querySelector("#login-view");
const panelView = document.querySelector("#panel-view");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const loginButton = document.querySelector("#login-button");
const logoutButton = document.querySelector("#logout-button");
const giftList = document.querySelector("#gift-list");
const summary = document.querySelector("#summary");

// ------------------------------
// Autenticação
// ------------------------------
async function checkSession() {
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    showPanel();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginView.style.display = "block";
  panelView.style.display = "none";
}

function showPanel() {
  loginView.style.display = "none";
  panelView.style.display = "block";
  loadPending();
  loadGifts();
  loadConfirmations();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  loginButton.disabled = true;
  loginButton.textContent = "Entrando...";

  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;

  const { error } = await db.auth.signInWithPassword({ email, password });

  loginButton.disabled = false;
  loginButton.textContent = "Entrar";

  if (error) {
    loginError.textContent = "E-mail ou senha incorretos.";
    return;
  }

  showPanel();
});

logoutButton.addEventListener("click", async () => {
  await db.auth.signOut();
  showLogin();
});

// ------------------------------
// Presentes
// ------------------------------
async function loadGifts() {
  giftList.innerHTML = '<p class="empty">Carregando...</p>';

  const { data, error } = await db
    .from("presentes")
    .select("*")
    .order("ordem", { ascending: true });

  if (error) {
    giftList.innerHTML = '<p class="empty">Não foi possível carregar os presentes.</p>';
    console.error(error);
    return;
  }

  renderSummary(data);
  renderGiftList(data);
}

function renderSummary(gifts) {
  const totalGoal = gifts.reduce((sum, g) => sum + Number(g.valor_total), 0);
  const totalRaised = gifts.reduce((sum, g) => sum + Number(g.valor_arrecadado), 0);
  const percent = totalGoal ? Math.round((totalRaised / totalGoal) * 100) : 0;

  summary.innerHTML = "";
  const items = [
    ["Arrecadado", money.format(totalRaised)],
    ["Meta total", money.format(totalGoal)],
    ["Progresso geral", `${percent}%`]
  ];
  items.forEach(([label, value]) => {
    const div = document.createElement("div");
    div.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
    summary.append(div);
  });
}

function renderGiftList(gifts) {
  giftList.innerHTML = "";

  if (!gifts.length) {
    giftList.innerHTML = '<p class="empty">Nenhum presente cadastrado ainda.</p>';
    return;
  }

  gifts.forEach((gift) => {
    const raised = Number(gift.valor_arrecadado);
    const total = Number(gift.valor_total);
    const percent = Math.min(100, Math.round((raised / total) * 100));

    const row = document.createElement("div");
    row.className = "gift-row";
    row.innerHTML = `
      <h3>${escapeHtml(gift.nome)}</h3>
      <div class="gift-values">${money.format(raised)} de ${money.format(total)} · ${percent}%</div>
      <div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div>
      <div class="adjust-row">
        <input type="number" min="0" step="1" placeholder="Valor em R$" data-amount-input>
        <button type="button" class="btn-add" data-action="add">Adicionar</button>
        <button type="button" class="btn-subtract" data-action="subtract">Subtrair</button>
        <span class="row-feedback" data-feedback></span>
      </div>
    `;

    const amountInput = row.querySelector("[data-amount-input]");
    const feedback = row.querySelector("[data-feedback]");

    row.querySelector('[data-action="add"]').addEventListener("click", () => {
      adjustGift(gift, Number(amountInput.value), amountInput, feedback);
    });
    row.querySelector('[data-action="subtract"]').addEventListener("click", () => {
      adjustGift(gift, -Number(amountInput.value), amountInput, feedback);
    });

    giftList.append(row);
  });
}

async function adjustGift(gift, delta, amountInput, feedback) {
  if (!Number.isFinite(delta) || delta === 0) {
    feedback.textContent = "Informe um valor.";
    feedback.className = "row-feedback error";
    return;
  }

  const novoValor = Math.max(0, Number(gift.valor_arrecadado) + delta);

  feedback.textContent = "Salvando...";
  feedback.className = "row-feedback";

  const { error } = await db
    .from("presentes")
    .update({ valor_arrecadado: novoValor })
    .eq("id", gift.id);

  if (error) {
    feedback.textContent = "Erro ao salvar.";
    feedback.className = "row-feedback error";
    console.error(error);
    return;
  }

  feedback.textContent = "Atualizado!";
  feedback.className = "row-feedback ok";
  amountInput.value = "";
  loadGifts();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]));
}

// ------------------------------
// Confirmações de presença (RSVP)
// ------------------------------
const rsvpSummary = document.querySelector("#rsvp-summary");
const rsvpList = document.querySelector("#rsvp-list");
const exportNamesButton = document.querySelector("#export-names-button");
let confirmacoesCache = [];

async function loadConfirmations() {
  rsvpList.innerHTML = '<p class="empty">Carregando...</p>';

  const { data, error } = await db
    .from("confirmacoes")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) {
    rsvpList.innerHTML = '<p class="empty">Não foi possível carregar as confirmações.</p>';
    console.error(error);
    return;
  }

  confirmacoesCache = data;
  renderRsvpSummary(data);
  renderRsvpList(data);
}

function renderRsvpSummary(rows) {
  const confirmados = rows.filter((r) => r.presenca === "Sim");
  const recusas = rows.filter((r) => r.presenca === "Não");
  const totalAdultos = confirmados.reduce((sum, r) => sum + Number(r.adultos || 0), 0);
  const totalCriancas = confirmados.reduce((sum, r) => sum + Number(r.criancas || 0), 0);

  rsvpSummary.innerHTML = "";
  const items = [
    ["Respostas confirmadas", confirmados.length],
    ["Adultos", totalAdultos],
    ["Crianças", totalCriancas],
    ["Total de pessoas", totalAdultos + totalCriancas],
    ["Não vão comparecer", recusas.length]
  ];
  items.forEach(([label, value]) => {
    const div = document.createElement("div");
    div.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
    rsvpSummary.append(div);
  });
}

function renderRsvpList(rows) {
  rsvpList.innerHTML = "";

  if (!rows.length) {
    rsvpList.innerHTML = '<p class="empty">Nenhuma confirmação recebida ainda.</p>';
    return;
  }

  rows.forEach((row) => {
    const attending = row.presenca === "Sim";
    const totalPeople = attending ? Number(row.adultos || 0) + Number(row.criancas || 0) : 0;
    const date = row.criado_em ? new Date(row.criado_em).toLocaleDateString("pt-BR") : "";

    const card = document.createElement("div");
    card.className = "rsvp-row";
    card.innerHTML = `
      <div class="rsvp-row-head">
        <div>
          <div class="rsvp-name">${escapeHtml(row.nome_responsavel)}</div>
          <div class="rsvp-meta">${attending ? `${totalPeople} pessoa(s) · ${row.adultos || 0} adulto(s), ${row.criancas || 0} criança(s)` : "Não poderá comparecer"} · ${date}</div>
        </div>
        <span class="badge ${attending ? "badge-yes" : "badge-no"}">${attending ? "Confirmado" : "Não vai"}</span>
      </div>
      <div class="rsvp-details">
        <p><strong>Telefone</strong> ${escapeHtml(row.telefone || "—")}</p>
        ${attending ? `<p><strong>Convidados listados</strong> ${escapeHtml(row.nomes_convidados || "Não informado")}</p>` : ""}
        ${row.recado ? `<p><strong>Recado</strong> ${escapeHtml(row.recado)}</p>` : ""}
      </div>
    `;

    card.addEventListener("click", () => {
      card.querySelector(".rsvp-details").classList.toggle("open");
    });

    rsvpList.append(card);
  });
}

exportNamesButton.addEventListener("click", () => {
  if (!confirmacoesCache.length) return;

  const confirmados = confirmacoesCache.filter((r) => r.presenca === "Sim");
  const lines = ["Lista de convidados confirmados — Victor & Luana", ""];

  confirmados.forEach((row) => {
    lines.push(`Responsável: ${row.nome_responsavel}`);
    lines.push(`Convidados: ${row.nomes_convidados || row.nome_responsavel}`);
    lines.push(`Adultos: ${row.adultos || 0} · Crianças: ${row.criancas || 0}`);
    lines.push("");
  });

  const totalAdultos = confirmados.reduce((sum, r) => sum + Number(r.adultos || 0), 0);
  const totalCriancas = confirmados.reduce((sum, r) => sum + Number(r.criancas || 0), 0);
  lines.push("----------------------------------------");
  lines.push(`Total de adultos: ${totalAdultos}`);
  lines.push(`Total de crianças: ${totalCriancas}`);
  lines.push(`Total geral: ${totalAdultos + totalCriancas}`);

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "convidados-confirmados.txt";
  a.click();
  URL.revokeObjectURL(url);
});

// ------------------------------
// Pagamentos pendentes
// ------------------------------
const pendingList = document.querySelector("#pending-list");

async function loadPending() {
  pendingList.innerHTML = '<p class="empty">Carregando...</p>';

  const { data, error } = await db
    .from("contribuicoes")
    .select("*, presentes(nome)")
    .eq("status", "pendente")
    .order("criado_em", { ascending: true });

  if (error) {
    pendingList.innerHTML = '<p class="empty">Não foi possível carregar os pagamentos pendentes.</p>';
    console.error(error);
    return;
  }

  renderPending(data);
}

function renderPending(rows) {
  pendingList.innerHTML = "";

  if (!rows.length) {
    pendingList.innerHTML = '<p class="empty">Nenhum pagamento pendente no momento. Tudo em dia!</p>';
    return;
  }

  rows.forEach((row) => {
    const date = row.criado_em ? new Date(row.criado_em).toLocaleString("pt-BR") : "";
    const giftName = row.presentes ? row.presentes.nome : "Contribuição livre";

    const card = document.createElement("div");
    card.className = "pending-row";
    card.innerHTML = `
      <div class="pending-info">
        <div class="pending-gift">${escapeHtml(giftName)}</div>
        <strong>${escapeHtml(row.nome_convidado)} — ${money.format(Number(row.valor))}</strong>
        <div class="pending-meta">${date}</div>
        ${row.recado ? `<div class="pending-message">"${escapeHtml(row.recado)}"</div>` : ""}
      </div>
      <div class="pending-actions">
        <button type="button" class="btn-ignore" data-action="ignore">Ignorar</button>
        <button type="button" class="btn-confirm" data-action="confirm">Confirmar Pix recebido</button>
      </div>
    `;

    card.querySelector('[data-action="confirm"]').addEventListener("click", () => updatePendingStatus(row.id, "confirmado"));
    card.querySelector('[data-action="ignore"]').addEventListener("click", () => {
      if (confirm("Ignorar este pedido? Ele sai da fila de pendentes sem somar valor ao presente.")) {
        updatePendingStatus(row.id, "cancelado");
      }
    });

    pendingList.append(card);
  });
}

async function updatePendingStatus(id, status) {
  const { error } = await db.from("contribuicoes").update({ status }).eq("id", id);
  if (error) {
    alert("Erro ao atualizar. Tenta de novo.");
    console.error(error);
    return;
  }
  // Confirmar dispara um gatilho no banco que já soma o valor ao presente automaticamente.
  loadPending();
  loadGifts();
}

checkSession();
