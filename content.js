/* =====================================================================
   content.js — lessons & questions for Star Learner (ages 6-8 / Gr 1-3)
   Each subject exposes makeLesson(level) -> array of question objects.

   Question shape:
   {
     prompt: "What is 2 + 3?",   // text shown big
     emoji: "➕",                 // optional decoration above prompt
     fact: { emoji, text } | null,// optional thing to teach before asking
     choices: ["4","5","6","7"],  // 2-4 answer buttons
     answer: "5"                  // must match one of choices exactly
   }

   Levels go 1 (easiest) -> 6 (hardest). The app raises/lowers the level
   automatically based on how the child does, so practice stays at the
   "just right" difficulty.
   ===================================================================== */

(function () {
  "use strict";

  // ---- small helpers (no Math.random restrictions here; runs in browser) ----
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  // Build 4 numeric choices around the right answer, all >= 0, unique.
  function numChoices(answer, spread) {
    const set = new Set([answer]);
    let guard = 0;
    while (set.size < 4 && guard++ < 50) {
      const delta = randInt(1, spread) * (Math.random() < 0.5 ? -1 : 1);
      const cand = answer + delta;
      if (cand >= 0) set.add(cand);
    }
    // top up if needed
    let n = answer + 1;
    while (set.size < 4) { if (n >= 0) set.add(n); n++; }
    return shuffle([...set]).map(String);
  }

  /* ============================ MATH ============================ */
  function mathQuestion(level) {
    let a, b, op, answer, prompt, emoji, spread;
    if (level <= 1) {
      // addition within 10
      a = randInt(1, 6); b = randInt(1, Math.max(1, 9 - a));
      answer = a + b; prompt = `${a} + ${b} = ?`; emoji = "➕"; spread = 3;
    } else if (level === 2) {
      // addition & subtraction within 20
      if (Math.random() < 0.5) {
        a = randInt(2, 12); b = randInt(2, 8);
        answer = a + b; prompt = `${a} + ${b} = ?`; emoji = "➕";
      } else {
        a = randInt(6, 20); b = randInt(1, a - 1);
        answer = a - b; prompt = `${a} − ${b} = ?`; emoji = "➖";
      }
      spread = 4;
    } else if (level === 3) {
      // bigger add/sub within 50 + simple "how many tens"
      const r = Math.random();
      if (r < 0.45) {
        a = randInt(10, 40); b = randInt(5, 20);
        answer = a + b; prompt = `${a} + ${b} = ?`; emoji = "➕";
      } else if (r < 0.9) {
        a = randInt(20, 50); b = randInt(5, 19);
        answer = a - b; prompt = `${a} − ${b} = ?`; emoji = "➖";
      } else {
        a = randInt(2, 9);
        answer = a * 10; prompt = `${a} tens = ?`; emoji = "🔟";
      }
      spread = 6;
    } else if (level === 4) {
      // intro multiplication (×2,×3,×5,×10) and skip counting
      const tables = [2, 3, 5, 10];
      a = pick(tables); b = randInt(1, 6);
      answer = a * b; prompt = `${a} × ${b} = ?`; emoji = "✖️"; spread = 5;
    } else if (level === 5) {
      // multiplication to 10 and simple division
      if (Math.random() < 0.6) {
        a = randInt(2, 9); b = randInt(2, 9);
        answer = a * b; prompt = `${a} × ${b} = ?`; emoji = "✖️"; spread = 8;
      } else {
        b = randInt(2, 6); answer = randInt(2, 6);
        a = b * answer; prompt = `${a} ÷ ${b} = ?`; emoji = "➗"; spread = 4;
      }
    } else {
      // level 6: mixed two-step-ish & bigger numbers
      const r = Math.random();
      if (r < 0.4) {
        a = randInt(2, 12); b = randInt(2, 12);
        answer = a * b; prompt = `${a} × ${b} = ?`; emoji = "✖️"; spread = 10;
      } else if (r < 0.7) {
        a = randInt(40, 99); b = randInt(10, 40);
        answer = a + b; prompt = `${a} + ${b} = ?`; emoji = "➕"; spread = 10;
      } else {
        b = randInt(3, 9); answer = randInt(3, 9);
        a = b * answer; prompt = `${a} ÷ ${b} = ?`; emoji = "➗"; spread = 5;
      }
    }
    return { prompt, emoji, fact: null, choices: numChoices(answer, spread), answer: String(answer) };
  }

  // A few "word problem" flavored items mixed in at higher levels for variety
  const mathWordProblems = [
    { lvl: 2, emoji: "🍎", prompt: "Sam has 3 apples and gets 4 more. How many now?", answer: 7 },
    { lvl: 2, emoji: "🐤", prompt: "There are 8 birds. 3 fly away. How many are left?", answer: 5 },
    { lvl: 3, emoji: "🍪", prompt: "A box has 12 cookies. You eat 5. How many left?", answer: 7 },
    { lvl: 3, emoji: "🚗", prompt: "There are 4 cars. Each car has 2 wheels in front. How many front wheels?", answer: 8 },
    { lvl: 4, emoji: "🧦", prompt: "Socks come in pairs of 2. How many socks in 5 pairs?", answer: 10 },
    { lvl: 5, emoji: "🍰", prompt: "Share 12 cupcakes equally among 3 friends. How many each?", answer: 4 },
    { lvl: 5, emoji: "🐙", prompt: "An octopus has 8 arms. How many arms on 3 octopuses?", answer: 24 },
  ];

  function makeMath(level) {
    const out = [];
    const count = 5;
    for (let i = 0; i < count; i++) {
      // ~1 in 4 chance to use a word problem suited to the level
      const candidates = mathWordProblems.filter((w) => Math.abs(w.lvl - level) <= 1);
      if (candidates.length && Math.random() < 0.25) {
        const w = pick(candidates);
        out.push({
          prompt: w.prompt, emoji: w.emoji, fact: null,
          choices: numChoices(w.answer, 4), answer: String(w.answer),
        });
      } else {
        out.push(mathQuestion(level));
      }
    }
    return out;
  }

  /* ========================== SCIENCE ========================== */
  // Each item teaches a fact, then asks about it. Grouped by level.
  const SCIENCE = {
    1: [
      { fact: { emoji: "🐮", text: "Baby cows are called calves and they drink milk from their mom." },
        prompt: "What do baby cows drink?", choices: ["Milk", "Juice", "Soda", "Tea"], answer: "Milk" },
      { fact: { emoji: "☀️", text: "The Sun gives us light and keeps us warm during the day." },
        prompt: "What gives us light in the daytime?", choices: ["The Sun", "The Moon", "A lamp", "Stars"], answer: "The Sun" },
      { fact: { emoji: "🐸", text: "Frogs start life as tiny tadpoles that swim in water." },
        prompt: "A baby frog is called a…", choices: ["Tadpole", "Puppy", "Chick", "Cub"], answer: "Tadpole" },
      { fact: { emoji: "🌧️", text: "Rain falls from clouds in the sky to water the plants." },
        prompt: "Where does rain come from?", choices: ["Clouds", "The ground", "Trees", "Rocks"], answer: "Clouds" },
      { fact: { emoji: "🐝", text: "Bees visit flowers and help make sweet honey." },
        prompt: "What sweet food do bees make?", choices: ["Honey", "Jam", "Sugar", "Syrup"], answer: "Honey" },
    ],
    2: [
      { fact: { emoji: "🦋", text: "A caterpillar changes into a butterfly. This is called metamorphosis." },
        prompt: "A caterpillar turns into a…", choices: ["Butterfly", "Bird", "Bee", "Bat"], answer: "Butterfly" },
      { fact: { emoji: "🌱", text: "Plants need sunlight, water, and air to grow big and strong." },
        prompt: "Which one do plants NEED to grow?", choices: ["Sunlight", "Candy", "Toys", "Music"], answer: "Sunlight" },
      { fact: { emoji: "🦷", text: "Sharks can grow thousands of teeth over their whole life!" },
        prompt: "Which animal grows thousands of teeth?", choices: ["Shark", "Rabbit", "Cat", "Cow"], answer: "Shark" },
      { fact: { emoji: "🌙", text: "We see the Moon at night because it reflects light from the Sun." },
        prompt: "When do we usually see the Moon?", choices: ["Night", "Noon", "Morning", "Never"], answer: "Night" },
      { fact: { emoji: "❄️", text: "Water turns into ice when it gets very cold and freezes." },
        prompt: "What does water become when it freezes?", choices: ["Ice", "Steam", "Sand", "Mud"], answer: "Ice" },
    ],
    3: [
      { fact: { emoji: "🪐", text: "Our planet Earth is one of 8 planets that orbit the Sun." },
        prompt: "How many planets orbit our Sun?", choices: ["8", "3", "20", "100"], answer: "8" },
      { fact: { emoji: "🫁", text: "We breathe in oxygen from the air to stay alive." },
        prompt: "What do we breathe in to live?", choices: ["Oxygen", "Sand", "Water", "Smoke"], answer: "Oxygen" },
      { fact: { emoji: "🦴", text: "Your body has 206 bones that help you stand and move." },
        prompt: "What helps your body stand up straight?", choices: ["Bones", "Hair", "Skin only", "Nails"], answer: "Bones" },
      { fact: { emoji: "🌳", text: "Trees make oxygen and clean the air. They are very important!" },
        prompt: "Trees help us by making…", choices: ["Oxygen", "Plastic", "Glass", "Metal"], answer: "Oxygen" },
      { fact: { emoji: "🐧", text: "Penguins are birds, but they cannot fly. They swim instead!" },
        prompt: "What can penguins do instead of fly?", choices: ["Swim", "Drive", "Climb trees", "Glow"], answer: "Swim" },
    ],
    4: [
      { fact: { emoji: "💧", text: "Water can be a solid (ice), a liquid (water), or a gas (steam)." },
        prompt: "Ice is water as a…", choices: ["Solid", "Liquid", "Gas", "Light"], answer: "Solid" },
      { fact: { emoji: "🧲", text: "Magnets pull on iron and steel, but not on wood or plastic." },
        prompt: "Which would a magnet stick to?", choices: ["A steel nail", "A wooden block", "A plastic cup", "A cotton ball"], answer: "A steel nail" },
      { fact: { emoji: "🌈", text: "A rainbow has 7 colors and appears when sunlight shines through rain." },
        prompt: "A rainbow appears when sunlight shines through…", choices: ["Rain", "Sand", "Snow", "Smoke"], answer: "Rain" },
      { fact: { emoji: "🦟", text: "Insects have 6 legs. Spiders are NOT insects — they have 8 legs." },
        prompt: "How many legs does an insect have?", choices: ["6", "8", "4", "10"], answer: "6" },
      { fact: { emoji: "🌋", text: "A volcano is a mountain that can erupt with hot melted rock called lava." },
        prompt: "Hot melted rock from a volcano is called…", choices: ["Lava", "Juice", "Ice", "Mud"], answer: "Lava" },
    ],
    5: [
      { fact: { emoji: "🔆", text: "The Sun is a giant star — so big that over a million Earths could fit inside!" },
        prompt: "The Sun is actually a giant…", choices: ["Star", "Planet", "Moon", "Cloud"], answer: "Star" },
      { fact: { emoji: "🌊", text: "Most of Earth is covered by water — about 7 out of every 10 parts." },
        prompt: "Most of Earth's surface is covered by…", choices: ["Water", "Sand", "Forest", "Ice"], answer: "Water" },
      { fact: { emoji: "🦕", text: "Dinosaurs lived millions of years ago, long before people existed." },
        prompt: "Did dinosaurs live before or after people?", choices: ["Before", "After", "Same time", "Never lived"], answer: "Before" },
      { fact: { emoji: "⚡", text: "Lightning is a giant spark of electricity, and thunder is the sound it makes." },
        prompt: "Thunder is the ___ that lightning makes.", choices: ["Sound", "Color", "Smell", "Taste"], answer: "Sound" },
      { fact: { emoji: "🫀", text: "Your heart is a muscle that pumps blood all around your body." },
        prompt: "What does your heart pump around your body?", choices: ["Blood", "Air", "Water", "Food"], answer: "Blood" },
    ],
    6: [
      { fact: { emoji: "🌍", text: "Gravity is the force that pulls everything down toward the Earth." },
        prompt: "What pulls things down to the ground?", choices: ["Gravity", "Magnets", "Wind", "Light"], answer: "Gravity" },
      { fact: { emoji: "🐛", text: "Worms help the soil by tunneling through it and making it healthy for plants." },
        prompt: "Worms help plants by improving the…", choices: ["Soil", "Sky", "Rain", "Sun"], answer: "Soil" },
      { fact: { emoji: "🌡️", text: "We measure how hot or cold something is using temperature." },
        prompt: "What do we call how hot or cold something is?", choices: ["Temperature", "Weight", "Length", "Color"], answer: "Temperature" },
      { fact: { emoji: "🪺", text: "A food chain shows who eats what: grass → rabbit → fox." },
        prompt: "In 'grass → rabbit → fox', what does the rabbit eat?", choices: ["Grass", "Fox", "Rocks", "Birds"], answer: "Grass" },
      { fact: { emoji: "♻️", text: "Recycling turns old paper, cans, and bottles into new things." },
        prompt: "Recycling helps us by reusing…", choices: ["Old materials", "Fresh fruit", "Sunlight", "Air"], answer: "Old materials" },
    ],
  };

  /* =========================== MIXED =========================== */
  // Logic, patterns, geography, opposites, fun general knowledge.
  const MIXED = {
    1: [
      { fact: null, emoji: "🔺", prompt: "Which shape has 3 sides?", choices: ["Triangle", "Square", "Circle", "Star"], answer: "Triangle" },
      { fact: null, emoji: "🎨", prompt: "Red + Yellow makes which color?", choices: ["Orange", "Green", "Purple", "Blue"], answer: "Orange" },
      { fact: null, emoji: "🔁", prompt: "What comes next? 🔴 🔵 🔴 🔵 ___", choices: ["🔴", "🔵", "🟡", "🟢"], answer: "🔴" },
      { fact: null, emoji: "🆙", prompt: "What is the opposite of BIG?", choices: ["Small", "Tall", "Fast", "Loud"], answer: "Small" },
      { fact: null, emoji: "🔢", prompt: "What number comes after 7?", choices: ["8", "6", "9", "5"], answer: "8" },
    ],
    2: [
      { fact: null, emoji: "🟦", prompt: "How many sides does a square have?", choices: ["4", "3", "5", "6"], answer: "4" },
      { fact: null, emoji: "↔️", prompt: "What is the opposite of HOT?", choices: ["Cold", "Warm", "Wet", "Soft"], answer: "Cold" },
      { fact: null, emoji: "🔁", prompt: "What comes next? 1, 2, 3, 4, ___", choices: ["5", "6", "3", "8"], answer: "5" },
      { fact: { emoji: "🌍", text: "We live on a planet called Earth." },
        prompt: "What planet do we live on?", choices: ["Earth", "Mars", "Sun", "Moon"], answer: "Earth" },
      { fact: null, emoji: "🐶", prompt: "Which one is an animal?", choices: ["Dog", "Chair", "Apple", "Hat"], answer: "Dog" },
    ],
    3: [
      { fact: null, emoji: "🔁", prompt: "What comes next? 2, 4, 6, 8, ___", choices: ["10", "9", "12", "7"], answer: "10" },
      { fact: { emoji: "🗽", text: "A country is a big place with its own flag and leaders." },
        prompt: "Which one is a country?", choices: ["Canada", "Banana", "Tiger", "River"], answer: "Canada" },
      { fact: null, emoji: "⏰", prompt: "How many days are in one week?", choices: ["7", "5", "10", "12"], answer: "7" },
      { fact: null, emoji: "🎵", prompt: "What is the opposite of LOUD?", choices: ["Quiet", "Fast", "Big", "Happy"], answer: "Quiet" },
      { fact: null, emoji: "🍕", prompt: "If you cut a pizza in HALF, how many pieces?", choices: ["2", "1", "4", "3"], answer: "2" },
    ],
    4: [
      { fact: null, emoji: "🗓️", prompt: "How many months are in one year?", choices: ["12", "10", "7", "24"], answer: "12" },
      { fact: { emoji: "🌊", text: "An ocean is a huge body of salty water." },
        prompt: "Which one is an ocean?", choices: ["Pacific", "Amazon", "Sahara", "Everest"], answer: "Pacific" },
      { fact: null, emoji: "🔁", prompt: "What comes next? 5, 10, 15, 20, ___", choices: ["25", "30", "21", "22"], answer: "25" },
      { fact: null, emoji: "🧩", prompt: "A puppy is to a dog as a kitten is to a…", choices: ["Cat", "Cow", "Bird", "Fish"], answer: "Cat" },
      { fact: null, emoji: "🅰️", prompt: "Which letter comes right after M?", choices: ["N", "L", "P", "O"], answer: "N" },
    ],
    5: [
      { fact: { emoji: "🏔️", text: "A continent is a very large area of land. There are 7 of them." },
        prompt: "How many continents are there?", choices: ["7", "5", "10", "3"], answer: "7" },
      { fact: null, emoji: "🔁", prompt: "What comes next? 3, 6, 9, 12, ___", choices: ["15", "13", "18", "14"], answer: "15" },
      { fact: null, emoji: "🧭", prompt: "If you face the sunrise, you are facing…", choices: ["East", "West", "Down", "Up"], answer: "East" },
      { fact: null, emoji: "🔤", prompt: "How many letters are in the English alphabet?", choices: ["26", "20", "30", "24"], answer: "26" },
      { fact: { emoji: "💰", text: "Money helps us buy things. Coins and bills are kinds of money." },
        prompt: "2 coins worth 5 each — how much together?", choices: ["10", "7", "25", "52"], answer: "10" },
    ],
    6: [
      { fact: { emoji: "🇫🇷", text: "Every country has a capital — its most important city." },
        prompt: "The capital of France is…", choices: ["Paris", "London", "Rome", "Cairo"], answer: "Paris" },
      { fact: null, emoji: "🔁", prompt: "What comes next? 1, 4, 9, 16, ___", choices: ["25", "20", "24", "18"], answer: "25" },
      { fact: null, emoji: "⏳", prompt: "How many minutes are in one hour?", choices: ["60", "30", "100", "24"], answer: "60" },
      { fact: { emoji: "🌎", text: "The 7 continents include Asia, the biggest one." },
        prompt: "Which is the LARGEST continent?", choices: ["Asia", "Europe", "Antarctica", "Australia"], answer: "Asia" },
      { fact: null, emoji: "🧠", prompt: "Tom is taller than Sam. Sam is taller than Joe. Who is shortest?", choices: ["Joe", "Tom", "Sam", "Nobody"], answer: "Joe" },
    ],
  };

  function fromBank(bank, level) {
    const lvl = Math.min(6, Math.max(1, level));
    const items = bank[lvl] || bank[1];
    return shuffle(items).slice(0, 5).map((q) => ({
      prompt: q.prompt,
      emoji: q.emoji || (q.fact && q.fact.emoji) || "❓",
      fact: q.fact || null,
      choices: shuffle(q.choices),
      answer: q.answer,
    }));
  }

  /* ===================== Public registry ===================== */
  window.SUBJECTS = {
    math: {
      key: "math", name: "Math", emoji: "🔢", cls: "math",
      blurb: "Numbers, adding, taking away & more!",
      makeLesson: (level) => makeMath(level),
    },
    science: {
      key: "science", name: "Science", emoji: "🔬", cls: "science",
      blurb: "Discover how our world works!",
      makeLesson: (level) => fromBank(SCIENCE, level),
    },
    mixed: {
      key: "mixed", name: "Brain Games", emoji: "🧩", cls: "mixed",
      blurb: "Puzzles, shapes, places & logic!",
      makeLesson: (level) => fromBank(MIXED, level),
    },
  };

  // Badges the child can earn (checked by app.js)
  window.BADGES = [
    { id: "first", emoji: "🎉", name: "First Lesson", test: (s) => s.totalLessons >= 1 },
    { id: "star10", emoji: "⭐", name: "10 Stars", test: (s) => s.stars >= 10 },
    { id: "star50", emoji: "🌟", name: "50 Stars", test: (s) => s.stars >= 50 },
    { id: "star100", emoji: "💫", name: "100 Stars", test: (s) => s.stars >= 100 },
    { id: "perfect", emoji: "🏆", name: "Perfect Score", test: (s) => s.perfectLessons >= 1 },
    { id: "math5", emoji: "🧮", name: "Math Whiz", test: (s) => (s.subjectLessons.math || 0) >= 5 },
    { id: "sci5", emoji: "🔭", name: "Scientist", test: (s) => (s.subjectLessons.science || 0) >= 5 },
    { id: "mix5", emoji: "🧠", name: "Puzzle Pro", test: (s) => (s.subjectLessons.mixed || 0) >= 5 },
    { id: "streak3", emoji: "🔥", name: "3-Day Streak", test: (s) => s.bestStreak >= 3 },
    { id: "level5", emoji: "🚀", name: "Level 5 Reached", test: (s) => Math.max(...Object.values(s.levels)) >= 5 },
    { id: "lessons10", emoji: "📚", name: "10 Lessons", test: (s) => s.totalLessons >= 10 },
    { id: "lessons25", emoji: "🎓", name: "25 Lessons", test: (s) => s.totalLessons >= 25 },
  ];
})();
