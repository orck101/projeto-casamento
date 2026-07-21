const WEDDING_DATE = new Date('2026-08-08T13:00:00-03:00');
const WHATSAPP_NUMBER = '5512991360571';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

function updateCountdown() {
  const difference = WEDDING_DATE.getTime() - Date.now();
  const units = {
    days: Math.max(0, Math.floor(difference / 86_400_000)),
    hours: Math.max(0, Math.floor((difference / 3_600_000) % 24)),
    minutes: Math.max(0, Math.floor((difference / 60_000) % 60)),
    seconds: Math.max(0, Math.floor((difference / 1_000) % 60)),
  };

  $('#days').textContent = String(units.days);
  $('#hours').textContent = String(units.hours).padStart(2, '0');
  $('#minutes').textContent = String(units.minutes).padStart(2, '0');
  $('#seconds').textContent = String(units.seconds).padStart(2, '0');
}

updateCountdown();
setInterval(updateCountdown, 1000);

const topbar = $('.topbar');
window.addEventListener('scroll', () => topbar.classList.toggle('scrolled', window.scrollY > 20), { passive: true });

const menuButton = $('.menu-button');
const nav = $('#main-nav');
menuButton.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});
$$('#main-nav a, #main-nav button').forEach(item => item.addEventListener('click', () => {
  nav.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
}));

const modal = $('#rsvp-modal');
const firstInput = $('#responsible-name');
let previousFocus = null;

function openModal() {
  previousFocus = document.activeElement;
  modal.hidden = false;
  $('#rsvp-form').hidden = false;
  $('#rsvp-success').hidden = true;
  document.body.classList.add('modal-open');
  setTimeout(() => firstInput.focus(), 40);
}

function closeModal() {
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  previousFocus?.focus();
}

$$('[data-open-rsvp]').forEach(button => button.addEventListener('click', openModal));
$$('[data-close-rsvp]').forEach(button => button.addEventListener('click', closeModal));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !modal.hidden) closeModal();
});

const attendanceInputs = $$('input[name="attendance"]');
const guestFields = $('#guest-fields');
attendanceInputs.forEach(input => input.addEventListener('change', () => {
  const attending = $('input[name="attendance"]:checked').value === 'Sim';
  guestFields.hidden = !attending;
  $('#guest-names').required = attending;
}));
$('#guest-names').required = true;

const toast = $('#toast');
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4200);
}

$('#phone').addEventListener('input', event => {
  const digits = event.target.value.replace(/\D/g, '').slice(0, 11);
  const formatted = digits.length > 10
    ? digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
    : digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  event.target.value = formatted.replace(/-$/, '');
});

$('#rsvp-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;

  const submitButton = event.currentTarget.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const attending = data.attendance === 'Sim';

  submitButton.disabled = true;
  submitButton.textContent = 'Enviando...';

  const { error } = await db.from('confirmacoes').insert({
    nome_responsavel: data.responsibleName,
    telefone: data.phone,
    presenca: data.attendance,
    adultos: attending ? Number(data.adults || 1) : 0,
    criancas: attending ? Number(data.children || 0) : 0,
    nomes_convidados: attending ? (data.guestNames || null) : null,
    recado: data.message || null
  });

  submitButton.disabled = false;
  submitButton.textContent = 'Enviar confirmação';

  if (error) {
    console.error('Erro ao registrar confirmação:', error);
    if (error.code === '23505') {
      showToast('Este telefone já possui uma confirmação. Para alterar sua resposta, fale conosco pelo WhatsApp.');
      return;
    }
    showToast('Algo deu errado ao registrar. Tenta de novo em instantes.');
    return;
  }

  const firstName = (data.responsibleName || '').trim().split(' ')[0] || '';
  const successTitle = $('#rsvp-success-title');
  const successDetail = $('#rsvp-success-detail');

  if (attending) {
    const attendeeNames = (data.guestNames || '').trim();
    successTitle.textContent = `Obrigado por confirmar, ${firstName}!`;
    successDetail.textContent = attendeeNames
      ? `Você confirmou a presença de ${attendeeNames}. Mal podemos esperar para celebrar com vocês!`
      : `Sua presença está confirmada. Mal podemos esperar para celebrar com você!`;
  } else {
    successTitle.textContent = `Obrigado por avisar, ${firstName}.`;
    successDetail.textContent = `Sentiremos sua falta, mas agradecemos demais por nos contar. Você continua fazendo parte dessa história.`;
  }

  $('#rsvp-form').hidden = true;
  $('#rsvp-success').hidden = false;
  event.currentTarget.reset();
  $('input[name="attendance"][value="Sim"]').checked = true;
  guestFields.hidden = false;
  $('#guest-names').required = true;
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.13 });
$$('.reveal').forEach(element => observer.observe(element));

function ensureMessagesInterface() {
  const section = $('#mensagens') || $('#guest-messages-section');
  const card = $('#guest-message-card');
  const messageText = $('#guest-message-text');
  const counter = $('#guest-message-counter');

  if (!section || !card || !messageText || !counter) return null;

  section.id = 'mensagens';

  let author = $('#guest-message-author');
  if (!author) {
    author = document.createElement('p');
    author.id = 'guest-message-author';
    author.className = 'guest-message-author';
    messageText.insertAdjacentElement('afterend', author);
  }

  const heroActions = $('.hero-actions');
  if (heroActions && !heroActions.querySelector('[data-messages-link]')) {
    const link = document.createElement('a');
    link.className = 'button button-messages';
    link.href = '#mensagens';
    link.dataset.messagesLink = '';
    link.textContent = 'Ver mensagens para o casal';
    heroActions.append(link);
  }

  return { section, card, messageText, author, counter };
}

async function loadGuestMessages() {
  const interfaceElements = ensureMessagesInterface();
  if (!interfaceElements) return;

  const { section, card, messageText, author, counter } = interfaceElements;

  const { data, error } = await db.rpc('listar_recados_publicos');
  if (error) {
    console.error('Erro ao carregar recados públicos:', error);
    return;
  }

  const seen = new Set();
  const messages = (data || [])
    .map(item => ({
      name: String(item.nome || item.nome_convidado || item.nome_responsavel || 'Convidado').trim(),
      message: String(item.recado || '').trim(),
      createdAt: item.criado_em || null
    }))
    .filter(item => {
      if (!item.message) return false;
      const key = `${item.name.toLocaleLowerCase('pt-BR')}|${item.message.toLocaleLowerCase('pt-BR')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (!messages.length) return;

  let activeIndex = 0;
  section.hidden = false;

  function renderMessage(index, animate = false) {
    const update = () => {
      const item = messages[index];
      messageText.textContent = item.message;
      author.textContent = `— ${item.name}`;
      counter.textContent = messages.length > 1
        ? `Mensagem ${index + 1} de ${messages.length}`
        : 'Mensagem para o casal';
      card.classList.remove('changing');
    };

    if (!animate) {
      update();
      return;
    }

    card.classList.add('changing');
    window.setTimeout(update, 280);
  }

  renderMessage(activeIndex);

  if (messages.length > 1) {
    window.setInterval(() => {
      activeIndex = (activeIndex + 1) % messages.length;
      renderMessage(activeIndex, true);
    }, 6500);
  }
}

loadGuestMessages();
