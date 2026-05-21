'use strict';

/**
 * ANGEL NUMBERS SERVICE
 * Meanings for repeating and sequential number patterns
 * Most searched numerology content globally
 */

const ANGEL_NUMBERS = {
  // Single repeating
  '000': { title: 'Divine infinite potential', realm: 'Spiritual reset', message: 'A powerful reset point. The universe is asking you to reflect before you begin. You are at the start of an infinite loop of creation. Set your intention clearly — what you plant now grows without limit.', action: 'Meditate. Journal your deepest desire. The universe is listening.' },
  '111': { title: 'Manifestation portal open', realm: 'Thoughts become reality', message: 'Your thoughts are manifesting rapidly right now. 111 is a reminder to keep your mind focused on what you want, not what you fear. This is a direct channel between your mind and the universe.', action: 'Write down exactly what you wish to create. Eliminate negative self-talk immediately.' },
  '222': { title: 'Trust the process', realm: 'Faith & balance', message: 'You are exactly where you need to be. 222 asks for patience and trust. Seeds you have planted are growing beneath the surface. Balance and cooperation will bring what you seek.', action: 'Stop forcing outcomes. Trust the timing. Nurture existing relationships.' },
  '333': { title: 'Ascended masters are near', realm: 'Creative expansion', message: 'The ascended masters — Buddha, Christ, saints, and sages — are around you. Your creative gifts are needed. Express yourself without holding back. Your voice and ideas matter more than you know.', action: 'Create something. Speak your truth. Your unique gifts are the message.' },
  '444': { title: 'Angelic support surrounds you', realm: 'Protection & foundation', message: 'The angels are with you, building a foundation beneath your feet. 444 is the most protective number sequence. You are not alone. Hard work is supported. The structure you are building will last.', action: 'Keep going. You are protected. Commit to the work. It is solid.' },
  '555': { title: 'Major change incoming', realm: 'Transformation', message: 'A significant change is coming — or already underway. 555 asks you to release resistance and flow. This change is divinely guided even if it feels uncomfortable. Something old must fall for something new to rise.', action: 'Let go of control. Embrace what is shifting. Change is the answer, not the problem.' },
  '666': { title: 'Rebalance thoughts & material focus', realm: 'Mind-matter balance', message: 'Despite popular misconception, 666 is a gentle reminder from the universe to rebalance. You may be overly focused on material concerns, worry, or fear. Shift perspective toward love and spirit.', action: 'Step away from screens and stress. Reconnect with nature, loved ones, or prayer.' },
  '777': { title: 'You are on the right path', realm: 'Divine alignment', message: '777 is the most spiritually aligned number sequence. You are in direct flow with the divine. Good fortune is near. Your choices have been correct. Keep your faith strong — the universe confirms your path.', action: 'Celebrate quietly. Deepen your spiritual practice. Share your light with others.' },
  '888': { title: 'Abundance cycle activating', realm: 'Material & spiritual wealth', message: 'Infinite abundance — the figure eight rotated — is flowing toward you. Financial blessings, completion of cycles, and karmic rewards are arriving. You have earned this.', action: 'Receive with gratitude. Give generously. What goes around comes around — in your favour.' },
  '999': { title: 'A cycle is complete', realm: 'Endings & humanitarian calling', message: 'A major chapter of your life is ending. 999 signals completion — not loss, but liberation. You are being called to a higher purpose, one that serves not just yourself but others. Let the old go with gratitude.', action: 'Complete unfinished business. Forgive. Release. Prepare for a new beginning.' },

  // Double digit patterns
  '1010': { title: 'Step into your higher self', realm: 'Spiritual awakening + new cycle', message: '1010 combines new beginnings (1) with infinite potential (0). The universe is inviting you to step into a higher version of yourself. You are awakening to your true path.', action: 'Meditate on your authentic self. What would your highest self do today?' },
  '1111': { title: 'Manifestation gateway — make a wish', realm: 'Soul alignment', message: 'The most powerful manifestation portal. Your soul is aligned with the universe. A wish made at 11:11 is said to be heard directly. You are exactly where you are supposed to be.', action: 'State your deepest intention clearly. Then release attachment to how it arrives.' },
  '1212': { title: 'Keep positive focus', realm: 'Balance + manifestation', message: 'You are being prepared for your life purpose. Stay positive and keep moving forward even when progress seems slow. 1212 reminds you that your thoughts create your reality right now.', action: 'Audit your thoughts. Replace every fear-based thought with its positive opposite.' },
  '1234': { title: 'Step by step progress', realm: 'Sequential growth', message: 'You are progressing exactly as you should — one step at a time. 1-2-3-4 is the universe showing you a staircase. Do not skip steps. Every stage has its lesson and gift.', action: 'Focus on the very next step. Not the whole staircase. What is step one today?' },
  '2222': { title: 'Divine patience is the key', realm: 'Deep trust', message: 'Everything you have been working toward is about to manifest, but it requires your patience right now. Trust at the deepest level is being asked. Do not give up — you are closer than you think.', action: 'Stop checking for results. Trust. Maintain your practice without attachment.' },
  '3333': { title: 'Creativity and spirit amplified', realm: 'Creative mastery', message: 'The divine creative force is moving powerfully through you right now. 3333 is a call to fully embrace and express your gifts. What you create now carries extraordinary spiritual energy.', action: 'Create without editing yourself. What wants to be born through you?' },
  '4444': { title: 'Angelic army walks with you', realm: 'Maximum protection', message: 'An extraordinary level of angelic protection surrounds you. 4444 is the fullest possible form of divine support. You are completely safe to move forward. Build without fear.', action: 'Take the courageous step you have been delaying. You are fully protected.' },
  '5555': { title: 'Radical transformation begins', realm: 'Life-altering change', message: 'A massive transformation — perhaps the biggest of this lifetime — is underway. 5555 signals a turning point. Everything is about to shift. The change may feel disorienting but it leads to freedom.', action: 'Release all resistance. Radical acceptance of what is changing is your power.' },

  // Sacred combinations
  '1111': { title: 'Master manifestation gateway', realm: 'Soul contract alignment', message: 'The most powerful sequence in angel numerology. A portal between intention and reality. Your soul contract is being activated. What you are about to receive was agreed upon before birth.', action: 'Be completely present. Your highest self is speaking. Listen deeply.' },
  '1221': { title: 'Mirror moment', realm: 'Reflection + renewal', message: 'What you put out returns to you — a perfect mirror. 1221 asks you to reflect on what energy you are projecting. Your outer world is showing you your inner world.', action: 'Observe your patterns. What are you attracting? That is what you are becoming.' },
  '0000': { title: 'Source connection — infinite loop', realm: 'Divine source', message: 'A direct connection to Source energy. This rare sequence appears at pivotal spiritual moments. You are being asked to surrender completely to the divine and release all ego attachments.', action: 'Meditate without agenda. Simply be. Receive without doing.' },

  // Vedic/Indian significant numbers
  '108': { title: 'Sacred completion', realm: 'Vedic divine number', message: '108 is the most sacred number in Vedic tradition — the product of 1 (divine), 0 (completeness), 8 (infinity). It is the number of beads on a mala, the distance ratio of sun to earth, the number of Upanishads. Seeing 108 is a divine blessing.', action: 'Chant your mantra 108 times. Offer gratitude for 108 blessings in your life.' },
  '786': { title: 'Bismillah — divine blessing', realm: 'Islamic sacred number', message: 'In Islamic numerology (Abjad), 786 is the numerical value of Bismillah ir-Rahman ir-Rahim (In the name of God, the Most Gracious, the Most Merciful). Seeing 786 is a sign of divine protection and blessing.', action: 'Begin any important endeavour with gratitude and prayer. You are divinely protected.' },
  '1008': { title: 'Complete divine cycle', realm: 'Elevated Vedic blessing', message: '1008 represents the 1008 names of the divine in Hindu tradition. Seeing this number signals that you are under extraordinary divine attention and care in this moment of your life.', action: 'Express deep gratitude. You are held in divine awareness.' },
};

