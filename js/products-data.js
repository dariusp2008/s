/**
 * Shared catalogue data.
 *
 * This is a static stand-in for what will eventually be served from the
 * admin dashboard's SQL-backed product/category tables (see /admin/products
 * in the sitemap). Every page that shows products or categories (home,
 * catalogue, product-page) reads from these two arrays instead of hard-
 * coding markup, so:
 *
 *   1. Adding/removing a product or category only requires editing this
 *      file in one place.
 *   2. When the real backend exists, this file can be deleted and swapped
 *      for a `fetch('/api/products')` / `fetch('/api/categories')` call
 *      that returns the same shape — the rendering code in each page
 *      doesn't need to change.
 *
 * `active` mirrors the admin dashboard's future "toggle product visibility"
 * feature: inactive products are kept in the data but filtered out of the
 * storefront by the rendering code.
 */

window.NICHECHEMS_CATEGORIES = [
  {
    id: "reference-standards",
    label: "Reference Standards",
    description: "Certified single-analyte standards for calibration and QC.",
    icon: "molecule"
  },
  {
    id: "isotope-labeled",
    label: "Isotope-Labeled Standards",
    description: "Stable-isotope internal standards for LC-MS/MS and GC-MS workflows.",
    icon: "orbit"
  },
  {
    id: "chromatography",
    label: "Chromatography Standards",
    description: "Multi-component mixes for HPLC and GC method validation.",
    icon: "funnel"
  },
  {
    id: "buffers",
    label: "Buffers & Calibration",
    description: "Traceable pH and conductivity calibration solutions.",
    icon: "flask"
  },
  {
    id: "solvents",
    label: "Solvents & Reagents",
    description: "High-purity anhydrous solvents for sample prep and extraction.",
    icon: "droplet"
  },
  {
    id: "forensic",
    label: "Forensic Reference Panels",
    description: "Multi-analyte panels for forensic toxicology screening.",
    icon: "grid"
  }
];

window.NICHECHEMS_PRODUCTS = [
  { id: "nc-1042", sku: "NC-1042", category: "reference-standards", name: "Certified Reference Standard — Series A", purity: "≥99.5%", format: "1 mL ampoule", price: 184, priceUnit: "unit", stock: "in-stock", active: true },
  { id: "nc-1043", sku: "NC-1043", category: "reference-standards", name: "Certified Reference Standard — Series B", purity: "≥99.3%", format: "1 mL ampoule", price: 179, priceUnit: "unit", stock: "in-stock", active: true },
  { id: "nc-2078", sku: "NC-2078", category: "isotope-labeled", name: "Isotope-Labeled Internal Standard, D6", purity: "≥99% (isotopic)", format: "5 mg vial", price: 310, priceUnit: "unit", stock: "in-stock", active: true },
  { id: "nc-2091", sku: "NC-2091", category: "isotope-labeled", name: "Isotope-Labeled Internal Standard, C13", purity: "≥99% (isotopic)", format: "5 mg vial", price: 328, priceUnit: "unit", stock: "low-stock", active: true },
  { id: "nc-3311", sku: "NC-3311", category: "chromatography", name: "HPLC-Grade Chromatography Standard Mix", purity: "≥99% per component", format: "10 × 1 mL set", price: 465, priceUnit: "set", stock: "in-stock", active: true },
  { id: "nc-3325", sku: "NC-3325", category: "chromatography", name: "GC-Grade Chromatography Standard Mix", purity: "≥99% per component", format: "8 × 1 mL set", price: 410, priceUnit: "set", stock: "in-stock", active: true },
  { id: "nc-4460", sku: "NC-4460", category: "buffers", name: "Buffered Calibration Solution, pH 7.00", purity: "±0.01 pH", format: "500 mL bottle", price: 58, priceUnit: "unit", stock: "in-stock", active: true },
  { id: "nc-4461", sku: "NC-4461", category: "buffers", name: "Buffered Calibration Solution, pH 4.01", purity: "±0.01 pH", format: "500 mL bottle", price: 58, priceUnit: "unit", stock: "in-stock", active: true },
  { id: "nc-5127", sku: "NC-5127", category: "solvents", name: "High-Purity Anhydrous Solvent Reagent", purity: "≥99.9%", format: "1 L amber bottle", price: 97, priceUnit: "unit", stock: "low-stock", active: true },
  { id: "nc-6084", sku: "NC-6084", category: "forensic", name: "Forensic Toxicology Reference Panel", purity: "≥98% per analyte", format: "12-analyte panel", price: 720, priceUnit: "panel", stock: "in-stock", active: true }
];
