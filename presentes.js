"use strict";

const CONFIG = {
  whatsapp: "5512991360571",
  pixKey: "", // Insira a chave Pix para ativar a exibição no resumo final.
  pixHolder: "Victor & Luana"
};

const categoryLabels = {
  casa: "Casa do Futuro",
  lua: "Missão Lua de Mel",
  festa: "Festa de Lançamento"
};

// Cliente Supabase (usa as chaves definidas em config.js)
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const sampleMessages = [
  { name: "Tripulação da família", message: "Que o futuro de vocês tenha amor de sobra, risadas diárias e uma Lavadora 3000 funcionando perfeitamente." },
  { name: "Convidados do setor terrestre", message: "Desejamos uma vida inteira de aventuras, parceria e muitos cafés teletransportados na hora certa." },
  { name: "Central de boas energias", message: "Que essa nova missão seja a mais bonita de todas. Estamos felizes por fazer parte do lançamento!" }
];

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const grid = document.querySelector("#gift-grid");
const modal = document.querySelector("#gift-modal");
const formView = document.querySelector("#gift-form-view");
const successView = document.querySelector("#gift-success");
const giftForm = document.querySelector("#gift-form");
const amountInput = document.querySelector("#gift-amount");
const amountPresets = document.querySelector("#amount-presets");
const modalTitle = document.querySelector("#gift-modal-title");
const modalDescription = document.querySelector("#modal-description");
const modalCategory = document.querySelector("#modal-category");
const modalIconUse = document.querySelector("#modal-icon use");
const amountHelper = document.querySelector("#amount-helper");
const giftIdInput = document.querySelector("#gift-id");
const messageList = document.querySelector("#message-list");
const mobileMenuButton = document.querySelector(".gift-menu-button");
const mobileNav = document.querySelector("#gift-nav-mobile");
let lastFocusedElement = null;
let activeGift = null;
let gifts = [];

// ------------------------------
// Busca dos presentes no Supabase
// ------------------------------
async function fetchGifts() {
  const { data, error } = await db
    .from("presentes")
    .select("*")
    .eq("status", "ativo")
    .order("ordem", { ascending: true });

  if (error) {
    console.error("Erro ao buscar presentes:", error);
    grid.innerHTML = '<p class="empty-messages">Não foi possível carregar os presentes agora. Tenta recarregar a página.</p>';
    return;
  }

  // Traduz os campos do banco (nome, descricao, categoria, icone, valor_total, valor_arrecadado)
  // para o formato que o restante do código já espera (name, description, category, icon, goal, raised).
  gifts = data.map(row => ({
    id: row.id,
    category: row.categoria,
    name: row.nome,
    description: row.descricao,
    icon: row.icone || "icon-spark",
    goal: Number(row.valor_total),
    raised: Number(row.valor_arrecadado)
  }));
}

function getRaised(gift) {
  return gift.raised;
}

function percentage(gift) {
  return Math.min(100, Math.round((getRaised(gift) / gift.goal) * 100));
}

function createGiftCard(gift) {
  const raised = getRaised(gift);
  const percent = percentage(gift);
  const complete = percent >= 100;
  const card = document.createElement("article");
  card.className = `gift-card reveal visible${complete ? " complete" : ""}`;
  card.dataset.category = gift.category;
  card.dataset.giftId = gift.id;

  const top = document.createElement("div");
  top.className = "card-topline";
  const category = document.createElement("p");
  category.className = "card-category";
  category.textContent = categoryLabels[gift.category] || gift.category;
  top.append(category);
  if (complete) {
    const badge = document.createElement("span");
    badge.className = "complete-badge";
    badge.textContent = "Completo";
    top.append(badge);
  }

  const progress = document.createElement("div");
  progress.className = "orbital-progress";
  progress.style.setProperty("--progress", `${percent * 3.6}deg`);
  progress.setAttribute("aria-label", `${percent}% do objetivo alcançado`);

  const dot = document.createElement("span");
  dot.className = "orbit-dot";
  const icon = document.createElement("div");
  icon.className = "gift-icon";
  icon.innerHTML = `<svg aria-hidden="true"><use href="#${gift.icon}"></use></svg>`;
  progress.append(dot, icon);

  const name = document.createElement("h3");
  name.textContent = gift.name;
  const description = document.createElement("p");
  description.className = "gift-description";
  description.textContent = gift.description;

  const progressCopy = document.createElement("div");
  progressCopy.className = "progress-copy";
  const values = document.createElement("div");
  const valuesLabel = document.createElement("span");
  valuesLabel.textContent = "Já arrecadado";
  const valuesStrong = document.createElement("strong");
  valuesStrong.textContent = `${money.format(Math.min(raised, gift.goal))} de ${money.format(gift.goal)}`;
  values.append(valuesLabel, valuesStrong);
  const percentText = document.createElement("strong");
  percentText.textContent = `${percent}%`;
  progressCopy.append(values, percentText);

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = complete ? "Celebrar esta missão" : "Presentear com esta invenção";
  button.addEventListener("click", () => openGiftModal(gift));

  card.append(top, progress, name, description, progressCopy, button);
  return card;
}

