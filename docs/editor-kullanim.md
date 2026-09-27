# Görsel editör: ekip için kullanım notu

Adres: canlı sitede `https://speedcubingturkiye.org/keystatic`. Giriş GitHub hesabınla ("Log in with GitHub" düğmesi). Repoya yazma yetkin yoksa panel "You don't have permission to write to this repo" der; Kutay'a yaz.

Sol menü: Haberler, Ana sayfa, Sayfalar (TR), Sayfalar (EN), Arayüz metinleri, Site ayarları, Galeri. Alan adları ve açıklamalar Türkçedir; Keystatic'in kendi düğmeleri İngilizce kalır: **Save** (kaydet; her kayıt bir commit), **Create** (yeni kayıt), **New branch** (yeni taslak dalı), **Create pull request** (onaya gönder), **Reset changes** (vazgeç), **Delete entry** (kaydı sil).

Bir dosyayı panelden ilk kez kaydettiğinde biçimi biraz değişebilir (liste işaretleri, girinti, tırnaklar); bu normaldir ve siteyi etkilemez.

## 1. Haber yazmak (doğrudan yayına)

1. Haberler → **Create**.
2. Başlık (TR) yaz; adres (slug) kendiliğinden oluşur (küçük harf, rakam, tire). Başlık (EN), Özet (TR/EN), Tarih ve Kategori doldur. "Otomatik duyuru" kutusunu işaretleme; o yalnız yarışma botu içindir.
3. Metin (TR) ve Metin (EN): ikisi de zorunlu. Fotoğraf için araç çubuğundaki görsel düğmesini kullan; dosya `public/images/news/` klasörüne yüklenir.
4. **Save**: değişiklik `main` dalına commit edilir; site yaklaşık 2 dakikada yenilenir.
5. Kontrol: `/haberler` listesi ve haberin sayfası (`/haberler/<adres>`, İngilizcesi `/en/haberler/<adres>`).
6. Bülten olarak göndermek istersen (isteğe bağlı): kutu **Bültenle gönder**. Kaydettikten 2-3 dakika sonra mailin halini `/bulten/onizleme/<adres>` (İngilizcesi `/en/bulten/onizleme/<adres>`) adresinde gör. Onaycılara GitHub'dan bildirim gider; biri onaylayınca abonelere kendi dillerinde gönderilir ve bir kopya `info@`'ya düşer. Aynı haber ikinci kez gitmez; günde en fazla bir bülten gönderilir. Gönderim başlamadan vazgeçmek için kutuyu kaldırıp kaydet. Onaycılar için: onay beklerken haber düzenlenirse bekleyen onay geçersiz olur (gönderim reddedilir) ve düzenlenmiş hali yeniden onaya düşer; önizlemeye onaydan hemen önce bak. Onay isteği, haberin bu hali sitede yayına girdikten sonra gelir. İçerik özeti haberin metnini ve ayarlarını kapsar, haberde kullanılan görselleri (`public/images/news`) kapsamaz: görsel değiştiyse önizlemeye yeniden bak. Gönderilmesini istemediğin bir onayı **Reject** ile kapat: bekleyen bir çalıştırma sıradakileri tutar. Aynı gün ikinci bir bülten onaya düşerse günde bir sınırı yüzünden iş 429 ile biter; ilk bültenden 24 saat sonra **Run workflow** ile yeniden başlat.

Silmek için haberin sayfasında sağ üstteki menüden **Delete entry**.

## 2. Diğer her şey: taslak dalı ve onay

