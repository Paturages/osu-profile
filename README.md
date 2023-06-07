# osu! profile generator

Leverages the power of [Svelte](https://svelte.dev/) and its really simple server render,
and [this concept](https://github.com/sindresorhus/css-in-readme-like-wat): since including
images in osu! profiles is common and SVGs can be embedded as images, well...

This hacked together project is tailored towards my own use and purposes, but feel free to fork
and season to your heart's content.

## Build your own profile

Quick and dirty editor: https://paturages.github.io/osu-profile/public/

This is just something to quickly generate something that looks good enough. I'm too lazy to
figure out something to export it in a neat manner, so you'll have to screenshot the browser page
and crop it yourself :^)

On the flipside, if you wanna add some items, you can generate the extra items and photoshop/paint
insert them manually in the image, so you have that extra flexibility!

You may or may not get better results by "inspect element hacking" on the osu! website directly
though idk

## Maintain your own code

Make sure [Node.js](https://nodejs.org/en/) is installed (use whatever latest version).
Install dependencies in the command line with `npm install`.

You can then provide your own data in `src/data` and run `npm run build`.
The `public/svg` directory should be updated and pushable somewhere.

Assuming you're forking this repo somewhere else on GitHub, you can use GitHub Pages to expose
the `public` directory and get links to the SVGs (see below for examples).

## Examples

You can add something like `?v=102831` to refresh browser caches if necessary.

https://paturages.github.io/osu-profile/public/svg/tournaments.svg?v=7a0e20f557bc72edc3017cabd578c778
![](https://paturages.github.io/osu-profile/public/svg/tournaments.svg?v=7a0e20f557bc72edc3017cabd578c778)

https://paturages.github.io/osu-profile/public/svg/staffs.svg?v=72f1f89b0f4dd64be79d12fb347f89d0
![](https://paturages.github.io/osu-profile/public/svg/staffs.svg?v=72f1f89b0f4dd64be79d12fb347f89d0)

https://paturages.github.io/osu-profile/public/svg/dans.svg?v=693bf4058d20df907b73a01172ac679b
![](https://paturages.github.io/osu-profile/public/svg/dans.svg?v=693bf4058d20df907b73a01172ac679b)
