'use strict';

/**
 * CHEIRO COMPOUND NUMBER MEANINGS
 * From Cheiro's "Book of Numbers" — the most trusted reference
 * Compound numbers 10–52 carry specific karmic meanings
 * beyond simple single-digit reduction
 */

const CHEIRO_COMPOUNDS = {
  10: { name: 'The Wheel of Fortune', quality: 'positive', meaning: 'Honour, faith, and self-confidence. A highly favourable number. It symbolises the rise and fall of fortune — but always ending in success for those who are willing to apply effort. This number is the number of rise, but also of unexpected downfall if one becomes arrogant.', keywords: ['fortune', 'honour', 'faith', 'leadership', 'rise'] },
  11: { name: 'The Lion Muzzled', quality: 'warning', meaning: 'Hidden dangers, treachery, and difficulties from those around you. This number warns of hidden enemies and unforeseen circumstances. However, it also indicates strength that can overcome these challenges when the individual is spiritually grounded.', keywords: ['hidden danger', 'treachery', 'caution', 'strength', 'awareness'] },
  12: { name: 'The Sacrifice / The Victim', quality: 'warning', meaning: 'Suffering, anxiety, and sacrifice. This number indicates that the person may be sacrificed for the plans and schemes of others. It is one of the most difficult compound numbers, yet it often produces great wisdom through adversity. Those with this vibration should be very careful about who they trust.', keywords: ['sacrifice', 'suffering', 'wisdom through trial', 'caution', 'betrayal'] },
  13: { name: 'The Reaper / Revolution', quality: 'karmic', meaning: 'Change of plans, upheaval, and the unexpected. 13 represents destruction of the old to make way for the new. It is not unlucky — it is transformational. Those who understand this number\'s power use change as a springboard. Those who resist it experience it as loss.', keywords: ['transformation', 'change', 'upheaval', 'destruction', 'new beginning'] },
  14: { name: 'Movement and Challenge', quality: 'mixed', meaning: 'Movement, combination of people and things, and danger from natural forces — fire, earth, air, water. This number is highly volatile. It brings great risks but also great gains for the adaptable. Financial speculation and bold ventures are associated with 14.', keywords: ['risk', 'movement', 'speculation', 'adaptability', 'elements'] },
  15: { name: 'The Magician', quality: 'positive', meaning: 'A very fortunate number for attracting others and gaining their support. Associated with magic, magnetism, and the ability to manifest desires. This number gives the power to influence people and circumstances, sometimes in ways that seem supernatural.', keywords: ['magnetism', 'influence', 'attraction', 'manifestation', 'charisma'] },
  16: { name: 'The Shattered Citadel', quality: 'warning', meaning: 'A strange fatality and danger of accidents from natural forces. Associated with strange events that shatter what seemed secure. This number warns of overconfidence in material structures. Spiritual grounding is essential for those carrying this vibration.', keywords: ['sudden loss', 'overconfidence', 'collapse', 'rebirth', 'humility'] },
  17: { name: 'The Star of Venus / Immortality', quality: 'positive', meaning: 'One of the most fortunate compound numbers. Associated with immortality through one\'s work — the person makes a lasting mark on the world. Success in love, art, and creative endeavours. An eternal quality attaches to whatever this number touches.', keywords: ['immortality', 'legacy', 'artistry', 'love', 'lasting success'] },
  18: { name: 'Treachery / Deception', quality: 'warning', meaning: 'Associated with bitter quarrels and strife with family or friends, danger from enemies, and deceptive elements. Yet those who navigate this number\'s lessons with integrity often emerge as powerful truth-tellers and champions of justice.', keywords: ['deception', 'quarrels', 'enemies', 'justice', 'perseverance'] },
  19: { name: 'The Prince of Heaven', quality: 'positive', meaning: 'One of the most fortunate and favourable compound numbers. Represents success, esteem from others, happiness, and the ability to rise above adversity. Indicates a strong, fortunate destiny when the individual aligns with their highest purpose.', keywords: ['success', 'esteem', 'happiness', 'overcoming', 'blessed'] },
  20: { name: 'The Awakening', quality: 'positive', meaning: 'Associated with a new purpose and a calling to rise above the material. This number signals a spiritual awakening or a new mission. Those with 20 in their chart often feel a sense of destiny calling them to serve at a higher level.', keywords: ['awakening', 'calling', 'purpose', 'spiritual mission', 'rise'] },
  21: { name: 'The Universe / Crown of the Magi', quality: 'positive', meaning: 'One of the most fortunate numbers. Represents advancement, elevation in life, honour, and ultimate success after struggle. This number never leaves one stranded — it always opens a door, often unexpectedly.', keywords: ['advancement', 'honour', 'elevation', 'unexpected help', 'ultimate success'] },
  22: { name: 'Caution / The Fool', quality: 'karmic', meaning: 'A master number of immense potential but also a warning of self-deception. When 22 is reduced to 4 without acknowledgement of its master quality, efforts are wasted. When embraced as a master number, it brings the power to build systems and institutions that outlast the individual.', keywords: ['master builder', 'caution', 'potential', 'self-deception risk', 'legacy'] },
  23: { name: 'The Royal Star of the Lion', quality: 'positive', meaning: 'The most blessed single number in Cheiro\'s system. Promises help from superiors, success in all endeavours, protection from above, and special favour from the cosmos. Called the "Royal Star" because it never leaves one without support.', keywords: ['blessing', 'royal favour', 'protection', 'guaranteed success', 'support from above'] },
  24: { name: 'Love, Money, and Creativity', quality: 'positive', meaning: 'Assistance from those in power, good fortune in love, money, and creative arts. This number attracts support and resources from unexpected quarters. Particularly powerful for those in the arts, business, or politics.', keywords: ['love', 'money', 'creative arts', 'assistance', 'good fortune'] },
  25: { name: 'Strength Through Experience', quality: 'positive', meaning: 'Success in the second half of life after early trials. This number indicates wisdom gained through experience. The person learns from adversity and becomes stronger, emerging as an authoritative voice in their field.', keywords: ['wisdom', 'experience', 'late success', 'authority', 'learning'] },
  26: { name: 'Partnerships — Dangerous', quality: 'warning', meaning: 'A number of grave warning for partnerships and alliances. Associations with others may bring ruin unless carefully chosen. Business partnerships are especially risky. However, 26 individuals often rise by serving others rather than competing with them.', keywords: ['partnership risk', 'alliance caution', 'service', 'warning', 'careful selection'] },
  27: { name: 'The Sceptre', quality: 'positive', meaning: 'A most favourable number. Promises authority, power, and command. The individual is born to lead. This number indicates that the person\'s word will carry great weight and their decisions will shape the lives of others.', keywords: ['authority', 'power', 'command', 'leadership', 'influence'] },
  28: { name: 'A Broken Pillar / Unexpected Loss', quality: 'warning', meaning: 'Loss through trust in others. This number warns of misplaced confidence — you may fight for others and find them ungrateful or treacherous. However, 28 individuals often find that their greatest strength comes from rebuilding after loss.', keywords: ['loss', 'misplaced trust', 'rebuilding', 'resilience', 'caution with trust'] },
  29: { name: 'Grace Under Pressure', quality: 'mixed', meaning: 'A number of trials and treachery from others, yet also of ultimate triumph through perseverance and grace. This number is not easy, but those who maintain their integrity through its trials emerge as respected and formidable.', keywords: ['trials', 'treachery', 'grace', 'perseverance', 'ultimate triumph'] },
  30: { name: 'The Loner / Meditation', quality: 'positive', meaning: 'A number of retrospection and solitude. Associated with the ability to think deeply and to work independently. It is not a material number — those with 30 often seek wisdom over wealth. Favourable for spiritual and intellectual pursuits.', keywords: ['solitude', 'meditation', 'wisdom', 'independence', 'intellectual depth'] },
  31: { name: 'The Hermit', quality: 'neutral', meaning: 'Similar to 30 — associated with solitude, but with more emphasis on self-reliance. The individual tends to prefer their own company and does their best work alone. This is not unlucky — it is the energy of the self-sufficient genius.', keywords: ['self-reliance', 'solitude', 'independent genius', 'introspection', 'self-sufficient'] },
  32: { name: 'Communication — The Master of Words', quality: 'positive', meaning: 'This number is associated with the magnetic power of communication. A highly favourable number for those in writing, speaking, or any form of persuasion. The individual can convince almost anyone of almost anything through the power of their words.', keywords: ['communication', 'persuasion', 'writing', 'speaking', 'magnetism'] },
  33: { name: 'The Master Teacher', quality: 'karmic', meaning: 'The highest master number. Associated with a divine mission to heal, teach, and uplift humanity. This number carries great responsibility — it asks the individual to give up personal desires in service to a higher calling. When answered, it brings profound fulfilment.', keywords: ['master teacher', 'healing', 'sacrifice', 'divine mission', 'highest calling'] },
  34: { name: 'Wisdom Through Service', quality: 'positive', meaning: 'Associated with practical wisdom and service to others. This number indicates that success comes through helping others achieve their goals. A highly favourable number for teachers, counsellors, and healers.', keywords: ['service', 'wisdom', 'counselling', 'practical help', 'others\' success'] },
  35: { name: 'Leadership Through Commerce', quality: 'positive', meaning: 'Success in business and commerce. This number gives the ability to lead enterprises and organisations. Financial acumen combined with leadership makes this a powerful number for entrepreneurs.', keywords: ['business', 'commerce', 'enterprise', 'leadership', 'financial success'] },
  36: { name: 'Wisdom and Philosophy', quality: 'positive', meaning: 'Associated with wisdom gained through deep thought and philosophical inquiry. This number produces great thinkers, philosophers, and spiritual teachers. Success comes through the application of profound insight.', keywords: ['philosophy', 'wisdom', 'deep thought', 'teaching', 'insight'] },
  37: { name: 'Emotional and Romantic', quality: 'positive', meaning: 'Strong associations with love, friendship, and close personal bonds. This number is highly favourable for personal relationships and artistic endeavours. The individual has a magnetic quality in personal connections.', keywords: ['love', 'friendship', 'romance', 'personal magnetism', 'artistic'] },
  38: { name: 'Trials in Partnership', quality: 'warning', meaning: 'Similar to 26 — difficulties in partnerships. Business and personal relationships require great care. The individual often achieves more alone than in collaboration. However, the right partner, chosen carefully, can change everything.', keywords: ['partnership caution', 'trials', 'independence', 'careful selection', 'resilience'] },
  39: { name: 'Creative Power', quality: 'positive', meaning: 'Associated with artistic talent, creative force, and the ability to inspire others. This number produces outstanding artists, performers, and creative visionaries whose work touches the hearts of many.', keywords: ['artistry', 'creative power', 'inspiration', 'performance', 'vision'] },
  40: { name: 'Isolation and Independence', quality: 'neutral', meaning: 'A number of isolation — but not necessarily painful isolation. The individual operates best alone, building systems and knowledge independently. Like 30 and 31, this energy is not materialistic but deeply productive in solitary pursuits.', keywords: ['isolation', 'independence', 'solitary work', 'systems building', 'depth'] },
  41: { name: 'The Community Builder', quality: 'positive', meaning: 'Success through bringing people together. This number has the power to unite disparate groups and build communities. A favourable number for social reformers, political leaders, and community organisers.', keywords: ['community', 'unity', 'social reform', 'leadership', 'bringing together'] },
  42: { name: 'Partnership Success', quality: 'positive', meaning: 'Success through partnerships and alliances. Unlike 26 and 38, the partnerships formed under 42 tend to be beneficial and lasting. This number thrives in cooperation and finds its greatest achievements through teamwork.', keywords: ['partnership', 'alliance', 'cooperation', 'teamwork', 'mutual success'] },
  43: { name: 'Strife and Revolution', quality: 'warning', meaning: 'A number of revolution, upheaval, and conflict. Associated with periods of great change that may be painful but ultimately necessary. Those with this vibration are often agents of change — whether they choose to be or not.', keywords: ['revolution', 'upheaval', 'conflict', 'change agent', 'transformation'] },
  44: { name: 'The Master Manifestor (Double 4)', quality: 'karmic', meaning: 'An intensified master energy — the doubled power of 4 (structure and discipline) without reduction. Associated with extraordinary ability to build lasting material structures, institutions, and enterprises. Demands great discipline in return for great achievement.', keywords: ['master manifestor', 'material mastery', 'discipline', 'lasting structures', 'achievement'] },
  45: { name: 'Wealth and Power', quality: 'positive', meaning: 'Associated with great material success, power, and influence. This number attracts wealth through consistent effort and strategic thinking. A particularly favourable number for business and leadership.', keywords: ['wealth', 'power', 'influence', 'business success', 'strategic thinking'] },
  46: { name: 'Permanent Success', quality: 'positive', meaning: 'One of the most fortunate compound numbers for long-term success. Associates with achievement that lasts beyond the lifetime of the individual. Their work, ideas, or institutions continue to serve others long after they are gone.', keywords: ['permanent success', 'legacy', 'lasting achievement', 'generational impact', 'enduring work'] },
  47: { name: 'Wisdom and Knowledge', quality: 'positive', meaning: 'Success through the accumulation and application of knowledge. This number produces scholars, scientists, and researchers whose discoveries benefit many. Great depth of understanding is both the gift and the responsibility.', keywords: ['knowledge', 'scholarship', 'research', 'discovery', 'depth of understanding'] },
  48: { name: 'Spiritual Teaching', quality: 'positive', meaning: 'Associated with spiritual wisdom and the ability to teach it to others. This number produces spiritual leaders, mentors, and guides whose influence spreads far beyond their immediate circle.', keywords: ['spiritual wisdom', 'mentorship', 'teaching', 'guidance', 'spreading light'] },
  49: { name: 'Resolution and Completion', quality: 'positive', meaning: 'A number of completion and resolution. Associated with the tying up of loose ends and the successful conclusion of long-running endeavours. Particularly favourable for completing projects, resolving conflicts, and bringing matters to a satisfying close.', keywords: ['completion', 'resolution', 'closure', 'success after long effort', 'tying loose ends'] },
  50: { name: 'Permanence and Stability', quality: 'positive', meaning: 'Associated with great permanence and the ability to create stable, lasting structures. This number favours those in architecture, governance, or any field requiring long-term vision and reliable foundations.', keywords: ['permanence', 'stability', 'long-term vision', 'foundation building', 'reliability'] },
  51: { name: 'The Warrior / Centre of Power', quality: 'positive', meaning: 'A number of great power and strength. Associated with those who fight for what they believe in and ultimately win. This number produces great leaders who overcome seemingly impossible odds through sheer force of will and clarity of purpose.', keywords: ['warrior spirit', 'power', 'overcoming odds', 'force of will', 'victory'] },
  52: { name: 'Change and Ambition', quality: 'positive', meaning: 'Associated with change and the ambition to achieve. This number moves forward consistently and does not look back. Success comes through embracing change and maintaining a clear sense of personal ambition.', keywords: ['ambition', 'change', 'forward movement', 'achievement', 'clarity of purpose'] },
};

