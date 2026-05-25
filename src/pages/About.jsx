import { useRef, useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useMotionValue, useSpring, animate } from 'framer-motion';
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
const HERO_LINE1 = 'Moving to Bangalore?';
const HERO_LINE2 = 'We make it actually easy.';
const HERO_LINE1_LEN = HERO_LINE1.length;
const HERO_TOTAL_CHARS = HERO_LINE1_LEN + HERO_LINE2.length;

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
    tag: '',
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

/* ─── Typing text ───────────────────────────────────────────────────── */
function TypedText({ text, speed = 34, delay = 400 }) {
  const [displayed, setDisplayed] = useState('');
  const elRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    let cancel = () => {};
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !startedRef.current) {
        startedRef.current = true;
        let i = 0;
        const t = setTimeout(() => {
          const iv = setInterval(() => {
            i++;
            setDisplayed(text.slice(0, i));
            if (i >= text.length) clearInterval(iv);
          }, speed);
          cancel = () => clearInterval(iv);
        }, delay);
        cancel = () => clearTimeout(t);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => { obs.disconnect(); cancel(); };
  }, [text, speed, delay]);

  return (
    <span ref={elRef}>
      {displayed}
      {displayed.length < text.length && <span className="abt-jc-type-cursor" />}
    </span>
  );
}

/* ─── Journey chart ─────────────────────────────────────────────────── */
const GREEN = '#22C55E';
const VIEWW = 1000;
const VIEWH = 450;
const LW = 130; // label card width
const LH = 33;  // label card height
const LC = 38;  // connector length

const WITH_PTS = [
  { x: 60,  y: 200, label: 'Day 1: Sign up',         above: true,  showLabel: true  },
  { x: 150, y: 172, label: 'Rep assigned',            above: true,  showLabel: true  },
  { x: 240, y: 150, label: 'Shortlist ready',         above: true,  showLabel: false },
  { x: 330, y: 132, label: 'First visits lined up',   above: true,  showLabel: false },
  { x: 425, y: 116, label: 'Rent negotiated',         above: true,  showLabel: true  },
  { x: 520, y: 103, label: 'Docs verified',           above: true,  showLabel: false },
  { x: 615, y: 93,  label: 'Offer accepted',          above: true,  showLabel: true  },
  { x: 730, y: 85,  label: 'Move-in day ✓',           above: true,  showLabel: true  },
  { x: 830, y: 80,  label: 'Keys in hand',            above: true,  showLabel: false },
  { x: 940, y: 76,  label: 'Home sweet home',         above: true,  showLabel: true  },
];

