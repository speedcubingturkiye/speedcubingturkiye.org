# Speedcubing Türkiye: web sitesi

Türkiye'deki WCA yarışmalarını, ulusal sıralamaları, ilk yarışma rehberini ve organizasyon bilgilerini sunan site: https://speedcubingturkiye.org

Stack: Next.js 16 (App Router, ISR) · TypeScript · Tailwind v4 · next-intl (TR kökte, EN `/en/`) · MDX içerik (`next-mdx-remote`) · Vercel. Veritabanı yok; yarışma verisi WCA API'den sunucu tarafında, önbellekli okunur; sıralama verisi WCA sonuç dışa aktarımından her gün üretilir ve repodaki `data/rankings/` klasöründe durur (bkz. Sıralama verisi).

## Kurulum

```bash
pnpm install
cp .env.example .env.local   # anahtarları doldur (aşağıya bak); anahtarsız da çalışır
pnpm dev                     # http://localhost:3000
```

`pnpm dev` sonrası `http://localhost:3000/keystatic` görsel editörü yerel modda açar (girişsiz; dosyaları diskte düzenler). Canlıdaki panel her kaydı `main`'e `chore(content): update <yol>` (silmede `chore(content): delete <yol>`) mesajıyla commit'ler; bu Conventional Commits biçimi `patches/@keystatic__core@0.6.9.patch` yamasından gelir. Keystatic yükseltilirken yamayı yeni sürüm için yenile (`pnpm patch @keystatic/core@<sürüm>`).

Komutlar:

| Komut | Ne yapar |
|---|---|
| `pnpm dev` | Geliştirme sunucusu |
| `pnpm build` | Önce `prebuild` (içerik kontrolü), sonra `next build` |
| `pnpm start` | Build çıktısını sunar |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest (`lib/wca/status.test.ts`, `lib/announce.test.ts`) |
| `pnpm tsx scripts/check-content.ts` | TR/EN içerik eşleşme kontrolü (tek başına) |
| `pnpm typecheck`: `next typegen && tsc --noEmit` | TypeScript kontrolü |
| `MSYS_NO_PATHCONV=1 powershell -ExecutionPolicy Bypass -File scripts/smoke.ps1 -Paths /,/en` | start `next start` on :3010, print HTTP codes, stop it |

## İçerik modeli

Bütün metinler repo'da Markdown (MDX) dosyalarıdır; yayın = commit → Vercel deploy. Bir dosya **iki dilde de** olmak zorundadır; eksikse build durur.

```
content/tr/pages/<slug>.mdx     sayfa metinleri (Türkçe)
content/en/pages/<slug>.mdx     aynı slug, İngilizce
content/news/<slug>/index.yaml  haber verisi: iki dilde başlık ve özet, tarih, kategori
content/news/<slug>/tr.mdx      haber metni (Türkçe)
content/news/<slug>/en.mdx      haber metni (İngilizce)
content/home/slides.json         ana sayfa carousel slaytları (iki dil bir arada)
```

Dosya adı = URL. `content/tr/pages/yarismalar/sss.mdx` → `/yarismalar/sss` ve `/en/yarismalar/sss`. Elle yazılan slug'lar yalnızca küçük harf, rakam ve tire içerir; Türkçe karakter kullanılmaz. Haber klasörlerinin adı da aynı kurala uyar; cron WCA kimliğini küçük harfe çevirir (`yarisma-newageturkey2026`).

### Sayfa eklemek

1. `content/tr/pages/<slug>.mdx` ve `content/en/pages/<slug>.mdx` dosyalarını oluştur:

