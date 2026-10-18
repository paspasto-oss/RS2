# Moduly Spektra Servis

Rozsah: jeden technik, postupné zavádzanie, bez aktivácie platených plánov. Pôvodná RS2 a jej dáta zostávajú mimo pilotu.

## M01 · Základ a lokálne dáta — implementované v pilote

- Modulárny TypeScript a responzívna navigácia.
- Prázdny reálny priestor a oddelená voliteľná ukážka.
- IndexedDB, validácia vstupov a transakčné odmietnutie zastaraného zápisu.
- Profil technika, export a potvrdená obnova zálohy, voliteľné šifrovanie zálohy.
- Manifest a generovaný service worker pripravené; reálne PWA overenie je otvorené.

## M02 · Zákazníci a zariadenia — implementované v pilote

- Zákazník má viac zariadení, zariadenie vlastnú servisnú históriu.
- Editácia, archivácia/obnovenie, referenčná integrita.
- Termín ďalšieho servisu zadáva technik; neodvodzuje sa automaticky zákonná lehota.
- Neskôr: samostatné objekty/adresy a bezpečný import existujúcich kontaktov bez duplicít.

## M03 · Zákazky — implementované v pilote

- Servis/revízia/obhliadka/montáž, pridelené jedinému technikovi.
- Pracovný stav oddelený od technického výsledku a platby.
- Termín, trvanie, popis chyby, vykonaného riešenia a interné číslo.
- História, filtre a vyhľadávanie bez diakritiky.
- Neskôr: reálny podpis, prílohy a verzie dokumentov; nič z toho nie je v pilote označené za hotové.

## M04 · Kalendár — lokálna časť implementovaná

- Týždeň/mesiac/agenda, prekryvy jedného technika, Europe/Bratislava.
- Ručná Google šablóna a export ICS. Nie synchronizácia.
- Ďalší krok: oprávnenia Google pre konkrétny účet, čítanie vybraného kalendára a explicitne potvrdené zápisy. Žiadne úpravy cudzích udalostí.
- Plná obojsmerná synchronizácia až po návrhu správy tokenov, konfliktov, zrušení a limitov. Aktuálny pilot nemá serverovú časť ani oprávnenia Google.

## M05 · Poradňa — vlastné záznamy implementované

- Kódy porúch, príznaky, konkrétna značka/model, riešenie, zdroj a dátum.
- Návrh / overené v praxi / podklad výrobcu; prechod zo zákazky.
- Predpisy zatiaľ len vlastné poznámky a odkaz na účinný predpis; bez automatického právneho zaradenia.
- Ďalší krok: schválené karty plynových skupín s presnými podmienkami a zdrojmi. Nemenia spätne historické dokumenty.

## M06 · Prepojenie RS2 — nezačaté

Najprv export a skúška obnovy existujúceho archívu. Import musí zachovať pôvodné identifikátory, čísla a prílohy. Porovnať PDF, podpisy a historické údaje. Žiadny automatický zápis do pôvodného cloudu. Nový pilot zatiaľ nie je revíznym formulárom RS2.

## M07 · Online adresa / záloha — pripravená konfigurácia, nenasadené

Nový Firebase Spark projekt, iba statický Hosting. Hosting nezálohuje miestne zákaznícke dáta. Skutočná cloudová synchronizácia by bola samostatný modul s autentifikáciou, vlastníctvom záznamov a pravidlami prístupu. Bez anonymne zdieľanej databázy, bez zmeny billing plánu.

## Prijímacie podmienky pred ostrými údajmi

1. Skutočný Chrome/Edge a mobil: vytvoriť záznam, reštartovať prehliadač a obnoviť ho.
2. Exportovať šifrovanú zálohu, obnoviť na inom testovacom zariadení a porovnať dáta.
3. Overiť zamietnutie zastaraného zápisu z druhej karty a zachovanie formulára.
4. Po HTTPS nasadení: inštalácia PWA, načítanie bez siete, zachovanie údajov pri aktualizácii.
5. Google: samostatne potvrdiť ručne prenesený termín a doručenie pripomienky na používanom telefóne.
6. Pred migráciou RS2: potvrdená záloha, test obnovy a prechodový plán. Pilot nesmie prepísať ostré dáta.
