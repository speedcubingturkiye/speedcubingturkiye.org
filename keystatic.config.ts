// keystatic.config.ts: the visual editor's schema (spec §3). Local mode edits the working tree (next dev); GitHub mode
// commits to NEXT_PUBLIC_KEYSTATIC_REPO (production). Every collection/singleton describes a file the site already reads,
// so the panel never becomes a second source of truth. (No em dash in this file: Task 10 greps it for one.)
import { createElement, Fragment } from 'react'
import { collection, config, fields, singleton, type ComponentSchema, type Singleton } from '@keystatic/core'
import { block, inline, mark, wrapper } from '@keystatic/core/content-components'
import { languagesIcon } from '@keystar/ui/icon/icons/languagesIcon'
import { linkIcon } from '@keystar/ui/icon/icons/linkIcon'
import { trSlug } from '@/lib/slug'
import { messagesSchema } from '@/lib/messages'
import {
  ACTIONS_MAX,
  DOCS_PREFIX,
  EMAIL_RE,
  FOCUS_OPTIONS,
  GALLERY_PREFIX,
  HREF_RE,
  LABEL_MAX,
  LAYOUT_OPTIONS,
  LEAD_MAX,
  NEWS_CATEGORIES,
  SLIDE_IMAGE_PREFIX,
  SLUG_RE,
  TITLE_MAX,
  WCA_ID_RE,
} from '@/lib/content-rules'
import { CHANNEL_KEYS, CHANNEL_LABELS } from '@/site.config'
import trMessages from './messages/tr.json'

/** Spec §4: pages, slides, UI strings and settings go through a draft branch and a pull request; news goes straight to main. */
export const APPROVAL_NOTE = 'Bu bölümü değiştirmeden önce taslak dalı aç ve onaya gönder.'

/** Spec §3.8: shown under every photo field. */
export const PHOTO_RULES =
  'JPG ya da WebP, en fazla 2 MB önerilir. Yarışma fotoğrafları görüntü bildirimine tabidir; yüzü görünen çocukların fotoğraflarında aileden onay olduğundan emin ol.'

const LOCALE_OPTIONS = [
  { label: 'Türkçe', value: 'tr' },
  { label: 'English', value: 'en' },
] as const

// News slugs, slide ids and anchor ids share one pattern and one message.
const SLUG_PATTERN = { regex: SLUG_RE, message: 'Yalnız küçük harf, rakam ve tire' }