/**
 * Get Cheiro compound meaning for any sum
 */
function getCheiroCom(sum) {
  const n = Number(sum);
  if (n < 10) return null; // Single digits have no compound meaning

  const compound = CHEIRO_COMPOUNDS[n];
  if (compound) return { number: n, ...compound };

  // For numbers > 52, return the reduced compound
  if (n > 52) {
    const digits = String(n).split('').reduce((a, d) => a + Number(d), 0);
    return getCheiroCom(digits);
  }

  return null;
}

/**
 * Get compound insight for a specific number in context
 */
function getCompoundInsight(sum, context = 'general') {
  const compound = getCheiroCom(sum);
  if (!compound) return null;

  return {
    ...compound,
    context,
    practicalNote: buildPracticalNote(compound),
  };
}

function buildPracticalNote(compound) {
  if (compound.quality === 'positive') {
    return `The compound number ${compound.number} (${compound.name}) is favourable. Its energy supports your goals and brings natural assistance.`;
  } else if (compound.quality === 'warning') {
    return `The compound number ${compound.number} (${compound.name}) carries a caution. Awareness of its patterns allows you to navigate them consciously rather than be controlled by them.`;
  } else if (compound.quality === 'karmic') {
    return `The compound number ${compound.number} (${compound.name}) is a master/karmic vibration. It carries both great potential and great responsibility. Do not reduce it — honour both its power and its demands.`;
  }
  return `The compound number ${compound.number} (${compound.name}) carries a neutral, situational energy.`;
}

module.exports = { getCheiroCom, getCompoundInsight, CHEIRO_COMPOUNDS };
