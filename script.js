'use strict';
/* HOTEL AURORA · app.js
   Estrutura orientada a objetos. Cada classe cuida de uma responsabilidade:
   Store (armazenamento) · Toast · Modal · Room/Catalog (quartos) · Search (busca)
   ReservationFlow (reserva) · ContactForm · NavMenu · Accessibility (WCAG/Libras)
   Privacy (LGPD) · App (orquestra tudo). */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pl = (n, s, p) => `${n} ${n === 1 ? s : p}`;
const dmy = v => v.split('-').reverse().join('/');

/* ---------- Armazenamento local (localStorage com prefixo) ---------- */
class Store {
  constructor(prefix = 'aurora:') { this.prefix = prefix; }
  get(key, fallback = null) {
    try { const v = localStorage.getItem(this.prefix + key); return v === null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  }
  set(key, value) {
    try { localStorage.setItem(this.prefix + key, JSON.stringify(value)); return true; }
    catch { return false; }
  }
  all() {
    const out = {};
    try { Object.keys(localStorage).filter(k => k.startsWith(this.prefix)).forEach(k => { out[k.slice(this.prefix.length)] = JSON.parse(localStorage.getItem(k)); }); } catch { /* ignora */ }
    return out;
  }
  clear() {
    try { Object.keys(localStorage).filter(k => k.startsWith(this.prefix)).forEach(k => localStorage.removeItem(k)); } catch { /* ignora */ }
  }
}

/* ---------- Aviso rápido (região aria-live) ---------- */
class Toast {
  constructor(el) { this.el = el; this.timer = null; }
  show(msg, ms = 4000) {
    this.el.textContent = msg;
    this.el.classList.add('show');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.el.classList.remove('show'), ms);
  }
}

/* ---------- Janela modal acessível: foco preso, Esc e retorno do foco ---------- */
class Modal {
  constructor(el, closeBtn) {
    this.el = el; this.opener = null;
    closeBtn.addEventListener('click', () => this.close());
    el.addEventListener('mousedown', e => { if (e.target === el) this.close(); });
    el.addEventListener('keydown', e => this.onKey(e));
  }
  items() {
    return $$('a[href],button:not([disabled]),input:not([disabled]),select,textarea,pre[tabindex]', this.el).filter(n => n.offsetParent !== null);
  }
  open() {
    this.opener = document.activeElement;
    this.el.hidden = false;
    document.body.style.overflow = 'hidden';
    const f = this.items(); (f[1] || f[0])?.focus();
  }
  close() {
    this.el.hidden = true;
    if (!$('.modal-backdrop:not([hidden])')) document.body.style.overflow = '';
    this.opener?.focus?.();
  }
  onKey(e) {
    if (e.key === 'Escape') return this.close();
    if (e.key !== 'Tab') return;
    const f = this.items(); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

/* ---------- Quarto: lê os dados direto do card do HTML ---------- */
class Room {
  constructor(card) {
    this.card = card;
    this.name = $('h3', card).textContent.trim();
    this.categories = card.dataset.category.split(' ');
    this.price = Number(/R\$\s*([\d.]+)/.exec($('.room-bottom strong', card).textContent)[1].replace('.', ''));
    this.capacity = Number(/(\d+)\s*hóspedes/.exec($('.amenities', card).textContent)?.[1] || 2);
  }
  fits(guests, rooms) { return guests <= this.capacity * rooms; }
}

/* ---------- Catálogo: filtros por categoria + resultado da busca ---------- */
class Catalog {
  constructor() {
    this.rooms = $$('.room-card').map(c => new Room(c));
    this.filter = 'todos'; this.searched = false; this.guests = 0; this.roomCount = 1; this.nights = 0;
    this.note = $('#resultsNote');
    $$('.filter-button').forEach(b => b.addEventListener('click', () => this.setFilter(b)));
  }
  find(name) { return this.rooms.find(r => r.name === name); }
  setFilter(btn) {
    this.filter = btn.dataset.filter;
    $$('.filter-button').forEach(b => { const on = b === btn; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); });
    this.render();
  }
  applySearch(s) { this.searched = true; this.guests = s.guests; this.roomCount = s.rooms; this.nights = s.nights; this.render(); }
  render() {
    let shown = 0;
    this.rooms.forEach(r => {
      const ok = (this.filter === 'todos' || r.categories.includes(this.filter)) && (!this.searched || r.fits(this.guests, this.roomCount));
      r.card.hidden = !ok; if (ok) shown++;
    });
    this.note.textContent = !shown
      ? 'Nenhuma acomodação encontrada para esses critérios. Ajuste o filtro ou a quantidade de hóspedes.'
      : this.searched ? `${pl(shown, 'acomodação disponível', 'acomodações disponíveis')} para ${pl(this.guests, 'hóspede', 'hóspedes')}, ${pl(this.roomCount, 'quarto', 'quartos')}, ${pl(this.nights, 'diária', 'diárias')}.` : '';
  }
}

/* ---------- Busca (barra de reserva do hero) ---------- */
class Search {
  constructor() {
    this.form = $('#searchForm'); this.checkin = $('#checkin'); this.checkout = $('#checkout');
    const today = Search.today();
    this.checkin.min = today; this.checkout.min = today;
    this.checkin.addEventListener('change', () => {
      if (!this.checkin.value) return;
      const next = new Date(Date.parse(this.checkin.value) + 864e5).toISOString().slice(0, 10);
      this.checkout.min = next;
      if (this.checkout.value && this.checkout.value < next) this.checkout.value = '';
    });
  }
  static today() { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); }
  get adults() { return +$('#adults').value; }
  get children() { return +$('#children').value; }
  get guests() { return this.adults + this.children; }
  get rooms() { return +$('#roomCount').value; }
  get nights() { const n = (Date.parse(this.checkout.value) - Date.parse(this.checkin.value)) / 864e5; return Number.isFinite(n) ? n : 0; }
  error() {
    if (!this.checkin.value || !this.checkout.value) return 'Informe as datas de check-in e check-out.';
    if (this.nights < 1) return 'O check-out precisa ser posterior ao check-in.';
    return '';
  }
}

