# Roleta Cheers — Futebol & Padel

Roleta de prémios para a TV do Cheers O Bar (Sports & Cocktail Bar).

- Mesmos prémios e probabilidades da roleta original: 12 fatias iguais, 3× "3 finos", 2× "1 fino", 1× "Régua", 6× "Tenta outra vez" (50% de prémio).
- Qualquer tecla do comando ou clique faz girar. `?som=0` desliga o som.
- Visual realista pré-renderizado em imagens (`public/assets/`) para correr leve em Smart TVs: a TV só mostra imagens e roda uma delas com uma transformação CSS.
- Para regenerar as imagens: `node scripts/render-assets.cjs` (precisa de Playwright/Chromium).

Versões anteriores: branch `desporto-2026` (desporto variado) e `halloween-2026`.