Sayfalar, Ana sayfa (slaytlar), Arayüz metinleri ve Site ayarları önce bir taslak dalında değişir, sonra onaya gider (bölümlerin açıklamasındaki not). Adımlar (Keystatic'in arayüzünden; kurulumdan sonra canlıda bir kez birlikte deneriz):

1. Sol menünün üstündeki dal seçici "main" gösterir. **New branch** → dal adı ver (ör. `taslak/slayt-ekim`) → **Create**. Panel yeni dala geçer; adres `/keystatic/branch/<dal-adı>/...` olur.
2. Değişikliği yap → **Save**. Commit taslak dalına gider; canlı site değişmez.
3. Dal seçicinin yanında beliren **Create pull request** düğmesi GitHub'da yeni sekmede pull request sayfasını açar; orada **Create pull request**'e bas. Pull request açıldıktan sonra aynı yerde "Pull request #<numara>" bağlantısı görünür.
4. Vercel pull request'e bir önizleme bağlantısı ekler. Önizlemede formlar çalışmaz ("gönderilemedi" der); beklenen davranış.
5. Kutay GitHub'dan (mobilden de) inceler ve birleştirir. Birleşince canlı site yenilenir. Dal artık gereksizse dal seçicide **Delete branch** (dalı sil).

"This entry has been updated since it was opened" uyarısı görürsen sayfayı yenile ve değişikliği tekrar yap.

## 3. Ana sayfa slaytları

Ana sayfa → Slaytlar. Listedeki sıra ana sayfadaki sıradır. "Sıradaki yarışma" öğesi WCA verisinden kendiliğinden dolar; en fazla bir tane olur ve alanı yoktur.

Metin ve fotoğraf slaydı: Kimlik, Başlık (TR/EN, en fazla 40 karakter), Açıklama (TR/EN, en fazla 160), 1 ya da 2 düğme (adres `/yarismalar` gibi site içi yol ya da `https://` ile tam adres), Fotoğraf, Yerleşim, Fotoğraf odağı, Fotoğraf açıklaması.

| Yerleşim | Masaüstü | Telefon |
|---|---|---|
| Logo | Fotoğrafsız, bugünkü yerleşim (beyaz logo sağda) | Bugünkü |
| A | Yazı solda, fotoğraf bandın sağ %44'ünde, keskin kenar | Fotoğraf üstte, yazı altta |
| D | A gibi; fotoğrafın sol kenarı 45° sivri köşe | Fotoğraf üstte, alt kenarı V kesim |
| E | A gibi; fotoğraf kırmızı-siyah tonda | A'nın telefonu, fotoğraf tonlu |
| G | Tonlu fotoğraf tüm bantta, beyaz logo sağda, yazı fotoğrafın üstünde | Tonlu tam arka plan |
| J | Fotoğraf üstte tam genişlikte; kırmızı şeritte başlık solda, açıklama ve düğmeler sağda | Fotoğraf üstte, kırmızı alan altta |

Logo dışındaki yerleşimlerde fotoğraf zorunludur; yoksa derleme durur. Başlıklar büyük harfle gösterilir; A, D, E ve J'de daha küçük puntoyla. Çok uzun tek kelimelerden kaçın. Fotoğraf açıklaması boşsa fotoğraf süs sayılır (ekran okuyucu atlar).

Slaytlara yalnızca organizasyonun kendi çektiği fotoğrafları koy; başka birinin fotoğrafını kullanmak istiyorsan önce Kutay'a sor.

## 4. Sayfalar

Sayfalar (TR) ve Sayfalar (EN): her sayfa iki dilde ayrı kayıttır; ikisini de güncelle. Metni değiştirdiysen "Güncelleme tarihi"ni de değiştir; sayfada "Son güncelleme" olarak görünür. Yeni sayfa panelden açılmaz (rota ve menü ister; Kutay'a yaz).

Metin düzenleyicide başlık (2. ve 3. düzey), kalın, italik, liste, tablo, bağlantı ve şu kutular var: Açılır kutu (SSS maddesi), Not kutusu (isteğe bağlı başlık ve dil), Veri sorumlusu (ad ya da e-posta), Çapa (başlığın üstüne konan sayfa içi bağlantı hedefi), Kelimenin dili ve Diğer dildeki sayfaya bağlantı (seçili metne uygulanır).

## 5. Arayüz metinleri, site ayarları, galeri

Arayüz metinleri (TR) ve (EN): menü, düğme, form ve hata metinleri. Süslü parantezli yer tutucuları (`{date}` gibi) silme ya da çevirme. Anahtar eklemek ya da silmek kod ister.

Site ayarları: kanallar (boş bırakılan kanal sitede görünmez; adres `https://` ile başlar), veri sorumlusu (yayından önce gerçek ad soyad), yönetim listesi ve güncelleme tarihi, belgeler (PDF `public/docs/` klasörüne yüklenir, `/organizasyon/belgeler` sayfasında listelenir).

Galeri: `/medya` sayfasındaki fotoğraflar; alt yazı (TR/EN) ve fotoğraf açıklaması (TR/EN) isteğe bağlı. Her dil kendi açıklamasını gösterir; o dilde açıklama boşsa fotoğraf süs sayılır (ekran okuyucu atlar).

## 6. Fotoğraf kuralları

- JPG ya da WebP, en fazla 2 MB önerilir; 5 MB üstü dosyada derleme durur.
- Yarışma fotoğrafları görüntü bildirimine tabidir; yüzü görünen çocukların fotoğraflarında aileden onay olduğundan emin ol.
- Haber fotoğraflarını yüklemeden önce yeniden adlandır: `ankara-open-2026-podyum.jpg` gibi küçük harf ve tire. Slayt ve galeri fotoğraflarında gerek yok; panel onları listedeki sıralarına göre kendisi adlandırır.
- Başkasının fotoğrafını (Wikimedia, basın, sosyal medya) izinsiz kullanma.

## 7. Metin kuralları

- İki dilde de aynı bilgi: TR'ye yazdığını EN'ye de yaz.
- Uzun tire (em dash) kullanma. Topluluktan "organizasyon" diye söz et; tüzel kişilik ima eden adlar (d ile başlayan o kelime) kullanma.

## 8. Bir şey ters giderse

- Derleme hatası: Vercel Kutay'a e-posta gönderir; canlı site son iyi haliyle kalır. Mesaj dosyayı ve alanı söyler, örneğin `content/home/slides.json: slayt 3: fotoğraf seçilmeden "D" yerleşimi kullanıyor`.
- Geri almak: her kayıt bir commit; GitHub'da commit'i geri al (Revert) ya da Kutay'a yaz.
- Panel açılmıyor: GitHub'dan çıkıp yeniden gir; sürerse Kutay'a yaz.

Geliştiriciler için: `pnpm dev` ile `http://localhost:<port>/keystatic` girişsiz açılır ve dosyaları doğrudan diskte düzenler (local mode); `pnpm tsx scripts/check-content.ts` derleme kontrolünü tek başına çalıştırır.
