/*
 * Soletta theme behaviour.
 *
 * Two small pieces:
 *   1. scroll reveal for elements marked .sol-reveal
 *   2. keeping the main product price in step with the selected purchase option
 *
 * Both are progressive enhancements. With JavaScript off the content is
 * visible and the purchase options still submit correctly, because the
 * radios post with the product form via their `form` attribute.
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- scroll reveal ---- */
  function initReveal(root) {
    var targets = (root || document).querySelectorAll('.sol-reveal:not(.is-in)');
    if (!targets.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) {
        el.classList.add('is-in');
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.06 }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ---- purchase options ---- */

  // Dawn re-renders the product section on every variant change, which rebuilds
  // the radios. Remember the choice so switching size does not silently drop
  // someone from a subscription back to a one-time purchase.
  var lastChoice = null;

  function priceTarget(fieldset) {
    var section = fieldset.closest('.section, [id^="MainProduct-"], .product');
    if (!section) section = document;
    var container = section.querySelector('[id^="price-"]');
    if (!container) return null;
    return container.querySelector('.price__regular .price-item--regular');
  }

  function syncPrice(fieldset) {
    var checked = fieldset.querySelector('.sol-po__radio:checked');
    if (!checked) return;
    var money = checked.getAttribute('data-price-money');
    var target = priceTarget(fieldset);
    if (money && target) target.textContent = money;
  }

  function initPurchaseOptions(root) {
    var fieldsets = (root || document).querySelectorAll('[data-sol-purchase-options]');

    fieldsets.forEach(function (fieldset) {
      if (fieldset.dataset.solBound === 'true') return;
      fieldset.dataset.solBound = 'true';

      // Restore the previous choice after a variant re-render, but only if that
      // option still exists for the newly selected variant.
      if (lastChoice !== null) {
        var restore = fieldset.querySelector(
          '.sol-po__radio[value="' + (window.CSS && CSS.escape ? CSS.escape(lastChoice) : lastChoice) + '"]'
        );
        if (restore && !restore.disabled) restore.checked = true;
      }

      syncPrice(fieldset);

      fieldset.addEventListener('change', function (event) {
        if (!event.target.classList.contains('sol-po__radio')) return;
        lastChoice = event.target.value;
        syncPrice(fieldset);
      });
    });
  }

  function init(root) {
    initReveal(root);
    initPurchaseOptions(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init(document);
    });
  } else {
    init(document);
  }

  // Dawn swaps section markup in place for variant changes and for theme
  // editor edits, so re-bind whenever the subtree is replaced.
  var rebindTimer = null;
  new MutationObserver(function () {
    clearTimeout(rebindTimer);
    rebindTimer = setTimeout(function () {
      init(document);
    }, 60);
  }).observe(document.body, { childList: true, subtree: true });

  document.addEventListener('shopify:section:load', function (event) {
    init(event.target);
  });
})();
