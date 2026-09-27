// components/BrandText.tsx: ruling R3. CSS uppercase follows `lang` (Turkish i → İ, English i → I), so the brand words
// carry their own language and render as SPEEDCUBING and TÜRKİYE in both locales. Use it in any heading CSS uppercases.
export function BrandText({ children }: { children: string }) {
  // The capture group puts the matched words at the odd indexes of the split.
  return children.split(/(Speedcubing|Türkiye)/).map((part, i) =>
    i % 2 ? (
      <span key={i} lang={part === 'Türkiye' ? 'tr' : 'en'}>
        {part}
      </span>
    ) : (
      part
    ),
  )
}