function renderGifts(category = "all") {
  grid.innerHTML = "";
  if (!gifts.length) {
    grid.innerHTML = '<p class="empty-messages">Nenhum presente cadastrado no momento.</p>';
    return;
  }
  gifts.forEach((gift) => {
    const card = createGiftCard(gift);
    if (category !== "all" && gift.category !== category) card.classList.add("hidden");
    grid.append(card);
  });
}

// ------------------------------
// Busca dos recados confirmados no Supabase
// ------------------------------
async function fetchMessages() {
  const { data, error } = await db
    .from("contribuicoes")
    .select("nome_convidado, recado")
    .eq("status", "confirmado")
    .not("recado", "is", null)
    .order("confirmado_em", { ascending: false })
    .limit(6);

  if (error) {
    console.error("Erro ao buscar recados:", error);
    return [];
  }

  return data.map(item => ({ name: item.nome_convidado, message: item.recado }));
}

async function renderMessages() {
  const confirmedMessages = await fetchMessages();
  // Enquanto não há recados confirmados suficientes, completa com as mensagens de exemplo
  const messages = confirmedMessages.length >= 3
    ? confirmedMessages
    : [...confirmedMessages, ...sampleMessages].slice(0, 6);

  messageList.innerHTML = "";
  if (!messages.length) {
    messageList.innerHTML = '<p class="empty-messages">Os primeiros recados aparecerão aqui.</p>';
    return;
  }
  messages.forEach((item) => {
    const card = document.createElement("article");
    card.className = "message-card";
    const quote = document.createElement("blockquote");
    quote.textContent = `"${item.message}"`;
    const footer = document.createElement("footer");
    footer.textContent = item.name;
    card.append(quote, footer);
    messageList.append(card);
  });
}

function setPresetButtons(gift) {
  const isFree = gift.id === "contribuicao-livre";
  const remaining = Math.max(0, gift.goal - getRaised(gift));
  const values = isFree
    ? [50, 100, 150, 250, 500]
    : [50, 100, 150, 250, Math.min(Math.max(remaining, 10), 500)];
  const uniqueValues = [...new Set(values)].filter((value) => value > 0);
  amountPresets.innerHTML = "";
  uniqueValues.forEach((value, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = money.format(value);
    button.dataset.amount = String(value);
    if (index === 1 || (uniqueValues.length === 1 && index === 0)) button.classList.add("active");
    button.addEventListener("click", () => {
      amountPresets.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      amountInput.value = value;
    });
    amountPresets.append(button);
  });
  amountInput.value = uniqueValues[1] || uniqueValues[0] || 50;
  amountInput.removeAttribute("max");
  amountHelper.textContent = isFree
    ? "Escolha qualquer valor a partir de R$ 10. Nós direcionaremos a contribuição para uma das próximas missões."
    : remaining > 0
      ? `Faltam ${money.format(remaining)} para esta missão chegar ao objetivo.`
      : "Esta missão já chegou ao objetivo, mas você ainda pode celebrar com uma contribuição simbólica.";
}

function openGiftModal(gift, isFree = false) {
  lastFocusedElement = document.activeElement;
  activeGift = isFree ? {
    id: "contribuicao-livre",
    category: "festa",
    name: "Portal de Contribuição Livre",
    description: "Você escolhe o valor e nós direcionamos o impulso para uma das nossas próximas missões.",
    icon: "icon-spark",
    goal: 999999,
    raised: 0
  } : gift;

  formView.hidden = false;
  successView.hidden = true;
  giftForm.reset();
  giftIdInput.value = activeGift.id;
  modalTitle.textContent = activeGift.name;
  modalDescription.textContent = activeGift.description;
  modalCategory.textContent = isFree ? "Contribuição livre" : (categoryLabels[activeGift.category] || activeGift.category);
  modalIconUse.setAttribute("href", `#${activeGift.icon}`);
  setPresetButtons(activeGift);

  modal.hidden = false;
  document.body.classList.add("modal-open");
  window.setTimeout(() => document.querySelector("#giver-name").focus(), 40);
}

function closeGiftModal() {
  modal.hidden = true;
  document.body.classList.remove("modal-open");
  activeGift = null;
  if (lastFocusedElement) lastFocusedElement.focus();
}

