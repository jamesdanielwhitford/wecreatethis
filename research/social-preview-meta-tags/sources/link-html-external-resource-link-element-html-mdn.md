# <link> HTML external resource link element - HTML | MDN

Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link

---

```
<link href="/shared-assets/misc/link-element-example.css" rel="stylesheet" />

<p>This text will be red as defined in the external stylesheet.</p>
<p style="color: blue">
  The <code>style</code> attribute can override it, though.
</p>
```

To link an external stylesheet, you'd include a `<link>` element inside your [`<head>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/head) like this:

html

```
<link href="main.css" rel="stylesheet" />
```

This example provides the path to the stylesheet inside an `href` attribute and a [`rel`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel) attribute with a value of `stylesheet`. The `rel` stands for "relationship", and is one of the key features of the `<link>` element — the value denotes how the item being linked to is related to the containing document.

There are a number of other common types you'll come across. For example, a link to the site's favicon:

html

```
<link rel="icon" href="favicon.ico" />
```

There are a number of other icon `rel` values, mainly used to indicate special icon types for use on various mobile platforms, e.g.:

html

```
<link
  rel="apple-touch-icon"
  sizes="114x114"
  href="apple-icon-114.png"
  type="image/png" />
```

The `sizes` attribute indicates the icon size, while the `type` contains the MIME type of the resource being linked.
These provide useful hints to allow the browser to choose the most appropriate icon available.

You can also provide a media type or query inside a `media` attribute; this resource will then only be loaded if the media condition is true. For example:

html

```
<link href="print.css" rel="stylesheet" media="print" />
<link href="mobile.css" rel="stylesheet" media="screen and (width <= 600px)" />
```

Some interesting new performance and security features have been added to the `<link>` element too. Take this example:

html

```
<link
  rel="preload"
  href="myFont.woff2"
  as="font"
  type="font/woff2"
  crossorigin="anonymous" />
```