/* ---------- Fluxo de reserva (modal + gravação local) ---------- */
class ReservationFlow {
  constructor({ catalog, search, store, toast, modal }) { Object.assign(this, { catalog, search, store, toast, modal }); this.draft = null; }
  init() {
    $$('.reserve-room').forEach(b => b.addEventListener('click', () => this.start(b.dataset.room)));
    const form = $('#guestForm');
    $$('input', form).forEach(i => i.setAttribute('aria-describedby', 'reservationFeedback'));
    form.addEventListener('submit', e => this.submit(e));
    form.elements.guestPhone.addEventListener('input', e => { e.target.value = ReservationFlow.mask(e.target.value); });
  }
  static mask(v) {
    const d = v.replace(/\D/g, '').slice(0, 11), cut = d.length > 10 ? 7 : 6;
    return d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, cut)}-${d.slice(cut)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
  }
  start(name) {
    const s = this.search, err = s.error();
    if (err) { this.toast.show(err); s.checkin.focus(); return; }
    const room = this.catalog.find(name);
    if (!room.fits(s.guests, s.rooms)) { this.toast.show(`A ${room.name} comporta até ${pl(room.capacity, 'hóspede', 'hóspedes')} por quarto. Ajuste a busca.`, 5000); return; }
    const total = room.price * s.nights * s.rooms;
    this.draft = { room: room.name, checkin: s.checkin.value, checkout: s.checkout.value, nights: s.nights, adults: s.adults, children: s.children, rooms: s.rooms, total };
    $('#bookingSummary').innerHTML =
      `<strong>${esc(room.name)}</strong><br>Check-in: ${dmy(s.checkin.value)} · Check-out: ${dmy(s.checkout.value)}<br>` +
      `${pl(s.nights, 'diária', 'diárias')} · ${pl(s.adults, 'adulto', 'adultos')} · ${pl(s.children, 'criança', 'crianças')} · ${pl(s.rooms, 'quarto', 'quartos')}<br>` +
      `Total estimado: <strong>${BRL.format(total)}</strong>`;
    $('#reservationFeedback').textContent = '';
    this.modal.open();
  }
  submit(e) {
    e.preventDefault();
    const f = e.target, fb = $('#reservationFeedback'), consent = $('#privacyConsent');
    const name = f.elements.guestName.value.trim(), email = f.elements.guestEmail, phone = f.elements.guestPhone.value.replace(/\D/g, '');
    const checks = [
      [f.elements.guestName, name.split(/\s+/).length >= 2, 'Informe seu nome completo.'],
      [email, email.checkValidity(), 'Informe um e-mail válido.'],
      [f.elements.guestPhone, phone.length >= 10, 'Informe o telefone com DDD.'],
      [consent, consent.checked, 'Para continuar, concorde com o aviso de privacidade.']
    ];
    checks.forEach(([el]) => el.removeAttribute('aria-invalid'));
    const bad = checks.find(c => !c[1]);
    if (bad) { bad[0].setAttribute('aria-invalid', 'true'); fb.textContent = bad[2]; bad[0].focus(); return; }
    const booking = {
      id: 'AUR-' + Date.now().toString(36).toUpperCase(), ...this.draft,
      guest: { name, email: email.value.trim(), phone: f.elements.guestPhone.value },
      consentAt: new Date().toISOString(), policyVersion: '1.0'
    };
    if (!this.store.set('reservas', [...this.store.get('reservas', []), booking])) { fb.textContent = 'Não foi possível salvar neste navegador.'; return; }
    f.reset(); this.modal.close();
    this.toast.show(`Solicitação ${booking.id} registrada. Obrigado, ${name.split(' ')[0]}!`, 6000);
  }
}

