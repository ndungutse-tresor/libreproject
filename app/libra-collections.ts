/** The library's shelves. Kept apart from the book text so the browser can load it without the pages. */
export type Collection = 'favourites' | 'power' | 'family' | 'wealth' | 'classics'

/** Shelves in the order they hang on the gallery wall and appear in the list. */
export const collections: Record<Collection, { title: string; blurb: string }> = {
  favourites: { title: 'Reader favourites', blurb: 'Books our readers return to, picked by the Libra team.' },
  power: { title: 'Power & influence', blurb: 'How people lead, persuade and win influence, in short summaries.' },
  family: { title: 'Family & relationships', blurb: 'Living together in peace: listening, love and respect at home.' },
  wealth: { title: 'Money & wealth', blurb: 'How people build wealth: saving, investing and spending with purpose.' },
  classics: { title: 'The classics', blurb: 'Public-domain books, summarised page by page for a first read.' }
}

export const collectionOrder = Object.keys(collections) as Collection[]