const WITHOUT_PTS = [
  { x: 60,  y: 238, label: 'Start searching...',      above: false, showLabel: true  },
  { x: 140, y: 264, label: 'Broker #1 found',         above: false, showLabel: false },
  { x: 215, y: 172, label: 'Found something!',         above: true,  showLabel: false },
  { x: 290, y: 338, label: 'Fake listing. Ghosted.',   above: false, showLabel: true  },
  { x: 365, y: 230, label: 'New broker...',            above: false, showLabel: false },
  { x: 438, y: 336, label: 'Token scam. Ghosted.',     above: false, showLabel: true  },
  { x: 515, y: 185, label: 'Okay, this time!',         above: true,  showLabel: false },
  { x: 590, y: 320, label: 'Hidden charges',           above: false, showLabel: true  },
  { x: 665, y: 255, label: 'Back to square 1',         above: false, showLabel: false },
  { x: 740, y: 340, label: 'Fake photos again',        above: false, showLabel: true  },
  { x: 825, y: 292, label: 'Broker #5...',             above: false, showLabel: false },
  { x: 940, y: 348, label: 'Still searching...',       above: false, showLabel: true  },
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

function ChartLabel({ pt, color, frac, pathProgress, textFill = 'rgba(255,255,255,.92)', cardBg = 'rgba(22,22,22,.95)' }) {
  const opacity = useTransform(pathProgress, [Math.max(0, frac - 0.06), frac + 0.04], [0, 1]);
  const rx  = Math.max(25, Math.min(pt.x - LW / 2, VIEWW - LW - 25));
  const ry  = pt.above ? pt.y - LC - LH : pt.y + LC;
  const cy1 = pt.above ? ry + LH + 2 : pt.y + 5;
  const cy2 = pt.above ? pt.y - 5    : ry - 2;
  return (
    <motion.g style={{ opacity }}>
      <line x1={pt.x} y1={cy1} x2={pt.x} y2={cy2} stroke={color} strokeWidth="1.5" strokeDasharray="3 2.5" opacity="0.5" />
      <rect x={rx} y={ry} width={LW} height={LH} rx="8" fill={cardBg} stroke={`${color}55`} strokeWidth="1"
        style={{ filter: 'drop-shadow(0 3px 12px rgba(0,0,0,0.55))' }} />
      <text x={rx + LW / 2} y={ry + LH * 0.65} textAnchor="middle"
        fill={textFill} fontSize="10.5" fontWeight="500" fontFamily="Sora, system-ui, sans-serif">
        {pt.label}
      </text>
    </motion.g>
  );
}

function ChartDot({ pt, color, frac, pathProgress }) {
  const opacity = useTransform(pathProgress, [Math.max(0, frac - 0.04), frac + 0.03], [0, 1]);
  return (
    <motion.g style={{ opacity }}>
      <circle cx={pt.x} cy={pt.y} r={13} fill={color} opacity={0.12} />
      <circle cx={pt.x} cy={pt.y} r={6} fill={color} />
    </motion.g>
  );
}

const WITH_END  = WITH_PTS[WITH_PTS.length - 1];

const WITHOUT_END = WITHOUT_PTS[WITHOUT_PTS.length - 1];

function JourneyChart() {
  const [inViewRef, inView] = useInView({ triggerOnce: true, threshold: 0.2 });
  const progress    = useMotionValue(0);
  const pathProgress = progress;
  const fillOpacity  = useTransform(progress, [0.03, 0.38], [0, 1]);
  const photoOpacity = useTransform(progress, [0.72, 0.88], [0, 1]);

  useEffect(() => {
    if (!inView) return;
    const c = animate(progress, 1, { duration: 3.5, ease: 'easeInOut' });
    return () => c.stop();
  }, [inView, progress]);

  return (
    <div className="abt-jc-wrap" ref={inViewRef}>
      <svg viewBox={`0 0 ${VIEWW} ${VIEWH}`} preserveAspectRatio="xMidYMin meet" className="abt-jc-svg">
          <defs>
            <clipPath id="jc-cy"><circle cx={WITH_END.x} cy={WITH_END.y} r={30} /></clipPath>
            <clipPath id="jc-ca"><circle cx={WITHOUT_END.x} cy={WITHOUT_END.y} r={30} /></clipPath>
            <linearGradient id="jc-gfill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={GREEN} stopOpacity="0.3" />
              <stop offset="100%" stopColor={GREEN} stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {/* Grid */}
          {[80, 160, 240, 320].map(y => (
            <line key={y} x1="40" y1={y} x2="970" y2={y} stroke="rgba(255,255,255,.07)" strokeWidth="1" />
          ))}

          {/* Green fill — scroll-driven opacity */}
          <motion.path
            d={`${makeSmoothPath(WITH_PTS)} L ${WITH_END.x} ${VIEWH} L ${WITH_PTS[0].x} ${VIEWH} Z`}
            fill="url(#jc-gfill)"
            style={{ opacity: fillOpacity }}
          />

          {/* With MovEazy line — scroll-driven pathLength */}
          <motion.path d={makeSmoothPath(WITH_PTS)} stroke={GREEN} strokeWidth="3.2" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ pathLength: pathProgress }} />

          {/* Without MovEazy line — scroll-driven pathLength */}
          <motion.path d={makeSmoothPath(WITHOUT_PTS)} stroke="#E8321A" strokeWidth="3.2" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ pathLength: pathProgress }} />

          {/* Dots — appear as path reaches each point */}
          {WITH_PTS.filter(pt => pt.showLabel).map((pt, i) => (
            <ChartDot key={i} pt={pt} color={GREEN}
              frac={WITH_PTS.indexOf(pt) / (WITH_PTS.length - 1)}
              pathProgress={pathProgress} />
          ))}
          {WITHOUT_PTS.filter(pt => pt.showLabel).map((pt, i) => (
            <ChartDot key={i} pt={pt} color="#E8321A"
              frac={WITHOUT_PTS.indexOf(pt) / (WITHOUT_PTS.length - 1)}
              pathProgress={pathProgress} />
          ))}

          {/* Labels — appear as path reaches each point */}
          {WITH_PTS.filter(pt => pt.showLabel).map((pt, i) => (
            <ChartLabel key={i} pt={pt} color={GREEN}
              frac={WITH_PTS.indexOf(pt) / (WITH_PTS.length - 1)}
              pathProgress={pathProgress} />
          ))}
          {WITHOUT_PTS.filter(pt => pt.showLabel).map((pt, i) => (
            <ChartLabel key={i} pt={pt} color="#E8321A"
              frac={WITHOUT_PTS.indexOf(pt) / (WITHOUT_PTS.length - 1)}
              pathProgress={pathProgress} />
          ))}

          {/* Yatharth photo — happy end */}
          <motion.g style={{ opacity: photoOpacity }}>
            <circle cx={WITH_END.x} cy={WITH_END.y} r={33} fill="#111" stroke={GREEN} strokeWidth="2.5" />
            <image href={yatharthImg}
              x={WITH_END.x - 30} y={WITH_END.y - 30} width="60" height="60"
              clipPath="url(#jc-cy)" preserveAspectRatio="xMidYMid slice" />
          </motion.g>

          {/* Aman photo — stressed end */}
          <motion.g style={{ opacity: photoOpacity }}>
            <circle cx={WITHOUT_END.x} cy={WITHOUT_END.y} r={33} fill="#111" stroke="#E8321A" strokeWidth="2.5" />
            <image href={amanImg}
              x={WITHOUT_END.x - 30} y={WITHOUT_END.y - 30} width="60" height="60"
              clipPath="url(#jc-ca)" preserveAspectRatio="xMidYMid slice" />
            <circle cx={WITHOUT_END.x} cy={WITHOUT_END.y} r={33} fill="rgba(232,50,26,0.22)" />
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