/* ---------- Formulário de contato (demonstrativo: nada é enviado) ---------- */
class ContactForm {
  constructor() { this.form = $('#contactForm'); this.fb = $('#contactFeedback'); }
  init() {
    $$('input,select,textarea', this.form).forEach(i => i.setAttribute('aria-describedby', 'contactFeedback'));
    this.form.addEventListener('submit', e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(this.form)), name = d.name.trim();
      if (name.length < 2) return this.fail('name', 'Informe seu nome.');
      if (d.message.trim().length < 10) return this.fail('message', 'Escreva uma mensagem com pelo menos 10 caracteres.');
      this.fb.textContent = `Obrigado, ${name.split(' ')[0]}! Recebemos sua mensagem. (Demonstração: nenhum dado foi enviado.)`;
      this.form.reset();
    });
  }
  fail(field, msg) {
    const el = this.form.elements[field]; el.setAttribute('aria-invalid', 'true');
    el.addEventListener('input', () => el.removeAttribute('aria-invalid'), { once: true });
    this.fb.textContent = msg; el.focus();
  }
}

/* ---------- Menu mobile ---------- */
class NavMenu {
  constructor() { this.btn = $('#menuToggle'); this.nav = $('#mainNav'); }
  init() {
    this.btn.addEventListener('click', () => this.set(!this.nav.classList.contains('open')));
    $$('a', this.nav).forEach(a => a.addEventListener('click', () => this.set(false)));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.nav.classList.contains('open')) { this.set(false); this.btn.focus(); }
    });
  }
  set(open) {
    this.nav.classList.toggle('open', open);
    this.btn.setAttribute('aria-expanded', open);
    this.btn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }
}

/* ---------- Acessibilidade (WCAG/W3C): painel de preferências + Libras ---------- */
class Accessibility {
  static ZOOMS = [1, 1.15, 1.3, 1.5];
  static TOGGLES = { contrast: 'Alto contraste', links: 'Sublinhar links', font: 'Fonte legível', calm: 'Reduzir animações' };
  constructor(store) { this.store = store; this.prefs = { zoom: 0, contrast: false, links: false, font: false, calm: false, ...store.get('a11y', {}) }; }
  init() {
    const wrap = document.createElement('div');
    wrap.innerHTML =
      `<button class="a11y-fab" id="a11yFab" type="button" aria-expanded="false" aria-controls="a11yPanel"><span aria-hidden="true">◐</span> Acessibilidade</button>
      <section class="a11y-panel" id="a11yPanel" role="region" aria-label="Opções de acessibilidade" hidden>
        <h2>Acessibilidade</h2>
        <div class="a11y-row"><span>Tamanho do texto</span><div>
          <button type="button" data-zoom="-1" aria-label="Diminuir texto">A−</button>
          <output aria-live="polite" id="zoomOut"></output>
          <button type="button" data-zoom="1" aria-label="Aumentar texto">A+</button></div></div>
        ${Object.entries(Accessibility.TOGGLES).map(([k, t]) => `<button type="button" class="a11y-toggle" data-pref="${k}" aria-pressed="false">${t}</button>`).join('')}
        <button type="button" id="a11yLibras">Tradução em Libras (VLibras)</button>
        <button type="button" id="a11yReset">Restaurar padrão</button>
      </section>`;
    document.body.append(...wrap.children);
    this.fab = $('#a11yFab'); this.panel = $('#a11yPanel');
    this.fab.addEventListener('click', () => this.toggle());
    this.panel.addEventListener('keydown', e => { if (e.key === 'Escape') { this.toggle(false); this.fab.focus(); } });
    $$('[data-zoom]', this.panel).forEach(b => b.addEventListener('click', () => this.change('zoom', Math.min(3, Math.max(0, this.prefs.zoom + +b.dataset.zoom)))));
    $$('.a11y-toggle', this.panel).forEach(b => b.addEventListener('click', () => this.change(b.dataset.pref, !this.prefs[b.dataset.pref])));
    $('#a11yLibras').addEventListener('click', () => $('[vw-access-button]')?.click());
    $('#a11yReset').addEventListener('click', () => { this.prefs = { zoom: 0, contrast: false, links: false, font: false, calm: false }; this.store.set('a11y', this.prefs); this.apply(); });
    $('a[href="#acessibilidade"]')?.addEventListener('click', e => { e.preventDefault(); this.toggle(true); this.panel.querySelector('button')?.focus(); });
    this.apply();
  }
  toggle(open = this.panel.hidden) { this.panel.hidden = !open; this.fab.setAttribute('aria-expanded', open); }
  change(key, value) { this.prefs[key] = value; this.store.set('a11y', this.prefs); this.apply(); }
  apply() {
    const p = this.prefs, root = document.documentElement, z = Accessibility.ZOOMS[p.zoom];
    document.body.style.zoom = z === 1 ? '' : z;
    Object.keys(Accessibility.TOGGLES).forEach(k => root.classList.toggle('a11y-' + k, !!p[k]));
    $$('.a11y-toggle', this.panel).forEach(b => b.setAttribute('aria-pressed', !!p[b.dataset.pref]));
    $('#zoomOut').textContent = Math.round(z * 100) + '%';
  }
}

