require("svelte/register");

const fs = require("fs");
const path = require("path");
const globalCSS = fs.readFileSync(
  path.resolve(__dirname, "..", "public", "global.css")
);
const dans = require("../src/data/dans");
const Dans = require("../src/svgs/Dans.svelte").default;
const { html, css } = Dans.render({ dans });

fs.writeFileSync(
  path.resolve(__dirname, "..", "public", "svg", "dans.svg"),
  `<svg fill="none" xmlns="http://www.w3.org/2000/svg">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml">
        <style>${globalCSS}${css.code}</style>
        <div class="container">${html}</div>
      </div>
    </foreignObject>
  </svg>`
);
