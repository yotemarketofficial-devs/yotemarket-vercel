/* hubs.js — YoteMarket pickup-hub network (canonical list, like the category tree).
   Hubs are a fixed operational network defined by ops, not user-generated, so they
   live in code. Shoppers pick a default hub in their profile and can switch it at
   checkout; the chosen hub id + name are stamped on the order. */

export const HUBS = [
  { id: 'westlands', name: 'Westlands Hub', area: 'Mpaka Road · near Sarit Centre', town: 'Nairobi', location: { lat: -1.2635, lng: 36.8030 } },
  { id: 'cbd', name: 'CBD Hub', area: 'Moi Avenue · Nairobi CBD', town: 'Nairobi', location: { lat: -1.2841, lng: 36.8266 } },
  { id: 'kilimani', name: 'Kilimani Hub', area: 'Yaya Centre', town: 'Nairobi', location: { lat: -1.2925, lng: 36.7840 } },
  { id: 'karen', name: 'Karen Hub', area: 'Karen Crossroads', town: 'Nairobi', location: { lat: -1.3190, lng: 36.7060 } },
  { id: 'thika-road', name: 'Thika Road Hub', area: 'TRM Drive · Roysambu', town: 'Nairobi', location: { lat: -1.2190, lng: 36.8880 } },
  { id: 'eastlands', name: 'Eastlands Hub', area: 'Buruburu · Mumias Road', town: 'Nairobi', location: { lat: -1.2870, lng: 36.8770 } },
  { id: 'rongai', name: 'Ongata Rongai Hub', area: 'Maasai Mall', town: 'Kajiado', location: { lat: -1.3960, lng: 36.7450 } },
  { id: 'mombasa', name: 'Mombasa Hub', area: 'Nyali · City Mall', town: 'Mombasa', location: { lat: -4.0300, lng: 39.7000 } },
  { id: 'kisumu', name: 'Kisumu Hub', area: 'Mega Plaza', town: 'Kisumu', location: { lat: -0.0917, lng: 34.7680 } },
  { id: 'nakuru', name: 'Nakuru Hub', area: 'Westside Mall', town: 'Nakuru', location: { lat: -0.2870, lng: 36.0660 } },
];

export const DEFAULT_HUB_ID = 'westlands';
export const findHub = (id) => HUBS.find((h) => h.id === id) || null;
