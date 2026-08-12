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

  /* ── просмотр фото блюда ── */
  var lb = document.querySelector('.lb');
  if (lb) {
    var lbImg = lb.querySelector('img');
    var lbCap = lb.querySelector('.lb__cap');

    document.querySelectorAll('[data-shot]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        lbImg.src = btn.getAttribute('data-shot');
        lbImg.alt = btn.getAttribute('data-title') || '';
        lbCap.textContent = btn.getAttribute('data-title') || '';
        if (typeof lb.showModal === 'function') lb.showModal();
      });
    });

    lb.querySelector('.lb__x').addEventListener('click', function () { lb.close(); });
    lb.addEventListener('click', function (e) {
      // клик мимо самой фотографии закрывает
      if (!e.target.closest('.lb__fig')) lb.close();
    });
    lb.addEventListener('close', function () { lbImg.removeAttribute('src'); });
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
