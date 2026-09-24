import type { ReactElement } from 'react';

// Each provider's own brand mark, sourced from that provider's own published
// assets rather than approximated from memory —
// claude-docs/components/sign-in-panel.md, "Provider branding" names where
// each one came from: Google's identity branding guidelines, Discord's and
// Facebook's own brand-resource downloads, Microsoft's identity platform
// guidelines. Colours are hex literals, not $accent/$secondary tokens, for
// the same reason: they are the provider's, not ours.

// Google's "G" logo, as published for "Sign in with Google" buttons
// (Google's identity branding guidelines). No chip: the mark is multicolour
// and reads on any ground.
export function GoogleIcon(): ReactElement {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.8741 2.6836-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.8064 5.9564-2.1818l-2.9087-2.2581c-.8064.54-1.8368.8591-3.0477.8591-2.344 0-4.3282-1.5831-5.036-3.7104H.9575v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573A8.996 8.996 0 000 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"
      />
    </svg>
  );
}

// Discord's current "Symbol" mark, traced from the SVG in Discord's own
// brand-asset download (discord.com/branding → Logo → Symbol), not the
// retired "Clyde" face icon older buttons around the web still show. Drawn
// in white directly on the blurple button, the way Discord's own site does
// it — the mark needs no chip.
export function DiscordIcon(): ReactElement {
  return (
    <svg viewBox="0 0 126.644 96" width="21" height="15.75" aria-hidden="true">
      <path
        fill="#ffffff"
        d="M81.15,0c-1.2376,2.1973-2.3489,4.4704-3.3591,6.794-9.5975-1.4396-19.3718-1.4396-28.9945,0-.985-2.3236-2.1216-4.5967-3.3591-6.794-9.0166,1.5407-17.8059,4.2431-26.1405,8.0568C2.779,32.5304-1.6914,56.3725.5312,79.8863c9.6732,7.1476,20.5083,12.603,32.0505,16.0884,2.6014-3.4854,4.8998-7.1981,6.8698-11.0623-3.738-1.3891-7.3497-3.1318-10.8098-5.1523.9092-.6567,1.7932-1.3386,2.6519-1.9953,20.281,9.547,43.7696,9.547,64.0758,0,.8587.7072,1.7427,1.3891,2.6519,1.9953-3.4601,2.0457-7.0718,3.7632-10.835,5.1776,1.97,3.8642,4.2683,7.5769,6.8698,11.0623,11.5419-3.4854,22.3769-8.9156,32.0509-16.0631,2.626-27.2771-4.496-50.9172-18.817-71.8548C98.9811,4.2684,90.1918,1.5659,81.1752.0505l-.0252-.0505ZM42.2802,65.4144c-6.2383,0-11.4159-5.6575-11.4159-12.6535s4.9755-12.6788,11.3907-12.6788,11.5169,5.708,11.4159,12.6788c-.101,6.9708-5.026,12.6535-11.3907,12.6535ZM84.3576,65.4144c-6.2637,0-11.3907-5.6575-11.3907-12.6535s4.9755-12.6788,11.3907-12.6788,11.4917,5.708,11.3906,12.6788c-.101,6.9708-5.026,12.6535-11.3906,12.6535Z"
      />
    </svg>
  );
}

// Meta's own "Secondary Logo" asset (meta.com/brand/resources/facebook/logo)
// — one path that traces the circle's own outer edge and the "f" together,
// so filling it white over a blue backing circle leaves the "f" as a hole
// the blue shows through, rather than a separate letterform drawn on top.
// The chip below supplies that backing circle in Facebook's own blue.
export function FacebookIcon(): ReactElement {
  return (
    <span className="sign-in-panel__icon-chip sign-in-panel__icon-chip--facebook">
      <svg viewBox="0 0 500 499" width="24" height="24" aria-hidden="true">
        <path
          fill="#ffffff"
          fillRule="nonzero"
          d="M500,250c0,-138.071 -111.929,-250 -250,-250c-138.071,0 -250,111.929 -250,250c0,117.245 80.715,215.622 189.606,242.638l0,-166.242l-51.552,0l0,-76.396l51.552,0l0,-32.919c0,-85.092 38.508,-124.532 122.048,-124.532c15.838,0 43.167,3.105 54.347,6.211l0,69.254c-5.901,-0.621 -16.149,-0.932 -28.882,-0.932c-40.993,0 -56.832,15.528 -56.832,55.9l0,27.018l81.659,0l-14.028,76.396l-67.631,0l0,171.773c123.786,-14.951 219.713,-120.351 219.713,-248.169"
        />
      </svg>
    </span>
  );
}

// Microsoft's four-colour square mark, as published for "Sign in with
// Microsoft" buttons (Microsoft identity platform branding guidelines). No
// chip: it sits directly on the button's own white ground.
export function MicrosoftIcon(): ReactElement {
  return (
    <svg viewBox="0 0 21 21" width="18" height="18" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
