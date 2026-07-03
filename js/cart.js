/**
 * Shared shopping cart — a plain localStorage-backed line-item list
 * (product id + quantity only; prices/names are always looked up live
 * from window.NicheChemsData so the cart never shows stale info if an
 * admin edits a price or deactivates a product between visits).
 *
 * Used by: catalogue (Add to Cart), product-page (Add to Cart), and the
 * header cart icon/count on every storefront page, plus checkout/
 * index.html for the full line-item review.
 *
 * Every mutating call dispatches a "nichechems:cart-updated" event on
 * window so any page listening (the header badge) can re-render without
 * a full reload.
 */
window.NicheChemsCart = (function () {
  "use strict";

  var STORAGE_KEY = "nichechems_cart";

  function readRaw() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn("NicheChemsCart: couldn't read cart from localStorage.", err);
      return [];
    }
  }

  function writeRaw(items) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.warn("NicheChemsCart: couldn't save cart to localStorage.", err);
    }
    window.dispatchEvent(new CustomEvent("nichechems:cart-updated", { detail: { items: items } }));
  }

  /** @returns {Array<{id: string, quantity: number}>} */
  function getCart() {
    return readRaw();
  }

  /** @returns {number} total item count (sum of quantities), for the header badge */
  function getCartCount() {
    return readRaw().reduce(function (sum, item) { return sum + item.quantity; }, 0);
  }

  /**
   * @param {string} productId
   * @param {number} [quantity=1]
   */
  function addToCart(productId, quantity) {
    var qty = quantity && quantity > 0 ? quantity : 1;
    var items = readRaw();
    var existing = items.filter(function (i) { return i.id === productId; })[0];
    if (existing) {
      existing.quantity += qty;
    } else {
      items.push({ id: productId, quantity: qty });
    }
    writeRaw(items);
  }

  /**
   * Sets a line's quantity to an exact value. Removing the line if the
   * result is zero or less.
   * @param {string} productId
   * @param {number} quantity
   */
  function updateQuantity(productId, quantity) {
    var items = readRaw();
    if (quantity <= 0) {
      items = items.filter(function (i) { return i.id !== productId; });
    } else {
      items.forEach(function (i) { if (i.id === productId) i.quantity = quantity; });
    }
    writeRaw(items);
  }

  /** @param {string} productId */
  function removeFromCart(productId) {
    writeRaw(readRaw().filter(function (i) { return i.id !== productId; }));
  }

  function clearCart() {
    writeRaw([]);
  }

  /**
   * Picks the best applicable quantity-break discount for a given quantity
   * from a product's discountTiers ([{minQty, discountPct}, ...] — admin-
   * defined in the dashboard). Highest minQty that the quantity still
   * meets wins, not just the first match.
   * @param {Array<{minQty: number, discountPct: number}>} tiers
   * @param {number} quantity
   * @returns {{minQty: number, discountPct: number}|null}
   */
  function bestTier(tiers, quantity) {
    if (!Array.isArray(tiers) || tiers.length === 0) return null;
    var best = null;
    tiers.forEach(function (t) {
      var minQty = t.minQty != null ? t.minQty : t.min_qty;
      var discountPct = t.discountPct != null ? t.discountPct : t.discount_pct;
      if (quantity >= minQty && (!best || minQty > best.minQty)) {
        best = { minQty: minQty, discountPct: discountPct };
      }
    });
    return best;
  }

  /**
   * Joins the stored {id, quantity} lines with live product data, drops
   * any line whose product has since been deleted or deactivated, applies
   * quantity-break discounts, and computes line/grand totals. This is what
   * checkout.html renders from.
   * @param {Array<Object>} products - result of NicheChemsData.fetchProducts()
   * @returns {{lines: Array<Object>, subtotal: number, itemCount: number, totalSavings: number}}
   */
  function resolveCart(products) {
    var byId = {};
    products.forEach(function (p) { byId[p.id] = p; });

    var lines = readRaw()
      .map(function (item) {
        var product = byId[item.id];
        if (!product) return null;
        var tier = bestTier(product.discountTiers, item.quantity);
        var discountPct = tier ? tier.discountPct : 0;
        var unitPrice = tier ? product.price * (1 - discountPct / 100) : product.price;
        var lineTotal = unitPrice * item.quantity;
        var originalLineTotal = product.price * item.quantity;
        return {
          product: product,
          quantity: item.quantity,
          unitPrice: unitPrice,
          originalUnitPrice: product.price,
          discountPct: discountPct,
          lineTotal: lineTotal,
          savings: originalLineTotal - lineTotal
        };
      })
      .filter(Boolean);

    var subtotal = lines.reduce(function (sum, l) { return sum + l.lineTotal; }, 0);
    var itemCount = lines.reduce(function (sum, l) { return sum + l.quantity; }, 0);
    var totalSavings = lines.reduce(function (sum, l) { return sum + l.savings; }, 0);

    return { lines: lines, subtotal: subtotal, itemCount: itemCount, totalSavings: totalSavings };
  }

  return {
    getCart: getCart,
    getCartCount: getCartCount,
    addToCart: addToCart,
    updateQuantity: updateQuantity,
    removeFromCart: removeFromCart,
    clearCart: clearCart,
    resolveCart: resolveCart
  };
})();
