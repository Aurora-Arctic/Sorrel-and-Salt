import type { Story } from '@ladle/react';
import type { ReactElement } from 'react';
import IngredientCard from '../src/components/IngredientCard';
import './ingredient-card-drawer.scss';

// MB.120, item 23: the card's drawer drawn from the `$drawer-*` tokens (right) beside the
// literals it replaced (left), at rest and forced open. The two columns should look identical;
// the story exists to show it, and is deleted at sign-off. Names are invented (M1.25).
export default {
  title: 'Pages / Ingredient Card Drawer',
};

const Card = ({ className }: { className: string }): ReactElement => (
  <div className={className}>
    <IngredientCard
      href="/compendium/ingredients/testwort"
      label="Testwort"
      formalName="Fixtura testalis"
      nomenclature="botanical"
      kind="compendium"
      variants={[{ form: 'Oil', formChoice: { group: { icon: 'botanical' } } }]}
    />
  </div>
);

const Drawers = (): ReactElement => (
  <div className="proposal-drawer">
    <Card className="proposal-drawer-as-built" />
    <Card className="" />
    <Card className="proposal-drawer-as-built proposal-drawer-open" />
    <Card className="proposal-drawer-open" />
  </div>
);

export const ProposalDrawerTokensDark: Story = () => <Drawers />;
ProposalDrawerTokensDark.meta = { theme: 'dark' };

export const ProposalDrawerTokensLight: Story = () => <Drawers />;
ProposalDrawerTokensLight.meta = { theme: 'light' };
