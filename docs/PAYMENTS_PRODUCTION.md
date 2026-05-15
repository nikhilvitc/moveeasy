# MovEazy — production payments checklist

## Products and amounts

| SKU | Price | Checkout URL |
|-----|-------|----------------|
| `flat-search` | ₹1,499 | `/checkout?sku=flat-search` |
| `deposit-saver` / `guarantee` | ₹1,999 | `/checkout?sku=deposit-saver` |

Legacy `personalized-match` redirects to **flat-search** in code.

## Razorpay Dashboard (browser — assign to ops)

1. Switch to **Live mode**.
2. Create **Payment Pages** (or payment links) per product with exact amounts.
3. Copy links into GitHub Secrets / `.env.production`:
   - `VITE_RAZORPAY_PAYMENT_LINK` (default)
   - `VITE_RAZORPAY_PAYMENT_LINK_FLAT`
   - `VITE_RAZORPAY_PAYMENT_LINK_DEPOSIT`
4. Never commit personal UPI VPAs. Optional business UPI: `VITE_BUSINESS_UPI_VPA`.

## After payment (current flow)

Customer pays on Razorpay → shares receipt on WhatsApp (`VITE_WHATSAPP_ORDER_E164`) → ops confirms manually.

Optional later: Razorpay webhook → Firestore `orders` (requires Cloud Function secrets).

## Verify live

```bat
set PLAYWRIGHT_BASE_URL=https://moveasy-30eed.web.app/
npm run e2e -- e2e/smoke.production.spec.js
```
