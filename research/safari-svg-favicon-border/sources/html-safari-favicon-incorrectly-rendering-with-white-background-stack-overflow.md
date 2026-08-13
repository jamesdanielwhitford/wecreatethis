# html - Safari favicon incorrectly rendering with white background - Stack Overflow

Source: https://stackoverflow.com/questions/59233531/safari-favicon-incorrectly-rendering-with-white-background

---

This site is currently in read-only mode. We’ll return with full functionality soon. Visit [our status page](https://www.stackstatus.net) or search [our recent meta posts on the topic](https://meta.stackexchange.com/questions/tagged/maintenance+or+site-maintenance?tab=Newest) for more info.

##### Collectives™ on Stack Overflow

Find centralized, trusted content and collaborate around the technologies you use most.

[Learn more about Collectives](https://stackoverflow.com/collectives)

**Stack Internal**

Knowledge at work

Bring the best of human thought and AI automation together at your work.

[Explore Stack Internal](https://stackoverflow.co/internal/?utm_medium=referral&utm_source=stackoverflow-community&utm_campaign=side-bar&utm_content=explore-teams-compact-popover)

# [Safari favicon incorrectly rendering with white background](https://stackoverflow.com/questions/59233531/safari-favicon-incorrectly-rendering-with-white-background)

[Ask Question](https://stackoverflow.com/questions/ask)

Asked
6 years, 8 months ago

Modified
[4 years, 11 months ago](https://stackoverflow.com/questions/59233531/safari-favicon-incorrectly-rendering-with-white-background?lastactivity "2021-08-29 07:59:47Z")

Viewed
21k times

Voting is disabled while the site is in read-only mode.

22

Voting is disabled while the site is in read-only mode.

Saving is disabled while the site is in read-only mode.

Show activity on this post.

**Edit:** I have discovered that this is due to dark mode because there not enough contrast between the favicon and the background. However, is there still a way to disable this? I made a mock image file with the icon and the contrast seems to be enough.

---

I am attempting to add a favicon to an `HTML` website. However, in Safari, the favicon is incorrectly rendered with a white background (see image below). This is unexpected, as the file provided is a transparent `svg`.

To include the favicon into safari, I used the `mask-icon` link attribute to tell Safari where the favicon is located at. If this is not defined, Safari will use the default favicon in the `icon` link attribute. However, my icon does not work well in Safari like this, so a separate one is defined for Safari using the code below.

```
<link rel="mask-icon" href="/safari-pinned-tab.svg" color="#2163d9">
```

This follows [Apple's developer guidelines on creating pinned tab icons](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/pinnedTabs/pinnedTabs.html#//apple_ref/doc/uid/TP40002051-CH18-SW1). The guidelines state that the image file should comply with the following:

* 100% black vectors
* One layer
* `viewBox` attribule of `0 0 16 16`

Here is the `SVG` file.

```
<svg xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" viewBox="0 0 16 16">
    <defs>
        <style>.a{clip-path:url(#b);}</style>
        <clipPath id="b">
            <rect width="16" height="16"/>
        </clipPath>
    </defs>
    <g id="a" class="a">
        <g transform="translate(-254 -191.5)">
            <path d="M299.962-203.031l-3.973-2.485L299.962-208Z" transform="translate(-31.961 405.016)"/>
            <path d="M-42.6-75.784l5.539,2.769,6-3.985-4.8-3Z" transform="translate(299.062 280.016)"/>
            <path d="M-82-313l6-3,5.625,4.219L-82-304.515Z" transform="translate(338 508)"/>
        </g>
    </g>
</svg>
```

However, this still results in the incorrect rendering of the favicon. I have cleared the cache of the website and tried on an entirely different host, but the issue persists.

The favicon however is correctly displayed in the MacOS touch bar (see image below).

Does anyone have any idea why the Safari favicon is being rendered incorrectly?

[![Computer internet browser](https://i.sstatic.net/rKWW3.png)](https://i.sstatic.net/rKWW3.png)

[![MacOS Touch Bar](https://i.sstatic.net/ZxOnf.png)](https://i.sstatic.net/ZxOnf.png)

* [html](https://stackoverflow.com/questions/tagged/html "show questions tagged 'html'")
* [safari](https://stackoverflow.com/questions/tagged/safari "show questions tagged 'safari'")
* [html-meta](https://stackoverflow.com/questions/tagged/html-meta "show questions tagged 'html-meta'")
* [favicon](https://stackoverflow.com/questions/tagged/favicon "show questions tagged 'favicon'")

[Share](https://stackoverflow.com/q/59233531)

Share a link to this question

Copy link[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/ "The current license for this post: CC BY-SA 4.0")

Short permalink to this question

[edited Aug 29, 2021 at 7:59](https://stackoverflow.com/posts/59233531/revisions "show all edits to this post")

[![Martijn Pieters's user avatar](https://www.gravatar.com/avatar/24780fb6df85a943c7aea0402c843737?s=64&d=identicon&r=PG)](https://stackoverflow.com/users/100297/martijn-pieters)

[Martijn Pieters](https://stackoverflow.com/users/100297/martijn-pieters)

1.1m327327 gold badges4.3k4.3k silver badges3.5k3.5k bronze badges

asked Dec 8, 2019 at 7:59

user12359228

|

## 2 Answers 2

Sorted by:
[Reset to default](https://stackoverflow.com/questions/59233531/safari-favicon-incorrectly-rendering-with-white-background?answertab=scoredesc#tab-top)

Highest score (default)

Trending (recent votes count more)

Date modified (newest first)

Date created (oldest first)

Voting is disabled while the site is in read-only mode.

6

Voting is disabled while the site is in read-only mode.

Saving is disabled while the site is in read-only mode.

Loading when this answer was accepted…

Show activity on this post.

The `color` attribute in `link rel="mask-icon"` for Safari Pinned Tab Favicon, is **not** controlling the background, but the colour of the actual icon.
[This is expected](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/pinnedTabs/pinnedTabs.html#//apple_ref/doc/uid/TP40002051-CH18-SW1).

> In the example, the color attribute sets the display color of the
> image

However, as you correctly recognized it depends on Dark or Bright mode.
The white **background** is only added to Favicons in Safari when we use Dark Mode.

That would explain it, also other Blogs come to this conclusion, that in Dark mode, Safari automatically adds the White Background.

And yet that can't be the truth. Apple, Google, and many other websites, if visited on Safari in Dark Mode, **do not** have that white background in the (pinned/tab) Favicon. Additionally many of them with very low contrast.

I noticed reading online, Safari Favicons should be monochrome SVG where we define the (favicon) colour with the `color` attribute only. I've created a Favicon following this principle but still, I get the white background in Dark mode.

References:
<https://developer.apple.com/design/human-interface-guidelines/ios/icons-and-images/app-icon>
<https://makandracards.com/makandra/26757-do-not-use-transparent-pngs-for-ios-favicons>

**A possible Solution**

Assume a white Favicon in Dark mode and a Black favicon in Bright mode.

```
if (window.matchMedia('(prefers-color-scheme: dark)').matches === true) {
        console.log('dark');
        document.head.insertAdjacentHTML(
            'beforeend',
            '<link rel="mask-icon" href="/safari-pinned-tab.svg?v=your_dark_mode_fav" color="white">'
        );
    }
    else {
        document.head.insertAdjacentHTML(
            'beforeend',
            '<link rel="mask-icon" href="/safari-pinned-tab.svg?v= your_bright_mode_fav" color="black">'
        );
    }
```

This won't change on the fly and needs cache claering to be pushed to visitor.

I'll proceed with researching, this is still not satisfying enough.

I wonder what happens if you put a tiny (one pixel) white border around the favicon image. That should (for the computer program analysing it) be like a very high contrast and hence avoid the white background added, and it'd be invisible to the nude eye.

Funny fact:
I run in the same issue with almost the same colour as you did `#0075be`
And I also think that's contrasting enough, but it seems not.

[Share](https://stackoverflow.com/a/61556747)

Share a link to this answer

Copy link[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/ "The current license for this post: CC BY-SA 4.0")

Short permalink to this answer

[edited May 2, 2020 at 10:56](https://stackoverflow.com/posts/61556747/revisions "show all edits to this post")

answered May 2, 2020 at 8:54

user3934058

Sign up to request clarification or add additional context in comments.

## 5 Comments

Add a comment

user3934058

user3934058 [Over a year ago](https://stackoverflow.com/questions/59233531/safari-favicon-incorrectly-rendering-with-white-background#comment108887757_61556747)

This could help [css-tricks.com/dark-mode-favicons](https://css-tricks.com/dark-mode-favicons/) or not, it proves Apple isn't capable of dark mode, that's all. And yet most icons I see... well, don' have any background even on Safari.

2020-05-02T09:13:49.567Z+00:00

1

Reply

* Copy link

user3934058

user3934058 [Over a year ago](https://stackoverflow.com/questions/59233531/safari-favicon-incorrectly-rendering-with-white-background#comment108888990_61556747)

It seems indeed an automatic thing based on contrast, but it's still not clear what the contrast must be, to avoid it.

2020-05-02T10:15:59.747Z+00:00

1

Reply

* Copy link

[![](https://www.gravatar.com/avatar/17caf23c7a19b5ec1be189d30965c276?s=48&d=identicon&r=PG&f=y&so-version=2)](https://stackoverflow.com/users/6008139/artifex404)

Artifex404

[Artifex404](https://stackoverflow.com/users/6008139/artifex404) [Over a year ago](https://stackoverflow.com/questions/59233531/safari-favicon-incorrectly-rendering-with-white-background#comment131443173_61556747)

Shmid, did you find the logic behind the auto-contrast in Safari? I'm battling with the similar problem, trying to get the exact hex color appear.

2022-11-16T11:41:32.22Z+00:00

1

Reply

* Copy link

user3934058

user3934058 [Over a year ago](https://stackoverflow.com/questions/59233531/safari-favicon-incorrectly-rendering-with-white-background#comment131648049_61556747)

@Artifex404, no - I gave up on this and accepted it as a weirdness of safari.

2022-11-26T10:20:44.793Z+00:00

2

Reply

* Copy link

[![](https://www.gravatar.com/avatar/17caf23c7a19b5ec1be189d30965c276?s=48&d=identicon&r=PG&f=y&so-version=2)](https://stackoverflow.com/users/6008139/artifex404)

Artifex404

[Artifex404](https://stackoverflow.com/users/6008139/artifex404) [Over a year ago](https://stackoverflow.com/questions/59233531/safari-favicon-incorrectly-rendering-with-white-background#comment131661734_61556747)

first I had a thought to reverse-engineer the logic behind the contrast augmentation to try to calculate the needed color, but also gave up. Too much of a hacking solution for me...

2022-11-27T11:18:54.56Z+00:00

1

Reply

* Copy link

Add a comment

Voting is disabled while the site is in read-only mode.

4

Voting is disabled while the site is in read-only mode.

Saving is disabled while the site is in read-only mode.

Loading when this answer was accepted…

Show activity on this post.

I ran into the same issue on my own website ([lyramsr.co](https://lyramsr.co)) and have fixed it by slightly increasing the brightness of the normal favicon and changing the colour of the mask icon accordingly. (The colour was #1C806C, and is now #218D78.) This has made the white background disappear, so clearly the issue was contrast, although I’m puzzled as to how the browser determines what the appropriate amount of it is.

Safari 14 doesn’t appear to need the mask icon. It overrides the normal favicon when present, but when I remove it from the site it just uses the favicon, and that looks fine. I didn’t even notice the difference at first, since my normal favicon also uses only two colours.

[Share](https://stackoverflow.com/a/65554952)

Share a link to this answer

Copy link[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/ "The current license for this post: CC BY-SA 4.0")

Short permalink to this answer

[edited Jan 3, 2021 at 21:43](https://stackoverflow.com/posts/65554952/revisions "show all edits to this post")

answered Jan 3, 2021 at 21:07

[![lyra's user avatar](https://lh3.googleusercontent.com/-rPQz9FgnGFo/AAAAAAAAAAI/AAAAAAAAJPg/xnyX9f1mvoU/s64-rj/photo.jpg)](https://stackoverflow.com/users/4386373/lyra)

[lyra](https://stackoverflow.com/users/4386373/lyra)

13144 bronze badges

## Comments

Add a comment

## This site is temporarily in read-only mode and not accepting new answers.

## Try Stack Overflow for Agents

Verified knowledge for the agentic era

Paste this into your AI coding assistant:

Help me join Stack Overflow for Agents here. Read https://agents.stackoverflow.com/skill.md, then start onboarding.

Copy onboarding snippet

Supports Claude Code, Cursor, Codex, Windsurf and more.

[Explore Stack Overflow for Agents](https://agents.stackoverflow.com)

* The Overflow Blog
* [Your MVP doesn’t need a Kubernetes...](https://stackoverflow.blog/2026/08/04/your-mvp-doesn-t-need-a-kubernetes-cluster/?cb=1 "Your MVP doesn’t need a Kubernetes cluster​​​​‌﻿‍﻿​‍​‍‌‍﻿﻿‌﻿​‍‌‍‍‌‌‍‌﻿‌‍‍‌‌‍﻿‍​‍​‍​﻿‍‍​‍​‍‌﻿​﻿‌‍​‌‌‍﻿‍‌‍‍‌‌﻿‌​‌﻿‍‌​‍﻿‍‌‍‍‌‌‍﻿﻿​‍​‍​‍﻿​​‍​‍‌‍‍​‌﻿​‍‌‍‌‌‌‍‌‍​‍​‍​﻿‍‍​‍​‍‌‍‍​‌﻿‌​‌﻿‌​‌﻿​​‌﻿​﻿​﻿‍‍​‍﻿﻿​‍﻿﻿‌‍​﻿‌‍﻿‌‌﻿​﻿​‍﻿‍‌﻿​﻿‌﻿‌​‌‍​‌‌‍​﻿‌‍‍﻿‌‍﻿﻿‌﻿‌‍‌‍‌‌‌﻿​‍‌‍‌‍‌‍﻿​‌‍﻿﻿‌﻿‌﻿​‍﻿‍‌‍​﻿‌‍﻿﻿​‍﻿﻿‌‍‍‌‌‍﻿‍‌﻿‌​‌‍‌‌‌‍﻿‍‌﻿‌​​‍﻿﻿‌‍‌‌‌‍‌​‌‍‍‌‌﻿‌​​‍﻿﻿‌‍﻿‌‌‍﻿﻿‌‍‌​‌‍‌‌​﻿﻿‌‌﻿​​‌﻿​‍‌‍‌‌‌﻿​﻿‌‍‌‌‌‍﻿‍‌﻿‌​‌‍​‌‌﻿‌​‌‍‍‌‌‍﻿﻿‌‍﻿‍​﻿‍﻿‌‍‍‌‌‍‌​​﻿﻿‌​﻿‍​​﻿​‌‌‍‌‌​﻿​﻿‌‍​﻿​﻿‌‌‌‍‌‌​﻿​﻿​‍﻿‌​﻿​‌​﻿​‌‌‍​‍​﻿‌‌​‍﻿‌​﻿‌​‌‍​‌​﻿​‍​﻿​​​‍﻿‌​﻿‍​​﻿‌‌‌‍‌‍​﻿‌‌​‍﻿‌‌‍‌​​﻿‍‌‌‍‌‍​﻿​﻿​﻿‍​​﻿​‍‌‍​‍​﻿​‍​﻿‍‌‌‍​﻿​﻿​‌‌‍​‍​﻿‍﻿‌﻿‌​‌﻿‍‌‌﻿​​‌‍‌‌​﻿﻿‌‌‍​‍‌‍﻿​‌‍﻿﻿‌‍‌﻿‌‌​​‌‍﻿﻿‌﻿​﻿‌﻿‌​​﻿‍﻿‌﻿​​‌‍​‌‌﻿‌​‌‍‍​​﻿﻿‌‌﻿‌​‌‍‍‌‌﻿‌​‌‍﻿​‌‍‌‌​﻿﻿﻿‌‍​‍‌‍​‌‌﻿​﻿‌‍‌‌‌‌‌‌‌﻿​‍‌‍﻿​​﻿﻿‌‌‍‍​‌﻿‌​‌﻿‌​‌﻿​​‌﻿​﻿​‍‌‌​﻿​﻿‌​​‌​‍‌‌​﻿​‍‌​‌‍​‍‌‌​﻿​‍‌​‌‍‌‍​﻿‌‍﻿‌‌﻿​﻿​‍﻿‍‌﻿​﻿‌﻿‌​‌‍​‌‌‍​﻿‌‍‍﻿‌‍﻿﻿‌﻿‌‍‌‍‌‌‌﻿​‍‌‍‌‍‌‍﻿​‌‍﻿﻿‌﻿‌﻿​‍﻿‍‌‍​﻿‌‍﻿﻿​‍‌‍‌‍‍‌‌‍‌​​﻿﻿‌​﻿‍​​﻿​‌‌‍‌‌​﻿​﻿‌‍​﻿​﻿‌‌‌‍‌‌​﻿​﻿​‍﻿‌​﻿​‌​﻿​‌‌‍​‍​﻿‌‌​‍﻿‌​﻿‌​‌‍​‌​﻿​‍​﻿​​​‍﻿‌​﻿‍​​﻿‌‌‌‍‌‍​﻿‌‌​‍﻿‌‌‍‌​​﻿‍‌‌‍‌‍​﻿​﻿​﻿‍​​﻿​‍‌‍​‍​﻿​‍​﻿‍‌‌‍​﻿​﻿​‌‌‍​‍​‍‌‍‌﻿‌​‌﻿‍‌‌﻿​​‌‍‌‌​﻿﻿‌‌‍​‍‌‍﻿​‌‍﻿﻿‌‍‌﻿‌‌​​‌‍﻿﻿‌﻿​﻿‌﻿‌​​‍‌‍‌﻿​​‌‍​‌‌﻿‌​‌‍‍​​﻿﻿‌‌﻿‌​‌‍‍‌‌﻿‌​‌‍﻿​‌‍‌‌​‍‌‍‌﻿​​‌‍‌‌‌﻿​‍‌﻿​﻿‌﻿​​‌‍‌‌‌‍​﻿‌﻿‌​‌‍‍‌‌﻿‌‍‌‍‌‌​﻿﻿‌‌﻿​​‌﻿‌‌‌‍​‍‌‍﻿​‌‍‍‌‌﻿​﻿‌‍‍​‌‍‌‌‌‍‌​​‍​‍‌﻿﻿‌")
* [How to be fearlessly AI...](https://stackoverflow.blog/2026/08/07/how-to-be-fearlessly-ai-native/?cb=1 "How to be fearlessly AI native​​​​‌﻿‍﻿​‍​‍‌‍﻿﻿‌﻿​‍‌‍‍‌‌‍‌﻿‌‍‍‌‌‍﻿‍​‍​‍​﻿‍‍​‍​‍‌﻿​﻿‌‍​‌‌‍﻿‍‌‍‍‌‌﻿‌​‌﻿‍‌​‍﻿‍‌‍‍‌‌‍﻿﻿​‍​‍​‍﻿​​‍​‍‌‍‍​‌﻿​‍‌‍‌‌‌‍‌‍​‍​‍​﻿‍‍​‍​‍‌‍‍​‌﻿‌​‌﻿‌​‌﻿​​‌﻿​﻿​﻿‍‍​‍﻿﻿​‍﻿﻿‌‍​﻿‌‍﻿‌‌﻿​﻿​‍﻿‍‌﻿​﻿‌﻿‌​‌‍​‌‌‍​﻿‌‍‍﻿‌‍﻿﻿‌﻿‌‍‌‍‌‌‌﻿​‍‌‍‌‍‌‍﻿​‌‍﻿﻿‌﻿‌﻿​‍﻿‍‌‍​﻿‌‍﻿﻿​‍﻿﻿‌‍‍‌‌‍﻿‍‌﻿‌​‌‍‌‌‌‍﻿‍‌﻿‌​​‍﻿﻿‌‍‌‌‌‍‌​‌‍‍‌‌﻿‌​​‍﻿﻿‌‍﻿‌‌‍﻿﻿‌‍‌​‌‍‌‌​﻿﻿‌‌﻿​​‌﻿​‍‌‍‌‌‌﻿​﻿‌‍‌‌‌‍﻿‍‌﻿‌​‌‍​‌‌﻿‌​‌‍‍‌‌‍﻿﻿‌‍﻿‍​﻿‍﻿‌‍‍‌‌‍‌​​﻿﻿‌‌‍​﻿‌‍‌​​﻿‌‍‌‍‌​​﻿‍‌​﻿‌​‌‍​‌​﻿‍​​‍﻿‌​﻿‌‍‌‍‌‌‌‍​‍​﻿‌‍​‍﻿‌​﻿‌​​﻿​‍​﻿‌​​﻿​﻿​‍﻿‌​﻿‍​‌‍‌‌‌‍‌‌​﻿​‌​‍﻿‌‌‍​‍​﻿‌‌‌‍​‍​﻿​﻿​﻿‍‌​﻿​‌‌‍‌‌‌‍‌‍​﻿​​​﻿‌​​﻿‌​​﻿​‌​﻿‍﻿‌﻿‌​‌﻿‍‌‌﻿​​‌‍‌‌​﻿﻿‌‌‍​‍‌‍﻿​‌‍﻿﻿‌‍‌﻿‌‌​​‌‍﻿﻿‌﻿​﻿‌﻿‌​​﻿‍﻿‌﻿​​‌‍​‌‌﻿‌​‌‍‍​​﻿﻿‌‌﻿‌​‌‍‍‌‌﻿‌​‌‍﻿​‌‍‌‌​﻿﻿﻿‌‍​‍‌‍​‌‌﻿​﻿‌‍‌‌‌‌‌‌‌﻿​‍‌‍﻿​​﻿﻿‌‌‍‍​‌﻿‌​‌﻿‌​‌﻿​​‌﻿​﻿​‍‌‌​﻿​﻿‌​​‌​‍‌‌​﻿​‍‌​‌‍​‍‌‌​﻿​‍‌​‌‍‌‍​﻿‌‍﻿‌‌﻿​﻿​‍﻿‍‌﻿​﻿‌﻿‌​‌‍​‌‌‍​﻿‌‍‍﻿‌‍﻿﻿‌﻿‌‍‌‍‌‌‌﻿​‍‌‍‌‍‌‍﻿​‌‍﻿﻿‌﻿‌﻿​‍﻿‍‌‍​﻿‌‍﻿﻿​‍‌‍‌‍‍‌‌‍‌​​﻿﻿‌‌‍​﻿‌‍‌​​﻿‌‍‌‍‌​​﻿‍‌​﻿‌​‌‍​‌​﻿‍​​‍﻿‌​﻿‌‍‌‍‌‌‌‍​‍​﻿‌‍​‍﻿‌​﻿‌​​﻿​‍​﻿‌​​﻿​﻿​‍﻿‌​﻿‍​‌‍‌‌‌‍‌‌​﻿​‌​‍﻿‌‌‍​‍​﻿‌‌‌‍​‍​﻿​﻿​﻿‍‌​﻿​‌‌‍‌‌‌‍‌‍​﻿​​​﻿‌​​﻿‌​​﻿​‌​‍‌‍‌﻿‌​‌﻿‍‌‌﻿​​‌‍‌‌​﻿﻿‌‌‍​‍‌‍﻿​‌‍﻿﻿‌‍‌﻿‌‌​​‌‍﻿﻿‌﻿​﻿‌﻿‌​​‍‌‍‌﻿​​‌‍​‌‌﻿‌​‌‍‍​​﻿﻿‌‌﻿‌​‌‍‍‌‌﻿‌​‌‍﻿​‌‍‌‌​‍‌‍‌﻿​​‌‍‌‌‌﻿​‍‌﻿​﻿‌﻿​​‌‍‌‌‌‍​﻿‌﻿‌​‌‍‍‌‌﻿‌‍‌‍‌‌​﻿﻿‌‌﻿​​‌﻿‌‌‌‍​‍‌‍﻿​‌‍‍‌‌﻿​﻿‌‍‍​‌‍‌‌‌‍‌​​‍​‍‌﻿﻿‌")
* Featured on Meta
* [How we talk about ourselves (and to you)](https://meta.stackexchange.com/questions/419259/how-we-talk-about-ourselves-and-to-you?cb=1)
* [Policy: Generative AI (e.g., ChatGPT) is banned](https://meta.stackoverflow.com/questions/421831/policy-generative-ai-e-g-chatgpt-is-banned?cb=1)
* [Next steps for open-ended questions](https://meta.stackoverflow.com/questions/440088/next-steps-for-open-ended-questions?cb=1)
* [Looking ahead, starting conversations, and seizing the moment](https://meta.stackoverflow.com/questions/440089/looking-ahead-starting-conversations-and-seizing-the-moment?cb=1)
* [Are the existing open-ended question tags enough to define the scope of...](https://meta.stackoverflow.com/questions/440232/are-the-existing-open-ended-question-tags-enough-to-define-the-scope-of-question?cb=1 "Are the existing open-ended question tags enough to define the scope of questions that should be allowed on the site?")

### Linked

[3](https://stackoverflow.com/questions/75433533/favicon-has-unwanted-white-border-around-it-in-safari-on-macos?lq=1 "Question score (upvotes - downvotes)")
[favicon has unwanted white border around it in Safari on macOS](https://stackoverflow.com/questions/75433533/favicon-has-unwanted-white-border-around-it-in-safari-on-macos?noredirect=1&lq=1)

### Related

[3](https://stackoverflow.com/questions/3054747/favicon-does-not-show-on-webkit-browsers?rq=3 "Question score (upvotes - downvotes)")
[Favicon does not show on Webkit browsers](https://stackoverflow.com/questions/3054747/favicon-does-not-show-on-webkit-browsers?rq=3)

[1](https://stackoverflow.com/questions/4451835/favicons-not-showing-up-properly?rq=3 "Question score (upvotes - downvotes)")
[Favicons not showing up properly](https://stackoverflow.com/questions/4451835/favicons-not-showing-up-properly?rq=3)

[1](https://stackoverflow.com/questions/9816426/favicon-showing-blank-in-firefox-using-html5?rq=3 "Question score (upvotes - downvotes)")
[Favicon showing blank in Firefox using html5](https://stackoverflow.com/questions/9816426/favicon-showing-blank-in-firefox-using-html5?rq=3)

[14](https://stackoverflow.com/questions/24992048/favicon-not-showing-in-safari?rq=3 "Question score (upvotes - downvotes)")
[Favicon not showing in Safari](https://stackoverflow.com/questions/24992048/favicon-not-showing-in-safari?rq=3)

[1](https://stackoverflow.com/questions/31635420/favicon-on-safari-url-bar?rq=3 "Question score (upvotes - downvotes)")
[Favicon on Safari URL bar](https://stackoverflow.com/questions/31635420/favicon-on-safari-url-bar?rq=3)

[2](https://stackoverflow.com/questions/36855156/favicon-is-completely-transparent?rq=3 "Question score (upvotes - downvotes)")
[Favicon is completely transparent?](https://stackoverflow.com/questions/36855156/favicon-is-completely-transparent?rq=3)

[2](https://stackoverflow.com/questions/46365018/safari-favorites-bookmark-icon-not-displaying?rq=3 "Question score (upvotes - downvotes)")
[Safari Favorites/Bookmark Icon not displaying](https://stackoverflow.com/questions/46365018/safari-favorites-bookmark-icon-not-displaying?rq=3)

[1](https://stackoverflow.com/questions/51008584/why-isnt-my-favicon-appearing-in-safari?rq=3 "Question score (upvotes - downvotes)")
[Why isn't my favicon appearing in Safari?](https://stackoverflow.com/questions/51008584/why-isnt-my-favicon-appearing-in-safari?rq=3)

[1](https://stackoverflow.com/questions/68103777/favicon-issue-in-html?rq=3 "Question score (upvotes - downvotes)")
[Favicon issue in html](https://stackoverflow.com/questions/68103777/favicon-issue-in-html?rq=3)

[20](https://stackoverflow.com/questions/68885882/favicon-not-displaying-on-safari?rq=3 "Question score (upvotes - downvotes)")
[Favicon not displaying on Safari](https://stackoverflow.com/questions/68885882/favicon-not-displaying-on-safari?rq=3)

#### [Hot Network Questions](https://stackexchange.com/questions?tab=hot)

* [Cannot receive UDP broadcasts when sender ip is not in same subnet](https://serverfault.com/questions/1199625/cannot-receive-udp-broadcasts-when-sender-ip-is-not-in-same-subnet)
* [How would you use a Repeat Zone to blend multiple objects with SDF Grid Nodes?](https://blender.stackexchange.com/questions/347894/how-would-you-use-a-repeat-zone-to-blend-multiple-objects-with-sdf-grid-nodes)
* [CMUTypewriter symbols baseline inconsistency?](https://tex.stackexchange.com/questions/765266/cmutypewriter-symbols-baseline-inconsistency)
* [Why is 'care [of something, someone]' "something that you 'take' "?](https://english.stackexchange.com/questions/640304/why-is-care-of-something-someone-something-that-you-take)
* [Any advantage to charging a dollar for my car?](https://law.stackexchange.com/questions/115228/any-advantage-to-charging-a-dollar-for-my-car)
* [Is it possible to calculate BSSE in solvent (cpcm/water)?](https://mattermodeling.stackexchange.com/questions/14910/is-it-possible-to-calculate-bsse-in-solvent-cpcm-water)
* [Hex bit occasionally slips off roofing screw, damaging metal roofing](https://diy.stackexchange.com/questions/331629/hex-bit-occasionally-slips-off-roofing-screw-damaging-metal-roofing)
* [Independence Assumption of the Mann–Whitney U Test](https://stats.stackexchange.com/questions/676794/independence-assumption-of-the-mann-whitney-u-test)
* [Direct flight becomes indirect; transfer schedule is extremely tight](https://travel.stackexchange.com/questions/204363/direct-flight-becomes-indirect-transfer-schedule-is-extremely-tight)
* [Can you actually sin and not know it?](https://hermeneutics.stackexchange.com/questions/117763/can-you-actually-sin-and-not-know-it)
* [What was the first super-predictive computer?](https://scifi.stackexchange.com/questions/305519/what-was-the-first-super-predictive-computer)
* [Advanced levels or students](https://english.stackexchange.com/questions/640296/advanced-levels-or-students)
* [Isn't the choice of 1 as a "boundary point" for sum-of-squared-errors somewhat arbitrary and poorly motivated?](https://math.stackexchange.com/questions/5146305/isnt-the-choice-of-1-as-a-boundary-point-for-sum-of-squared-errors-somewhat-a)
* [Handling a difficult employee](https://workplace.stackexchange.com/questions/203608/handling-a-difficult-employee)
* [Super-power Fermat Conjecture](https://mathoverflow.net/questions/514056/super-power-fermat-conjecture)
* [Has Doki Doki Literature Club Plus! been censored in any way on any platform?](https://gaming.stackexchange.com/questions/419291/has-doki-doki-literature-club-plus-been-censored-in-any-way-on-any-platform)
* [Effective ammunition to use against Superhumans](https://worldbuilding.stackexchange.com/questions/274251/effective-ammunition-to-use-against-superhumans)
* [Why can't I use Modulo to return to the odd edge and even edge?](https://blender.stackexchange.com/questions/347918/why-cant-i-use-modulo-to-return-to-the-odd-edge-and-even-edge)
* [Is Word the best option for writing and editing a book?](https://writing.stackexchange.com/questions/72745/is-word-the-best-option-for-writing-and-editing-a-book)
* [MeshRegion adds self-intersections point then SubdivisionRegion fails](https://mathematica.stackexchange.com/questions/319866/meshregion-adds-self-intersections-point-then-subdivisionregion-fails)
* [TikZ to draw an arrow along the side of a table](https://tex.stackexchange.com/questions/765278/tikz-to-draw-an-arrow-along-the-side-of-a-table)
* [Reason Behind the PMOS+PNP+Zener Circuit in Powering a Microcontroller](https://electronics.stackexchange.com/questions/771319/reason-behind-the-pmospnpzener-circuit-in-powering-a-microcontroller)
* [Canonical resources on detector physics and event kinematics for an incoming ML/AI PhD student?](https://physics.stackexchange.com/questions/874907/canonical-resources-on-detector-physics-and-event-kinematics-for-an-incoming-ml)
* [Moving personal notes ("second brain") between companies](https://workplace.stackexchange.com/questions/203617/moving-personal-notes-second-brain-between-companies)

[Question feed](https://stackoverflow.com/feeds/question/59233531 "Feed of this question and its answers")

lang-html

![](https://stackoverflow.com/js-true.gif)

![.](https://ams-pageview-public.s3.amazonaws.com/1x1-pixel.png?id=b1ffe3826ebc)
