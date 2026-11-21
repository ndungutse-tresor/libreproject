import { summaryBooks } from './libra-summaries'
import { originalBooks } from './libra-originals'
import type { Collection } from './libra-collections'

export type Book = {
  id: number
  title: string
  author: string
  description: string
  cover?: string
  /** Which wall of the gallery the book hangs on. */
  collection: Collection
  year?: string
  /** 'original' books are written for Libra; everything else is a page-by-page summary. */
  format?: 'summary' | 'original'
  subtitle?: string
  /** Pages may start with a "## Heading" line; blank lines separate paragraphs. */
  pages: string[]
}

/** Credit shown on summary pages: the summaries are written for Libra. */
export const SUMMARY_CREDIT = 'Tresor Ndungutse'

export { collections, collectionOrder, type Collection } from './libra-collections'

export const books: Book[] = [
  {
    id: 1,
    collection: 'favourites',
    title: 'Atomic Habits',
    author: 'James Clear',
    description: 'A practical guide to building lasting habits through small improvements.',
    cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80',
    pages: [
      'Every system is a product of habits. The quality of your life depends on the quality of the habits you repeat daily.',
      'You do not rise to the level of your goals; you fall to the level of your systems.',
      'The first step in designing a better life is to understand the directional force of your current routines.',
      'If you want to improve, make it easy to act and difficult to avoid the behavior you want to cultivate.',
      'Tiny habits create momentum, and momentum creates long-term change.',
      'Consistency matters more than intensity. Small actions, repeated over time, redefine identity.',
      'The most effective way to change is to attach a new behavior to an existing cue in your life.',
      'You become what you repeatedly do. Build environments that support the identity you want to live into.'
    ]
  },
  {
    id: 2,
    collection: 'favourites',
    title: 'The Psychology of Money',
    author: 'Morgan Housel',
    description: 'A timeless look at how behavior and emotion shape financial decisions.',
    cover: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=900&q=80',
    pages: [
      'The most important financial skill is not accounting or investing. It is behavior.',
      'Good investing is not just about returns. It is also about preserving the ability to continue investing.',
      'The reality of money is not that it makes you wise. It exposes your character.',
      'Time in the market matters more than timing the market.',
      'A calm plan and patience will outperform excitement and speculation over the long run.',
      'What matters most is not how much you make; it is how much you keep and how long you stay invested.',
      'Risk is often the byproduct of a story you tell yourself about where wealth should come from.',
      'The best financial decisions are often boring, simple, and repeated for years.'
    ]
  },
  {
    id: 3,
    collection: 'favourites',
    title: 'Deep Work',
    author: 'Cal Newport',
    description: 'How to focus without distraction and produce high-value work.',
    cover: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=900&q=80',
    pages: [
      'The ability to concentrate intensely is a skill with outsized value in modern work.',
      'When you are constantly interrupted, you lose your ability to think clearly and create meaningfully.',
      'Shallow work fills the day with productivity theater. Deep work creates durable output.',
      'The key is to build rituals that remove friction and signal to your brain that it is time to focus.',
      'A distraction-free environment is not a luxury. It is a competitive advantage.',
      'The people who produce exceptional work are often the ones who protect their attention more carefully than their time.',
      'Focus is not a personality trait. It is a practice that can be trained.',
      'The real value of your work is usually not in the number of tasks you finish, but in the significance of the work you protect.'
    ]
  },
  // Public-domain classics. Ids start at 1001 so they never hide a community book
  // published through the admin panel, whose ids count up from 1.
  {
    id: 1001,
    collection: 'classics',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    year: '1813',
    description: 'Elizabeth Bennet and Mr Darcy misjudge each other, and slowly learn to see past first impressions.',
    pages: [
      'A wealthy young man, Mr Bingley, rents the estate near the Bennet home, and Mrs Bennet sets her heart on marrying one of her five daughters to him.',
      'At a local ball, Bingley is charmed by Jane Bennet, while his proud friend Mr Darcy refuses to dance and slights her sister Elizabeth within her hearing.',
      'Elizabeth hears a sad story about Darcy from the charming officer Mr Wickham, and her dislike of Darcy hardens into certainty.',
      'Darcy proposes to Elizabeth, almost against his will. She refuses him and accuses him of ruining Wickham and separating Jane from Bingley.',
      'A letter from Darcy tells the other side of the story. Elizabeth realises that her quick judgements were shaped by her own pride.',
      'When her youngest sister elopes with Wickham, Darcy quietly rescues the family name, and Elizabeth comes to love the man she misread.'
    ]
  },
  {
    id: 1002,
    collection: 'classics',
    title: 'Frankenstein',
    author: 'Mary Shelley',
    year: '1818',
    description: 'A young scientist gives life to a creature, then abandons it, and both are destroyed by what follows.',
    pages: [
      'On an Arctic voyage, the explorer Robert Walton rescues an exhausted traveller from the ice: Victor Frankenstein, who begins to tell his story.',
      'As a student, Victor becomes obsessed with the secret of life and, working alone for months, builds a body and brings it to life.',
      'Horrified by what he has made, Victor runs from the creature. It wanders alone and learns about people by watching a family from hiding.',
      'Rejected by everyone it meets, the creature turns to revenge and demands that Victor make it a companion.',
      'Victor begins a second creature but destroys it, and the creature takes the lives of the people Victor loves most.',
      'Victor chases his creation to the far north. After Victor dies, the creature grieves over him and disappears into the darkness.'
    ]
  },
  {
    id: 1003,
    collection: 'classics',
    title: 'The Odyssey',
    author: 'Homer',
    description: 'Odysseus spends ten years trying to get home from the Trojan War, while his family waits and hopes.',
    pages: [
      'Twenty years after Odysseus left for Troy, his home in Ithaca is overrun by suitors who want to marry his wife, Penelope.',
      'His son Telemachus sets out to find news of his father, guided in secret by the goddess Athena.',
      'Odysseus, held for years on the island of the nymph Calypso, is finally allowed to build a raft and leave.',
      'At the court of the Phaeacians he tells of his travels: the Cyclops, the witch Circe, the Sirens, and a journey to the land of the dead.',
      'Returning home disguised as a beggar, Odysseus tests who is still loyal to him.',
      'He wins the contest of the great bow, defeats the suitors, and is reunited with Penelope.'
    ]
  },
  {
    id: 1004,
    collection: 'classics',
    title: 'The Count of Monte Cristo',
    author: 'Alexandre Dumas',
    year: '1844',
    description: 'A sailor wrongly imprisoned on his wedding day escapes, finds a fortune, and returns to settle the score.',
    pages: [
      'Edmond Dantès, a young sailor about to be married and promoted, is betrayed by jealous rivals and thrown into prison without trial.',
      'In the Château d’If he meets an old priest, Abbé Faria, who teaches him languages, science and the location of a hidden treasure.',
      'After years in a cell, Dantès escapes and finds the treasure on the island of Monte Cristo.',
      'He returns to Paris as the mysterious, wealthy Count of Monte Cristo and quietly enters the lives of the men who betrayed him.',
      'One by one, his enemies are brought down by their own past crimes.',
      'Seeing the harm his revenge has also done to the innocent, the Count chooses mercy and sails away, leaving a message of hope: wait and hope.'
    ]
  },
  {
    id: 1005,
    collection: 'classics',
    title: 'Moby-Dick',
    author: 'Herman Melville',
    year: '1851',
    description: 'A whaling captain’s hunt for the white whale that took his leg becomes an obsession that drags his crew with him.',
    pages: [
      'Ishmael, restless on land, signs on to the whaling ship Pequod with his new friend Queequeg, a harpooner from the South Seas.',
      'Once at sea, Captain Ahab reveals the true purpose of the voyage: to hunt Moby Dick, the white whale that took his leg.',
      'Ishmael describes the work of whaling in detail, from the boats and the ropes to the dangerous business of the hunt.',
      'Other ships warn the Pequod about the white whale, but Ahab will not turn back.',
      'After a long chase, the crew finally finds Moby Dick, and the whale fights back for three days.',
      'The Pequod sinks, and only Ishmael survives, floating on a coffin until another ship rescues him.'
    ]
  },
  {
    id: 1006,
    collection: 'classics',
    title: 'The Art of War',
    author: 'Sun Tzu',
    description: 'An ancient Chinese guide to strategy, built on preparation, knowing your opponent, and winning without a fight.',
    pages: [
      'War is a matter of life and death for a state, so it must be studied carefully before it begins.',
      'The best victory is the one won without fighting, by upsetting the opponent’s plans before battle.',
      'Know your opponent and know yourself, and you will not be in danger in a hundred battles.',
      'Appear weak when you are strong and strong when you are weak; much of warfare depends on deception.',
      'Speed matters: long campaigns drain a country’s money and strength.',
      'A good general chooses the ground, adapts to changing conditions, and looks after their soldiers.'
    ]
  },
  {
    id: 1007,
    collection: 'classics',
    title: 'Meditations',
    author: 'Marcus Aurelius',
    description: 'The private notebook of a Roman emperor, reminding himself how to live calmly and do his duty.',
    pages: [
      'Marcus begins by thanking the people who shaped him, and naming the good qualities he learned from each of them.',
      'Each morning, he reminds himself that he will meet difficult people, and that their faults are no reason to give up his own good conduct.',
      'What upsets us is not events themselves but our judgements about them, and those judgements are within our control.',
      'Life is short, and fame fades quickly, so the best use of time is to act well in the present moment.',
      'We are made to work together, like the parts of a body, so serving others is part of our nature.',
      'Accept what you cannot change, do what you can, and keep your mind steady whatever happens.'
    ]
  },
  {
    id: 1008,
    collection: 'classics',
    title: 'Little Women',
    author: 'Louisa May Alcott',
    year: '1868',
    description: 'Four sisters grow up during the American Civil War, each with her own dreams and struggles.',
    pages: [
      'With their father away at war, Meg, Jo, Beth and Amy March try to make a happy Christmas despite having little money.',
      'They make friends with Laurie, the lonely boy next door, who becomes almost a brother to them.',
      'Each sister works on her own faults: Meg’s vanity, Jo’s temper, Beth’s shyness and Amy’s selfishness.',
      'Jo writes stories and dreams of becoming an author, refusing to live the life others expect of her.',
      'Gentle Beth falls ill, and the family learns to treasure the time they have together.',
      'The sisters grow up and choose their own paths in love and work, with Jo finally finding a home that fits her.'
    ]
  },
  {
    id: 1009,
    collection: 'classics',
    title: 'Treasure Island',
    author: 'Robert Louis Stevenson',
    year: '1883',
    description: 'A boy finds a pirate’s treasure map and sails into danger with a crew that includes the charming Long John Silver.',
    pages: [
      'At his family’s inn, young Jim Hawkins finds a treasure map in the sea chest of an old pirate.',
      'Jim sails with Squire Trelawney and Doctor Livesey aboard the Hispaniola to find the treasure.',
      'Hiding in an apple barrel, Jim overhears the cook, Long John Silver, planning a mutiny with the crew.',
      'On the island, the loyal party defends an old stockade while the pirates attack.',
      'Jim recaptures the ship by himself and meets Ben Gunn, a marooned sailor who already found the treasure.',
      'The treasure is carried home, Silver escapes with a small share, and Jim swears never to return to the island.'
    ]
  },
  {
    id: 1010,
    collection: 'classics',
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    year: '1892',
    description: 'Twelve cases solved by the London detective who notices what everyone else overlooks.',
    pages: [
      'Dr Watson visits his old friend Sherlock Holmes at 221B Baker Street, where clients arrive with puzzles the police cannot solve.',
      'Holmes works by observation: a worn sleeve, a muddy boot or a scratch on a watch tells him a person’s story.',
      'In one case, a king asks Holmes to recover a photograph, and Holmes is outwitted by the clever Irene Adler.',
      'In another, a red-haired man is paid to copy an encyclopedia, which turns out to hide a plan to rob a bank.',
      'Holmes often appears to solve a case at once, but he explains each step of his reasoning to Watson afterwards.',
      'Through it all, Watson records the cases, and their friendship becomes the heart of the stories.'
    ]
  },
  ...originalBooks,
  ...summaryBooks
]

export const pricing = [
  { name: 'Free', price: '$0', description: 'Explore the free half of the library.', features: ['3 free reads/day', 'Basic progress tracking'] },
  { name: '30 Minutes', price: '$2', description: 'Top up reading time for the week.', features: ['30 minutes of extra reading', 'For any unlocked title'] },
  { name: 'Premium', price: '$9.99/mo', description: 'Full access to the catalog and premium perks.', features: ['Unlimited reading', 'Offline access', 'Priority support'] }
]
