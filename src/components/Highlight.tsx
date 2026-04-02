export function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="rounded-sm px-0.5 text-inherit">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
