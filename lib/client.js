window.__ModuleLoader__.load({
  id: "dsh-workbuddy-hub",
  factory: function (require) {
  var module = { exports: {} };
  var exports = module.exports;

  // ---------------------------------------------------------------------------
  // WorkBuddyBall — draggable floating ball + slide-in drawer for the WorkBuddy
  // multi-account ledger (phone / daily credits / flash cooldown / next to use).
  //
  // Hard-won rules this file obeys (dsh-config plugin-development SKILL.md):
  //   * 7.14  — NO iframe: the desktop shell blocks sub-frames, and a failed
  //             iframe still fires `load` (silent blank). We render native DOM
  //             and fetch ROOT-RELATIVE paths only.
  //   * 7.6.3 — the ball must be position:fixed with a static, pointer-events
  //             none container, else Electron offsets/blocks it.
  //   * 7.15  — never hardcode colours: use --dsw-alias-* tokens with neutral
  //             grey fallbacks, so light and dark themes both stay readable.
  //   * 7.10.3— intercept mousedown on our own interactive elements so the
  //             host's outside-close / blur gates never swallow the click.
  // ---------------------------------------------------------------------------

  var HOST = "/dsh-workbuddy-hub";
  var BALL_SIZE = 54;
  var POS_KEY = "dsh-workbuddy-hub.pos.v1";
  var OPEN_KEY = "dsh-workbuddy-hub.open.v1";
  var POLL_MS = 30000;
  var MODEL = "deepseek-v4.1-flash";
  /**
   * Star 直达目标。仓库尚未创建时点击会走到 404，因此按钮在 REPO_READY
   * 为 false 时仍可用，但提示会说明"仓库尚未发布"，避免被误判成插件故障。
   * 发布后把 REPO_READY 改成 true 即可。
   */
  var REPO_URL = "https://github.com/loyalchiiina/dsh-workbuddy-hub";
  var REPO_READY = false;

  // WorkDaddy mark (the app the ledger data comes from), inlined so the ball
  // never depends on a network or file read for its icon.
  var ICON_SVG =
    '<svg viewBox="0 0 36 36" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M20.9906 0.749905C21.2671 0.501943 21.2839 0.492544 21.4868 0.480364C21.8155 0.456367 22.1168 0.613756 22.6293 1.08032C23.8268 2.16857 25.4945 4.40663 26.5313 6.31727L26.9319 7.05801L27.497 7.33954C28.0431 7.61551 28.9398 8.18131 29.314 8.48483C29.4833 8.62479 29.5069 8.62785 29.683 8.55938C30.4771 8.25011 31.6152 8.66001 32.6186 9.62266C33.5218 10.4883 34.3864 11.9675 34.7179 13.202C34.7663 13.4007 34.8304 13.8282 34.8538 14.1463C34.9294 15.2633 34.571 16.1556 33.8812 16.5594C33.7407 16.6406 33.7313 16.6629 33.7352 17.0136C33.767 18.6863 33.316 20.3563 32.4104 21.9845C31.3878 23.8129 29.567 25.7049 27.1028 27.4868C25.7795 28.4498 22.6486 30.2737 21.2331 30.914C17.8423 32.4406 15.124 33.0265 12.7628 32.7372C11.3545 32.5665 9.76077 32.0165 8.81752 31.3784C8.56924 31.2068 8.52956 31.1962 8.33994 31.2504C7.33017 31.5405 6.00784 30.9439 4.88436 29.6968C4.43627 29.1982 3.71256 27.9746 3.47813 27.3197C2.93596 25.7871 3.04369 24.4039 3.76587 23.5779C3.95253 23.3651 3.95911 23.356 3.91833 22.9982C3.85104 22.4127 3.82028 21.5464 3.85099 20.987L3.87519 20.4645L3.09052 19.0761C1.87585 16.9147 1.10489 15.0997 0.807219 13.7131C0.650067 12.9527 0.659309 12.6151 0.852335 12.3655C0.970002 12.2148 1.35547 12.0584 1.81974 11.9727C2.98906 11.7675 5.53887 11.9539 8.37556 12.4547L8.67086 12.5052L9.31816 11.933C10.3933 10.9807 11.1076 10.4465 12.4243 9.62549C13.7967 8.76684 15.3456 8.06062 17.0898 7.50131L17.6491 7.32161L17.9568 6.51473C19.0582 3.60726 20.1864 1.46295 20.9906 0.749905ZM11.7647 15.649C10.5199 16.3677 9.89712 16.7273 9.43978 17.13C7.58778 18.7608 6.89553 21.3443 7.68401 23.6826C7.87871 24.26 8.23798 24.8824 8.95645 26.1268C9.67512 27.3716 10.0347 27.9944 10.4374 28.4517C12.0682 30.3037 14.6517 30.996 16.9901 30.2075C17.5675 30.0128 18.1903 29.6532 19.4351 28.9346L26.5959 24.8003C27.8403 24.0818 28.4626 23.7224 28.9199 23.3198C30.7719 21.689 31.4642 19.1055 30.6757 16.7671C30.481 16.1897 30.1215 15.5669 29.4028 14.3221C28.6843 13.0777 28.3249 12.4554 27.9223 11.9981C26.2915 10.1461 23.708 9.45382 21.3696 10.2423C20.7923 10.437 20.1699 10.7963 18.9255 11.5147L11.7647 15.649Z" fill="currentColor"/>' +
    '<rect x="12.4551" y="20.6523" width="2.82872" height="5.87502" rx="1.41436" transform="rotate(-30 12.4551 20.6523)" fill="currentColor"/>' +
    '<rect x="20.0869" y="16.2461" width="2.82872" height="5.87502" rx="1.41436" transform="rotate(-30 20.0869 16.2461)" fill="currentColor"/>' +
    '</svg>';

  // Host design tokens (SKILL 7.15): semantic aliases, neutral grey fallbacks.
  var T = {
    text:      "var(--dsw-alias-label-primary, #1f2328)",
    textDim:   "var(--dsw-alias-label-secondary, #6a737d)",
    textTiny:  "var(--dsw-alias-label-tertiary, #8b949e)",
    bgCard:    "var(--dsw-alias-bg-layer-1, rgba(127,127,127,.07))",
    bgInput:   "var(--dsw-alias-bg-layer-2, rgba(127,127,127,.12))",
    border:    "var(--dsw-alias-border-l3, rgba(127,127,127,.38))",
    brand:     "var(--dsw-alias-brand-primary, #1f6feb)",
    accentFg:  "var(--dsw-alias-label-primary-foreground, #fff)",
    // amber, readable in BOTH themes: state-warn alone does not invert (SKILL 7.15.3)
    textTone:  "color-mix(in srgb, var(--dsw-alias-state-warn-primary, #f59e0b) 72%, var(--dsw-alias-label-primary, #1f2328))"
  };

  function css(el, obj) { for (var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) el.style[k] = obj[k]; } }
  function txt(s) { return String(s === undefined || s === null ? "" : s); }
  function pad(n, w) { var s = txt(n); return s.length >= w ? s : " ".repeat(w - s.length) + s; }
  function maskPhone(p) { p = txt(p); return p.length >= 11 ? p.slice(0, 3) + "****" + p.slice(-4) : p; }
  /**
   * 昵称脱敏（🔴 隐私硬要求）。
   * 微信昵称常含真名/手机号/可识别信息，抽屉里一律只留首尾字。
   * 纯数字形态的昵称（用户直接拿手机号当昵称）按手机号规则处理。
   */
  function maskNick(n) {
    var s = txt(n).trim();
    if (!s) return "";
    if (/^\d{7,}$/.test(s)) return maskPhone(s);
    var chars = Array.from(s);
    if (chars.length <= 2) return s;
    return chars[0] + "…" + chars[chars.length - 1];
  }
  function shortUid(u) { return txt(u).slice(0, 8); }
  function fmtTime(ms) {
    if (!ms) return "-";
    var d = new Date(Number(ms));
    var p = function (n) { return String(n).padStart(2, "0"); };
    return p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function fmtLeft(ms, now) {
    var diff = Number(ms) - (now || Date.now());
    if (diff <= 0) return "已解禁";
    var s = Math.floor(diff / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    if (h >= 24) return Math.floor(h / 24) + "天" + (h % 24) + "小时";
    if (h > 0) return h + "小时" + m + "分";
    return m + "分" + (s % 60) + "秒";
  }

  // ---- persisted geometry ---------------------------------------------------
  function readPos() {
    try {
      var raw = localStorage.getItem(POS_KEY);
      if (raw) { var p = JSON.parse(raw); if (p && typeof p.x === "number") return p; }
    } catch (e) { /* ignore */ }
    return { x: Math.max(12, (window.innerWidth || 1200) - BALL_SIZE - 26), y: 132 };
  }
  function savePos(x, y) { try { localStorage.setItem(POS_KEY, JSON.stringify({ x: Math.round(x), y: Math.round(y) })); } catch (e) { /* ignore */ } }
  function clamp(x, y) {
    var w = window.innerWidth || 1200, h = window.innerHeight || 800;
    return { x: Math.min(Math.max(4, x), Math.max(4, w - BALL_SIZE - 4)), y: Math.min(Math.max(4, y), Math.max(4, h - BALL_SIZE - 4)) };
  }

  // ---- state ---------------------------------------------------------------
  var hostEl = null, ballEl = null, drawerEl = null, listEl = null, headEl = null, footEl = null, toastEl = null, refreshBtn = null;
  var state = { loading: true, data: null, error: "" };
  var timer = null;
  var open = false;
  var lastFetchAt = 0;
  var fetching = false;
  var switching = false;
  var loginPolling = false;
  var checkinRunning = false;

  function isOpen() { try { return localStorage.getItem(OPEN_KEY) === "1"; } catch (e) { return false; } }
  function setOpen(v) { open = !!v; try { localStorage.setItem(OPEN_KEY, v ? "1" : "0"); } catch (e) { /* ignore */ } }

  /**
   * Pull /state and re-render.
   *
   * `announce` is set only for a user-initiated refresh: it shows a spinner on
   * the button and a toast on completion. Without that feedback a manual refresh
   * looks like a no-op, because the numbers usually do not change between two
   * clicks seconds apart — the earlier version had no feedback at all and the
   * user reasonably reported "the button does nothing".
   */
  function fetchState(announce) {
    // Dedupe BACKGROUND polls only. A user-initiated refresh must never be
    // dropped: the first guard returned early whenever a poll happened to be in
    // flight, so clicking 刷新 during the 30s poll did literally nothing.
    if (fetching && !announce) return Promise.resolve();
    fetching = true;
    state.loading = true;
    if (announce && refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.textContent = "刷新中…";
    }
    // 调度信息与主数据**分开请求**：一个失败不能清空另一个（SKILL 7.14.5）
    fetch(HOST + "/checkin/state", { credentials: "same-origin" })
      .then(function (r) { return r.json(); })
      .then(function (cs) { state.checkin = cs || null; if (open) render(); })
      .catch(function () { /* 调度信息拿不到不影响主界面 */ });
    // ROOT-RELATIVE ONLY (SKILL 7.14.4): an absolute loopback URL is CSP-blocked.
    return fetch(HOST + "/state?model=" + encodeURIComponent(MODEL), { credentials: "same-origin" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        state.data = d;
        state.error = "";
        state.loading = false;
        lastFetchAt = Date.now();
        render();
        if (announce) {
          var n = d && d.rows ? d.rows.length : 0;
          toast("已刷新 · " + timeOf(lastFetchAt) + " · " + n + " 个账号" + (d && d.available ? "" : "（账号数据不可用）"));
        }
      })
      .catch(function (e) {
        state.error = "读取失败：" + (e && e.message ? e.message : e);
        state.loading = false;
        render();
        if (announce) toast("刷新失败：" + (e && e.message ? e.message : e));
      })
      .then(function () {
        fetching = false;
        if (refreshBtn) { refreshBtn.disabled = false; refreshBtn.textContent = "刷新"; }
      });
  }

  function timeOf(ms) {
    var d = new Date(Number(ms) || Date.now());
    var p = function (n) { return String(n).padStart(2, "0"); };
    return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }

  function summaryText() {
    var d = state.data;
    if (!d) return state.error ? "读取失败" : "读取中";
    if (!d.available) return "无本地数据";
    return d.usableCount + "/" + d.rows.length + " 可用";
  }
  function badgeCount() {
    var d = state.data;
    if (!d || !d.coolingCount) return 0;
    return d.coolingCount;
  }

  // ---- rendering -----------------------------------------------------------
  function buildBall() {
    ballEl = document.createElement("div");
    ballEl.setAttribute("data-workbuddy-ball", "1");
    css(ballEl, {
      position: "fixed", zIndex: "2147483000",
      // REQUIRED: the container is pointer-events:none (SKILL 7.6.3), and that
      // property INHERITS — without an explicit auto here the ball is visible
      // but every mouse event passes straight through it.
      pointerEvents: "auto",
      width: BALL_SIZE + "px", height: BALL_SIZE + "px",
      borderRadius: "50%", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--dsw-alias-bg-layer-1, #2b2f36)",
      border: "1px solid " + T.border,
      boxShadow: "0 3px 14px rgba(0,0,0,.34)",
      color: "var(--dsw-alias-label-primary, #e6e8ec)",
      userSelect: "none", touchAction: "none",
      transition: "transform .12s ease"
    });
    ballEl.title = "WorkBuddy 多账号台账（拖动可移动，点击展开）";

    var icon = document.createElement("div");
    css(icon, { width: "28px", height: "28px", display: "block", pointerEvents: "none" });
    icon.innerHTML = ICON_SVG;
    ballEl.appendChild(icon);

    // count badge: number of accounts currently in cooldown
    var badge = document.createElement("div");
    badge.setAttribute("data-wb-badge", "1");
    css(badge, {
      position: "absolute", top: "-3px", right: "-3px", minWidth: "19px", height: "19px",
      borderRadius: "10px", fontSize: "11px", lineHeight: "19px", textAlign: "center",
      padding: "0 5px", fontWeight: "600", display: "none",
      background: "var(--dsw-alias-state-error-primary, #d64545)", color: "#fff",
      pointerEvents: "none", boxSizing: "border-box"
    });
    ballEl.appendChild(badge);

    var p = clamp(readPos().x, readPos().y);
    css(ballEl, { left: p.x + "px", top: p.y + "px" });

    // drag vs click: threshold keeps a shaky click from becoming a move
    var dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
    function onDown(ev) {
      var pt = ev.touches ? ev.touches[0] : ev;
      dragging = true; moved = false;
      sx = pt.clientX; sy = pt.clientY;
      var r = ballEl.getBoundingClientRect();
      ox = r.left; oy = r.top;
      // stop the host's outside-close / blur gates from eating our interaction
      ev.preventDefault();
      ev.stopPropagation();
    }
    function onMove(ev) {
      if (!dragging) return;
      var pt = ev.touches ? ev.touches[0] : ev;
      var dx = pt.clientX - sx, dy = pt.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      if (!moved) return;
      var q = clamp(ox + dx, oy + dy);
      css(ballEl, { left: q.x + "px", top: q.y + "px" });
      if (open && drawerEl) placeDrawer(q);
      ev.preventDefault();
    }
    function onUp(ev) {
      if (!dragging) return;
      dragging = false;
      if (moved) {
        var r = ballEl.getBoundingClientRect();
        savePos(r.left, r.top);
        if (open && drawerEl) placeDrawer({ x: r.left, y: r.top });
      } else {
        toggleDrawer();
      }
      if (ev) { ev.preventDefault(); ev.stopPropagation(); }
    }

    ballEl.addEventListener("mousedown", onDown);
    ballEl.addEventListener("touchstart", onDown, { passive: false });
    document.addEventListener("mousemove", onMove);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);

    return ballEl;
  }

  function placeDrawer(ballPos) {
    if (!drawerEl) return;
    var w = Math.min(560, Math.max(320, (window.innerWidth || 1200) - 40));
    var h = Math.min(600, Math.max(280, (window.innerHeight || 800) - 90));
    css(drawerEl, { width: w + "px", maxHeight: h + "px" });
    var wantLeft = ballPos.x + BALL_SIZE + 12;
    if (wantLeft + w > (window.innerWidth || 1200) - 12) wantLeft = Math.max(12, ballPos.x - w - 12);
    var wantTop = Math.min(Math.max(12, ballPos.y), Math.max(12, (window.innerHeight || 800) - h - 12));
    css(drawerEl, { left: wantLeft + "px", top: wantTop + "px" });
  }

  function buildDrawer() {
    drawerEl = document.createElement("div");
    drawerEl.setAttribute("data-workbuddy-drawer", "1");
    css(drawerEl, {
      position: "fixed", zIndex: "2147482999", display: "none",
      pointerEvents: "auto",   // same reason as the ball: undo the container's none
      background: "var(--dsw-alias-bg-layer-1, #1b1e24)",
      border: "1px solid " + T.border, borderRadius: "12px",
      boxShadow: "0 10px 34px rgba(0,0,0,.42)",
      color: T.text, overflow: "hidden", flexDirection: "column",
      font: '13px/1.5 "Segoe UI", "Microsoft YaHei", system-ui, sans-serif'
    });

    // header
    headEl = document.createElement("div");
    css(headEl, {
      padding: "11px 14px", borderBottom: "1px solid " + T.border,
      // 5 controls next to the title need room to wrap on a narrow drawer
      display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap", flexShrink: "0"
    });
    var hIcon = document.createElement("div");
    css(hIcon, { width: "19px", height: "19px", color: T.brand, flexShrink: "0" });
    hIcon.innerHTML = ICON_SVG;
    headEl.appendChild(hIcon);
    var hTitle = document.createElement("div");
    // flexBasis + minWidth keeps the title on its own row when the buttons wrap
    css(hTitle, { fontWeight: "600", fontSize: "13.5px", flex: "1 1 auto", minWidth: "96px" });
    hTitle.textContent = "WorkBuddy 多账号";
    headEl.appendChild(hTitle);
    var hBtns = document.createElement("div");
    css(hBtns, { display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginLeft: "auto" });
    var btnLogin = mkBtn("＋ 登录新账号", function (ev) { stopEvt(ev); startSeamlessLogin(); });
    var btnCheckin = mkBtn("签到", function (ev) { stopEvt(ev); runCheckin(btnCheckin); });
    btnCheckin.title = "对所有已备份账号签到（逐个解密凭据调官方接口，无需第三方工具）";
    var btnBoard = mkBtn("网页版", function (ev) { stopEvt(ev); openWebBoard(); });
    var btnRefresh = mkBtn("刷新", function (ev) { stopEvt(ev); fetchState(true); });
    refreshBtn = btnRefresh;
    var btnStar = mkBtn("★ Star", function (ev) { stopEvt(ev); openRepo(); });
    btnStar.title = REPO_READY ? ("给这个插件点个 Star：" + REPO_URL) : ("仓库尚未发布：" + REPO_URL);
    css(btnStar, { color: T.textTone });
    var btnClose = mkBtn("×", function (ev) { stopEvt(ev); setOpen(false); render(); });
    css(btnClose, { fontSize: "16px", lineHeight: "1", padding: "3px 9px" });
    hBtns.appendChild(btnLogin);
    hBtns.appendChild(btnCheckin);
    hBtns.appendChild(btnBoard);
    hBtns.appendChild(btnRefresh);
    hBtns.appendChild(btnStar);
    hBtns.appendChild(btnClose);
    headEl.appendChild(hBtns);
    drawerEl.appendChild(headEl);

    // body
    listEl = document.createElement("div");
    css(listEl, { padding: "11px 14px", overflowY: "auto", flex: "1" });
    drawerEl.appendChild(listEl);

    // footer
    footEl = document.createElement("div");
    css(footEl, { padding: "9px 14px", borderTop: "1px solid " + T.border, color: T.textTiny, fontSize: "11.5px", flexShrink: "0" });
    drawerEl.appendChild(footEl);

    // Keep the host from treating a click inside our drawer as "clicked outside"
    // (which would slam the drawer shut) — but do it in the BUBBLE phase.
    //
    // An earlier revision registered these with capture=true. That is wrong:
    // a capture-phase stopPropagation on the ROOT runs BEFORE the event ever
    // reaches the target, so every button inside the drawer (the × close in
    // particular) stopped receiving its click. The reference implementation
    // (dsh-lobsterai-daddy) only ever stops propagation on the specific
    // element that needs it, never on the whole panel in capture.
    ["mousedown", "click", "pointerdown"].forEach(function (evt) {
      drawerEl.addEventListener(evt, function (e) { e.stopPropagation(); }, false);
    });

    return drawerEl;
  }

  /**
   * 方式一：无感登录（免退出）。
   *
   * Asks the host for a state + authorisation URL, opens it in the SYSTEM browser
   * (the host spawns it — window.open is blocked under dsh-app://), then polls
   * until the user finishes scanning. On success the new account is written to
   * accounts/<uid>.info and the list refreshes; the CURRENT sign-in is untouched,
   * so other accounts keep working.
   */
  function startSeamlessLogin() {
    if (loginPolling) { toast("登录流程进行中，请先在浏览器完成扫码"); return; }
    toast("正在申请登录链接…");
    fetch(HOST + "/login/start", { method: "POST", credentials: "same-origin" })
      .then(function (r) { return r.json().then(function (d) { return { s: r.status, d: d }; }); })
      .then(function (out) {
        var d = out.d || {};
        if (!d.ok) { toast("发起登录失败：" + (d.error || ("HTTP " + out.s))); return; }
        toast("已打开浏览器，请扫码授权（10 分钟内有效）", true);
        pollLogin(d.loginId, Date.now() + (d.expiresIn || 600) * 1000);
      })
      .catch(function (e) { toast("发起登录失败：" + (e && e.message ? e.message : e)); });
  }

  /** poll the host for the authorisation result until done/timeout */
  function pollLogin(loginId, deadline) {
    loginPolling = true;
    var stop = false;
    function once() {
      if (stop) return;
      if (Date.now() > deadline) {
        stop = true; loginPolling = false;
        toast("登录超时，请重新点击「登录新账号」");
        return;
      }
      fetch(HOST + "/login/poll?loginId=" + encodeURIComponent(loginId), { credentials: "same-origin" })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && d.done) {
            stop = true; loginPolling = false;
            if (d.error) { toast("登录未完成：" + d.error); return; }
            var res = d.result || {};
            toast("已登录并入库：" + (maskNick(res.nickname) || maskPhone(res.phone) || shortUid(res.uid) || "新账号"), true);
            fetchState(true);
            return;
          }
          setTimeout(once, 3000);
        })
        .catch(function () { setTimeout(once, 4000); });
    }
    once();
  }

  /**
   * 打开 GitHub 仓库（Star 直达）。
   *
   * window.open / <a target=_blank> are silently swallowed under dsh-app://
   * (SKILL 7.14), so the reliable route is the HOST's /open-url endpoint, which
   * spawns the real browser. An anchor attempt is still made first because it is
   * free and works when the shell happens to allow it.
   */
  function openRepo() {
    if (!REPO_READY) {
      toast("仓库尚未发布；发布后此按钮直达 GitHub：" + REPO_URL, true);
      return;
    }
    try {
      var a = document.createElement("a");
      a.href = REPO_URL;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { try { a.remove(); } catch (e) { /* ignore */ } }, 0);
    } catch (e) { /* fall through to the host route */ }
    fetch(HOST + "/open-url", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: REPO_URL }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.ok) toast("已在浏览器打开：" + REPO_URL);
        else toast("无法自动打开，请手动访问：" + REPO_URL, true);
      })
      .catch(function () { toast("无法自动打开，请手动访问：" + REPO_URL, true); });
  }

  /**
   * 一键签到：交给宿主对所有已备份账号逐一签到。
   *
   * 宿主负责解密每个账号的凭据并调用官方签到接口（因此不依赖 WorkDaddy），
   * 客户端只负责触发、显示进度与结果。
   */
  function runCheckin(btn) {
    if (checkinRunning) { toast("签到进行中，请稍候…"); return; }
    checkinRunning = true;
    var prev = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "签到中…"; }
    toast("正在为所有账号签到…", true);
    fetch(HOST + "/checkin", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: "{}",
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok && d.error) { toast("签到失败：" + (d && d.error ? d.error : "未知错误"), true); return; }
        var ok = d.okCount || 0;
        var total = d.total || 0;
        var failed = (d.results || []).filter(function (x) { return !x.ok; });
        var already = (d.results || []).filter(function (x) { return x.ok && x.already; }).length;
        var msg = "签到完成：" + ok + "/" + total + " 成功";
        if (already) msg += "（其中 " + already + " 个今日已签到）";
        if (failed.length) msg += "，失败 " + failed.length + "：" + failed.slice(0, 3).map(function (x) {
          return shortUid(x.uid) + " " + (x.error || x.message || x.code || "");
        }).join("；");
        toast(msg, true);
        fetchState(true);
      })
      .catch(function (e) { toast("签到失败：" + (e && e.message ? e.message : e)); })
      .then(function () {
        checkinRunning = false;
        if (btn) { btn.disabled = false; btn.textContent = prev || "签到"; }
      });
  }

  function stopEvt(e) { if (e) { e.preventDefault(); e.stopPropagation(); } }

  /**
   * Open the full web board in the system browser.
   *
   * window.open() / <a target=_blank> are silently swallowed under dsh-app://,
   * so the reliable route is the HOST: POST /open makes the host spawn the
   * browser. We still try the anchor route first (it renders identically when
   * the shell happens to allow it), then fall back to the host, and finally
   * tell the user the URL so nothing is left to guesswork.
   */
  function openWebBoard() {
    var fallbackUrl = HOST + "/board";
    function viaAnchor() {
      try {
        var a = document.createElement("a");
        a.href = fallbackUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { try { a.remove(); } catch (e) { /* ignore */ } }, 0);
        return true;
      } catch (e) { return false; }
    }
    viaAnchor();
    // Ask the host to launch the real browser too; harmless if the anchor worked.
    fetch(HOST + "/open", { method: "POST", credentials: "same-origin" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.ok) toast("已在浏览器打开网页版：" + d.url);
        else toast("无法自动打开，请手动访问：" + fallbackUrl);
      })
      .catch(function () { toast("无法自动打开，请手动访问：" + fallbackUrl); });
  }

  /**
   * Ask the host to switch the WorkDaddy/WorkBuddy account, then re-read state.
   *
   * The ball is a mapping onto WorkDaddy, not a second implementation: the host
   * forwards the uid to WorkDaddy's own POST /api/switch and mirrors the new
   * credential to whatever path DSH reads.
   */
  function switchToAccount(r, btn) {
    if (!r || !r.uid) return;
    var label = (r.phone ? maskPhone(r.phone) : shortUid(r.uid)) + (r.nickname ? " " + maskNick(r.nickname) : "");
    if (switching) { toast("正在切换中，请稍候…"); return; }
    switching = true;
    var prev = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "切换中…"; }
    toast("正在切到 " + label + " …");
    fetch(HOST + "/switch", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uid: r.uid }),
    })
      .then(function (res) { return res.json().then(function (d) { return { status: res.status, d: d }; }); })
      .then(function (out) {
        var d = out.d || {};
        if (d.ok) {
          toast("已切到 " + label + "（凭据同步：" + (d.credentialMirror || "?") + "）");
          return fetchState().then(function () { /* state refresh renders the new current */ });
        }
        toast("切换失败：" + (d.error || (d.workdaddy && d.workdaddy.raw) || ("HTTP " + out.status)));
      })
      .catch(function (e) { toast("切换失败：" + (e && e.message ? e.message : e)); })
      .then(function () {
        switching = false;
        if (btn) { btn.disabled = false; btn.textContent = prev || "切到此账号"; }
      });
  }

  function toast(msg) {
    try {
      if (!toastEl) {
        toastEl = document.createElement("div");
        css(toastEl, {
          position: "fixed", left: "50%", bottom: "26px", transform: "translateX(-50%)",
          zIndex: "2147483001", maxWidth: "min(620px, 86vw)",
          background: "var(--dsw-alias-bg-layer-1, #22262e)",
          border: "1px solid " + T.border, borderRadius: "9px",
          color: T.text, padding: "10px 15px", fontSize: "12.5px",
          boxShadow: "0 8px 26px rgba(0,0,0,.4)", pointerEvents: "none",
          wordBreak: "break-all", transition: "opacity .25s", opacity: "0"
        });
        document.body.appendChild(toastEl);
      }
      toastEl.textContent = msg;
      toastEl.style.opacity = "1";
      if (toastEl._t) clearTimeout(toastEl._t);
      toastEl._t = setTimeout(function () { try { toastEl.style.opacity = "0"; } catch (e) { /* ignore */ } }, 4200);
    } catch (e) { /* ignore */ }
  }

  function mkBtn(label, onClick) {
    var b = document.createElement("button");
    b.textContent = label;
    css(b, {
      background: "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.16))",
      border: "1px solid " + T.border, color: T.text, borderRadius: "7px",
      padding: "4px 10px", fontSize: "12px", cursor: "pointer", font: "inherit",
      transition: "opacity .15s"
    });
    b.addEventListener("click", onClick);
    b.addEventListener("mousedown", function (e) { e.stopPropagation(); });
    return b;
  }

  function chip(text, kind) {
    var s = document.createElement("span");
    s.textContent = text;
    var bg = "rgba(127,127,127,.16)", fg = T.text, bd = T.border;
    if (kind === "ok") { bg = "color-mix(in srgb, var(--dsw-alias-state-success-primary, #22c55e) 22%, transparent)"; fg = T.text; }
    if (kind === "bad") { bg = "color-mix(in srgb, var(--dsw-alias-state-error-primary, #d64545) 24%, transparent)"; fg = T.text; }
    css(s, {
      display: "inline-block", padding: "1px 8px", borderRadius: "20px",
      fontSize: "11.5px", background: bg, color: fg, border: "1px solid " + bd,
      whiteSpace: "nowrap"
    });
    return s;
  }

  function row(label, value, valueColor) {
    var r = document.createElement("div");
    css(r, { display: "flex", justifyContent: "space-between", gap: "10px", padding: "3px 0" });
    var l = document.createElement("span");
    l.textContent = label;
    css(l, { color: T.textDim, flexShrink: "0" });
    var v = document.createElement("span");
    v.textContent = value;
    css(v, { color: valueColor || T.text, textAlign: "right", wordBreak: "break-all" });
    r.appendChild(l); r.appendChild(v);
    return r;
  }

  function card() {
    var c = document.createElement("div");
    css(c, {
      background: T.bgCard, border: "1px solid " + T.border,
      borderRadius: "9px", padding: "9px 11px", marginBottom: "8px"
    });
    return c;
  }

  function render() {
    if (!ballEl) return;
    if (refreshBtn) refreshBtn.style.opacity = refreshBtn.disabled ? "0.55" : "1";

    // badge
    var badge = ballEl.querySelector('[data-wb-badge]');
    var bc = badgeCount();
    if (badge) {
      badge.style.display = bc > 0 ? "block" : "none";
      badge.textContent = String(bc);
    }
    ballEl.title = "WorkBuddy 多账号：" + summaryText() + "（拖动可移动，点击展开）";

    // drawer visibility
    if (drawerEl) {
      if (open) {
        drawerEl.style.display = "flex";
        var r = ballEl.getBoundingClientRect();
        placeDrawer({ x: r.left, y: r.top });
      } else {
        drawerEl.style.display = "none";
      }
    }
    if (!listEl || !open) return;

    listEl.innerHTML = "";

    var d = state.data;
    if (state.error) {
      var e1 = card();
      e1.appendChild(row("错误", state.error, T.text));
      listEl.appendChild(e1);
      return;
    }
    if (!d) {
      var l1 = card();
      l1.appendChild(row("状态", "读取中…"));
      listEl.appendChild(l1);
      return;
    }
    if (!d.available) {
      var na = card();
      var t1 = document.createElement("div");
      t1.textContent = "多账号信息不可用";
      css(t1, { fontWeight: "600", marginBottom: "5px" });
      na.appendChild(t1);
      var t2 = document.createElement("div");
      t2.textContent = d.reason || "未检测到本地账号数据。";
      css(t2, { color: T.textDim, fontSize: "12px" });
      na.appendChild(t2);
      var t3 = document.createElement("div");
      t3.textContent = "提示：切号与模型使用不受影响，只是看不到账号/积分汇总。";
      css(t3, { color: T.textDim, fontSize: "12px", marginTop: "6px" });
      na.appendChild(t3);
      listEl.appendChild(na);
      return;
    }

    // summary
    var sum = card();
    var s1 = document.createElement("div");
    css(s1, { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" });
    var big = document.createElement("span");
    big.textContent = d.usableCount + " / " + d.rows.length;
    css(big, { fontSize: "20px", fontWeight: "650" });
    s1.appendChild(big);
    s1.appendChild(chip("可用账号", "ok"));
    if (d.coolingCount > 0) s1.appendChild(chip(d.coolingCount + " 个限流中", "bad"));
    sum.appendChild(s1);
    sum.appendChild(row("目标模型", d.model));
    sum.appendChild(row("今日总用量", String(d.totalUsedToday)));
    if (d.next) {
      sum.appendChild(row("建议下一个用", (d.next.phone ? maskPhone(d.next.phone) : shortUid(d.next.uid)) + (d.next.nickname ? " · " + maskNick(d.next.nickname) : "") + "  (剩 " + d.next.credits + ")"));
    }
    if (d.current) {
      sum.appendChild(row("DSH 当前账号", (d.current.phone ? maskPhone(d.current.phone) : shortUid(d.current.uid)) + (d.current.nickname ? " · " + maskNick(d.current.nickname) : "")));
    }
    // explicit freshness line: lets the user verify that "刷新" actually did something
    sum.appendChild(row("数据更新于", timeOf(d.generatedAt) + (lastFetchAt ? "（本页 " + timeOf(lastFetchAt) + " 拉取）" : "")));
    // 定时签到状态（与 WorkDaddy 的 daily-account-checkin 同规则）
    var cs = state.checkin;
    if (cs && cs.schedule) {
      var last = cs.schedule.lastRun;
      var lr = last ? (timeOf(last.at) + " · " + last.okCount + "/" + last.total + " 成功") : "尚未运行";
      sum.appendChild(row("自动签到", "每 " + cs.schedule.intervalMinutes + " 分钟 · 上次 " + lr));
    }
    listEl.appendChild(sum);

    // accounts
    var head = document.createElement("div");
    head.textContent = "账号顺序（可用 → 积分最早过期 → 今日用得少）";
    css(head, { color: T.textDim, fontSize: "11.5px", margin: "4px 0 6px" });
    listEl.appendChild(head);

    d.rows.forEach(function (r, i) {
      var c = card();
      if (r.cooling) css(c, { opacity: "0.62" });
      if (r.isCurrent) css(c, { borderColor: "var(--dsw-alias-state-success-primary, #22c55e)" });

      var top = document.createElement("div");
      css(top, { display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap", marginBottom: "5px" });
      var idx = document.createElement("span");
      idx.textContent = String(i + 1);
      css(idx, { color: T.textTiny, minWidth: "14px", fontWeight: "600" });
      top.appendChild(idx);
      var who = document.createElement("span");
      who.textContent = r.phone ? maskPhone(r.phone) : shortUid(r.uid);
      css(who, { fontWeight: "600" });
      top.appendChild(who);
      if (r.nickname) {
        var nk = document.createElement("span");
        nk.textContent = maskNick(r.nickname);
        css(nk, { color: T.textDim, fontSize: "12px" });
        top.appendChild(nk);
      }
      if (r.isCurrent) top.appendChild(chip("DSH当前", "ok"));
      if (r.cooling) top.appendChild(chip("限流 " + fmtLeft(r.resetAt, d.generatedAt), "bad"));
      else top.appendChild(chip("可用", "ok"));
      // sign-in health + check-in state, straight from WorkDaddy
      if (r.authValid === false) top.appendChild(chip("登录失效", "bad"));
      if (r.checkin) {
        top.appendChild(chip(r.checkin.ok ? (r.checkin.already ? "已签到" : "已签到✓") : "签到失败",
          r.checkin.ok ? "ok" : "bad"));
      }
      c.appendChild(top);

      var grid = document.createElement("div");
      css(grid, { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 14px" });
      grid.appendChild(row("剩余积分", String(r.credits)));
      // A stale usage history means "not collected", not "spent nothing".
      var unknown = r.usageKnown === false;
      grid.appendChild(row("今日用量", unknown ? "未知（未同步）" : String(r.usedToday), unknown ? T.textDim : null));
      grid.appendChild(row("积分最早过期", r.soonestExpiry ? fmtTime(r.soonestExpiry) : "-"));
      grid.appendChild(row("今日请求数", unknown ? "未知" : String(r.requestsToday)));
      if (r.creditSchedule && r.creditSchedule.length > 1) {
        grid.appendChild(row("积分段数", r.creditSchedule.length + " 段"));
        grid.appendChild(row("下个过期", r.creditSchedule[0].expiresAt ? fmtTime(r.creditSchedule[0].expiresAt) : "-"));
      }
      if (r.tokenExpiresAt) grid.appendChild(row("登录令牌到期", fmtTime(r.tokenExpiresAt)));
      c.appendChild(grid);

      // ---- credit expiry schedule (the part that silently wastes credits) ----
      if (r.creditSchedule && r.creditSchedule.length) {
        var exp = document.createElement("div");
        css(exp, { marginTop: "6px" });
        var expHead = document.createElement("div");
        expHead.textContent = "积分有效期（先过期先花）";
        css(expHead, { color: T.textDim, fontSize: "11.5px", marginBottom: "3px" });
        exp.appendChild(expHead);
        var soonDays = 3;
        r.creditSchedule.slice(0, 6).forEach(function (s) {
          var line = document.createElement("div");
          var when = s.expiresAt ? fmtTime(s.expiresAt) : "无期限";
          var urgent = s.expiresAt && (s.expiresAt - Date.now()) < soonDays * 86400000;
          line.textContent = "· " + when + "  剩 " + s.remaining + (urgent ? "  ⚠ 即将过期" : "");
          css(line, { color: urgent ? T.textTone : T.textTiny, fontSize: "11.5px", lineHeight: "1.65" });
          exp.appendChild(line);
        });
        if (r.creditSchedule.length > 6) {
          var more = document.createElement("div");
          more.textContent = "· …还有 " + (r.creditSchedule.length - 6) + " 段";
          css(more, { color: T.textTiny, fontSize: "11.5px" });
          exp.appendChild(more);
        }
        c.appendChild(exp);
      }

      if (unknown) {
        var hint = document.createElement("div");
        hint.textContent = "用量未同步（仅在该账号为当前登录时采集；最后同步 "
          + (r.usageSyncedAt ? fmtTime(r.usageSyncedAt) : "从未") + "）";
        css(hint, { color: T.textTiny, fontSize: "11px", marginTop: "4px" });
        c.appendChild(hint);
      }

      // ---- switch action: the ball is a WorkDaddy mapping ----
      if (!r.isCurrent) {
        var actRow = document.createElement("div");
        css(actRow, { marginTop: "7px", display: "flex", gap: "7px", alignItems: "center" });
        var swBtn = mkBtn("切到此账号", function (ev) {
          stopEvt(ev);
          switchToAccount(r, swBtn);
        });
        actRow.appendChild(swBtn);
        c.appendChild(actRow);
      }

      var models = Object.keys(r.modelsToday || {});
      if (models.length) {
        var ms = document.createElement("div");
        ms.textContent = models.map(function (m) { return m + " " + r.modelsToday[m]; }).join("　");
        css(ms, { color: T.textTiny, fontSize: "11.5px", marginTop: "4px" });
        c.appendChild(ms);
      }
      listEl.appendChild(c);
    });

    // cooldown queue
    if (d.coolingRows && d.coolingRows.length) {
      var qh = document.createElement("div");
      qh.textContent = "冷却队列（按解禁先后）";
      css(qh, { color: T.textDim, fontSize: "11.5px", margin: "10px 0 6px" });
      listEl.appendChild(qh);
      d.coolingRows.forEach(function (r) {
        var c = card();
        c.appendChild(row(r.phone ? maskPhone(r.phone) : shortUid(r.uid), fmtTime(r.resetAt) + "（还需 " + fmtLeft(r.resetAt, Date.now()) + "）", T.textDim));
        listEl.appendChild(c);
      });
    }

    footEl.textContent = "更新 " + fmtTime(d.generatedAt)
      + (lastFetchAt ? " · 本页拉取 " + timeOf(lastFetchAt) : "")
      + " · 每 30 秒自动刷新 · 数据源 本地账号库（只读）";
  }

  function toggleDrawer() {
    setOpen(!open);
    render();
    if (open) fetchState();
  }

  function mount() {
    if (document.querySelector('[data-workbuddy-ball]')) return; // singleton guard
    hostEl = document.createElement("div");
    // SKILL 7.6.3: a static, click-through container keeps position:fixed children
    // anchored to the viewport in Electron.
    css(hostEl, { position: "static", pointerEvents: "none", zIndex: "2147483000" });
    hostEl.appendChild(buildBall());
    hostEl.appendChild(buildDrawer());
    document.body.appendChild(hostEl);

    open = isOpen();
    render();
    fetchState();
    timer = setInterval(function () { if (open) fetchState(); }, POLL_MS);
    window.addEventListener("resize", function () {
      var p = clamp(readPos().x, readPos().y);
      css(ballEl, { left: p.x + "px", top: p.y + "px" });
      if (open && drawerEl) { var r = ballEl.getBoundingClientRect(); placeDrawer({ x: r.left, y: r.top }); }
    });
  }

  function dispose() {
    if (timer) { clearInterval(timer); timer = null; }
    if (hostEl && hostEl.parentNode) hostEl.parentNode.removeChild(hostEl);
    hostEl = ballEl = drawerEl = listEl = headEl = footEl = null;
  }

  exports.inject = [];
  exports.apply = function () {
    // Mount unconditionally — do NOT branch on the ctx shape. An earlier
    // revision returned early when ctx.effect existed, so the ball never
    // mounted in a real cordis runtime (caught by the DOM-stub probe).
    function boot() {
      try { mount(); } catch (e) { reportDiag("mount:ERROR " + (e && e.message)); }
    }
    reportDiag("apply:called readyState=" + document.readyState);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  };
  exports.dispose = dispose;

  // Diagnostics must land on a channel the host actually forwards; a custom
  // prefix is dropped by the log whitelist (SKILL 7.10.5).
  function reportDiag(msg) {
    try { console.info("[next-ui-diagnostic] workbuddy-ball " + msg); } catch (e) { /* ignore */ }
  }

  return module.exports;
  }
});
