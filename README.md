# osu! profile generator

Leverages the power of [Svelte](https://svelte.dev/) and its really simple server render,
and [this concept](https://github.com/sindresorhus/css-in-readme-like-wat): since including
images in osu! profiles is common and SVGs can be embedded as images, well...

This hacked together project is tailored towards my own use and purposes, but feel free to fork
and season to your heart's content.

## Build your own

Make sure [Node.js](https://nodejs.org/en/) is installed (use whatever latest version).
Install dependencies in the command line with `npm install`.

You can then provide your own data in `src/data` and run `npm run build`.
The `public/svg` directory should be updated and pushable somewhere.

Assuming you're forking this repo somewhere else on GitHub, you can use GitHub Pages to expose
the `public` directory and get links to the SVGs (see below for examples).

## Examples

You can add something like `?v=102831` to refresh browser caches if necessary.

https://paturages.github.io/osu-profile/public/svg/tournaments.svg?v=23b53836899050a0a77563b3d77db5ca
![](https://paturages.github.io/osu-profile/public/svg/tournaments.svg?v=23b53836899050a0a77563b3d77db5ca)

https://paturages.github.io/osu-profile/public/svg/staffs.svg?v=d42f6e758064a82ae1846b9b3441a1d7
![](https://paturages.github.io/osu-profile/public/svg/staffs.svg?v=d42f6e758064a82ae1846b9b3441a1d7)

https://paturages.github.io/osu-profile/public/svg/dans.svg?v=8b7212dbf897842f4e5291e4ac5e2166
![](https://paturages.github.io/osu-profile/public/svg/dans.svg?v=8b7212dbf897842f4e5291e4ac5e2166)

## Potential fixes

- Refactor dan/staff/tournament components into one because I thought I'd need different implementations
  while brainstorming; I came up with the idea of replicating osu!'s design on the fly whoops
