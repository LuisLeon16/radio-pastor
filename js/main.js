/* ==========================================================
   Radio Pastor 97.3 FM — JavaScript vanilla
   1) Reproductor  2) Animación al hacer scroll  3) Lightbox
   ========================================================== */
(function () {
  'use strict';

  // Activa los estilos de animación solo si hay JavaScript
  document.documentElement.classList.add('js');

  /* ---------- 1. REPRODUCTOR ---------- */
  var audio = document.getElementById('audio');
  var btnPlay = document.getElementById('btnPlay');
  var btnMute = document.getElementById('btnMute');
  var vol = document.getElementById('vol');
  var volWrap = document.getElementById('volWrap');
  var iosNote = document.getElementById('iosNote');
  var eq = document.getElementById('eq');
  var badge = document.getElementById('liveBadge');
  var status = document.getElementById('status');
  var icono = btnPlay.querySelector('i');
  var hint = document.getElementById('hintSonido');

  var silenciadoAuto = false; // true si el navegador solo permitió arrancar sin sonido
  var usuarioDetuvo = false; // true si la persona pausó: no se vuelve a iniciar sola

  function setEstado(texto, sonando) {
    status.textContent = texto;
    eq.classList.toggle('on', sonando);
    badge.classList.toggle('on', sonando);
    btnPlay.classList.toggle('is-playing', sonando);
    document.body.classList.toggle('is-live', sonando); // activa señal, dial y animaciones "al aire"
    btnPlay.setAttribute('aria-pressed', sonando ? 'true' : 'false');
    btnPlay.setAttribute(
      'aria-label',
      sonando ? 'Pausar radio' : 'Reproducir radio en vivo',
    );
    icono.className = 'bi ' + (sonando ? 'bi-pause-fill' : 'bi-play-fill');
  }
  function mostrarHint(si) {
    hint.hidden = !si;
  }

  // iOS no permite cambiar audio.volume (es de solo lectura): se detecta y se oculta el control
  function volumenSoportado() {
    var anterior = audio.volume;
    audio.volume = 0.5;
    var ok = audio.volume === 0.5;
    audio.volume = anterior;
    return ok;
  }
  if (!volumenSoportado()) {
    volWrap.hidden = true;
    iosNote.hidden = false;
  } else {
    audio.volume = vol.value / 100;
  }

  function actualizarIconoVolumen() {
    var mudo = audio.muted || audio.volume === 0;
    btnMute.querySelector('i').className =
      'bi ' + (mudo ? 'bi-volume-mute-fill' : 'bi-volume-up-fill');
    btnMute.setAttribute('aria-label', mudo ? 'Activar sonido' : 'Silenciar');
  }

  function asignarStream() {
    // El stream se asigna al reproducir para no consumir datos antes de tiempo
    if (!audio.getAttribute('src')) {
      audio.src = audio.dataset.stream;
    }
  }

  // Inicio por clic o toque de la persona (siempre permitido por los navegadores)
  function iniciar() {
    usuarioDetuvo = false;
    asignarStream();
    setEstado('Conectando…', false);
    var promesa = audio.play();
    if (promesa && promesa.catch) {
      promesa.catch(function () {
        setEstado(
          'No se pudo reproducir. Revisa tu conexión e inténtalo de nuevo.',
          false,
        );
      });
    }
  }

  // Al pausar un directo se libera el stream; al volver a dar play se reconecta en vivo
  function detener() {
    usuarioDetuvo = true;
    silenciadoAuto = false;
    audio.muted = false;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    mostrarHint(false);
    actualizarIconoVolumen();
    setEstado('Pausado. Toca play para volver al directo', false);
  }

  // Activa el sonido cuando la radio arrancó en silencio
  function desilenciar() {
    silenciadoAuto = false;
    audio.muted = false;
    mostrarHint(false);
    actualizarIconoVolumen();
    setEstado('Transmitiendo en vivo', true);
  }

  /* --- Autoplay al entrar, sin preguntar nada ---
     Los navegadores (Chrome, Safari, Firefox) NO permiten sonido automático antes de la
     primera interacción. Por eso: 1) se intenta con sonido; 2) si lo bloquean, la radio
     arranca igual en silencio (ecualizador y "EN VIVO" activos); 3) el primer toque o clic
     en cualquier parte activa el sonido, sin ventanas ni preguntas. */
  function autoIniciar() {
    asignarStream();
    setEstado('Sintonizando…', false);
    var p = audio.play();
    if (!p || !p.catch) {
      return;
    }
    p.catch(function (err) {
      if (!err || err.name !== 'NotAllowedError') {
        return;
      } // otros errores los informa el evento "error"
      audio.muted = true;
      silenciadoAuto = true;
      var q = audio.play();
      if (q && q.catch) {
        q.catch(function () {
          // Ni en silencio se permite (típico de iPhone): inicia con el primer toque
          audio.muted = false;
          silenciadoAuto = false;
          audio.removeAttribute('src');
          audio.load();
          setEstado('Toca la pantalla para escuchar en vivo', false);
          mostrarHint(true);
        });
      }
    });
  }

  var eventosGesto = ['click', 'keydown'];
  function quitarGestos() {
    eventosGesto.forEach(function (n) {
      document.removeEventListener(n, alPrimerGesto, true);
    });
  }
  function alPrimerGesto(ev) {
    if (usuarioDetuvo) {
      quitarGestos();
      return;
    }
    // Si toca el propio reproductor, sus botones se encargan
    if (ev.target && ev.target.closest && ev.target.closest('.player')) {
      quitarGestos();
      mostrarHint(false);
      return;
    }
    if (silenciadoAuto) {
      desilenciar();
    } else if (audio.paused) {
      iniciar();
    }
    mostrarHint(false);
    quitarGestos();
  }
  eventosGesto.forEach(function (n) {
    document.addEventListener(n, alPrimerGesto, true);
  });
  autoIniciar();

  btnPlay.addEventListener('click', function () {
    if (silenciadoAuto) {
      desilenciar();
      return;
    }
    if (audio.paused) {
      iniciar();
    } else {
      detener();
    }
  });

  audio.addEventListener('playing', function () {
    if (silenciadoAuto) {
      setEstado('En vivo. Toca la pantalla para activar el sonido', true);
      mostrarHint(true);
    } else {
      setEstado('Transmitiendo en vivo', true);
    }
  });
  audio.addEventListener('waiting', function () {
    status.textContent = 'Cargando…';
  });
  audio.addEventListener('error', function () {
    if (audio.getAttribute('src')) {
      setEstado(
        'Error con la señal. Inténtalo de nuevo en unos segundos.',
        false,
      );
      audio.removeAttribute('src');
    }
  });

  vol.addEventListener('input', function () {
    audio.volume = vol.value / 100;
    if (silenciadoAuto && audio.volume > 0) {
      desilenciar();
    }
    audio.muted = audio.volume === 0;
    actualizarIconoVolumen();
  });
  btnMute.addEventListener('click', function () {
    if (silenciadoAuto) {
      desilenciar();
      return;
    }
    audio.muted = !audio.muted;
    actualizarIconoVolumen();
  });

  // Controles en la pantalla de bloqueo (donde esté disponible)
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'En vivo',
      artist: 'Radio Pastor 97.3 FM',
      artwork: [
        {
          src: 'img/apple-touch-icon.png',
          sizes: '180x180',
          type: 'image/png',
        },
      ],
    });
    navigator.mediaSession.setActionHandler('play', iniciar);
    navigator.mediaSession.setActionHandler('pause', detener);
  }

  /* ---------- 2. ANIMACIÓN AL HACER SCROLL (al bajar y al subir) ---------- */
  // Cada bloque aparece al entrar en pantalla y se reinicia al salir por completo,
  // así vuelve a animarse cada vez que el usuario lo recorre, bajando o subiendo.
  var items = document.querySelectorAll('.reveal');
  var reducir =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reducir) {
    var obs = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (e) {
          var el = e.target;
          if (e.isIntersecting && e.intersectionRatio >= 0.12) {
            // Retraso escalonado entre hermanos, solo al entrar
            var idx = Array.prototype.indexOf.call(el.parentNode.children, el);
            el.style.transitionDelay = Math.min(idx, 5) * 80 + 'ms';
            el.classList.remove('out-top', 'out-bottom');
            el.classList.add('visible');
          } else if (!e.isIntersecting) {
            // Al salir se reinicia desde el lado por el que salió (arriba o abajo)
            el.style.transitionDelay = '0ms';
            el.classList.remove('visible');
            el.classList.add(
              e.boundingClientRect.top < 0 ? 'out-top' : 'out-bottom',
            );
          }
        });
      },
      { threshold: [0, 0.12], rootMargin: '0px 0px -5% 0px' },
    );
    items.forEach(function (el) {
      el.classList.add('out-bottom');
      obs.observe(el);
    });
  } else {
    items.forEach(function (el) {
      el.classList.add('visible');
    }); // sin IntersectionObserver o con movimiento reducido
  }

  /* ---------- 3. LIGHTBOX DE LA GALERÍA ---------- */
  var modalEl = document.getElementById('lightbox');
  var modal = new bootstrap.Modal(modalEl);
  var lbImg = document.getElementById('lbImg');
  var lbCap = document.getElementById('lbCap');
  var ultimoBoton = null;

  document.querySelectorAll('.g-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      ultimoBoton = btn;
      lbImg.src = btn.dataset.full;
      lbImg.alt = btn.querySelector('img').alt;
      lbCap.textContent = btn.dataset.caption;
      modal.show();
    });
  });
  // Devuelve el foco a la miniatura al cerrar (teclado)
  modalEl.addEventListener('hidden.bs.modal', function () {
    lbImg.src = '';
    if (ultimoBoton) {
      ultimoBoton.focus();
    }
  });

  /* ---------- 3b. Cierra el menú móvil al elegir una opción ---------- */
  var menu = document.getElementById('menu');
  document.querySelectorAll('#menu a').forEach(function (a) {
    a.addEventListener('click', function () {
      if (menu.classList.contains('show')) {
        bootstrap.Collapse.getOrCreateInstance(menu).hide();
      }
    });
  });

  /* ---------- 3c. Menú activo según la sección visible ---------- */
  // La sección activa es la última cuya parte superior ya pasó una línea imaginaria
  // ubicada al 35 % de la altura de la pantalla (funciona con secciones cortas y largas).
  var enlaces = Array.prototype.slice.call(
    document.querySelectorAll('#menu .nav-link[href^="#"]'),
  );
  var secciones = enlaces.map(function (a) {
    return document.querySelector(a.getAttribute('href'));
  });
  var pendiente = false;

  function actualizarMenu() {
    pendiente = false;
    var linea = window.innerHeight * 0.35;
    var actual = -1;
    secciones.forEach(function (s, i) {
      if (s && s.getBoundingClientRect().top <= linea) {
        actual = i;
      }
    });
    // Al llegar al final de la página, queda marcada la última sección
    if (
      window.innerHeight + window.pageYOffset >=
      document.documentElement.scrollHeight - 4
    ) {
      actual = secciones.length - 1;
    }
    enlaces.forEach(function (a, i) {
      var activo = i === actual;
      a.classList.toggle('active', activo);
      if (activo) {
        a.setAttribute('aria-current', 'location');
      } else {
        a.removeAttribute('aria-current');
      }
    });
  }
  function pedirActualizacion() {
    if (!pendiente) {
      pendiente = true;
      window.requestAnimationFrame(actualizarMenu);
    }
  }
  window.addEventListener('scroll', pedirActualizacion, { passive: true });
  window.addEventListener('resize', pedirActualizacion);
  window.addEventListener('load', actualizarMenu);
  actualizarMenu();

  /* ---------- 4. Año del pie de página ---------- */
  document.getElementById('anio').textContent = new Date().getFullYear();
})();
