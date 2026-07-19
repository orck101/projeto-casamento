// CONFIGURAÇÃO RÁPIDA: substitua a data abaixo pela data real do casamento.
const WEDDING_DATE = "2026-10-10T12:00:00-03:00";

const gifts = [
  {
    id: "pia-autonoma",
    category: "casa",
    categoryLabel: "Casa do Futuro",
    name: "Pia Autônoma 3000",
    description: "Para que a louça desapareça antes de começar a reunião sobre quem vai lavar.",
    current: 820,
    total: 1800,
    icon: "◌"
  },
  {
    id: "aspirobot",
    category: "casa",
    categoryLabel: "Casa do Futuro",
    name: "Aspirobô Organizador Supremo",
    description: "Um pequeno aliado contra poeira, migalhas e decisões domésticas questionáveis.",
    current: 1350,
    total: 2100,
    icon: "✦"
  },
  {
    id: "cafeteira",
    category: "casa",
    categoryLabel: "Casa do Futuro",
    name: "Cafeteira Teletransportadora",
    description: "Café pronto antes que qualquer um dos dois tente conversar pela manhã.",
    current: 980,
    total: 980,
    icon: "☕"
  },
  {
    id: "colchao-ia",
    category: "casa",
    categoryLabel: "Casa do Futuro",
    name: "Colchão com IA Anti-Briga",
    description: "Tecnologia de ponta para dividir o espaço e a razão em partes quase iguais.",
    current: 2100,
    total: 5200,
    icon: "≈"
  },
  {
    id: "geladeira-oraculo",
    category: "casa",
    categoryLabel: "Casa do Futuro",
    name: "Geladeira Oráculo",
    description: "Ela prevê a fome, mas ainda não explica quem terminou o último pedaço.",
    current: 3700,
    total: 6500,
    icon: "▣"
  },
  {
    id: "varal",
    category: "casa",
    categoryLabel: "Casa do Futuro",
    name: "Varal Autodobrável",
    description: "Porque o futuro precisa ter menos roupas na cadeira e mais paz na sala.",
    current: 460,
    total: 1200,
    icon: "⌁"
  },
  {
    id: "passagem",
    category: "lua-de-mel",
    categoryLabel: "Missão Lua de Mel",
    name: "Combustível pra Nave",
    description: "Ajude a colocar os dois em órbita — de preferência com bagagem despachada.",
    current: 4200,
    total: 7600,
    icon: "↗"
  },
  {
    id: "hospedagem",
    category: "lua-de-mel",
    categoryLabel: "Missão Lua de Mel",
    name: "Base de Pouso",
    description: "Uma estação confortável para recarregar as energias depois de explorar o planeta.",
    current: 5200,
    total: 5200,
    icon: "⌂"
  },
  {
    id: "jantar",
    category: "lua-de-mel",
    categoryLabel: "Missão Lua de Mel",
    name: "Ração Espacial de Luxo",
    description: "Um jantar especial, sem sachê liofilizado e com sobremesa obrigatória.",
    current: 350,
    total: 900,
    icon: "✧"
  },
  {
    id: "passeio",
    category: "lua-de-mel",
    categoryLabel: "Missão Lua de Mel",
    name: "Expedição Fora da Órbita",
    description: "Um passeio para voltar com histórias melhores do que as fotos do aeroporto.",
    current: 1260,
    total: 2400,
    icon: "◎"
  },
  {
    id: "buffet",
    category: "financeiro",
    categoryLabel: "Portal Financeiro",
    name: "Combustível pra Festa",
    description: "Energia gastronômica para manter convidados felizes e a pista funcionando.",
    current: 6800,
    total: 12000,
    icon: "✺"
  },
  {
    id: "efeitos",
    category: "financeiro",
    categoryLabel: "Portal Financeiro",
    name: "Efeitos Especiais da Cerimônia",
    description: "Luz, som e decoração para o grande lançamento não parecer reunião de condomínio.",
    current: 4800,
    total: 8000,
    icon: "✦"
  }
];

