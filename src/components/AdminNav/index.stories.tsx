import type { Story } from '@ladle/react';
import type { ReactElement, ReactNode } from 'react';
import AdminNav from '.';
import './proposals.scss';

// Render-only; behaviour is asserted in tests/components/AdminNav. It takes
// no props: every admin sees the same entries. The workshop's `usePathname`
// stub answers `/admin/users` (.ladle/navigation.ts), so Users is the
// current page in every story. Each sits in the layout's real frame,
// `.admin-layout`.
export default {
  title: 'AdminNav',
};

const Frame = ({ children }: { children: ReactNode }): ReactElement => (
  <div className="admin-layout">{children}</div>
);

export const Default: Story = () => (
  <Frame>
    <AdminNav />
  </Frame>
);

// A phone's width, in each theme: today's wrapping row.
export const PhoneDark: Story = () => (
  <Frame>
    <AdminNav />
  </Frame>
);
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => (
  <Frame>
    <AdminNav />
  </Frame>
);
PhoneLight.meta = { theme: 'light', width: 375 };

// MB.115's open call on the nav at 375px (1d.4), side by side; the losing
// stories and `proposals.scss` are deleted at sign-off. The collapse of the
// whole nav is MB.122's, not this review's.

// A (recommended): the wrapping row with a `space(2) space(4)` gap, the
// current page underlined and set at weight 500, today's marker.
export const ProposalNavWrap: Story = () => (
  <Frame>
    <div className="admin-nav-proposal--tight">
      <AdminNav />
    </div>
  </Frame>
);
ProposalNavWrap.meta = { width: 375 };

// A with the marker drawn the other way: a pill on the card surface.
export const ProposalNavWrapPill: Story = () => (
  <Frame>
    <div className="admin-nav-proposal--tight admin-nav-proposal--pill">
      <AdminNav />
    </div>
  </Frame>
);
ProposalNavWrapPill.meta = { width: 375 };

// B: one row that scrolls sideways. Short, but most links start out of
// sight, a hidden sideways scroll the phone criterion argues against.
export const ProposalNavScroll: Story = () => (
  <Frame>
    <div className="admin-nav-proposal--scroll">
      <AdminNav />
    </div>
  </Frame>
);
ProposalNavScroll.meta = { width: 375 };

// C's three groups, the cut the `/admin` index's table of contents uses too.
// Categories and their groups sit with the compendium, whose entries they
// classify; forms, planets, signs and deities are the vocabularies an entry
// names; users and the ledger are people.
const GROUPS: readonly { name: string; links: readonly { href: string; label: string }[] }[] = [
  {
    name: 'Compendium',
    links: [
      { href: '/admin/compendium', label: 'Compendium' },
      { href: '/admin/categories', label: 'Categories' },
      { href: '/admin/category-groups', label: 'Category Groups' },
    ],
  },
  {
    name: 'Vocabularies',
    links: [
      { href: '/admin/forms', label: 'Forms' },
      { href: '/admin/form-groups', label: 'Form Groups' },
      { href: '/admin/planets', label: 'Planets' },
      { href: '/admin/zodiac-signs', label: 'Zodiac Signs' },
      { href: '/admin/deities', label: 'Deities' },
      { href: '/admin/deity-traditions', label: 'Deity Traditions' },
    ],
  },
  {
    name: 'People',
    links: [
      { href: '/admin/users', label: 'Users' },
      { href: '/admin/privilege-changes', label: 'Privilege Changes' },
    ],
  },
];

// C: grouped rows, each a `.link-row` named by its caption. Static markup:
// the component has no groups, and gains them only if this wins.
export const ProposalNavGrouped: Story = () => (
  <Frame>
    <nav aria-label="Admin">
      <div className="admin-nav-proposal__groups">
        {GROUPS.map(({ name, links }) => (
          <div key={name}>
            <p className="admin-nav-proposal__group-name" id={`admin-nav-group-${name}`}>
              {name}
            </p>
            <ul className="link-row" aria-labelledby={`admin-nav-group-${name}`}>
              {links.map(({ href, label }) => (
                <li key={href}>
                  <a href={href} aria-current={label === 'Users' ? 'page' : undefined}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  </Frame>
);
ProposalNavGrouped.meta = { width: 375 };

// D (not recommended): a jump menu, one select whose choice opens its page.
// It needs JavaScript to move on a choice, and hides every other page
// behind a press. Static markup: choosing does nothing here.
export const ProposalNavJumpMenu: Story = () => (
  <Frame>
    <nav aria-label="Admin">
      <div className="field">
        <label className="field__label" htmlFor="admin-nav-jump">
          Admin Page
        </label>
        <select id="admin-nav-jump" className="select" defaultValue="/admin/users">
          {GROUPS.flatMap(({ links }) => links).map(({ href, label }) => (
            <option key={href} value={href}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </nav>
  </Frame>
);
ProposalNavJumpMenu.meta = { width: 375 };
