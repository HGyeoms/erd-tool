import type { Schema } from '../types/schema';

/**
 * Encode schema data into a compact URL-safe string.
 * Uses JSON → UTF-8 → deflate → base64url.
 */
export async function encodeSchema(schema: Schema): Promise<string> {
  const json = JSON.stringify({
    tables: schema.tables,
    relationships: schema.relationships,
    enums: schema.enums,
    groups: schema.groups,
  });

  const blob = new Blob([json]);
  const cs = new CompressionStream('deflate');
  const compressed = blob.stream().pipeThrough(cs);
  const buffer = await new Response(compressed).arrayBuffer();

  // base64url encoding (URL-safe, no padding)
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode a URL-safe string back into a Schema.
 */
export async function decodeSchema(encoded: string): Promise<Schema> {
  // Restore standard base64
  let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const blob = new Blob([bytes]);
  const ds = new DecompressionStream('deflate');
  const decompressed = blob.stream().pipeThrough(ds);
  const text = await new Response(decompressed).text();

  const parsed = JSON.parse(text);
  return {
    tables: parsed.tables || [],
    relationships: parsed.relationships || [],
    enums: parsed.enums,
    groups: parsed.groups,
  };
}