/**
 * Look up an angel number
 * Handles single digits, repeating, sequential, and combined patterns
 */
function lookupAngelNumber(input) {
  const clean = String(input).replace(/\s/g, '');

  // Direct lookup first
  if (ANGEL_NUMBERS[clean]) {
    return { found: true, number: clean, ...ANGEL_NUMBERS[clean] };
  }

  // Try to find pattern: all same digits (e.g. 1111, 55555)
  if (/^(\d)\1+$/.test(clean)) {
    const digit = clean[0];
    const base = digit.repeat(Math.min(clean.length, 4));
    if (ANGEL_NUMBERS[base]) {
      return { found: true, number: clean, ...ANGEL_NUMBERS[base], note: `Extended pattern of ${base}` };
    }
    // Fall back to triple
    const triple = digit.repeat(3);
    if (ANGEL_NUMBERS[triple]) {
      return { found: true, number: clean, ...ANGEL_NUMBERS[triple], note: `Pattern based on ${triple}` };
    }
  }

  // Sequential ascending (e.g. 123, 234, 345, 456, 567, 678, 789)
  const digits = clean.split('').map(Number);
  const isAscending = digits.every((d, i) => i === 0 || d === digits[i-1] + 1);
  if (isAscending && digits.length >= 3) {
    return {
      found: true,
      number: clean,
      title: 'Sequential progression',
      realm: 'Step-by-step growth',
      message: `The sequential pattern ${clean} is a reminder from the universe that you are progressing exactly as intended — one step at a time. Trust the process. Do not skip stages.`,
      action: 'Focus on the very next step. Each stage of your journey has its own gift.',
    };
  }

  // Descending (e.g. 9876, 321)
  const isDescending = digits.every((d, i) => i === 0 || d === digits[i-1] - 1);
  if (isDescending && digits.length >= 3) {
    return {
      found: true,
      number: clean,
      title: 'Release and completion',
      realm: 'Letting go',
      message: `The descending pattern ${clean} signals that something in your life is winding down or completing. This is natural and necessary. Release with gratitude.`,
      action: 'Accept what is ending. Completion creates space for what is coming.',
    };
  }

  // Palindrome (e.g. 1221, 1331)
  if (clean === clean.split('').reverse().join('') && clean.length >= 4) {
    return {
      found: true,
      number: clean,
      title: 'Mirror pattern — reflection',
      realm: 'Symmetry & balance',
      message: `The palindrome ${clean} is a mirror number — a reminder that your outer reality reflects your inner state. What you are experiencing outside is showing you what lives inside.`,
      action: 'Reflect honestly on what your current circumstances are showing you about yourself.',
    };
  }

  // Not found
  return {
    found: false,
    number: clean,
    message: `The number ${clean} does not have a specific angel number meaning in our dictionary. However, every number carries energy. Its single-digit essence is ${[...clean].reduce((a,d)=>a+Number(d),0)} → reduced to a core vibration. Trust what you feel when you see it repeatedly.`,
    reducedValue: [...clean].reduce((a,d) => a+Number(d), 0),
  };
}

/**
 * Get all "popular" angel numbers for a discovery page
 */
function getPopularAngelNumbers() {
  return Object.entries(ANGEL_NUMBERS).map(([num, data]) => ({
    number: num,
    title: data.title,
    realm: data.realm,
  }));
}

module.exports = { lookupAngelNumber, getPopularAngelNumbers, ANGEL_NUMBERS };
