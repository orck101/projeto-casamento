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
  loadGifts();
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

checkSession();
