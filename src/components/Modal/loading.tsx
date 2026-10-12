import type { ReactElement } from 'react';

// What a route modal holds while the page that fills it is on its way
// (M9.18): a skeleton of a form, as a tab's panel holds a skeleton of its
// list (`TabbedPage/panel-loading.tsx`), so the modal opens on the press
// rather than after the page. Fields as label-and-box pairs and the row of
// buttons, as placeholder shapes with the same shimmer. The shapes are for
// the eye alone, `aria-hidden`; a screen reader hears the `<output>`, a
// status by its tag, saying the modal is loading.

const FIELDS = 4;

const ModalLoading = (): ReactElement => (
  <div className="modal-skeleton">
    <output className="visually-hidden">Loading</output>
    <div className="modal-skeleton__shapes" aria-hidden="true">
      {Array.from({ length: FIELDS }, (_, field) => (
        <div key={field} className="modal-skeleton__field">
          <span className="modal-skeleton__label" />
          <span className="modal-skeleton__box" />
        </div>
      ))}
      <div className="modal-skeleton__actions">
        <span />
        <span />
      </div>
    </div>
  </div>
);

export default ModalLoading;
