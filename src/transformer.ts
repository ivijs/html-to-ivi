import * as parser from "posthtml-parser";
import * as prettier from "prettier";
import { escapeText } from "./escape";

const enum Flags {
  Input = 1,
  TextArea = 1 << 1,
}

const ElementFlags: { [key: string]: Flags } = {
  input: Flags.Input,
  textarea: Flags.TextArea,
};

const AttributesToProps: { [key: string]: string | null } = {
  class: null,
  style: null,
  autofocus: null,
  "accept-charset": "acceptCharset",
  "for": "htmlFor",
};

const InputAttributesToProps: { [key: string]: string | null } = {
  ...AttributesToProps,
  type: null,
  checked: null,
  value: null,
};

const InputTypes: { [key: string]: string } = {
  button: "Button",
  checkbox: "Checkbox",
  color: "Color",
  date: "Date",
  datetime: "Datetime",
  "datetime-local": "DatetimeLocal",
  email: "Email",
  file: "File",
  hidden: "Hidden",
  image: "Image",
  month: "Month",
  number: "Number",
  password: "Password",
  radio: "Radio",
  range: "Range",
  reset: "Reset",
  search: "Search",
  submit: "Submit",
  tel: "Tel",
  text: "Text",
  time: "Time",
  url: "Url",
  week: "Week",
};

export interface HtmlToIviOptions {
  componentName: string;
  trim: boolean;
}

interface HTMLNode {
  tag: string;
  attrs: { [key: string]: string };
  content: Array<HTMLNode | string>;
}

function extractFlags(node: HTMLNode): Flags {
  const flags = ElementFlags[node.tag];
  if (flags === undefined) {
    return 0;
  }
  return flags;
}

function extractAttributes(
  flags: Flags,
  node: HTMLNode,
): { [key: string]: string | boolean } | null {
  const attrs = node.attrs;
  if (attrs) {
    let attrsToProps = AttributesToProps;
    if ((flags & Flags.Input) !== 0) {
      attrsToProps = InputAttributesToProps;
    }

    const result: { [key: string]: string | boolean } = {};
    let items = 0;
    for (const key of Object.keys(attrs)) {
      // Ignore events.
      if (key.startsWith("on")) {
        continue;
      }

      let v = attrsToProps[key];
      if (v !== null) {
        if (v === undefined) {
          v = attrs[key];
        }
        result[key] = v === "" ? true : v;
        items++;
      }
    }

    if (items > 0) {
      return result;
    }
  }
  return null;
}

function extractStyle(node: HTMLNode): { [key: string]: string } | null {
  if (node.attrs && node.attrs.style) {
    const style = node.attrs.style;
    const result: { [key: string]: string } = {};
    let items = 0;

    for (const kv of style.split(";")) {
      const [key, value] = kv.split(":");
      if (value !== undefined) {
        result[key.trim()] = value.trim();
        items++;
      }
    }

    if (items > 0) {
      return result;
    }
  }
  return null;
}

function extractClassName(node: HTMLNode): string {
  const attrs = node.attrs;

  if (attrs && attrs.class) {
    return attrs.class;
  }

  return "";
}

function extractInputType(node: HTMLNode): string {
  const attrs = node.attrs;

  if (attrs && attrs.type) {
    const t = InputTypes[attrs.type];
    if (t !== undefined) {
      return t;
    }
  }

  return "Text";
}

const DefaultInputValues = { value: "", checked: false };

function extractInputValues(node: HTMLNode): { value: string, checked: boolean } {
  const attrs = node.attrs;

  if (attrs) {
    let value = "";
    let checked = false;
    if (attrs.value) {
      value = attrs.value;
    }
    if (attrs.checked) {
      checked = true;
    }
    return { value, checked };
  }

  return DefaultInputValues;
}

function attrsToString(attrs: { [key: string]: string | boolean }): string {
  let result = "";
  for (const key of Object.keys(attrs)) {
    const v = attrs[key];
    if (v === true) {
      result += `"${key}":true,`;
    } else {
      result += `"${key}":"${v}",`;
    }
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

function extractChildren(content: Array<HTMLNode | string>, options: HtmlToIviOptions): string {
  let result = "";
  for (const n of content) {
    if (typeof n === "string") {
      if (n) {
        if (!options.trim || !isWhitespace(n)) {
          result += `"${escapeText(n)}",`;
        }
      }
    } else {
      result += `${printNode(n, options)},`;
    }
  }
  return result;
}

function printNode(node: HTMLNode, options: HtmlToIviOptions): string {
  let result = "";
  const tag = node.tag;
  const flags = extractFlags(node);
  const className = extractClassName(node);
  const attrs = extractAttributes(flags, node);
  const style = extractStyle(node);
  const content = node.content;

  if ((flags & Flags.Input) === 0) {
    result += `h.${tag}`;
  } else {
    result += `h.input${extractInputType(node)}`;
  }

  result += className ? `("${className}")` : `()`;

  if (style) {
    result += `.style({${stylesToString(style)}})`;
  }

  if ((flags & Flags.Input) !== 0) {
    const inputValues = extractInputValues(node);
    if (inputValues.value) {
      result += `.value("${escapeText(inputValues.value)}")`;
    }
    if (inputValues.checked) {
      result += `.checked(true)`;
    }
    if (attrs) {
      result += `.props({${attrsToString(attrs)}})`;
    }
  }

  if (content) {
    if ((flags & Flags.TextArea) !== 0) {
      if (content.length > 0) {
        const value = content[0];
        if (typeof value === "string" && value) {
          result += `.value("${escapeText(value.trim())}")`;
        }
      }
    } else {
      const children = extractChildren(content, options);
      if (children) {
        result += `.children(${children})`;
      }
    }
  }

  return result;
}

export function htmlToIvi(
  html: string,
  options: HtmlToIviOptions = { componentName: "Component", trim: true },
): string {
  const nodes = parser(html);
  if (nodes.length > 0) {
    return prettier.format(`function ${options.componentName}() { return ${printNode(nodes[0], options)}; }`);
  }
  return "";
}
