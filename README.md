# Biodentic — Dental Supplies Website

Static prototype website for **Biodentic** (Fanar, Beirut, Lebanon), a dental equipment and consumables supplier.

## Structure

- `index.html` — Home page
- `produits.html` — Full product catalog (159 products across 8 categories, filterable)
- `a-propos.html` — About page
- `contact.html` — Contact page (form, map, FAQ)
- `css/style.css` — Site styles
- `js/main.js` — Interactions (mobile nav, FAQ accordion, catalog filters)
- `assets/` — Logo (SVG) and product images, organized by category

## Notes

- No backend / database — fully static HTML/CSS/JS.
- Product prices are intentionally not displayed; every product links to a "Request a Quote" flow.
- Product photos were sourced from manufacturer/supplier websites during research and should be reviewed for licensing before final public launch.
- To preview locally: serve the folder with any static server, e.g. `npx serve .`
