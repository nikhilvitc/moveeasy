import { useRef, useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, animate } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import yatharthImg from '../assets/images/yatharth.png';
import amanImg from '../assets/images/aman.png';
import cityBgImg from '../assets/images/city-bg.png';
import roomImg from '../assets/images/Cozy_modern_living_room.png';
import consultantImg from '../assets/images/guarentee-consultant.png';
import './About.css';

const EASE = [0.22, 1, 0.36, 1];

const MARQUEE = [
  'IIT Kanpur Alumni', '300+ Verified Brokers', 'Zero Brokerage Drama',
  'Dedicated Rep for Every Move', 'Bangalore Specialists', "We've Been There",
  'Your Move, Our Mission', 'BCG → MovEazy', 'No Cold Calls. Ever.',
];

const CHAPTERS = [
  {
    num: '01',
    label: 'The Beginning',
    short: 'Your IIT K seniors',
    headingParts: [
      { text: "Hey. We’re your ", em: false },
      { text: 'IIT Kanpur', em: true },
      { text: ' seniors.', em: false },
    ],
    heading: <>Hey. We're your <em>IIT Kanpur</em> seniors.</>,
    body: "Yatharth and Aman — alumni of IIT Kanpur — who landed corporate jobs and were completely pumped about moving to Mumbai. Not investors. Not some faceless startup. If you're at IIT or NIT right now, you know this feeling. Placement done. City decided. A new chapter begins.",
    tag: 'IIT Kanpur · Class of 2024',
  },
  {
    num: '02',
    label: 'The Problem',
    short: 'The flat hunt',
    headingParts: [
      { text: 'Then came the ', em: false },
      { text: 'flat hunt.', em: true },
      { text: ' Week 1… Week 4…', em: false },
    ],
    heading: <>Then came the <em>flat hunt.</em> Week 1… Week 4…</>,
    body: 'We hit every "No Brokerage" platform — they sold plans, not properties. Joined Facebook groups full of chaos. Called brokers who wanted to close their deal, not find our home. Over a month. Still no flat. Token amounts that vanished. Listings that were never real.',
    tag: '32 days. Zero results.',
  },
  {
    num: '03',
    label: 'The Realization',
    short: 'System was broken',
    headingParts: [
      { text: 'The system was ', em: false },
      { text: 'broken.', em: true },
      { text: ' Not just bad luck.', em: false },
    ],
    heading: <>The system was <em>broken.</em> Not just bad luck.</>,
    body: "It wasn't us. The entire rental ecosystem was fragmented. Brokers push their inventory. Platforms sell subscriptions. Nobody's actually working for you. No trust. No accountability. No one in your corner — and this is what everyone moving to a new city faces.",
    tag: 'A systemic failure',
  },
  {
    num: '04',
    label: 'The Decision',
    short: 'Left BCG',
    headingParts: [
      { text: 'We left ', em: false },
      { text: 'BCG.', em: true },
      { text: ' Packed our bags. Moved to ', em: false },
      { text: 'Bangalore.', em: true },
    ],
    heading: <>We left <em>BCG.</em> Packed our bags. Moved to <em>Bangalore.</em></>,
    body: 'Yatharth was at Boston Consulting Group. Aman was building at a startup. Comfortable lives. But the problem stayed with us — every conversation, every WhatsApp about someone scammed. After a year of planning, we left our comfort zones to build the thing that should have already existed.',
    tag: 'BCG → MovEazy',
  },
  {
    num: '05',
    label: 'The Solution',
    short: '300+ brokers',
    headingParts: [
      { text: "300+ vetted brokers. One rep who’s ", em: false },
      { text: 'actually yours.', em: true },
    ],
    heading: <>300+ vetted brokers. One rep who's <em>actually yours.</em></>,
    body: "We built a network of 300+ verified brokers across Bangalore. But here's the difference: your dedicated MovEazy rep understands your commute, budget, lifestyle — then works the network for you. No cold calls. No random listings. Properties curated around your life.",
    tag: 'Relocation-first. Always.',
  },
];

