/**
 * Centralized animation constants for credit cards
 * All timing values are in seconds unless otherwise noted
 */

export const CARD_GRID_ANIMATIONS = {
  // Stagger animation (only on first visit)
  STAGGER_DELAY: 0.05, // Delay between each card appearing
  CARD_APPEAR_DURATION: 0.4, // Duration of individual card fade-in

  // Fade out animation (when clicking a card)
  FADE_DURATION: 0.3, // Duration of fade out for non-clicked cards
  FADE_OUT_OPACITY: 0, // Target opacity for faded cards
  FADE_OUT_SCALE: 0.95, // Target scale for faded cards

  // Hover animations
  HOVER_SCALE: 1.05, // Scale multiplier on hover
  HOVER_DURATION: 0.2, // Duration of hover animation
  HOVER_SPRING_STIFFNESS: 300, // Spring stiffness for hover

  // Tap animation
  TAP_SCALE: 0.98, // Scale multiplier on tap

  // Navigation timing (in milliseconds)
  NAVIGATION_DELAY_MS: 300, // Wait time before navigating (allows fade animation to start)

  // Back navigation cleanup
  CLEANUP_TIMEOUT_MS: 400, // Wait time before clearing transition state on return
} as const;

export const CARD_DETAIL_ANIMATIONS = {
  // Page transition timing
  TRANSITION_DURATION: 0.4, // Duration of page transition animations
  TRANSITION_DELAY: 0.2, // Delay before starting transition

  // Shared layout transitions
  FORWARD_SPRING_STIFFNESS: 200, // Spring stiffness for forward navigation
  FORWARD_SPRING_DAMPING: 25, // Spring damping for forward navigation
  FORWARD_DURATION: 0.6, // Total duration for forward animation

  BACK_SPRING_STIFFNESS: 200, // Spring stiffness for back navigation
  BACK_SPRING_DAMPING: 25, // Spring damping for back navigation
  BACK_DURATION: 0.4, // Total duration for back animation (faster than forward)

  // Metric cards
  METRICS_STAGGER_DELAY: 0.08, // Delay between each metric card appearing
} as const;

export const SHARED_LAYOUT_ANIMATIONS = {
  // Shared element transition timing (grid ↔ detail)
  DURATION: 0.3, // 300ms based on research docs (Timeless Co, Maxime Heckel)
  SPRING_STIFFNESS: 400, // Snappy spring for smooth expansion/contraction
  SPRING_DAMPING: 30, // Balanced damping prevents bounce

  // Non-selected card fade animations
  FADE_DURATION: 0.2, // Quick fade for non-selected cards
  FADE_OPACITY: 0.3, // Dimmed but visible during transition

  // Animation state cleanup
  CLEANUP_TIMEOUT_MS: 350, // Wait for animation to complete before clearing state (50ms buffer)
} as const;

// Type exports for TypeScript
export type CardGridAnimations = typeof CARD_GRID_ANIMATIONS;
export type CardDetailAnimations = typeof CARD_DETAIL_ANIMATIONS;
export type SharedLayoutAnimations = typeof SHARED_LAYOUT_ANIMATIONS;
