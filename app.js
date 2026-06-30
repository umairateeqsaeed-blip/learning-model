/* =====================================================================
   app.js — Star Learner main logic (with login + Supabase cloud sync)

   - Parent signs in with email + password (Supabase Auth).
   - Each parent account can have several child profiles.
   - Each child's progress is stored in the `child_profiles` table (RLS:
     a parent can only see their own children) and cached in localStorage.
   - If Supabase isn't configured/reachable, the app falls back to a
     local-only mode so it still works offline.
   ===================================================================== */
(function () {
  "use strict";

  var APP = document.getElementById("app");
  var FX = document.getElementById("fx-layer");
  var CACHE_PREFIX = "starLearner.profile."; // + profileId  -> progress blob
  var LOCAL_PROFILE_KEY = "starLearner.localProfile"; // offline single profile

  var AVATARS = ["🦊", "🐯", "🐼", "🦄", "🐲", "🐙", "🦁", "🐸", "🐵", "🐧", "🐰", "🐨"];

  /* ----------------------- Supabase client ------------------------- */
  var sb = null;
  var cloudEnabled = false;
  (function initClient() {
    try {
      var cfg = window.SL_CONFIG;
      if (cfg && cfg.url && cfg.anonKey && window.supabase && window.supabase.createClient &&
          cfg.url.indexOf("YOUR_") === -1) {
        sb = window.supabase.createClient(cfg.url, cfg.anonKey);
        cloudEnabled = true;
      }
    } catch (e) { cloudEnabled = false; }
  })();

  /* ----------------------------- App state ------------------------- */
  // The currently active child profile + their progress ("state").
  var profile = null;   // { id, name, avatar }  (id may be "local")
  var state = null;     // progress blob
  var profiles = [];    // list of child profiles for the signed-in parent
  var saveTimer = null;

  function blankState() {
    return {
      stars: 0,
      totalLessons: 0,
      perfectLessons: 0,
      subjectLessons: { math: 0, science: 0, mixed: 0 },
      levels: { math: 1, science: 1, mixed: 1 },
      recent: { math: [], science: [], mixed: [] },
      planDate: "",
      plan: [],
      lastActiveDate: "",
      streak: 0,
      bestStreak: 0,
      earnedBadges: [],
    };
  }
  function normalizeState(s) {
    s = Object.assign(blankState(), s || {});
    s.subjectLessons = Object.assign({ math: 0, science: 0, mixed: 0 }, s.subjectLessons);
    s.levels = Object.assign({ math: 1, science: 1, mixed: 1 }, s.levels);
    s.recent = Object.assign({ math: [], science: [], mixed: [] }, s.recent);
    return s;
  }

  /* ------------------------- Persistence --------------------------- */
  function cacheKey(id) { return CACHE_PREFIX + id; }

  function persist() {
    if (!profile) return;
    // 1) local cache (instant, offline-safe)
    try {
      localStorage.setItem(cacheKey(profile.id), JSON.stringify({
        name: profile.name, avatar: profile.avatar, state: state,
      }));
    } catch (e) {}
    // 2) debounced cloud upsert
    if (cloudEnabled && profile.id !== "local") {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(pushToCloud, 600);
    }
  }

  function pushToCloud() {
    if (!cloudEnabled || !profile || profile.id === "local") return;
    sb.from("child_profiles")
      .update({ name: profile.name, avatar: profile.avatar, state: state })
      .eq("id", profile.id)
      .then(function (res) { /* ignore errors silently; cache already saved */ });
  }

  function loadCache(id) {
    try {
      var raw = localStorage.getItem(cacheKey(id));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  /* --------------------------- Date helpers ------------------------ */
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function dayDiff(a, b) {
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
    } else { state.streak = 1; }
    state.lastActiveDate = today;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    persist();
  }

  /* --------------------------- Daily plan -------------------------- */
  function ensurePlan() {
    var today = todayStr();
    if (state.planDate === today && state.plan && state.plan.length) return;
    var subjects = ["math", "science", "mixed"];
    var rot = (new Date().getDate()) % 3;
    subjects = subjects.slice(rot).concat(subjects.slice(0, rot));
    state.plan = subjects.map(function (s) { return { subject: s, done: false }; });
    state.planDate = today;
    persist();
  }

  /* ------------------------ Adaptive difficulty -------------------- */
  function recordScore(subject, score) {
    var r = state.recent[subject];
    r.push(score);
    if (r.length > 3) r.shift();
    var lvl = state.levels[subject];
    if (score >= 5 && lvl < 6) lvl += 1;
    else if (score >= 4 && r.length >= 2 && r[r.length - 2] >= 4 && lvl < 6) lvl += 1;
    else if (score <= 2 && lvl > 1) lvl -= 1;
    state.levels[subject] = lvl;
    persist();
  }

  /* ----------------------------- Sound ----------------------------- */
  var audioCtx = null;
  function beep(freqs, dur) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var t = audioCtx.currentTime;
      freqs.forEach(function (f, i) {
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = "sine"; o.frequency.value = f;
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
      var e = document.createElement("div");
      e.className = "confetti";
      e.textContent = bits[Math.floor(Math.random() * bits.length)];
      e.style.left = Math.random() * 100 + "vw";
      e.style.animationDelay = (Math.random() * 0.4) + "s";
      e.style.fontSize = (1.2 + Math.random() * 1.6) + "rem";
      FX.appendChild(e);
      (function (node) { setTimeout(function () { node.remove(); }, 2200); })(e);
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
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function checkNewBadges() {
    var newly = [];
    window.BADGES.forEach(function (b) {
      if (state.earnedBadges.indexOf(b.id) === -1 && b.test(state)) {
        state.earnedBadges.push(b.id);
        newly.push(b);
      }
    });
    if (newly.length) persist();
    return newly;
  }

  /* ===================== AUTH + PROFILE FLOW ====================== */

  function boot() {
    if (!cloudEnabled) { bootLocal(); return; }
    clear();
    APP.appendChild(el('<div class="card center"><div style="font-size:2.4rem">🌟</div><p class="muted">Loading…</p></div>'));
    sb.auth.getSession().then(function (res) {
      var session = res && res.data ? res.data.session : null;
      if (session && session.user) afterLogin(session.user);
      else screenAuth();
    }).catch(function () { screenAuth(); });

    // react to login/logout
    sb.auth.onAuthStateChange(function (event, session) {
      if (event === "SIGNED_OUT") { profile = null; state = null; profiles = []; screenAuth(); }
    });
  }

  // Local-only fallback (no Supabase configured)
  function bootLocal() {
    var cached = loadCache("local");
    if (cached && cached.name) {
      profile = { id: "local", name: cached.name, avatar: cached.avatar || "🦊" };
      state = normalizeState(cached.state);
      screenHome();
    } else {
      screenSetupLocal();
    }
  }

  /* ----------------------------- Login ----------------------------- */
  function screenAuth(mode) {
    mode = mode || "login"; // or "signup"
    clear();
    var isSignup = mode === "signup";
    var card = el(
      '<div class="card center">' +
        '<div style="font-size:3.4rem">🌟</div>' +
        '<h1>Star Learner</h1>' +
        '<p class="muted">' + (isSignup ? "Create a parent account to save your child\'s progress." : "Welcome back! Sign in to continue.") + '</p>' +
        '<div class="field" style="text-align:left;margin-top:16px">' +
          '<label for="email">Parent email</label>' +
          '<input id="email" type="text" inputmode="email" autocomplete="email" placeholder="you@example.com" />' +
        '</div>' +
        '<div class="field" style="text-align:left">' +
          '<label for="pw">Password</label>' +
          '<input id="pw" type="text" autocomplete="current-password" placeholder="At least 6 characters" style="-webkit-text-security:disc;text-security:disc" />' +
        '</div>' +
        '<div class="feedback try" id="authMsg" style="min-height:24px"></div>' +
        '<button class="btn green lg block" id="goBtn">' + (isSignup ? "Create account 🚀" : "Sign in 🔑") + '</button>' +
        '<button class="back-link" id="swap" style="margin-top:12px">' +
          (isSignup ? "Already have an account? Sign in" : "New here? Create a parent account") + '</button>' +
      '</div>'
    );
    APP.appendChild(card);
    var email = card.querySelector("#email");
    var pw = card.querySelector("#pw");
    var msg = card.querySelector("#authMsg");
    var go = card.querySelector("#goBtn");
    card.querySelector("#swap").onclick = function () { screenAuth(isSignup ? "login" : "signup"); };

    function submit() {
      var e = email.value.trim(), p = pw.value;
      if (!e || e.indexOf("@") === -1) { msg.textContent = "Please enter a valid email."; email.focus(); return; }
      if (!p || p.length < 6) { msg.textContent = "Password must be at least 6 characters."; pw.focus(); return; }
      go.disabled = true; msg.className = "feedback"; msg.textContent = "Please wait…";
      var op = isSignup
        ? sb.auth.signUp({ email: e, password: p })
        : sb.auth.signInWithPassword({ email: e, password: p });
      op.then(function (res) {
        go.disabled = false;
        if (res.error) { msg.className = "feedback try"; msg.textContent = friendlyAuthError(res.error.message); return; }
        if (isSignup && res.data && res.data.user && !res.data.session) {
          // email confirmation required
          msg.className = "feedback good";
          msg.textContent = "Check your email to confirm, then sign in. 📧";
          setTimeout(function () { screenAuth("login"); }, 2500);
          return;
        }
        var user = res.data && res.data.user;
        if (user) afterLogin(user);
      }).catch(function () {
        go.disabled = false; msg.className = "feedback try";
        msg.textContent = "Network problem. Please try again.";
      });
    }
    go.onclick = submit;
    pw.addEventListener("keydown", function (ev) { if (ev.key === "Enter") submit(); });
    email.focus();
  }

  function friendlyAuthError(m) {
    m = (m || "").toLowerCase();
    if (m.indexOf("invalid login") !== -1) return "Wrong email or password.";
    if (m.indexOf("already registered") !== -1) return "That email already has an account. Try signing in.";
    if (m.indexOf("email not confirmed") !== -1) return "Please confirm your email first (check your inbox).";
    if (m.indexOf("rate") !== -1) return "Too many tries. Please wait a moment.";
    return m ? (m.charAt(0).toUpperCase() + m.slice(1)) : "Something went wrong.";
  }

  /* ------------------------ Profiles loading ----------------------- */
  function afterLogin(user) {
    clear();
    APP.appendChild(el('<div class="card center"><div style="font-size:2.4rem">📚</div><p class="muted">Loading profiles…</p></div>'));
    sb.from("child_profiles").select("id,name,avatar,state").order("created_at", { ascending: true })
      .then(function (res) {
        if (res.error) { profiles = []; }
        else { profiles = res.data || []; }
        if (!profiles.length) screenAddChild(true);
        else if (profiles.length === 1) selectProfile(profiles[0]);
        else screenProfilePicker();
      }).catch(function () {
        // offline: try any cached profile
        screenAddChild(true);
      });
  }

  function selectProfile(row) {
    profile = { id: row.id, name: row.name, avatar: row.avatar || "🦊" };
    // prefer freshest of cloud vs cache (cache may have newer offline edits)
    var cached = loadCache(row.id);
    state = normalizeState(row.state);
    if (cached && cached.state) {
      // if cache has more stars/lessons, assume it is newer offline progress
      if ((cached.state.totalLessons || 0) > (state.totalLessons || 0)) {
        state = normalizeState(cached.state);
        persist(); // push merged-up cache to cloud
      }
    }
    screenHome();
  }

  function screenProfilePicker() {
    clear();
    var card = el(
      '<div class="card center">' +
        '<div style="font-size:2.6rem">👋</div>' +
        '<h2>Who\'s learning today?</h2>' +
        '<div class="tiles" id="picker" style="margin-top:14px"></div>' +
        '<button class="back-link" id="signout" style="margin-top:16px">Sign out</button>' +
      '</div>'
    );
    APP.appendChild(card);
    var picker = card.querySelector("#picker");
    profiles.forEach(function (row) {
      var t = el(
        '<button class="tile parent">' +
          '<span class="emoji">' + esc(row.avatar || "🦊") + '</span>' +
          '<span class="name">' + esc(row.name) + '</span>' +
          '<span class="lvl">⭐ ' + ((row.state && row.state.stars) || 0) + ' stars</span>' +
        '</button>'
      );
      t.onclick = function () { selectProfile(row); };
      picker.appendChild(t);
    });
    var add = el(
      '<button class="tile math">' +
        '<span class="emoji">➕</span>' +
        '<span class="name">Add child</span>' +
        '<span class="lvl">New profile</span>' +
      '</button>'
    );
    add.onclick = function () { screenAddChild(false); };
    picker.appendChild(add);
    card.querySelector("#signout").onclick = doSignOut;
  }

  function screenAddChild(first) {
    clear();
    var sel = AVATARS[0];
    var card = el(
      '<div class="card center">' +
        '<div style="font-size:3rem">🧒</div>' +
        '<h1>' + (first ? "Add your child" : "New child profile") + '</h1>' +
        '<p class="muted">Let\'s set up a learning adventure!</p>' +
        '<div class="field" style="text-align:left;margin-top:16px">' +
          '<label for="kidname">Child\'s name</label>' +
          '<input id="kidname" type="text" maxlength="16" placeholder="Type a name…" autocomplete="off" />' +
        '</div>' +
        '<div class="field" style="text-align:left">' +
          '<label>Pick a buddy</label>' +
          '<div class="avatar-picker" id="avatars"></div>' +
        '</div>' +
        '<div class="feedback try" id="addMsg" style="min-height:20px"></div>' +
        '<button class="btn green lg block" id="createBtn">Start! 🚀</button>' +
        (first ? '' : '<button class="back-link" id="cancel" style="margin-top:10px">Cancel</button>') +
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
    var msg = card.querySelector("#addMsg");
    input.focus();
    if (card.querySelector("#cancel")) card.querySelector("#cancel").onclick = screenProfilePicker;
    var btn = card.querySelector("#createBtn");
    btn.onclick = function () {
      var nm = input.value.trim();
      if (!nm) { input.focus(); input.style.borderColor = "var(--red)"; return; }
      btn.disabled = true; msg.className = "feedback"; msg.textContent = "Creating…";
      sb.from("child_profiles").insert({ name: nm, avatar: sel, state: blankState() }).select().single()
        .then(function (res) {
          btn.disabled = false;
          if (res.error || !res.data) { msg.className = "feedback try"; msg.textContent = "Could not save. Check your connection."; return; }
          profiles.push(res.data);
          selectProfile(res.data);
        }).catch(function () {
          btn.disabled = false; msg.className = "feedback try"; msg.textContent = "Network problem. Please try again.";
        });
    };
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") btn.click(); });
  }

  // Local-only setup (no cloud)
  function screenSetupLocal() {
    clear();
    var sel = AVATARS[0];
    var card = el(
      '<div class="card center">' +
        '<div style="font-size:3.4rem">🌟</div>' +
        '<h1>Star Learner</h1>' +
        '<p class="muted">Offline mode — progress is saved on this device.</p>' +
        '<div class="field" style="text-align:left;margin-top:16px">' +
          '<label for="kidname">What is your name?</label>' +
          '<input id="kidname" type="text" maxlength="16" placeholder="Type your name…" />' +
        '</div>' +
        '<div class="field" style="text-align:left"><label>Pick your buddy</label>' +
          '<div class="avatar-picker" id="avatars"></div></div>' +
        '<button class="btn green lg block" id="startBtn">Let\'s Go! 🚀</button>' +
      '</div>'
    );
    APP.appendChild(card);
    var picker = card.querySelector("#avatars");
    AVATARS.forEach(function (a) {
      var b = document.createElement("button");
      b.className = "avatar-opt" + (a === sel ? " sel" : "");
      b.textContent = a;
      b.onclick = function () { sel = a; picker.querySelectorAll(".avatar-opt").forEach(function (x) { x.classList.remove("sel"); }); b.classList.add("sel"); };
      picker.appendChild(b);
    });
    var input = card.querySelector("#kidname");
    input.focus();
    card.querySelector("#startBtn").onclick = function () {
      var nm = input.value.trim();
      if (!nm) { input.focus(); input.style.borderColor = "var(--red)"; return; }
      profile = { id: "local", name: nm, avatar: sel };
      state = blankState();
      persist();
      screenHome();
    };
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") card.querySelector("#startBtn").click(); });
  }

  function doSignOut() {
    if (!cloudEnabled) return;
    sb.auth.signOut().then(function () { /* onAuthStateChange handles UI */ });
  }

  /* ============================ SCREENS ============================ */

  function topbar() {
    return (
      '<div class="topbar">' +
        '<div class="who"><span class="avatar">' + esc(profile.avatar) + '</span><span>Hi, ' + esc(profile.name) + '!</span></div>' +
        '<div class="star-counter">⭐ <span id="starCount">' + state.stars + '</span></div>' +
      '</div>'
    );
  }

  function screenHome() {
    touchStreak();
    ensurePlan();
    clear();
    APP.appendChild(el(topbar()));

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
          '<p class="muted">Amazing work, ' + esc(profile.name) + '! Come back tomorrow for a new plan — or keep practicing below.</p>' +
        '</div>'
      ));
    }

    var tiles = el('<div class="card"><h2>🎮 Practice Anything</h2><div class="tiles" id="tiles"></div></div>');
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
        if (confirm("Leave this lesson? Finished questions are saved.")) screenHome();
      };
      var pips = head.querySelector("#pips");
      for (var p = 0; p < questions.length; p++) {
        pips.appendChild(el('<div class="pip' + (p < i ? " on" : "") + '"></div>'));
      }
      var q = questions[i];
      var body = head.querySelector("#qbody");
      var factHtml = q.fact
        ? '<div class="fact"><span class="fe">' + q.fact.emoji + '</span>' + esc(q.fact.text) + '</div>'
        : "";
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
            btn.classList.add("correct"); correct++;
            feedback.textContent = pick(["Yes! 🎉", "Awesome! ⭐", "Correct! 👏", "You got it! 💪", "Brilliant! 🌟"]);
            feedback.className = "feedback good"; soundCorrect();
          } else {
            btn.classList.add("wrong");
            feedback.textContent = "Oops! The answer is " + q.answer;
            feedback.className = "feedback try"; soundWrong();
            answers.querySelectorAll(".answer").forEach(function (b) { if (b.textContent === q.answer) b.classList.add("correct"); });
          }
          answers.querySelectorAll(".answer").forEach(function (b) { b.disabled = true; });
          setTimeout(function () {
            i++;
            if (i < questions.length) renderQuestion(); else finishLesson();
          }, isRight ? 850 : 1500);
        };
        answers.appendChild(btn);
      });
    }

    function finishLesson() {
      var earned = correct + (correct === questions.length ? 2 : 0);
      state.stars += earned;
      state.totalLessons += 1;
      state.subjectLessons[subjectKey] = (state.subjectLessons[subjectKey] || 0) + 1;
      if (correct === questions.length) state.perfectLessons += 1;
      if (planIdx >= 0 && state.plan[planIdx]) state.plan[planIdx].done = true;
      recordScore(subjectKey, correct);
      persist();
      var newBadges = checkNewBadges();
      if (correct >= questions.length - 1) { soundWin(); confettiBurst(correct === questions.length ? 26 : 14); }

      clear();
      APP.appendChild(el(topbar()));
      var emoji = correct === questions.length ? "🏆" : correct >= 3 ? "🌟" : "💪";
      var headline = correct === questions.length ? "PERFECT!" : correct >= 3 ? "Great job!" : "Good try!";
      var starStr = "⭐".repeat(Math.min(earned, 7));
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
      if (newBadges.length) {
        APP.appendChild(el(
          '<div class="card center pop" style="background:#fff8e6">' +
            '<h3>🎖️ New badge' + (newBadges.length > 1 ? "s" : "") + '!</h3>' +
            '<div style="font-size:2.6rem">' + newBadges.map(function (b) { return b.emoji; }).join(" ") + '</div>' +
            '<p class="muted">' + newBadges.map(function (b) { return esc(b.name); }).join(", ") + '</p>' +
          '</div>'
        ));
      }
      card.querySelector("#againBtn").onclick = function () { startLesson(subjectKey, -1); };
      card.querySelector("#homeBtn").onclick = screenHome;
    }

    renderQuestion();
  }

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
        '<p class="muted">A quick look at how ' + esc(profile.name) + ' is doing.' +
          (cloudEnabled ? ' <span class="pill">☁️ Synced</span>' : ' <span class="pill">📵 Offline</span>') + '</p>' +
        '<div class="stat-row"><span>⭐ Total stars</span><span class="pill">' + state.stars + '</span></div>' +
        '<div class="stat-row"><span>📚 Lessons finished</span><span class="pill">' + state.totalLessons + '</span></div>' +
        '<div class="stat-row"><span>🏆 Perfect lessons</span><span class="pill">' + state.perfectLessons + '</span></div>' +
        '<div class="stat-row"><span>🔥 Day streak (best)</span><span class="pill">' + state.streak + ' (' + state.bestStreak + ')</span></div>' +
      '</div>'
    );
    APP.appendChild(card);
    card.querySelector("#back").onclick = screenHome;

    var subjCard = el('<div class="card"><h3>Levels by subject</h3><div id="subjStats"></div>' +
      '<p class="muted" style="font-size:0.85rem;margin-top:10px">Levels go from 1 to 6 and adjust automatically — they rise when your child does well and ease off when a topic is tricky.</p></div>');
    APP.appendChild(subjCard);
    var ss = subjCard.querySelector("#subjStats");
    Object.keys(window.SUBJECTS).forEach(function (key) {
      var s = window.SUBJECTS[key];
      ss.appendChild(el(
        '<div class="stat-row"><span>' + s.emoji + ' ' + s.name +
          ' <span class="muted" style="font-size:0.85rem">(' + (state.subjectLessons[key] || 0) + ' lessons)</span></span>' +
          '<span class="pill">Level ' + state.levels[key] + ' / 6</span></div>'
      ));
    });

    var badgeCard = el('<div class="card"><h3>🎖️ Badges (' + earned + '/' + totalBadges + ')</h3><div class="badge-grid" id="badges"></div></div>');
    APP.appendChild(badgeCard);
    var bg = badgeCard.querySelector("#badges");
    window.BADGES.forEach(function (b) {
      var got = state.earnedBadges.indexOf(b.id) !== -1;
      bg.appendChild(el(
        '<div class="badge' + (got ? " earned" : "") + '">' +
          '<div class="b-emoji">' + b.emoji + '</div><div class="b-name">' + esc(b.name) + '</div></div>'
      ));
    });

    // Settings differ a bit between cloud and local mode
    var settingsHtml =
      '<div class="card"><h3>⚙️ Settings</h3><div class="row">' +
        '<button class="btn blue" id="resetBtn">Reset progress</button>';
    if (cloudEnabled) {
      settingsHtml +=
        '<button class="btn ghost" id="switchBtn">Switch child</button>' +
        '<button class="btn pink" id="signoutBtn">Sign out</button>';
    }
    settingsHtml += '</div></div>';
    var settings = el(settingsHtml);
    APP.appendChild(settings);

    settings.querySelector("#resetBtn").onclick = function () {
      if (confirm("Reset ALL progress for " + profile.name + "? This cannot be undone.")) {
        state = blankState();
        persist();
        screenHome();
      }
    };
    if (cloudEnabled) {
      settings.querySelector("#switchBtn").onclick = function () {
        // refresh list then show picker
        sb.from("child_profiles").select("id,name,avatar,state").order("created_at", { ascending: true })
          .then(function (res) { profiles = (res && res.data) || profiles; screenProfilePicker(); });
      };
      settings.querySelector("#signoutBtn").onclick = doSignOut;
    }
  }

  /* ----------------------------- Boot ------------------------------ */
  boot();
})();