/* ─── Story + curtain (merged) ───────────────────── */
function StoryWithCurtain() {
  const wrapRef = useRef(null);
  const spacerRefs = useRef([]);
  const [activeChapter, setActiveChapter] = useState(0);
  const [chapterProgress, setChapterProgress] = useState(0);
  const pbRef = useRef(null);
  const dirRef = useRef(1);
  const prevChRef = useRef(0);
  const rafRef = useRef(null);

  // Spring-driven curtain — updated imperatively without React re-renders
  const curtainMV = useMotionValue(0);
  const curtainSpring = useSpring(curtainMV, { stiffness: 52, damping: 20, restDelta: 0.01 });
  const leftXVal  = useTransform(curtainSpring, v => `${-v}%`);
  const rightXVal = useTransform(curtainSpring, v => `${v}%`);

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

      if (ch !== prevChRef.current) {
        dirRef.current = ch > prevChRef.current ? 1 : -1;
        prevChRef.current = ch;
      }

      setActiveChapter(ch);
      setChapterProgress(ch > 0 || prog > 0.5 ? prog : 0);

      const wrap = wrapRef.current;
      if (wrap) {
        const rect = wrap.getBoundingClientRect();
        const scrolled = Math.max(0, -rect.top);
        const total = wrap.offsetHeight - window.innerHeight;
        const pb = total > 0 ? Math.min(100, (scrolled / total) * 100) : 0;
        const inView = rect.top < window.innerHeight && rect.bottom > 0;
        if (pbRef.current) {
          pbRef.current.style.width = `${pb}%`;
          pbRef.current.style.opacity = inView ? '1' : '0';
        }

        // Curtain: fast open on entry → hold through chapters → fully open at exit
        const target =
          pb < 1  ? 0 :
          pb < 12 ? ((pb - 1) / 11) * 68 :
          pb < 82 ? 68 :
          68 + ((pb - 82) / 18) * 32;
        curtainMV.set(target);
      }
    };

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        tick();
        rafRef.current = null;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    tick();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [curtainMV]);

  const ch = CHAPTERS[activeChapter];
  const dir = dirRef.current;

  return (
    <div className="abt-story-curtain-wrap" ref={wrapRef}>
      <div className="abt-curtain-sticky">
        <motion.div
          className="abt-curtain-panel abt-curtain-left"
          style={{ x: leftXVal }}
        >
          <img src="/opener1.png" alt="" draggable={false} />
        </motion.div>
        <motion.div
          className="abt-curtain-panel abt-curtain-right"
          style={{ x: rightXVal }}
        >
          <img src="/opener2.jpg" alt="" draggable={false} />
        </motion.div>
      </div>

      <div className="abt-story-pb" ref={pbRef} />

      <div className="abt-sticky-stage">
        <div className="abt-story-col">
          <motion.span
            key={`wm-${activeChapter}`}
            className="abt-story-watermark"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            aria-hidden="true"
          >
            {ch.num}
          </motion.span>

          <motion.div
            key={activeChapter}
            initial={{ opacity: 0, y: dir * 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: EASE }}
            style={{ position: 'relative', zIndex: 1 }}
          >
            <p className="abt-sn">Chapter {ch.num}</p>
            <h2 className="abt-sh">{ch.heading}</h2>
          </motion.div>

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
const CARD_ROTS  = [-1, 0, 1, 1, 0, -1];
const DECK_ROTS  = [9, -6, 3, -11, 7, -4];

const SOLUTION_ITEMS = [
  { num: '01', heading: <>Your rep. Not a broker's.</>, desc: "One dedicated person handles your search — shortlisting, visits, negotiations. For you, not a landlord's commission.", tag: 'Assigned Day 1' },
  { num: '02', heading: <>Every listing <em>vetted</em> before you see it.</>, desc: "No fake photos, no token traps. We verify each flat and confirm availability before you visit.", tag: '₹0 Token Losses' },
  { num: '03', heading: <>Shortlisted around your commute.</>, desc: "Filtered by actual travel time to your office — metro routes, traffic, your hours. Not a map pin.", tag: 'Commute-First' },
  { num: '04', heading: <>Reachable on WhatsApp. Even at 11pm.</>, desc: "Your rep picks up, replies, and keeps you updated. Not a chatbot.", tag: 'Always On' },
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
function SolutionRow({ item, i, inView, baseDelay = 0 }) {
  return (
    <div className="abt-sol-row-wrap">
      <motion.div
        className="abt-sol-row"
        initial={{ opacity: 0, y: 28 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: i * 0.13 + 0.25 + baseDelay, ease: EASE }}
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
        transition={{ duration: 0.55, delay: i * 0.13 + 0.2 + baseDelay, ease: EASE }}
      />
    </div>
  );
}

/* ─── Solution section ───────────────────────────────────────────────── */
function SolutionSection() {
  const [curtainOpen, setCurtainOpen] = useState(false);
  const sectionEl = useRef(null);
  const solVideoRef = useRef(null);

  useEffect(() => {
    if (solVideoRef.current) solVideoRef.current.playbackRate = 1.5;
  }, []);

  // Open curtain when section's vertical center crosses viewport center
  useEffect(() => {
    const el = sectionEl.current;
    if (!el) return;
    const check = () => {
      if (curtainOpen) return;
      const { top, height } = el.getBoundingClientRect();
      if (top <= window.innerHeight * 0.25) setCurtainOpen(true);
    };
    window.addEventListener('scroll', check, { passive: true });
    check();
    return () => window.removeEventListener('scroll', check);
  }, [curtainOpen]);

  return (
    <section className="abt-solution" ref={sectionEl}>
      {/* Curtain top — covers upper half, slides up on enter */}
      <motion.div
        className="abt-sol-curtain abt-sol-curtain-top"
        animate={{ y: curtainOpen ? '-100%' : '0%' }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        style={{ willChange: 'transform' }}
      >
        <img src="/curtain_1.jpg" alt="" draggable={false} />
      </motion.div>

      {/* Curtain bottom — covers lower half, slides down on enter */}
      <motion.div
        className="abt-sol-curtain abt-sol-curtain-bot"
        animate={{ y: curtainOpen ? '100%' : '0%' }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        style={{ willChange: 'transform' }}
      >
        <img src="/curtain_2.jpg" alt="" draggable={false} />
      </motion.div>


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
          animate={curtainOpen ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, delay: 0, ease: EASE }}
        >
          <h2 className="abt-sol-main-h">Everything broken about rentals? <em>Fixed.</em></h2>
        </motion.div>

        <motion.div
          className="abt-sol-top-divider"
          initial={{ scaleX: 0 }}
          animate={curtainOpen ? { scaleX: 1 } : {}}
          style={{ transformOrigin: 'left' }}
          transition={{ duration: 0.4, delay: 0.08, ease: EASE }}
        />

        <div className="abt-sol-list">
          {SOLUTION_ITEMS.map((item, i) => (
            <SolutionRow key={i} item={item} i={i} inView={curtainOpen} baseDelay={0} />
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
    <div className={`abt-tcard${expanded ? ' abt-tcard--exp' : ''}`}>
      <div className="abt-tcard-toprow">
        <span className="abt-tcard-dot" />
        <span className="abt-tcard-arrowbtn">↗</span>
      </div>
      <div className="abt-tcard-namewrap">
        <span className="abt-tcard-fname">{firstName}</span>
        <span className="abt-tcard-lname">{lastName}</span>
      </div>
      <p className="abt-tcard-review" style={{ maxHeight: expanded ? 130 : 55 }}>
        "{t.text}"
      </p>
      <span className="abt-tcard-roletxt">{t.role}</span>
      <div className="abt-tcard-pills">
        <span className="abt-tcard-pill">{t.college.split('·')[0].trim()}</span>
        <span className="abt-tcard-pill">{'★'.repeat(t.stars)}</span>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function About() {
  const heroRef = useRef(null);
  const videoRef = useRef(null);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  const heroOp = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  const [tcExpanded, setTcExpanded] = useState(false);
  const tcExpandedRef = useRef(false);
  const testiEl = useRef(null);
  const spreadWrapRef = useRef(null);
  const [spreadX, setSpreadX] = useState(350);
  const [typedCount, setTypedCount] = useState(0);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = 0.6;
  }, []);

  // Compute card x-offset from actual wrap width so cards never clip
  useEffect(() => {
    const update = () => {
      if (!spreadWrapRef.current) return;
      const halfW = spreadWrapRef.current.offsetWidth / 2;
      // card half-width = 190px, keep 12px min margin from wrap edge
      setSpreadX(Math.min(390, Math.max(200, halfW - 202)));
    };
    update();
    const ro = new ResizeObserver(update);
    if (spreadWrapRef.current) ro.observe(spreadWrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Expand cards when testimonials section center reaches viewport center
  useEffect(() => {
    const el = testiEl.current;
    if (!el) return;
    const check = () => {
      if (tcExpandedRef.current) return;
      const { top, height } = el.getBoundingClientRect();
      if (top + height / 2 <= window.innerHeight * 0.35) {
        tcExpandedRef.current = true;
        setTcExpanded(true);
      }
    };
    window.addEventListener('scroll', check, { passive: true });
    check();
    return () => window.removeEventListener('scroll', check);
  }, []);

  // Two-line typing: first line, then second line
  useEffect(() => {
    let intervalId;
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        setTypedCount((current) => {
          if (current >= HERO_TOTAL_CHARS) {
            clearInterval(intervalId);
            return current;
          }
          return current + 1;
        });
      }, 55);
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="abt-page">
      <Navbar />

      {/* ══ MARQUEE ══════════════════════════════════════════════════ */}
      <div className="abt-marquee-wrap" aria-hidden="true">
        <div className="abt-marquee-track">
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span key={i} className="abt-marquee-item">
              {item}<span className="abt-marquee-gem">◆</span>
            </span>
          ))}
        </div>
      </div>

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
        <div className="abt-hero-noise" />

        {/* Content */}
        <motion.div className="abt-hero-content" style={{ y: heroY, opacity: heroOp }}>
          {/* badge removed as requested */}

          <h1 className="abt-hero-h1">
            <span className="abt-hero-line">{HERO_LINE1.slice(0, Math.min(typedCount, HERO_LINE1_LEN))}</span>
            <span className="abt-hero-line">
              {typedCount > HERO_LINE1_LEN && <em>{HERO_LINE2.slice(0, Math.min(typedCount - HERO_LINE1_LEN, HERO_LINE2.length))}</em>}
            </span>
            {typedCount < HERO_TOTAL_CHARS && <span className="abt-typed-cursor" />}
          </h1>

          <motion.div className="abt-hero-btns" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 2.85, ease: EASE }}>
            <Link className="abt-btn-red abt-btn-red-arrow" to="/contact">
              Book Free Consultation
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <path d="M2 6.5h9M7.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link className="abt-btn-outline" to="/map">View Verified Listings</Link>
          </motion.div>
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

      {/* ══ 5. JOURNEY CHART ════════════════════════════════════════ */}
      <section className="abt-jc-sec">
          <div className="abt-jc-top">
            <motion.div
              className="abt-jc-panel abt-jc-panel-green"
              initial={{ opacity: 0, x: -28 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <span className="abt-jc-panel-dot abt-jc-panel-dot-green" />
              <div>
                <span className="abt-jc-with-label">WITH MOVEAZY–<span style={{ color: 'rgba(232,50,26,.88)', fontWeight: 700 }}>SMOOTH. FAST. ZERO-DRAMA.</span></span>
                
              </div>
            </motion.div>

            <motion.div
              className="abt-jc-vs"
              initial={{ opacity: 0, scale: 0.7 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
            >
              vs
            </motion.div>

            <motion.div
              className="abt-jc-panel abt-jc-panel-red"
              initial={{ opacity: 0, x: 28 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <span className="abt-jc-panel-dot abt-jc-panel-dot-red" />
              <div>
                <span className="abt-jc-with-label">WITHOUT MOVEAZY-<span style={{ color: 'rgba(232,50,26,.88)', fontWeight: 700 }}>CHAOTIC. COSTLY. SOUL-CRUSHING.</span></span>
              </div>
            </motion.div>
          </div>

          <p className="abt-jc-caption">Your flat-finding journey — visualised.</p>

          <JourneyChart />
      </section>

      {/* ══ 6. SOLUTION ══════════════════════════════════════════ */}
      <SolutionSection />

      {/* ══ 6b. STORY WITH CURTAIN ══════════════════════════════ */}
      <StoryWithCurtain />

      {/* ══ 7. TESTIMONIALS ══════════════════════════════════════ */}
      <section className="abt-testimonials" ref={testiEl}>
        <div className="abt-testi-inner">
          <div className="abt-testi-hrow">
            <FadeUp>
              <h2 className="abt-sec-h2" style={{ marginBottom: 0 }}>What our user <em>say.</em></h2>
            </FadeUp>
          </div>
        </div>

        {/* Spread deck — lives at section width, not inner width */}
        <motion.div
          ref={spreadWrapRef}
          className="abt-spread-wrap"
          initial={false}
          animate={{ height: tcExpanded ? 1040 : 480 }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {TESTIMONIALS.map((t, i) => {
            const xDir = [-1, 0, 1, -1, 0, 1][i];
            const yPos = i < 3 ? -230 : 230;
            return (
              <motion.div
                key={i}
                className="abt-spread-card"
                animate={tcExpanded
                  ? { x: xDir * spreadX, y: yPos, rotate: CARD_ROTS[i] }
                  : { x: 0, y: 0, rotate: DECK_ROTS[i] }
                }
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: i * 0.04 }}
                style={{ zIndex: 1 }}
              >
                <TestiCard t={t} expanded={tcExpanded} />
              </motion.div>
            );
          })}
          <motion.div
            className="abt-star-btn"
            animate={{ scale: tcExpanded ? 0.8 : 1, rotate: tcExpanded ? 135 : 0 }}
            transition={{ duration: 0.65, ease: EASE }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M12 1 L14.2 9.8 L23 12 L14.2 14.2 L12 23 L9.8 14.2 L1 12 L9.8 9.8 Z" />
            </svg>
          </motion.div>
        </motion.div>
      </section>

      {/* ══ 8. TEAM CAROUSEL ════════════════════════════════════ */}
      <section className="abt-founders">
        <div className="abt-founders-header">
          <FadeUp>
            <h2 className="abt-sec-h2 abt-team-h2" style={{ marginBottom: 0 }}>Our <em>team.</em></h2>
          </FadeUp>
        </div>

        <motion.div className="abt-team-carousel" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <div className="abt-team-track">
            {Array.from({ length: 24 }).map((_, i) => {
              const member = i % 2 === 0
                ? { photo: yatharthImg, name: 'Yatharth', role: 'Co-Founder' }
                : { photo: amanImg, name: 'Aman', role: 'Co-Founder' };
              return (
                <div key={i} className="abt-team-card">
                  <img src={member.photo} alt={member.name} />
                  <div className="abt-team-info">
                    <h3>{member.name}</h3>
                    <p>{member.role}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
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