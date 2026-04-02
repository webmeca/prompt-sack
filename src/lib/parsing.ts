export interface ParsedVariable {
  name: string;
  original: string;
  type?: string;
}

export function extractVariables(text: string): ParsedVariable[] {
  if (!text) return [];
  
  const variables: ParsedVariable[] = [];
  const seen = new Set<string>();

  // Matches [name], {{name}}, ${name}, {name}
  // Also supports typed variables like {{name:string}}
  const regexes = [
    /\[([a-zA-Z0-9_:-]+)\]/g,
    /\{\{([a-zA-Z0-9_:-]+)\}\}/g,
    /\$\{([a-zA-Z0-9_:-]+)\}/g,
    /(?<!\$)\{([a-zA-Z0-9_:-]+)\}/g, // {name} but not ${name}
  ];

  for (const regex of regexes) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      const original = match[0];
      const inner = match[1];
      
      let name = inner;
      let type = undefined;

      if (inner.includes(':')) {
        const parts = inner.split(':');
        name = parts[0];
        type = parts[1];
      }

      if (!seen.has(name)) {
        seen.add(name);
        variables.push({ name, original, type });
      }
    }
  }

  return variables;
}

export function fillPrompt(text: string, values: Record<string, string>): string {
  if (!text) return '';
  let filled = text;
  
  const variables = extractVariables(text);
  for (const v of variables) {
    if (values[v.name] !== undefined) {
      // Replace all occurrences of the original syntax
      filled = filled.split(v.original).join(values[v.name]);
    }
  }
  
  return filled;
}
