# Agency website

A single-page static site. No build step and no dependencies: plain HTML, CSS and JavaScript.

## Live site

https://aezmo.com

It is hosted on Vercel, in the project `tech-fintech-creators`. The GitHub repo is connected to that project, so every push to `main` redeploys the site. To deploy by hand from this folder, run `vercel deploy --prod`.

The domain is registered at GoDaddy, which also runs its DNS: two A records for `@` (216.198.79.1 and 64.29.17.1) and a CNAME for `www` pointing at Vercel. `www.aezmo.com` and the old Vercel addresses (`tech-fintech-creators.vercel.app`, `ai-creator-management.vercel.app`) forward to https://aezmo.com. Those rules are in `vercel.json`.

## View it locally

Double-click `index.html`, or serve the folder with any static server. Fonts load from Google Fonts, so you need to be online.

## Files

| File | What it holds |
|---|---|
| `index.html` | All structure and wording. Each section starts with a comment such as `<!-- 03 Management -->`. |
| `assets/css/styles.css` | All styling. Colours, fonts and spacing are variables at the top. |
| `assets/js/main.js` | Motion and behaviour: the hero figure, scroll effects, menu, accordions, form. |
| `assets/js/site.config.js` | **The agency name, contact details and form address.** |
| `assets/js/posts.js` | **The posts shown in the Work section.** Empty for now, so that section is hidden. |
| `assets/img/favicon.svg` | Browser-tab icon (the placeholder mark). |

## Set the name

The name is **Aezmo**, set as `name` in `assets/js/site.config.js`. From there it appears in the header, the footer and the browser tab. If `name` is empty, the header shows the mark and "Tech & Fintech Creators" instead.

The `<title>` and `og:site_name` in `index.html` also say Aezmo, so search engines and link previews see the name without running JavaScript. Change them too if the name ever changes. The rest of the text used when the site is shared is in `og:title` and `og:description`.

## Connect the form

The form sends to Formspree, to the form "Aezmo applications". Its address is `formEndpoint` in `site.config.js`. Each application, from a creator or a brand, is emailed to the inbox on the Formspree account and kept in the Formspree dashboard. Spam is caught by a hidden trap field on the page and by Formspree's Formshield filter; Formspree's CAPTCHA is off, because the form sends in the background and can't show one.

If `formEndpoint` is ever emptied, the form falls back to **preview mode**: it validates, shows the confirmation, says plainly that nothing was sent, and sends nothing.

## The Work section (a wall of posts)

A grid of post cards: who posted, the opening words, a still from the post, and its figures. Each card opens the real post on X.

It is **switched off until `assets/js/posts.js` lists at least one post**. With the list empty, the section and its "Work" links are not on the page at all, and the other sections keep their numbers.

To see the layout before you have posts, add `?wall=sample` to the address, for example `https://aezmo.com/?wall=sample#work`. That shows placeholder cards, each labelled "Sample".

To switch it on:

1. Add each post to `items` in `posts.js`. The file explains every field.
2. Put pictures in `assets/posts/` (the folder does not exist yet). Stills are cropped to 16:9 and shown in black and white.
3. Set `asOf` to the date you copied the figures. The page prints it under the wall.

Rules worth keeping:

- Show only posts you may show: your own, or posts by people you represent who have agreed in writing. A post on this page reads as "this person is our client".
- Copy figures from the post itself. Do not round up, and update `asOf` when you refresh them.
- The line under the heading says the posts are from people you represent. If you show your own posts instead, change that line in `index.html`.

## Before launch

- [x] Agency name: Aezmo
- [ ] Legal name for the footer, once the company is registered (until then it shows "Aezmo")
- [ ] Contact email and X handle in `site.config.js`
- [ ] Form connected and tested with a real submission
- [ ] A privacy notice page, linked near the form. The form collects personal data.
- [x] Commercial terms in the Questions section confirmed (16 Nov 2026): commission-based pay and exclusive representation
- [ ] A share image (`og:image`) for social previews
- [ ] The final logo. The current mark is a placeholder; have the final one checked against existing trademarks.
- [ ] Tested on a real iPhone, an Android phone, Safari and Firefox
- [x] Hosting (Vercel, 16 Nov 2026)
- [x] Your own domain: aezmo.com

## What the site does without JavaScript

Everything is readable. Motion, the mobile menu and form checking are added only when JavaScript runs.