// ------------------------------
// Grava a contribuição de verdade na tabela "contribuicoes", como pendente
// ------------------------------
async function saveContribution(giftId, amount, name, message) {
  const { error } = await db.from("contribuicoes").insert({
    presente_id: giftId === "contribuicao-livre" ? null : giftId,
    nome_convidado: name,
    valor: amount,
    recado: message || null,
    status: "pendente"
  });
  if (error) {
    console.error("Erro ao registrar contribuição:", error);
    return false;
  }
  return true;
}

function showSuccess({ name, amount, message }) {
  const summary = document.querySelector("#gift-summary");
  summary.innerHTML = "";
  const rows = [
    ["Presente", activeGift.name],
    ["Valor", money.format(amount)],
    ["De", name]
  ];
  if (message) rows.push(["Recado", message]);
  rows.forEach(([label, value]) => {
    const row = document.createElement("p");
    const labelNode = document.createElement("span");
    labelNode.textContent = label;
    const valueNode = document.createElement("strong");
    valueNode.textContent = value;
    row.append(labelNode, valueNode);
    summary.append(row);
  });

  const pixBox = document.querySelector("#pix-box");
  const demoNotice = document.querySelector("#demo-notice");
  if (CONFIG.pixKey.trim()) {
    document.querySelector("#pix-key").textContent = CONFIG.pixKey;
    pixBox.hidden = false;
    demoNotice.hidden = true;
  } else {
    pixBox.hidden = true;
    demoNotice.hidden = false;
    demoNotice.querySelector("strong").textContent = "Presente registrado!";
    demoNotice.querySelector("p").textContent = "Assim que recebermos seu Pix, seu presente será confirmado por aqui.";
  }

  const whatsappText = [
    "Olá, Victor e Luana! 🚀",
    "",
    `Quero presentear vocês com: ${activeGift.name}`,
    `Valor: ${money.format(amount)}`,
    `Nome: ${name}`,
    message ? `Recado: ${message}` : ""
  ].filter(Boolean).join("\n");
  document.querySelector("#whatsapp-gift").href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(whatsappText)}`;

  formView.hidden = true;
  successView.hidden = false;
  successView.querySelector("h2").focus?.();
}

document.querySelectorAll(".category-tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".category-tab").forEach((item) => {
      item.classList.remove("active");
      item.setAttribute("aria-selected", "false");
    });
    button.classList.add("active");
    button.setAttribute("aria-selected", "true");
    renderGifts(button.dataset.category);
  });
});

document.querySelector("[data-open-free-gift]").addEventListener("click", () => openGiftModal(null, true));
document.querySelectorAll("[data-close-gift]").forEach((button) => button.addEventListener("click", closeGiftModal));

giftForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(giftForm);
  const amount = Number(data.get("amount"));
  const name = String(data.get("giverName") || "").trim();
  const message = String(data.get("message") || "").trim();

  if (!Number.isFinite(amount) || amount < 10) {
    amountInput.setCustomValidity("Informe um valor a partir de R$ 10.");
    amountInput.reportValidity();
    return;
  }
  amountInput.setCustomValidity("");

  const submitButton = giftForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Enviando...";

  const ok = await saveContribution(activeGift.id, amount, name, message);

  submitButton.disabled = false;
  submitButton.textContent = "Preparar meu presente";

  if (!ok) {
    amountHelper.textContent = "Algo deu errado ao registrar. Tenta de novo em instantes.";
    return;
  }

  showSuccess({ name, amount, message });
});

amountInput.addEventListener("input", () => {
  amountInput.setCustomValidity("");
  amountPresets.querySelectorAll("button").forEach((item) => item.classList.toggle("active", Number(item.dataset.amount) === Number(amountInput.value)));
});

document.querySelector("#copy-pix").addEventListener("click", async (event) => {
  if (!CONFIG.pixKey) return;
  try {
    await navigator.clipboard.writeText(CONFIG.pixKey);
    event.currentTarget.textContent = "Chave copiada";
    setTimeout(() => { event.currentTarget.textContent = "Copiar chave"; }, 1800);
  } catch {
    event.currentTarget.textContent = "Copie manualmente";
  }
});

modal.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeGiftModal();
});

mobileMenuButton.addEventListener("click", () => {
  const expanded = mobileMenuButton.getAttribute("aria-expanded") === "true";
  mobileMenuButton.setAttribute("aria-expanded", String(!expanded));
  mobileNav.hidden = expanded;
});

mobileNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  mobileNav.hidden = true;
  mobileMenuButton.setAttribute("aria-expanded", "false");
}));

// ------------------------------
// Inicialização
// ------------------------------
async function init() {
  await fetchGifts();
  renderGifts();
  await renderMessages();
}

init();
