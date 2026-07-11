const fs = require("fs");
const babel = require("@babel/standalone");

const files = process.argv.slice(2);
let failed = false;

for (const file of files) {
  const code = fs.readFileSync(file, "utf8");
  try {
    babel.transform(code, {
      filename: file,
      presets: ["typescript", "react"],
    });
    console.log("OK: " + file);
  } catch (e) {
    console.error("BABEL ERROR in " + file + ":");
    console.error(e.message);
    failed = true;
  }
}

if (failed) process.exit(1);
