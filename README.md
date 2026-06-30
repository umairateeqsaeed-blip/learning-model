# 🌟 Star Learner — Personalized Learning Plan

A fun, kid-friendly web app that gives your child (ages **6–8 / Grades 1–3**) a
**personalized daily learning plan** across **Math**, **Science**, and
**Brain Games** (logic, shapes, geography, fun facts).

It runs entirely in the browser — **no install, no internet, no accounts**.
Progress is saved automatically on the device.

---

## ▶️ How to use it

You have two easy options:

### Option 1 — just open it
Double-click **`index.html`** and it opens in your browser. That's it.
Works on a computer, tablet, or phone.

### Option 2 — run a tiny local server (nicer on some browsers)
```bash
# from this folder
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

> Tip on a tablet/phone: open the page, then use your browser's
> **"Add to Home Screen"** so it feels like a real app with its own icon.

---

## ✨ What it does

- **Child profile** — your child types their name and picks a buddy (🦊 🐼 🦄 …).
- **Today's Plan** — a fresh 3-step plan each day, one activity per subject.
- **Adaptive difficulty** — each subject has **6 levels**. The app raises the
  level when your child does well and eases off when something is tricky, so
  practice always feels "just right."
- **Stars & rewards** — stars for every correct answer, bonus stars and
  confetti for a perfect lesson, sound effects, and a **🔥 daily streak**.
- **Badges** — 12 collectible achievements to keep motivation high.
- **Parent Corner** — see total stars, lessons finished, perfect lessons,
  streak, the current level per subject, earned badges, and settings
  (edit name/buddy, reset progress).

---

## 📚 What's inside the lessons

- **Math** 🔢 — counting, adding, subtracting, intro multiplication/division,
  and word problems. Math questions are **generated**, so there's endless
  practice.
- **Science** 🔬 — bite-size facts about animals, plants, the body, weather,
  space, and more — each followed by a question.
- **Brain Games** 🧩 — shapes, patterns, opposites, simple logic, geography,
  time, and general knowledge.

All content lives in **`content.js`** and is easy to edit or extend (see below).

---

## 🛠️ Project structure

| File | What it does |
|------|--------------|
| `index.html` | Page shell that loads everything |
| `styles.css` | Kid-friendly look (big buttons, colors, animations) |
| `content.js` | All the questions, facts, levels, and badges |
| `app.js` | App logic: profile, daily plan, quizzes, stars, parent corner |

### Add or change questions
Open **`content.js`**:
- **Science / Brain Games:** add objects to the `SCIENCE` or `MIXED` banks
  under the level number you want (1 = easiest, 6 = hardest). Shape:
  ```js
  { fact: { emoji: "🐝", text: "Bees make honey." },
    prompt: "What do bees make?",
    choices: ["Honey", "Jam", "Sugar", "Milk"],
    answer: "Honey" }
  ```
  (`fact` is optional — leave it `null` for a plain question.)
- **Math:** difficulty is controlled by the `mathQuestion(level)` function;
  word problems live in the `mathWordProblems` list.

---

## 🔒 Privacy

Everything stays on the device. There are **no accounts, no tracking, and no
data sent anywhere** — progress is stored in your browser's local storage.
Use the **Parent Corner → Reset progress** button to clear it anytime.

---

## 🚀 Ideas for later

- More subjects (reading & phonics, writing).
- Voice read-aloud for pre-readers.
- Printable weekly progress report for parents.
- Multiple child profiles on one device.

Enjoy, and happy learning! 🌟
