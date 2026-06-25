/* hubs.js — YoteMarket pickup-hub network (canonical list, like the category tree).
   Hubs are a fixed operational network defined by ops, not user-generated, so they
   live in code. Shoppers pick a default hub in their profile and can switch it at
   checkout; the chosen hub id + name are stamped on the order. */

export const HUBS = [
  { id: 'westlands', name: 'Westlands Hub', area: 'Mpaka Road · near Sarit Centre', town: 'Nairobi' },
  { id: 'cbd', name: 'CBD Hub', area: 'Moi Avenue · Nairobi CBD', town: 'Nairobi' },
  { id: 'kilimani', name: 'Kilimani Hub', area: 'Yaya Centre', town: 'Nairobi' },
  { id: 'karen', name: 'Karen Hub', area: 'Karen Crossroads', town: 'Nairobi' },
  { id: 'thika-road', name: 'Thika Road Hub', area: 'TRM Drive · Roysambu', town: 'Nairobi' },
  { id: 'eastlands', name: 'Eastlands Hub', area: 'Buruburu · Mumias Road', town: 'Nairobi' },
  { id: 'rongai', name: 'Ongata Rongai Hub', area: 'Maasai Mall', town: 'Kajiado' },
  { id: 'mombasa', name: 'Mombasa Hub', area: 'Nyali · City Mall', town: 'Mombasa' },
  { id: 'kisumu', name: 'Kisumu Hub', area: 'Mega Plaza', town: 'Kisumu' },
  { id: 'nakuru', name: 'Nakuru Hub', area: 'Westside Mall', town: 'Nakuru' },
];

export const DEFAULT_HUB_ID = 'westlands';
export const findHub = (id) => HUBS.find((h) => h.id === id) || null;