const TESTIMONIALS = [
  { init: 'R', name: 'Rohan Mehta', role: 'SWE @ Zepto', college: 'IIT Bombay · 2024', text: 'Got my flat in Koramangala in 8 days. My rep WhatsApped me shortlists every morning based on my commute. Zero chaos, zero brokerage drama. 10/10.', stars: 5 },
  { init: 'P', name: 'Priya Sharma', role: 'Analyst @ McKinsey', college: 'IIT Delhi · 2024', text: 'I was in Delhi, moving to Bangalore in 3 weeks with zero local knowledge. My rep did 12 virtual tours before I even landed. Moved in on Day 2.', stars: 5 },
  { init: 'A', name: 'Arjun Nair', role: 'PM @ Swiggy', college: 'NIT Trichy · 2023', text: "The honesty got me. My rep told me straight up when a landlord was unreliable. That saves weeks of pain. Feel like I have a senior actually looking out for me.", stars: 5 },
  { init: 'S', name: 'Sneha Iyer', role: 'Consultant @ Deloitte', college: 'IIT Madras · 2024', text: 'Yatharth personally explained HSR vs Indiranagar vs Whitefield for my commute to Bellandur. No other platform does that. This is what I needed.', stars: 5 },
  { init: 'K', name: 'Karan Gupta', role: 'Engineer @ Google', college: 'IIT Kanpur · 2023', text: 'Only platform where someone picked up at 11pm to answer my panicked question about a rental agreement clause. Absolute legends.', stars: 5 },
  { init: 'N', name: 'Nidhi Rao', role: 'FAANG SDE', college: 'NIT Surathkal · 2024', text: 'Moved from Hyderabad with no Bangalore network. My rep shortlisted, negotiated rent down ₹3k/month, and told me exactly what to check during inspection.', stars: 5 },
];

/* ─── Shared helpers ──────────────────────────────────────────────────── */

function TiltCard({ children, className = '' }) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, op: 0 });

  const onMove = useCallback((e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const cx = (e.clientX - r.left) / r.width;
    const cy = (e.clientY - r.top) / r.height;
    setTilt({ x: (cy - 0.5) * -10, y: (cx - 0.5) * 10 });
    setGlare({ x: cx * 100, y: cy * 100, op: 0.09 });
  }, []);

  const onLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setGlare({ x: 50, y: 50, op: 0 });
  }, []);

  return (
    <div
      ref={ref}
      className={`abt-tilt ${className}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transition: 'transform 0.12s ease' }}
    >
      {children}
      <div className="abt-glare" style={{ background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.op}), transparent 60%)` }} />
    </div>
  );
}

function Counter({ to, suffix = '' }) {
  const [ref, inView] = useInView({ threshold: 0.5, triggerOnce: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.2, ease: 'easeOut', onUpdate: (v) => setVal(Math.round(v)) });
    return () => c.stop();
  }, [inView, to]);
  return <span ref={ref}>{val}{suffix && <em className="abt-stat-suf">{suffix}</em>}</span>;
}

function FadeUp({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.65, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Journey chart ─────────────────────────────────────────────────── */
const GREEN = '#22C55E';
const VIEWW = 1000;
const VIEWH = 415;
const LW = 126; // label card width
const LH = 33;  // label card height
const LC = 40;  // connector length

const WITH_PTS = [
  { x: 100, y: 148, label: 'Rep assigned, Day 1', above: true,  showLabel: true  },
  { x: 268, y: 125, label: 'Shortlist in 2 days',  above: true,  showLabel: false },
  { x: 440, y: 106, label: '3 curated visits',      above: true,  showLabel: false },
  { x: 610, y: 94,  label: 'Offer accepted',         above: true,  showLabel: true  },
  { x: 775, y: 86,  label: 'Move-in day ✓',          above: true,  showLabel: false },
  { x: 900, y: 82,  label: 'Home sweet home',        above: true,  showLabel: true  },
];

const WITHOUT_PTS = [
  { x: 100, y: 230, label: 'Start searching...',    above: false, showLabel: true  },
  { x: 210, y: 258, label: 'Find a broker...',       above: false, showLabel: false },
  { x: 335, y: 148, label: 'Found something!',       above: true,  showLabel: false },
  { x: 460, y: 328, label: 'Token scam. Ghosted.',   above: false, showLabel: true  },
  { x: 555, y: 232, label: 'New broker...',           above: false, showLabel: false },
  { x: 658, y: 272, label: 'Fake listing',            above: false, showLabel: true  },
  { x: 756, y: 162, label: 'Okay, this time!',       above: true,  showLabel: false },
  { x: 852, y: 308, label: 'Hidden charges...',      above: false, showLabel: false },
  { x: 900, y: 328, label: 'And, still searching',   above: false, showLabel: true  },
];

function makeSmoothPath(pts) {
  if (pts.length < 2) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 2)];
    const p1 = pts[i - 1];
    const p2 = pts[i];
    const p3 = pts[Math.min(pts.length - 1, i + 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function ChartLabel({ pt, color, delay, inView, textFill = 'rgba(20,20,20,0.75)' }) {
  const rx  = Math.max(8, Math.min(pt.x - LW / 2, VIEWW - LW - 8));
  const ry  = pt.above ? pt.y - LC - LH : pt.y + LC;
  const cy1 = pt.above ? ry + LH + 2 : pt.y + 5;
  const cy2 = pt.above ? pt.y - 5    : ry - 2;
  return (
    <motion.g initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay, duration: 0.38 }}>
      <line x1={pt.x} y1={cy1} x2={pt.x} y2={cy2} stroke={color} strokeWidth="1.5" strokeDasharray="3 2.5" opacity="0.45" />
      <rect x={rx} y={ry} width={LW} height={LH} rx="8" fill="#fff" stroke={`${color}50`} strokeWidth="1"
        style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.08))' }} />
      <text x={rx + LW / 2} y={ry + LH * 0.65} textAnchor="middle"
        fill={textFill} fontSize="10.5" fontWeight="500" fontFamily="Sora, system-ui, sans-serif">
        {pt.label}
      </text>
    </motion.g>
  );
}