```mdx
---
title: "Sayfa başlığı"
description: "Bir cümlelik açıklama (arama motorları ve sayfa üstü)"
updated: "2026-09-25"
---

Metin buraya. Başlıklar için `##`, liste için `-`, tablo için GFM tablo sözdizimi.
```

2. Sayfayı bir rotaya bağla: `app/[locale]/<slug>/page.tsx` dosyasını `app/[locale]/kvkk/page.tsx` örneğinden kopyala ve `SLUG` sabitini değiştir. (Sayfa ailesi `/yarismalar/*` veya `/organizasyon/*` ise `SectionNav` ile birlikte kullanan örnekleri kopyala.)
3. Gerekirse `components/Footer.tsx` ve `app/sitemap.ts` içine bağlantı ekle.

### Haber veya ilan eklemek

En kolay yol görsel editör: `/keystatic` → Haberler (bkz. `docs/editor-kullanim.md`). Elle eklemek için `content/news/<slug>/` klasörü aç:

`index.yaml`:

```yaml
title: "Başlık (TR)"
titleEn: "Title (EN)"
description: "Listede görünen özet"
descriptionEn: "Summary shown in the list"
date: 2026-10-01
category: yarisma
auto: false
bulten: false
```

`tr.mdx` ve `en.mdx`: metinler (ön-bilgi yok).

- `<slug>` yalnız küçük harf, rakam ve tire (`lib/slug.ts` → `trSlug`); adres `/haberler/<slug>` olur.
- `category` şunlardan biri: `yarisma` (yarışma duyurusu), `topluluk`, `rekor`, `ilan` (resmi ilan; `/organizasyon/ilanlar` sayfasında da listelenir).
- `auto: true` yalnız cron'un ürettiği haberlerde bulunur ("otomatik" rozeti); cron `content/news/yarisma-<wca-id-küçük-harf>/` yazar.
- Rota gerekmez: haber otomatik olarak `/haberler/<slug>` adresinde ve RSS'te (`/haberler/rss.xml`, `/en/haberler/rss.xml`) yayımlanır.
- Elle yazarken metindeki `<` ve `{` karakterlerinin önüne ters eğik çizgi koy: `\<`, `\{` (editör de böyle kaydeder; MDX çıplak olanları etiket ya da kod sanır).

### Ana sayfa slaytları

`content/home/slides.json` tek dosyadır (iki dil bir arada) ve panelin yazdığı biçimdedir: `{ "slides": [ ... ] }`. Her öğe `{ "discriminant": "static", "value": { ... } }` ya da `{ "discriminant": "next-competition" }`:

- `static`: `id` (küçük harf, rakam, tire; benzersiz), `titleTr`/`titleEn` (en fazla 40 karakter), `leadTr`/`leadEn` (en fazla 160), `actions` (1–2 düğme: `labelTr`, `labelEn`, `href`, `variant: "solid" | "outline"`), isteğe bağlı `image` (`/images/slides/...`), `layout` (`mark | A | D | E | G | J`, varsayılan `mark`; `mark` dışında fotoğraf zorunlu), `focus` (`center | top | bottom | left | right`), `altTr`/`altEn`.
- `next-competition`: sıradaki yarışma WCA verisinden doldurulur; yaklaşan yarışma yoksa slayt gösterilmez. En fazla bir tane.

`href` öneksiz site yolu (`/en` otomatik eklenir) ya da `https://` ile tam adres (yeni sekmede açılır). Eksik ya da hatalı alan build'i dosya adı ve slayt numarasıyla durdurur (`lib/slides.ts`). Yerleşimler için bkz. `docs/editor-kullanim.md`.

### MDX içinde kullanılabilen bileşenler

Sayfalar ve haberler görsel editörde de düzenlenir (`/keystatic`); editör ham HTML tanımaz, bu yüzden MDX'te yalnız şu bileşenler kullanılır (derleme kontrolü başka bir etiketi ya da kaçışsız `{` karakterini reddeder):

- `<Details summary="Soru?"> ... </Details>`: açılır-kapanır SSS maddesi. İçerik ile etiketler arasında boş satır bırak.
- `<Callout title="Başlık" lang="en"> ... </Callout>`: vurgulu not kutusu; `title` ve `lang` isteğe bağlıdır (`lang`, kutu sayfanın dilinden farklıysa).
- `<DataController field="name" />` ya da `field="email"`: site ayarlarındaki KVKK veri sorumlusu.
- `<MdxLink href="/kvkk" locale="tr">metin</MdxLink>`: diğer dildeki sayfaya bağlantı.
- `<Anchor id="bulten" />`: başlığın hemen üstüne konan sayfa içi bağlantı hedefi (`/kvkk#bulten`).
- `<Lang code="en">Speedcubing</Lang>`: büyük harfe çevrilen bir başlıkta diğer dilden bir kelime (İ/I kuralı).
- İç bağlantıları her iki dilde de öneksiz yaz: `[SSS](/yarismalar/sss)`. `/en` öneki otomatik eklenir. Dış bağlantılar yeni sekmede açılır.
- Metinde `<` ya da `{` gerekiyorsa önüne ters eğik çizgi koy: `\<`, `\{` (editör de böyle kaydeder; çıplak olanları MDX etiket ya da kod sanır).

### İçerik kontrolü

`pnpm build` her seferinde `scripts/check-content.ts` çalıştırır (yerelde tek başına: `pnpm tsx scripts/check-content.ts`). Herhangi bir hata build'i durdurur; canlı site son iyi haliyle kalır. Kontroller: sayfaların TR/EN eşleşmesi; her sayfa, haber, slayt, arayüz metni, site ayarı ve galeri dosyasının editör şemasından (`keystatic.config.ts`, Keystatic okuyucusu) geçmesi; haberlerde iki dilde metin ve gerçek bir tarih; MDX gövdelerinde yalnız tanımlı bileşenler (ham HTML ve kaçışsız `{` yok); slayt kuralları (`lib/slides.ts`); arayüz metinlerinde aynı anahtar ağacı ve aynı yer tutucular; başvurulan her görsel ve belgenin var olması, görsellerin 5 MB'ı aşmaması. Hata mesajları Türkçedir ve dosya ile alanı söyler.

## Yapılandırma

`site.config.ts`: site adı ve URL'si, iletişim e-postası (kod). `content/site.json`: KVKK veri sorumlusu, topluluk kanalları (boş bırakılan kanal sitede görünmez), yönetim listesi (`board`, `boardUpdatedAt`) ve belgeler (`documents` → `/organizasyon/belgeler`); `content/gallery.json`: `/medya` galerisi. Bunlar ve arayüz metinleri (`messages/tr.json`, `messages/en.json`) görsel editörden düzenlenir (`/keystatic`, bkz. `docs/editor-kullanim.md`).

### Ortam değişkenleri (`.env.example`)

| Değişken | Kullanım |
|---|---|
| `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY` | Amazon SES erişim anahtarı (IAM kullanıcısı `speedcubingturkiye-web-ses`: yalnız `news@` adına gönderim ve `bulten` listesi); yalnız Production |
| `NEWSLETTER_SECRET` | Onay ve çıkış bağlantılarının şifreleme anahtarı (en az 32 karakter); değişirse eski maillerdeki çıkış bağlantıları çalışmaz; yalnız Production |
| `BULTEN_SECRET` | `/api/bulten/gonder` rotasının `Authorization: Bearer` anahtarı; GitHub'da yalnız `bulten` ortamında; yalnız Production |
| `BULTEN_KAPALI` | `1` ise elle bülten gönderimi kapalı (isteğe bağlı; değişiklik yeniden deploy'la geçerli olur) |
| `CONTACT_EMAIL` | Form mesajlarının gideceği adres (`info@speedcubingturkiye.org`) |
| `MAIL_FROM` | Gönderen adres (`news@speedcubingturkiye.org`; domain SES'te doğrulandı) |
| `CRON_SECRET` | `/api/cron/wca-check` rotasının `Authorization: Bearer` anahtarı |
| `GITHUB_TOKEN` | Cron'un haber dosyası commit'lemesi için fine-grained token (yalnız bu repo, `contents: read/write`) |
| `GITHUB_REPO` | `owner/repo` |
| `NEXT_PUBLIC_KEYSTATIC_REPO` | Görsel editörün commit atacağı repo (`owner/repo`); yalnız Production |
| `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET`, `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` | Keystatic GitHub App değerleri (kurulum sihirbazı verir); yalnız Production |

Geliştirmede SES anahtarları yoksa mailler gönderilmez, konsola yazılır (onay bağlantısı dahil); `NEWSLETTER_SECRET` yoksa geliştirmeye özel sabit bir anahtar kullanılır. `next dev` abonelere hiçbir zaman toplu mail göndermez: yerel cron çağrısı hep kuru çalışır (commit, mail ve silme yok) ve elle bülten rotası 503 döner; `.env.local`'da SES anahtarları varsa form, onay ve çıkış gerçek listeye yazar.

## E-posta ve bülten

Sitenin bütün mailleri Amazon SES'ten (ABD, Kuzey Virginia: `us-east-1`) `Speedcubing Türkiye <news@speedcubingturkiye.org>` adına gider; mailler hiçbir takip pikseli ve başka sunucudan görsel içermez.

- İletişim ve gönüllü formu: mesaj `info@` grubuna gider; "yanıtla" formu dolduran kişiye yazar.
- Bülten: form, SES'teki `bulten` listesine onay bekleyen bir kişi yazar ve formun dilinde onay maili yollar (aynı adrese 24 saatte bir). Onay bağlantısı (`/bulten/onay`, 7 gün geçerli) kişiyi dilinin konusuna (`tr` ya da `en`) abone eder; onaylanmayan adresler 7 gün sonra günlük cron'da silinir. Her mailin altındaki bağlantı `/bulten/cikis` sayfasını açar; Gmail ve Apple Mail'in kendi "Abonelikten çık" düğmesi `/api/bulten/cikis` ile tek tıkta çıkarır. Bağlantılardaki token AES-256-GCM ile şifrelidir; adres linkte görünmez.
- Otomatik duyuru: cron yeni yarışmanın haberini commit'ledikten sonra onaylı abonelere kendi dillerinde gönderir ve Türkçe kopyayı `info@`'ya yollar.
- Elle bülten: panelde bir haber "Bültenle gönder" işaretlenip kaydedilince `.github/workflows/bulten.yml` çalışır; `find` işi haberin dosyalarının özetini (SHA-256) alır, sitenin bu hali yayına girene kadar bekler ve ancak o zaman `bulten` ortamında onay ister (önizleme: `/bulten/onizleme/<adres>`). Onaylanınca `/api/bulten/gonder` özetle çağrılır; arada haber değiştiyse gönderim reddedilir (409 `changed`) ve düzenlenmiş hali yeniden onaya düşer. Gönderilen bültenler `content/newsletter-log.json`'a yazılır (aynı haber ikinci kez gitmez, günde en fazla bir bülten); `BULTEN_KAPALI=1` gönderimi durdurur. Onay, panelden gelen bültenler için ikinci göz kontrolüdür: repoya push edebilen biri (çalınmış bir panel token'ı dahil) Production anahtarlarıyla her şeyi yapabilir, bu yüzden yazma yetkisi dar tutulur (yayın kontrol listesi §3).
- Hız: saniyede en fazla 10 mail; her mailden sonra 100 ms beklenir. Bir gönderim Vercel'in 300 saniye sınırına sığmalı: SES'in yanıt süresine göre bu 850 ile 2.500 arası mail eder. Abone sayısı 800'ü geçmeden gönderimi bölmeyi planla. Aynı gün birden çok yarışma duyurusu aynı 300 saniyeyi paylaşır; yarıda kesilen bir gönderim yeniden denenmez.

## Sıralama verisi

Sıralama sayfaları (`/siralamalar`) veriyi repodaki `data/rankings/` klasöründen okur: `meta.json` (WCA dışa aktarımının tarihi ve format sürümü) ve her etkinlik ile tür için bir dosya (`single/333.json` gibi; her satır `[ulusal sıra, WCA ID, isim, sonuç]`). Türkiye'yi temsil eden herkes listededir; sayfada sayfa başına 25, 50, 100 ya da 500 kişi gösterilir ve "Sıramı bul" isim ya da WCA ID ile arar.

- Kaynak: WCA'nın resmi sonuç dışa aktarımı (Results Export v2, TSV). `pnpm data:rankings` son dışa aktarımın tarihine bakar; yeniyse zip'i (~378 MB) indirir, yalnızca `results` ve `persons` tablolarını açar ve dosyaları yazar. Tarih aynıysa hiçbir şey yapmaz.
- Kural: WCA'nın ulusal sıralamasıyla aynı. Türkiye'yi temsil ederken alınan sonuçlar sayılır (vatandaşlığını sonradan değiştiren biri Türkiye dönemindeki sonuçlarıyla listededir), her kişinin etkinlik başına en iyi tekli ve ortalaması alınır, eşit sonuçlar aynı sırayı paylaşır.
- Seçenekler: `--force` (tarih aynı olsa da işle), `--from-dir <klasör>` (açılmış bir dışa aktarımı kullan, indirme yok), `--out <klasör>` (başka bir klasöre yaz).
- Koruma: format ana sürümü 2 değilse, bir tablo ya da sütun eksikse veya 100 ve üzeri satırlı bir sıralama %10'dan fazla küçülürse betik hiçbir dosyaya dokunmadan hata verir.
- Günlük iş: `.github/workflows/daily-data.yml` her gün 06:00'da (TR) aynı komutu çalıştırır; veri değiştiyse `chore(data): update daily data - YYYY-MM-DD` commit'ini `main`'e atar ve bu normal bir Vercel deploy'u başlatır. Actions sekmesinden elle de çalıştırılabilir ("Run workflow").

## Marka dosyaları

`public/brand/`: `logo-long.svg` / `.png` (yatay), `logo-mark.svg` / `.png` (logomark), `logo-long-inverted.svg` ve `logo-mark-inverted.svg` (koyu zemin). Kaynak: marka kiti (`speedcubingturkiye_logo`, brand-identity.pdf v1.0). Renkler `app/globals.css` içinde tanımlıdır: kırmızı `#E30A17`, siyah `#1A1A1A`. Kullanım kuralları `/medya` sayfasındadır. `public/og.png` tek OG görselidir.

Diğer statik dosyalar: `public/docs/` (tüzük PDF'leri: `tuzuk-tr.pdf`, `tuzuk-en.pdf`; yüklenince `/organizasyon/tuzuk` bağlantıları otomatik aktifleşir) ve `public/galeri/` (galeri fotoğrafları: panelin Galeri bölümünden yüklenir ve `content/gallery.json`'a yazılır; alt yazı ve açıklama isteğe bağlıdır; liste boşken yer tutucu kareler görünür), `public/images/news/` ve `public/images/slides/` (haber ve slayt fotoğrafları, panelden yüklenir).

## Yayın

- GitHub `main` → Vercel production; her PR → preview. Build, `prebuild` içerik kontrolü ve TypeScript ile kapı görevi görür; ayrı CI yok (GitHub Actions günlük sıralama verisini günceller ve onaylanan bültenleri gönderir, bkz. Sıralama verisi ve E-posta ve bülten).
- Alan adları Vercel'de: `speedcubingturkiye.org` (canonical), `www` → apex, `speedcubingturkiye.com` → `.org` 301.
- Cron: `vercel.json` içindeki `/api/cron/wca-check` günde bir çalışır (Hobby plan sınırı), yeni WCA yarışmalarını haber olarak commit'ler, abonelere duyuru maili gönderir ve 7 günü geçmiş onaysız adresleri siler. Yerelde: `curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/wca-check?dry=1"`.
- Yayın öncesi: KVKK / çerez / görüntü bildirimi / güvenli ortam metinleri ekip onaylı; `content/site.json` doğru (veri sorumlusunun gerçek adı dahil); formlar canlıda denendi; `/haberler/rss.xml` ve `/en/…` sayfaları açılıyor.

### Geliştirme sunucusunda ilk istek

`pnpm dev` ile ilk açılışta seyrek olarak 500 görülebilir; bu, Turbopack'in sayfayı isteğe bağlı derlemesi sırasında ortaya çıkan geliştirme modu davranışıdır. 2026-09-26'da `pnpm build && pnpm start` ile soğuk başlangıçta eşzamanlı ilk isteklerle üç kez denendi ve üretim derlemesinde tekrarlamadı. Geliştirmede görürsen sayfayı yenilemen yeterlidir.

Env vars: `.env.example`.