/* ---------- Privacidade e LGPD: aviso, direitos do titular (acesso e eliminação) ---------- */
class Privacy {
  constructor(store, modal, toast) { this.store = store; this.modal = modal; this.toast = toast; this.el = null; }
  init() {
    this.showBanner();
    ['#privacyLink', '#modalPrivacyLink'].forEach(s => $(s).addEventListener('click', e => { e.preventDefault(); this.modal.open(); }));
    $('#acceptPrivacy').addEventListener('click', () => { this.modal.close(); this.ack(); });
    const box = document.createElement('div');
    box.className = 'privacy-rights';
    box.innerHTML = `<h3>Seus dados neste navegador</h3><p>Exerça aqui os direitos de acesso e eliminação (LGPD, art. 18).</p>
      <div class="rights-actions"><button type="button" class="small-button" id="viewData">Ver meus dados</button><button type="button" class="small-button" id="deleteData">Excluir meus dados</button></div>
      <pre id="dataView" tabindex="0" aria-live="polite" hidden></pre>`;
    $('#acceptPrivacy').before(box);
    $('#viewData').addEventListener('click', () => {
      const d = this.store.all(), pre = $('#dataView');
      pre.textContent = Object.keys(d).length ? JSON.stringify(d, null, 2) : 'Nenhum dado armazenado neste navegador.';
      pre.hidden = false;
    });
    $('#deleteData').addEventListener('click', () => {
      this.store.clear(); $('#dataView').hidden = true;
      this.toast.show('Todos os seus dados foram excluídos deste navegador.', 5000);
      this.showBanner();
    });
  }
  showBanner() {
    if (this.el || this.store.get('aviso')) return;
    const b = this.el = document.createElement('section');
    b.className = 'consent-banner'; b.setAttribute('role', 'region'); b.setAttribute('aria-label', 'Aviso de privacidade');
    b.innerHTML = `<p>Este site usa o armazenamento local do navegador apenas para guardar suas preferências de acessibilidade e solicitações de reserva. Não usamos cookies de rastreamento nem enviamos dados a terceiros.</p>
      <button class="gold-button" type="button" data-act="ok">Entendi</button><button class="link" type="button" data-act="more">Saiba mais</button>`;
    b.addEventListener('click', e => { const a = e.target.dataset.act; if (a === 'ok') this.ack(); if (a === 'more') this.modal.open(); });
    document.body.append(b);
    document.documentElement.style.setProperty('--banner-h', b.offsetHeight + 'px');
  }
  ack() {
    this.store.set('aviso', { at: new Date().toISOString(), version: '1.0' });
    this.el?.remove(); this.el = null;
    document.documentElement.style.removeProperty('--banner-h');
  }
}

/* ---------- Estilos dos componentes criados pelo JS (mesma identidade visual) ---------- */
function injectStyles() {
  const css = `
.a11y-fab{position:fixed;left:22px;bottom:calc(22px + var(--banner-h,0px));z-index:90;background:var(--brown);color:#fff;border:1px solid var(--gold);padding:11px 16px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;box-shadow:var(--shadow)}
.a11y-fab:hover{background:var(--gold-dark)}
.a11y-panel{position:fixed;left:22px;bottom:calc(76px + var(--banner-h,0px));z-index:91;width:min(320px,calc(100% - 44px));background:var(--cream);color:var(--ink);padding:22px;box-shadow:var(--shadow);display:grid;gap:9px}
.a11y-panel[hidden]{display:none}
.a11y-panel h2{font:500 30px var(--serif);margin:0 0 4px}
.a11y-row{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:11px}
.a11y-row div{display:flex;align-items:center;gap:6px}
.a11y-row output{min-width:42px;text-align:center}
.a11y-panel button{border:1px solid var(--gold);background:transparent;color:var(--gold-dark);padding:10px 12px;font-size:10px;letter-spacing:.06em;cursor:pointer;text-align:left}
.a11y-panel button:hover{background:var(--sand)}
.a11y-panel button[aria-pressed=true]{background:var(--brown);color:#fff;border-color:var(--brown)}
.consent-banner{position:fixed;left:22px;right:22px;bottom:22px;max-width:780px;margin:0 auto;z-index:150;background:var(--brown);color:var(--sand);padding:18px 22px;display:flex;flex-wrap:wrap;align-items:center;gap:14px 18px;box-shadow:var(--shadow);font-size:11px}
.consent-banner p{margin:0;flex:1 1 280px}
.consent-banner .link{background:none;border:0;color:#d2ad7e;text-decoration:underline;cursor:pointer;font-size:11px}
.privacy-rights{border-top:1px solid var(--line);margin-top:20px;padding-top:4px}
.rights-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.privacy-rights pre{background:#eee8df;padding:12px;margin:0 0 16px;font-size:10px;max-height:180px;overflow:auto;white-space:pre-wrap;word-break:break-word}
[aria-invalid=true]{outline:2px solid #c0392b;outline-offset:2px}
html.a11y-links a{text-decoration:underline!important}
html.a11y-font *{font-family:Arial,Verdana,sans-serif!important;letter-spacing:normal!important}
html.a11y-calm *{scroll-behavior:auto!important;transition:none!important;animation:none!important}
html.a11y-contrast *:not(img):not(svg){background-color:#000!important;color:#fff!important;border-color:#fff!important;box-shadow:none!important}
html.a11y-contrast a{color:#ffe600!important;text-decoration:underline!important}`;
  const st = document.createElement('style'); st.textContent = css; document.head.append(st);
}