A `rel` value of `preload` indicates that the browser should preload this resource (see [`rel="preload"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload) for more details), with the `as` attribute indicating the specific class of content being fetched.
The `crossorigin` attribute indicates whether the resource should be fetched with a [CORS](https://developer.mozilla.org/en-US/docs/Glossary/CORS) request.

Other usage notes:

* A `<link>` element can occur either in the [`<head>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/head) or [`<body>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/body) element, depending on whether it has a [link type](https://html.spec.whatwg.org/multipage/links.html#body-ok "External link (opens in new tab)") that is **body-ok**.
  For example, the `stylesheet` link type is body-ok, and therefore `<link rel="stylesheet">` is permitted in the body.
  However, this isn't a good practice to follow; it makes more sense to separate your `<link>` elements from your body content, putting them in the `<head>`.
* When using `<link>` to establish a favicon for a site, and your site uses a Content Security Policy (CSP) to enhance its security, the policy applies to the favicon.
  If you encounter problems with the favicon not loading, verify that the [`Content-Security-Policy`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy) header's [`img-src` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/img-src) is not preventing access to it.
* The HTML and XHTML specifications define event handlers for the `<link>` element, but it is unclear how they would be used.
* Under XHTML 1.0, [void elements](https://developer.mozilla.org/en-US/docs/Glossary/Void_element) such as `<link>` require a trailing slash: `<link />`.
* WebTV supports the use of the value `next` for `rel` to preload the next page in a document series.

This element includes the [global attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes).

[`as`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link#as)
:   This attribute is required when [`rel="preload"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload) has been set on the `<link>` element, optional when [`rel="modulepreload"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/modulepreload) has been set, and otherwise should not be used.
    It specifies the type of content being loaded by the `<link>`, which is necessary for request matching, application of correct [content security policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP), and setting of correct [`Accept`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Accept) request header.

    Furthermore, `rel="preload"` uses this as a signal for request prioritization.
    The table below lists the valid values for this attribute and the elements or resources they apply to.

    | `As` value | `Rel` value | Applies To |
    | --- | --- | --- |
    | audioworklet | modulepreload | [AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet) modules |
    | fetch | preload | fetch, XHR  **Note:** This value also requires `<link>` to contain the crossorigin attribute, see [CORS-enabled fetches](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload#cors-enabled_fetches). |
    | font | preload | CSS @font-face  **Note:** This value also requires `<link>` to contain the crossorigin attribute, see [CORS-enabled fetches](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload#cors-enabled_fetches). |
    | image | preload | `<img>` and `<picture>` elements with srcset or imageset attributes, SVG `<image>` elements, CSS `*-image` rules |
    | json | modulepreload | Supplementary JSON file |
    | paintworklet | modulepreload | [PaintWorklet](https://developer.mozilla.org/en-US/docs/Web/API/PaintWorkletGlobalScope) modules |
    | script | preload or modulepreload | `<script>` elements, Worker `importScripts`, and `modulepreload` destinations. |
    | serviceworker | modulepreload | [ServiceWorker](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorker) modules |
    | sharedworker | modulepreload | [SharedWorker](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker) |
    | style | preload or modulepreload | `<link rel=stylesheet>` elements, CSS `@import` and `modulepreload` destinations. |
    | text | modulepreload | Supplementary plain text file |
    | track | preload | `<track>` elements ([WebVTT](https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API/Web_Video_Text_Tracks_Format), MIME type `text/vtt`) |
    | worker | modulepreload | [Worker](https://developer.mozilla.org/en-US/docs/Web/API/Worker) modules |

[`blocking`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link#blocking)
:   This attribute explicitly indicates that certain operations should be blocked until specific conditions are met. It must only be used when the `rel` attribute contains the `expect` or `stylesheet` keywords. With [`rel="expect"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel#expect), it indicates that operations should be blocked until a specific DOM node has been parsed. With [`rel="stylesheet"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel#stylesheet), it indicates that operations should be blocked until an external stylesheet and its critical subresources have been fetched and applied to the document. The operations that are to be blocked must be a space-separated list of blocking tokens listed below. Currently there is only one token:

    * `render`: The rendering of content on the screen is blocked.

    **Note:**
    Only `link` elements in the document's `<head>` can possibly block rendering. By default, a `link` element with `rel="stylesheet"` in the `<head>` blocks rendering when the browser discovers it during parsing. If such a `link` element is added dynamically via script, you must additionally set `blocking = "render"` for it to block rendering.

[`crossorigin`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/crossorigin)
:   This [enumerated](https://developer.mozilla.org/en-US/docs/Glossary/Enumerated) attribute indicates whether [CORS](https://developer.mozilla.org/en-US/docs/Glossary/CORS) must be used when fetching the resource.
    [CORS-enabled images](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image) can be reused in the [`<canvas>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas) element without being *tainted*.
    The allowed values are:

    [`anonymous`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link#anonymous)
    :   A cross-origin request (i.e., with an [`Origin`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Origin) HTTP header) is performed, but no credential is sent (i.e., no cookie, X.509 certificate, or HTTP Basic authentication).
        If the server does not give credentials to the origin site (by not setting the [`Access-Control-Allow-Origin`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Origin) HTTP header) the resource will be tainted and its usage restricted.

    [`use-credentials`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link#use-credentials)
    :   A cross-origin request (i.e., with an `Origin` HTTP header) is performed along with a credential sent (i.e., a cookie, certificate, and/or HTTP Basic authentication is performed).
        If the server does not give credentials to the origin site (through [`Access-Control-Allow-Credentials`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Credentials) HTTP header), the resource will be *tainted* and its usage restricted.

    If the attribute is not present, the resource is fetched without a [CORS](https://developer.mozilla.org/en-US/docs/Glossary/CORS) request (i.e., without sending the `Origin` HTTP header), preventing its non-tainted usage. If invalid, it is handled as if the enumerated keyword **anonymous** was used.
    See [CORS settings attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/crossorigin) for additional information.

[`disabled`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link#disabled)
:   For `rel="stylesheet"` only, the `disabled` Boolean attribute indicates whether the described stylesheet should be loaded and applied to the document.
    If `disabled` is specified in the HTML when it is loaded, the stylesheet will not be loaded during page load.
    Instead, the stylesheet will be loaded on-demand, if and when the `disabled` attribute is changed to `false` or removed.

    Setting the `disabled` property in the DOM causes the stylesheet to be removed from the document's [`Document.styleSheets`](https://developer.mozilla.org/en-US/docs/Web/API/Document/styleSheets) list.

[`fetchpriority`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/fetchpriority)
:   Provides a hint of the relative priority to use when fetching a resource of a particular type. Allowed values:

    [`high`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link#high)
    :   Fetch the resource at a high priority relative to other resources of the same type.

    [`low`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link#low)
    :   Fetch the resource at a low priority relative to other resources of the same type.

    [`auto`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link#auto)
    :   Don't set a preference for the fetch priority.
        This is the default.
        It is used if no value or an invalid value is set.

[`href`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link#href)
:   This attribute specifies the [URL](https://developer.mozilla.org/en-US/docs/Glossary/URL) of the linked resource. A URL can be absolute or relative.

[`hreflang`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link#hreflang)
:   This attribute indicates the language of the linked resource.
    It is purely advisory.
    Values should be valid [BCP 47 language tags](https://developer.mozilla.org/en-US/docs/Glossary/BCP_47_language_tag).
    Use this attribute only if the [`href`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a#href) attribute is present.

[`imagesizes`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link#imagesizes)
:   For `rel="preload"` and `as="image"` only, the `imagesizes` attribute has similar syntax and semantics as the [`sizes`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img#sizes) attribute that indicates to preload the appropriate resource used by an `img` element with corresponding values for its `srcset` and `sizes` attributes.

[`imagesrcset`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link#imagesrcset)
:   For `rel="preload"` and `as="image"` only, the `imagesrcset` attribute has similar syntax and semantics as the [`srcset`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img#srcset) attribute that indicates to preload the appropriate resource used by an `img` element with corresponding values for its `srcset` and `sizes` attributes.

[`integrity`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/integrity)
:   This attribute contains one or more [hashes](https://developer.mozilla.org/en-US/docs/Glossary/Hash_function) of the resource. It is used to ensure that the content of the resource is what the developer expects it to be, and has not been replaced with a malicious copy in a [supply chain attack](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Supply_chain_attacks). The attribute must only be specified when the `rel` attribute is set to `stylesheet`, `preload`, or `modulepreload`.
    See [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity).

[`media`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link#media)
:   This attribute specifies the media that the linked resource applies to. Its value must be a media type / [media query](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries).
    This attribute is mainly useful when linking to external stylesheets — it allows the user agent to pick the best adapted one for the device it runs on.

[`referrerpolicy`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link#referrerpolicy)
:   A string indicating which referrer to use when fetching the resource. For detailed explanations and examples of each policy, see the [`Referrer-Policy`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy) header documentation.

    * `no-referrer` means that the [`Referer`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referer) header will not be sent.
    * `no-referrer-when-downgrade` means that no [`Referer`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referer) header will be sent when navigating to an origin without TLS (HTTPS).
      This is a user agent's default behavior, if no policy is otherwise specified.
    * `origin` means that the referrer will be the origin of the page, which is roughly the scheme, the host, and the port.
    * `origin-when-cross-origin` means that navigating to other origins will be limited to the scheme, the host, and the port, while navigating on the same origin will include the referrer's path.
    * `same-origin` means that the referrer (origin, path, and query string) is sent for same-origin requests, but no referrer is sent for cross-origin requests.
    * `strict-origin` means that only the origin is sent when the protocol security level stays the same (HTTPS→HTTPS). No referrer is sent to less secure destinations (HTTPS→HTTP). This is important for HTTPS pages because it prevents leaking referrer information to insecure origins.
    * `strict-origin-when-cross-origin` means that the full referrer is sent for same-origin requests. For cross-origin requests, only the origin is sent when the protocol stays the same (HTTPS→HTTPS), and no referrer is sent when downgrading to HTTP. This is the default value, which balances functionality with privacy and security for HTTPS sites.
    * `unsafe-url` means that the referrer will include the origin and the path (but not the fragment, password, or username).
      This case is unsafe because it can leak origins and paths from TLS-protected resources to insecure origins.

[`rel`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel)
:   This attribute names a relationship of the linked document to the current document. The attribute must be a space-separated list of [link type values](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel).

[`sizes`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link#sizes)
:   This attribute defines the sizes of the icons for visual media contained in the resource.
    It must be present only if the [`rel`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link#rel) contains a value of `icon` or a non-standard type such as Apple's `apple-touch-icon`.
    It may have the following values:

    * `any`, meaning that the icon can be scaled to any size as it is in a vector format, like `image/svg+xml`.
    * a white-space separated list of sizes, each in the format `<width in pixels>x<height in pixels>` or `<width in pixels>X<height in pixels>`. Each of these sizes must be contained in the resource.

    **Note:**
    Most icon formats are only able to store one single icon; therefore, most of the time, the [`sizes`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link#sizes) attribute contains only one entry.
    Microsoft's ICO format and Apple's ICNS format can store multiple icon sizes in a single file. ICO has better browser support, so you should use this format if cross-browser support is a concern.

[`title`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link#title)
:   The `title` attribute has special semantics on the `<link>` element.
    When used on a `<link rel="stylesheet">` it defines a [default or an alternate stylesheet](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/alternate_stylesheet).

[`type`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link#type)
:   This attribute is used to define the type of the content linked to.
    The value of the attribute should be a MIME type such as **text/html**, **text/css**, and so on.
    The common use of this attribute is to define the type of stylesheet being referenced (such as **text/css**), but given that CSS is the only stylesheet language used on the web, not only is it possible to omit the `type` attribute, but is actually now recommended practice.
    It is also used on `rel="preload"` link types, to make sure the browser only downloads file types that it supports.

To include a stylesheet in a page, use the following syntax:

html

```
<link href="style.css" rel="stylesheet" />
```

You can also specify [alternative style sheets](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/alternate_stylesheet).

The user can choose which style sheet to use by choosing it from the **View > Page Style** menu.
This provides a way for users to see multiple versions of a page.

html

```
<link href="default.css" rel="stylesheet" title="Default Style" />
<link href="fancy.css" rel="alternate stylesheet" title="Fancy" />
<link href="basic.css" rel="alternate stylesheet" title="Basic" />
```

You can include links to several icons on the same page, and the browser will choose which one works best for its particular context using the `rel` and `sizes` values as hints.

html

```
<!-- iPad Pro with high-resolution Retina display: -->
<link
  rel="apple-touch-icon"
  sizes="167x167"
  href="/apple-touch-icon-167x167.png" />
<!-- 3x resolution iPhone: -->
<link
  rel="apple-touch-icon"
  sizes="180x180"
  href="/apple-touch-icon-180x180.png" />
<!-- non-Retina iPad, iPad mini, etc.: -->
<link
  rel="apple-touch-icon"
  sizes="152x152"
  href="/apple-touch-icon-152x152.png" />
<!-- 2x resolution iPhone and other devices: -->
<link rel="apple-touch-icon" href="/apple-touch-icon-120x120.png" />
<!-- basic favicon -->
<link rel="icon" href="/favicon.ico" />
```

For information about what `sizes` to choose for Apple icons, see [Apple's documentation on configuring web applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html#//apple_ref/doc/uid/TP40002051-CH3-SW4 "External link (opens in new tab)") and the referenced [Apple human interface guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons#App-icon-sizes "External link (opens in new tab)"). Usually, it is sufficient to provide a large image, such as 192x192, and let the browser scale it down as needed, but you may want to provide images with different levels of detail for different sizes, as the Apple design guideline recommends. Providing smaller icons for lower resolutions also saves bandwidth.

It may not be necessary to provide `<link>` elements at all. For example, browsers automatically request `/favicon.ico` from the root of a site, and Apple also automatically requests `/apple-touch-icon-[size].png`, `/apple-touch-icon.png`, etc. However, providing explicit links protects you against changes to these conventions.

You can provide a media type or query inside a `media` attribute;
this resource will then only be loaded if the media condition is true. For example:

html

```
<link href="print.css" rel="stylesheet" media="print" />
<link href="mobile.css" rel="stylesheet" media="all" />
<link href="desktop.css" rel="stylesheet" media="screen and (width >= 600px)" />
<link
  href="highres.css"
  rel="stylesheet"
  media="screen and (resolution >= 300dpi)" />
```

You can determine when a style sheet has been loaded by watching for a `load` event to fire on it; similarly, you can detect if an error has occurred while processing a style sheet by watching for an `error` event:

html

```
<link rel="stylesheet" href="mystylesheet.css" id="my-stylesheet" />
```

js

```
const stylesheet = document.getElementById("my-stylesheet");

stylesheet.onload = () => {
  // Do something interesting; the sheet has been loaded
};

stylesheet.onerror = () => {
  console.log("An error occurred loading the stylesheet!");
};
```

**Note:**
The `load` event fires once the stylesheet and all of its imported content has been loaded and parsed, and immediately before the styles start being applied to the content.

You can find a number of `<link rel="preload">` examples in [Preloading content with `rel="preload"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload).

You can include `render` token inside a `blocking` attribute;
the rendering of the page will be blocked till the resource and its critical subresources are fetched and applied to the document. For example:

html

```
<link blocking="render" rel="stylesheet" href="example.css" crossorigin />
```
