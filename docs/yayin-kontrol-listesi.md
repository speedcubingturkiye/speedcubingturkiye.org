# Yayın kontrol listesi (v1.0.0)

Bu doküman, siteyi canlıya almak için insan tarafından elle yapılması gereken adımların Türkçe, sırayla uygulanabilir halidir. Hiçbir adım otomatik değildir; kod tarafında yapılacak bir şey yoktur; hepsi DNS (Porkbun), Google Workspace, Amazon SES (AWS), GitHub ve Vercel panellerinde veya terminalde çalıştırılır. Adımları sırayla, kutucukları işaretleyerek ilerleyin; bir adımı atlarsanız sonraki adımların doğrulamaları başarısız olabilir.

Domainler: `speedcubingturkiye.org` (asıl), `speedcubingturkiye.com` (yönlendirme). Repo: bu repo (branch `main`).

---

## 1. Google Workspace: `info@` adresi

E-posta Google Workspace'te. DNS kayıtları (şu an Porkbun'da) hazır: MX `smtp.google.com`, SPF `v=spf1 include:_spf.google.com ~all`, DKIM `google._domainkey`, DMARC `v=DMARC1; p=quarantine`.

- [ ] Yönetici konsolunda `info@speedcubingturkiye.org` adresini bir grup (formları görecek 2-3 kişi) ya da bir kullanıcının alias'ı olarak aç. Sitedeki iletişim ve gönüllü formları bu adrese gelir (`CONTACT_EMAIL`), KVKK başvuruları da (`dataController.email`). Grubun erişim ayarında "Yayın paylaşabilenler" satırında **Harici** işaretli olsun, yoksa dışarıdan gelen mailler (form bildirimleri dahil) geri döner; gruba yalnızca davet edilenler katılabilsin.
- [ ] Sitenin gönderen adresi `news@speedcubingturkiye.org` (`MAIL_FROM`): bunu info@ grubuna **alias** olarak ekle. Duyurulara ve bültene gelen cevaplar zaten info@'ya yönlenir; alias, doğrudan news@ adresine yazılanların kaybolmamasını sağlar.
- [ ] Yönetici konsolu → Uygulamalar → Google Workspace → Gmail → **E-posta kimliğini doğrula**: DKIM "kimlik doğrulaması yapılıyor" durumunda olmalı (DNS kaydı var; durum farklıysa **Kimlik doğrulamayı başlat**'a bas).
- [ ] **Doğrulama:** Kişisel bir hesaptan `info@speedcubingturkiye.org` adresine bir mail at; grubun üyelerine (ya da alias'ın sahibine) düşmeli.

## 2. Amazon SES: anahtar, liste, production access

SES kurulumu (ABD, Kuzey Virginia `us-east-1`; domain doğrulaması, DKIM) 2026-09-29'da yapıldı; kalanlar:

- [ ] IAM → Users → **Create user** `speedcubingturkiye-web-ses` (konsol erişimi yok) → **Add permissions → Create inline policy → JSON** ve aşağıdakini yapıştır (`<HESAP_NO>` = sağ üstteki 12 haneli hesap numarası):
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      { "Sid": "SendAsNewsOnly", "Effect": "Allow", "Action": "ses:SendEmail", "Resource": "arn:aws:ses:us-east-1:<HESAP_NO>:identity/*", "Condition": { "StringEquals": { "ses:FromAddress": "news@speedcubingturkiye.org" } } },
      { "Sid": "NewsletterList", "Effect": "Allow", "Action": ["ses:CreateContact", "ses:GetContact", "ses:UpdateContact", "ses:DeleteContact", "ses:ListContacts"], "Resource": "arn:aws:ses:us-east-1:<HESAP_NO>:contact-list/bulten" }
    ]
  }
  ```
- [ ] Kullanıcı → **Security credentials → Create access key** ("Application running outside AWS") → iki değeri doğrudan Vercel'e gir (§4): `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY`. Hiçbir yere yapıştırma, e-postayla gönderme.
- [ ] AWS CloudShell'i Kuzey Virginia'da (`us-east-1`) aç ve bülten listesini oluştur:
  ```
  aws sesv2 create-contact-list --region us-east-1 --contact-list-name bulten \
    --topics TopicName=tr,DisplayName=Turkce,DefaultSubscriptionStatus=OPT_OUT \
    TopicName=en,DisplayName=English,DefaultSubscriptionStatus=OPT_OUT
  ```
- [ ] **Doğrulama:** `aws sesv2 get-contact-list --region us-east-1 --contact-list-name bulten` iki konuyu (`tr`, `en`) göstermeli.
- [ ] **Engelleme listesi:** `aws sesv2 get-account --region us-east-1` çıktısında `SuppressionAttributes.SuppressedReasons` hem `BOUNCE` hem `COMPLAINT` içermeli (KVKK metni, geri dönen ve şikâyet bildiren adreslerin bu listede tutulduğunu söylüyor). Eksikse: `aws sesv2 put-account-suppression-attributes --region us-east-1 --suppressed-reasons BOUNCE COMPLAINT`.
- [ ] **Yapılandırma seti:** `aws sesv2 get-email-identity --region us-east-1 --email-identity speedcubingturkiye.org` çıktısında `ConfigurationSetName` olmamalı (bir yapılandırma seti takip ekleyebilir ve IAM politikası onu kapsamıyor). Varsa kaldır: `aws sesv2 put-email-identity-configuration-set-attributes --region us-east-1 --email-identity speedcubingturkiye.org`.
- [ ] İki gizli değer üret (Git Bash) ve Vercel'e gir (§4); `BULTEN_SECRET`'ı GitHub'a da gir (§3):
  ```
  node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"   # NEWSLETTER_SECRET
  node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"   # BULTEN_SECRET
  ```
- [ ] Site canlı adresine kavuşunca (§4 sonrası) SES → **Account dashboard → Request production access**: Mail type **Marketing**, website `https://speedcubingturkiye.org`, kullanım açıklaması (Claude'dan metni iste: çift onay, tek tıkla çıkış, engelleme listesi, düşük hacim). Onay gelene kadar SES yalnız doğrulanmış adreslere ve `speedcubingturkiye.org` adreslerine gönderir.

