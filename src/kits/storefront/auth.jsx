/* auth.jsx — Storefront sign-in / sign-up. Thin wrapper over the shared
   <AuthPanel> so shoppers and merchants onboard through the exact same UI
   (see components/AuthPanel.jsx). The mall is open to guests, so this is a
   dismissible overlay and offers "continue as guest". Shoppers stay in the
   storefront; merchants/riders route to their app after sign-in. */
import React from 'react';
import AuthPanel, { ROLES } from '../../components/AuthPanel.jsx';

export { ROLES };

export function Auth({ onShopper, onGuest, onClose, overlay = false, theme, onTheme }) {
  return (
    <AuthPanel
      overlay={overlay}
      onClose={onClose}
      theme={theme}
      onTheme={onTheme}
      stayRole="shopper"
      showGuest
      onGuest={onGuest}
      onAuthed={onShopper}
    />
  );
}
