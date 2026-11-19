# In Good Hands

Live at https://youre-in-good-hands.vercel.app/

The landing page for **In Good Hands**, which helps families in Singapore before, during and after a loss.

The site is static: `index.html` plus the pictures in `images/`. Vercel serves it as-is; there is no build step on Vercel.

## How the page is made

The page is designed in a Claude design canvas. Its two design files live in `src/`:

- `src/Main.dc.html`: the landing page
- `src/Demo.dc.html`: the "Try It Yourself" live preview

`build.py` turns those into `index.html`. It adds a small runtime (`runtime/dc-standalone.js`, using morphdom) so the interactive parts work in any browser, and points pictures at `images/`.

To update the site after changing the design: copy the new `.dc.html` files into `src/`, run `python3 build.py`, and commit. Vercel redeploys within a minute.

## Forms

The early-access sign-up and the feedback box both post to the Formspree form `xkjgbozd` (set as `FORM_URL` in `build.py`). Each submission has a `form` field, either `Early access` or `Feedback`, so you can tell them apart in the Formspree inbox. Both carry the person's `name`. Early-access entries also carry `who`, `via`, `contact` and an optional `message`; feedback entries carry `message` and an optional `contact`. Every entry includes the `page` it came from.
