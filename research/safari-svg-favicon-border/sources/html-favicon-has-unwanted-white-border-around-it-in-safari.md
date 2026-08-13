# html - favicon has unwanted white border around it in Safari on macOS - Stack Overflow

Source: https://stackoverflow.com/questions/75433533/favicon-has-unwanted-white-border-around-it-in-safari-on-macos

---

This site is currently in read-only mode. We’ll return with full functionality soon. Visit [our status page](https://www.stackstatus.net) or search [our recent meta posts on the topic](https://meta.stackexchange.com/questions/tagged/maintenance+or+site-maintenance?tab=Newest) for more info.

##### Collectives™ on Stack Overflow

Find centralized, trusted content and collaborate around the technologies you use most.

[Learn more about Collectives](https://stackoverflow.com/collectives)

**Stack Internal**

Knowledge at work

Bring the best of human thought and AI automation together at your work.

[Explore Stack Internal](https://stackoverflow.co/internal/?utm_medium=referral&utm_source=stackoverflow-community&utm_campaign=side-bar&utm_content=explore-teams-compact-popover)

# [favicon has unwanted white border around it in Safari on macOS](https://stackoverflow.com/questions/75433533/favicon-has-unwanted-white-border-around-it-in-safari-on-macos)

[Ask Question](https://stackoverflow.com/questions/ask)

Asked
3 years, 5 months ago

Modified
[5 months ago](https://stackoverflow.com/questions/75433533/favicon-has-unwanted-white-border-around-it-in-safari-on-macos?lastactivity "2026-02-16 18:28:05Z")

Viewed
2k times

Voting is disabled while the site is in read-only mode.

3

Voting is disabled while the site is in read-only mode.

Saving is disabled while the site is in read-only mode.

Show activity on this post.

I am having an issue with my favicon on safari for macOS. For all other browsers it works fine, but in safari it has a white border around it:

[![enter image description here](https://i.sstatic.net/ZgBHd.png)](https://i.sstatic.net/ZgBHd.png)

I have supplied three different sizes for this icon and my code is as follows:

```
<link rel="icon" type="image/svg+xml" href="/favicon-16x16.png" sizes="16x16" />
<link rel="icon" type="image/svg+xml" href="/favicon-32x32.png" sizes="32x32" />
<link rel="icon" type="image/svg+xml" href="/favicon-96x96.png" sizes="96x96" />
<link rel="icon" type="image/svg+xml" href="/favicon-180x180.png" sizes="180x180" />
```

What am I doing wrong here? (Note I have cleared the favicon cache in Safari each time I test this)

* [html](https://stackoverflow.com/questions/tagged/html "show questions tagged 'html'")
* [css](https://stackoverflow.com/questions/tagged/css "show questions tagged 'css'")
* [favicon](https://stackoverflow.com/questions/tagged/favicon "show questions tagged 'favicon'")

[Share](https://stackoverflow.com/q/75433533)

Share a link to this question

Copy link[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/ "The current license for this post: CC BY-SA 4.0")

Short permalink to this question

[edited Nov 11, 2025 at 18:24](https://stackoverflow.com/posts/75433533/revisions "show all edits to this post")

[![VLAZ's user avatar](https://i.sstatic.net/hy0Bnl.png?s=64)](https://stackoverflow.com/users/3689450/vlaz)

[VLAZ](https://stackoverflow.com/users/3689450/vlaz)

29.9k99 gold badges6666 silver badges8888 bronze badges

asked Feb 13, 2023 at 8:36

[![Kex's user avatar](https://i.sstatic.net/eWDfZ.png?s=64)](https://stackoverflow.com/users/4083744/kex)

[Kex](https://stackoverflow.com/users/4083744/kex)

8,6971313 gold badges6868 silver badges148148 bronze badges

2

* 1

  Hi, this similar questions suggests it may be due to how dark your icon is: [stackoverflow.com/questions/59233531](https://stackoverflow.com/questions/59233531/)

  tresf

  –
  [tresf](https://stackoverflow.com/users/3196753/tresf "8,152 reputation")

  2023-02-13 08:39:37 +00:00

  [Commented
  Feb 13, 2023 at 8:39](https://stackoverflow.com/questions/75433533/favicon-has-unwanted-white-border-around-it-in-safari-on-macos#comment133097663_75433533)
* The issue most likely is in your type attribute. You declaring type="image/svg+xml" but you have png images. Try changing the type to image/png...

  Deividas Strole

  –
  [Deividas Strole](https://stackoverflow.com/users/28634012/deividas-strole "11 reputation")

  2025-12-31 19:21:07 +00:00

  [Commented
  Dec 31, 2025 at 19:21](https://stackoverflow.com/questions/75433533/favicon-has-unwanted-white-border-around-it-in-safari-on-macos#comment140924087_75433533)

|

## 1 Answer 1

Sorted by:
[Reset to default](https://stackoverflow.com/questions/75433533/favicon-has-unwanted-white-border-around-it-in-safari-on-macos?answertab=scoredesc#tab-top)

Highest score (default)

Trending (recent votes count more)

Date modified (newest first)

Date created (oldest first)

Voting is disabled while the site is in read-only mode.

0

Voting is disabled while the site is in read-only mode.

Saving is disabled while the site is in read-only mode.

Loading when this answer was accepted…

Show activity on this post.

Try removing the dark bullet/button and just have the "K" using a brighter color. In my logo's testing, StackOverflow's orange (#F48024) worked (there was transparency instead of white background) and Coral (#f87171) did not. The threshold seems to be somewhere around that brightness level.

My findings:

* **Safari's original StackOverflow favicon** (orange, ~19% pixel coverage) → transparent, no white border
* **The same StackOverflow favicon recolored to dark navy** → white background added by Safari
* **Any dark-filled icon** (dark circle/dark square) → white background, regardless of file format, transparency, encoding tool, or coverage

Safari appears to evaluate the darkness/color of the favicon content and adds a contrasting background when it deems the icon too dark for the tab bar (especially in Dark Mode, where a dark icon would be invisible).

[Share](https://stackoverflow.com/a/79890400)

Share a link to this answer

Copy link[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/ "The current license for this post: CC BY-SA 4.0")

Short permalink to this answer

answered Feb 16 at 18:28

[![JAG's user avatar](https://i.sstatic.net/RV3O9.jpg?s=64)](https://stackoverflow.com/users/2892045/jag)

[JAG](https://stackoverflow.com/users/2892045/jag)

111 bronze badge

Sign up to request clarification or add additional context in comments.

## Comments

Add a comment

## This site is temporarily in read-only mode and not accepting new answers.

Start asking to get answers

Find the answer to your question by asking.

[Ask question](https://stackoverflow.com/questions/ask)

Explore related questions

* [html](https://stackoverflow.com/questions/tagged/html "show questions tagged 'html'")
* [css](https://stackoverflow.com/questions/tagged/css "show questions tagged 'css'")
* [favicon](https://stackoverflow.com/questions/tagged/favicon "show questions tagged 'favicon'")

See similar questions with these tags.

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

[22](https://stackoverflow.com/questions/59233531/safari-favicon-incorrectly-rendering-with-white-background?lq=1 "Question score (upvotes - downvotes)")
[Safari favicon incorrectly rendering with white background](https://stackoverflow.com/questions/59233531/safari-favicon-incorrectly-rendering-with-white-background?noredirect=1&lq=1)

### Related

[8](https://stackoverflow.com/questions/35377930/continuous-test-driven-development-for-rust?rq=3 "Question score (upvotes - downvotes)")
[Continuous test-driven development for Rust](https://stackoverflow.com/questions/35377930/continuous-test-driven-development-for-rust?rq=3)

[4](https://stackoverflow.com/questions/42601164/how-to-unit-test-aws-lambda-invokation?rq=3 "Question score (upvotes - downvotes)")
[How to unit test aws lambda invokation?](https://stackoverflow.com/questions/42601164/how-to-unit-test-aws-lambda-invokation?rq=3)

[1](https://stackoverflow.com/questions/47758329/how-do-i-write-test-cases-for-my-aws-python-based-lambda-project?rq=3 "Question score (upvotes - downvotes)")
[How do I write test cases for my AWS Python-based lambda project?](https://stackoverflow.com/questions/47758329/how-do-i-write-test-cases-for-my-aws-python-based-lambda-project?rq=3)

[3](https://stackoverflow.com/questions/48304385/unit-testing-with-final-classes-of-aws-sdk?rq=3 "Question score (upvotes - downvotes)")
[Unit testing with final classes of AWS SDK](https://stackoverflow.com/questions/48304385/unit-testing-with-final-classes-of-aws-sdk?rq=3)

[2](https://stackoverflow.com/questions/57577400/how-to-test-code-that-exists-on-an-aws-lambda?rq=3 "Question score (upvotes - downvotes)")
[How to test code that exists on an AWS Lambda?](https://stackoverflow.com/questions/57577400/how-to-test-code-that-exists-on-an-aws-lambda?rq=3)

[2](https://stackoverflow.com/questions/62068266/unit-testing-on-a-nodejs-typescript-aws-lambda?rq=3 "Question score (upvotes - downvotes)")
[Unit Testing on a NodeJS + Typescript AWS Lambda](https://stackoverflow.com/questions/62068266/unit-testing-on-a-nodejs-typescript-aws-lambda?rq=3)

[2](https://stackoverflow.com/questions/62350389/mocking-aws-sdk-java-2-0?rq=3 "Question score (upvotes - downvotes)")
[Mocking aws-sdk-java 2.0](https://stackoverflow.com/questions/62350389/mocking-aws-sdk-java-2-0?rq=3)

[1](https://stackoverflow.com/questions/65464240/aws-sdk-go-lambda-unit-testing?rq=3 "Question score (upvotes - downvotes)")
[AWS SDK Go Lambda Unit Testing](https://stackoverflow.com/questions/65464240/aws-sdk-go-lambda-unit-testing?rq=3)

[5](https://stackoverflow.com/questions/68217374/writing-comprehensive-unit-tests-in-rust?rq=3 "Question score (upvotes - downvotes)")
[Writing comprehensive unit tests in rust](https://stackoverflow.com/questions/68217374/writing-comprehensive-unit-tests-in-rust?rq=3)

[0](https://stackoverflow.com/questions/73553329/unittest-on-aws-python-lambda?rq=3 "Question score (upvotes - downvotes)")
[Unittest on AWS python Lambda](https://stackoverflow.com/questions/73553329/unittest-on-aws-python-lambda?rq=3)

#### [Hot Network Questions](https://stackexchange.com/questions?tab=hot)

* [CMUTypewriter symbols baseline inconsistency?](https://tex.stackexchange.com/questions/765266/cmutypewriter-symbols-baseline-inconsistency)
* [Did there exist systems that used a 486 and 487 simultaneously?](https://retrocomputing.stackexchange.com/questions/32785/did-there-exist-systems-that-used-a-486-and-487-simultaneously)
* [Why is zeroed out USB drive still showing up in UEFI/BIOS bootmenu?](https://superuser.com/questions/1939539/why-is-zeroed-out-usb-drive-still-showing-up-in-uefi-bios-bootmenu)
* [Can a circle and an “infinitely sided polygon” be distinct objects satisfying the same limiting or geometric relation?](https://math.stackexchange.com/questions/5146347/can-a-circle-and-an-infinitely-sided-polygon-be-distinct-objects-satisfying-th)
* [Why does it mention the location in Al Hanissim of Purim but not Chanuka](https://judaism.stackexchange.com/questions/156747/why-does-it-mention-the-location-in-al-hanissim-of-purim-but-not-chanuka)
* [Reason Behind the PMOS+PNP+Zener Circuit in Powering a Microcontroller](https://electronics.stackexchange.com/questions/771319/reason-behind-the-pmospnpzener-circuit-in-powering-a-microcontroller)
* [What does Etymonline mean by “make” + “treat”?](https://english.stackexchange.com/questions/640289/what-does-etymonline-mean-by-make-treat)
* [sudo-rs and life without wildcards](https://askubuntu.com/questions/1568873/sudo-rs-and-life-without-wildcards)
* [align hitbox of rotated reference cited in TikZ image](https://tex.stackexchange.com/questions/765298/align-hitbox-of-rotated-reference-cited-in-tikz-image)
* [Do Vital Strike, Two-Handed Thrower, and Hurling interact?](https://rpg.stackexchange.com/questions/219735/do-vital-strike-two-handed-thrower-and-hurling-interact)
* [Is Word the best option for writing and editing a book?](https://writing.stackexchange.com/questions/72745/is-word-the-best-option-for-writing-and-editing-a-book)
* [What is the smallest polyomino whose optimal translational packing is not given by a lattice?](https://math.stackexchange.com/questions/5146477/what-is-the-smallest-polyomino-whose-optimal-translational-packing-is-not-given)
* [Why does angle need a unit in mathematics?](https://math.stackexchange.com/questions/5146384/why-does-angle-need-a-unit-in-mathematics)
* [Are there any instances of Gollum using the One Ring to become invisible in any of Tolkien's works?](https://scifi.stackexchange.com/questions/305494/are-there-any-instances-of-gollum-using-the-one-ring-to-become-invisible-in-any)
* [Discrete ambiguity when deriving the Lorentz transformation from SR principles](https://physics.stackexchange.com/questions/874861/discrete-ambiguity-when-deriving-the-lorentz-transformation-from-sr-principles)
* [Using plugin HelpMe on Vim 9 I get this message E930](https://vi.stackexchange.com/questions/48785/using-plugin-helpme-on-vim-9-i-get-this-message-e930)
* [Which topos (or topoi) most accurately reflect Brouwer's ideas on intuitionism?](https://mathoverflow.net/questions/514026/which-topos-or-topoi-most-accurately-reflect-brouwers-ideas-on-intuitionism)
* [Is it possible to calculate BSSE in solvent (cpcm/water)?](https://mattermodeling.stackexchange.com/questions/14910/is-it-possible-to-calculate-bsse-in-solvent-cpcm-water)
* [Cannot receive UDP broadcasts when sender ip is not in same subnet](https://serverfault.com/questions/1199625/cannot-receive-udp-broadcasts-when-sender-ip-is-not-in-same-subnet)
* [Robust way to write equation solving](https://tex.stackexchange.com/questions/765277/robust-way-to-write-equation-solving)
* [Direct flight becomes indirect; transfer schedule is extremely tight](https://travel.stackexchange.com/questions/204363/direct-flight-becomes-indirect-transfer-schedule-is-extremely-tight)
* [Independence Assumption of the Mann–Whitney U Test](https://stats.stackexchange.com/questions/676794/independence-assumption-of-the-mann-whitney-u-test)
* [Who is liable when LLMs commit crimes?](https://law.stackexchange.com/questions/115231/who-is-liable-when-llms-commit-crimes)
* [How to make an Icosidodecahedron?](https://blender.stackexchange.com/questions/347899/how-to-make-an-icosidodecahedron)

[more hot questions](https://stackoverflow.com/questions/75433533/favicon-has-unwanted-white-border-around-it-in-safari-on-macos)

[Question feed](https://stackoverflow.com/feeds/question/75433533 "Feed of this question and its answers")

lang-html

![.](https://ams-pageview-public.s3.amazonaws.com/1x1-pixel.png?id=b1ffe3826ebc)
