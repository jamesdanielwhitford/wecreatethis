// Tarot card data - Major Arcana
const TAROT_CARDS = [
    {
        name: 'The Fool',
        number: 0,
        upright: ['New beginnings', 'Innocence', 'Adventure', 'Freedom'],
        reversed: ['Recklessness', 'Naivety', 'Poor judgment', 'Foolishness']
    },
    {
        name: 'The Magician',
        number: 1,
        upright: ['Manifestation', 'Power', 'Skill', 'Concentration'],
        reversed: ['Manipulation', 'Illusion', 'Untapped potential']
    },
    {
        name: 'The High Priestess',
        number: 2,
        upright: ['Intuition', 'Mystery', 'Subconscious', 'Inner voice'],
        reversed: ['Hidden agendas', 'Secrets', 'Disconnect from intuition']
    },
    {
        name: 'The Empress',
        number: 3,
        upright: ['Abundance', 'Nurturing', 'Fertility', 'Nature'],
        reversed: ['Dependence', 'Creative block', 'Neglect']
    },
    {
        name: 'The Emperor',
        number: 4,
        upright: ['Authority', 'Structure', 'Control', 'Leadership'],
        reversed: ['Tyranny', 'Rigidity', 'Domination']
    },
    {
        name: 'The Hierophant',
        number: 5,
        upright: ['Tradition', 'Conformity', 'Education', 'Belief systems'],
        reversed: ['Rebellion', 'Unconventional', 'Freedom']
    },
    {
        name: 'The Lovers',
        number: 6,
        upright: ['Love', 'Harmony', 'Relationships', 'Choices'],
        reversed: ['Disharmony', 'Imbalance', 'Misalignment']
    },
    {
        name: 'The Chariot',
        number: 7,
        upright: ['Control', 'Willpower', 'Success', 'Determination'],
        reversed: ['Lack of direction', 'Opposition', 'Self-discipline']
    },
    {
        name: 'Strength',
        number: 8,
        upright: ['Courage', 'Patience', 'Compassion', 'Inner strength'],
        reversed: ['Weakness', 'Self-doubt', 'Lack of confidence']
    },
    {
        name: 'The Hermit',
        number: 9,
        upright: ['Soul searching', 'Introspection', 'Inner guidance', 'Solitude'],
        reversed: ['Isolation', 'Loneliness', 'Withdrawal']
    },
    {
        name: 'Wheel of Fortune',
        number: 10,
        upright: ['Change', 'Cycles', 'Destiny', 'Turning point'],
        reversed: ['Bad luck', 'Resistance to change', 'Breaking cycles']
    },
    {
        name: 'Justice',
        number: 11,
        upright: ['Fairness', 'Truth', 'Law', 'Cause and effect'],
        reversed: ['Unfairness', 'Dishonesty', 'Unaccountability']
    },
    {
        name: 'The Hanged Man',
        number: 12,
        upright: ['Suspension', 'Letting go', 'New perspective', 'Sacrifice'],
        reversed: ['Stalling', 'Resistance', 'Indecision']
    },
    {
        name: 'Death',
        number: 13,
        upright: ['Transformation', 'Endings', 'Change', 'Transition'],
        reversed: ['Resistance to change', 'Stagnation', 'Decay']
    },
    {
        name: 'Temperance',
        number: 14,
        upright: ['Balance', 'Moderation', 'Patience', 'Purpose'],
        reversed: ['Imbalance', 'Excess', 'Lack of harmony']
    },
    {
        name: 'The Devil',
        number: 15,
        upright: ['Bondage', 'Materialism', 'Addiction', 'Playfulness'],
        reversed: ['Freedom', 'Release', 'Breaking chains']
    },
    {
        name: 'The Tower',
        number: 16,
        upright: ['Upheaval', 'Revelation', 'Sudden change', 'Awakening'],
        reversed: ['Avoiding disaster', 'Fear of change', 'Delayed disaster']
    },
    {
        name: 'The Star',
        number: 17,
        upright: ['Hope', 'Inspiration', 'Serenity', 'Renewal'],
        reversed: ['Hopelessness', 'Despair', 'Disconnection']
    },
    {
        name: 'The Moon',
        number: 18,
        upright: ['Illusion', 'Intuition', 'Unconscious', 'Dreams'],
        reversed: ['Fear', 'Confusion', 'Misinterpretation']
    },
    {
        name: 'The Sun',
        number: 19,
        upright: ['Joy', 'Success', 'Celebration', 'Positivity'],
        reversed: ['Temporary depression', 'Lack of success', 'Sadness']
    },
    {
        name: 'Judgment',
        number: 20,
        upright: ['Reflection', 'Reckoning', 'Awakening', 'Renewal'],
        reversed: ['Self-doubt', 'Lack of self-awareness', 'Judgment']
    },
    {
        name: 'The World',
        number: 21,
        upright: ['Completion', 'Achievement', 'Fulfillment', 'Travel'],
        reversed: ['Incompletion', 'Lack of closure', 'Seeking closure']
    },

    // Minor Arcana - Suit of Wands
    {
        name: 'Ace of Wands',
        suit: 'wands',
        upright: ['Inspiration', 'New opportunities', 'Growth', 'Potential'],
        reversed: ['Lack of energy', 'Delays', 'Setbacks']
    },
    {
        name: 'Two of Wands',
        suit: 'wands',
        upright: ['Planning', 'Future', 'Progress', 'Decisions'],
        reversed: ['Fear of change', 'Lack of planning', 'Bad decisions']
    },
    {
        name: 'Three of Wands',
        suit: 'wands',
        upright: ['Expansion', 'Foresight', 'Overseas opportunities'],
        reversed: ['Obstacles', 'Delays', 'Frustration']
    },
    {
        name: 'Four of Wands',
        suit: 'wands',
        upright: ['Celebration', 'Harmony', 'Home', 'Marriage'],
        reversed: ['Instability', 'Lack of support', 'Transition']
    },
    {
        name: 'Five of Wands',
        suit: 'wands',
        upright: ['Conflict', 'Competition', 'Disagreements'],
        reversed: ['Avoiding conflict', 'Cooperation', 'Agreement']
    },
    {
        name: 'Six of Wands',
        suit: 'wands',
        upright: ['Success', 'Victory', 'Recognition', 'Pride'],
        reversed: ['Failure', 'Lack of recognition', 'Ego']
    },
    {
        name: 'Seven of Wands',
        suit: 'wands',
        upright: ['Challenge', 'Perseverance', 'Defense'],
        reversed: ['Giving up', 'Overwhelmed', 'Weakness']
    },
    {
        name: 'Eight of Wands',
        suit: 'wands',
        upright: ['Speed', 'Action', 'Movement', 'Quick decisions'],
        reversed: ['Delays', 'Frustration', 'Resisting change']
    },
    {
        name: 'Nine of Wands',
        suit: 'wands',
        upright: ['Resilience', 'Persistence', 'Courage'],
        reversed: ['Exhaustion', 'Paranoia', 'Giving up']
    },
    {
        name: 'Ten of Wands',
        suit: 'wands',
        upright: ['Burden', 'Responsibility', 'Hard work', 'Stress'],
        reversed: ['Release', 'Delegation', 'Letting go']
    },
    {
        name: 'Page of Wands',
        suit: 'wands',
        upright: ['Enthusiasm', 'Exploration', 'Discovery', 'Free spirit'],
        reversed: ['Setbacks', 'Lack of direction', 'Procrastination']
    },
    {
        name: 'Knight of Wands',
        suit: 'wands',
        upright: ['Energy', 'Passion', 'Adventure', 'Impulsiveness'],
        reversed: ['Recklessness', 'Impatience', 'Haste']
    },
    {
        name: 'Queen of Wands',
        suit: 'wands',
        upright: ['Confidence', 'Independence', 'Determination'],
        reversed: ['Selfishness', 'Jealousy', 'Insecurity']
    },
    {
        name: 'King of Wands',
        suit: 'wands',
        upright: ['Leadership', 'Vision', 'Entrepreneurship'],
        reversed: ['Impulsiveness', 'Ruthlessness', 'High expectations']
    },

    // Minor Arcana - Suit of Cups
    {
        name: 'Ace of Cups',
        suit: 'cups',
        upright: ['Love', 'New relationships', 'Compassion', 'Creativity'],
        reversed: ['Emotional loss', 'Blocked creativity', 'Emptiness']
    },
    {
        name: 'Two of Cups',
        suit: 'cups',
        upright: ['Partnership', 'Unity', 'Connection', 'Attraction'],
        reversed: ['Imbalance', 'Broken relationship', 'Distrust']
    },
    {
        name: 'Three of Cups',
        suit: 'cups',
        upright: ['Friendship', 'Celebration', 'Community', 'Joy'],
        reversed: ['Overindulgence', 'Isolation', 'Gossip']
    },
    {
        name: 'Four of Cups',
        suit: 'cups',
        upright: ['Meditation', 'Contemplation', 'Apathy', 'Reevaluation'],
        reversed: ['Awareness', 'Acceptance', 'Moving forward']
    },
    {
        name: 'Five of Cups',
        suit: 'cups',
        upright: ['Loss', 'Grief', 'Disappointment', 'Sadness'],
        reversed: ['Acceptance', 'Moving on', 'Finding peace']
    },
    {
        name: 'Six of Cups',
        suit: 'cups',
        upright: ['Nostalgia', 'Memories', 'Innocence', 'Reunion'],
        reversed: ['Living in the past', 'Naivety', 'Unrealistic']
    },
    {
        name: 'Seven of Cups',
        suit: 'cups',
        upright: ['Choices', 'Illusion', 'Fantasy', 'Wishful thinking'],
        reversed: ['Clarity', 'Decision', 'Reality check']
    },
    {
        name: 'Eight of Cups',
        suit: 'cups',
        upright: ['Walking away', 'Withdrawal', 'Searching', 'Letting go'],
        reversed: ['Stagnation', 'Fear of moving on', 'Avoidance']
    },
    {
        name: 'Nine of Cups',
        suit: 'cups',
        upright: ['Satisfaction', 'Contentment', 'Wishes', 'Fulfillment'],
        reversed: ['Greed', 'Dissatisfaction', 'Materialism']
    },
    {
        name: 'Ten of Cups',
        suit: 'cups',
        upright: ['Harmony', 'Family', 'Happiness', 'Emotional fulfillment'],
        reversed: ['Broken family', 'Disconnection', 'Misalignment']
    },
    {
        name: 'Page of Cups',
        suit: 'cups',
        upright: ['Creativity', 'Intuition', 'Curiosity', 'New ideas'],
        reversed: ['Emotional immaturity', 'Blocked creativity', 'Escapism']
    },
    {
        name: 'Knight of Cups',
        suit: 'cups',
        upright: ['Romance', 'Charm', 'Imagination', 'Following the heart'],
        reversed: ['Moodiness', 'Unrealistic', 'Jealousy']
    },
    {
        name: 'Queen of Cups',
        suit: 'cups',
        upright: ['Compassion', 'Calm', 'Emotional stability', 'Intuition'],
        reversed: ['Insecurity', 'Emotional instability', 'Codependency']
    },
    {
        name: 'King of Cups',
        suit: 'cups',
        upright: ['Emotional balance', 'Diplomacy', 'Compassion'],
        reversed: ['Manipulation', 'Emotional volatility', 'Moodiness']
    },

    // Minor Arcana - Suit of Swords
    {
        name: 'Ace of Swords',
        suit: 'swords',
        upright: ['Clarity', 'Breakthrough', 'New ideas', 'Mental clarity'],
        reversed: ['Confusion', 'Chaos', 'Lack of clarity']
    },
    {
        name: 'Two of Swords',
        suit: 'swords',
        upright: ['Difficult decisions', 'Stalemate', 'Avoidance'],
        reversed: ['Indecision', 'Confusion', 'Information overload']
    },
    {
        name: 'Three of Swords',
        suit: 'swords',
        upright: ['Heartbreak', 'Sorrow', 'Grief', 'Pain'],
        reversed: ['Recovery', 'Forgiveness', 'Moving on']
    },
    {
        name: 'Four of Swords',
        suit: 'swords',
        upright: ['Rest', 'Restoration', 'Meditation', 'Recovery'],
        reversed: ['Burnout', 'Restlessness', 'Stagnation']
    },
    {
        name: 'Five of Swords',
        suit: 'swords',
        upright: ['Conflict', 'Defeat', 'Winning at all costs'],
        reversed: ['Reconciliation', 'Making amends', 'Moving on']
    },
    {
        name: 'Six of Swords',
        suit: 'swords',
        upright: ['Transition', 'Change', 'Moving on', 'Travel'],
        reversed: ['Resistance to change', 'Stuck', 'Baggage']
    },
    {
        name: 'Seven of Swords',
        suit: 'swords',
        upright: ['Deception', 'Strategy', 'Betrayal', 'Sneakiness'],
        reversed: ['Coming clean', 'Rethinking approach', 'Conscience']
    },
    {
        name: 'Eight of Swords',
        suit: 'swords',
        upright: ['Restriction', 'Confusion', 'Powerlessness', 'Victimization'],
        reversed: ['Freedom', 'Release', 'Taking control']
    },
    {
        name: 'Nine of Swords',
        suit: 'swords',
        upright: ['Anxiety', 'Worry', 'Nightmares', 'Fear'],
        reversed: ['Hope', 'Recovery', 'Facing fears']
    },
    {
        name: 'Ten of Swords',
        suit: 'swords',
        upright: ['Painful ending', 'Betrayal', 'Loss', 'Rock bottom'],
        reversed: ['Recovery', 'Regeneration', 'Moving forward']
    },
    {
        name: 'Page of Swords',
        suit: 'swords',
        upright: ['Curiosity', 'Restlessness', 'Mental energy', 'Vigilance'],
        reversed: ['Deception', 'Manipulation', 'All talk']
    },
    {
        name: 'Knight of Swords',
        suit: 'swords',
        upright: ['Action', 'Impulsiveness', 'Ambition', 'Driven'],
        reversed: ['Recklessness', 'Scattered energy', 'Impatience']
    },
    {
        name: 'Queen of Swords',
        suit: 'swords',
        upright: ['Independent', 'Clear thinking', 'Honest', 'Direct'],
        reversed: ['Cold', 'Cruel', 'Bitter', 'Unforgiving']
    },
    {
        name: 'King of Swords',
        suit: 'swords',
        upright: ['Authority', 'Truth', 'Intellectual power', 'Clear thinking'],
        reversed: ['Manipulation', 'Tyranny', 'Abuse of power']
    },

    // Minor Arcana - Suit of Pentacles
    {
        name: 'Ace of Pentacles',
        suit: 'pentacles',
        upright: ['Opportunity', 'Prosperity', 'New venture', 'Manifestation'],
        reversed: ['Lost opportunity', 'Missed chance', 'Lack of planning']
    },
    {
        name: 'Two of Pentacles',
        suit: 'pentacles',
        upright: ['Balance', 'Adaptability', 'Time management', 'Prioritization'],
        reversed: ['Imbalance', 'Disorganization', 'Overwhelmed']
    },
    {
        name: 'Three of Pentacles',
        suit: 'pentacles',
        upright: ['Teamwork', 'Collaboration', 'Learning', 'Craftsmanship'],
        reversed: ['Lack of teamwork', 'Disharmony', 'Poor quality']
    },
    {
        name: 'Four of Pentacles',
        suit: 'pentacles',
        upright: ['Control', 'Stability', 'Security', 'Possession'],
        reversed: ['Greed', 'Material loss', 'Letting go']
    },
    {
        name: 'Five of Pentacles',
        suit: 'pentacles',
        upright: ['Financial loss', 'Poverty', 'Hardship', 'Isolation'],
        reversed: ['Recovery', 'Improvement', 'Spiritual poverty']
    },
    {
        name: 'Six of Pentacles',
        suit: 'pentacles',
        upright: ['Generosity', 'Charity', 'Sharing', 'Giving'],
        reversed: ['Debt', 'Strings attached', 'One-sided charity']
    },
    {
        name: 'Seven of Pentacles',
        suit: 'pentacles',
        upright: ['Assessment', 'Reward', 'Investment', 'Long-term view'],
        reversed: ['Impatience', 'Lack of reward', 'Wasted effort']
    },
    {
        name: 'Eight of Pentacles',
        suit: 'pentacles',
        upright: ['Skill', 'Craftsmanship', 'Diligence', 'Apprenticeship'],
        reversed: ['Lack of focus', 'Mediocrity', 'Rushed job']
    },
    {
        name: 'Nine of Pentacles',
        suit: 'pentacles',
        upright: ['Abundance', 'Luxury', 'Self-sufficiency', 'Independence'],
        reversed: ['Overspending', 'Financial setbacks', 'Lack of stability']
    },
    {
        name: 'Ten of Pentacles',
        suit: 'pentacles',
        upright: ['Wealth', 'Legacy', 'Family', 'Long-term success'],
        reversed: ['Financial failure', 'Broken family', 'Lost inheritance']
    },
    {
        name: 'Page of Pentacles',
        suit: 'pentacles',
        upright: ['Manifestation', 'Financial opportunity', 'New job', 'Ambition'],
        reversed: ['Lack of progress', 'Procrastination', 'Missed opportunity']
    },
    {
        name: 'Knight of Pentacles',
        suit: 'pentacles',
        upright: ['Responsibility', 'Hard work', 'Productivity', 'Routine'],
        reversed: ['Laziness', 'Perfectionism', 'Boredom']
    },
    {
        name: 'Queen of Pentacles',
        suit: 'pentacles',
        upright: ['Nurturing', 'Practical', 'Providing', 'Down-to-earth'],
        reversed: ['Self-care neglect', 'Work-life imbalance', 'Smothering']
    },
    {
        name: 'King of Pentacles',
        suit: 'pentacles',
        upright: ['Wealth', 'Business', 'Abundance', 'Security'],
        reversed: ['Greed', 'Materialism', 'Financial instability']
    }
];

// Spread configurations
const SPREADS = {
    single: {
        name: 'Single Card',
        positions: [
            { name: 'Your Message', description: 'The message for today' }
        ]
    },
    three: {
        name: 'Three Card Spread',
        positions: [
            { name: 'Past', description: 'What has led to this moment' },
            { name: 'Present', description: 'Where you are now' },
            { name: 'Future', description: 'Where you are heading' }
        ]
    },
    celtic: {
        name: 'Celtic Cross',
        positions: [
            { name: 'Present', description: 'The current situation' },
            { name: 'Challenge', description: 'What crosses or challenges you' },
            { name: 'Foundation', description: 'The foundation or root cause' },
            { name: 'Past', description: 'Recent past' },
            { name: 'Crown', description: 'Potential outcome' },
            { name: 'Future', description: 'Near future' },
            { name: 'Self', description: 'Your role or attitude' },
            { name: 'Environment', description: 'External influences' },
            { name: 'Hopes/Fears', description: 'Your hopes and fears' },
            { name: 'Outcome', description: 'The final outcome' }
        ]
    }
};
