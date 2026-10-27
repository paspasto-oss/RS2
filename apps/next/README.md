# RS2 NEXT – etapa 1 (iba oddelený prototyp)

React + TypeScript, nové mobilné menu a samostatný dátový model. Toto nie je náhrada ostrej RS2.

## Čo funguje

- Prehľad dnešných pokusných výjazdov a počty podľa stavu.
- Zákazníci, viac zariadení na zákazníka a história pokusných zásahov.
- Nová a upravovaná zákazka, vyhľadávanie bez diakritiky, stavy a archív dokončených/zrušených zásahov.
- Priebeh zákazky je oddelený od technického hodnotenia; dokončenie nikdy automaticky neznamená vyhovujúce zariadenie.
- Lokálny mesačný kalendár a upozornenie na súbeh termínov rovnakého technika.
- Vlastné servisné tipy označené ako neoverené, žiadne vymyslené návody či zákonné lehoty.
- Samostatné IndexedDB úložisko `rs2-next-sandbox-v1`, kontrola verzií pri súbežných úpravách, export/obnova validovanej JSON zálohy.
- PWA manifest a cache základných statických súborov; aktivácia novej verzie až po zatvorení predchádzajúcich kariet.

## Čo NIE JE zapojené

Firebase ani iný cloud, Google prihlásenie/účty/role, Google Kalendár, e-mail, SMS, push, skutočné PDF/podpisy/QR, staré revízie, produkčné číslovanie a kompletná databáza porúch/predpisov. Nezadávať reálne osobné údaje. Testovacia záloha nie je záloha existujúceho Firebase archívu.

## Izolácia a bezpečnosť

Baseline produkcie: `0846b6ecec61ca975af4253e321d4724da791402`. `index.html`, `rs2-app-v2.html`, `rs2-app.html` sú bez zmeny. `scripts/check-legacy.mjs` kontroluje ich presný obsah.

Vetva je určená len pre preview. Vercel výstup obsahuje výlučne nové `apps/next/dist`, nie starú aplikáciu s produkčnou Firebase konfiguráciou. `scripts/preview-only.mjs` blokuje build pri `VERCEL_ENV=production`. Nezlučovať do main a nepromovať preview, kým nie sú schválené migračné kroky. Samostatný názov cache/IndexedDB, žiadne importovanie starých lokálnych dát, žiadne požiadavky na produkčný backend. CSP povoľuje zdroje iba z vlastného originu.

V prehliadači nie je autorizačná hranica: bezpečné účty patria do ďalšej etapy. Rôzne preview adresy majú rozdielne lokálne úložisko. Údaje sa môžu stratiť pri vymazaní úložiska prehliadača; exportovať testovaciu zálohu.

## Spustenie

Node 22.12 alebo novší. `npm install`, `npm run dev`. Overenie: `npm run build`, `npx playwright install chromium`, `npm run test:e2e`. Build obsahuje typovú kontrolu a jednotkové testy. Priamy backend test zatiaľ neexistuje, pretože backend nie je pripojený.

## Ochrana ostrých dát – povinné pred napojením

1. Zabezpečiť autorizovaný export skutočných správ, príloh a globálnych počítadiel; držať ho mimo verejného GitHub repozitára.
2. Obnoviť export do oddeleného TEST Firebase projektu a porovnať počty, identifikátory, fotografie, podpisy a pôvodné čísla.
3. Preveriť nasadené Firestore Security Rules a nahradiť anonymný prístup konkrétnymi účtami/rolami.
4. Pripraviť migračný adaptér, zachovať originálne správy a až potom porovnať PDF a vykonať pilot.

Tieto produkčné exporty, skúška obnovy a pravidlá databázy neboli v etape prototypu vykonané ani potvrdené. Zdrojový kód je verzovaný; to nie je záloha zákazníckych údajov.

## Technický model

Snapshot v1: `customers`, `devices`, `jobs`, `tips`. Každý identifikátor má prefix `test-` a nikdy nepoužíva produkčné počítadlo. Zariadenie odkazuje na zákazníka, zákazka voliteľne na jeho zariadenie. Import validuje dátumy, enumy, veľkosti, duplicity a referenčnú integritu. Následné vrstvy doplnia oddelené reporty, dokumenty, používateľské členstvo a audit.

## Testovanie tejto zmeny

Jednotkové testy pokrývajú model a formát záloh. Playwright scenáre sú pripravené pre 390×844 a 1365×900: formuláre, ukladanie po reload, rozdelenie stavov, XSS, obnova zálohy, lokálny offline shell a konflikt dvoch kariet. Stav skutočného build/test behu treba overiť v GitHub Actions; samotná existencia testov neznamená úspešný beh.
