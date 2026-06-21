YoteMarket Web App
===================

This project is a React SPA built with Vite and connected to Firebase.

Quick start:

```powershell
cd web_app
npm install
npm run dev
```

Open the local server URL shown in the terminal.

Build for production:

```powershell
npm run build
```

Preview the production build locally:

```powershell
npm run serve
```

Vercel deployment:

- `vercel` will build the app with `npm run build` and deploy the `dist` folder.
- The `vercel.json` file routes all traffic to `index.html` for SPA navigation.
