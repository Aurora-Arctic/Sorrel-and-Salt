import type { ReactElement } from 'react';
import type { AboutCardsProps } from './types';

// The About Us page's rows of cards, written once: AboutPillars and AboutRoles pass their row's class, which holds the row's
// styles (the shared grid is the `about-cards` mixin, `src/scss/_mixins.scss`), and each card's parts.
const AboutCards = ({ block, cards, quiet = false }: AboutCardsProps): ReactElement => (
  <ul className={block}>
    {cards.map(({ heading, text, icon, kicker, accent }) => {
      const iconMark = icon ? (
        <span className={`${block}__icon`} aria-hidden="true">
          {icon}
        </span>
      ) : null;
      const title = <h3 className={`${block}__heading`}>{heading}</h3>;
      return (
        <li
          key={heading}
          className={quiet ? `${block}__card card--quiet` : `${block}__card`}
          data-accent={accent}
        >
          {kicker === undefined ? (
            <div className={`${block}__top`}>
              {iconMark}
              {title}
            </div>
          ) : (
            <>
              <div className={`${block}__top`}>
                <span className="eyebrow">{kicker}</span>
                {iconMark}
              </div>
              {title}
            </>
          )}
          <p>{text}</p>
        </li>
      );
    })}
  </ul>
);

export default AboutCards;