// The site renders the same names (components/mdx-components.tsx). Anything else, raw HTML included, fails both in the
// editor ("Missing component definition") and in the build (lib/content-check.ts).
export const pageComponents = {
  Details: wrapper({
    label: 'Açılır kutu',
    description: 'Soru-cevap kutusu: başlığa tıklayınca içerik açılır (SSS, ebeveyn rehberi).',
    schema: { summary: fields.text({ label: 'Başlık', validation: { isRequired: true } }) },
    // The question above the answer, so the boxes on a page tell apart in the editor. Display only (the box's "Edit"
    // changes it): not editable, and skipped when the editor reads its DOM back, like Keystatic's own box header.
    ContentView: ({ value, children }) =>
      createElement(
        Fragment,
        null,
        createElement('div', { contentEditable: false, 'data-ignore-content': '', style: { fontWeight: 600, marginBottom: '0.75em' } }, value.summary),
        children,
      ),
  }),
  Callout: wrapper({
    label: 'Not kutusu',
    schema: {
      title: fields.text({ label: 'Başlık (isteğe bağlı)' }),
      lang: fields.select({
        label: 'Dil',
        description: 'Kutunun metni sayfanın dilinden farklıysa seç (büyük harf kuralı için).',
        options: [{ label: 'Sayfa dili', value: '' }, ...LOCALE_OPTIONS],
        defaultValue: '',
      }),
    },
  }),
  DataController: inline({
    label: 'Veri sorumlusu',
    description: 'Site ayarlarındaki veri sorumlusunun adını ya da e-postasını yazar.',
    schema: {
      field: fields.select({
        label: 'Alan',
        options: [
          { label: 'Ad soyad', value: 'name' },
          { label: 'E-posta', value: 'email' },
        ],
        defaultValue: 'name',
      }),
    },
  }),
  MdxLink: mark({
    label: 'Diğer dildeki sayfaya bağlantı',
    icon: linkIcon,
    tag: 'a',
    schema: {
      href: fields.text({
        label: 'Yol',
        description: 'Öneksiz site yolu, ör. /kvkk',
        validation: { isRequired: true, pattern: { regex: /^\//, message: '"/" ile başlamalı' } },
      }),
      locale: fields.select({ label: 'Dil', options: LOCALE_OPTIONS, defaultValue: 'tr' }),
    },
  }),
  Anchor: block({
    label: 'Çapa (sayfa içi bağlantı hedefi)',
    description: 'Başlığın hemen üstüne koy; bağlantı /sayfa#kimlik olur.',
    schema: {
      id: fields.text({
        label: 'Kimlik',
        validation: { isRequired: true, pattern: SLUG_PATTERN },
      }),
    },
  }),
  Lang: mark({
    label: 'Kelimenin dili',
    icon: languagesIcon,
    schema: { code: fields.select({ label: 'Dil', options: LOCALE_OPTIONS, defaultValue: 'en' }) },
  }),
}

/** The MDX pages (spec §3.4, without /topluluk for now): route slug and panel name. New pages need a route and a menu entry, so not from the panel. */
export const PAGES = [
  ['kvkk', 'KVKK'],
  ['cerez-politikasi', 'Çerez politikası'],
  ['medya', 'Medya'],
  ['organizasyon', 'Hakkımızda'],
  ['organizasyon/goruntu-bildirimi', 'Görüntü bildirimi'],
  ['organizasyon/guvenli-ortam', 'Güvenli ortam'],
  ['organizasyon/tuzuk', 'Tüzük'],
  ['yarismalar/ebeveynler-icin', 'Ebeveynler için'],
  ['yarismalar/ilk-yarismam', 'İlk yarışmam'],
  ['yarismalar/sss', 'SSS'],
  ['bulten/tesekkurler', 'Bülten teşekkür sayfası'],
] as const

/** Singleton key of a page: page + Tr/En + PascalCase slug, e.g. pageTrYarismalarSss (used in the panel's URLs). */
export function pageKey(locale: 'tr' | 'en', slug: string): string {
  return `page${locale === 'tr' ? 'Tr' : 'En'}${slug.split(/[/-]/).map((p) => p[0].toUpperCase() + p.slice(1)).join('')}`
}

const pageSchema = {
  title: fields.text({ label: 'Başlık', description: APPROVAL_NOTE, validation: { isRequired: true } }),
  description: fields.text({ label: 'Açıklama', description: 'Sayfa üstünde ve arama motorlarında görünen bir cümle.' }),
  updated: fields.date({ label: 'Güncelleme tarihi', description: 'Metni değiştirdiysen tarihi güncelle.' }),
  body: fields.mdx({ label: 'Metin', components: pageComponents, options: { heading: [2, 3] } }),
}

const pageSingletons = Object.fromEntries(
  PAGES.flatMap(([slug, name]) =>
    (['tr', 'en'] as const).map((locale) => [
      pageKey(locale, slug),
      singleton({
        label: `${name} (${locale.toUpperCase()})`,
        path: `content/${locale}/pages/${slug}`,
        format: { contentField: 'body' },
        entryLayout: 'content',
        schema: pageSchema,
      }),
    ]),
  ),
)

// Both news bodies share one editor setup: photos go to public/images/news and are referenced as /images/news/<file>.
const newsBody = (label: string) =>
  fields.mdx({
    label,
    description: `Fotoğraf eklemek için araç çubuğundaki görsel düğmesini kullan. ${PHOTO_RULES}`,
    components: pageComponents,
    options: { heading: [2, 3], image: { directory: 'public/images/news', publicPath: '/images/news/' } },
  })

const slideAction = fields.object({
  labelTr: fields.text({ label: 'Yazı (TR)', validation: { isRequired: true, length: { max: LABEL_MAX } } }),
  labelEn: fields.text({ label: 'Yazı (EN)', validation: { isRequired: true, length: { max: LABEL_MAX } } }),
  href: fields.text({
    label: 'Adres',
    description: 'Site içi yol ("/" ile başlar, ör. /yarismalar) ya da https:// ile tam adres.',
    validation: { isRequired: true, pattern: { regex: HREF_RE, message: '"/" ile başlamalı ya da https:// ile tam adres olmalı' } },
  }),
  variant: fields.select({
    label: 'Görünüm',
    options: [
      { label: 'Dolu (beyaz)', value: 'solid' },
      { label: 'Çerçeveli', value: 'outline' },
    ],
    defaultValue: 'solid',
  }),
})

// A photo's description for screen readers, one per language (slides and gallery); empty = decorative (alt="").
const photoAlt = {
  altTr: fields.text({ label: 'Fotoğraf açıklaması (TR)', description: 'Ekran okuyucular için; süs amaçlı fotoğrafta boş bırak.' }),
  altEn: fields.text({ label: 'Fotoğraf açıklaması (EN)' }),
}

// Field rules come from lib/content-rules.ts, as lib/slides.ts's do; the cross-field rules (photo required unless "mark",
// unique ids) run at build time.
const staticSlide = fields.object({
  id: fields.text({
    label: 'Kimlik',
    description: 'Benzersiz kısa ad; yalnız küçük harf, rakam ve tire (ör. ilk-yarisma).',
    validation: { isRequired: true, pattern: SLUG_PATTERN },
  }),
  titleTr: fields.text({ label: 'Başlık (TR)', description: `En fazla ${TITLE_MAX} karakter; büyük harfle gösterilir.`, validation: { isRequired: true, length: { max: TITLE_MAX } } }),
  titleEn: fields.text({ label: 'Başlık (EN)', validation: { isRequired: true, length: { max: TITLE_MAX } } }),
  leadTr: fields.text({ label: 'Açıklama (TR)', description: `En fazla ${LEAD_MAX} karakter.`, multiline: true, validation: { isRequired: true, length: { max: LEAD_MAX } } }),
  leadEn: fields.text({ label: 'Açıklama (EN)', multiline: true, validation: { isRequired: true, length: { max: LEAD_MAX } } }),
  actions: fields.array(slideAction, {
    label: 'Düğmeler',
    description: `En az 1, en fazla ${ACTIONS_MAX}.`,
    itemLabel: (props) => props.fields.labelTr.value || 'Düğme',
    validation: { length: { min: 1, max: ACTIONS_MAX } },
  }),
  image: fields.image({
    label: 'Fotoğraf',
    description: `Logo yerleşimi dışında zorunlu. Slaytlara yalnızca organizasyonun kendi çektiği fotoğrafları koy; başka birinin fotoğrafını kullanmak istiyorsan önce Kutay'a sor. ${PHOTO_RULES}`,
    directory: 'public/images/slides',
    publicPath: SLIDE_IMAGE_PREFIX,
  }),
  layout: fields.select({ label: 'Yerleşim', description: 'Fotoğrafsız slayt için "Logo"; diğerleri fotoğraf ister.', options: LAYOUT_OPTIONS, defaultValue: 'mark' }),
  focus: fields.select({ label: 'Fotoğraf odağı', description: 'Fotoğraf kırpılırken korunan kenar.', options: FOCUS_OPTIONS, defaultValue: 'center' }),
  ...photoAlt,
})

const slidesSingleton = singleton({
  label: 'Ana sayfa slaytları',
  path: 'content/home/slides',
  format: { data: 'json' },
  schema: {
    slides: fields.array(
      fields.conditional(
        fields.select({
          label: 'Slayt türü',
          options: [
            { label: 'Metin ve fotoğraf', value: 'static' },
            { label: 'Sıradaki yarışma (WCA verisinden, otomatik)', value: 'next-competition' },
          ],
          defaultValue: 'static',
        }),
        { static: staticSlide, 'next-competition': fields.empty() },
      ),
      {
        label: 'Slaytlar',
        description: `${APPROVAL_NOTE} Buradaki sıra ana sayfadaki sıradır; "Sıradaki yarışma" en fazla bir kez.`,
        itemLabel: (props) => (props.discriminant === 'static' ? props.value.fields.titleTr.value || 'Slayt' : 'Sıradaki yarışma'),
        validation: { length: { min: 1 } },
      },
    ),
  },
})

const siteSingleton = singleton({
  label: 'Site ayarları',
  path: 'content/site',
  format: { data: 'json' },
  schema: {
    channels: fields.object(
      Object.fromEntries(
        CHANNEL_KEYS.map((key) => [
          key,
          fields.text({
            label: CHANNEL_LABELS[key],
            description: 'Boş bırakılan kanal sitede görünmez.',
            validation: { pattern: { regex: /^(https:\/\/\S+)?$/, message: 'https:// ile başlayan tam adres' } },
          }),
        ]),
      ) as Record<(typeof CHANNEL_KEYS)[number], ReturnType<typeof fields.text>>,
      { label: 'Kanallar', description: APPROVAL_NOTE },
    ),
    dataController: fields.object(
      {
        name: fields.text({
          label: 'Ad soyad',
          description: 'Yayından önce gerçek ad soyad girilmeli: KVKK md. 3(1)(ı) veri sorumlusunun gerçek ya da tüzel kişi olmasını ister; bir kurul adı yayına çıkamaz.',
          validation: { isRequired: true },
        }),
        email: fields.text({
          label: 'E-posta',
          validation: { isRequired: true, pattern: { regex: EMAIL_RE, message: 'Geçerli bir e-posta gir' } },
        }),
      },
      { label: 'Veri sorumlusu (KVKK)' },
    ),
    board: fields.array(
      fields.object({
        name: fields.text({ label: 'Ad soyad', validation: { isRequired: true } }),
        roleTr: fields.text({ label: 'Görev (TR)', validation: { isRequired: true } }),
        roleEn: fields.text({ label: 'Görev (EN)', validation: { isRequired: true } }),
        wcaId: fields.text({ label: 'WCA ID (isteğe bağlı)', validation: { pattern: { regex: WCA_ID_RE, message: '2019TEME01 biçiminde' } } }),
      }),
      { label: 'Yönetim', itemLabel: (props) => props.fields.name.value || 'Üye' },
    ),
    boardUpdatedAt: fields.date({ label: 'Yönetim listesi güncelleme tarihi', validation: { isRequired: true } }),
    documents: fields.array(
      fields.object({
        titleTr: fields.text({ label: 'Başlık (TR)', validation: { isRequired: true } }),
        titleEn: fields.text({ label: 'Başlık (EN)', validation: { isRequired: true } }),
        date: fields.date({ label: 'Tarih', validation: { isRequired: true } }),
        file: fields.file({ label: 'Dosya (PDF)', directory: 'public/docs', publicPath: DOCS_PREFIX, validation: { isRequired: true } }),
      }),
      { label: 'Belgeler', description: 'Tüzük ve resmi belgeler; /organizasyon/belgeler sayfasında listelenir.', itemLabel: (props) => props.fields.titleTr.value || 'Belge' },
    ),
  },
})

const gallerySingleton = singleton({
  label: 'Galeri',
  path: 'content/gallery',
  format: { data: 'json' },
  schema: {
    images: fields.array(
      fields.object({
        image: fields.image({ label: 'Fotoğraf', description: PHOTO_RULES, directory: 'public/galeri', publicPath: GALLERY_PREFIX, validation: { isRequired: true } }),
        captionTr: fields.text({ label: 'Alt yazı (TR)' }),
        captionEn: fields.text({ label: 'Alt yazı (EN)' }),
        ...photoAlt,
      }),
      { label: 'Fotoğraflar', description: '/medya sayfasındaki galeri; liste boşken yer tutucular görünür.', itemLabel: (props) => props.fields.captionTr.value || 'Fotoğraf' },
    ),
  },
})

// `owner/name`, set only in Vercel Production (docs/yayin-kontrol-listesi.md §12). Local builds and Preview deploys have
// no repo: the panel is unusable there by design (spec §6), the placeholder only satisfies the type.
const repo = (process.env.NEXT_PUBLIC_KEYSTATIC_REPO ?? 'owner/repo') as `${string}/${string}`

export default config({
  storage: process.env.NODE_ENV === 'development' ? { kind: 'local' } : { kind: 'github', repo },
  ui: {
    brand: { name: 'Speedcubing Türkiye' },
    navigation: {
      Haberler: ['news'],
      'Ana sayfa': ['slides'],
      'Sayfalar (TR)': PAGES.map(([slug]) => pageKey('tr', slug)),
      'Sayfalar (EN)': PAGES.map(([slug]) => pageKey('en', slug)),
      'Arayüz metinleri': ['messagesTr', 'messagesEn'],
      'Site ayarları': ['site'],
      Galeri: ['gallery'],
    },
  },
  collections: {
    // content/news/<slug>/index.yaml + tr.mdx + en.mdx (spec §3.1). The slug is the folder name.
    news: collection({
      label: 'Haberler',
      path: 'content/news/*/',
      slugField: 'title',
      format: { data: 'yaml' },
      schema: {
        title: fields.slug({
          name: { label: 'Başlık (TR)', validation: { isRequired: true } },
          slug: {
            label: 'Adres',
            description: 'Haberin adresi /haberler/<adres> olur. Türkçe başlıktan kendiliğinden üretilir; yalnız küçük harf, rakam ve tire.',
            generate: trSlug,
            validation: { pattern: SLUG_PATTERN },
          },
        }),
        titleEn: fields.text({ label: 'Başlık (EN)', validation: { isRequired: true } }),
        description: fields.text({ label: 'Özet (TR)', description: 'Listede ve arama motorlarında görünen bir cümle.', multiline: true, validation: { isRequired: true } }),
        descriptionEn: fields.text({ label: 'Özet (EN)', multiline: true, validation: { isRequired: true } }),
        date: fields.date({ label: 'Tarih', validation: { isRequired: true }, defaultValue: { kind: 'today' } }),
        category: fields.select({ label: 'Kategori', options: NEWS_CATEGORIES, defaultValue: 'topluluk' }),
        auto: fields.checkbox({ label: 'Otomatik duyuru', description: 'Yalnız yarışma botunun yazdığı haberlerde işaretlidir; elle yazılan haberlerde boş bırak.' }),
        bulten: fields.checkbox({
          label: 'Bültenle gönder',
          description:
            'İşaretlersen haber kaydedildikten sonra onaya düşer; onaylanınca abonelere kendi dillerinde mail olarak gider (günde en fazla bir bülten; aynı haber ikinci kez gitmez). Önizleme: /bulten/onizleme/<adres>.',
        }),
        tr: newsBody('Metin (TR)'),
        en: newsBody('Metin (EN)'),
      },
    }),
  },
  // A plain record: the 24 page keys are computed, and a literal-keyed object would reject them in `navigation`.
  singletons: <Record<string, Singleton<Record<string, ComponentSchema>>>>{
    slides: slidesSingleton,
    ...pageSingletons,
    // The schema comes from tr.json's key tree; en.json must match it (the reader rejects missing and extra keys).
    messagesTr: singleton({ label: 'Arayüz metinleri (TR)', path: 'messages/tr', format: { data: 'json' }, schema: messagesSchema(trMessages, APPROVAL_NOTE) }),
    messagesEn: singleton({ label: 'Arayüz metinleri (EN)', path: 'messages/en', format: { data: 'json' }, schema: messagesSchema(trMessages, APPROVAL_NOTE) }),
    site: siteSingleton,
    gallery: gallerySingleton,
  },
})
