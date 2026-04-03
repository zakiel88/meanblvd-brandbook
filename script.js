/* ===================================================================
   MEAN BLVD — Brand Guidelines — Shared JavaScript
   Handles: Navigation, Reveal Animations, Stats Counter, Voice Bars
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --- Mobile Menu ---
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      menuBtn.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });

    // Close on link click
    mobileMenu.querySelectorAll('.mobile-link').forEach(link => {
      link.addEventListener('click', () => {
        menuBtn.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // --- Nav scroll effect ---
  const nav = document.getElementById('mainNav');
  if (nav) {
    const handleScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  // --- Reveal on scroll ---
  const revealElements = document.querySelectorAll('.reveal');
  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px'
      }
    );
    revealElements.forEach(el => revealObserver.observe(el));
  }

  // --- Stats Counter Animation ---
  const statNumbers = document.querySelectorAll('.stat-number[data-target]');
  if (statNumbers.length > 0) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    statNumbers.forEach(el => counterObserver.observe(el));
  }

  function animateCounter(element) {
    const target = parseInt(element.dataset.target);
    const duration = 1500;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(target * eased);
      element.textContent = current.toLocaleString();
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    requestAnimationFrame(update);
  }

  // --- Voice Bar Animation ---
  const voiceFills = document.querySelectorAll('.voice-fill[data-width]');
  const voiceMarkers = document.querySelectorAll('.voice-marker[data-position]');

  if (voiceFills.length > 0) {
    const voiceObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const voiceBar = entry.target;
            const fill = voiceBar.querySelector('.voice-fill');
            const marker = voiceBar.querySelector('.voice-marker');

            if (fill) {
              fill.style.setProperty('--target-width', fill.dataset.width + '%');
              fill.classList.add('animated');
            }
            if (marker) {
              marker.style.setProperty('--target-position', marker.dataset.position + '%');
              marker.classList.add('animated');
            }
            voiceObserver.unobserve(voiceBar);
          }
        });
      },
      { threshold: 0.3 }
    );

    document.querySelectorAll('.voice-track').forEach(track => {
      voiceObserver.observe(track);
    });
  }

  // --- Smooth page transitions (subtle) ---
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.4s ease';
  requestAnimationFrame(() => {
    document.body.style.opacity = '1';
  });
});
