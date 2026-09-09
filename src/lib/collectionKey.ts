export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidCollectionId(id: string): boolean {
  return UUID_PATTERN.test(id);
}

export function collectionKey(id: string): string {
  return `share:${id}`;
}