## 3. GitHub fine-grained token, cron secret ve bülten onay ortamı

- [ ] GitHub → **Settings → Developer settings → Fine-grained tokens → Generate new token**:
  - Repository access: **yalnızca bu repo**.
  - Permissions → **Contents: Read and write**.
  - Expiration: 1 yıl; takvime "token'ı yenile" hatırlatıcısı koy.
  - Token'ı sahibi olan GitHub hesabı, Vercel projesini import eden hesapla **aynı** olmalı (Vercel Hobby planında private repo'larda commit-author kısıtı var).
  - → `GITHUB_TOKEN`.
- [ ] Cron secret üret:
  ```
  node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
  ```
  → `CRON_SECRET`.
- [ ] GitHub → repo → **Settings → Environments → New environment** `bulten`. Bunu `.github/workflows/bulten.yml`'ı içeren ilk push'tan **önce** yap: GitHub, iş akışında adı geçen ama olmayan bir ortamı korumasız olarak kendisi açar. Ayarlar: **Required reviewers**: bültenleri onaylayacak 1-2 kişi; isteğe bağlı **Prevent self-review** (işi başlatan kişi kendi çalıştırmasını onaylayamaz; bu çoğu zaman haberi kaydeden kişidir ama her zaman değil: başka birinin kaydı ya da elle **Run workflow** da çalıştırma başlatır); **Deployment branches and tags → Selected branches and tags** → yalnız `main`; **Environment secrets → Add secret** `BULTEN_SECRET` (§2'de üretilen değer). `BULTEN_SECRET`'ı asla repo düzeyindeki Actions secrets'a ekleme. Deponun ilk push'u da buna dahil: iş akışı dosyasını ve `content/news` klasörünü birlikte getirir.
- [ ] Yazma yetkisi yalnız birkaç editörde olsun ve hepsinde iki adımlı doğrulama (2FA) açık olsun. Repoya push edebilen biri (çalınmış bir panel token'ı dahil) main'e kod gönderebilir; Vercel bu kodu Production anahtarlarıyla derler. Onay kapısı panelden gelen bültenler için ikinci göz kontrolüdür, bu yola karşı bir engel değildir.
- [ ] Keystatic GitHub App'in izinleri yalnız şunlar olsun: Contents **Read and write**, Metadata **Read**, Pull requests **Read**. Workflows, Administration, Secrets ya da Environments iznini asla ekleme. Kullanıcı token'larının süresinin dolması (**Expire user authorization tokens**) açık kalsın: panel token'ı 8 saatte düşer.

## 4. Vercel projesi, ortam değişkenleri, domainler

- [ ] Vercel → **Add New Project** → GitHub reposunu import et; framework Next.js olarak algılanır; build komutuna dokunma (`pnpm build` zaten `prebuild` içerik kontrolünü çalıştırır); `.vercel.app` adresini almak için bir kere deploy et.
- [ ] **Settings → Functions → Fluid Compute** açık olmalı: cron ve `/api/bulten/gonder` 300 saniyeye kadar çalışır; Hobby planda bu süre yalnız Fluid Compute ile geçerli.
- [ ] **Settings → Environment Variables**. `CONTACT_EMAIL` ve `MAIL_FROM` Production **ve** Preview'a; `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY`, `NEWSLETTER_SECRET`, `BULTEN_SECRET`, `CRON_SECRET`, `GITHUB_TOKEN` ve `GITHUB_REPO` **yalnızca Production'a** (Preview deploy'ları `main`'e commit atabilecek, cron'u tetikleyebilecek ya da bülten listesinin tamamına toplu mail gönderebilecek yetki taşımamalı; cron zaten yalnız Production'da çalışır). Preview'da SES anahtarı bulunmadığından iletişim formu ve bülten aboneliği "gönderilemedi" (`send_failed`) hatası döner; bu beklenen bir davranıştır, hata değildir:
  - Production **ve** Preview:
    - `CONTACT_EMAIL=info@speedcubingturkiye.org`
    - `MAIL_FROM=news@speedcubingturkiye.org`
  - Yalnızca Production:
    - `SES_ACCESS_KEY_ID`
    - `SES_SECRET_ACCESS_KEY`
    - `NEWSLETTER_SECRET`
    - `BULTEN_SECRET`
    - `CRON_SECRET`
    - `GITHUB_TOKEN`
    - `GITHUB_REPO=<owner>/<repo>`
  - Değişkenleri ekledikten sonra **redeploy** et.
- [ ] `BULTEN_KAPALI` gibi bir ortam değişkeni yalnız yeni deploy'larda geçerli olur: değiştirdikten sonra **Deployments → Redeploy**.
- [ ] **Settings → Analytics** → Web Analytics'i etkinleştir.
- [ ] **Settings → Domains**:
  - `speedcubingturkiye.org` ekle → **primary** (canonical) yap.
  - `www.speedcubingturkiye.org` ekle → `speedcubingturkiye.org`'a yönlendir (308).
  - `speedcubingturkiye.com` ekle → `speedcubingturkiye.org`'a yönlendir.
  - `www.speedcubingturkiye.com` ekle → `speedcubingturkiye.org`'a yönlendir.
  - Vercel'in gösterdiği A/CNAME kayıtlarını DNS paneline (şu an Porkbun) ekle ve Porkbun'un varsayılan park kayıtlarını (kökteki A kayıtları, `www` ve `*` için `pixie.porkbun.com` CNAME'leri) kaldır. MX, SPF, DKIM ve DMARC kayıtlarına dokunma.
- [ ] **Settings → Cron Jobs** → `vercel.json` üzerinden `/api/cron/wca-check` işinin `0 9 * * *` planıyla listelendiğini doğrula.
- [ ] **Doğrulama** (Git Bash):
  ```
  curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://www.speedcubingturkiye.org/
  curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://speedcubingturkiye.com/yarismalar
  curl -s -o /dev/null -w "%{http_code}\n" https://speedcubingturkiye.org/
  curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://speedcubingturkiye.org/wca
  ```
  Beklenen: `308 https://speedcubingturkiye.org/`, `308 https://speedcubingturkiye.org/yarismalar` (301 de kabul), `200`, `307 https://www.worldcubeassociation.org/competitions?region=Turkey`.

## 5. hreflang, 404, sitemap kontrolü (canlıda)

```
curl -s https://speedcubingturkiye.org/siralamalar | grep -o -i 'hreflang="[^"]*" href="[^"]*"'
curl -s -o /dev/null -w "%{http_code}\n" https://speedcubingturkiye.org/boyle-bir-sayfa-yok
curl -s -o /dev/null -w "%{http_code}\n" https://speedcubingturkiye.org/en/yarismalar/DoesNotExist9999
curl -s https://speedcubingturkiye.org/sitemap.xml | grep -c '<loc>'
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" https://speedcubingturkiye.org/og.png
```

- [ ] Üç `hreflang` satırı görünmeli (`tr`, `en`, `x-default`).
- [ ] Olmayan sayfa → `404`.
- [ ] Olmayan yarışma id'si → `404`.
- [ ] Sitemap'teki `<loc>` sayısı ≥ 19.
- [ ] `og.png` → `200 image/png`.

## 6. Lighthouse ≥ 90 (`/` ve `/yarismalar`)

```
npx lighthouse https://speedcubingturkiye.org/ --only-categories=performance,accessibility,seo --preset=desktop --quiet --chrome-flags="--headless" --output=json --output-path=./lh-home.json
npx lighthouse https://speedcubingturkiye.org/yarismalar --only-categories=performance,accessibility,seo --quiet --chrome-flags="--headless" --output=json --output-path=./lh-yarismalar.json
node -e "for (const f of ['lh-home.json','lh-yarismalar.json']) { const c = require('./' + f).categories; console.log(f, Object.values(c).map(x => x.id + '=' + Math.round(x.score * 100)).join(' ')) }"
```

- [ ] Her iki dosyada da (ikinci koşu mobil emülasyonludur) her skor ≥ 90.
- [ ] `lh-home.json` ve `lh-yarismalar.json` dosyalarını sil; repoya commit etme.

## 7. Canlı form testi

- [ ] `https://speedcubingturkiye.org/iletisim` sayfasından konu "Genel" ile gerçek bir mesaj gönder.
- [ ] Ekranda yeşil başarı metni görünmeli.
- [ ] Bir dakika içinde `info@` kutusuna (Google Workspace), gönderen `Speedcubing Türkiye <news@speedcubingturkiye.org>`, konu `[genel] <isim>` olan bir mail düşmeli; mail'e "yanıtla" formda yazılan adrese gitmeli.

## 8. Canlı bülten testi (production access sonrası)

- [ ] `https://speedcubingturkiye.org/en` sayfasından yeni bir adresle abone ol; ekranda "Almost done: click the confirmation link in your inbox." görünmeli.
- [ ] İngilizce onay maili gelmeli; bağlantı `https://speedcubingturkiye.org/en/bulten/tesekkurler` sayfasına düşmeli.
- [ ] CloudShell: `aws sesv2 get-contact --region us-east-1 --contact-list-name bulten --email-address <adres>` konu `en` için `OPT_IN` göstermeli.
- [ ] Aynı adresle 24 saat içinde tekrar abone ol: ikinci onay maili gelmemeli, ekranda yine başarı metni görünmeli.
- [ ] Bir duyuru ya da bülten geldikten sonra alttaki "Unsubscribe" bağlantısı `/en/bulten/cikis` sayfasını açmalı; düğmeye basınca `get-contact` artık NotFound dönmeli. Gmail'in üstteki "Abonelikten çık" düğmesiyle de dene.

## 9. Cron kuru çalıştırma (production)

```
export CRON_SECRET='<production değeri>'   # Git Bash; aynı shell'i sıradaki iki satır için de kullan
curl -s -o /dev/null -w "%{http_code}\n" https://speedcubingturkiye.org/api/cron/wca-check
curl -s -H "Authorization: Bearer $CRON_SECRET" "https://speedcubingturkiye.org/api/cron/wca-check?dry=1"
```

- [ ] Secret olmadan istek → `401`.
- [ ] Secret ile `?dry=1` → `{"dry":true,"announced":[...],"skipped":N,"failed":[],"wcaUnavailable":false,"pendingRemoved":0}`; `announced` listesindeki her id için `main` üzerinde `content/news/yarisma-<id>/index.yaml` **olmamalı** (henüz duyurulmamış olmalılar).
- [ ] Liste boş değilse ve takım bu yarışmaların şimdi duyurulmasını istiyorsa, `?dry=1` **olmadan** bir kere çalıştır ve şunları doğrula:
  - `main` üzerinde her id için üç yeni commit (`chore(news): auto-announce <id>`): `content/news/yarisma-<id>/tr.mdx`, `en.mdx`, en son `index.yaml`.
  - Vercel'de yeni bir production deploy tetiklenmiş.
  - Haber `/haberler/yarisma-<id>` adresinde görünüyor.
  - `info@` grubuna duyurunun Türkçe kopyası düştü; yanıtta `pendingRemoved` -1 değil.

## 9b. Elle bülten testi

- [ ] Panelde bir test haberi yaz, "Bültenle gönder"i işaretle, **Save**.
- [ ] GitHub → **Actions → Newsletter**: `find` işi sitenin bu hali yayına girene kadar birkaç dakika bekler ve özetinde önizleme bağlantılarını gösterir; ardından `send` işi onay ister. Önizlemeyi aç, **Review deployments → Approve**.
- [ ] Birkaç dakika içinde abonelere ve `info@`'ya mail gelmeli; `main`'de `chore(newsletter): start <adres>` ve `chore(newsletter): sent <adres>` commit'leri ve `content/newsletter-log.json`'da sayılar görünmeli.
- [ ] Aynı gün ikinci bir haberi işaretle: `send` işi 429 (günde bir sınırı) ile başarısız olmalı; ilk bültenden 24 saat sonra Actions'tan **Run workflow** ile tekrar çalıştır.
- [ ] Onay beklerken haberi değiştirip kaydet ve yeni sürüm yayına girince eski çalıştırmayı onayla: onaylanan iş bülteni göndermeden 409 `changed` ile bitmeli ve düzenlenmiş haber için yeni bir onay isteği gelmeli.
- [ ] Test haberini sil ya da kutusunu kaldır.

## 10. Takım onayı (yayın öncesi son kontrol)

Aşağıdakiler bu depoda **şu anda eksik veya boş**; yayından önce doldurulmalı/onaylanmalı:

- [ ] KVKK, çerez, görüntü bildirimi ve güvenli ortam metinleri (`content/{tr,en}/pages/kvkk.mdx`, `cerez-politikasi.mdx`, `organizasyon/goruntu-bildirimi.mdx`, `organizasyon/guvenli-ortam.mdx`) takım tarafından okunup onaylandı. KVKK §3 (aktarım) e-postanın Google Workspace'te tutulduğunu yazar; sağlayıcı değişirse iki dilde de güncelle. Form mesajlarını 1 yıl sonra silmek (KVKK §2 saklama süresi) takımın işidir.
- [ ] **`content/site.json` → `dataController.name` EKSİK.** Şu anki değer (`Speedcubing Türkiye Topluluk Yönetimi`) bir kurul adı, kişi değil; topluluğun tüzel kişiliği yok ve KVKK md. 3(1)(ı) veri sorumlusunun gerçek ya da tüzel kişi olmasını istiyor (spec §2: "topluluk temsilcisi (gerçek kişi)", §9: bu gelmeden site açılamaz). Ekipten veri sorumlusu temsilcisinin **ad soyadını** al ve panelde Site ayarları → Veri sorumlusu → Ad soyad alanına (ya da dosyaya) yaz; KVKK sayfası (TR/EN) ve her sayfanın footer'ı bu alanı gösterir. `dataController.email` doğruysa aynen kalabilir.
- [ ] `content/site.json` içindeki (panelde Site ayarları):
  - `channels` (şu an yalnız `instagram` dolu; kullanılmayacak kanallar boş kalabilir, kullanılacaklar doldurulmalı),
  - `board` (şu an **boş**: yönetim üyeleri eklenmeli, `boardUpdatedAt` de güncellenmeli),
  - `documents` (şu an **boş**: varsa yayınlanacak belgeler PDF olarak eklenmeli; dosyalar `public/docs/` altına gider)
  alanları takımla birlikte dolduruldu (`pnpm tsx scripts/check-content.ts` geçmeli).
- [ ] `public/docs/tuzuk-tr.pdf` ve `public/docs/tuzuk-en.pdf` **şu an repoda yok** (`public/docs/` içinde yalnızca `.gitkeep` var); tüzük PDF'lerinin ikisi de eklenmeli.
- [ ] Boş kalan kanallar footer'da gizli kalıyor mu, canlıda görsel olarak doğrula (`activeChannels()` boş olanları filtreliyor; kod tarafında ek iş yok).

Yukarıdaki beş madde (özellikle `dataController.name`) onaylanmadan/doldurulmadan devam etme.

## 11. Etiketleme ve yayın

Yerelde son bir doğrulama olarak:

```
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

hepsi geçmeli (bu depoda 2026-09-25 itibarıyla hepsi geçiyor).

- [ ] `CHANGELOG.md` içindeki `v1.0.0` tarihini gerçek yayın tarihiyle güncelle (gerekirse).
- [ ] `main` branch'inde, yukarıdaki tüm adımlar tamamlandıktan sonra:
  ```
  git tag -a v1.0.0 -m "v1.0.0: first public release"
  git push origin main --tags
  ```
- [ ] Vercel'in etiketli commit'i production deploy'u olarak build ettiğini doğrula.
- [ ] `git describe --tags` → `v1.0.0` yazdırmalı.

## 12. Görsel editör (Keystatic): tek seferlik kurulum (temiz push'tan sonra)

Panel canlıda GitHub hesabıyla çalışır (`/keystatic`). Keystatic'in GitHub App sihirbazı yalnız `pnpm dev` altında çalışır (canlıda, sırlar yokken panelin API'si hiç kurulmaz), bu yüzden App bir kez yerelde oluşturulur. Ortam değişkenleri **yalnızca Production**'a eklenir (Preview'da panel çalışmaz; bu istenen davranıştır).

- [ ] Yerelde, geçici olarak GitHub modu: `keystatic.config.ts` içindeki `storage:` satırını `storage: { kind: 'github', repo: '<owner>/<repo>' },` yap, `pnpm dev` çalıştır ve `http://127.0.0.1:3000/keystatic` aç; "Log in with GitHub" seni kurulum sihirbazına ("Keystatic Setup") götürür. "Deployed App URL" alanına `https://speedcubingturkiye.org` yaz (canlı sitenin giriş dönüş adresi de App'e eklenir), GitHub'da App'i oluştur ve bu repoya kur. Sihirbaz dört değeri yereldeki `.env` dosyasına yazar (`.env` git'e girmez).
- [ ] Geçici değişikliği geri al: `git checkout -- keystatic.config.ts`; `git status` temiz olmalı.
- [ ] Vercel → Settings → Environment Variables → **yalnızca Production**: `NEXT_PUBLIC_KEYSTATIC_REPO=<owner>/<repo>` ve `.env`'deki dört değer (`KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET`, `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`) ekle; **redeploy** et.
- [ ] **Doğrulama:** `/keystatic` → "Log in with GitHub" → giriş sonrası sol menüde Haberler, Ana sayfa, Sayfalar (TR), Sayfalar (EN), Arayüz metinleri, Site ayarları, Galeri görünmeli.
- [ ] Ekip arkadaşlarını GitHub'da repoya `write` yetkisiyle ekle (Settings → Collaborators); `/keystatic` adresinden GitHub ile girerler.
- [ ] Repoyu "Watch → All activity" yap: her commit ve pull request için bildirim gelir (güvenlik ağı).
- [ ] Ekip notu: `docs/editor-kullanim.md`. §2'deki taslak dalı ve pull request adımlarını ilk kez birlikte uygulayıp notu gerekirse düzelt (bu adımlar canlıda, GitHub modunda doğrulanır; yerel modda dal yoktur).

## 13. Günlük sıralama verisi (push'tan sonra)

`.github/workflows/daily-data.yml` her gün WCA sonuç dışa aktarımından `data/rankings/` klasörünü günceller ve veri değiştiyse `main`'e commit atar (README → Sıralama verisi).

- [ ] Repo → Settings → Actions → General: Actions açık; "Workflow permissions" bölümünde workflow'ların yazma izni kısıtlanmamış olmalı (gerekirse "Read and write permissions").
- [ ] `main` için "Require a pull request before merging" kuralı olmamalı: iş doğrudan `main`'e yazar (Keystatic de öyle).
- [ ] Actions → "Daily data" → "Run workflow". Veri zaten güncelse iş "Veri güncel" yazıp commit atmadan biter; bu da başarılıdır. Veri değiştiğinde `chore(data): update daily data - YYYY-MM-DD` commit'i ve ardından Vercel deploy'u görülür. Bot commit'inin deploy'u Vercel'de başlamazsa (Hobby planında commit yazarı kısıtı), repo'nun herkese açık olduğunu kontrol et; gerekirse workflow'daki `user.name` ve `user.email` satırlarını Vercel hesabı sahibinin GitHub kimliğiyle değiştir.
- [ ] Ertesi gün zamanlanmış çalışmanın (06:00 TR) Actions geçmişinde yeşil olduğunu kontrol et. Hata olursa GitHub e-postayla bildirir; site son commit'lenen veriyle çalışmaya devam eder.

## 14. Sızıntı şüphesinde

- [ ] Keystatic uygulamasının yetkisini geri al (GitHub → **Settings → Applications → Authorized GitHub Apps → Revoke**).
- [ ] SES erişim anahtarını, `BULTEN_SECRET`, `GITHUB_TOKEN` ve `CRON_SECRET`'ı yenile (Vercel ve GitHub'daki değerlerle birlikte), sonra **Redeploy**.
- [ ] `NEWSLETTER_SECRET`'ı yalnız kendisi sızdıysa yenile: değişirse eski maillerdeki çıkış bağlantıları çalışmaz.
