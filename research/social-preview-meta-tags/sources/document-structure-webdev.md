# Document structure | web.dev

Source: https://web.dev/learn/html/document-structure

---

HTML documents include a document type declaration and the `<html>` root
element. Nested in the `<html>` element are the document head and document body.
While the head of the document isn't visible outside of the code, it's vital
for a site to function. It contains all the meta information, including
information for search engines and social media results, icons for the browser
tab and mobile home screen shortcut, and the behavior and presentation of your
content. In this section, you'll discover the components that, while not
visible, are present on almost every web page.

To create the `MachineLearningWorkshop.com` (MLW) site, start by including the
components that should be considered essential for every web page: the type of
document, the content's human language, the character set, and, of course, the
title or name of the site or application.

## Add to every HTML document

There's several elements that are essential for every web page. Browsers render
content if these elements are missing, but you should include them.

### `<!DOCTYPE html>`

The first thing in any HTML document is the preamble. For HTML, all you need is
`<!DOCTYPE html>`. This looks like an HTML element, but it's actually special
node called a *doctype*. The doctype tells the browser to use standards mode.
When omitted, browsers use a different rendering mode known as
[quirks mode](https://developer.mozilla.org/docs/Web/HTML/Quirks_Mode_and_Standards_Mode).
Including the doctype helps prevent quirks mode.

### `<html>`

The `<html>` element is the root element for an HTML document. It's the parent
of the `<head>` and `<body>`, containing everything in the HTML document other
than the doctype. If omitted, the language is implied, but you should include
it to declare the document's language.

### Content language

The [`lang` attribute](https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/lang#language_tag_syntax)
in the `<html>` tag defines the document's main
language. The value is an ISO language code followed by an optional region.
For example, French in Canada is `fr-CA`, while in Burkina Faso it's
`fr-BF`. This declaration helps screen readers, search engines, and
translation services identify the document language.

You can use the `lang` attribute on other tags to identify exceptions to
the document's primary language. Like its use in the head, the `lang` attribute
within the body has no visual effect. It adds semantics, so assistive
technologies and automated services can identify the language of specific
content.

In addition to setting the language for the document and exceptions to that base
language, the attribute can be used in CSS selectors.
`<span lang="fr-fr">Ceci n'est pas une pipe.</span>` can be targeted with the
attribute and language selectors
[`[lang|="fr"]`](https://developer.mozilla.org/docs/Web/CSS/Attribute_selectors#attrvalue_3)
and [`:lang(fr)`](https://developer.mozilla.org/docs/Web/CSS/:lang).

### `<head>`

Nested between the opening and closing `<html>` tags, we find the two children:
`<head>` and `<body>`:

```
<!DOCTYPE html>
<html lang="en-US">
  <head>
  </head>
  <body>
  </body>
</html>
```

The `<head>` contains metadata for a site or application, while the `<body>`
contains visible content. The rest of this section focuses on components
nested inside the `<head>` element.

## Required components inside the `<head>`

The document metadata, including the document title, character set, viewport
settings, description, base URL, stylesheet links, and icons, are found in the
`<head>` element. While you may not need all these features, always include
character set, title, and viewport settings.

### Character encoding

The very first element in the `<head>` should be the `charset` character
encoding declaration. It comes before the title to ensure the browser can render
the characters in that title and all the characters in the rest of the document.

The [default encoding](https://html.spec.whatwg.org/multipage/parsing.html#documentEncoding)
in most browsers is `windows-1252`, depending on the locale. However, you should
use [`UTF-8`](https://developer.mozilla.org/docs/Glossary/UTF-8), which enables
one- to four-byte encoding of all characters.

To set the character encoding to UTF-8, include:

```
<meta charset="utf-8" />
```

By declaring `UTF-8` (case-insensitive), you can even include emoji in your title.

The character encoding is inherited into everything in the document, even
`<style>` and `<script>`. This little declaration means you can include emoji in
class names and the `selectorAPI`. If you use emoji, make sure to use them in a
way that enhances usability without harming accessibility.

**Caution:** We recommend against including emoji in your title or class names.
Emoji are [inaccessible copy](https://uxdesign.cc/emojis-in-accessibility-how-to-use-them-properly-66b73986b803).

### Document title

Every page, your home page and all additional pages, should have a unique title.
The contents for the document title, the text between the opening and closing
`<title>` tags, are displayed in the browser tab, the list of open windows, the
history, search results, and, unless redefined with
[`<meta>` tags](https://web.dev/learn/html/metadata), in social media cards.

```
<title>Machine Learning Workshop</title>
```

The [viewport](https://web.dev/learn/design/intro#a_meta_element_for_viewport) meta tag
is essential for site responsiveness, ensuring content renders well regardless
of viewport width. Although the [viewport meta tag](https://developer.mozilla.org/docs/Web/HTML/Viewport_meta_tag)
has existed since 2007, it was only recently [documented in a specification](https://drafts.csswg.org/css-viewport/#viewport-meta).
It controls viewport size and scale, preventing content from shrinking to fit
smaller screens.

```
<meta name="viewport" content="width=device-width" />
```

The preceding code means "make the site responsive, starting by making the width
of the content the width of the screen". In addition to `width`, you can set
zoom and scalability, but they both default to accessible values. If you want
to be explicit, include:

```
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=1" />
```

Viewport is part of the [Lighthouse accessibility audit](https://web.dev/meta-viewport). Your
site will pass if it's scalable and has no maximum size set.

So far, the outline for our HTML file is:

```
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Machine Learning Workshop</title>
    <meta name="viewport" content="width=device-width" />
  </head>
  <body>

  </body>
</html>
```

## Other `<head>` content

There's a lot more that goes into the `<head>`. All the metadata, in fact.
While most of the elements you'll find in the `<head>` are covered in this
module, we'll share more in the [Metadata module](https://web.dev/learn/html/metadata).

You've seen the meta character set and the document title, but there is a lot
more metadata outside of `<meta>` tags that should be included.

### CSS

The `<head>` is where you include styles for your HTML. There is a
[learning path dedicated to CSS](https://web.dev/learn/css) if you want to learn about styles,
but you do need to know how to include them in your HTML documents.

There are three ways to include CSS: `<link>`, `<style>`, and the `style`
attribute.

The main two ways to include styles in your HTML file are by including an
external resource using a `<link>` element with the `rel` attribute set to
`stylesheet`, or including CSS directly in the head of your document within
opening and closing `<style>` tags.

The `<link>` tag is the preferred method of including stylesheets. Linking a single or a few external style sheets is good for both developer experience and site performance: you get to maintain CSS in one spot instead of it being sprinkled everywhere, and browsers can cache the external file, meaning it doesn't have to be downloaded again with every page navigation.

The syntax is `<link rel="stylesheet" href="styles.css">`, where `styles.css` is the filename and relative location for your stylesheet. You may see the
`type="text/css"` attribute, but it's not required. The `rel` attribute defines
the relationship, which is `stylesheet` in this case. If you omit the `rel`
attribute, your CSS won't be linked.

You'll discover a few other `rel` values shortly, but first you'll learn other
ways of including CSS.

If you want your external stylesheet styles to be within a cascade layer but
you don't have access to edit the CSS file, you'll want to include the CSS with
[`@import`](https://developer.mozilla.org/docs/Web/CSS/@import) inside a
`<style>`:

```
<style>
  @import "styles.css" layer(firstLayer);
</style>
```

When using `@import` to import style sheets into your document, optionally into
cascade layers, the `@import` statements must be the first statements in your
`<style>` or linked stylesheet, outside of the character set declaration.

While cascade layers are still fairly new and you might not spot the
`@import` in a head `<style>`, you will often see custom properties declared in
a head style block:

```
<style>
  :root {
    --theme-color: #226DAA;
  }
</style>
```

**Note:**  Styles, the presentation layer, are the
purview of CSS, here we are considering how to attach your styles to the content
layer, your HTML. If the CSS of the preceding code interests you, look up
[cascade layers](https://developer.mozilla.org/docs/Learn/CSS/Building_blocks/Cascade_layers)
and [custom properties](https://developer.mozilla.org/docs/Web/CSS/Using_CSS_custom_properties).

Styles, added with `<link>`, `<style>`, or both, should go in the head. While
they work when included in the document's body, but you should add styles in the
head for performance reasons. That may seem counterintuitive, as you may think
you want your content to load first. But, it's better for the browser to know
*how* to render the content when it's loaded. Adding styles first prevents the
unnecessary repainting that occurs if an element is styled after it's first
rendered.

There's the one way of including styles you'll never use in the `<head>` of your
document: inline styles. You'll probably never use inline styles in the head
because the user agents' style sheets hide the head by default. But if you want
to make a CSS editor without JavaScript, for example, so you can test your
page's custom elements, you can make the head visible with `display: block`,
and then hide everything in the head, and then with an inline `style` attribute,
make a content-editable style block visible.

```
<style contenteditable style="display: block; font-family: monospace; white-space: pre;">
  head { display: block; }
  head * { display: none; }
  :root {
    --theme-color: #226DAA;
  }
</style>
```

You can add inline styles to the `<style>` element.

### Other uses of the `<link>` element

The `link` element is used to create relationships between the HTML document and
external resources. Some of these resources may be downloaded, others are
informational. The type of relationship is defined by the value of the `rel`
attribute. There are [25 available values for the `rel` attribute](https://html.spec.whatwg.org/multipage/links.html#linkTypes)
that can be used with `<link>`, `<a>` and `<area>`, or `<form>`, with a few that
can be used with all. It's preferable to include those related to meta
information in the head and those related to performance in the `<body>`.

You'll include three other types in your header now: `icon`, `alternate`, and
`canonical`. You'll add a fourth type,
[`rel="manifest"`, in the next module](https://web.dev/learn/html/metadata).

#### Favicon

Use the `<link>` tag with `rel="icon"` to identify the favicon for your
document. A favicon is a small icon that appears on the browser tab, usually
to the left of the document title. When tabs shrink, the title may disappear,
but the icon remains visible. Most favicons are company or application logos.

If you don't declare a favicon, the browser will look for a file named
`favicon.ico` in the top-level directory (the website's root folder). With
`<link>`, you can use a different filename and location:

```
<link rel="icon" sizes="16x16 32x32 48x48" type="image/png" href="/images/mlwicon.png" />
```

The preceding code says "use the `mlwicon.png` as the icon for scenarios where a
16px, 32px, or 48px makes sense." The sizes attribute accepts the value of `any`
for scalable icons or a space-separated list of square `widthXheight` values;
where the width and height values are 16, 32, 48, or greater in that geometric
sequence, the pixel unit is omitted, and the X is case-insensitive.

```
<link rel="apple-touch-icon" sizes="180x180" href="/images/mlwicon.png" />
<link rel="mask-icon" href="/images/mlwicon.svg" color="#226DAA" />
```

There are two special non-standard kinds of icons for Safari browser:
`apple-touch-icon` for iOS devices and `mask-icon` for pinned tabs on macOS.
`apple-touch-icon` is applied only when the user adds a site to home screen:
you can specify multiple icons with different `sizes` for different devices.
`mask-icon` will only be used if the user pins the tab in desktop Safari: the
icon itself should be a monochrome SVG, and the `color` attribute fills the
icon with the needed color.

While you can use `<link>` to define a completely different image on each page
or even each page load, don't. For consistency and a good user experience, use a
single image. Google uses different favicons for each of its different
applications: there's a mail icon, a calendar icon, for example. But all the
Google icons use the same color scheme. You know exactly what the content of an
open tab is from the icon.

#### Alternate versions of the site

Use the `alternate` value of the `rel` attribute to identify translations
or alternate representations of the site.

Pretend we have versions of the site translated into French and Brazilian Portuguese:

```
<link rel="alternate" href="https://www.machinelearningworkshop.com/fr/" hreflang="fr-FR" />
<link rel="alternate" href="https://www.machinelearningworkshop.com/pt/" hreflang="pt-BR" />
```

When using `alternate` for a translation, the `hreflang` attribute must be set.

The alternate value is for more than just translations. For example, the `type`
attribute can define the alternate URI for an RSS feed when the `type` attribute
is set to `application/rss+xml` or `application/atom+xml`.

Link to a pretend PDF version of the site:

```
<link rel="alternate" type="application/x-pdf" href="https://machinelearningworkshop.com/mlw.pdf" />
```

If the `rel` value is `alternate stylesheet`, it defines an
[alternate stylesheet](https://developer.mozilla.org/docs/Web/CSS/Alternative_style_sheets)
and the `title` attribute must be set giving that alternate style a name.

#### Canonical

If you create several translations or versions of Machine Learning Workshop,
search engines may not identify the authoritative source. Use `rel="canonical"`
to identify the preferred URL for the site or application.

Include the canonical URL on all of your translated pages, and on the home page,
indicating our preferred URL:

```
<link rel="canonical" href="https://www.machinelearning.com" />
```

The `rel="canonical"` canonical link is most often used for cross-posting with
publications and blogging platforms to credit the original source. When a site
syndicates content, it should include the canonical link to the original source.

### Scripts

The `<script>` tag includes scripts. The default type is JavaScript. If you
use another scripting language, include the `type` attribute with the MIME
type, or `type="module"` for a [JavaScript module](https://developer.mozilla.org/docs/Web/JavaScript/Guide/Modules#applying_the_module_to_your_html).
Only JavaScript and JavaScript modules are parsed and executed.

The `<script>` tags can be used to encapsulate your code or to download an
external file. In MLW, there is no external script file because, contrary to
popular belief, you don't need JavaScript for a functional website. This is an
HTML learning path, not a [JavaScript one](https://web.dev/learn/javascript).

You will be including a tiny bit of JavaScript to create an
[Easter egg](https://www.webopedia.com/definitions/easter-egg/) later on:

```
<script>
  document.getElementById('switch').addEventListener('click', function() {
    document.body.classList.toggle('black');
  });
</script>
```

This snippet creates an event handler for an element with the ID of `switch`.
With JavaScript, you should avoid referencing an element before it exists. As
`switch` doesn't exist yet, we won't include the event handler yet.

When we do add the light switch element, we'll add the `<script>` at the bottom
of the `<body>` rather than in the `<head>`. Why? Two reasons. We want to ensure
elements exist before the script referencing them is encountered as we're not
basing this script on a [DOMContentLoaded event](https://developer.mozilla.org/docs/Web/API/Document/DOMContentLoaded_event).
And, mainly, JavaScript is not only
[render-blocking](https://developer.chrome.com/docs/lighthouse/performance/render-blocking-resources),
but the browser stops downloading all assets when scripts are downloaded and
doesn't resume downloading other assets until the JavaScript has finished
execution. For this reason, you often find JavaScript requests at the end
of the document rather than in the head.

There are two attributes that can reduce the blocking nature of JavaScript
download and execution: `defer` and `async`. With `defer`, HTML rendering is not
blocked during the download, and the JavaScript only executes after the document
has otherwise finished rendering. With `async`, rendering isn't blocked during
the download either, but once the script has finished downloading, the rendering
is paused while the JavaScript is executed.

![loading when using async and defer.](https://web.dev/static/learn/html/document-structure/image/loading-using-async-def-1bd40cbd444a2.png)

To include MLW's JavaScript in an external file, you could write:

```
<script src="js/switch.js" defer></script>
```

Adding the [`defer`](https://developer.mozilla.org/docs/Learn/JavaScript/First_steps/What_is_JavaScript#script_loading_strategies)
attribute defers the execution of the script until after everything is rendered,
preventing the script from harming performance. The `async` and `defer`
attributes are only valid on external scripts.

### Base

There is another element that is only found in the `<head>.` The infrequently
used `<base>` element allows setting a default link URL and target. The
`href` attribute defines the base URL for all relative links.

The `target` attribute, valid on `<base>` as well as on links and forms, sets
where those links should open. The default of `_self` opens linked files in the
same context as the current document. Other options include `_blank`, which
opens every link in a new window, the `_parent` of the current content, which
may be the same as self if the opener is not an iframe, or `_top`, which is in
the same browser tab, but popped out of any context to take up the entire tab.

Most developers add the `target` attribute to the few, if any, links they want
to open in a new window on the links or form themselves, rather than using
`<base>`.

```
<base target="_top" href="https://machinelearningworkshop.com" />
```

If our website found itself nested within an iframe on a site like Yummly,
including the `<base>` element would mean when a user clicks on any links within
our document, the link will load popped out of the iframe, taking up the whole
browser window.

One of the drawbacks of this element is that anchor links are resolved with
`<base>`. The `<base>` effectively converts the link `<a href="#ref">` to
`<a target="_top" href="https://machinelearningworkshop.com#ref">`, triggering
an HTTP request to the base URL with the fragment attached.

A few more things about `<base>`:

* There can be only one `<base>` element in a document.
* It should come before any relative URLs are used, including possible script
  or stylesheet references.

The code now looks like this:

```
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Machine Learning Workshop</title>
    <meta name="viewport" content="width=device-width" />
    <link rel="stylesheet" href="css/styles.css" />
    <link rel="icon" type="image/png" href="/images/favicon.png" />
    <link rel="alternate" href="https://www.machinelearningworkshop.com/fr/" hreflang="fr-FR" />
    <link rel="alternate" href="https://www.machinelearningworkshop.com/pt/" hreflang="pt-BR" />
    <link rel="canonical" href="https://www.machinelearning.com" />
  </head>
  <body>

    <!-- <script defer src="scripts/lightswitch.js"></script>-->
  </body>
</html>
```

The script is wrapped in angle brackets, dashes, and a bang, which is how
you comment out HTML. Anything between `<!--` and `-->` is not visible or
parsed. You can place HTML comments anywhere on the page, except within
scripts or style blocks, where you should use JavaScript and CSS comments.

You have covered the basics of what goes in the `<head>`, but you want to learn
more than the basics. In the next sections, we will learn about meta tags, and
how to control what gets displayed when your website is linked to on social
media.

### Check your understanding

Test your knowledge of document structure.

How do you identify the language of the document?

Add the `language` attribute to the HTML tag.

Try again.

Add the `lang` attribute to the HTML tag.

Correct!

`Add the <lang>` element to the `<head>`.

Try again.

Select elements that can be included in the `<head>`.
