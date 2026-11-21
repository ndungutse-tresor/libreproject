import type { Book } from './libra-data'

/**
 * Sample shelves of book summaries: each book's key ideas in a few short pages,
 * written in the Libra team's own words. They are summaries, not the books'
 * text, and the book page says so. Ids start at 2001 so they never clash with
 * the classics (1001+) or with community books.
 */
export const summaryBooks: Book[] = [
  // ---------- Power & influence ----------
  {
    id: 2001,
    collection: 'power',
    title: 'The 48 Laws of Power',
    author: 'Robert Greene',
    year: '1998',
    description: 'A study of how power has been won and lost through history, drawn from royal courts, generals and con artists.',
    pages: [
      'Greene argues that a game of power is always being played around us, and that it is better to understand its rules than to pretend they do not exist. Each law is illustrated with stories from history.',
      'Never make the people above you feel threatened. Showing off your talents too openly to a boss or patron can make them insecure, and insecurity easily turns into resentment.',
      'Speak less than you need to. People who talk too much reveal their plans and weaknesses, while a measured silence makes you harder to read.',
      'Guard your reputation carefully. Once it is damaged, people judge everything you do through that damage, so it is one of the most valuable things you own.',
      'Persuade through what you do rather than through argument. A demonstration convinces people without making them defensive, while winning a debate can leave lasting resentment.',
      'Think a plan through to its final step. Many people fail because they see only the next move; considering where it all ends prevents being trapped by early success.',
      'Many readers use the book as a defence. Recognising these tactics when others use them helps you avoid being manipulated, even if you choose not to use them yourself.'
    ]
  },
  {
    id: 2002,
    collection: 'power',
    title: 'The Prince',
    author: 'Niccolò Machiavelli',
    year: '1532',
    description: 'A Renaissance handbook on how rulers gain power, keep it and lose it, written with unusual frankness.',
    pages: [
      'Machiavelli wrote The Prince for the Medici family, describing how states are won and governed. He focused on how politics actually works rather than how it ought to work.',
      'A ruler who inherits a state has an easier task than one who seizes a new one. New rulers face enemies among those they pushed aside and uncertain support from those who helped them.',
      'A prince should rely on his own forces. Hired or borrowed armies are unreliable, because their loyalty lasts only as long as their pay or their interest.',
      'He asks whether it is better to be loved or feared. Ideally both, he answers, but if one must choose, being feared is safer, as long as the ruler avoids being hated.',
      'A prince should appear generous, honest and merciful, but be ready to act otherwise when the survival of the state demands it.',
      'Fortune decides about half of what happens to us, he writes, but skill and boldness shape the rest. Preparing in calm times is like building banks before a river floods.',
      'The book ends with a call for a leader to unite Italy and free it from foreign armies, showing that its harsh advice served a larger political hope.'
    ]
  },
  {
    id: 2003,
    collection: 'power',
    title: 'How to Win Friends and Influence People',
    author: 'Dale Carnegie',
    year: '1936',
    description: 'The classic guide to getting along with people: listening well, making others feel valued and persuading without arguments.',
    pages: [
      'Carnegie begins with a simple observation: criticism rarely changes anyone. People defend themselves when attacked, so it is wiser to understand them than to condemn them.',
      'Honest appreciation is one of the strongest forces in human relationships. People want to feel important, and sincere recognition meets that need in a way flattery never can.',
      'To be liked, become genuinely interested in other people. Smile, remember their names and let them talk about themselves.',
      'Good conversation depends more on listening than on speaking. Asking questions people enjoy answering makes you memorable without saying much at all.',
      'An argument cannot really be won: even if you win the point, you lose the person’s goodwill. Carnegie suggests avoiding arguments and respecting other opinions.',
      'When you are wrong, admit it quickly and clearly. It disarms the other person and makes cooperation far easier than defending a weak position.',
      'To change someone’s behaviour without resentment, start with praise, point to mistakes indirectly and always let the other person keep their dignity.'
    ]
  },
  {
    id: 2004,
    collection: 'power',
    title: 'Influence: The Psychology of Persuasion',
    author: 'Robert B. Cialdini',
    year: '1984',
    description: 'Why people say yes: the mental shortcuts behind persuasion, and how to notice them being used on you.',
    pages: [
      'Cialdini studied salespeople, fundraisers and advertisers to understand why we agree to requests. He found that many of our decisions rely on quick mental shortcuts.',
      'Reciprocity: people feel they must return favours. A small gift or concession often makes someone far more willing to agree to a later request.',
      'Commitment and consistency: once we take a stand, even a small one, we feel pressure to act in line with it. Small commitments can grow into large ones.',
      'Social proof: when we are unsure, we look at what others are doing. Crowds, reviews and testimonials work because we assume so many people cannot be wrong.',
      'Liking: we agree more easily with people we like, such as people who seem similar to us, who praise us or who work alongside us.',
      'Authority and scarcity: titles, uniforms and expertise make us obey, and things seem more valuable when they are rare or about to run out.',
      'The defence is to notice when a shortcut is being triggered on purpose, pause, and judge the request on its real merits.'
    ]
  },
  {
    id: 2005,
    collection: 'power',
    title: 'The Laws of Human Nature',
    author: 'Robert Greene',
    year: '2018',
    description: 'A guide to understanding why people behave as they do, yourself included, so you can respond calmly instead of reacting.',
    pages: [
      'Greene argues that people are moved by deep forces such as emotion, envy and the need for status. Understanding these forces stops us being surprised by how people act.',
      'Emotions often take control before reason does. Noticing when you are reacting emotionally gives you time to choose a wiser response.',
      'Character shows itself in patterns. Rather than trusting what people say about themselves, watch how they behave again and again, especially under stress.',
      'Envy is common but rarely admitted. Greene suggests being modest about your successes and noticing when praise hides resentment.',
      'Groups change us. People behave differently in a crowd, and a strong group can override an individual’s own judgement.',
      'Short-term thinking causes many mistakes. Looking further ahead and imagining how events might unfold helps you avoid panic and passing fashions.',
      'The goal is self-knowledge as much as knowledge of others. Seeing these laws at work in yourself makes you calmer, more patient and more understanding.'
    ]
  },
  {
    id: 2006,
    collection: 'power',
    title: 'Leaders Eat Last',
    author: 'Simon Sinek',
    year: '2014',
    description: 'Why great teams feel safe, and how leaders who put their people first earn loyalty and trust.',
    pages: [
      'Sinek starts from a custom in the US Marine Corps, where officers eat after their troops. Leadership, he argues, means taking care of the people in your charge.',
      'People do their best work when they feel safe within their group. When leaders build that safety, people stop protecting themselves from each other and face outside challenges together.',
      'He links behaviour to the chemistry of the brain: some feelings reward reaching goals, while others reward trust and cooperation. Healthy teams need both.',
      'When organisations treat people as numbers, through constant layoffs or pressure for quick results, trust collapses and everyone looks after themselves first.',
      'Real leaders are willing to give up their own comfort for the good of the group, and that sacrifice is what earns loyalty.',
      'Trust is built in person and over time. Small acts of attention matter more than grand speeches.',
      'Anyone can lead, whatever their title. Leadership is a choice to look after the people around you.'
    ]
  },
  {
    id: 2007,
    collection: 'power',
    title: 'Never Split the Difference',
    author: 'Chris Voss',
    year: '2016',
    description: 'Negotiation lessons from a former FBI hostage negotiator, built on listening and empathy rather than logic alone.',
    pages: [
      'Voss spent years negotiating with kidnappers and found that people are rarely fully rational in tense moments. Emotion, not logic, usually decides the outcome.',
      'The most important skill is active listening. Repeating the last few words someone said encourages them to keep talking and to reveal more.',
      'Naming emotions helps calm them. Saying what the other side seems to feel, such as frustration or worry, shows understanding and lowers the tension.',
      'An early “no” can be more useful than an early “yes”. Being allowed to refuse makes people feel safe and in control, which opens real discussion.',
      'Open questions that begin with “how” or “what” invite the other side to help solve your problem, for example by asking how you could possibly meet their demand.',
      'Do not meet halfway by default. Splitting the difference often leaves both sides with a poor result.',
      'Prepare before any negotiation: know what you want, expect the other side’s worries, and decide in advance how you will respond to pressure.'
    ]
  },

  // ---------- Family & relationships ----------
  {
    id: 2101,
    collection: 'family',
    title: 'The 7 Habits of Highly Effective Families',
    author: 'Stephen R. Covey',
    year: '1997',
    description: 'Covey applies his seven habits to family life, helping families build trust, shared purpose and time together.',
    pages: [
      'Covey compares a family to a plane that is often off course but keeps returning to its flight plan. Mistakes are normal; what matters is having a clear direction to come back to.',
      'Being proactive means taking responsibility for your own reactions. Instead of blaming each other, family members choose how they respond.',
      'Begin with the end in mind by writing a family mission statement together. It describes the kind of family you want to be and guides everyday decisions.',
      'Put first things first: plan regular family time and one-to-one time with each child, and protect that time from other demands.',
      'Think win-win, and listen to understand before trying to be understood, especially during disagreements.',
      'Value your differences. When family members combine their strengths, they find better answers than any of them would alone.',
      'Renew the family through traditions, rest, service and fun, so relationships stay strong over the years.'
    ]
  },
  {
    id: 2102,
    collection: 'family',
    title: 'The 5 Love Languages',
    author: 'Gary Chapman',
    year: '1992',
    description: 'People give and receive love in different ways; learning your partner’s way can end years of misunderstanding.',
    pages: [
      'Chapman, a marriage counsellor, noticed that many couples truly loved each other yet felt unloved. Often each was showing love in a way the other did not recognise.',
      'Words of affirmation: some people feel most loved through encouragement, appreciation and kind words said out loud.',
      'Quality time: for others, love means undivided attention, such as talking without distractions or doing something together.',
      'Receiving gifts: thoughtful gifts, even small ones, can be strong signs of being remembered and cared for.',
      'Acts of service: some people feel loved when their partner helps with tasks such as cooking, repairs or caring for the children.',
      'Physical touch: holding hands, a hug or sitting close can say more than words for some people.',
      'Chapman suggests watching what your partner asks for and complains about most. Showing love in their language, not only your own, can refill a tired relationship, and the idea works with children and friends too.'
    ]
  },
  {
    id: 2103,
    collection: 'family',
    title: 'How to Talk So Kids Will Listen & Listen So Kids Will Talk',
    author: 'Adele Faber & Elaine Mazlish',
    year: '1980',
    description: 'Practical ways to talk with children that reduce fights, build cooperation and help them handle their feelings.',
    pages: [
      'The authors begin with feelings. Children behave better when they feel understood, so parents are encouraged to acknowledge feelings instead of dismissing them.',
      'Rather than telling a child they are not really upset, a parent can name the feeling they see. Feeling heard often calms a child faster than advice does.',
      'To get cooperation, describe the problem instead of blaming. Pointing out what needs doing invites help, while accusations invite the child to defend themselves.',
      'A short reminder, a single word or even a written note can work better than a long lecture that children stop listening to.',
      'Alternatives to punishment include stating strong feelings without attacking the child’s character, making expectations clear and showing the child how to put things right.',
      'Encourage independence by letting children make choices and struggle a little with tasks, rather than rushing in to solve everything.',
      'Praise that describes what the child actually did, rather than labels such as “clever”, helps children build real confidence in their own effort.'
    ]
  },
  {
    id: 2104,
    collection: 'family',
    title: 'The Seven Principles for Making Marriage Work',
    author: 'John M. Gottman & Nan Silver',
    year: '1999',
    description: 'Advice from decades of research on couples: what happy marriages do differently.',
    pages: [
      'Gottman studied couples for many years and found that happy marriages are not free of conflict. They rest on a deep friendship.',
      'Know your partner’s world: their worries, hopes, friends and daily pressures. Gottman calls this keeping an up-to-date map of each other.',
      'Nurture fondness and admiration by noticing and saying what you appreciate in each other, instead of focusing on faults.',
      'Turn toward each other in small moments, such as answering a comment or sharing a joke. These moments build goodwill that protects a marriage in hard times.',
      'Let your partner influence you. Couples do better when both share power and are willing to accept each other’s point of view.',
      'Solve the problems that can be solved, gently and with compromise, and keep talking about the differences that may never fully go away.',
      'Build shared meaning through rituals, goals and values you create together. Gottman also warns that criticism, contempt, defensiveness and shutting down are signs of a marriage in danger.'
    ]
  },
  {
    id: 2105,
    collection: 'family',
    title: 'Nonviolent Communication',
    author: 'Marshall B. Rosenberg',
    year: '1999',
    description: 'A four-step way of speaking and listening that turns blame into understanding, at home and beyond.',
    pages: [
      'Rosenberg believed that much conflict comes from the way we speak: blaming, judging and demanding. He offered a way of communicating based on compassion.',
      'The first step is observation: describing what happened without judging it. Saying when someone came home is an observation; calling them irresponsible is a judgement.',
      'The second step is naming feelings, such as worry, sadness or frustration, instead of thoughts that are dressed up as feelings.',
      'The third step links each feeling to a need. Behind every feeling is something a person needs, such as safety, respect or rest.',
      'The fourth step is a clear request rather than a demand: asking for a specific action that the other person is free to accept or decline.',
      'Listening with empathy matters just as much: hearing the feelings and needs behind someone’s words, even when they come out as criticism.',
      'Families who practise these steps often find that arguments get shorter, because each person feels heard instead of attacked.'
    ]
  },
  {
    id: 2106,
    collection: 'family',
    title: 'Crucial Conversations',
    author: 'Kerry Patterson, Joseph Grenny, Ron McMillan & Al Switzler',
    year: '2002',
    description: 'Tools for talking when the stakes are high, opinions differ and emotions run strong, at home and at work.',
    pages: [
      'A crucial conversation is one where opinions differ, the stakes are high and emotions are strong. These are the talks people most often avoid or handle badly.',
      'Start with what you really want: before speaking, ask what you want for yourself, for the other person and for the relationship.',
      'Notice when a conversation stops feeling safe. People respond to threat with silence or with aggression, and both block honest talk.',
      'Restore safety by showing respect and a shared purpose. Sometimes an apology, or explaining what you did not mean, is enough.',
      'Question the stories you tell yourself. Anger often comes from guesses about why someone acted, not from the action itself.',
      'Share your view carefully: start with the facts, then give your interpretation, and invite the other person to share theirs.',
      'End by agreeing who will do what and by when, so the conversation leads to action instead of the same argument next week.'
    ]
  },
  {
    id: 2107,
    collection: 'family',
    title: 'The Prophet',
    author: 'Kahlil Gibran',
    year: '1923',
    description: 'A poetic book of wisdom in which a departing teacher speaks about love, marriage, children, work and giving.',
    pages: [
      'The prophet Almustafa has lived for twelve years in the city of Orphalese. As the ship arrives to take him home, the people ask him to share his wisdom.',
      'On love, he describes it as something that both lifts us up and tests us, asking us to grow through joy and through pain.',
      'On marriage, he teaches that partners should stay together while keeping space between them, like pillars that hold up one roof while standing apart.',
      'On children, he reminds parents that children come through them but do not belong to them. Parents can give their love, but children will have their own thoughts and their own future.',
      'On giving, he says the truest gifts are given freely, without waiting to be asked and without seeking praise.',
      'On work, he describes labour done with love as a way of taking part in life itself, and labour done without love as a weight.',
      'Its short chapters are often read at weddings and family gatherings because they speak of balance, respect and freedom in close relationships.'
    ]
  },

  // ---------- Money & wealth ----------
  {
    id: 2201,
    collection: 'wealth',
    title: 'Rich Dad Poor Dad',
    author: 'Robert T. Kiyosaki',
    year: '1997',
    description: 'Two fathers, two views of money: why building assets matters more than earning a high salary.',
    pages: [
      'Kiyosaki describes growing up with two father figures: his own well-educated but struggling father, and his friend’s father, a businessman who became wealthy.',
      'The wealthy, he argues, make money work for them instead of only working for money. Schools train people to be employees but rarely teach how money works.',
      'Know the difference between assets and liabilities. An asset puts money into your pocket; a liability takes money out, even when it looks like wealth.',
      'As their income rises, many people buy bigger liabilities, such as a larger house or car, and stay trapped working to pay the bills.',
      'Mind your own business: keep your job if you need it, but steadily build assets such as a business, property or investments.',
      'Financial intelligence includes accounting, investing, understanding markets and knowing the law. Kiyosaki encourages learning these skills early.',
      'Fear and doubt stop many people from acting, so he urges readers to start small and keep learning. Critics say some of his advice is risky, so test it against your own situation and local laws.'
    ]
  },
  {
    id: 2202,
    collection: 'wealth',
    title: 'The Richest Man in Babylon',
    author: 'George S. Clason',
    year: '1926',
    description: 'Money lessons told as parables from ancient Babylon: save part of all you earn and make it grow.',
    pages: [
      'In ancient Babylon, two friends wonder why they are still poor after years of hard work. They visit Arkad, the richest man in the city, to learn his secret.',
      'Arkad’s first rule is to keep at least a tenth of everything you earn. Pay yourself before you pay anyone else.',
      'Control your spending. What we call necessary expenses tend to grow until they match our income, unless we plan carefully.',
      'Put your savings to work. Money that is lent or invested wisely earns more money, like workers who labour on your behalf.',
      'Protect what you have saved. Invest only where your money is safe, and take advice from people with real experience of handling money.',
      'Own your home, plan an income for your later years, and increase your ability to earn by building your skills.',
      'Later stories cover paying off debts, the value of hard work and the danger of get-rich-quick schemes. The lessons are simple and still practical.'
    ]
  },
  {
    id: 2203,
    collection: 'wealth',
    title: 'Think and Grow Rich',
    author: 'Napoleon Hill',
    year: '1937',
    description: 'A classic of success writing that links wealth to clear goals, persistence and the people around you.',
    pages: [
      'Hill spent years interviewing successful people of his time and claimed to have found a shared philosophy of achievement.',
      'Everything begins with a definite desire. Hill advises writing down exactly how much money you want, by when, and what you will give in return.',
      'Belief in your goal, strengthened by repeating it to yourself daily, keeps your mind focused on it.',
      'Specialised knowledge matters more than general knowledge. You need to know how to find and use the information your goal requires.',
      'Organised planning turns desire into action. When a plan fails, replace it with a new plan instead of abandoning the goal.',
      'A small group of people working together in harmony, which Hill calls a mastermind, gives you ideas, skills and support you could not find alone.',
      'Persistence is the quality successful people share; many give up just before they would have succeeded. Some of Hill’s claims are not scientific, but his focus on goals and persistence remains popular.'
    ]
  },
  {
    id: 2204,
    collection: 'wealth',
    title: 'The Millionaire Next Door',
    author: 'Thomas J. Stanley & William D. Danko',
    year: '1996',
    description: 'Research on real millionaires shows that most live modestly, spend less than they earn and invest steadily.',
    pages: [
      'Stanley and Danko surveyed wealthy households in the United States and found that many millionaires do not look rich. They often live in ordinary neighbourhoods and drive older cars.',
      'Their most important habit is living well below their means. Wealthy households consistently spend less than they earn.',
      'Income is not the same as wealth. A high salary spent on luxuries builds nothing; savings and investments do.',
      'Wealthy people tend to plan and budget carefully, setting clear goals and knowing where their money goes.',
      'They avoid spending for status. Big houses, designer clothes and expensive cars keep many high earners from ever becoming wealthy.',
      'Many millionaires run their own small businesses, and most invest a steady share of their income for the long term.',
      'Children who receive large financial gifts from their parents often build less wealth themselves, so the authors encourage teaching independence and good habits instead.'
    ]
  },
  {
    id: 2205,
    collection: 'wealth',
    title: 'The Total Money Makeover',
    author: 'Dave Ramsey',
    year: '2003',
    description: 'A step-by-step plan for getting out of debt and building savings, based on simple rules and determination.',
    pages: [
      'Ramsey writes from experience: he built wealth, lost it through debt and rebuilt it. His plan focuses on behaviour more than on knowledge.',
      'Step one is a small emergency fund, so an unexpected bill does not push you back into debt.',
      'Step two is the debt snowball: list your debts from smallest to largest and pay off the smallest first. Each quick win builds motivation for the next.',
      'Step three is a full emergency fund that covers three to six months of expenses.',
      'Next, invest part of your income for retirement and save for your children’s education.',
      'Finally, pay off your home early, then build wealth and give generously.',
      'His rules are strict, such as avoiding credit cards altogether, but many readers find that firm, simple rules help them change habits. Adapt the details to your own country and situation.'
    ]
  },
  {
    id: 2206,
    collection: 'wealth',
    title: 'I Will Teach You to Be Rich',
    author: 'Ramit Sethi',
    year: '2009',
    description: 'A practical programme for new earners: automate your money, spend on what you love and cut what you do not care about.',
    pages: [
      'Sethi writes for people starting their careers who want to manage money well without thinking about it all the time. His approach relies on systems rather than willpower.',
      'Start by building good credit and choosing bank accounts with low fees.',
      'Begin investing early, even with small amounts, because time lets compound growth do much of the work.',
      'Spend freely on the things that truly matter to you, and cut back hard on the things you do not care about.',
      'Automate your finances so that saving and investing happen before you have a chance to spend the money.',
      'Keep investing simple: low-cost index funds often beat complicated strategies and expensive advisers.',
      'A rich life is personal. Sethi asks readers to define what being rich means to them, then use money to build that life.'
    ]
  },
  {
    id: 2207,
    collection: 'wealth',
    title: 'The Intelligent Investor',
    author: 'Benjamin Graham',
    year: '1949',
    description: 'The foundational book on value investing: protect your money, think long term and do not follow the crowd.',
    pages: [
      'Graham, who taught Warren Buffett, separates investing from speculating. Investing means careful analysis, keeping your capital safe and accepting a reasonable return.',
      'He describes two kinds of investor: defensive investors, who want safety with little effort, and enterprising investors, who are willing to do more research.',
      'A defensive investor can hold a balance of shares and bonds, adjusting it within limits rather than chasing the market.',
      'Graham imagines a partner called Mr. Market who offers to buy or sell shares every day at changing prices. You can take advantage of his moods, but should never let them control you.',
      'The central idea is a margin of safety: buy only when the price is well below what a business is really worth, to protect yourself against mistakes and bad luck.',
      'An investor’s worst enemy is often their own emotion: buying in excitement and selling in fear.',
      'Later editions add commentary for modern readers, but the core lessons of patience and discipline are unchanged.'
    ]
  }
]