/* ---------- Aplicação: instancia as classes e liga uma à outra ---------- */
class App {
  init() {
    injectStyles();
    const store = new Store(), toast = new Toast($('#toast'));
    const reservationModal = new Modal($('#reservationModal'), $('#closeModal'));
    const privacyModal = new Modal($('#privacyModal'), $('#closePrivacy'));
    const search = new Search(), catalog = new Catalog();

    search.form.addEventListener('submit', e => {
      e.preventDefault();
      const err = search.error();
      if (err) { toast.show(err); search.checkin.focus(); return; }
      catalog.applySearch(search);
      $('#acomodacoes').scrollIntoView({ behavior: 'smooth' });
    });

    new ReservationFlow({ catalog, search, store, toast, modal: reservationModal }).init();
    new ContactForm().init();
    new NavMenu().init();
    new Accessibility(store).init();
    new Privacy(store, privacyModal, toast).init();
    $('#year').textContent = new Date().getFullYear();
  }
}

new App().init();

/* ===== IDIOMA (PT / EN) ===== */
const traducoes = {
  en: {
    "Pular para o conteúdo": "Skip to content",
    "HOTEL & EXPERIÊNCIAS": "HOTEL & EXPERIENCES",
    "Início": "Home", "O hotel": "The hotel", "Acomodações": "Rooms",
    "Experiências": "Experiences", "Galeria": "Gallery", "Atendimento": "Support",
    "Reservar agora": "Book now",
    "Hotel Aurora, página inicial": "Hotel Aurora, home page",
    "Abrir menu": "Open menu", "Fechar menu": "Close menu",
    "Navegação principal": "Main navigation", "Cinco estrelas": "Five stars",
    "HOSPITALIDADE COM PROPÓSITO": "HOSPITALITY WITH PURPOSE",
    "BRASIL · DESDE 2012": "BRAZIL · SINCE 2012",
    "UM REFÚGIO PARA SEUS MELHORES MOMENTOS": "A RETREAT FOR YOUR BEST MOMENTS",
    "O extraordinário": "The extraordinary",
    "começa na sua estadia.": "begins with your stay.",
    "Conforto, cuidado e experiências pensadas em cada detalhe.": "Comfort, care and experiences designed in every detail.",
    "Conheça nossas acomodações": "Discover our rooms",
    "Pesquisar hospedagem": "Search accommodation",
    "Data de check-in": "Check-in date", "Data de check-out": "Check-out date",
    "Quantidade de adultos": "Number of adults", "Quantidade de crianças": "Number of children",
    "Quantidade de quartos": "Number of rooms",
    "Adultos": "Adults", "Crianças": "Children", "Quartos": "Rooms",
    "1 adulto": "1 adult", "2 adultos": "2 adults", "3 adultos": "3 adults", "4 adultos": "4 adults",
    "Sem crianças": "No children", "1 criança": "1 child", "2 crianças": "2 children", "3 crianças": "3 children",
    "1 quarto": "1 room", "2 quartos": "2 rooms", "3 quartos": "3 rooms",
    "Consultar": "Search",
    "Suíte elegante do Hotel Aurora, com cama ampla e iluminação acolhedora": "Elegant suite at Hotel Aurora with a spacious bed and cozy lighting",
    "UM LUGAR PARA DESACELERAR": "A PLACE TO SLOW DOWN",
    "BEM-VINDO AO HOTEL AURORA": "WELCOME TO HOTEL AURORA",
    "Mais do que hospedar.": "More than lodging.",
    "Fazer você se sentir bem.": "Making you feel good.",
    "O Hotel Aurora nasceu para transformar cada viagem em uma lembrança especial. Unimos arquitetura acolhedora, serviço atencioso e espaços cuidadosamente preparados para que você aproveite cada instante.": "Hotel Aurora was created to turn every trip into a special memory. We combine welcoming architecture, attentive service and carefully prepared spaces so you can enjoy every moment.",
    "Da chegada ao último café da manhã, nossa equipe cuida dos detalhes para que você só precise aproveitar.": "From arrival to your last breakfast, our team takes care of the details so you can simply enjoy.",
    "Descubra o hotel": "Discover the hotel",
    "DESCANSE DO SEU JEITO": "REST YOUR OWN WAY",
    "pensadas para você": "designed for you",
    "Ambientes únicos, conforto absoluto e pequenos detalhes que fazem toda a diferença.": "Unique spaces, absolute comfort and small details that make all the difference.",
    "Filtrar acomodações": "Filter rooms",
    "Todas": "All", "Para casal": "For couples", "Para família": "For families",
    "MAIS RESERVADO": "MOST BOOKED", "ESPAÇO EXTRA": "EXTRA SPACE", "EXPERIÊNCIA EXCLUSIVA": "EXCLUSIVE EXPERIENCE",
    "Quarto Deluxe com cama king-size": "Deluxe room with king-size bed",
    "Suíte família com duas camas confortáveis": "Family suite with two comfortable beds",
    "Suíte Presidencial com decoração sofisticada": "Presidential Suite with sophisticated décor",
    "Suíte Deluxe": "Deluxe Suite", "Suíte Família": "Family Suite", "Suíte Presidencial": "Presidential Suite",
    "Elegância e tranquilidade em um espaço feito para relaxar.": "Elegance and tranquility in a space made for relaxing.",
    "Mais espaço para compartilhar bons momentos com quem você ama.": "More space to share great moments with the people you love.",
    "Amplitude, privacidade e uma experiência de hospedagem singular.": "Space, privacy and a one-of-a-kind stay.",
    "♧ 2 hóspedes": "♧ 2 guests", "♧ Até 4 hóspedes": "♧ Up to 4 guests", "Varanda": "Balcony",
    "A partir de": "From", "/ diária": "/ night", "Ver disponibilidade": "Check availability",
    "VIVA CADA MOMENTO": "LIVE EVERY MOMENT",
    "Experiências que": "Experiences that", "ficam na memória.": "stay with you.",
    "Sabores, descanso e bem-estar se encontram em ambientes criados para tornar sua estadia ainda mais especial.": "Flavors, rest and well-being come together in spaces created to make your stay even more special.",
    "Restaurante Aurora": "Aurora Restaurant",
    "Ingredientes selecionados e uma cozinha que celebra bons encontros.": "Selected ingredients and a kitchen that celebrates good gatherings.",
    "Spa & Bem-estar": "Spa & Wellness",
    "Rituais de relaxamento para renovar corpo e mente.": "Relaxation rituals to renew body and mind.",
    "Piscina & lazer": "Pool & leisure",
    "Um convite para desacelerar e aproveitar o momento.": "An invitation to slow down and enjoy the moment.",
    "UM OLHAR SOBRE O AURORA": "A LOOK AT AURORA",
    "Detalhes que": "Details that", "encantam": "delight",
    "Conheça alguns dos espaços que fazem parte da experiência Aurora.": "Discover some of the spaces that are part of the Aurora experience.",
    "Piscina externa do hotel cercada por paisagismo": "Outdoor hotel pool surrounded by landscaping",
    "Mesa preparada no restaurante do hotel": "Table set in the hotel restaurant",
    "Ambiente de spa para relaxamento": "Spa setting for relaxation",
    "Fachada e área de lazer de hotel de luxo": "Facade and leisure area of a luxury hotel",
    "A EXPERIÊNCIA DE QUEM JÁ ESTEVE AQUI": "THE EXPERIENCE OF THOSE WHO HAVE BEEN HERE",
    "Hospitalidade reconhecida": "Recognized hospitality", "em cada detalhe.": "in every detail.",
    "“Desde a chegada, fomos recebidos com muito cuidado. O quarto era impecável e cada detalhe tornou nossa viagem ainda mais especial.”": "“From the moment we arrived, we were welcomed with great care. The room was impeccable and every detail made our trip even more special.”",
    "· Hóspede": "· Guest",
    "Avaliação ilustrativa para apresentação do protótipo.": "Illustrative review for the prototype presentation.",
    "ESTAMOS AQUI PARA AJUDAR": "WE'RE HERE TO HELP",
    "Ficou com alguma": "Do you have any", "dúvida?": "questions?",
    "Reunimos algumas respostas para facilitar o planejamento da sua estadia. Se precisar, nossa equipe também está à disposição.": "We have gathered some answers to help you plan your stay. If needed, our team is also available.",
    "Fale com nossa equipe ↗️": "Talk to our team ↗️",
    "Quais são os horários de check-in e check-out?": "What are the check-in and check-out times?",
    "O check-in começa às 14h e o check-out deve ser realizado até as 12h. Solicitações especiais estão sujeitas à disponibilidade.": "Check-in starts at 2 p.m. and check-out must be completed by 12 noon. Special requests are subject to availability.",
    "O café da manhã está incluído?": "Is breakfast included?",
    "Sim. Nesta demonstração, o café da manhã está incluído nas diárias apresentadas.": "Yes. In this demo, breakfast is included in the rates shown.",
    "Posso cancelar minha reserva?": "Can I cancel my booking?",
    "As condições de cancelamento variam conforme a tarifa escolhida. Consulte as condições antes de confirmar sua solicitação.": "Cancellation terms vary depending on the chosen rate. Check the terms before confirming your request.",
    "O hotel aceita crianças?": "Does the hotel accept children?",
    "Sim. Temos acomodações adequadas para famílias. Informe a quantidade de adultos e crianças na pesquisa.": "Yes. We have rooms suited to families. Enter the number of adults and children in the search.",
    "Como posso falar com o atendimento?": "How can I contact support?",
    "Você pode utilizar o formulário de contato ou o botão de WhatsApp. Os canais desta versão são demonstrativos.": "You can use the contact form or the WhatsApp button. The channels in this version are for demonstration.",
    "FALE COM O HOTEL AURORA": "CONTACT HOTEL AURORA",
    "Estamos prontos": "We are ready", "para receber você.": "to welcome you.",
    "Envie sua mensagem. Nossa equipe terá prazer em ajudar.": "Send us your message. Our team will be happy to help.",
    "⌖ Brasília, Distrito Federal · Brasil": "⌖ Brasília, Federal District · Brazil",
    "Seu nome": "Your name", "Seu e-mail": "Your email", "Assunto": "Subject", "Sua mensagem": "Your message",
    "Como podemos chamar você?": "What should we call you?",
    "voce@email.com": "you@email.com",
    "Escreva sua mensagem...": "Write your message...",
    "Dúvida sobre hospedagem": "Question about lodging", "Alteração de reserva": "Change of booking",
    "Eventos e experiências": "Events and experiences", "Outro assunto": "Other subject",
    "Enviar mensagem": "Send message",
    "O extraordinário começa na sua estadia.": "The extraordinary begins with your stay.",
    "Voltar ao topo ↑": "Back to top ↑",
    "Hotel Aurora. Projeto demonstrativo.": "Hotel Aurora. Demo project.",
    "Privacidade e LGPD": "Privacy and LGPD", "Acessibilidade": "Accessibility",
    "Fechar janela": "Close window",
    "SUA PRÓXIMA ESTADIA": "YOUR NEXT STAY",
    "Solicitar reserva": "Request booking",
    "Confira os detalhes e informe seus dados para registrar a solicitação.": "Review the details and enter your information to register the request.",
    "Nome completo": "Full name", "E-mail": "Email", "Telefone": "Phone",
    "Li e concordo com o": "I have read and agree to the",
    "aviso de privacidade": "privacy notice",
    "e autorizo o uso dos dados para processar esta solicitação.": "and authorize the use of my data to process this request.",
    "Confirmar solicitação": "Confirm request",
    "TRANSPARÊNCIA E CONFIANÇA": "TRANSPARENCY AND TRUST",
    "Privacidade e proteção de dados": "Privacy and data protection",
    "Este protótipo solicita apenas dados necessários para demonstrar o fluxo de reserva e atendimento: nome, e-mail, telefone e informações da hospedagem.": "This prototype only asks for the data needed to demonstrate the booking and support flow: name, email, phone and stay information.",
    "Como os dados são utilizados?": "How is the data used?",
    "Na versão demonstrativa, as informações da reserva ficam armazenadas somente no navegador, por meio do armazenamento local (localStorage). O formulário de contato apenas apresenta uma confirmação na tela e não envia dados a um servidor.": "In the demo version, booking information is stored only in the browser, using local storage (localStorage). The contact form only shows an on-screen confirmation and does not send data to a server.",
    "Seus direitos": "Your rights",
    "Em uma operação real, o titular poderá solicitar confirmação de tratamento, acesso, correção, anonimização ou eliminação dos dados, conforme as hipóteses legais aplicáveis da LGPD (Lei nº 13.709/2018).": "In a real operation, the data subject may request confirmation of processing, access, correction, anonymization or deletion of data, according to the applicable legal bases of the LGPD (Law No. 13,709/2018).",
    "Importante": "Important",
    "Não informe dados financeiros ou documentos reais neste protótipo. Para operar comercialmente, o hotel precisará de backend seguro, política definitiva, controles de acesso, prazos de retenção e canal oficial para solicitações dos titulares.": "Do not enter financial data or real documents in this prototype. To operate commercially, the hotel will need a secure backend, a final policy, access controls, retention periods and an official channel for data subject requests.",
    "Entendi": "Got it",
    "Hotel Aurora | Uma experiência extraordinária": "Hotel Aurora | An extraordinary experience",
    "Hotel Aurora: hospedagem sofisticada, experiências memoráveis e reservas online.": "Hotel Aurora: sophisticated lodging, memorable experiences and online booking."
  }
};

