/* =========================================================
   FUTURETECH — interactions
   Loader counter, line reveals, rolling hovers, scroll-speed
   marquee, page wipes, cursor follower.
   ========================================================= */

(() => {
  const root = document.documentElement;
  root.classList.add("js-enabled");

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };

  document.addEventListener("DOMContentLoaded", () => {
    /* ---------- rolling text on nav links and buttons ---------- */
    const roll = (el) => {
      const text = el.textContent.trim();
      if (!text) return;
      const outer = document.createElement("span");
      outer.className = "roll";
      const inner = document.createElement("span");
      inner.textContent = text;
      inner.setAttribute("data-text", text);
      outer.appendChild(inner);
      el.textContent = "";
      el.appendChild(outer);
      const host = el.closest("a, button");
      if (host && !host.hasAttribute("aria-label")) host.setAttribute("aria-label", text);
    };
    $$(".nav-links a").forEach(roll);
    $$(".label").forEach(roll);

    /* ---------- mobile menu ---------- */
    const menuButton = $(".menu-toggle");
    const navLinks = $(".nav-links");
    if (menuButton && navLinks) {
      const setOpen = (open) => {
        menuButton.setAttribute("aria-expanded", String(open));
        menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
        navLinks.classList.toggle("is-open", open);
      };
      menuButton.addEventListener("click", () =>
        setOpen(menuButton.getAttribute("aria-expanded") !== "true"));
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") setOpen(false);
      });
      document.addEventListener("click", (e) => {
        if (!navLinks.contains(e.target) && !menuButton.contains(e.target)) setOpen(false);
      });
      window.addEventListener("resize", () => {
        if (window.innerWidth > 850) setOpen(false);
      });
    }

    /* ---------- current page ---------- */
    const file = window.location.pathname.split("/").pop() || "index.html";
    $$(".nav-links a").forEach((a) => {
      if (a.getAttribute("href") === file) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });

    $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

    /* ---------- reveals ---------- */
    let begun = false;
    const begin = () => {
      if (begun) return;
      begun = true;

      $$("[data-split]").forEach((el) =>
        $$(".line > span", el).forEach((s, i) => s.style.setProperty("--i", i)));

      const counts = new Map();
      $$("[data-reveal]").forEach((el) => {
        const n = counts.get(el.parentNode) || 0;
        counts.set(el.parentNode, n + 1);
        el.style.setProperty("--d", Math.min(n, 4) * 0.09 + "s");
      });

      const items = $$("[data-reveal], [data-split]");
      if (reduce || !("IntersectionObserver" in window)) {
        items.forEach((el) => el.classList.add("is-in"));
        return;
      }
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
      items.forEach((el) => io.observe(el));
    };

    /* ---------- loader (home page, first visit per session) ---------- */
    const isHome = document.body.dataset.page === "home";
    if (isHome && !reduce && !store.get("ft-seen")) {
      store.set("ft-seen", "1");
      const pl = document.createElement("div");
      pl.className = "preloader";
      pl.setAttribute("aria-hidden", "true");
      pl.innerHTML = '<span class="pl-word">FUTURETECH.</span><span class="pl-count">0</span>';
      document.body.appendChild(pl);
      document.body.classList.add("is-loading");

      const num = $(".pl-count", pl);
      const start = performance.now();
      const duration = 1400;
      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        num.textContent = "100";
        pl.classList.add("done");
        document.body.classList.remove("is-loading");
        begin();
        setTimeout(() => pl.remove(), 1000);
      };
      const step = (now) => {
        const p = Math.min((now - start) / duration, 1);
        num.textContent = Math.round(100 * (1 - Math.pow(1 - p, 2)));
        if (p < 1 && !finished) requestAnimationFrame(step);
        else finish();
      };
      requestAnimationFrame(step);
      setTimeout(finish, 4000); // safety net
    } else {
      begin();
    }

    /* ---------- page wipe between pages ---------- */
    if (!reduce) {
      const wipe = document.createElement("div");
      wipe.className = "wipe";
      wipe.setAttribute("aria-hidden", "true");
      document.body.appendChild(wipe);

      if (store.get("ft-wipe")) {
        store.del("ft-wipe");
        wipe.classList.add("no-anim", "is-covering");
        requestAnimationFrame(() => requestAnimationFrame(() => {
          wipe.classList.remove("no-anim", "is-covering");
          wipe.classList.add("is-leaving");
        }));
        wipe.addEventListener("transitionend", () => {
          wipe.classList.add("no-anim");
          wipe.classList.remove("is-leaving");
          void wipe.offsetHeight;
          wipe.classList.remove("no-anim");
        }, { once: true });
      }

      document.addEventListener("click", (e) => {
        const a = e.target.closest("a[href]");
        if (!a || e.defaultPrevented || e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (a.target && a.target !== "_self") return;
        if (a.hasAttribute("download")) return;
        if (a.protocol !== location.protocol || a.host !== location.host) return;
        if (a.pathname === location.pathname) return; // same page or #hash
        e.preventDefault();
        store.set("ft-wipe", "1");
        wipe.classList.add("is-covering");
        setTimeout(() => { window.location.href = a.href; }, 560);
      });

      window.addEventListener("pageshow", (e) => {
        if (e.persisted) wipe.classList.remove("is-covering", "is-leaving");
      });
    }

    /* ---------- marquee (speeds up while you scroll) ---------- */
    const track = $(".marquee-track");
    let marqueeAnim = null;
    if (track && track.firstElementChild) {
      track.appendChild(track.firstElementChild.cloneNode(true));
      marqueeAnim = track.getAnimations()[0] || null;
    }

    /* ---------- cursor ---------- */
    let cursor = null;
    let mx = -100, my = -100, cx = -100, cy = -100;
    if (finePointer && !reduce) {
      cursor = document.createElement("div");
      cursor.className = "cursor";
      cursor.setAttribute("aria-hidden", "true");
      document.body.appendChild(cursor);
      window.addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; });
      document.addEventListener("pointerover", (e) => {
        cursor.classList.toggle("is-big", !!e.target.closest("a, button, label"));
      });
    }

    /* ---------- scroll loop ---------- */
    const progress = $(".progress");
    const parallax = $$("[data-speed]");
    const slideX = $$("[data-scroll-x]");
    const spinners = $$("[data-spin]");
    let lastY = window.scrollY;
    let rate = 1;

    const tick = () => {
      const y = window.scrollY;
      const velocity = y - lastY;
      lastY = y;

      if (progress) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
      }

      if (!reduce) {
        if (marqueeAnim) {
          const target = 1 + Math.min(Math.abs(velocity) * 0.25, 8);
          rate += (target - rate) * 0.08;
          marqueeAnim.playbackRate = rate;
        }

        parallax.forEach((el) => {
          const r = el.parentElement.getBoundingClientRect();
          const offset = r.top + r.height / 2 - window.innerHeight / 2;
          el.style.translate = `0 ${(-offset * parseFloat(el.dataset.speed)).toFixed(1)}px`;
        });

        slideX.forEach((el) => {
          const r = el.parentElement.getBoundingClientRect();
          const p = (window.innerHeight - r.top) / (window.innerHeight + r.height);
          el.style.translate = `${((p - 0.5) * parseFloat(el.dataset.scrollX)).toFixed(1)}px 0`;
        });

        spinners.forEach((el) => { el.style.rotate = (y * 0.12).toFixed(1) + "deg"; });

        if (cursor) {
          cx += (mx - cx) * 0.2;
          cy += (my - cy) * 0.2;
          cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
})();
