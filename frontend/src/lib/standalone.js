// Standalone web build (VITE_STANDALONE=1) — the serverless deployment, e.g. Vercel.
//
// Static hosting has no Node backend, so there is nothing to sign in to and nothing to sync
// with: the app goes straight into guest mode and everything lives in this browser's
// localStorage — the same as the mobile build's model, minus the Capacitor shell. Unlike the
// demo build (demo.js) it starts empty instead of with example data, and unlike the mobile
// build it is still a plain web app, so the service worker and "Add to Home Screen" apply.
//
// Vite replaces VITE_STANDALONE at build time, so none of this exists in a self-hosted bundle.
export const STANDALONE = import.meta.env.VITE_STANDALONE === '1'
