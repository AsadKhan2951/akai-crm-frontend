# Vendor portal screenshot findings

Captured at 390×844 CSS pixels with full-page screenshots.

## English catalogue

- The mobile catalogue renders as a single-column flow with the back link, catalogue title, download action, AI search helper, independent category and brand entry points, featured collection, filter form, and product cards.
- CASTA appears as a brand entry and as the brand on both product cards.
- Product cards show primary image, product name, SKU, pack size, PKR price, points, and a large Add to cart action.
- The screenshot surfaced an existing translation/data problem in the preview: the category and brand select placeholders render as `vendorCatalogue.allCategories` and `vendorCatalogue.allBrands` rather than translated labels. This is a real defect to fix before finalizing.

## Urdu catalogue

- The document direction is RTL and the main content is right-aligned; category and brand chips, filter labels, CTA text, and product metadata flow from the right.
- Western Arabic digits and SKU/PKR values remain isolated and readable LTR.
- The screenshot surfaced several translation interpolation/fallback defects in the preview: the page title and some labels combine English namespace keys with Urdu text, and the AI helper renders mixed key fragments. These indicate missing or malformed message keys in the current Vendor catalogue translations and must be fixed before finalizing.
- Product names use Urdu values correctly, but the visible product metadata order and mixed labels need a final translation/catalogue key cleanup.

## English and Urdu checkout

- Both locales render a single-column, phone-sized cart with a localized back control, approval/credit notice, product line, quantity editor, SQL-provided subtotal, points-to-earn value, payment-method fieldset, points input, delivery notes, and a large Place order button.
- English checkout shows Balance and Credit as explicit radio choices and the credit-limit approval notice before submission.
- Urdu checkout mirrors the content to the right and preserves Western Arabic numeric values such as `PKR 1700.00`, `16`, and quantity `2` in isolated LTR runs.
- Both screenshots reveal one remaining translation defect: the secondary quote action renders the literal key `vendorCart.requestQuote` because that key is missing from the `vendorCart` namespace. This must be fixed before finalizing.

## English and Urdu quote flow

- English quote detail shows the quote number, quoted status, validity date, product line with SKU and quantity, quoted PKR amount, and clear Accept and order / Decline actions.
- Urdu quote detail mirrors the line layout to RTL and keeps the quote number, date, quantity, SKU, and PKR amount readable as Western numerals in isolated runs.
- The quote screen remains understandable because familiar business terms such as Quote, offers, Accept and order, and Decline are retained where appropriate.
- The screenshots were captured before the final request-quote translation repair; the English and Urdu checkout screens should be recaptured after the `vendorCart.requestQuote` key is added.

## Checkout recapture after translation repair

The English checkout now renders the secondary action as **Request quote**, and the Urdu checkout renders it as **Quote طلب کریں**. The previous raw `vendorCart.requestQuote` key is gone in both captures. The primary order action, approval notice, payment choices, points field, delivery notes, subtotal, and quantity remain visible and correctly mirrored.

## Final catalogue recapture

The final English capture shows the actual Vendor shell, language switcher, Overview/Profile header, product catalogue title and description, Download catalogue, Share on WhatsApp, AI search, category and brand entry points, featured collection, translated filter placeholders, and product cards. No raw translation namespace keys remain.

The final Urdu capture reports `dir="rtl"` and mirrors the shell and catalogue content. Urdu title/description, Share on WhatsApp, category/brand labels, filter labels, CTA controls, and product names render in the Urdu direction. SKUs, PKR prices, pack sizes, points, and quantities remain Western Arabic/LTR-isolated. The back control is now an icon-based logical control rather than a hardcoded left arrow.

The local preview artwork is intentionally unavailable in the final capture because it is a screenshot-only fixture and was removed from production assets; the production ImageUploader/product image pipeline remains unchanged.
