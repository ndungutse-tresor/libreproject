import type { Book } from './libra-data'

/**
 * Libra originals: books written for Libra and published under Tresor
 * Ndungutse's name. Each page can start with a "## Heading" line; blank lines
 * separate paragraphs. Ids start at 3001.
 */
export const originalBooks: Book[] = [
  {
    id: 3001,
    collection: 'power',
    format: 'original',
    title: 'Quiet Power',
    subtitle: 'Leading and Influencing People with Integrity',
    author: 'Tresor Ndungutse',
    year: '2026',
    description: 'A practical guide to earning influence that lasts: through trust, listening and fair dealing, not tricks.',
    pages: [
      `## Introduction: the power people give you

There are two kinds of power. The first is taken: it comes from a title, a threat or control over something other people need. It works, but only while you hold the title or the threat, and people quietly wait for the day it ends.

The second kind is given. People choose to follow you, listen to you and help you because they trust you. Nobody can take it away with a single decision, and it grows the longer you keep it.

This book is about the second kind. It is written for students, young workers, team leaders and anyone who wants to be heard in a family, a church, a company or a community. Every chapter gives one habit you can start practising this week.`,

      `## 1. Your name walks ahead of you

In Kinyarwanda we say izina ni ryo muntu: a name is the person. Before you enter a room, your reputation has already arrived. People have heard whether you keep your word, whether you work hard and whether you can be trusted with money or secrets.

A reputation is built slowly, from hundreds of small moments, and it can be damaged in one afternoon. That is why people with lasting influence protect it carefully. They avoid gossip, they do not take credit for other people’s work, and they admit their mistakes before someone else exposes them.

Ask yourself one honest question: if three people who know you were asked to describe you in one word, what word would they choose? If you do not like the answer, the good news is that every day is a chance to give them a new one.`,

      `## 2. Keep small promises

Big promises are easy to make. Small ones are easy to forget. Yet trust is mostly built on the small ones: arriving at the time you said, sending the document you promised, returning the money on the day you agreed.

When you keep a small promise, people notice, even if they say nothing. After many kept promises, they begin to rely on you without checking. That reliance is a form of power. When you need support for a bigger idea, they already know you deliver.

Make fewer promises and keep all of them. If you cannot keep one, say so early, explain why and offer a new plan. A broken promise that is handled honestly does far less damage than one that is ignored.`,

      `## 3. Listen longer than you speak

Many people try to gain influence by talking: arguing louder, explaining more, repeating their point. Yet the people we trust most are usually the ones who listen to us.

Listening well means giving your full attention. Put the phone face down. Let the other person finish. Ask a question that shows you understood, such as: what worries you most about this? Then wait for the answer instead of preparing your reply.

When people feel heard, they relax. They tell you what they really think, which gives you better information than any amount of talking could. And when it is finally your turn to speak, they are far more willing to listen, because you listened first.`,

      `## 4. Understand what people need

Every person you work with wants something: recognition, security, rest, progress, respect, a fair share. When you understand what someone needs, you can find ways to help them while you pursue your own goals.

A manager who feels overloaded may welcome a solution that saves time. A parent worried about school fees may support a plan that reduces costs. A colleague who feels ignored may become your strongest ally simply because you asked for their opinion.

Make a habit of asking yourself, before any important conversation: what does this person need from this situation? You will not always be able to give it to them, but you will understand their reactions, and you will stop treating every disagreement as a personal attack.`,

      `## 5. Build allies before you need them

The worst time to look for support is the moment you need it. By then, people wonder why you only remember them when you want something.

Build relationships early and without an agenda. Congratulate people on their successes. Share useful information. Introduce people who could help each other. Help with small tasks when you can. Attend the community work day, the wedding, the funeral, not only the meeting where decisions are made.

Over time you build a network of people who know you and wish you well. When you later need advice, a recommendation or a vote, you are not asking strangers for a favour. You are asking friends to continue a relationship you have already invested in.`,

      `## 6. Persuade with reasons and examples

People are rarely persuaded by force or by being told they are wrong. They are persuaded when they can see for themselves why an idea is good.

Start by agreeing on the problem before you offer a solution. Then explain your idea simply, show an example of it working, and admit its weak points before someone else raises them. Honesty about the risks makes your case stronger, not weaker.

Whenever possible, let people try your idea on a small scale. A short pilot at work, a one-month trial at home, a single test in your cooperative: results persuade more than speeches. And when people help shape the idea, they defend it as their own.`,

      `## 7. Disagree without making enemies

You will disagree with people you respect. The question is not whether to disagree, but how.

Attack the idea, never the person. Say, I see this differently, rather than, you are wrong. Speak in private before you speak in public, so no one is embarrassed in front of others. Stay calm, keep to the facts, and stop before the conversation becomes a contest.

Remember that today’s opponent may be tomorrow’s partner. People forget the details of an argument, but they remember for years how you made them feel during it. If you disagree with dignity, you can lose a debate and still gain respect.`,

      `## 8. Negotiate so both sides win

Every day involves negotiation: a salary, a price at the market, a deadline, who cooks dinner. Many people treat negotiation as a fight that one side must lose. That approach can win a single deal and lose a relationship.

Prepare first. Know what you want, what you can accept and what you will do if you cannot agree. Then try to understand what the other side truly needs; it is often different from what they first ask for.

Look for trades that cost you little and help them a lot, and ask for the same in return. Write down what you agreed, especially when money is involved. A deal where both sides leave satisfied is one that both sides will keep.`,

      `## 9. Take responsibility, share the credit

Nothing builds respect faster than a leader who says, that mistake was mine, and nothing destroys it faster than one who blames the team.

When something goes wrong, take responsibility first, then fix the problem, then learn from it together. When something goes well, give the credit to the people who did the work, by name and in front of others.

This seems to reduce your own importance, but the opposite happens. People work harder for a leader who protects them and recognises them. Your reputation grows as the person whose teams succeed, which is worth far more than a reputation for being the cleverest person in the room.`,

      `## 10. Guard your time and attention

Influence needs focus. If you say yes to every request, join every group chat and attend every meeting, you will be busy but not effective.

Learn to say no politely: thank the person, explain briefly that you cannot give it the attention it deserves, and if possible suggest someone else. People respect clear answers more than half-hearted promises.

Protect the hours when you do your most important work. Decide each morning on the one or two things that matter most that day. When you consistently finish important work, people notice, and your opinion carries more weight because it comes from someone who delivers.`,

      `## 11. Your reputation online

Today your reputation lives on your phone as well as in your neighbourhood. What you post, share and forward in group chats is part of your name.

Before posting, ask: would I say this to this person’s face, in front of my family or my future employer? Avoid spreading rumours, even as a joke. Check information before you forward it; sharing false news damages your credibility, even if someone else wrote it.

Use your online presence to show your work and your values: a project you finished, a skill you are learning, a cause you support. Over time, people who have never met you will form an opinion of you. Make sure it is one you chose.`,

      `## Closing: use power to lift others

Influence built on trust is a responsibility. The people who follow you have given you something valuable, and the best way to keep it is to use it for them as well as for yourself.

Open doors for people coming after you. Speak up for those who are not in the room. Teach what you know. Correct injustice when you see it, even when it costs you something.

Quiet power does not shout. It shows itself when people choose to follow you without being asked, defend you when you are absent and trust you with what matters to them. Start with one habit from this book, practise it until it becomes natural, and then add the next.`
    ]
  },
  {
    id: 3002,
    collection: 'family',
    format: 'original',
    title: 'Peace at Home',
    subtitle: 'Lessons for Rwandan Families',
    author: 'Tresor Ndungutse',
    year: '2026',
    description: 'How families can live together in peace: talking, listening, sharing money and work, raising children and repairing conflict.',
    pages: [
      `## Introduction: peace is built, not found

Every family argues. Couples disagree about money, parents and children clash over rules, and relatives hold different expectations. Peace at home does not mean the absence of disagreement. It means a family knows how to disagree without breaking.

Peace is built from small, repeated habits: how we greet each other in the morning, how we speak when we are tired, how we handle money and how quickly we make up after a quarrel.

This book offers practical lessons for couples, parents and young people in Rwandan homes, whether in Kigali or in the hills. Read one chapter at a time, discuss it together, and choose one thing to try as a family.`,

      `## 1. Talk every day, not only when there is trouble

Many families only have serious conversations when something has gone wrong. By then, everyone is tense, and the talk quickly becomes an argument.

Make conversation a daily habit. Share a meal without phones or television. Ask each person about their day, and ask a second question to show real interest. Talk about plans, hopes and small worries before they grow into big ones.

Couples can set aside a short time each week, perhaps on Sunday evening, to talk about the week ahead: money, children, visitors, work. Ten calm minutes of planning can prevent many hours of conflict.`,

      `## 2. Listen to understand

When someone at home is upset, our first reaction is often to defend ourselves or to give advice. Both can make the other person feel unheard.

Try a different first step: repeat back what you heard. So you feel that I did not support you in front of my mother. Then ask, is that right? This simple act tells the other person that their feelings matter, even if you see things differently.

Children need this as much as adults. A child who says I hate school may be trying to say I am afraid of a teacher or I feel left out. Listening calmly helps you find the real problem instead of arguing about the words.`,

      `## 3. Partners as a team

A marriage or partnership is strongest when both people see themselves as one team facing problems together, rather than opponents competing to win.

Make important decisions together: where to live, how many children, how to spend large amounts of money, whether to take a new job. Respect each other’s opinions, even when you disagree. Rwandan law gives husbands and wives equal rights in the home and in property, and peaceful homes reflect that equality in everyday life.

Speak well of your partner in front of others, especially in front of children and relatives. Handle disagreements in private. When your partner succeeds, celebrate as if it were your own success, because in a team it is.`,

      `## 4. Money without fights

Money is one of the most common causes of family conflict. Often the problem is not the amount of money, but secrecy, surprise and different priorities.

Be open with each other about income, debts and spending. Make a simple monthly family budget: school fees, food, rent, transport, savings, support for relatives and a small amount each person can spend freely without asking.

Agree in advance on how large a purchase must be before you discuss it together. Keep records of mobile money and bank transfers so that nobody feels money disappears. When money is tight, decide together what to cut. A family that faces money problems as a team stays united even in difficult months.`,

      `## 5. Sharing the work of the home

Cooking, cleaning, fetching water, caring for children and elderly relatives: the work of a home never stops. When one person carries most of it, tiredness becomes resentment.

Sit down together and list all the regular tasks. Share them fairly according to time, strength and ability, not only according to habit. Fathers who cook, bathe children and help with homework show sons and daughters that caring for a home is everyone’s work.

Give children tasks suited to their age, and thank them when they help. Review the arrangement every few months, especially when work hours change or a new baby arrives. Fair sharing is a quiet form of respect.`,

      `## 6. Raising children with warmth and limits

Children grow best with two things together: warmth and clear limits. Warmth without limits can produce children who struggle with discipline. Limits without warmth can produce children who obey out of fear and hide their problems.

Show affection every day through words, time and attention. Explain the family rules and the reasons behind them. When a rule is broken, respond calmly and with consequences that teach, such as fixing what was damaged or losing a privilege for a short time.

Avoid hitting and humiliating children. Physical punishment teaches fear, not understanding, and harsh words stay with a child for years. Praise effort and honesty, not only results, so children learn that they are loved even when they fail.`,

      `## 7. When you disagree: a calm method

Disagreement is normal. What matters is the method. Here is one that families can learn together.

First, pause. If voices are rising, agree to stop and continue in thirty minutes. Nothing good is decided in anger. Second, speak for yourself: describe what happened and how it affected you, instead of accusing. I felt hurt when the plan changed without me, rather than you never respect me.

Third, listen to the other side fully before replying. Fourth, look for one small step you can both agree on today, even if the larger issue remains. Fifth, end with a gesture of peace: a word of thanks, a handshake, a cup of tea. Over time, this method replaces shouting with solving.`,

      `## 8. Extended family and in-laws

In Rwanda, a family is rarely just parents and children. Grandparents, siblings, cousins and in-laws are part of daily life, and they bring great support as well as occasional tension.

Couples should agree together on how they relate to both families: how often to visit, how much financial support to give and how to respond to advice. Present a united position, and let each partner speak to their own relatives about sensitive issues.

Show respect to elders even when you disagree. Thank relatives for their help. When boundaries are needed, explain them kindly and firmly. A home where both families feel respected, and where the couple stays united, is protected from many conflicts.`,

      `## 9. Forgiveness and starting again

Every family member will hurt the others at some point, through careless words, broken promises or bigger mistakes. Without forgiveness, these hurts pile up until the home feels heavy.

Forgiveness begins with a sincere apology: naming what was done, admitting the hurt it caused and promising to change. I am sorry, but… is not an apology. I am sorry I shouted at you in front of the children. It was wrong, and I will talk to you privately next time, is.

Forgiving does not mean pretending nothing happened or accepting the same harm again. It means choosing not to use the past as a weapon in every future argument. Rwanda knows deeply that peace can be rebuilt after great pain; homes can rebuild it after small ones too.`,

      `## 10. Phones, screens and time together

Phones bring families closer across distance, but they can also pull apart people sitting in the same room. A family where everyone looks at a screen during meals slowly stops knowing each other.

Agree on simple screen rules for everyone, adults included: no phones at the dinner table, no screens in the hour before children sleep, and time each weekend for an activity together without devices, such as a walk, a game or visiting relatives.

Talk with children about what they see online and who they talk to. Keep shared computers in common spaces. Most of all, model the habits you want: children copy what parents do far more than what parents say.`,

      `## 11. When to ask for help

Some problems are too big to solve alone, and asking for help is a sign of strength, not failure. Rwanda has community structures designed for this. Umugoroba w’ababyeyi, the parents’ evening forum in each village, brings families together to discuss and resolve problems. Abunzi, community mediators, help settle disputes peacefully. Religious leaders, trained counsellors and health centres can also support families through difficult times.

Peace at home never means accepting violence. If anyone in the home is being beaten, threatened, sexually abused or controlled through fear, that is not a family disagreement; it is harm. Contact the police or the Isange One Stop Centre, which supports people affected by violence, and reach out to trusted relatives. Safety comes first, always.`,

      `## Closing: small habits, peaceful years

A peaceful home is not built in one conversation. It is built in the daily choice to listen instead of shouting, to share instead of hiding, to apologise instead of blaming and to make time for each other even when life is busy.

Choose one habit from this book and practise it as a family for a month. Talk about how it is going. Then add another. Children who grow up in such homes carry those habits into their own families, so the peace you build today continues for generations.

Your home can be a place where every member feels safe, respected and loved. It begins with the next conversation.`
    ]
  },
  {
    id: 3003,
    collection: 'wealth',
    format: 'original',
    title: 'Building Wealth in Kigali',
    subtitle: 'A Practical Money Guide for Young Rwandans',
    author: 'Tresor Ndungutse',
    year: '2026',
    description: 'How to save, invest, earn more and avoid money traps, step by step, with examples from everyday life in Rwanda.',
    pages: [
      `## Introduction: wealth is a habit, not a salary

Many people believe they will become wealthy once they earn more. Yet people with good salaries often stay in debt, while some people with modest incomes slowly build security for their families. The difference is rarely luck. It is habits.

Wealth means having assets that give you choices: savings for emergencies, investments that grow, a business or skills that earn, and a home that is secure. It is built step by step, over years, by spending less than you earn and putting the difference to work.

This guide is written for students, young workers and small business owners in Rwanda. It is general education, not personal financial advice; prices, interest rates and rules change, so always confirm the details with licensed institutions before you decide.`,

      `## 1. Know where your money goes

You cannot manage money you do not track. Many people are surprised to discover how much goes on airtime, transport, small snacks and sending money to others.

For one month, write down everything you spend, or review your mobile money and bank history each week. Group your spending into categories: housing, food, transport, family support, phone and data, entertainment, savings.

Then make a simple budget for the next month. Decide in advance how much each category may use, and check your progress weekly. A budget is not a punishment; it is a plan that tells your money where to go instead of wondering where it went.`,

      `## 2. Pay yourself first

Most people save whatever is left at the end of the month, and usually nothing is left. Turn the order around: the moment you receive income, set aside a fixed share for savings before you spend anything else.

Start with whatever is possible, even five percent of your income, and increase it as your situation improves. Ten to twenty percent is a strong long-term target.

Make it automatic where you can. Many banks and SACCOs allow standing orders that move money to a savings account on payday. Money you never see in your spending account is much easier not to spend.`,

      `## 3. Build an emergency fund

Life brings surprises: an illness, a broken phone, a lost job, a relative who needs urgent help. Without savings, these surprises push people into expensive loans that take months to repay.

Your first savings goal should be an emergency fund. Begin with an amount that covers one month of basic expenses, then build towards three to six months.

Keep this money somewhere safe and easy to reach, but separate from your daily spending: a savings account at a licensed bank or your Umurenge SACCO, for example. Use it only for real emergencies, and refill it as soon as you can after using it.`,

      `## 4. Use debt carefully

Debt is a tool. Used well, it can help you buy equipment that earns money, build a home or study for a better job. Used badly, it traps you in paying interest for things that are already used up.

Before borrowing, ask three questions. Will this loan help me earn more or save money in the future? Do I understand the full cost, including interest and fees? Can I repay it comfortably from my current income, even if something goes wrong?

Be especially careful with quick loans on your phone and with buying on credit for celebrations or consumer goods. If you already have several debts, list them, stop adding new ones and pay them off one at a time, starting with the most expensive.`,

      `## 5. Save together: ibimina and SACCOs

Rwandans have long saved together. Ibimina, savings groups of friends, neighbours or colleagues, help members save regularly, support each other and access small loans at fair terms.

To make a group work well, agree on written rules: how much each member saves, when contributions are due, how loans are given and repaid, and what happens if someone misses a payment. Keep clear records and rotate leadership so trust stays strong.

Umurenge SACCOs, the savings and credit cooperatives in each sector, offer a safer place to keep group or personal savings and can provide larger loans to members with a good savings history. Saving together turns individual discipline into community strength.`,

      `## 6. Grow your money

Savings kept as cash slowly lose value as prices rise. Once your emergency fund is in place, put part of your savings where it can grow.

Options in Rwanda include fixed deposit accounts at banks, government treasury bonds issued through the National Bank of Rwanda, shares listed on the Rwanda Stock Exchange, collective investment funds, and Ejo Heza, the voluntary long-term savings scheme. Each has different risks, returns and rules for withdrawing money.

Learn before you invest. Start with small amounts, spread your money across more than one option, and think in years, not weeks. Use only institutions licensed by the National Bank of Rwanda or the Capital Market Authority, and ask questions until you understand where your money goes.`,

      `## 7. Increase what you earn

Saving matters, but there is a limit to how much you can cut. Over the long term, increasing your income makes the biggest difference.

Invest in skills that employers and customers pay for: digital skills, languages, a trade, accounting, sales, design. Many courses are available online at low cost, and certificates can strengthen your applications.

Ask for more responsibility at work and document your results, so you can negotiate for promotions with evidence. Build a reputation for reliability. When your income rises, increase your savings rate at the same time, before your lifestyle grows to swallow the difference.`,

      `## 8. Start a small business wisely

A side business can grow your income and, in time, become your main source of wealth. Many successful Rwandan businesses began very small: selling vegetables, offering phone repairs, designing logos, tutoring students.

Start with a skill you have and a need you see around you. Test your idea with little money before investing more. Keep business money separate from personal money, record every sale and expense, and pay yourself a fixed amount rather than spending the business’s cash.

Register your business with the Rwanda Development Board when it grows, and learn your tax obligations. Treat your customers well; in a close community, every satisfied customer brings others.`,

      `## 9. Protect what you build

Wealth can disappear in a single accident or illness. Protection is part of building wealth, not a separate subject.

Make sure every family member has health insurance, whether through Mutuelle de santé or an employer scheme. As you acquire valuable property, such as a motorcycle, a shop or a house, consider insurance that matches its value.

Keep important documents safe: land titles, contracts, insurance papers and records of loans you have given or received. Write agreements down, even with family and friends. Clear records prevent disputes and protect your family if something happens to you.`,

      `## 10. Avoid money traps

Every year, people lose savings to schemes that promise quick and guaranteed profits. Be suspicious whenever someone promises high returns with no risk, pressures you to decide immediately, or pays early members with money from new members. These are the marks of pyramid and fraud schemes.

Check that any institution taking your deposits or investments is licensed by the National Bank of Rwanda or the Capital Market Authority. Never share your mobile money PIN, even with someone claiming to be from the company.

Be honest with yourself about betting and gambling. They are designed so that, over time, the house wins. If betting is taking money you need for essentials, it is time to stop and to talk to someone you trust.`,

      `## 11. Wealth and family

In Rwandan culture, supporting family is a value, not a burden. Yet unplanned support can drain savings and create tension.

Include family support in your monthly budget as a fixed amount, so you can help generously without endangering your own security. When relatives ask for larger sums, discuss whether the help could build their independence, such as paying school fees or helping start a small business, rather than covering repeated emergencies.

Teach children about money early: give them small amounts to manage, let them save towards a goal, and talk openly about family finances in an age-appropriate way. Wealth that is understood by the next generation is far more likely to last.`,

      `## Closing: the long view

Building wealth is slow. In the first years, progress can feel invisible. Then, as savings grow, investments earn and skills raise your income, the progress accelerates. The habits you build in your twenties shape the security you enjoy in your forties and beyond.

Start today with one step: track your spending this month, open a savings account, join a well-run savings group, or set a fixed amount to save on payday. Then add the next step.

Wealth is not only money. It is the freedom to make choices, the ability to help others and the peace of knowing your family is protected. That kind of wealth is within reach for anyone willing to build it patiently.`
    ]
  }
]
