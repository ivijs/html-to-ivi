import * as parser from "posthtml-parser";
import * as prettier from "prettier";

const AttributesToProps = {
  class: null,
  style: null,
  autofocus: null,
  "accept-charset": "acceptCharset",
  "for": "htmlFor",
};

const InputAttributesToProps = {
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

function escapeText(text: string): string {
  return text.replace(/\n/g, "\\n");
}

function extractElementAttributes(
  attrs: { [key: string]: string },
  attrsToProps: { [key: string]: string | null },
): { [key: string]: string } | null {
  const result: { [key: string]: string } = {};
  let items = 0;
  for (const key of Object.keys(attrs)) {
    if (key.startsWith("on")) {
      continue;
    }
    let v = attrsToProps[key];
    if (v !== null) {
      if (v === undefined) {
        v = attrs[key];
      }
      result[key] = v;
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
  const attrs = node.attrs;
  const content = node.content;

  if (tag === "input") {
    let inputType = "text";
    if (attrs) {
      if (attrs.type) {
        const t = InputTypes[attrs.type];
        if (t !== undefined) {
          inputType = t;
        }
      }
    }
    result += `h.input${inputType}`;
  } else {
    result += `h.${tag}`;
  }

  if (attrs) {
    if (attrs.class) {
      result += `("${attrs.class}")`;
    } else {
      result += `()`;
    }

    if (attrs.style) {
      const styles = extractElementStyles(attrs.style);
      if (styles !== null) {
        result += `.style({${stylesToString(styles)}})`;
      }
    }

    let props;
    if (tag === "input") {
      if (attrs.value) {
        result += `.value("${escapeText(attrs.value)}")`;
      }
      if (attrs.checked) {
        result += `.checked(true)`;
      }
      props = extractElementAttributes(attrs, InputAttributesToProps);
    } else {
      props = extractElementAttributes(attrs, AttributesToProps);
    }
    if (props !== null) {
      result += `.props({${attrsToString(props)}})`;
    }
  } else {
    result += `()`;
  }

  if (content) {
    if (tag === "textarea") {
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

export function htmlToIvi(html: string, options: HtmlToIviOptions): string {
  const nodes = parser(html);
  if (nodes.length > 0) {
    return prettier.format(`function ${options.componentName}() { return ${printNode(nodes[0], options)}; }`);
  }
  return "";
}