const defaultMessages = [
  { name: "Carla & André", message: "Que a casa de vocês seja sempre cheia de risadas, café e planos malucos que dão certo." },
  { name: "Fernanda", message: "Desejo uma vida inteira de parceria, leveza e muitas viagens para contar depois." },
  { name: "Marcos", message: "Que essa nova missão tenha amor de sobra, paciência infinita e Wi-Fi funcionando." },
  { name: "Bia & Rafael", message: "O futuro de vocês já começou lindo. Estamos muito felizes por fazer parte desse momento." },
  { name: "Tia Sônia", message: "Que nunca falte diálogo, carinho e um bom almoço de domingo para reunir todo mundo." },
  { name: "Lucas", message: "Vida longa à melhor dupla da galáxia. Contem comigo em todas as órbitas." }
];

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const giftGrid = document.querySelector("#gift-grid");
const messageGrid = document.querySelector("#message-grid");
const giftModal = document.querySelector("#gift-modal");
const messageModal = document.querySelector("#message-modal");
const giftForm = document.querySelector("#gift-form");
const messageForm = document.querySelector("#message-form");
const toast = document.querySelector("#toast");
let activeCategory = "all";
let lastFocusedElement = null;

function loadStoredContributions() {
  try {
    const saved = JSON.parse(localStorage.getItem("victor-luana-contributions") || "{}");
    gifts.forEach(gift => {
      if (Number.isFinite(saved[gift.id])) gift.current = Math.min(saved[gift.id], gift.total);
    });
  } catch (_) {}
}

function saveStoredContributions() {
  const saved = Object.fromEntries(gifts.map(gift => [gift.id, gift.current]));
  localStorage.setItem("victor-luana-contributions", JSON.stringify(saved));
}

function loadMessages() {
  try {
    const stored = JSON.parse(localStorage.getItem("victor-luana-messages") || "[]");
    return [...stored, ...defaultMessages];
  } catch (_) {
    return defaultMessages;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]));
}

function renderGifts() {
  const filtered = activeCategory === "all" ? gifts : gifts.filter(gift => gift.category === activeCategory);
  giftGrid.innerHTML = filtered.map(gift => {
    const progress = Math.min(100, Math.round((gift.current / gift.total) * 100));
    const complete = progress >= 100;
    return `
      <article class="gift-card ${complete ? "is-complete" : ""}" data-category="${gift.category}">
        <div class="gift-card-top">
          <span class="gift-category">${gift.categoryLabel}</span>
          ${complete ? '<span class="complete-seal">✓ Completo</span>' : ""}
        </div>
        <div class="gift-main">
          <div class="progress-orbit" style="--progress:${progress}" aria-label="${progress}% arrecadado">
            <span class="progress-icon" aria-hidden="true">${gift.icon}</span>
            <span class="progress-number">${progress}%</span>
          </div>
          <div>
            <h3>${gift.name}</h3>
            <p class="gift-card-description">${gift.description}</p>
          </div>
        </div>
        <div class="gift-footer">
          <div class="gift-values">
            <span>Já presenteado</span>
            <strong>${money.format(gift.current)} de ${money.format(gift.total)}</strong>
          </div>
          <button class="gift-button" type="button" data-gift-id="${gift.id}" aria-label="Presentear ${gift.name}">→</button>
        </div>
      </article>`;
  }).join("");

  giftGrid.querySelectorAll("[data-gift-id]").forEach(button => {
    button.addEventListener("click", () => openGiftModal(button.dataset.giftId));
  });
}

function renderMessages() {
  const messages = loadMessages();
  messageGrid.innerHTML = messages.map(item => `
    <article class="message-card">
      <p>${escapeHtml(item.message)}</p>
      <footer>
        <span class="message-avatar" aria-hidden="true">${escapeHtml(item.name.trim().charAt(0).toUpperCase() || "V")}</span>
        <strong>${escapeHtml(item.name)}</strong>
      </footer>
    </article>`).join("");
}

