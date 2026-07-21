"use strict";

const CONFIG = {
  whatsapp: "5512991360571",
  pixKey: "2ef918ce-ff4f-4ea5-bb29-b11af23d4543",
  pixHolder: "Victor Hugo N Freitas", // Nome do titular (28 caracteres no nome completo excede o limite de 25 do Pix, então usamos uma versão enxuta)
  pixCity: "Taubate"
};

const categoryLabels = {
  casa: "Casa do Futuro",
  lua: "Missão Lua de Mel",
  festa: "Festa de Lançamento"
};

// Cliente Supabase (usa as chaves definidas em config.js)
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ------------------------------
// Geração do código Pix Copia e Cola (padrão EMV do Banco Central)
// ------------------------------
function sanitizePixText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .toUpperCase()
    .trim();
}

function tlv(id, value) {
  const length = String(value.length).padStart(2, "0");
  return `${id}${length}${value}`;
}

function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function buildPixPayload({ key, holder, city, amount, description, txid }) {
  const pixDescription = sanitizePixText(description).slice(0, 40);
  const pixTxid = sanitizePixText(txid).replace(/ /g, "").slice(0, 25) || "***";
  const merchantAccount = tlv(
    "26",
    tlv("00", "BR.GOV.BCB.PIX") +
      tlv("01", key) +
      (pixDescription ? tlv("02", pixDescription) : "")
  );
  const amountField = amount ? tlv("54", Number(amount).toFixed(2)) : "";
  const additionalData = tlv("62", tlv("05", pixTxid));

  const partial =
    tlv("00", "01") +
    merchantAccount +
    tlv("52", "0000") +
    tlv("53", "986") +
    amountField +
    tlv("58", "BR") +
    tlv("59", sanitizePixText(holder).slice(0, 25) || "RECEBEDOR") +
    tlv("60", sanitizePixText(city).slice(0, 15) || "BRASIL") +
    additionalData +
    "6304";

  return partial + crc16(partial);
}

function renderPixBox(amount, description) {
  const pixBox = document.querySelector("#pix-box");
  const demoNotice = document.querySelector("#demo-notice");

  if (!CONFIG.pixKey.trim()) {
    pixBox.hidden = true;
    demoNotice.hidden = false;
    return;
  }

  const payload = buildPixPayload({
    key: CONFIG.pixKey,
    holder: CONFIG.pixHolder,
    city: CONFIG.pixCity,
    amount,
    description,
    txid: "PRESENTE" + Date.now().toString().slice(-8)
  });

  document.querySelector("#pix-code").textContent = payload;
  document.querySelector("#pix-qr").src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;

  pixBox.hidden = false;
  demoNotice.hidden = true;
  demoNotice.querySelector("strong").textContent = "Presente registrado!";
  demoNotice.querySelector("p").textContent = "Assim que recebermos seu Pix, seu presente será confirmado por aqui.";
}

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
let messageRotationTimer = null;

const MESSAGE_BATCH_SIZE = 3;
const MESSAGE_ROTATION_MS = 7000;

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

function observeReveals() {
  const items = document.querySelectorAll(".reveal:not(.visible)");
  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("visible"));
    return;
  }
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });
  items.forEach((item) => observer.observe(item));
}

function renderGifts() {
  grid.innerHTML = "";
  if (!gifts.length) {
    grid.innerHTML = '<p class="empty-messages">Nenhum presente cadastrado no momento.</p>';
    return;
  }
  gifts.forEach((gift) => {
    grid.append(createGiftCard(gift));
  });
}

// ------------------------------
// Busca dos recados confirmados no Supabase
// ------------------------------
async function fetchMessages() {
  const { data, error } = await db.rpc("listar_recados_publicos");

  if (error) {
    console.error("Erro ao buscar recados públicos:", error);
    return [];
  }

  const seen = new Set();
  return (data || [])
    .map(item => ({
      name: String(item.nome || item.nome_convidado || item.nome_responsavel || "Convidado").trim(),
      message: String(item.recado || "").trim(),
      createdAt: item.criado_em || null
    }))
    .filter(item => {
      if (!item.message) return false;
      const key = `${item.name.toLocaleLowerCase("pt-BR")}|${item.message.toLocaleLowerCase("pt-BR")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function shuffleMessages(messages) {
  const shuffled = [...messages];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function createMessageCard(item) {
  const card = document.createElement("article");
  card.className = "message-card";

  const quote = document.createElement("blockquote");
  quote.textContent = `“${item.message}”`;

  const footer = document.createElement("footer");
  const label = document.createElement("span");
  label.textContent = "Mensagem de";
  const author = document.createElement("strong");
  author.textContent = item.name;
  footer.append(label, author);

  card.append(quote, footer);
  return card;
}

function renderMessageBatch(batch, animate = false) {
  const update = () => {
    messageList.replaceChildren(...batch.map(createMessageCard));
    messageList.classList.remove("changing");
  };

  if (!animate) {
    update();
    return;
  }

  messageList.classList.add("changing");
  window.setTimeout(update, 280);
}

async function renderMessages() {
  const messages = await fetchMessages();

  if (messageRotationTimer) {
    window.clearInterval(messageRotationTimer);
    messageRotationTimer = null;
  }

  messageList.innerHTML = "";
  if (!messages.length) {
    messageList.innerHTML = '<p class="empty-messages">Os primeiros recados dos nossos convidados aparecerão aqui.</p>';
    return;
  }

  let queue = shuffleMessages(messages);

  function nextBatch() {
    const batch = [];
    const used = new Set();

    while (batch.length < Math.min(MESSAGE_BATCH_SIZE, messages.length)) {
      if (!queue.length) queue = shuffleMessages(messages);

      const item = queue.shift();
      const key = `${item.name.toLocaleLowerCase("pt-BR")}|${item.message.toLocaleLowerCase("pt-BR")}`;
      if (used.has(key)) continue;

      used.add(key);
      batch.push(item);
    }

    return batch;
  }

  renderMessageBatch(nextBatch());

  if (messages.length > MESSAGE_BATCH_SIZE) {
    messageRotationTimer = window.setInterval(() => {
      renderMessageBatch(nextBatch(), true);
    }, MESSAGE_ROTATION_MS);
  }
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
  modalCategory.hidden = true;
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

  renderPixBox(amount, activeGift.name);

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
  const code = document.querySelector("#pix-code").textContent;
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    event.currentTarget.textContent = "Código copiado!";
    setTimeout(() => { event.currentTarget.textContent = "Copiar código"; }, 1800);
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
  observeReveals();
}

init();
