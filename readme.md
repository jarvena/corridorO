# Corridor-O

Verkkosovellus nopeaan ja yksinkertaiseen [väyläsuunnistusratojen](https://taitoa.suunnistusliitto.fi/taitoharjoituspankki/pitk%C3%A4-matka/ennakointi-havainnointi/ennakointi-havainnointi-v%C3%A4yl%C3%A4) piirtoon ja valmiin kartan pdf-vientiin.  
[Sovellus toiminnassa](https://jarvena.github.io/corridorO/).

## Työlista

- PDF tuontimahdollisuus
- Väylän leveyden valinta
- Alueiden piirto
- Työnkulun selkeyttäminen: Aluerajaus - Suunnittelu - Tulostus
- Pohjoisviivat
- Työkalun ohjeet
    - shift+veto "maalaukseen"
- Ulkoreunojen korostus piirron avuksi?
- Taustan läpinäkyvyyden valinta?

## Kehityksen aloittaminen

1. Asenna [Node.js](https://nodejs.org/en) ja [git](https://git-scm.com/)
2. Kloonaa repositorin koodi `git clone`
3. Siirry hakemistoon (`cd corridorO`) ja asenna kirjastot (`npm install`)
4. Käynnistä kehitysversio (`npm run dev`)

### OpenLayers + Vite

Projekti on alustettu käyttäen projektipohjaa. Alla olevat tiedot ja esimerkit kuvaavat projektipohjaa ja sen käyttöä:

This example demonstrates how the `ol` package can be used with [Vite](https://vitejs.dev/).

To get started, run the following (requires Node 14+):

    npx create-ol-app my-app --template vite

Then change into your new `my-app` directory and start a development server (available at http://localhost:5173):

    cd my-app
    npm start

To generate a build ready for production:

    npm run build

Then deploy the contents of the `dist` directory to your server.  You can also run `npm run serve` to serve the results of the `dist` directory for preview.