function ChartDot({ pt, color, delay, inView }) {
  return (
    <motion.circle cx={pt.x} cy={pt.y} r={5.5} fill={color}
      initial={{ opacity: 0 }} animate={inView ? { opacity: 0.9 } : {}}
      transition={{ delay, duration: 0.3 }} />
  );
}

function JourneyChart() {
  const [ref, inView] = useInView({ threshold: 0.18, triggerOnce: true });
  const DD = 10;

  return (
    <div ref={ref} className="abt-jc-wrap">
      <svg viewBox={`0 0 ${VIEWW} ${VIEWH}`} preserveAspectRatio="xMidYMid meet" className="abt-jc-svg">
          <defs>
            <clipPath id="jc-cy"><circle cx={900} cy={82}  r={30} /></clipPath>
            <clipPath id="jc-ca"><circle cx={900} cy={328} r={30} /></clipPath>
            <linearGradient id="jc-gfill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={GREEN} stopOpacity="0.14" />
              <stop offset="100%" stopColor={GREEN} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid */}
          {[80, 160, 240, 320].map(y => (
            <line key={y} x1="60" y1={y} x2="960" y2={y} stroke="rgba(0,0,0,0.055)" strokeWidth="1" />
          ))}

          {/* Green fill area */}
          <motion.path
            d={`${makeSmoothPath(WITH_PTS)} L 900 ${VIEWH} L 100 ${VIEWH} Z`}
            fill="url(#jc-gfill)"
            initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.5, duration: 2 }}
          />

          {/* With MovEazy line */}
          <motion.path d={makeSmoothPath(WITH_PTS)} stroke={GREEN} strokeWidth="2.8" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={inView ? { pathLength: 1 } : {}}
            transition={{ duration: DD, ease: [0.4, 0, 0.2, 1], delay: 0.2 }} />

          {/* Without MovEazy line */}
          <motion.path d={makeSmoothPath(WITHOUT_PTS)} stroke="#E8321A" strokeWidth="2.8" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={inView ? { pathLength: 1 } : {}}
            transition={{ duration: DD, ease: [0.4, 0, 0.2, 1], delay: 0.55 }} />

          {/* Dots — only on labelled points */}
          {WITH_PTS.filter(pt => pt.showLabel).map((pt, i) => (
            <ChartDot key={i} pt={pt} color={GREEN}
              delay={0.2 + (WITH_PTS.indexOf(pt) / (WITH_PTS.length - 1)) * DD} inView={inView} />
          ))}
          {WITHOUT_PTS.filter(pt => pt.showLabel).map((pt, i) => (
            <ChartDot key={i} pt={pt} color="#E8321A"
              delay={0.55 + (WITHOUT_PTS.indexOf(pt) / (WITHOUT_PTS.length - 1)) * DD} inView={inView} />
          ))}

          {/* Labels — reduced to key moments */}
          {WITH_PTS.filter(pt => pt.showLabel).map((pt, i) => (
            <ChartLabel key={i} pt={pt} color={GREEN}
              delay={0.35 + (WITH_PTS.indexOf(pt) / (WITH_PTS.length - 1)) * DD} inView={inView} />
          ))}
          {WITHOUT_PTS.filter(pt => pt.showLabel).map((pt, i) => (
            <ChartLabel key={i} pt={pt} color="#E8321A"
              delay={0.75 + (WITHOUT_PTS.indexOf(pt) / (WITHOUT_PTS.length - 1)) * DD} inView={inView} />
          ))}

          {/* Yatharth photo — happy end */}
          <motion.g initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: DD + 0.3, duration: 0.5 }}>
            <circle cx={900} cy={82} r={33} fill="#111" stroke={GREEN} strokeWidth="2.5" />
            <image href={yatharthImg} x={870} y={52} width="60" height="60" clipPath="url(#jc-cy)" preserveAspectRatio="xMidYMid slice" />
          </motion.g>

          {/* Aman photo — stressed end */}
          <motion.g initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: DD + 0.5, duration: 0.5 }}>
            <circle cx={900} cy={328} r={33} fill="#111" stroke="#E8321A" strokeWidth="2.5" />
            <image href={amanImg} x={870} y={298} width="60" height="60" clipPath="url(#jc-ca)" preserveAspectRatio="xMidYMid slice" />
            <circle cx={900} cy={328} r={33} fill="rgba(232,50,26,0.22)" />
          </motion.g>
        </svg>
    </div>
  );
}

