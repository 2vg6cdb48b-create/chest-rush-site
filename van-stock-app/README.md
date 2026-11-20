# Van Stock

An iPhone app for keeping track of the stock in your van.

- **Stock**: every item with − / + buttons, search, a filter by van location and a "Low" filter. You can add example items to try it out.
- **Barcode scanning**: point the camera at a barcode. A barcode you've already saved opens that item. A new one is looked up in free product databases (Open Food Facts, Open Products Facts and, in the app only, UPCitemdb), which fill in the name, picture, brand and size. Supermarket-type goods are usually found; trade parts often aren't, so type those in once and later scans find them.
- **Restock**: everything at or below its restock level, with how many to get. You can share the list by text, WhatsApp or email, and mark items as restocked.
- **History**: a log of everything used, added and restocked, plus a "Used today" total.
- **More**: export to a spreadsheet (CSV), back up and restore (for example when you get a new phone), and links to support and the privacy policy.

All data stays on the phone. There are no accounts, servers or tracking.

Built with [Expo](https://expo.dev) (React Native), so you **don't need a Mac** to build it or put it on the App Store.

---

## 1. Try it on your iPhone (about 10 minutes, free)

You need a computer (Windows or Mac) with [Node.js](https://nodejs.org) (the LTS version) installed.

1. On your iPhone, install **Expo Go** from the App Store.
2. On the computer, download this repository, open a terminal in the `van-stock-app` folder and run:
   ```sh
   npm install
   npx expo start
   ```
3. A QR code appears. Scan it with the iPhone **Camera** app and it opens in Expo Go.

The phone and computer need to be on the same Wi-Fi. If they can't connect, run `npx expo start --tunnel` instead.

Any change you save on the computer shows up on the phone straight away.

## 1b. Try it in a phone browser

The website version lives at `https://2vg6cdb48b-create.github.io/chest-rush-site/van-stock/app/` once this branch is merged into the branch your GitHub Pages site publishes from. Open it in Safari on your iPhone. The live barcode scanner and the product lookup both work there. To add it to your home screen, tap Share, then **Add to Home Screen**.

Saved stock on the website stays in that browser only; it isn't shared with the app.

To rebuild the website copy after changing the app, run `npm run build:site` and commit the `van-stock/app/` folder.

## 2. Publish to the App Store

### What you need

- An **Apple Developer Program** membership (£79 / $99 a year): <https://developer.apple.com/programs/>. If you published Chest Rush, you already have one.
- A free **Expo account**: <https://expo.dev/signup>.

### One-time setup

1. Check the **bundle identifier** in `app.json` (`ios.bundleIdentifier`, currently `com.nathangentnewbould.vanstock`). It must be unique on the App Store, and you can't change it after the first upload.
2. Log in to Expo from the `van-stock-app` folder:
   ```sh
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```

### Build and upload

```sh
npx eas-cli@latest build --platform ios --profile production
```

- When asked, log in with your Apple ID and let Expo **create the certificates and provisioning profile for you** (say yes to everything).
- The build runs in Expo's cloud (about 15–30 minutes), so you don't need a Mac.

When the build finishes, send it to App Store Connect:

```sh
npx eas-cli@latest submit --platform ios --latest
```

It will offer to create the app record in App Store Connect for you.

### Finish in App Store Connect (<https://appstoreconnect.apple.com>)

1. Wait for the build to finish processing (you'll get an email). You can test it first with **TestFlight**.
2. Fill in the app page:
   - **Name:** Van Stock (if it's taken, try something like "Van Stock – Parts Tracker")
   - **Category:** Business (or Productivity)
   - **Support URL:** `https://2vg6cdb48b-create.github.io/chest-rush-site/van-stock/support.html`
   - **Privacy Policy URL:** `https://2vg6cdb48b-create.github.io/chest-rush-site/van-stock/privacy.html`
   - **App Privacy:** choose **"Data Not Collected"**
   - **Age rating:** answer "No" to everything (this gives 4+)
   - **Screenshots:** 6.9" iPhone screenshots are required. Take them on your phone in TestFlight (side button + volume up).
3. Pick the build, then **Submit for Review**. Review usually takes 1–3 days.

> If your GitHub Pages site lives at a different address, update the two URLs above and `src/constants/links.ts`.

### Releasing an update

Change `version` in `app.json` (for example to `1.0.1`), then run the same `build` and `submit` commands again. The build number goes up automatically.

---

## For developers

```sh
npm install
npx expo start         # dev server (press i for iOS simulator on a Mac, w for web)
npm run typecheck
npm run lint
npx expo-doctor        # check dependencies and config
```

| Where | What |
| --- | --- |
| `src/app/(tabs)/` | The four tabs: `index` (Stock), `restock`, `history`, `more` |
| `src/app/item/[id].tsx` | Add/edit item (`id = "new"` for a new item) |
| `src/lib/store.tsx` | App state, saved with AsyncStorage |
| `src/lib/stock.ts` | Stock logic: low/out status, CSV, restock text, backup parsing |
| `src/components/` | Shared UI, barcode scanner and tab bar (`.web.tsx` is used only in the browser preview) |
