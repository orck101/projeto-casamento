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

  $('#days').textContent = String(units.days).padStart(3, '0');
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
    showToast('Algo deu errado ao registrar. Tenta de novo em instantes.');
    return;
  }

  const firstName = (data.responsibleName || '').trim().split(' ')[0] || '';
  const thankYouMessage = attending
    ? `Presença confirmada! Obrigado, ${firstName} — mal podemos esperar para celebrar com vocês. 💛`
    : `Recebemos sua resposta, ${firstName}. Sentiremos sua falta, mas agradecemos por nos avisar! 💛`;

  showToast(thankYouMessage);
  closeModal();
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
