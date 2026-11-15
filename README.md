# Agency website

A single-page static site. No build step and no dependencies: plain HTML, CSS and JavaScript.

## Live site

https://ai-creator-management.vercel.app

It is hosted on Vercel, in the project `ai-creator-management`. The GitHub repo is connected to that project, so every push to `main` redeploys the site. To deploy by hand from this folder, run `vercel deploy --prod`.

The address is a placeholder. Rename the project in Vercel, or add your own domain there, once the agency has a name.

## View it locally

Double-click `index.html`, or serve the folder with any static server. Fonts load from Google Fonts, so you need to be online.

## Files

| File | What it holds |
|---|---|
| `index.html` | All structure and wording. Each section starts with a comment such as `<!-- 03 Disciplines -->`. |
| `assets/css/styles.css` | All styling. Colours, fonts and spacing are variables at the top. |
| `assets/js/main.js` | Motion and behaviour: the hero figure, scroll effects, menu, accordions, form. |
| `assets/js/site.config.js` | **The agency name, contact details and form address.** |
| `assets/img/favicon.svg` | Browser-tab icon (the placeholder mark). |

## Set the name

Open `assets/js/site.config.js` and fill in `name`. It then appears in the header, the footer and the browser tab. While it is empty, the header shows the mark and "Tech & Fintech Creators".

The text used when the site is shared on social media is in the `<head>` of `index.html` (`og:title`, `og:description`). Update it by hand once the name is final.

## Connect the form

Set `formEndpoint` in `site.config.js` to a form service address, for example Formspree or Web3Forms. Until then the form runs in **preview mode**: it validates, shows the confirmation, says plainly that nothing was sent, and sends nothing.

## Before launch

- [ ] Agency name, and legal name for the footer
- [ ] Contact email and X handle in `site.config.js`
- [ ] Form connected and tested with a real submission
- [ ] A privacy notice page, linked near the form. The form collects personal data.
- [x] Commercial terms in the Questions section confirmed (16 Nov 2026): commission-based pay and exclusive representation
- [ ] A share image (`og:image`) for social previews
- [ ] The final logo. The current mark is a placeholder; have the final one checked against existing trademarks.
- [ ] Tested on a real iPhone, an Android phone, Safari and Firefox
- [x] Hosting (Vercel, 16 Nov 2026)
- [ ] Your own domain, added in Vercel

## What the site does without JavaScript

Everything is readable. Motion, the mobile menu and form checking are added only when JavaScript runs.
