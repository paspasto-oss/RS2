# Spektra Servis · 0.1.0

Samostatná prvá verzia servisnej aplikácie pre **jedného technika Spektra Install**.
Vychádza z dohodnutého pracovného postupu a inšpirácie Foxii, nie z jeho zdrojového kódu alebo grafických materiálov.

**Stav:** funkčný lokálny pilot. Online nasadenie, Google OAuth, automatická synchronizácia a prístup k pôvodnému archívu RS2 nie sú aktivované. Pôvodnú RS2 táto aplikácia nemení.

## Spustenie

Distribučný ZIP obsahuje hotové `dist/` a `Spektra-Servis.html`. V zdrojovej vetve GitHub sa tieto súbory vytvoria príkazom `npm run build`.

### Najrýchlejšie vyskúšanie

Otvorte `Spektra-Servis.html` v aktuálnom Chrome alebo Edge na počítači. V Nastaveniach možno zapnúť **oddelenú ukážku** s výslovne fiktívnymi záznamami. Skutočný pracovný priestor začína prázdny.

Samostatný HTML súbor slúži hlavne na vyskúšanie. Práca zo súboru závisí od podpory miestneho úložiska prehliadača a nepovoľuje inštaláciu PWA. Pri probléme použite lokálny server nižšie. Na mobile je najvhodnejšia následná HTTPS verzia.

### Lokálny server bez sťahovania knižníc

Balík obsahuje hotový adresár `dist/`. Potrebujete Node.js 20 alebo novší. V rozbalenom adresári spustite:

```sh
node tools/serve.cjs
```

Potom otvorte `http://127.0.0.1:4173`. Na Windows je priložený `SPUSTIT-WINDOWS.cmd`.

Port a adresu pri reálnom používaní nemeňte bez zálohy. Rôzne adresy, porty, prehliadače a zariadenia majú **odlišné miestne údaje**. Pri prechode na online adresu najprv exportujte zálohu a na novej adrese ju importujte.

### Vývoj zo zdrojových súborov

```sh
npm install
npm test
npm start
```

Jediná vývojová závislosť je TypeScript 5.8.3. Aplikácia pri bežnom spustení nevyužíva externé JavaScript knižnice, CDN, platenú mapu, analytiku ani AI API. Kód je rozdelený na doménu, úložisko, zálohy, kalendárové exporty a jednotlivé moduly rozhrania. `npm run build` vytvorí `dist/` a samostatný HTML súbor.

## Čo je funkčné

| Modul | Obsah verzie 0.1 |
|---|---|
| Prehľad | Dnešné zákazky, otvorená práca, čakanie na diel, blížiace sa a zmeškané termíny servisu |
| Zákazníci | Vytvorenie a úprava kontaktu, archivácia a obnovenie, zobrazenie histórie |
| Zariadenia | Väzba na zákazníka, model, výrobné číslo, umiestnenie, ručne určený ďalší servis |
| Zákazky | Servis, revízia, obhliadka a montáž; termín, trvanie, popis problému a riešenia |
| Kalendár | Mesiac, týždeň, denná agenda, kontrola prekryvov, ručný prenos do Google a export ICS |
| Poradňa | Vlastné poruchové kódy, rady a poznámky k predpisom; model, zdroj, dátum a stav overenia |
| Nastavenia | Profil technika, lokálny stav, export a obnova zálohy, oddelená ukážka |

Priebeh zákazky, technický výsledok a úhrada sú **samostatné polia**. Dokončenie práce neoznačí zariadenie automaticky za vyhovujúce ani zákazku za uhradenú.

Čísla `S-ROK-0001` sú interné čísla zákaziek; nejde o čísla revíznych správ z RS2. V tomto pilote sa právne revízne správy nevystavujú.

## Dáta a zálohy — dôležité

Údaje sú v **IndexedDB tohto prehliadača**, nie v cloude. Označenie „Uložené v zariadení“ neznamená online zálohu. Vymazanie údajov prehliadača, strata zariadenia či súkromný režim môžu viesť k strate záznamov.

Po každom pracovnom dni exportujte zálohu v Nastaveniach a overte, že sa súbor stiahol. Odporúčaná je záloha s heslom aspoň 10 znakov. Šifrovaná záloha používa AES-GCM a PBKDF2-SHA256; bez hesla sa exportujú čitateľné osobné údaje. Zabudnuté heslo k zálohe nemožno obnoviť.

**Miestna databáza samotná nie je touto aplikáciou šifrovaná ani chránená prihlasovaním.** Používajte vlastné uzamknuté zariadenie a samostatný profil prehliadača. Heslo k zálohe nie je PIN aplikácie.