class Idioma {
  static ATRIBUTOS = ["alt", "placeholder", "aria-label"];
  static OPCOES = [
    { codigo: "pt-BR", rotulo: "PT", nome: "Português" },
    { codigo: "en", rotulo: "EN", nome: "English" }
  ];

  #originais = new WeakMap();
  #tituloOriginal = document.title;
  #metaDescricao = document.querySelector('meta[name="description"]');
  #descricaoOriginal = this.#metaDescricao?.content ?? "";
  #seletor = null;

  constructor(traducoes, padrao = "pt-BR") {
    this.padrao = padrao;
    this.dicionarios = {};
    for (const [codigo, dic] of Object.entries(traducoes)) {
      this.dicionarios[codigo] = new Map(
        Object.entries(dic).map(([chave, valor]) => [this.#normalizar(chave), valor])
      );
    }
    const salvo = this.#lerSalvo();
    this.atual = salvo && this.#valido(salvo) ? salvo : padrao;
  }

  iniciar() {
    this.#criarSeletor();
    this.aplicar();
    new MutationObserver((mudancas) => {
      mudancas.forEach((m) => m.addedNodes.forEach((no) => this.#aplicarEm(no)));
    }).observe(document.body, { childList: true, subtree: true });
  }

  trocar(codigo) {
    if (!this.#valido(codigo)) return;
    this.atual = codigo;
    try { localStorage.setItem("idioma", codigo); } catch { }
    this.aplicar();
  }

  aplicar() {
    document.documentElement.lang = this.atual;
    this.#aplicarEm(document.body);
    document.title = this.#traduzir(this.#tituloOriginal);
    this.#metaDescricao?.setAttribute("content", this.#traduzir(this.#descricaoOriginal));
    this.#seletor?.querySelectorAll("button").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.idioma === this.atual))
    );
  }

  #valido(codigo) {
    return codigo === this.padrao || Boolean(this.dicionarios[codigo]);
  }

  #lerSalvo() {
    try { return localStorage.getItem("idioma"); } catch { return null; }
  }

  #normalizar(texto) {
    return texto.replace(/\uFE0F/g, "").replace(/\s+/g, " ").trim();
  }

  #buscar(original) {
    return this.dicionarios[this.atual]?.get(this.#normalizar(original));
  }

  #traduzir(original) {
    return this.#buscar(original) ?? original;
  }

