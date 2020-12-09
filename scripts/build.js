const fs = require("fs");
const path = require("path");
const globalCSS = fs.readFileSync(
  path.resolve(__dirname, "..", "public", "global.css")
);

require("svelte/register");

for (const entityName of ["dans", "staffs", "tournaments"]) {
  const entities = require(`../src/data/${entityName}`);
  const capitalizedName = entityName[0].toUpperCase() + entityName.slice(1);
  const Component = require(`../src/svgs/${capitalizedName}.svelte`).default;
  const { html, css } = Component.render({ [entityName]: entities });
  // Rough height estimate by number of elements
  const height = 18 + entities.length * 46;

  fs.writeFileSync(
    path.resolve(__dirname, "..", "public", "svg", `${entityName}.svg`),
    `<svg fill="none" width="800" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">
          <style>${globalCSS}${css.code}</style>
          <div class="container">${html}</div>
        </div>
      </foreignObject>
    </svg>`
  );
}
