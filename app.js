// CONFIGURAÇÃO RÁPIDA: substitua a data abaixo pela data real do casamento.
const WEDDING_DATE = "2026-10-10T12:00:00-03:00";

// Cliente Supabase (usa as chaves definidas em config.js)
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Ícones por categoria, usados apenas se o presente não tiver imagem própria
const CATEGORY_ICONS = {
  "casa": "◌",
  "lua-de-mel": "↗",
  "financeiro": "✺"
};

const CATEGORY_LABELS = {
  "casa": "Casa do Futuro",
  "lua-de-mel": "Missão Lua de Mel",
  "financeiro": "Portal Financeiro"
};

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
let gifts = [];

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]));
}

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
    giftGrid.innerHTML = `<p style="padding:2rem;">Não foi possível carregar os presentes agora. Tenta recarregar a página.</p>`;
    return;
  }

  gifts = data;
  renderGifts();
}

function renderGifts() {
  const filtered = activeCategory === "all" ? gifts : gifts.filter(gift => gift.categoria === activeCategory);

  if (filtered.length === 0) {
    giftGrid.innerHTML = `<p style="padding:2rem;">Nenhum presente cadastrado nessa categoria ainda.</p>`;
    return;
  }

  giftGrid.innerHTML = filtered.map(gift => {
    const progress = Math.min(100, Math.round((gift.valor_arrecadado / gift.valor_total) * 100));
    const complete = progress >= 100;
    const icon = CATEGORY_ICONS[gift.categoria] || "✦";
    const categoryLabel = CATEGORY_LABELS[gift.categoria] || gift.categoria;

    return `
      <article class="gift-card ${complete ? "is-complete" : ""}" data-category="${gift.categoria}">
        <div class="gift-card-top">
          <span class="gift-category">${categoryLabel}</span>
          ${complete ? '<span class="complete-seal">✓ Completo</span>' : ""}
        </div>
        <div class="gift-main">
          <div class="progress-orbit" style="--progress:${progress}" aria-label="${progress}% arrecadado">
            <span class="progress-icon" aria-hidden="true">${icon}</span>
            <span class="progress-number">${progress}%</span>
          </div>
          <div>
            <h3>${escapeHtml(gift.nome)}</h3>
            <p class="gift-card-description">${escapeHtml(gift.descricao || "")}</p>
          </div>
        </div>
        <div class="gift-footer">
          <div class="gift-values">
            <span>Já presenteado</span>
            <strong>${money.format(gift.valor_arrecadado)} de ${money.format(gift.valor_total)}</strong>
          </div>
          ${!complete ? `<button class="gift-button" type="button" data-gift-id="${gift.id}" aria-label="Presentear ${escapeHtml(gift.nome)}">→</button>` : ""}
        </div>
      </article>`;
  }).join("");

  giftGrid.querySelectorAll("[data-gift-id]").forEach(button => {
    button.addEventListener("click", () => openGiftModal(button.dataset.giftId));
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
    .limit(12);

  if (error) {
    console.error("Erro ao buscar recados:", error);
    return;
  }

  messageGrid.innerHTML = data.map(item => `
    <article class="message-card">
      <p>${escapeHtml(item.recado)}</p>
      <footer>
        <span class="message-avatar" aria-hidden="true">${escapeHtml((item.nome_convidado || "V").trim().charAt(0).toUpperCase())}</span>
        <strong>${escapeHtml(item.nome_convidado)}</strong>
      </footer>
    </article>`).join("");
}

// ------------------------------
// Modal de presente
// ------------------------------
function openGiftModal(id) {
  const gift = gifts.find(item => String(item.id) === String(id));
  if (!gift) return;
  lastFocusedElement = document.activeElement;
  document.querySelector("#gift-id").value = gift.id;
  document.querySelector("#modal-title").textContent = gift.nome;
  document.querySelector("#modal-description").textContent = gift.descricao || "";
  document.querySelector("#modal-category").textContent = CATEGORY_LABELS[gift.categoria] || gift.categoria;
  document.querySelector("#modal-icon").textContent = CATEGORY_ICONS[gift.categoria] || "✦";
  document.querySelector("#gift-value").max = Math.max(10, gift.valor_total - gift.valor_arrecadado);
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

// ------------------------------
// Inicialização
// ------------------------------
fetchGifts();
fetchMessages();
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

// ------------------------------
// Envio do formulário de presente -> grava em "contribuicoes" como pendente
// ------------------------------
giftForm.addEventListener("submit", async event => {
  event.preventDefault();
  const submitButton = giftForm.querySelector("button[type=submit]");
  const id = document.querySelector("#gift-id").value;
  const guestName = document.querySelector("#guest-name").value.trim();
  const value = Number(document.querySelector("#gift-value").value);
  const message = document.querySelector("#gift-message").value.trim();
  if (!id || !guestName || !Number.isFinite(value) || value < 10) return;

  submitButton.disabled = true;
  submitButton.textContent = "Enviando...";

  const { error } = await db.from("contribuicoes").insert({
    presente_id: id,
    nome_convidado: guestName,
    valor: value,
    recado: message || null,
    status: "pendente"
  });

  submitButton.disabled = false;
  submitButton.textContent = "Confirmar presente";

  if (error) {
    console.error("Erro ao registrar contribuição:", error);
    showToast("Algo deu errado. Tenta de novo em instantes.");
    return;
  }

  giftForm.reset();
  closeModal(giftModal);
  showToast(`Recebemos seu presente, ${guestName}! Assim que o PIX cair, ele aparece na vitrine.`);
});

// ------------------------------
// Envio de recado avulso (sem presente vinculado)
// Por enquanto, recados só aparecem no mural quando vinculados a um presente
// confirmado — ajuste esse fluxo se decidirem permitir recados soltos.
// ------------------------------
messageForm.addEventListener("submit", async event => {
  event.preventDefault();
  showToast("Por enquanto, recados aparecem no mural junto de um presente confirmado.");
  closeModal(messageModal);
});

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (giftModal.classList.contains("is-open")) closeModal(giftModal);
  if (messageModal.classList.contains("is-open")) closeModal(messageModal);
});
