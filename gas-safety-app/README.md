# Gas Safety Records

A phone app for Gas Safe registered engineers to fill in **landlord gas safety records (CP12)**, sign them on screen and send them as a PDF. There's no subscription, and everything is saved on the phone.

- **Records**: one per property per year. It holds the property, the landlord or agent, each appliance, the installation checks, and signatures from you and the person receiving it. It saves as you type.
- **Appliances**: location, type, make and model; landlord's appliance and inspected; flue type (RS/OF/FL); operating pressure and/or heat input; CO, CO₂ and the CO/CO₂ ratio (worked out for you); safety devices, ventilation, flue condition, flue performance, serviced, CO alarm, safe to use; and any defects with their AR/ID classification, warning notice, warning label and remedial action.
- **Issuing**: the app won't issue a record until everything Regulation 36(3) requires is filled in, and it lists anything missing. The PDF is an A4 landscape page laid out like a paper CP12 pad. Drafts are marked DRAFT.
- **Due dates**: 12 months from the check. If you enter last year's due date and the check is up to two months early, the anniversary date is kept (Regulation 36A). The **Due** tab lists overdue and upcoming properties, with **Start next record**, which copies last year's details and appliances, and **Remind landlord**, which prepares a message.
- **Settings**: your name, Gas Safe number, licence number and business details, and your signature. These are added to every new record automatically, and frozen onto each record when it's issued, so changing them later doesn't alter old records. Also record numbering, and backup and restore.
- **Reminders** (iPhone app): your phone alerts you 30 and 7 days before each property's next check is due. Tapping the alert opens a ready-written email to the landlord in your own email app, copied to you. Nothing is sent without you pressing Send, and no server is needed.

### What the record is based on

- Gas Safety (Installation and Use) Regulations 1998, regulation 36(3)(c), for what the record must contain, and regulation 26(9), for what the check must examine.
- HSE: [Gas safety check records and what to keep](https://www.hse.gov.uk/gas/landlords/gassaferecord.htm). Electronic records and signatures are acceptable.
- Gas Safe Register technical guidance (*Registered Gas Engineer*, June 2021): tightness test and ECV check recommended, only gas safety defects (AR/ID under IGEM/G/11) go on the record, and the 10–12 month rule for due dates.
- Gas Safe Register Registration Policy (*Work records: a reminder*, April 2023): work records need the appliance make, model and location, positive recording of the essential checks and results, actions on unsafe situations, and the engineer's signature, and must be **kept for at least six years**. The app requires these before issuing and reminds you to back up.

You remain responsible for the checks you carry out and for what each record says. Compare the PDF with the paper or app records you use now before relying on it.

---

## Try it

- **On your phone in a browser:** `https://2vg6cdb48b-create.github.io/chest-rush-site/gas-records/app/`. This works once this folder is merged into the branch your GitHub Pages site publishes from. In Safari, tap Share, then **Add to Home Screen**. The PDF opens in a new tab: tap Share, then Print, or use "Print or save as PDF". Records on the website stay in that browser only.
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
| `src/app/(tabs)/` | Records, Due and Settings tabs |
| `src/app/record/[id].tsx` | Record editor (dates, property, landlord, installation, signatures, issue and share) |
| `src/app/appliance/[recordId]/[applianceId].tsx` | One appliance's checks |
| `src/lib/records.ts` | Dates and due-date rule, validation, renewals, backups |
| `src/lib/record-html.ts` | The printed record (A4 landscape HTML, turned into a PDF) |
| `src/lib/share-record.ts` | PDF and share sheet (`.web.ts`: printable tab in a browser) |
| `src/components/signature.tsx` | On-screen signature pad |
