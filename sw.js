// Versione "semplice": nessuna cache, ogni richiesta va sempre a prendere
// l'ultima versione dei file. Comodo mentre l'app è ancora in sviluppo:
// niente più bisogno di svuotare la cache dopo ogni aggiornamento.
// (Il funzionamento offline si potrà riattivare più avanti, a sviluppo concluso.)

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
