const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const globalCSS = fs.readFileSync(
  path.resolve(__dirname, "..", "public", "global.css")
);
let readme = fs.readFileSync(path.resolve(__dirname, "..", "README.md"), {
  encoding: "utf8",
});

require("svelte/register");

for (const entityName of ["dans", "staffs", "tournaments"]) {
  const entities = require(`../src/data/${entityName}`);
  const capitalizedName = entityName[0].toUpperCase() + entityName.slice(1);
  const Component = require(`../src/svgs/${capitalizedName}.svelte`).default;
  const { html, css } = Component.render({ [entityName]: entities });
  // Rough height estimate by number of elements
  const height = 18 + entities.length * 46;

  const content = `<svg fill="none" width="800" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml">
        <style>${globalCSS}${css.code}</style>
        <div class="container">${html}</div>
      </div>
    </foreignObject>
  </svg>`;
  fs.writeFileSync(
    path.resolve(__dirname, "..", "public", "svg", `${entityName}.svg`),
    content
  );

  // When you include images in a GitHub README.md, they're uploaded and cached to their "camo",
  // so in order to refresh them, we include the svgs' md5 checksums in the URLs.
  const hash = crypto.createHash("md5").update(content).digest("hex");
  readme = readme.replace(
    new RegExp(`(http\\S+${entityName}.svg)(\\?v=[^\\s\\)]+)?`, "smig"),
    `$1?v=${hash}`
  );
}

fs.writeFileSync(path.resolve(__dirname, "..", "README.md"), readme);
