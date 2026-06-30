/* =====================================================================
   app.js — Star Learner main logic
   A no-build, single-page web app. State is saved in localStorage so the
   child's progress sticks on this device.
   ===================================================================== */
(function () {
  "use strict";

  var APP = document.getElementById("app");
  var FX = document.getElementById("fx-layer");
  var STORE_KEY = "starLearner.v1";

  var AVATARS = ["🦊", "🐯", "🐼", "🦄", "🐲", "🐙", "🦁", "🐸", "🐵", "🐧", "🐰", "🐨"];

  /* ----------------------------- State ----------------------------- */
  function defaultState() {
    return {
      name: "",
      avatar: "🦊",
      stars: 0,
      totalLessons: 0,
      perfectLessons: 0,
      subjectLessons: { math: 0, science: 0, mixed: 0 },
      levels: { math: 1, science: 1, mixed: 1 },
      // adaptive memory: recent scores per subject (0..5)
      recent: { math: [], science: [], mixed: [] },
      // daily plan
      planDate: "",
      plan: [], // [{subject, done}]
      // streak tracking
      lastActiveDate: "",
      streak: 0,
      bestStreak: 0,
      earnedBadges: [],
    };
  }

  var state = load();

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultState();
      var s = Object.assign(defaultState(), JSON.parse(raw));
      // make sure nested objects exist after upgrades
      s.subjectLessons = Object.assign({ math: 0, science: 0, mixed: 0 }, s.subjectLessons);
      s.levels = Object.assign({ math: 1, science: 1, mixed: 1 }, s.levels);
      s.recent = Object.assign({ math: [], science: [], mixed: [] }, s.recent);
      return s;
    } catch (e) {
      return defaultState();
    }
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* --------------------------- Date helpers ------------------------ */
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function dayDiff(a, b) {
    // returns whole-day difference between two YYYY-M-D strings (b - a)
    function toDate(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
    return Math.round((toDate(b) - toDate(a)) / 86400000);
  }

  function touchStreak() {
    var today = todayStr();
    if (state.lastActiveDate === today) return;
    if (state.lastActiveDate) {
      var diff = dayDiff(state.lastActiveDate, today);
      if (diff === 1) state.streak += 1;
      else if (diff > 1) state.streak = 1;
    } else {
      state.streak = 1;
    }
    state.lastActiveDate = today;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    save();
  }

  /* --------------------------- Daily plan -------------------------- */
  function ensurePlan() {
    var today = todayStr();
    if (state.planDate === today && state.plan && state.plan.length) return;
    // Build a fresh 3-step plan, one per subject, with a little rotation.
    var subjects = ["math", "science", "mixed"];
    // rotate first subject by day for variety
    var d = new Date();
    var rot = (d.getDate()) % 3;
    subjects = subjects.slice(rot).concat(subjects.slice(0, rot));
    state.plan = subjects.map(function (s) { return { subject: s, done: false }; });
    state.planDate = today;
    save();
  }

  /* ------------------------ Adaptive difficulty -------------------- */
  function recordScore(subject, score) {
    var r = state.recent[subject];
    r.push(score);
    if (r.length > 3) r.shift();
    // adjust level: if last two scores are strong -> level up; weak -> level down
    var lvl = state.levels[subject];
    if (score >= 5 && lvl < 6) {
      lvl += 1; // perfect score: move up
    } else if (score >= 4 && r.length >= 2 && r[r.length - 2] >= 4 && lvl < 6) {
      lvl += 1; // two good rounds in a row
    } else if (score <= 2 && lvl > 1) {
      lvl -= 1; // struggling: ease off
    }
    state.levels[subject] = lvl;
    save();
  }

  /* ----------------------------- Sound ----------------------------- */
  var audioCtx = null;
  function beep(freqs, dur) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var t = audioCtx.currentTime;
      freqs.forEach(function (f, i) {
        var o = audioCtx.createOscillator();
        var g = audioCtx.createGain();
        o.type = "sine";
        o.frequency.value = f;
        o.connect(g); g.connect(audioCtx.destination);
        var start = t + i * (dur * 0.5);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        o.start(start); o.stop(start + dur);
      });
    } catch (e) {}
  }
  function soundCorrect() { beep([660, 880], 0.18); }
  function soundWrong() { beep([300, 220], 0.2); }
  function soundWin() { beep([523, 659, 784, 1047], 0.22); }

  /* ---------------------------- Effects ---------------------------- */
  function confettiBurst(n) {
    var bits = ["⭐", "🌟", "🎉", "✨", "💫", "🎈"];
    for (var i = 0; i < (n || 18); i++) {
      var el = document.createElement("div");
      el.className = "confetti";
      el.textContent = bits[Math.floor(Math.random() * bits.length)];
      el.style.left = Math.random() * 100 + "vw";
      el.style.animationDelay = (Math.random() * 0.4) + "s";
      el.style.fontSize = (1.2 + Math.random() * 1.6) + "rem";
      FX.appendChild(el);
      (function (node) { setTimeout(function () { node.remove(); }, 2200); })(el);
    }
  }

  /* ----------------------------- Utils ----------------------------- */
  function el(html) {
    var d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstChild;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function clear() { APP.innerHTML = ""; }

  function checkNewBadges() {
    var newly = [];
    window.BADGES.forEach(function (b) {
      if (state.earnedBadges.indexOf(b.id) === -1 && b.test(state)) {
        state.earnedBadges.push(b.id);
        newly.push(b);
      }
    });
    if (newly.length) save();
    return newly;
  }

  /* ============================ SCREENS ============================ */

  function screenSetup() {
    clear();
    var sel = state.avatar || AVATARS[0];
    var card = el(
      '<div class="card center">' +
        '<div style="font-size:3.4rem">🌟</div>' +
        '<h1>Star Learner</h1>' +
        '<p class="muted">A fun, personalized learning adventure made just for your child.</p>' +
        '<div class="field" style="text-align:left;margin-top:18px">' +
          '<label for="kidname">What is your name?</label>' +
          '<input id="kidname" type="text" maxlength="16" placeholder="Type your name…" autocomplete="off" />' +
        '</div>' +
        '<div class="field" style="text-align:left">' +
          '<label>Pick your buddy</label>' +
          '<div class="avatar-picker" id="avatars"></div>' +
        '</div>' +
        '<button class="btn green lg block" id="startBtn">Let\'s Go! 🚀</button>' +
      '</div>'
    );
    APP.appendChild(card);

    var picker = card.querySelector("#avatars");
    AVATARS.forEach(function (a) {
      var b = document.createElement("button");
      b.className = "avatar-opt" + (a === sel ? " sel" : "");
      b.textContent = a;
      b.onclick = function () {
        sel = a;
        picker.querySelectorAll(".avatar-opt").forEach(function (x) { x.classList.remove("sel"); });
        b.classList.add("sel");
      };
      picker.appendChild(b);
    });

    var input = card.querySelector("#kidname");
    if (state.name) input.value = state.name;
    input.focus();
    card.querySelector("#startBtn").onclick = function () {
      var nm = input.value.trim();
      if (!nm) { input.focus(); input.style.borderColor = "var(--red)"; return; }
      state.name = nm;
      state.avatar = sel;
      save();
      screenHome();
    };
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") card.querySelector("#startBtn").click(); });
  }

  function topbar() {
    return (
      '<div class="topbar">' +
        '<div class="who"><span class="avatar">' + esc(state.avatar) + '</span><span>Hi, ' + esc(state.name) + '!</span></div>' +
        '<div class="star-counter">⭐ <span id="starCount">' + state.stars + '</span></div>' +
      '</div>'
    );
  }

  function screenHome() {
    touchStreak();
    ensurePlan();
    clear();
    APP.appendChild(el(topbar()));

    // Daily plan card
    var planDone = state.plan.filter(function (p) { return p.done; }).length;
    var planTotal = state.plan.length;
    var pct = planTotal ? Math.round((planDone / planTotal) * 100) : 0;

    var planCard = el(
      '<div class="card">' +
        '<h2>📅 Today\'s Plan</h2>' +
        '<div class="bar"><span style="width:' + pct + '%"></span></div>' +
        '<p class="muted" style="margin:4px 0 14px">' + planDone + ' of ' + planTotal + ' done' +
          (state.streak > 1 ? '  •  🔥 ' + state.streak + '-day streak!' : '') + '</p>' +
        '<div id="planList"></div>' +
      '</div>'
    );
    APP.appendChild(planCard);
    var list = planCard.querySelector("#planList");
    state.plan.forEach(function (item, idx) {
      var subj = window.SUBJECTS[item.subject];
      var row = el(
        '<button class="plan-item' + (item.done ? " done" : "") + '" style="width:100%;text-align:left;border:none;cursor:pointer;font-family:inherit">' +
          '<span class="p-emoji">' + subj.emoji + '</span>' +
          '<span class="p-text"><span class="t">' + subj.name + '</span>' +
            '<span class="s">' + (item.done ? "Great job! ✅" : subj.blurb) + '</span></span>' +
          '<span class="check">' + (item.done ? "✅" : "▶️") + '</span>' +
        '</button>'
      );
      row.onclick = function () { startLesson(item.subject, idx); };
      list.appendChild(row);
    });

    if (planDone === planTotal && planTotal > 0) {
      APP.appendChild(el(
        '<div class="card center" style="background:#eafff3">' +
          '<div style="font-size:2.6rem">🏅</div>' +
          '<h3>All done for today!</h3>' +
          '<p class="muted">Amazing work, ' + esc(state.name) + '! Come back tomorrow for a new plan — or keep practicing below.</p>' +
        '</div>'
      ));
    }

    // Free-play subject tiles
    var tiles = el(
      '<div class="card">' +
        '<h2>🎮 Practice Anything</h2>' +
        '<div class="tiles" id="tiles"></div>' +
      '</div>'
    );
    APP.appendChild(tiles);
    var tilesWrap = tiles.querySelector("#tiles");
    Object.keys(window.SUBJECTS).forEach(function (key) {
      var s = window.SUBJECTS[key];
      var t = el(
        '<button class="tile ' + s.cls + '">' +
          '<span class="emoji">' + s.emoji + '</span>' +
          '<span class="name">' + s.name + '</span>' +
          '<span class="lvl">Level ' + state.levels[key] + '</span>' +
        '</button>'
      );
      t.onclick = function () { startLesson(key, -1); };
      tilesWrap.appendChild(t);
    });
    var parentTile = el(
      '<button class="tile parent">' +
        '<span class="emoji">👨‍👩‍👧</span>' +
        '<span class="name">Parent Corner</span>' +
        '<span class="lvl">Progress & settings</span>' +
      '</button>'
    );
    parentTile.onclick = screenParent;
    tilesWrap.appendChild(parentTile);
  }

  /* ----------------------------- Lesson ---------------------------- */
  function startLesson(subjectKey, planIdx) {
    var subj = window.SUBJECTS[subjectKey];
    var level = state.levels[subjectKey];
    var questions = subj.makeLesson(level);
    var i = 0, correct = 0;

    function renderQuestion() {
      clear();
      APP.appendChild(el(topbar()));

      // back + pips
      var head = el(
        '<div class="card">' +
          '<button class="back-link" id="back">⬅ Back to home</button>' +
          '<h2>' + subj.emoji + ' ' + subj.name + ' <span class="muted" style="font-size:1rem">• Level ' + level + '</span></h2>' +
          '<div class="quiz-progress" id="pips"></div>' +
          '<div id="qbody"></div>' +
        '</div>'
      );
      APP.appendChild(head);
      head.querySelector("#back").onclick = function () {
        if (confirm("Leave this lesson? Your stars from finished questions are kept next time.")) screenHome();
      };

      var pips = head.querySelector("#pips");
      for (var p = 0; p < questions.length; p++) {
        var cls = "pip";
        if (p < i) cls += " on";
        pips.appendChild(el('<div class="' + cls + '"></div>'));
      }

      var q = questions[i];
      var body = head.querySelector("#qbody");

      var factHtml = q.fact
        ? '<div class="fact"><span class="fe">' + q.fact.emoji + '</span>' + esc(q.fact.text) + '</div>'
        : "";

      // body is already in the DOM, so set its innerHTML directly (this block
      // has multiple sibling roots, which el() can't return at once).
      body.innerHTML =
        factHtml +
        '<div class="question"><span>' +
          (q.emoji ? '<span class="prompt-img">' + q.emoji + '</span><br>' : '') +
          esc(q.prompt) +
        '</span></div>' +
        '<div class="answers" id="answers"></div>' +
        '<div class="feedback" id="feedback"></div>';

      var answers = body.querySelector("#answers");
      var feedback = body.querySelector("#feedback");
      var locked = false;

      q.choices.forEach(function (choice) {
        var btn = document.createElement("button");
        btn.className = "answer";
        btn.textContent = choice;
        btn.onclick = function () {
          if (locked) return;
          locked = true;
          var isRight = choice === q.answer;
          if (isRight) {
            btn.classList.add("correct");
            correct++;
            feedback.textContent = pick(["Yes! 🎉", "Awesome! ⭐", "Correct! 👏", "You got it! 💪", "Brilliant! 🌟"]);
            feedback.className = "feedback good";
            soundCorrect();
          } else {
            btn.classList.add("wrong");
            feedback.textContent = "Oops! The answer is " + q.answer;
            feedback.className = "feedback try";
            soundWrong();
            // highlight the right one
            answers.querySelectorAll(".answer").forEach(function (b) {
              if (b.textContent === q.answer) b.classList.add("correct");
            });
          }
          answers.querySelectorAll(".answer").forEach(function (b) { b.disabled = true; });
          setTimeout(function () {
            i++;
            if (i < questions.length) renderQuestion();
            else finishLesson();
          }, isRight ? 850 : 1500);
        };
        answers.appendChild(btn);
      });
    }

    function finishLesson() {
      // stars: 1 per correct + 2 bonus for perfect
      var earned = correct + (correct === questions.length ? 2 : 0);
      state.stars += earned;
      state.totalLessons += 1;
      state.subjectLessons[subjectKey] = (state.subjectLessons[subjectKey] || 0) + 1;
      if (correct === questions.length) state.perfectLessons += 1;
      if (planIdx >= 0 && state.plan[planIdx]) state.plan[planIdx].done = true;
      recordScore(subjectKey, correct);
      save();
      var newBadges = checkNewBadges();
      if (correct >= questions.length - 1) { soundWin(); confettiBurst(correct === questions.length ? 26 : 14); }

      clear();
      APP.appendChild(el(topbar()));

      var emoji = correct === questions.length ? "🏆" : correct >= 3 ? "🌟" : "💪";
      var headline = correct === questions.length ? "PERFECT!" : correct >= 3 ? "Great job!" : "Good try!";
      var starStr = "⭐".repeat(Math.min(earned, 7));

      var badgeHtml = "";
      if (newBadges.length) {
        badgeHtml = '<div class="card center pop" style="background:#fff8e6">' +
          '<h3>🎖️ New badge' + (newBadges.length > 1 ? "s" : "") + '!</h3>' +
          '<div style="font-size:2.6rem">' + newBadges.map(function (b) { return b.emoji; }).join(" ") + '</div>' +
          '<p class="muted">' + newBadges.map(function (b) { return esc(b.name); }).join(", ") + '</p>' +
        '</div>';
      }

      var card = el(
        '<div class="card center pop">' +
          '<div class="result-emoji">' + emoji + '</div>' +
          '<h1>' + headline + '</h1>' +
          '<p style="font-size:1.2rem">You got <b>' + correct + ' of ' + questions.length + '</b> right!</p>' +
          '<div class="stars-earned">' + starStr + '</div>' +
          '<p class="muted">+' + earned + ' stars' + (correct === questions.length ? " (perfect bonus!)" : "") + '</p>' +
          '<div class="row" style="margin-top:18px">' +
            '<button class="btn ghost" id="againBtn">Play Again 🔁</button>' +
            '<button class="btn green" id="homeBtn">Home 🏠</button>' +
          '</div>' +
        '</div>'
      );
      APP.appendChild(card);
      if (badgeHtml) APP.appendChild(el(badgeHtml));
      card.querySelector("#againBtn").onclick = function () { startLesson(subjectKey, -1); };
      card.querySelector("#homeBtn").onclick = screenHome;
    }

    renderQuestion();
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* -------------------------- Parent Corner ------------------------ */
  function screenParent() {
    clear();
    APP.appendChild(el(topbar()));

    var totalBadges = window.BADGES.length;
    var earned = state.earnedBadges.length;

    var card = el(
      '<div class="card">' +
        '<button class="back-link" id="back">⬅ Back to home</button>' +
        '<h2>👨‍👩‍👧 Parent Corner</h2>' +
        '<p class="muted">A quick look at how ' + esc(state.name) + ' is doing.</p>' +
        '<div class="stat-row"><span>⭐ Total stars</span><span class="pill">' + state.stars + '</span></div>' +
        '<div class="stat-row"><span>📚 Lessons finished</span><span class="pill">' + state.totalLessons + '</span></div>' +
        '<div class="stat-row"><span>🏆 Perfect lessons</span><span class="pill">' + state.perfectLessons + '</span></div>' +
        '<div class="stat-row"><span>🔥 Day streak (best)</span><span class="pill">' + state.streak + ' (' + state.bestStreak + ')</span></div>' +
      '</div>'
    );
    APP.appendChild(card);
    card.querySelector("#back").onclick = screenHome;

    // Per-subject levels
    var subjCard = el('<div class="card"><h3>Levels by subject</h3><div id="subjStats"></div>' +
      '<p class="muted" style="font-size:0.85rem;margin-top:10px">Levels go from 1 to 6 and adjust automatically — they rise when your child does well and ease off when a topic is tricky, so practice stays at the right level.</p></div>');
    APP.appendChild(subjCard);
    var ss = subjCard.querySelector("#subjStats");
    Object.keys(window.SUBJECTS).forEach(function (key) {
      var s = window.SUBJECTS[key];
      var lvl = state.levels[key];
      ss.appendChild(el(
        '<div class="stat-row"><span>' + s.emoji + ' ' + s.name +
          ' <span class="muted" style="font-size:0.85rem">(' + (state.subjectLessons[key] || 0) + ' lessons)</span></span>' +
          '<span class="pill">Level ' + lvl + ' / 6</span></div>'
      ));
    });

    // Badges
    var badgeCard = el('<div class="card"><h3>🎖️ Badges (' + earned + '/' + totalBadges + ')</h3><div class="badge-grid" id="badges"></div></div>');
    APP.appendChild(badgeCard);
    var bg = badgeCard.querySelector("#badges");
    window.BADGES.forEach(function (b) {
      var got = state.earnedBadges.indexOf(b.id) !== -1;
      bg.appendChild(el(
        '<div class="badge' + (got ? " earned" : "") + '">' +
          '<div class="b-emoji">' + b.emoji + '</div>' +
          '<div class="b-name">' + esc(b.name) + '</div>' +
        '</div>'
      ));
    });

    // Settings
    var settings = el(
      '<div class="card">' +
        '<h3>⚙️ Settings</h3>' +
        '<div class="row">' +
          '<button class="btn blue" id="editBtn">Edit name / buddy</button>' +
          '<button class="btn pink" id="resetBtn">Reset progress</button>' +
        '</div>' +
      '</div>'
    );
    APP.appendChild(settings);
    settings.querySelector("#editBtn").onclick = screenSetup;
    settings.querySelector("#resetBtn").onclick = function () {
      if (confirm("Reset ALL progress and start over? This cannot be undone.")) {
        var name = state.name, avatar = state.avatar;
        state = defaultState();
        state.name = name; state.avatar = avatar;
        save();
        screenHome();
      }
    };
  }

  /* ----------------------------- Boot ------------------------------ */
  if (!state.name) screenSetup();
  else screenHome();
})();
