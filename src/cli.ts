import * as process from "process";
import * as path from "path";
import * as fs from "fs";
import * as minimist from "minimist";
import { htmlToIvi } from "./transformer";

const VERSION = "0.0.1";

const argv = minimist(process.argv.slice(2), {
  boolean: [
    "trim",
    "help",
    "version",
  ],
  string: [
    "file",
    "component-name",
  ],
  default: {
    "trim": true,
  },
  alias: {
    help: "h",
    version: "v",
    file: "f",
  },
});

if (argv.version) {
  process.stdout.write(`html-to-ivi ${VERSION}\n`);
  process.exit(0);
}

if (argv.help) {
  process.stdout.write(`Usage: html-to-ivi [opts]

Available options:
  --file -f <name>         Input file.
  --no-trim                Disable whitespace trimming.
  --component-name <name>  Component name.
  --version -v             Print version.
`);
  process.exit(0);
}

if (argv.file) {
  let filePath = argv.file;
  if (!path.isAbsolute(filePath)) {
    filePath = path.join(process.cwd(), filePath);
  }
  if (!fs.existsSync(filePath)) {
    process.stdout.write(`File not found: ${filePath}\n`);
    process.exit(1);
  }

  const input = fs.readFileSync(filePath, "utf8");
  process.stdout.write(htmlToIvi(
    input,
    {
      componentName: argv["component-name"] || "Component",
      trim: argv.trim,
    },
  ));
  process.exit(0);
} else {
  process.stdin.setEncoding("utf8");

  let input = "";
  process.stdin.on("data", function (b) {
    input += b.toString();
  });
  process.stdin.on("end", function () {
    process.stdout.write(htmlToIvi(
      input,
      {
        componentName: argv["component-name"] || "Component",
        trim: argv.trim,
      },
    ));
    process.exit(0);
  });
}
