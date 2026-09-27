// lib/wca/city.ts: pure, no I/O
/** The 81 provinces in Turkish spelling (spec §7). WCA data often carries the ASCII form ("Istanbul", "Izmir"). */
const PROVINCES = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin',
  'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur',
  'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan',
  'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkâri', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul',
  'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kilis', 'Kırıkkale', 'Kırklareli',
  'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş',
  'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Şanlıurfa', 'Siirt', 'Sinop',
  'Şırnak', 'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat',
  'Zonguldak',
]

/** NFKD-normalize, strip combining marks and lowercase with the 'en' locale (avoids Turkish locale's dotless-I case quirk). */
function foldCase(s: string): string {
  // NFKD splits İ/Ş/Ğ/Ç/Ö/Ü/â into base letter + mark; the mark-strip regex below then removes it.
  return s.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('en')
}

/** Accent- and case-insensitive key: 'İstanbul', 'Istanbul', 'ISTANBUL' → 'istanbul'; 'Diyarbakır' → 'diyarbakir'. */
function key(s: string): string {
  // Dotless ı has no NFKD decomposition, so map it by hand (order vs. foldCase's lowercasing doesn't matter: ı is already lowercase).
  return foldCase(s).replace(/ı/g, 'i')
}

const BY_KEY = new Map(PROVINCES.map((p) => [key(p), p]))

/** Turkish spelling for every comma-separated part that is a province; other parts are kept as they are. */
export function displayCity(raw: string): string {
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .map((part) => BY_KEY.get(key(part)) ?? part)
    .join(', ')
}
