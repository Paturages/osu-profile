require("svelte/register");

const fs = require("fs");
const path = require("path");
const globalCSS = fs.readFileSync(
  path.resolve(__dirname, "..", "public", "global.css")
);
const tournaments = require("../src/data/tournaments");
const Tournaments = require("../src/svgs/Tournaments.svelte").default;
const { html, css } = Tournaments.render({ tournaments });

fs.writeFileSync(
  path.resolve(__dirname, "..", "public", "svg", "tournaments.svg"),
  `<svg fill="none" xmlns="http://www.w3.org/2000/svg">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml">
        <style>${globalCSS}${css.code}</style>
        <div class="container">${html}</div>
      </div>
    </foreignObject>
  </svg>`
);
