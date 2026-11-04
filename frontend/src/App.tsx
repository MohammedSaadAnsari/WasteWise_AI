
import { useEffect, useState } from "react";
import WasteReports from "./pages/WasteReports";
import Recommendations from "./pages/Recommendations";
import DashboardPreview from "./components/DashboardPreview";

type IconName = "arrow" | "leaf" | "chart" | "box" | "calendar" | "menu" | "close";

function Icon({ name, className }: { name: IconName; className?: string }) {
  const shared = {
    className,
    "aria-hidden": true as const,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "arrow":
      return <svg {...shared}><path d="M5 12h14M13 5l7 7-7 7" /></svg>;
    case "leaf":
      return <svg {...shared}><path d="M20 4c-8.5 0-14 3.7-14 10a6 6 0 0 0 6 6c6.3 0 8-8.3 8-16Z" /><path d="M4 21c3.2-4.8 7.1-7.9 12-10" /></svg>;
    case "chart":
      return <svg {...shared}><path d="M4 19V5m0 14h17M8 15l4-4 3 2 5-6" /><path d="M16 7h4v4" /></svg>;
    case "box":
      return <svg {...shared}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.4 7.7 7.6 4.4 7.6-4.4M12 12v9" /></svg>;
    case "calendar":
      return <svg {...shared}><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M7.5 3v4M16.5 3v4M4 9.5h16M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" /></svg>;
    case "menu":
      return <svg {...shared}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case "close":
      return <svg {...shared}><path d="m6 6 12 12M18 6 6 18" /></svg>;
  }
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a
      className={`brand${compact ? " brand--compact" : ""}`}
      href="#home"
      aria-label="WasteWise home"
    >
      <span className="brand__mark">
        <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
          <path d="m12.1 5.1 2.2-3.8a2 2 0 0 1 3.5.1l3 5.3h-4.3L15 9.1l-2.9-4Z" fill="currentColor" />
          <path d="M21.7 6.7 26 14h-5l-2.6-4.4 3.3-2.9Z" fill="currentColor" />
          <path d="m26 17.2 2.1 3.6a2 2 0 0 1-1.8 3h-6.1l2.1-3.7h1.8l1.9-2.9Z" fill="currentColor" />
          <path d="m19.8 23.8-8.4.1 2.6-4.4h5.1l.7 4.3Z" fill="currentColor" />
          <path d="m9 23.7-4.3-7.3 5.1-.1 2.5 4.5L9 23.7Z" fill="currentColor" />
          <path d="M5.2 13.1 3 9.5a2 2 0 0 1 1.7-3h6.2L8.8 10H7l-1.8 3.1Z" fill="currentColor" />
        </svg>
      </span>
      <span className="brand__name">waste<span>wise</span></span>
    </a>
  );
}

