export type Book = {
  id: number
  title: string
  author: string
  description: string
  cover: string
  pages: string[]
}

export const books: Book[] = [
  {
    id: 1,
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
  }
]

export const pricing = [
  { name: 'Free', price: '$0', description: 'Explore the free half of the library.', features: ['3 free reads/day', 'Basic progress tracking'] },
  { name: '30 Minutes', price: '$2', description: 'Top up reading time for the week.', features: ['30 minutes of extra reading', 'For any unlocked title'] },
  { name: 'Premium', price: '$9.99/mo', description: 'Full access to the catalog and premium perks.', features: ['Unlimited reading', 'Offline access', 'Priority support'] }
]
