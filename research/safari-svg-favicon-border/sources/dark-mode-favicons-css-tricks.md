# Dark Mode Favicons | CSS-Tricks

Source: https://css-tricks.com/dark-mode-favicons/

---

Oooo! [A bonafide trick](https://blog.tomayac.com/2019/09/21/prefers-color-scheme-in-svg-favicons-for-dark-mode-icons/) from Thomas Steiner. Chrome will soon be supporting SVG favicons (e.g. ). And you can embed CSS within an SVG with a

`<style>` element. That CSS can use a `prefers-color-scheme` media query, and as a result, a favicon that supports dark mode!

![](data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7 "Read more...")

<

pre rel=”HTML”> `&lt;`

svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
<style>
circle {
fill: yellow;
stroke: black;
stroke-width: 3px;
}
@media (prefers-color-scheme: dark) {
circle {
fill: black;
stroke: yellow;
}
}
</style>

[](https://css-tricks.com/wp-content/uploads/2019/11/favicon-darkmode.mp4)

---

Safari also supports SVG, but it’s different…

You specify the color, so there is no opportunity there for a dark mode situation. A little surprising, since Apple is so all-in on this dark mode stuff. I have no idea if they plan to address that or what.

## Comments

1. Bolaji Ahmad

   [Permalink to comment#](https://css-tricks.com/dark-mode-favicons/#comment-1752897) December 3, 2019

   I don’t understand. Is there like a new SVG element and circle element that is supported in HTML?

   * jakob

     [Permalink to comment#](https://css-tricks.com/dark-mode-favicons/#comment-1752910) December 4, 2019

     Svg can be into into html and styled with css. What this article is demonstrating is that you can write the css directly in the .svg image file with the media query `prefers-color-scheme: dark`, which can alter the style of the image (even when used as a favicon)
2. Kyle

   [Permalink to comment#](https://css-tricks.com/dark-mode-favicons/#comment-1752898) December 3, 2019

   Can you modify the `color` attribute on the `link` tag in JavaScript? Or will that not work?
3. Darek

   [Permalink to comment#](https://css-tricks.com/dark-mode-favicons/#comment-1752901) December 4, 2019

   Is there a way to dynamicly replay to dark/light theme changes – without refreshing the page?
4. Kino

   [Permalink to comment#](https://css-tricks.com/dark-mode-favicons/#comment-1752904) December 4, 2019

   Imho this ‘dark mode’ thing is going too far!
5. Mark

   [Permalink to comment#](https://css-tricks.com/dark-mode-favicons/#comment-1752906) December 4, 2019

   For Safari, could you not do?

   `<link rel="mask-icon" href="/favicon.svg" color="lighthex" />
   <link rel="mask-icon" href="/favicon.svg" color="darkhex" media="(prefers-color-scheme: dark)" />`

   It’s an extra line of markup, but you can pass the media query through to the ‘media’ attribute on the link tag.

   <https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-media>
6. Larry Saytee

   [Permalink to comment#](https://css-tricks.com/dark-mode-favicons/#comment-1752924) December 5, 2019

   Love it. short and sweet!
7. Mikey Binns

   [Permalink to comment#](https://css-tricks.com/dark-mode-favicons/#comment-1755341) March 26, 2020

   I’ve noticed that while this method conforms to the operating systems default theme, if the browser has a theme set to the opposite, like a light theme browser in a dark mode operating system, the favicon still follows the operating system, and ignores the browsers theme.

   It would be good if you could just define a set of favicons for light and dark, then the browser could select the most appropriate one for the theme in use.
8. Zachary Green

   [Permalink to comment#](https://css-tricks.com/dark-mode-favicons/#comment-1795472) April 19, 2022

   Heads up that an active Chrome bug (<https://bugs.chromium.org/p/chromium/issues/detail?id=1311553&q=dark%20mode%20favicon&can=2>) has broken this.

This comment thread is closed. If you have important information to share, please [contact us](https://css-tricks.com/contact/).
