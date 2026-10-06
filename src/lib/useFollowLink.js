/* useFollowLink.js — act on a notifLink() result (see notifications.js).

   Kept apart from notifications.js so that module stays free of the router: its tests
   and the data hook don't need one. Every kit renders inside <Routes>, so useNavigate
   is available wherever a bell is. */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/** Returns `follow(link)`: our own paths stay in the app, another site opens in a new
 *  tab. Returns false when there was nowhere to go, so a caller can tell. */
export function useFollowLink() {
  const navigate = useNavigate();
  return useCallback((link) => {
    if (!link || !link.href) return false;
    if (link.external) window.open(link.href, '_blank', 'noopener,noreferrer');
    else navigate(link.href);
    return true;
  }, [navigate]);
}