Import najprv overí formát, väzby a obsah a vypýta si potvrdenie. Nahrádza celý aktuálny pracovný priestor, nie jednotlivé záznamy. Pred importom si ponechajte samostatnú aktuálnu zálohu. Ukážka a skutočné údaje sú oddelené; pri importovaní skontrolujte zvolený priestor.

Súbežný zápis z inej karty sa odmietne namiesto tichého prepísania. Pri konflikte uchovajte rozpracovaný text, obnovte stránku a zmenu zopakujte.

## Google Kalendár a upozornenia

Tlačidlo Google otvorí predvyplnený návrh udalosti. **Uloženie a pripomienku potvrdzujete v Google.** Prenáša sa názov, termín, adresa a popis problému; pred použitím skontrolujte cieľový Google účet a zdieľanie kalendára.

Export `.ics` obsahuje udalosti a návrh upozornenia 60 minút vopred. Cieľový kalendár môže nastavenie upozornenia spracovať odlišne. Opakovaný import môže vytvoriť duplicity. Zmeny a zrušenia v RS2/Spektra Servis sa **nesynchronizujú** s už uloženým Google termínom.

Aplikácia sama neposiela SMS, e-maily ani upozornenia pri zatvorenom okne. Google prihlásenie v ChatGPT nie je automaticky OAuth oprávnením tejto aplikácie.

Časy sú spracované v `Europe/Bratislava`, uložené v UTC. Neexistujúci jarný alebo nejednoznačný jesenný čas sa odmietne a formulár vyžiada iný čas. Žiadny termín sa automaticky nepridáva do používateľovho kalendára.

## Odborná poradňa

Nové záznamy sú predvolene pracovné návrhy. Overené riešenie vyžaduje konkrétny model a dátum overenia; podklad výrobcu aj HTTPS odkaz. Zadanie týchto údajov nenahrádza odbornú kontrolu obsahu.

Nie sú predvyplnené vymyslené poruchové postupy, merania ani univerzálne zákonné intervaly. V kategórii Predpisy je odkaz na vyhlášku 508/2009 Z. z. na Slov-Lexe. Úplnú overenú databázu plynových skupín a účinných ustanovení treba ešte doplniť. Celé licencované technické normy sa do projektu nekopírujú.

## Online prevádzka bez aktivácie plateného režimu

Pripravený `firebase.json` nasadzuje **iba statický Firebase Hosting** z `dist/`. Neobsahuje Firebase projekt, kľúče, Firestore pravidlá ani funkcie. Nový projekt musí zostať na pláne **Spark** a oddelený od existujúcej RS2. Nepoužívajte automaticky projekt `rs2-spektra`.

Pred nasadením sa overí konkrétny nový projekt a jeho plán. Neprepojujte fakturačný účet, neaktivujte Blaze, Cloud Functions, App Hosting, Cloud Storage ani platené SMS. Žiadne z toho nie je pre túto verziu potrebné. Ani po nasadení statického webu sa údaje nezačnú automaticky ukladať do cloudu.

Spark má kvóty; bezplatnosť neznamená neobmedzený hosting alebo garanciu dostupnosti. Hostované statické súbory nie sú to isté ako úložisko zákazníckych fotografií. Cloud Storage for Firebase už vyžaduje Blaze, preto ho tento pilot nepoužíva.

Po pripojení Firebase možno vykonať samostatné nasadenie, test skutočného úložiska a PWA na vašom telefóne. Pri manuálnom nasadzovaní použite Firebase CLI s explicitne overeným ID **nového** Spark projektu a výhradne `--only hosting`; nepridávajte billing ani nepoužívajte starý projekt ako predvolený.

## Overenie

Automatizované testy overujú doménové dáta, väzby, číslovanie, časové pásmo, prekryvy, kalendárové exporty, vstupy a zálohy. UI kontrola prebehla v Chromium pri 320/390/768/1440 px.

**Hranice testov:** UI test používa pamäťovú náhradu IndexedDB v obmedzenom testovacom prehliadači. Skutočné pretrvanie údajov po reštarte, nainštalovaná PWA, service worker, fyzický telefón, online nasadenie a skutočné Google prepojenie zatiaľ neboli end-to-end overené. Výsledky sú v `docs/test-results.json`. Nepovažujte pilot za overenú náhradu ostrého archívu.

## Podklady a ďalšie moduly

Pozrite `docs/ROADMAP.md`. Oficiálne podklady kontrolované pri príprave 16. 10. 2026:

- https://foxii.sk/funkcionalita
- https://firebase.google.com/pricing
- https://firebase.google.com/docs/hosting/usage-quotas-pricing
- https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
- https://www.slov-lex.sk/ezbierky/pravne-predpisy/SK/ZZ/2009/508/

Tieto zdroje nie sú súčasťou zdrojového kódu aplikácie. Cenníky a pravidlá služieb sa môžu zmeniť; pred zapnutím ďalšej služby sa znovu overia.
