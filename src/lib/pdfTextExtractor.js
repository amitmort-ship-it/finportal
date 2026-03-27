const decodePdfString = (value) => (
  value
    .replace(/\\([\\()])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\(\d{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)))
);

const inflateStream = async (streamBytes) => {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('decompression-not-supported');
  }

  const stream = new Response(
    new Blob([streamBytes]).stream().pipeThrough(new DecompressionStream('deflate')),
  );

  return new Uint8Array(await stream.arrayBuffer());
};

const getTextTokensFromContent = (content) => {
  const pieces = [];
  const directTextMatches = content.matchAll(/\((?:\\.|[^\\()])*\)\s*Tj/g);
  for (const match of directTextMatches) {
    const textMatch = match[0].match(/\(((?:\\.|[^\\()])*)\)\s*Tj/);
    if (textMatch?.[1]) pieces.push(decodePdfString(textMatch[1]));
  }

  const arrayMatches = content.matchAll(/\[(.*?)\]\s*TJ/gs);
  for (const match of arrayMatches) {
    const segment = match[1];
    const nested = segment.matchAll(/\(((?:\\.|[^\\()])*)\)/g);
    const text = [...nested].map((item) => decodePdfString(item[1])).join('');
    if (text) pieces.push(text);
  }

  return pieces;
};

export const extractPdfText = async (file) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const decoder = new TextDecoder('latin1');
  const binary = decoder.decode(bytes);
  const streamRegex = /<<(.*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/gs;
  const contentParts = [];

  for (const match of binary.matchAll(streamRegex)) {
    const dictionary = match[1];
    if (!dictionary.includes('/FlateDecode')) continue;

    const streamBytes = new Uint8Array(match[2].split('').map((char) => char.charCodeAt(0)));

    try {
      const inflated = await inflateStream(streamBytes);
      const content = decoder.decode(inflated);
      const tokens = getTextTokensFromContent(content);
      if (tokens.length) contentParts.push(tokens.join('\n'));
    } catch {
      continue;
    }
  }

  return contentParts.join('\n').trim();
};
