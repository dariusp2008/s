/**
 * Shared data access for the storefront (home, catalogue, product-page).
 *
 * Every page calls into window.NicheChemsData instead of reading
 * window.NICHECHEMS_PRODUCTS / NICHECHEMS_CATEGORIES directly. Each
 * function tries Supabase first and falls back to the static seed data
 * in js/products-data.js if Supabase is unreachable or misconfigured —
 * the storefront should never show a blank page just because a network
 * request failed.
 *
 * The admin dashboard (admin/dashboard/index.html) talks to Supabase
 * directly for writes (insert/update/delete) since those always require
 * an authenticated admin session; only the read helpers here need the
 * fallback behavior.
 *
 * Load order on every page that needs this:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="/js/supabase-config.js"></script>
 *   <script src="/js/products-data.js"></script>   (fallback dataset)
 *   <script src="/js/products-service.js"></script>
 */
window.NicheChemsData = (function () {
  "use strict";

  /** Normalizes a Supabase `products` row into the same shape the rest
   *  of the site already expects (matches js/products-data.js field
   *  names, so catalogue.html's existing render code needs no changes). */
  function normalizeProduct(row) {
    return {
      id: row.id,
      sku: row.sku,
      category: row.category_id,
      name: row.name,
      description: row.description || "",
      purity: row.purity || "",
      format: row.format || "",
      price: row.price,
      priceUnit: row.price_unit || "unit",
      stock: row.stock_status || "in-stock",
      active: row.active !== false,
      casNumber: row.cas_number || "Available on Certificate of Analysis",
      molecularFormula: row.molecular_formula || "See Certificate of Analysis",
      storageConditions: row.storage_conditions || "See Safety Data Sheet for storage requirements.",
      hazardInfo: row.hazard_info || "For laboratory research use only. See Safety Data Sheet for full hazard classification.",
      coaUrl: row.coa_url || null,
      sdsUrl: row.sds_url || null,
      imageUrl: row.image_url || null
    };
  }

  function normalizeCategory(row) {
    return {
      id: row.id,
      label: row.label,
      description: row.description || "",
      icon: row.icon || "flask"
    };
  }

  /** Static fallback: js/products-data.js already matches the shape
   *  fetchProducts()/fetchCategories() promise, minus the product-page-
   *  only fields — those get sensible defaults so product-page.html
   *  still renders something reasonable if Supabase is unreachable. */
  function fallbackProducts() {
    return (window.NICHECHEMS_PRODUCTS || []).map(function (p) {
      return Object.assign({
        description: "",
        casNumber: "Available on Certificate of Analysis",
        molecularFormula: "See Certificate of Analysis",
        storageConditions: "See Safety Data Sheet for storage requirements.",
        hazardInfo: "For laboratory research use only. See Safety Data Sheet for full hazard classification.",
        coaUrl: null,
        sdsUrl: null,
        imageUrl: null
      }, p);
    });
  }

  function fallbackCategories() {
    return window.NICHECHEMS_CATEGORIES || [];
  }

  /**
   * @param {{includeInactive?: boolean}} [options]
   * @returns {Promise<Array>}
   */
  async function fetchProducts(options) {
    var includeInactive = (options && options.includeInactive) || false;

    if (window.supabaseClient) {
      try {
        var query = window.supabaseClient.from("products").select("*").order("name");
        if (!includeInactive) query = query.eq("active", true);
        var result = await query;
        if (result.error) throw result.error;
        return result.data.map(normalizeProduct);
      } catch (err) {
        console.warn("NicheChemsData: Supabase product fetch failed, using static fallback.", err);
      }
    }

    var fallback = fallbackProducts();
    return includeInactive ? fallback : fallback.filter(function (p) { return p.active; });
  }

  /** @returns {Promise<Array>} */
  async function fetchCategories() {
    if (window.supabaseClient) {
      try {
        var result = await window.supabaseClient.from("categories").select("*").order("sort_order");
        if (result.error) throw result.error;
        return result.data.map(normalizeCategory);
      } catch (err) {
        console.warn("NicheChemsData: Supabase category fetch failed, using static fallback.", err);
      }
    }
    return fallbackCategories();
  }

  /**
   * Active products only — matches the "toggle product visibility"
   * behavior described in the admin dashboard spec (an inactive product
   * shouldn't be reachable by direct link either).
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async function fetchProductById(id) {
    if (window.supabaseClient) {
      try {
        var result = await window.supabaseClient
          .from("products")
          .select("*")
          .eq("id", id)
          .eq("active", true)
          .maybeSingle();
        if (result.error) throw result.error;
        return result.data ? normalizeProduct(result.data) : null;
      } catch (err) {
        console.warn("NicheChemsData: Supabase product-by-id fetch failed, using static fallback.", err);
      }
    }
    var match = fallbackProducts().filter(function (p) { return p.id === id && p.active; })[0];
    return match || null;
  }

  return {
    fetchProducts: fetchProducts,
    fetchCategories: fetchCategories,
    fetchProductById: fetchProductById
  };
})();