const navigation = [
  { label: "Home", href: "#home" },
  { label: "Platform", href: "#platform" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Our impact", href: "#impact" },
  { label: "Waste Reports", href: "#waste-reports" },
  { label: "Recommendations", href: "#recommendations" },
];

const features = [
  {
    icon: "chart" as const,
    number: "01",
    title: "Know what’s next",
    copy: "Use demand forecasts to plan stock with more confidence and fewer last-minute surprises.",
  },
  {
    icon: "calendar" as const,
    number: "02",
    title: "Act before it expires",
    copy: "See which batches need attention, while there’s still time to make a difference.",
  },
  {
    icon: "box" as const,
    number: "03",
    title: "Make stock go further",
    copy: "Bring sales, inventory and freshness into one clearer view of your day.",
  },
];

type PageName = "home" | "waste-reports" | "recommendations";

function getPageFromHash(): PageName {
  if (window.location.hash === "#waste-reports") {
    return "waste-reports";
  }

  if (window.location.hash === "#recommendations") {
    return "recommendations";
  }

  return "home";
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageName>(getPageFromHash);

  useEffect(() => {
    function handleHashChange() {
      setCurrentPage(getPageFromHash());
      setMenuOpen(false);
    }

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (!signInOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSignInOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("has-modal");

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("has-modal");
    };
  }, [signInOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  if (currentPage === "waste-reports" || currentPage === "recommendations") {
    return (
      <div className="page-shell">
        <div className="top-band" />

        <header className="site-header">
          <Brand />
          <a className="button button--small button--green" href="#home">
            Back to Home
          </a>
        </header>

        {currentPage === "waste-reports" ? (
          <WasteReports />
        ) : (
          <Recommendations />
        )}

        <div className="bottom-band" />
      </div>
    );
  }

  return (
    <>
      <div className="page-shell" id="home">
        <div className="top-band" />

        <header className="site-header">
          <Brand />

          <button
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>

          <nav
            className={`site-nav${menuOpen ? " site-nav--open" : ""}`}
            aria-label="Main navigation"
          >
            {navigation.map((item) => (
              <a href={item.href} key={item.href} onClick={closeMenu}>
                {item.label}
              </a>
            ))}

            <button
              className="button button--small button--green site-nav__sign-in"
              type="button"
              onClick={() => {
                closeMenu();
                setSignInOpen(true);
              }}
            >
              Sign in
            </button>
          </nav>
        </header>

        <main>
          <section className="hero section-wrap" aria-labelledby="hero-title">
            <div className="hero__visual">
              <div className="hero__image-frame">
                <svg
                  className="food-illustration"
                  viewBox="0 0 560 500"
                  role="img"
                  aria-label="Fresh produce and food scraps ready to be composted"
                >
                  <defs>
                    <linearGradient id="backdrop" x1="70" x2="493" y1="39" y2="474" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#e3f0d7" />
                      <stop offset="1" stopColor="#c7ddbc" />
                    </linearGradient>
                    <linearGradient id="bin" x1="173" x2="389" y1="298" y2="467" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#fff" />
                      <stop offset="1" stopColor="#e2e9dd" />
                    </linearGradient>
                    <linearGradient id="carrot" x1="210" x2="283" y1="116" y2="233" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#ffbd5b" />
                      <stop offset="1" stopColor="#ee7732" />
                    </linearGradient>
                    <filter id="shadow" x="66" y="49" width="428" height="443" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                      <feGaussianBlur stdDeviation="14" />
                    </filter>
                  </defs>

                  <rect width="560" height="500" rx="36" fill="url(#backdrop)" />
                  <circle cx="454" cy="95" r="57" fill="#d8ebc9" />
                  <circle cx="96" cy="359" r="74" fill="#d8ebc9" />
                  <ellipse cx="282" cy="441" fill="#234c31" filter="url(#shadow)" opacity=".15" rx="178" ry="19" />
                  <path d="M117 114c-14-33 21-60 49-42 17-36 66-24 68 14 34-18 65 14 48 44" fill="#3c8052" />
                  <path d="M168 94c-5-34 20-52 42-47m12 34c8-29 35-32 52-18" fill="none" stroke="#24613b" strokeLinecap="round" strokeWidth="7" />
                  <path d="M415 180c11-31 40-39 61-19m-33 27c2-25 20-39 41-34" fill="none" stroke="#5b9861" strokeLinecap="round" strokeWidth="7" />
                  <path d="M351 115c24-47 72-54 94-26-5 39-41 64-94 26Z" fill="#77a944" />
                  <path d="M356 119c24-10 48-23 70-43" fill="none" stroke="#426f37" strokeLinecap="round" strokeWidth="4" />
                  <path d="M104 213c-2-49 34-67 65-43 26-28 64-14 62 22 28-9 54 14 39 44l-29 30-106-5-31-48Z" fill="#639b51" />
                  <path d="M125 230c30-31 68-41 108-34" fill="none" stroke="#437b45" strokeLinecap="round" strokeWidth="5" />
                  <path d="M139 292h279l-29 166a20 20 0 0 1-20 17H188a20 20 0 0 1-20-17l-29-166Z" fill="url(#bin)" stroke="#d3ded0" strokeWidth="3" />
                  <path d="M152 337h253l-4 24H157l-5-24Zm7 52h238l-4 24H163l-4-24Z" fill="#e9efe6" opacity=".78" />
                  <path d="M128 281a16 16 0 0 1 16-16h249a16 16 0 0 1 16 16v31a12 12 0 0 1-12 12H140a12 12 0 0 1-12-12v-31Z" fill="#f9fcf5" stroke="#b9cbb4" strokeWidth="4" />
                  <path d="M173 278h188" stroke="#d0ddc8" strokeLinecap="round" strokeWidth="7" />
                  <path d="M185 243c15-17 32-26 52-30m129 31c-11-16-24-25-42-31" fill="none" stroke="#f4f0dc" strokeLinecap="round" strokeWidth="13" />
                  <path d="M208 206c18-42 41-63 70-64 25-1 43 19 53 51-16 28-40 47-71 48-24 0-41-12-52-35Z" fill="#f1d66a" />
                  <path d="M225 201c29 7 56 6 83-2" fill="none" stroke="#c7a83d" strokeLinecap="round" strokeWidth="5" />
                  <path d="M269 182c11 4 20 11 26 22m-53-4c7-3 13-2 19 2" fill="none" stroke="#f9e69c" strokeLinecap="round" strokeWidth="6" />
                  <path d="M200 190c-21-17-34-37-38-60m16 55c3-22 14-40 34-55" fill="none" stroke="#699548" strokeLinecap="round" strokeWidth="9" />
                  <path d="M162 116c-22-23-18-45-1-55 24 2 38 18 38 47-14 9-26 12-37 8Z" fill="#74a74d" />
                  <path d="M160 117c11-15 21-27 34-39" fill="none" stroke="#4c7b3d" strokeLinecap="round" strokeWidth="4" />
                  <path d="M317 181c8-30 28-50 58-61 20 19 18 42-3 68-23 5-41 2-55-7Z" fill="url(#carrot)" />
                  <path d="M326 170c18-13 31-27 43-43m-29 55 32-26m-12-20 8-8" fill="none" stroke="#e06b32" strokeLinecap="round" strokeWidth="5" />
                  <path d="M367 121c-2-20 7-32 25-35m-17 37c9-18 23-23 39-18" fill="none" stroke="#57934f" strokeLinecap="round" strokeWidth="7" />
                  <circle cx="236" cy="176" r="18" fill="#f4f0de" />
                  <circle cx="239" cy="173" r="8" fill="#d8d2bc" />
                  <path d="M294 229c11-10 23-12 34-5-1 14-10 21-26 21l-8-16Z" fill="#d7a179" />
                  <path d="M249 229c-9-8-20-8-29 0 0 12 8 18 21 17l8-17Z" fill="#edaa49" />
                  <path d="M209 266c-10-22-7-41 11-57m-5 53c-2-22 6-38 25-50" fill="none" stroke="#68994c" strokeLinecap="round" strokeWidth="7" />
                  <path d="M215 207c-20-18-19-36-3-47 20 3 31 18 27 42-10 7-18 9-24 5Z" fill="#7ca84b" />
                  <path d="M214 207c7-14 15-24 26-34" fill="none" stroke="#4c7a3b" strokeLinecap="round" strokeWidth="4" />
                  <path d="M413 264c16-26 37-33 62-19-1 26-17 42-47 48-12-10-17-20-15-29Z" fill="#8cb65a" />
                  <path d="M419 285c15-14 31-24 50-32" fill="none" stroke="#5f9146" strokeLinecap="round" strokeWidth="4" />
                  <path d="M117 131c7-10 16-13 27-9m-24 236c11-7 20-7 29 0m322-72c10-8 20-8 29-1" fill="none" stroke="#93b678" strokeLinecap="round" strokeWidth="5" />
                  <circle cx="92" cy="155" r="5" fill="#80a95b" />
                  <circle cx="470" cy="371" r="5" fill="#80a95b" />
                  <circle cx="435" cy="133" r="4" fill="#80a95b" />
                </svg>

                <span className="hero__image-label">
                  <span className="hero__label-icon"><Icon name="leaf" /></span>
                  Better choices, fresher food
                </span>
              </div>

              <span className="hero__decor hero__decor--left" aria-hidden="true">✳</span>
              <span className="hero__decor hero__decor--right" aria-hidden="true">✳</span>
            </div>

            <div className="hero__content">
              <span className="eyebrow"><span className="eyebrow__dot" /> A smarter way to manage food</span>
              <h1 id="hero-title">Reduce food<br /><span>waste.</span></h1>
              <p className="hero__copy">
                Fresh thinking for a less wasteful world. WasteWise helps you see what you have,
                what you need and what to use next.
              </p>

              <div className="hero__actions">
                <a className="button button--green" href="#workspace">
                  Explore the platform <Icon name="arrow" />
                </a>
                <a className="text-link" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a>
              </div>

              <div className="hero__note">
                <span className="hero__avatars" aria-hidden="true"><span>F</span><span>W</span><span>+</span></span>
                <span>Good for your shelves.<br /><strong>Even better for the planet.</strong></span>
              </div>
            </div>
          </section>

          <DashboardPreview />

          <section className="values-strip" aria-label="Our approach">
            <p><Icon name="leaf" /> Less waste, more good</p>
            <span className="values-strip__line" />
            <p><Icon name="chart" /> Decisions backed by data</p>
            <span className="values-strip__line" />
            <p><Icon name="box" /> Fresher stock, smarter flow</p>
          </section>

          <section className="platform section-wrap" id="platform">
            <div className="section-heading">
              <div>
                <span className="eyebrow">A little insight goes a long way</span>
                <h2>Less guesswork.<br /><span>More good food.</span></h2>
              </div>
              <p>
                The right view at the right moment can change what happens to every item on your
                shelves. WasteWise brings the details together so your next move feels clear.
              </p>
            </div>

            <div className="feature-grid">
              {features.map((feature) => (
                <article className="feature-card" key={feature.number}>
                  <div className="feature-card__top">
                    <span className="feature-card__icon"><Icon name={feature.icon} /></span>
                    <span className="feature-card__number">{feature.number}</span>
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.copy}</p>
                  <a href="#how-it-works" aria-label={`Learn how ${feature.title.toLowerCase()} works`}>
                    <Icon name="arrow" />
                  </a>
                </article>
              ))}
            </div>
          </section>

          <section className="how-section" id="how-it-works">
            <div className="how-section__inner">
              <div className="how-section__visual" aria-hidden="true">
                <div className="orbit orbit--one" />
                <div className="orbit orbit--two" />
                <div className="orbit orbit--three" />
                <div className="how-section__leaf how-section__leaf--one"><Icon name="leaf" /></div>
                <div className="how-section__leaf how-section__leaf--two"><Icon name="chart" /></div>
                <div className="how-section__center"><Brand compact /></div>
              </div>

              <div className="how-section__content">
                <span className="eyebrow">Simple steps, meaningful change</span>
                <h2>Small shifts.<br /><span>Lasting impact.</span></h2>
                <p>
                  Start with the information you already have. WasteWise turns everyday sales
                  and inventory signals into a clearer picture of what to stock, watch and use.
                </p>

                <ol className="steps-list">
                  <li><span>01</span><div><strong>Bring your data together</strong><p>Sales, stock and product details in one place.</p></div></li>
                  <li><span>02</span><div><strong>Spot what needs attention</strong><p>Understand demand patterns and freshness risk.</p></div></li>
                  <li><span>03</span><div><strong>Make your next move count</strong><p>Use practical insights to make better daily choices.</p></div></li>
                </ol>
              </div>
            </div>
          </section>

          <section className="impact section-wrap" id="impact">
            <div className="impact__mark"><Icon name="leaf" /></div>
            <div>
              <span className="eyebrow">A better kind of tomorrow</span>
              <h2>Good food belongs<br />on <span>someone’s table.</span></h2>
            </div>
            <p>
              We’re building tools to help food businesses make thoughtful decisions, get more
              from what they stock and keep good food in circulation.
            </p>
            <a className="button button--light" href="#home">Back to the top <Icon name="arrow" /></a>
          </section>
        </main>

        <footer className="site-footer">
          <Brand compact />
          <p>Thoughtful food management, one decision at a time.</p>
          <nav aria-label="Footer navigation">
            <a href="#platform">Platform</a>
            <a href="#how-it-works">How it works</a>
            <a href="#impact">Our impact</a>
            <a href="#waste-reports">Waste Reports</a>
            <a href="#recommendations">Recommendations</a>
          </nav>
          <span className="site-footer__copyright">© 2026 WasteWise</span>
        </footer>

        <div className="bottom-band" />
      </div>

      {signInOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSignInOpen(false);
          }}
        >
          <section
            className="sign-in-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sign-in-title"
          >
            <button
              className="sign-in-modal__close"
              type="button"
              aria-label="Close sign-in message"
              onClick={() => setSignInOpen(false)}
            >
              <Icon name="close" />
            </button>

            <span className="sign-in-modal__icon"><Icon name="leaf" /></span>
            <span className="eyebrow">Welcome to WasteWise</span>
            <h2 id="sign-in-title">Your smarter<br />food journey starts here.</h2>
            <p>
              Sign-in isn’t connected in this preview yet. The WasteWise experience is ready
              to connect to your account when authentication is set up.
            </p>

            <button
              className="button button--green sign-in-modal__button"
              type="button"
              onClick={() => setSignInOpen(false)}
            >
              Got it <Icon name="arrow" />
            </button>
          </section>
        </div>
      )}
    </>
  );
}

export default App;