/* ─── Chapter block ──────────────────────────────────────────────────── */
function ChapterBlock({ ch, i }) {
  const isEven = i % 2 === 0;
  const [ref, inView] = useInView({ threshold: 0.12, triggerOnce: true });
  return (
    <div className={`abt-ch ${isEven ? 'abt-ch-even' : 'abt-ch-odd'}`}>
      <div className="abt-ch-watermark">{ch.num}</div>
      <motion.div
        ref={ref}
        className="abt-ch-card"
        initial={{ opacity: 0, x: isEven ? -48 : 48 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <span className="abt-eye">{ch.label}</span>
        <h3 className="abt-ch-h">{ch.heading}</h3>
        <p className="abt-ch-body">{ch.body}</p>
        <span className="abt-ch-tag">{ch.tag}</span>
      </motion.div>
    </div>
  );
}

/* ─── Word-by-word reveal (body only) ────────────────────────────── */
function WordReveal({ text, progress }) {
  const words = text.split(' ');
  const n = words.length;
  return (
    <p className="abt-sb">
      {words.map((word, i) => {
        const lit = Math.max(0, Math.min(1, progress * (n + 4) - i));
        return (
          <span key={i} style={{ color: `rgba(26,20,16,${(0.22 + lit * 0.78).toFixed(2)})` }}>
            {word}{i < n - 1 ? ' ' : ''}
          </span>
        );
      })}
    </p>
  );
}

/* ─── Curtain opener ─────────────────────────────────────────────── */
function CurtainOpener() {
  const wrapRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ['start start', 'end start'],
  });

  const leftX  = useTransform(scrollYProgress, [0, 1], ['0%', '-100%']);
  const rightX = useTransform(scrollYProgress, [0, 1], ['0%',  '100%']);

  return (
    <div ref={wrapRef} className="abt-curtain-wrap">
      <div className="abt-curtain-sticky">
        <motion.div className="abt-curtain-panel abt-curtain-left" style={{ x: leftX }}>
          <img src="/opener1.png" alt="" draggable={false} />
        </motion.div>
        <motion.div className="abt-curtain-panel abt-curtain-right" style={{ x: rightX }}>
          <img src="/opener2.jpg" alt="" draggable={false} />
        </motion.div>
      </div>
    </div>
  );
}