function openGiftModal(id) {
  const gift = gifts.find(item => item.id === id);
  if (!gift) return;
  lastFocusedElement = document.activeElement;
  document.querySelector("#gift-id").value = gift.id;
  document.querySelector("#modal-title").textContent = gift.name;
  document.querySelector("#modal-description").textContent = gift.description;
  document.querySelector("#modal-category").textContent = gift.categoryLabel;
  document.querySelector("#modal-icon").textContent = gift.icon;
  document.querySelector("#gift-value").max = Math.max(10, gift.total - gift.current);
  giftModal.classList.add("is-open");
  giftModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  window.setTimeout(() => document.querySelector("#guest-name").focus(), 50);
}

function closeModal(modal) {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  if (lastFocusedElement) lastFocusedElement.focus();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function updateCountdown() {
  const target = new Date(WEDDING_DATE).getTime();
  const diff = Math.max(0, target - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  document.querySelector("#days").textContent = String(days).padStart(3, "0");
  document.querySelector("#hours").textContent = String(hours).padStart(2, "0");
  document.querySelector("#minutes").textContent = String(minutes).padStart(2, "0");
  document.querySelector("#seconds").textContent = String(seconds).padStart(2, "0");
}

loadStoredContributions();
renderGifts();
renderMessages();
updateCountdown();
setInterval(updateCountdown, 1000);

const date = new Date(WEDDING_DATE);
document.querySelector("#wedding-date-label").textContent = new Intl.DateTimeFormat("pt-BR").format(date);

for (const tab of document.querySelectorAll(".category-tab")) {
  tab.addEventListener("click", () => {
    activeCategory = tab.dataset.category;
    document.querySelectorAll(".category-tab").forEach(item => {
      const active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", active ? "true" : "false");
    });
    renderGifts();
  });
}

document.querySelectorAll("[data-scroll-gifts]").forEach(button => {
  button.addEventListener("click", () => document.querySelector("#presentes").scrollIntoView({ behavior: "smooth" }));
});

document.querySelectorAll("[data-close-modal]").forEach(element => element.addEventListener("click", () => closeModal(giftModal)));
document.querySelectorAll("[data-close-message-modal]").forEach(element => element.addEventListener("click", () => closeModal(messageModal)));

document.querySelector("#open-message-modal").addEventListener("click", event => {
  lastFocusedElement = event.currentTarget;
  messageModal.classList.add("is-open");
  messageModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  window.setTimeout(() => document.querySelector("#message-name").focus(), 50);
});

giftForm.addEventListener("submit", event => {
  event.preventDefault();
  const id = document.querySelector("#gift-id").value;
  const gift = gifts.find(item => item.id === id);
  const guestName = document.querySelector("#guest-name").value.trim();
  const value = Number(document.querySelector("#gift-value").value);
  const message = document.querySelector("#gift-message").value.trim();
  if (!gift || !guestName || !Number.isFinite(value) || value < 10) return;

  gift.current = Math.min(gift.total, gift.current + value);
  saveStoredContributions();

  if (message) {
    const stored = JSON.parse(localStorage.getItem("victor-luana-messages") || "[]");
    stored.unshift({ name: guestName, message });
    localStorage.setItem("victor-luana-messages", JSON.stringify(stored.slice(0, 12)));
  }

  renderGifts();
  renderMessages();
  giftForm.reset();
  closeModal(giftModal);
  showToast(`Presente registrado na demonstração. Obrigado, ${guestName}!`);
});

messageForm.addEventListener("submit", event => {
  event.preventDefault();
  const name = document.querySelector("#message-name").value.trim();
  const message = document.querySelector("#message-text").value.trim();
  if (!name || !message) return;
  const stored = JSON.parse(localStorage.getItem("victor-luana-messages") || "[]");
  stored.unshift({ name, message });
  localStorage.setItem("victor-luana-messages", JSON.stringify(stored.slice(0, 12)));
  renderMessages();
  messageForm.reset();
  closeModal(messageModal);
  showToast("Recado adicionado ao mural desta demonstração.");
});

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (giftModal.classList.contains("is-open")) closeModal(giftModal);
  if (messageModal.classList.contains("is-open")) closeModal(messageModal);
});
