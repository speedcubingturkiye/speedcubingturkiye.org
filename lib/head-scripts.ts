// lib/head-scripts.ts: the two scripts the root layout puts in <head> (app/[locale]/layout.tsx), run before anything
// paints. Plain ES5 strings: they run as the browser parses the page, before React. Tested in lib/head-scripts.test.ts.

/**
 * The theme (spec §3.4; menu 2026-10-22): "light" or "dark" chosen in the theme menu (localStorage, never a cookie),
 * else the operating system's setting. Sets <html data-theme> for the CSS and data-theme-pref for the menu's icon.
 */
export const THEME_SCRIPT =
  'try{var d=document.documentElement,p;try{p=localStorage.getItem("theme")}catch(e){}if(p!=="light"&&p!=="dark")p="system";' +
  'd.dataset.themePref=p;d.dataset.theme=p==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p}catch(e){}'

/**
 * The language (2026-10-22): until the visitor picks one in the language menu (localStorage "locale", never a cookie),
 * the first of Turkish and English in the browser's languages decides, English when neither is there; a page in the
 * other language is replaced at once (hidden, so it never shows). Crawlers stay put, so every page in both languages
 * is indexed (the hreflang alternates link them), and so does a browser whose storage is blocked.
 */
export const LOCALE_SCRIPT =
  'try{var s=localStorage.getItem("locale");' +
  'if(s!=="tr"&&s!=="en"&&!/bot|crawl|spider|slurp|google|lighthouse|facebookexternalhit/i.test(navigator.userAgent)){' +
  'var w="en",l=navigator.languages||[navigator.language],i,p,t;' +
  'for(i=0;i<l.length;i++){p=String(l[i]).slice(0,2).toLowerCase();if(p==="tr"||p==="en"){w=p;break}}' +
  'var h=location.pathname,e=h==="/en"||h.indexOf("/en/")===0;' +
  'if(w==="en"&&!e)t="/en"+(h==="/"?"":h);else if(w==="tr"&&e)t=h.slice(3)||"/";' +
  'if(t){document.documentElement.style.display="none";location.replace(t+location.search+location.hash)}}}catch(x){}'
