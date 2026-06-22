# Privacy Policy — Cookie

**Last updated:** June 22, 2026

Cookie (“the App”) is a recipe web application. This policy describes how information is handled when you use the App. If you have questions, contact us using the details at the end of this document.

## Summary

Cookie requires an **account** so your recipes, bookmarks, and edits stay with you across devices. Account and recipe data are stored on **Cloudflare** (our hosting and database provider). We do **not** integrate analytics, advertising, or behavioral tracking SDKs. The optional **Scan from photo** feature sends a single image to **Anthropic's Claude API**, as described below.

## Account Information

When you create an account, we collect:

- Your **email address** (required for all sign-in methods)
- Your **name**, if you provide one or if it is shared by an OAuth provider
- A **password hash** if you sign up with email and password (we never store plain-text passwords)

You may sign in with **email and password**, **Google**, or **GitHub**. If you use Google or GitHub, we receive your email and display name from that provider to create or link your account. We do not receive your Google or GitHub password.

We use an HTTP-only session cookie (`cookie_session`) to keep you signed in. It expires after 30 days.

## Recipe Data We Store

When you are signed in, the following is stored in our database and tied to your account:

- **Recipes you create**, including text, ingredients, steps, and any images you attach (stored as part of the recipe record)
- **Edits** you make to bundled recipes
- **Bookmarks** (recipe IDs you save)

Bundled recipes included with the App remain shared app content. Only your personal additions and changes are stored per account.

## Data on Your Device

Some **UI preferences** (for example, library sort order and export toggles) and **generated exports** (PDF/Markdown) may be cached in your browser's local storage or IndexedDB for convenience.

If you had recipes saved locally before creating an account, the App offers a **one-time import** into your account on first sign-in, then removes that local copy.

### Photos

If you choose to add an image to a recipe, your browser may request access to your **photo library** or **camera**. Images you attach are stored as part of your recipe data in our database when you save while signed in.

## Recipe Photo Scanning

When you use **Scan from photo** while adding a recipe (requires sign-in), the single image you select is sent over the network to our hosting provider (**Cloudflare Pages Functions**) and to **Anthropic's Claude API**, which reads the text and suggests recipe fields. The image is processed only to fulfil that request; per Anthropic's API terms, inputs submitted through the API are not used to train models. We do not retain the image beyond what is needed to return the result to you.

## Third-Party Services

| Provider | Purpose |
|----------|---------|
| **Cloudflare** | Hosting, serverless functions, D1 database |
| **Anthropic** | Claude API for optional photo scanning |
| **Google** | Optional OAuth sign-in (only if you choose it) |
| **GitHub** | Optional OAuth sign-in (only if you choose it) |

The App does not embed third-party **analytics** or **advertising** networks. Each provider's handling of data is governed by their own privacy documentation.

## Children's Privacy

The App is not directed at children under 13, and we do not knowingly collect personal information from children. If you believe we have inadvertently received such information, please contact us.

## Your Choices and Retention

- **Sign out** — ends your session on the current device.
- **Account deletion** — contact us to request deletion of your account and associated recipe data.
- **Local cache** — clearing your browser's site data for Cookie removes on-device preferences and exports; your server-stored account data remains until you request deletion.

## International Users

Account and recipe data are stored on Cloudflare infrastructure. Laws in your region (for example, GDPR or UK GDPR) may apply; see Cloudflare's, Google's, GitHub's, and Anthropic's policies for how they process data.

## Changes to This Policy

We may update this Privacy Policy from time to time. The “Last updated” date at the top will change when we do.

## Contact

For privacy questions, account deletion requests, or other requests regarding this policy:

- **Email:** [Add your contact email]

---

*This document is provided for transparency about how the Cookie app handles data. It is not legal advice. For regulated offerings or specific jurisdictions, consult qualified counsel.*