  #ignorar(el) {
    return !el || Boolean(el.closest("script, style, [vw], .lang-switch"));
  }

  #aplicarEm(raiz) {
    if (raiz.nodeType === Node.TEXT_NODE) return this.#traduzirTexto(raiz);
    if (raiz.nodeType !== Node.ELEMENT_NODE || this.#ignorar(raiz)) return;

    const percorredor = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    const textos = [];
    while (percorredor.nextNode()) textos.push(percorredor.currentNode);
    textos.forEach((no) => this.#traduzirTexto(no));

    [raiz, ...raiz.querySelectorAll("*")].forEach((el) => this.#traduzirAtributos(el));
  }

  #traduzirTexto(no) {
    if (this.#ignorar(no.parentElement)) return;
    if (!this.#originais.has(no)) this.#originais.set(no, no.nodeValue);
    const original = this.#originais.get(no);
    if (!this.#normalizar(original)) return;

    const traducao = this.#buscar(original);
    if (traducao) {
      const inicio = original.match(/^\s*/)[0];
      const fim = original.match(/\s*$/)[0];
      no.nodeValue = inicio + traducao + fim;
    } else {
      no.nodeValue = original;
    }
  }

  #traduzirAtributos(el) {
    if (this.#ignorar(el)) return;
    for (const attr of Idioma.ATRIBUTOS) {
      if (!el.hasAttribute(attr)) continue;
      const guardados = this.#originais.get(el) ?? {};
      guardados[attr] ??= el.getAttribute(attr);
      this.#originais.set(el, guardados);
      el.setAttribute(attr, this.#traduzir(guardados[attr]));
    }
  }

  #criarSeletor() {
    // Se os botões PT/EN já estão no HTML, só liga os cliques neles
    const existente = document.querySelector(".lang-switch");
    if (existente) {
      existente.querySelectorAll("button").forEach((botao) =>
        botao.addEventListener("click", () => this.trocar(botao.dataset.idioma))
      );
      this.#seletor = existente;
      return;
    }

    const caixa = document.createElement("div");
    caixa.className = "lang-switch";
    caixa.setAttribute("role", "group");
    caixa.setAttribute("aria-label", "Idioma / Language");

    Idioma.OPCOES.forEach(({ codigo, rotulo, nome }) => {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.textContent = rotulo;
      botao.lang = codigo;
      botao.dataset.idioma = codigo;
      botao.setAttribute("aria-label", nome);
      botao.addEventListener("click", () => this.trocar(codigo));
      caixa.append(botao);
    });

    const cta = document.querySelector(".header-cta");
    if (cta) cta.before(caixa);
    else document.querySelector(".site-header")?.append(caixa);
    this.#seletor = caixa;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new Idioma(traducoes).iniciar();
});

const btnMotion = document.querySelector('#btnMotion'); // use o id real do seu botão
btnMotion.addEventListener('click', () => {
  const ativo = document.body.classList.toggle('reduce-motion');
  btnMotion.setAttribute('aria-pressed', ativo);
});

document.querySelector('#btnVlibras').addEventListener('click', () => {
  document.querySelector('[vw-access-button]').click();
});