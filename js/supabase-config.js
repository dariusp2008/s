/**
 * Supabase project connection.
 *
 * This key is the "publishable" (anon) key — it is meant to be exposed
 * in client-side code and is safe to commit. It can only ever do what
 * the Row-Level Security policies in supabase/schema.sql allow (public
 * read on categories/products, no writes without an authenticated user
 * listed in admin_users). Never put a Supabase *service role* / secret
 * key here or in any file served to the browser.
 *
 * Loaded before js/products-service.js on every page that needs data:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="/js/supabase-config.js"></script>
 *   <script src="/js/products-service.js"></script>
 */
window.NICHECHEMS_SUPABASE_URL = "https://epsugnpzencofhzikisx.supabase.co";
window.NICHECHEMS_SUPABASE_ANON_KEY = "sb_publishable_bFGQiRVLMakPNJKkUFgJkA_fMzn1sSO";

window.supabaseClient = (function () {
  if (typeof supabase === "undefined") {
    // The CDN script didn't load (offline, blocked, CDN outage) — every
    // page falls back to js/products-data.js in that case. See
    // js/products-service.js for the fallback logic.
    return null;
  }
  return supabase.createClient(window.NICHECHEMS_SUPABASE_URL, window.NICHECHEMS_SUPABASE_ANON_KEY);
})();
