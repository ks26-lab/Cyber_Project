/**
 * ==========================================================================
 * GRIDSEC Global Interaction System
 * 1. Custom Text Selection (complemented by CSS)
 * 2. Interactive Button Hover — Smooth Following White Orb
 * 3. Interactive Text Color Animations & State Handling
 * 4. Unified Easing & Reduced Motion Support
 * ==========================================================================
 */

(function () {
  'use strict';

  // Check user motion preferences
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /**
   * Button selector matching all interactive buttons across the application
   */
  const BUTTON_SELECTOR = [
    '.btn',
    'button:not(.leaflet-control-zoom-in):not(.leaflet-control-zoom-out)',
    '.sandbox-btn',
    '.dsa-tab-btn',
    '.map-filter-btn',
    '.map-zoom-btn',
    '.operator-pill-btn',
    '.pincode-quick-btn',
    '.pincode-modal-close-btn',
    '.insp-tab-btn',
    '.sidebar-toggle-btn',
    '.search-clear-btn',
    '[data-interactive-button]'
  ].join(', ');

  /**
   * State management for the active button hover orb animation
   */
  let activeButton = null;
  let activeOrb = null;
  let animFrameId = null;
  let currentX = 0;
  let currentY = 0;
  let targetX = 0;
  let targetY = 0;
  let isHovering = false;

  /**
   * Animation tick using requestAnimationFrame with smooth spring/lerp easing
   */
  function animateOrb() {
    if (!activeButton || !activeOrb) {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      animFrameId = null;
      return;
    }

    // Lerp towards target position (0.22 factor creates a soft, fluid trailing effect)
    const ease = 0.22;
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;

    // Apply 3D hardware-accelerated transform centered on cursor
    activeOrb.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0) translate(-50%, -50%) scale(${isHovering ? 1 : 0.3})`;

    // Continue loop if hovering or if still moving towards target
    const dist = Math.hypot(targetX - currentX, targetY - currentY);
    if (isHovering || dist > 0.5) {
      animFrameId = requestAnimationFrame(animateOrb);
    } else {
      animFrameId = null;
    }
  }

  /**
   * Retrieves or creates the white orb element inside the target button
   */
  function getOrCreateOrb(button) {
    let orb = button.querySelector(':scope > .btn-orb');
    if (!orb) {
      orb = document.createElement('span');
      orb.className = 'btn-orb';
      orb.setAttribute('aria-hidden', 'true');
      button.prepend(orb);
    }
    return orb;
  }

  /**
   * Find the closest interactive button ancestor
   */
  function findInteractiveButton(target) {
    if (!target || !(target instanceof Element)) return null;
    return target.closest(BUTTON_SELECTOR);
  }

  /**
   * Pointer enter/move handler (delegated on document for full dynamic compatibility)
   */
  function handlePointerMove(e) {
    if (prefersReducedMotion.matches) return;

    // Only handle mouse/pen interactions (skip coarse touch pointers if desired)
    if (e.pointerType === 'touch') return;

    const btn = findInteractiveButton(e.target);

    if (!btn) {
      if (activeButton) {
        handlePointerLeave();
      }
      return;
    }

    const rect = btn.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    if (activeButton !== btn) {
      // Fade out previous button's orb if switching directly
      if (activeOrb) {
        activeOrb.style.opacity = '0';
        activeOrb.style.transform = `translate3d(${targetX.toFixed(2)}px, ${targetY.toFixed(2)}px, 0) translate(-50%, -50%) scale(0.3)`;
      }

      // Switching or entering new button
      activeButton = btn;
      activeOrb = getOrCreateOrb(btn);
      isHovering = true;

      // Position initially at cursor entry point
      currentX = relX;
      currentY = relY;
      targetX = relX;
      targetY = relY;

      activeOrb.style.opacity = '1';
      activeOrb.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0) translate(-50%, -50%) scale(1)`;

      if (!animFrameId) {
        animFrameId = requestAnimationFrame(animateOrb);
      }
    } else {
      // Cursor moved inside current button
      targetX = relX;
      targetY = relY;
      isHovering = true;

      if (!animFrameId) {
        animFrameId = requestAnimationFrame(animateOrb);
      }
    }
  }

  /**
   * Pointer leave handler
   */
  function handlePointerLeave() {
    if (!activeButton || !activeOrb) return;

    isHovering = false;
    activeOrb.style.opacity = '0';
    activeOrb.style.transform = `translate3d(${targetX.toFixed(2)}px, ${targetY.toFixed(2)}px, 0) translate(-50%, -50%) scale(0.3)`;

    const prevOrb = activeOrb;
    setTimeout(() => {
      if (prevOrb && !isHovering && prevOrb.parentElement) {
        // clean opacity state
        prevOrb.style.opacity = '0';
      }
    }, 280);

    activeButton = null;
    activeOrb = null;
  }

  /**
   * Initialize Global Interaction Listeners
   */
  function initGlobalInteractions() {
    // Delegated pointer events handle all static & dynamically injected buttons
    document.addEventListener('pointerover', handlePointerMove, { passive: true });
    document.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerout', (e) => {
      // If leaving a button to outside
      const btn = findInteractiveButton(e.target);
      const nextBtn = findInteractiveButton(e.relatedTarget);
      if (btn && btn !== nextBtn) {
        handlePointerLeave();
      }
    }, { passive: true });

    window.addEventListener('blur', handlePointerLeave);
  }

  // Self-initialize on DOM readiness
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalInteractions);
  } else {
    initGlobalInteractions();
  }

  // Expose global namespace if required
  window.GridSecInteractions = {
    init: initGlobalInteractions,
    findButton: findInteractiveButton
  };
})();