/* ─── Story section (sticky scroll) ─────────────────────────────── */
function StorySection() {
  const wrapRef = useRef(null);
  const spacerRefs = useRef([]);
  const [activeChapter, setActiveChapter] = useState(0);
  const [chapterProgress, setChapterProgress] = useState(0);
  const [pbWidth, setPbWidth] = useState(0);
  const dirRef = useRef(1);    // 1 = scrolling forward, -1 = scrolling back
  const prevChRef = useRef(0);

  useEffect(() => {
    const tick = () => {
      const mid = window.innerHeight * 0.5;
      let ch = 0;
      let prog = 0;

      for (let i = CHAPTERS.length - 1; i >= 0; i--) {
        const el = spacerRefs.current[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= mid) {
          ch = i;
          prog = Math.max(0, Math.min(1, (mid - r.top) / r.height));
          break;
        }
      }

      if (ch === 0) {
        const el0 = spacerRefs.current[0];
        if (el0) {
          const r0 = el0.getBoundingClientRect();
          if (r0.top > mid) {
            prog = Math.max(0, 1 - (r0.top - mid) / (window.innerHeight - mid));
          }
        }
      }

      if (ch !== prevChRef.current) {
        dirRef.current = ch > prevChRef.current ? 1 : -1;
        prevChRef.current = ch;
      }

      setActiveChapter(ch);
      setChapterProgress(prog);

      const wrap = wrapRef.current;
      if (wrap) {
        const rect = wrap.getBoundingClientRect();
        const scrolled = Math.max(0, -rect.top);
        const total = wrap.offsetHeight - window.innerHeight;
        setPbWidth(total > 0 ? Math.min(100, (scrolled / total) * 100) : 0);
      }
    };
    window.addEventListener('scroll', tick, { passive: true });
    tick();
    return () => window.removeEventListener('scroll', tick);
  }, []);

  const ch = CHAPTERS[activeChapter];
  const dir = dirRef.current;

  return (
    <div className="abt-story-wrap" ref={wrapRef}>
      <div className="abt-story-pb" style={{ width: `${pbWidth}%` }} />

      <div className="abt-sticky-stage">
        <div className="abt-story-col">
          {/* Giant faded chapter number watermark */}
          <motion.span
            key={`wm-${activeChapter}`}
            className="abt-story-watermark"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            aria-hidden="true"
          >
            {ch.num}
          </motion.span>

          {/* Heading — slides in from below (forward) or above (back) */}
          <motion.div
            key={activeChapter}
            initial={{ opacity: 0, y: dir * 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            style={{ position: 'relative', zIndex: 1 }}
          >
            <p className="abt-sn">Chapter {ch.num}</p>
            <h2 className="abt-sh">{ch.heading}</h2>
          </motion.div>

          {/* Body — word-by-word colour reveal on scroll */}
          <WordReveal text={ch.body} progress={chapterProgress} />
          <span className="abt-ch-tag" style={{ position: 'relative', zIndex: 1 }}>{ch.tag}</span>
        </div>
      </div>

      {CHAPTERS.map((_, i) => (
        <div key={i} className="abt-ch-spacer" ref={el => { spacerRefs.current[i] = el; }} />
      ))}
    </div>
  );
}

/* Cards spread to 6 positions (2×3 grid) — x gap must exceed card width (340px) */
const SPREAD_POS = [
  { x: -390, y: -285 }, // top-left
  { x:    0, y: -335 }, // top-center
  { x:  390, y: -285 }, // top-right
  { x: -390, y:  285 }, // bottom-left
  { x:    0, y:  335 }, // bottom-center
  { x:  390, y:  285 }, // bottom-right
];
const CARD_ROTS  = [-1, 0, 1, 1, 0, -1];
const DECK_ROTS  = [9, -6, 3, -11, 7, -4];

const SOLUTION_ITEMS = [
  { num: '01', heading: <>Your rep. Not a broker's.</>, desc: "One dedicated person handles your entire search — shortlisting, visits, negotiations. They work for you, not for a commission from the landlord.", tag: 'Assigned Day 1' },
  { num: '02', heading: <>Every listing <em>vetted</em> before you see it.</>, desc: "No fake photos, no token traps. We physically verify each flat and confirm availability — so you never waste a Sunday on a ghost listing.", tag: '₹0 Token Losses' },
  { num: '03', heading: <>Shortlisted around your commute, not a pin.</>, desc: "We filter by your actual travel time to office — not crow-flight distance. Metro routes, traffic patterns, your hours.", tag: 'Commute-First' },
  { num: '04', heading: <>Reachable on WhatsApp. Even at 11pm.</>, desc: "Your rep picks up calls, replies to messages, and keeps you updated — not a chatbot, not a ticketing queue.", tag: 'Always On' },
];

/* ─── Animated checkbox ─────────────────────────────────────────────── */
function AnimatedCheckbox({ inView, delay }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" className="abt-sol-cb" fill="none">
      <motion.path
        d="M 2 2 L 20 2 L 20 20 L 2 20 Z"
        stroke="rgba(26,20,16,0.35)"
        strokeWidth="1.5"
        strokeLinejoin="miter"
        initial={{ pathLength: 0 }}
        animate={inView ? { pathLength: 1 } : {}}
        transition={{ delay, duration: 0.75, ease: [0.4, 0, 0.2, 1] }}
      />
    </svg>
  );
}

/* ─── Solution row ───────────────────────────────────────────────────── */
function SolutionRow({ item, i, inView }) {
  return (
    <div className="abt-sol-row-wrap">
      <motion.div
        className="abt-sol-row"
        initial={{ opacity: 0, y: 28 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: i * 0.13 + 0.25, ease: EASE }}
      >
        <span className="abt-sol-num">{item.num}</span>
        <div className="abt-sol-content">
          <h3 className="abt-sol-item-h">{item.heading}</h3>
          <p className="abt-sol-item-desc">{item.desc}</p>
          <span className="abt-sol-item-tag">{item.tag}</span>
        </div>
      </motion.div>
      <motion.div
        className="abt-sol-divider"
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        style={{ transformOrigin: 'left' }}
        transition={{ duration: 0.55, delay: i * 0.13 + 0.2, ease: EASE }}
      />
    </div>
  );
}

/* ─── Solution section ───────────────────────────────────────────────── */
function SolutionSection() {
  const [ref, inView] = useInView({ threshold: 0.05, triggerOnce: true });
  const solVideoRef = useRef(null);
  useEffect(() => {
    if (solVideoRef.current) solVideoRef.current.playbackRate = 1.5;
  }, []);

  return (
    <section className="abt-solution" ref={ref}>
      <video
        ref={solVideoRef}
        className="abt-sol-video"
        src="/video_flat.mp4"
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="abt-sol-overlay" />

      <div className="abt-sol-inner">
        <motion.div
          className="abt-sol-head"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <span className="abt-eye abt-sol-eye">What we actually do</span>
          <h2 className="abt-sol-main-h">Everything broken about rentals? <em>Fixed.</em></h2>
        </motion.div>

        <motion.div
          className="abt-sol-top-divider"
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          style={{ transformOrigin: 'left' }}
          transition={{ duration: 0.55, delay: 0.15, ease: EASE }}
        />

        <div className="abt-sol-list">
          {SOLUTION_ITEMS.map((item, i) => (
            <SolutionRow key={i} item={item} i={i} inView={inView} />
          ))}
        </div>

      </div>
    </section>
  );
}

/* ─── Testimonial card ───────────────────────────────────────────────── */
function TestiCard({ t, expanded = false }) {
  const [firstName, ...rest] = t.name.split(' ');
  const lastName = rest.join(' ');
  return (
    <motion.div
      className="abt-tcard"
      animate={{
        backgroundColor: expanded ? '#ffffff' : '#1C1C1E',
        borderColor:     expanded ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)',
      }}
      transition={{ duration: 0.4 }}
    >
      <div className="abt-tcard-toprow">
        <span className="abt-tcard-dot"
          style={{ background: expanded ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.25)' }} />
        <span className="abt-tcard-arrowbtn">↗</span>
      </div>
      <div className="abt-tcard-namewrap">
        <motion.span className="abt-tcard-fname"
          animate={{ color: expanded ? 'rgba(12,12,12,0.38)' : 'rgba(255,255,255,0.4)' }}
          transition={{ duration: 0.35 }}>{firstName}</motion.span>
        <motion.span className="abt-tcard-lname"
          animate={{ color: expanded ? '#0C0C0C' : '#ffffff' }}
          transition={{ duration: 0.35 }}>{lastName}</motion.span>
      </div>
      <motion.p className="abt-tcard-review"
        animate={{
          color:     expanded ? 'rgba(12,12,12,0.6)' : 'rgba(255,255,255,0.38)',
          maxHeight: expanded ? 300 : 72,
        }}
        transition={{ duration: 0.45 }}
        style={{ overflow: 'hidden', margin: 0 }}
      >"{t.text}"</motion.p>
      <motion.span className="abt-tcard-roletxt"
        animate={{ color: expanded ? 'rgba(12,12,12,0.38)' : 'rgba(255,255,255,0.32)' }}
        transition={{ duration: 0.35 }}>{t.role}</motion.span>
      <div className="abt-tcard-pills">
        <motion.span className="abt-tcard-pill"
          animate={{ borderColor: expanded ? 'rgba(12,12,12,0.18)' : 'rgba(255,255,255,0.16)', color: expanded ? 'rgba(12,12,12,0.5)' : 'rgba(255,255,255,0.48)' }}
          transition={{ duration: 0.35 }}>{t.college.split('·')[0].trim()}</motion.span>
        <motion.span className="abt-tcard-pill"
          animate={{ borderColor: expanded ? 'rgba(12,12,12,0.18)' : 'rgba(255,255,255,0.16)', color: expanded ? 'rgba(12,12,12,0.5)' : 'rgba(255,255,255,0.48)' }}
          transition={{ duration: 0.35 }}>{'★'.repeat(t.stars)}</motion.span>
      </div>
    </motion.div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function About() {
  const heroRef = useRef(null);
  const videoRef = useRef(null);
  const chartRef = useRef(null);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  const heroOp = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  const { scrollYProgress: chartScroll } = useScroll({ target: chartRef, offset: ['start end', 'end start'] });
  const chartY = useTransform(chartScroll, [0, 1], ['40px', '-40px']);
  const [tcExpanded, setTcExpanded] = useState(false);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = 0.6;
  }, []);

  return (
    <div className="abt-page">
      <Navbar />

      {/* ══ 1. HERO ══════════════════════════════════════════════ */}
      <section className="abt-hero" ref={heroRef}>
        {/* Full-bleed video background */}
        <video
          ref={videoRef}
          className="abt-hero-video"
          src="/models/about_video.mp4"
          autoPlay
          muted
          playsInline
          onEnded={(e) => e.target.pause()}
        />
        {/* Layered overlays */}
        <div className="abt-hero-overlay" />
        <div className="abt-hero-glow" />

        {/* Content */}
        <motion.div className="abt-hero-content" style={{ y: heroY, opacity: heroOp }}>
          <motion.h1 className="abt-hero-h1" initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.78, delay: 0.12, ease: EASE }}>
            We didn't<br />build this<br />for <em>everyone.</em>
          </motion.h1>

          <motion.p className="abt-hero-sub" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3, ease: EASE }}>
            Two IIT Kanpur seniors who spent a month hunting flats in Mumbai — and came back with a mission.
          </motion.p>

          <motion.div className="abt-hero-btns" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.45, ease: EASE }}>
            <Link className="abt-btn-red" to="/contact">Talk to us</Link>
            <Link className="abt-btn-outline" to="/map">Browse Listings</Link>
          </motion.div>

          <motion.div className="abt-hero-iit-tag" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
            IIT Kanpur · Class of 2024
          </motion.div>
        </motion.div>

        {/* Floating stats row at bottom */}
        <motion.div
          className="abt-hero-stats-row"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9, ease: EASE }}
        >
          {[
            { val: '300+', label: 'Verified Brokers' },
            { val: '8 days', label: 'Avg. time to move in' },
            { val: '100%', label: 'Dedicated rep' },
          ].map((s) => (
            <div key={s.label} className="abt-hero-stat-pill">
              <span className="abt-hero-stat-val">{s.val}</span>
              <span className="abt-hero-stat-lbl">{s.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          className="abt-hero-scroll-cue"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 4v12M4 10l6 6 6-6" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </section>

      {/* ══ 5. JOURNEY CHART ════════════════════════════════════ */}
      <section className="abt-jc-sec">
        <div className="abt-jc-top">
          <motion.div
            className="abt-jc-side"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <span className="abt-jc-with-label">WITH MOVEAZY</span>
            <p className="abt-jc-side-h" style={{ color: GREEN }}>Smooth. Fast. Zero drama.</p>
          </motion.div>

          <motion.div
            className="abt-jc-vs"
            initial={{ opacity: 0, scale: 0.7 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
          >
            vs
          </motion.div>

          <motion.div
            className="abt-jc-side abt-jc-side-r"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <span className="abt-jc-with-label">WITHOUT MOVEAZY</span>
            <p className="abt-jc-side-h" style={{ color: '#E8321A' }}>Chaotic. Costly. Soul-crushing.</p>
          </motion.div>
        </div>

        <motion.p
          className="abt-jc-caption"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          Your flat-finding journey — visualised.
        </motion.p>

        <motion.div ref={chartRef} style={{ y: chartY }}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <JourneyChart />
        </motion.div>
      </section>

      {/* ══ 6. SOLUTION ══════════════════════════════════════════ */}
      <SolutionSection />

      {/* ══ 6b. CURTAIN OPENER → STORY ══════════════════════════ */}
      <CurtainOpener />
      <StorySection />

      {/* ══ 7. TESTIMONIALS ══════════════════════════════════════ */}
      <section className="abt-testimonials">
        <div className="abt-testi-inner">
          {/* Header row */}
          <div className="abt-testi-hrow">
            <FadeUp>
              <span className="abt-eye">User feedback</span>
              <h2 className="abt-sec-h2" style={{ marginBottom: 0 }}>What our user <em>say.</em></h2>
            </FadeUp>
          </div>
          {/* Spread deck — cards stack in center, fly to 6 positions on click */}
          <div className="abt-spread-wrap" style={{ height: tcExpanded ? '1000px' : '420px', transition: 'height 0.6s ease' }}>
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                className="abt-spread-card"
                animate={tcExpanded
                  ? { x: SPREAD_POS[i].x, y: SPREAD_POS[i].y, rotate: CARD_ROTS[i] }
                  : { x: 0, y: 0, rotate: DECK_ROTS[i] }
                }
                transition={{ duration: 0.65, delay: i * 0.06, ease: [0.34, 1.56, 0.64, 1] }}
                style={{ zIndex: tcExpanded ? 1 : 6 - i }}
              >
                <TestiCard t={t} expanded={tcExpanded} />
              </motion.div>
            ))}
            {/* Star button lives in the center of the deck */}
            <motion.button
              className="abt-star-btn"
              animate={{ scale: tcExpanded ? 0.8 : 1, rotate: tcExpanded ? 135 : 0 }}
              transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
              onClick={() => setTcExpanded(v => !v)}
              aria-label="Toggle reviews"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M12 1 L14.2 9.8 L23 12 L14.2 14.2 L12 23 L9.8 14.2 L1 12 L9.8 9.8 Z" />
              </svg>
            </motion.button>
          </div>

        </div>
      </section>

      {/* ══ 8. FOUNDERS — editorial photo spread ════════════════ */}
      <section className="abt-founders">
        <div className="abt-founders-header">
          <FadeUp>
            <span className="abt-eye">The faces behind it</span>
            <h2 className="abt-sec-h2" style={{ marginBottom: 0 }}>Meet your <em>seniors.</em></h2>
          </FadeUp>
          <motion.p
            className="abt-founders-sub"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
            viewport={{ once: true }} transition={{ delay: 0.3 }}
          >
            IIT Kanpur · Class of 2024
          </motion.p>
        </div>

        <div className="abt-fs-spread">
          {[
            { photo: yatharthImg, name: 'Yatharth', role: 'Co-Founder', badge: 'ex-BCG', bio: "Analysed markets at BCG by day, couldn't stop thinking about broken rentals at night. Eventually chose to fix it. Strategy, growth — and his DM is genuinely open.", size: 'lg' },
            { photo: amanImg,    name: 'Aman',      role: 'Co-Founder', badge: 'ex-Startup', bio: "Startup operator who knows what it means to move fast without a map. Built the systems that make the promise real — right flat, right time, no chaos.", size: 'sm' },
          ].map((f, i) => (
            <motion.div
              key={i}
              className={`abt-fs-card abt-fs-${f.size}`}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.75, delay: i * 0.18, ease: EASE }}
            >
              <img src={f.photo} alt={f.name} className="abt-fs-photo" />
              <div className="abt-fs-overlay">
                <span className="abt-fs-badge">{f.badge}</span>
                <h3 className="abt-fs-name">{f.name}</h3>
                <p className="abt-fs-role">{f.role}</p>
                <p className="abt-fs-bio">{f.bio}</p>
                <span className="abt-fs-dm">DM open →</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══ 9. CTA ═══════════════════════════════════════════════ */}
      <section className="abt-cta">
        <div className="abt-cta-noise" />
        <FadeUp className="abt-cta-inner">
          <span className="abt-cta-eye">Ready?</span>
          <h2 className="abt-cta-h2">Your move should feel<br /><em>exciting,</em> not stressful.</h2>
          <p className="abt-cta-sub">Talk to us. We're not going to pitch you — we're going to listen and actually help you find the right place.</p>
          <div className="abt-cta-btns">
            <Link className="abt-cta-btn-white" to="/contact">Book a Free Consultation</Link>
            <Link className="abt-cta-btn-ghost" to="/map">Browse Verified Listings</Link>
          </div>
        </FadeUp>
      </section>

      <Footer />
    </div>
  );
}
