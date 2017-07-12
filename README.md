# html-to-ivi

Transforms HTML to [ivi](https://github.com/ivijs/ivi) Virtual DOM.

## Usage Example

`section.html`:

```html
<section>
  <p>Paragraph 1.</p>
  <p>Paragraph 2.</p>
</section>
```

Run `html-to-ivi`:

```sh
$ html-to-ivi --file ./section.html
```

Output:

```js
function Component() {
  return h.section().children(h.p(), h.p());
}
```

## Options

```
  --file -f <name>         Input file.
  --no-trim                Disable whitespace trimming.
  --component-name <name>  Component name.
  --version -v             Print version.
```
