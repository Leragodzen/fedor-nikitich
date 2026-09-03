/* ФЁДОР НИКИТИЧ — поведение сайта */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── шапка: фон после прокрутки ── */
  var hdr = document.querySelector('.hdr');
  if (hdr) {
    var onScroll = function () {
      hdr.classList.toggle('is-stuck', window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── мобильное меню ── */
  var burger = document.querySelector('.burger');
  if (burger && hdr) {
    burger.addEventListener('click', function () {
      var open = hdr.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    hdr.querySelectorAll('.nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        hdr.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ── пресс на первом экране ── */
  var press = document.querySelector('.press');
  if (press) {
    var start = function () { press.classList.add('is-set'); };

    // страховка, которая работает всегда: если через 2,6 с логотип всё ещё
    // не проявился (анимации заморожены, вкладка в фоне, что угодно) —
    // показываем его как есть. Пустая карточка вместо вывески недопустима.
    setTimeout(function () {
      var word = press.querySelector('.press__word');
      if (word && getComputedStyle(word).opacity === '0') press.classList.add('is-set', 'is-done');
    }, 2600);

    if (reduced) {
      press.classList.add('is-set', 'is-done');
    } else if (document.visibilityState === 'visible') {
      requestAnimationFrame(function () { setTimeout(start, 120); });
    } else {
      document.addEventListener('visibilitychange', function once() {
        if (document.visibilityState !== 'visible') return;
        document.removeEventListener('visibilitychange', once);
        start();
      });
    }
  }

  /* ── появление блоков при прокрутке ── */
  var rising = document.querySelectorAll('[data-rise]');
  if (rising.length) {
    if (reduced || !('IntersectionObserver' in window)) {
      rising.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;
          var delay = parseInt(el.getAttribute('data-rise'), 10) || 0;
          setTimeout(function () { el.classList.add('is-in'); }, delay);
          io.unobserve(el);
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });
      rising.forEach(function (el) { io.observe(el); });
    }
  }

  /* ── режим работы: открыто / закрыто ──
     пн–чт 8–21 · пт 8–22 · сб 10–22 · вс 10–21 */
  var SCHEDULE = [
    { open: 10, close: 21 }, // вс
    { open: 8,  close: 21 }, // пн
    { open: 8,  close: 21 }, // вт
    { open: 8,  close: 21 }, // ср
    { open: 8,  close: 21 }, // чт
    { open: 8,  close: 22 }, // пт
    { open: 10, close: 22 }  // сб
  ];
  var DAYS = ['воскресенье', 'понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу'];

  function nowInTolyatti() {
    // Тольятти — UTC+4 круглый год
    var d = new Date();
    return new Date(d.getTime() + (d.getTimezoneOffset() * 60000) + 4 * 3600000);
  }

  function statusText() {
    var t = nowInTolyatti();
    var day = t.getDay();
    var mins = t.getHours() * 60 + t.getMinutes();
    var today = SCHEDULE[day];
    var openM = today.open * 60;
    var closeM = today.close * 60;

    if (mins >= openM && mins < closeM) {
      var left = closeM - mins;
      var till = String(today.close).padStart(2, '0') + ':00';
      return {
        on: true,
        text: left <= 60 ? 'Открыто — закрываемся в ' + till : 'Сейчас открыто до ' + till
      };
    }
    if (mins < openM) {
      return { on: false, text: 'Откроется сегодня в ' + String(today.open).padStart(2, '0') + ':00' };
    }
    var nextDay = (day + 1) % 7;
    var next = SCHEDULE[nextDay];
    return {
      on: false,
      text: 'Закрыто — откроется в ' + DAYS[nextDay] + ' в ' + String(next.open).padStart(2, '0') + ':00'
    };
  }

  document.querySelectorAll('[data-status]').forEach(function (el) {
    var s = statusText();
    var dot = el.querySelector('.dot');
    var label = el.querySelector('[data-status-text]');
    if (dot) dot.className = 'dot ' + (s.on ? 'dot--on' : 'dot--off');
    if (label) label.textContent = s.text;
  });

  /* ── подсветка сегодняшнего дня в расписании ── */
  var todayIdx = nowInTolyatti().getDay();
  document.querySelectorAll('[data-day]').forEach(function (li) {
    if (parseInt(li.getAttribute('data-day'), 10) === todayIdx) {
      li.setAttribute('data-today', '');
    }
  });

  /* ── горизонтальные ленты: стрелки на десктопе ── */
  document.querySelectorAll('[data-rail]').forEach(function (rail) {
    var nav = document.querySelector('[data-rail-nav="' + rail.getAttribute('data-rail') + '"]');
    if (!nav) return;
    var prev = nav.querySelector('[data-dir="prev"]');
    var next = nav.querySelector('[data-dir="next"]');

    var step = function () {
      var first = rail.firstElementChild;
      if (!first) return rail.clientWidth;
      var gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
      return (first.getBoundingClientRect().width + gap) * 3;
    };
    var sync = function () {
      var max = rail.scrollWidth - rail.clientWidth - 2;
      prev.disabled = rail.scrollLeft <= 2;
      next.disabled = rail.scrollLeft >= max;
    };
    prev.addEventListener('click', function () { rail.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' }); });
    next.addEventListener('click', function () { rail.scrollBy({ left:  step(), behavior: reduced ? 'auto' : 'smooth' }); });
    rail.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  });

  /* ── просмотр фото: открыли одно — листаются все на странице ──
     Раньше из каждого снимка приходилось выходить и открывать следующий.
     Теперь фотографии страницы — одна лента: стрелки, клавиши и свайп. */
  var lb = document.querySelector('.lb');
  if (lb) {
    var lbImg = lb.querySelector('img');
    var lbCap = lb.querySelector('.lb__cap');
    var shots = Array.prototype.slice.call(document.querySelectorAll('[data-shot]'));
    var at = 0;

    var nav = document.createElement('div');
    nav.className = 'lb__nav';
    nav.innerHTML = '<button class="lb__go" type="button" data-go="-1" aria-label="Предыдущее фото">←</button>' +
                    '<button class="lb__go" type="button" data-go="1" aria-label="Следующее фото">→</button>';
    lb.querySelector('.lb__fig').appendChild(nav);

    var showShot = function (i) {
      at = (i + shots.length) % shots.length;
      var btn = shots[at];
      var title = btn.getAttribute('data-title') || '';
      lbImg.src = btn.getAttribute('data-shot');
      lbImg.alt = title;
      lbCap.textContent = title;
    };

    shots.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        showShot(i);
        if (typeof lb.showModal === 'function') lb.showModal();
      });
    });

    nav.addEventListener('click', function (e) {
      var b = e.target.closest('[data-go]');
      if (b) showShot(at + parseInt(b.getAttribute('data-go'), 10));
    });

    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); showShot(at + 1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); showShot(at - 1); }
    });

    // свайп на телефоне
    var x0 = null;
    lb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) showShot(at + (dx < 0 ? 1 : -1));
      x0 = null;
    }, { passive: true });

    lb.querySelector('.lb__x').addEventListener('click', function () { lb.close(); });
    lb.addEventListener('click', function (e) {
      // клик мимо самой фотографии закрывает
      if (!e.target.closest('.lb__fig')) lb.close();
    });
    lb.addEventListener('close', function () { lbImg.removeAttribute('src'); });
  }

  /* ── бронь стола ──
     На телефоне ссылка tel: сразу звонит — так быстрее.
     На компьютере звонить некуда, поэтому показываем номер и Telegram. */
  var bk = document.querySelector('.bk');
  if (bk) {
    var wide = window.matchMedia('(min-width: 900px)');
    document.querySelectorAll('[data-book]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (!wide.matches) return;            // телефон: звоним напрямую
        e.preventDefault();
        if (typeof bk.showModal === 'function') bk.showModal();
      });
    });
    bk.querySelector('.bk__x').addEventListener('click', function () { bk.close(); });
    bk.addEventListener('click', function (e) {
      if (!e.target.closest('.bk__card')) bk.close();
    });
  }

  /* ── плавающая кнопка звонка ── */
  var fab = document.querySelector('.fab');
  if (fab) {
    var toggleFab = function () {
      fab.classList.toggle('is-on', window.scrollY > window.innerHeight * 0.6);
    };
    toggleFab();
    window.addEventListener('scroll', toggleFab, { passive: true });
  }

  /* ── карточка со спецпредложением ──
     Не по таймеру: окно, закрывающее контент сразу после входа, Google
     считает навязчивым и понижает страницу на мобильных. Показываем по
     намерению — когда курсор уходит из окна или человек уже прочитал
     половину страницы. Раз в 30 дней и никогда тем, кто уже звонил. */
  var offer = document.querySelector('.offer');
  if (offer) {
    var KEY = 'fn-offer-seen';
    var DONE = 'fn-converted';
    var MONTH = 30 * 24 * 3600 * 1000;

    var seen = function () {
      try {
        if (localStorage.getItem(DONE)) return true;
        var t = parseInt(localStorage.getItem(KEY), 10);
        return t && (Date.now() - t) < MONTH;
      } catch (e) { return true; }
    };
    var remember = function (k) {
      try { localStorage.setItem(k, String(Date.now())); } catch (e) {}
    };

    // тот, кто уже позвонил или открыл бронь, оффера не увидит
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="tel:"], [data-book]');
      if (a) remember(DONE);
    });

    // адрес с ?offer открывает карточку сразу и ничего не запоминает —
    // это для показа заказчику, обычный гость такой ссылки не встретит
    var demo = /[?&]offer(=|&|$)/.test(location.search);

    var shown = false;
    var show = function (force) {
      if (shown || !offer.showModal) return;
      if (!force && seen()) return;
      shown = true;
      if (!force) remember(KEY);
      offer.showModal();
    };

    if (demo) {
      show(true);
    } else if (!seen()) {
      if (window.matchMedia('(min-width: 900px)').matches) {
        document.addEventListener('mouseout', function (e) {
          if (!e.relatedTarget && e.clientY <= 4) show();
        });
        setTimeout(show, 75000);            // страховка для долгого чтения
      } else {
        var onScroll2 = function () {
          var h = document.documentElement;
          var p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
          if (p > 0.55) { show(); window.removeEventListener('scroll', onScroll2); }
        };
        window.addEventListener('scroll', onScroll2, { passive: true });
        setTimeout(show, 30000);
      }
    }

    offer.querySelectorAll('[data-offer-close]').forEach(function (b) {
      b.addEventListener('click', function () { offer.close(); });
    });
    offer.addEventListener('click', function (e) {
      if (!e.target.closest('.offer__card')) offer.close();
    });
  }

  /* ── круассан вместо полосы прокрутки ──
     Родная полоса спрятана в стилях. Вместо неё справа идёт тонкая линия:
     сверху она закрашена охрой на пройденную долю страницы, а на границе
     закраски едет круассан. Тот же приём — под горизонтальными лентами. */
  var MARK =
    '<svg viewBox="0 0 40 28" fill="none" stroke="currentColor" stroke-width="2.1" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M5 7c0 11.5 6 16 15 16s15-4.5 15-16"/>' +
    '<path d="M5 7c1 6.2 7 9.6 15 9.6S34 13.2 35 7"/>' +
    '<path d="M13.6 15.4 13 21.4M20 16.6v6.4M26.4 15.4l.6 6"/>' +
    '</svg>';

  var bar = document.createElement('div');
  bar.className = 'roll';
  bar.setAttribute('aria-hidden', 'true');
  bar.innerHTML = '<span class="roll__rail"><i class="roll__fill"></i></span>' +
                  '<span class="roll__mark">' + MARK + '</span>';
  document.body.appendChild(bar);

  var mark = bar.querySelector('.roll__mark');
  var fill = bar.querySelector('.roll__fill');

  var moveMark = function () {
    var all = document.documentElement.scrollHeight - window.innerHeight;
    var part = all > 0 ? Math.min(1, Math.max(0, window.scrollY / all)) : 0;
    var run = bar.clientHeight - mark.offsetHeight;
    mark.style.transform = 'translateY(' + (part * run) + 'px)';
    fill.style.height = (part * run + mark.offsetHeight / 2) + 'px';
    bar.classList.toggle('is-on', all > 200);
  };
  moveMark();
  window.addEventListener('scroll', moveMark, { passive: true });
  window.addEventListener('resize', moveMark);

  /* тот же круассан едет вбок под лентами */
  document.querySelectorAll('[data-rail]').forEach(function (rail) {
    var line = document.createElement('div');
    line.className = 'rollline';
    line.setAttribute('aria-hidden', 'true');
    line.innerHTML = '<span class="rollline__rail"><i class="rollline__fill"></i></span>' +
                     '<span class="rollline__mark">' + MARK + '</span>';
    rail.parentNode.insertBefore(line, rail.nextSibling);

    var p = line.querySelector('.rollline__mark');
    var f = line.querySelector('.rollline__fill');
    var runMark = function () {
      var all = rail.scrollWidth - rail.clientWidth;
      if (all < 24) { line.style.display = 'none'; return; }
      line.style.display = '';
      var part = Math.min(1, Math.max(0, rail.scrollLeft / all));
      var run = line.clientWidth - p.offsetWidth;
      p.style.transform = 'translateX(' + (part * run) + 'px)';
      f.style.width = (part * run + p.offsetWidth / 2) + 'px';
    };
    runMark();
    rail.addEventListener('scroll', runMark, { passive: true });
    window.addEventListener('resize', runMark);
  });

  /* ── вкладки меню: подсветка активного раздела ── */
  var tabs = document.querySelectorAll('.tabs a[href^="#"]');
  if (tabs.length && 'IntersectionObserver' in window) {
    var map = {};
    tabs.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var groups = document.querySelectorAll('.mgroup[id]');
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        tabs.forEach(function (a) { a.classList.remove('is-on'); });
        var a = map[e.target.id];
        if (a) a.classList.add('is-on');
      });
    }, { rootMargin: '-160px 0px -65% 0px' });
    groups.forEach(function (g) { spy.observe(g); });
  }
})();
