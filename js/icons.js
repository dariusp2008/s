/**
 * Small inline-SVG icon set shared by the home category tiles, catalogue
 * filter buttons, and product cards — keeps the markup in one place so the
 * same "molecule" icon always means "Reference Standards", etc.
 * Each entry is a bare <svg> string (no width/height) sized by its
 * container via CSS.
 */
window.NICHECHEMS_ICONS = {
  molecule: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="m9.8 10.2-3-2.7M14.2 10.2l3-2.7M9.8 13.8l-3 2.7M14.2 13.8l3 2.7"/></svg>',
  orbit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 15 0 0 1 0 18a9 15 0 0 1 0-18Z"/><path d="M3 12h18"/></svg>',
  funnel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v9.5a3 3 0 0 0 .9 2.1l3.1 3.1"/><path d="M18 3v9.5a3 3 0 0 1-.9 2.1l-3.1 3.1"/><path d="M4 3h6M14 3h6"/><path d="M10 21h4"/></svg>',
  flask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6v6.4l4.3 9a2 2 0 0 1-1.8 2.6H6.5a2 2 0 0 1-1.8-2.6l4.3-9V2Z"/><path d="M8 15h8"/></svg>',
  droplet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v6.5L6.5 18a3.2 3.2 0 0 0 2.8 4.8h5.4A3.2 3.2 0 0 0 17.5 18L12 8.5"/><path d="M9 15h6"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 4v16"/></svg>'
};
