import * as parser from "posthtml-parser";
import * as prettier from "prettier";

export interface HtmlToIviOptions {
  componentName: string;
  trim: boolean;
}

interface HTMLNode {
  tag: string;
  attrs: { [key: string]: string };
  content: Array<HTMLNode | string>;
}

function extractElementAttributes(attrs: { [key: string]: string }): { [key: string]: string } | null {
  const result: { [key: string]: string } = {};
  let items = 0;
  for (const key of Object.keys(attrs)) {
    if (key.startsWith("on")) {
      continue;
    }
    switch (key) {
      case "class":
      case "style":
        break;
      case "accept-charset":
        result["acceptCharset"] = attrs[key];
        break;
      case "for":
        result["htmlFor"] = attrs[key];
        break;
      default:
        result[key] = attrs[key];
        items++;
    }
  }

  if (items > 0) {
    return result;
  }
  return null;
}

function extractElementStyles(styles: string): { [key: string]: string } | null {
  const result: { [key: string]: string } = {};
  let items = 0;

  for (const kv of styles.split(";")) {
    const [key, value] = kv.split(":");
    if (value !== undefined) {
      result[key.trim()] = value.trim();
      items++;
    }
  }

  if (items > 0) {
    return result;
  }
  return null;
}

function attrsToString(attrs: { [key: string]: string }): string {
  let result = "";
  for (const key of Object.keys(attrs)) {
    result += `"${key}":"${attrs[key]}",`;
  }
  return result;
}

function stylesToString(attrs: { [key: string]: string }): string {
  let result = "";
  for (const key of Object.keys(attrs)) {
    result += `"${key}":"${attrs[key]}",`;
  }
  return result;
}

const isWhitespaceRE = /[\w]*/;
function isWhitespace(s: string): boolean {
  return isWhitespaceRE.test(s);
}

function extractChildren(nodes: Array<HTMLNode | string>, options: HtmlToIviOptions): string {
  let result = "";
  for (const n of nodes) {
    if (typeof n === "string") {
      if (n) {
        if (!options.trim || !isWhitespace(n)) {
          result += `"${n.replace(/\n/g, "\\n")}",`;
        }
      }
    } else {
      result += `${printNode(n, options)},`;
    }
  }
  return result;
}

function printNode(node: HTMLNode, options: HtmlToIviOptions): string {
  let result = `h.${node.tag}`;
  if (node.attrs) {
    if (node.attrs.class) {
      result += `("${node.attrs.class}")`;
    } else {
      result += `()`;
    }
    if (node.attrs.style) {
      const styles = extractElementStyles(node.attrs.style);
      if (styles !== null) {
        result += `.style({${stylesToString(styles)}})`;
      }
    }
    const attrs = extractElementAttributes(node.attrs);
    if (attrs !== null) {
      result += `.props({${attrsToString(attrs)}})`;
    }
  } else {
    result += `()`;
  }
  if (node.content) {
    const children = extractChildren(node.content, options);
    if (children) {
      result += `.children(${children})`;
    }
  }

  return result;
}

export function htmlToIvi(html: string, options: HtmlToIviOptions): string {
  const nodes = parser(html);
  if (nodes.length > 0) {
    return prettier.format(`function ${options.componentName}() { return ${printNode(nodes[0], options)}; }`);
  }
  return "";
}
