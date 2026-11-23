# NG Gas Records

*by NG Plumbing & Heating*

A phone app for Gas Safe registered engineers to fill in **landlord gas safety records (CP12)**, sign them on screen and send them as a PDF. There's no subscription, and everything is saved on the phone.

- **Look**: a navy band with the NG logo at the top of every screen (matching the PDF), number tiles for drafts, checks due soon and records issued this year, and record cards with a coloured status strip. Each record shows a progress bar and folds finished sections away, with a button at the bottom saying what's left. Dark mode uses deep navy; Settings → Appearance can follow the phone or pin Light or Dark.
- **Records**: one per property per year. It holds the property, the landlord or agent, each appliance, the installation checks, and signatures from you and the person receiving it. It saves as you type.
- **Appliances**: location, type, make and model (with a dropdown of common UK boiler makes and ranges, fire, cooker and water heater makes, and the makes and models you've used before, all in `src/data/appliances.ts`); landlord's appliance and inspected; flue type (RS/OF/FL); operating pressure and/or heat input; combustion readings at low fire and high fire (CO ppm, CO₂ % and the CO/CO₂ ratio as your analyser shows it); safety devices, ventilation, flue condition, flue performance, serviced, CO alarm, safe to use; and any defects with their AR/ID classification, warning notice, warning label and remedial action.
- **Issuing**: the app won't issue a record until everything Regulation 36(3) requires is filled in, and it lists anything missing. The PDF is an A4 landscape page laid out like a paper CP12 pad. Drafts are marked DRAFT.
- **Due dates**: 12 months from the check. If you enter last year's due date and the check is up to two months early, the anniversary date is kept (Regulation 36A). The **Due** tab lists overdue and upcoming properties, with **Start next record**, which copies last year's details and appliances, and **Remind landlord**, which prepares a message.
- **Settings**: your name, Gas Safe number, licence number and business details, and your signature. These are added to every new record automatically, and frozen onto each record when it's issued, so changing them later doesn't alter old records. Also record numbering, and backup and restore.
- **Invoices**: an Invoices tab for any job, not just gas safety records. Each invoice has the customer (picked from people you've invoiced or done records for), an optional job address, reference/PO number and notes, the invoice, work and due dates (on receipt, 7, 14 or 30 days), and items with quantity and price, plus one-tap items you've used before. Choose **No VAT, 20%, 5% or 0%** on each invoice and a **discount %** (from 0). VAT is worked out after the discount, and a VAT invoice shows your VAT number, the tax point and the rate per line. **Send invoice** makes an A4 PDF in the same style as the records and opens the share sheet. Mark invoices as sent or paid; the tab shows what you're owed and what's overdue. A finished gas safety record has a **Create invoice** button, which fills in the landlord or agent, the property and the record line at your usual price. Pick the **invoice style** in Settings: **Custom** (navy and orange with your logo, matching the records) or **Classic** (a plain black and white document, like a bank or accountant's invoice, with numbered lines and a date on each). Bank details, VAT number, default VAT, days to pay, a default note and numbering are in Settings too.
- **Reminders** (iPhone app): your phone alerts you 30 and 7 days before each property's next check is due. Tapping the alert opens a ready-written email to the landlord in your own email app, copied to you. Nothing is sent without you pressing Send, and no server is needed.

### What the record is based on

- Gas Safety (Installation and Use) Regulations 1998, regulation 36(3)(c), for what the record must contain, and regulation 26(9), for what the check must examine.
- HSE: [Gas safety check records and what to keep](https://www.hse.gov.uk/gas/landlords/gassaferecord.htm). Electronic records and signatures are acceptable.
- Gas Safe Register technical guidance (*Registered Gas Engineer*, June 2021): tightness test and ECV check recommended, only gas safety defects (AR/ID under IGEM/G/11) go on the record, and the 10–12 month rule for due dates.
- Gas Safe Register Registration Policy (*Work records: a reminder*, April 2023): work records need the appliance make, model and location, positive recording of the essential checks and results, actions on unsafe situations, and the engineer's signature, and must be **kept for at least six years**. The app requires these before issuing and reminds you to back up.

You remain responsible for the checks you carry out and for what each record says. Compare the PDF with the paper or app records you use now before relying on it.

---

## Try it

- **On your phone in a browser:** `https://2vg6cdb48b-create.github.io/chest-rush-site/gas-records/app/`. This works once this folder is merged into the branch your GitHub Pages site publishes from. In Safari, tap Share, then **Add to Home Screen**. Share PDF makes a real PDF on the phone and opens the share sheet (Mail, WhatsApp, Messages, Files). On a computer it downloads instead. Records on the website stay in that browser only.
- **As the real app (Expo Go):** in this folder, run `npm install` then `npx expo start`, and scan the QR code with your iPhone camera (install **Expo Go** first). Sharing the PDF opens the normal iPhone share sheet.

## Publish to the App Store

These are the same steps as for Van Stock (see `../van-stock-app/README.md`), and your Apple Developer membership covers both apps:

```sh
npx eas-cli@latest init
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --latest
```

In App Store Connect:

- **Category:** Business (or Productivity)
- **Support URL:** `https://2vg6cdb48b-create.github.io/chest-rush-site/gas-records/support.html`
- **Privacy Policy URL:** `https://2vg6cdb48b-create.github.io/chest-rush-site/gas-records/privacy.html`
- **App Privacy:** "Data Not Collected"

Check the bundle identifier in `app.json` (`com.nathangentnewbould.gasrecords`) before the first upload.

## Developers

```sh
npm install
npx expo start
npm run typecheck && npm run lint
npm run build:site     # rebuilds ../gas-records/app/ for GitHub Pages
```

| Where | What |
| --- | --- |
| `src/app/(tabs)/` | Records, Invoices, Due and Settings tabs |
| `src/app/invoice/[id].tsx` | Invoice editor (customer, dates, items, discount, VAT, status, send) |
| `src/lib/invoices.ts` | Invoice numbers, totals in pence, VAT and discount, status |
| `src/lib/invoice-html.ts` | The printed invoice (A4 portrait HTML, turned into a PDF) |
| `src/app/record/[id].tsx` | Record editor (dates, property, landlord, installation, signatures, issue and share) |
| `src/app/appliance/[recordId]/[applianceId].tsx` | One appliance's checks |
| `src/lib/records.ts` | Dates and due-date rule, validation, renewals, backups |
| `src/lib/record-html.ts` | The printed record (A4 landscape HTML, turned into a PDF) |
| `src/lib/share-record.ts` | PDF and share sheet (`.web.ts`: printable tab in a browser) |
| `src/components/signature.tsx` | On-screen signature pad |
