import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  ClipboardCheck,
  Eye,
  FileSearch,
  Layers,
  Menu,
  Scale,
  Shield,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';
import '../landing.css';

const NAV = [
  { id: 'platform', label: 'Platform' },
  { id: 'catalog', label: 'Capabilities' },
  { id: 'how', label: 'How it works' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'security', label: 'Security' },
  { id: 'pricing', label: 'Plans' },
  { id: 'contact', label: 'Contact' },
];

const MARQUEE = [
  'Technology',
  'Financial Services',
  'Healthcare',
  'Retail',
  'Manufacturing',
  'Professional Services',
  'Higher Education',
  'Logistics',
];

const FEATURES = [
  {
    icon: ClipboardCheck,
    title: 'Screening hub',
    text: 'Question library, reusable templates, and position-specific rubrics. Configure any number of questions with even point distribution.',
  },
  {
    icon: Sparkles,
    title: 'Candidate Intelligence',
    text: 'One explainable score from 0 to 100 across seven weighted dimensions: technical fit, problem solving, communication, ownership, authenticity, resume consistency, and behavioral confidence.',
  },
  {
    icon: Scale,
    title: 'Green, Amber, Red buckets',
    text: 'Fast prioritization with advisory buckets. Red never auto-rejects. Recruiters override with documented reasons.',
  },
  {
    icon: Shield,
    title: 'Proctored apply sessions',
    text: 'Clipboard blocking, fullscreen, tab tracking, keystroke dynamics, and duplicate IP detection. Configurable monitor, strict, or fail modes.',
  },
  {
    icon: Eye,
    title: 'Blind review and DEI',
    text: 'Anonymized candidate codes during early review. Identity unlocks at shortlist when DEI-safe mode is enabled.',
  },
  {
    icon: FileSearch,
    title: 'Experience validation',
    text: 'Compare resume tenure and seniority signals against role requirements. Surface gaps before pipeline advancement.',
  },
  {
    icon: Users,
    title: 'Reviewer workflow',
    text: 'Compare candidates side by side, export PDF scorecards, schedule interviews, and move pipeline stages with full audit trail.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    text: 'Overview, experience intelligence, applicant insights, screening health, position performance, and platform metrics in one hub.',
  },
  {
    icon: Layers,
    title: 'ATS and API intelligence',
    text: 'Ingest candidates via webhooks, score through the evaluate API, and write explainable results back to your ATS.',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Configure',
    text: 'Create positions, build screening from the question library, approve questionnaires, and set scoring thresholds and proctoring policies.',
  },
  {
    num: '02',
    title: 'Screen and score',
    text: 'Candidates apply with resume plus typed, audio, or video answers. Xperieval scores responses, flags integrity signals, and generates the intelligence report.',
  },
  {
    num: '03',
    title: 'Review and decide',
    text: 'Recruiters shortlist, compare, schedule, and advance pipeline stages. Every score, override, and note is logged for compliance.',
  },
];

const DIFFERENTIATORS = [
  {
    category: 'Modern ATS',
    examples: 'Greenhouse, Lever, Ashby, Workday',
    typical: 'Strong pipeline and scheduling, but screening is mostly forms, notes, and recruiter judgment scattered across tabs.',
    xperieval:
      'One Candidate Intelligence score with seven explainable dimensions, integrity context, and bucket recommendations on every applicant.',
  },
  {
    category: 'Skills assessments',
    examples: 'TestGorilla, Codility, HackerRank',
    typical: 'Great for standardized tests, but scores live in a separate tool with little resume or role-context alignment.',
    xperieval:
      'Custom rubrics per role, resume-aware scoring, experience fit validation, and results in the same pipeline your recruiters already use.',
  },
  {
    category: 'AI resume screeners',
    examples: 'Keyword rankers, GPT wrappers, LinkedIn plugins',
    typical: 'Fast top-of-funnel sorting, but opaque scores, weak integrity signals, and hard to defend in audits or DEI review.',
    xperieval:
      'Transparent dimension breakdown, proctored apply sessions, blind review mode, and a full audit trail. Humans always make the final call.',
  },
  {
    category: 'Interview intelligence',
    examples: 'HireVue, Metaview, note-taking copilots',
    typical: 'Useful after the screen, but late in the funnel and disconnected from how candidates answered structured questions upfront.',
    xperieval:
      'Evidence from screening answers, audio transcripts, and session integrity before you spend interviewer time. Exportable PDF scorecards for hiring managers.',
  },
];

const PLANS = [
  {
    name: 'Pilot',
    tier: '90 days · prove value on real roles',
    featured: false,
    items: [
      'Up to 3 active positions',
      'Up to 75 candidates screened',
      'Up to 5 team members',
      'Core intelligence scoring and proctoring',
      'Analytics and blind review',
    ],
    cta: 'Start pilot',
    href: '/register',
    primary: false,
  },
  {
    name: 'Team',
    tier: 'Full hiring organization',
    featured: true,
    items: [
      '25 positions and 500 candidates',
      'ATS integrations and evaluate API',
      'Score writeback and webhooks',
      'Blind review and DEI-safe mode',
      'Onboarding support',
    ],
    cta: 'Request upgrade',
    action: 'contact',
    primary: true,
  },
  {
    name: 'Enterprise',
    tier: 'Multi-team and compliance-heavy',
    featured: false,
    items: [
      'Unlimited scale and custom limits',
      'Intelligence-only or full portal modes',
      'Compliance auditor role',
      'Dedicated success manager',
      'Custom integration support',
    ],
    cta: 'Contact sales',
    action: 'contact',
    primary: false,
  },
];

const INTEGRATIONS = ['Greenhouse', 'Lever', 'Jira', 'Evaluate API', 'Webhook ingest'];

const INTEREST_OPTIONS = [
  { value: 'demo', label: 'Product demo' },
  { value: 'pilot', label: 'Pilot program' },
  { value: 'integrations', label: 'ATS integrations' },
  { value: 'general', label: 'General question' },
];

function interestLabel(value) {
  return INTEREST_OPTIONS.find((o) => o.value === value)?.label || 'General inquiry';
}

export function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [contactSent, setContactSent] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    company: '',
    interest: '',
    message: '',
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setScrollProgress(max > 0 ? window.scrollY / max : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = useCallback((id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
  }, []);

  const submitContact = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Xperieval inquiry: ${interestLabel(contactForm.interest)}`);
    const body = encodeURIComponent(
      `Name: ${contactForm.name}\nCompany: ${contactForm.company}\nEmail: ${contactForm.email}\n\n${contactForm.message}`
    );
    window.location.href = `mailto:hello@xperieval.com?subject=${subject}&body=${body}`;
    setContactSent(true);
  };

  return (
    <div className="landingPage">
      <div className="landingProgress" style={{ transform: `scaleX(${scrollProgress})` }} aria-hidden="true" />

      <nav className="landingNav" aria-label="Marketing">
        <div className="landingNavInner">
          <a href="#top" className="landingBrand" onClick={(e) => { e.preventDefault(); scrollTo('top'); }}>
            <div className="landingBrandMark">
              <X size={18} strokeWidth={2.5} />
            </div>
            <div>
              <strong>XPERIEVAL</strong>
              <span>Experience evaluation</span>
            </div>
          </a>

          <div className="landingNavLinks">
            {NAV.map((item) => (
              <button key={item.id} type="button" onClick={() => scrollTo(item.id)}>
                {item.label}
              </button>
            ))}
          </div>

          <div className="landingNavActions">
            <Link to="/login" className="landingBtn landingBtnOutline">
              Sign in
            </Link>
            <button type="button" className="landingBtn landingBtnPrimary" onClick={() => scrollTo('contact')}>
              Book a demo
            </button>
            <button
              type="button"
              className="landingNavToggle"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Menu size={18} />
            </button>
          </div>
        </div>

        <div className={`landingMobileMenu${menuOpen ? ' open' : ''}`}>
          {NAV.map((item) => (
            <button key={item.id} type="button" onClick={() => scrollTo(item.id)}>
              {item.label}
            </button>
          ))}
          <Link to="/login" className="landingBtn landingBtnOutline" onClick={() => setMenuOpen(false)}>
            Sign in
          </Link>
        </div>
      </nav>

      <section className="landingHero" id="top">
        <div className="landingHeroGrid">
          <div>
            <span className="landingEyebrow">Evidence-based hiring platform</span>
            <h1>
              Intelligence for every <em>shortlist decision.</em>
            </h1>
            <p>
              Xperieval turns resumes, screening answers, and session integrity into one explainable Candidate
              Intelligence score. Built for recruiters, hiring managers, and compliance teams who need evidence, not
              guesswork.
            </p>
            <div className="landingHeroCtas">
              <Link to="/register" className="landingBtn landingBtnPrimary">
                Start 90-day pilot
              </Link>
              <button type="button" className="landingBtn landingBtnOutline" onClick={() => scrollTo('contact')}>
                Book a demo
              </button>
            </div>
          </div>

          <div className="landingPreview" aria-hidden="true">
            <div className="landingPreviewBar">xperieval · candidates · senior-product-manager</div>
            <div className="landingPreviewBody">
              <div className="landingBucketRow">
                <div className="landingBucket green">
                  <strong>Green</strong>
                  <span>24</span>
                </div>
                <div className="landingBucket amber">
                  <strong>Amber</strong>
                  <span>41</span>
                </div>
                <div className="landingBucket red">
                  <strong>Red</strong>
                  <span>18</span>
                </div>
              </div>
              <div className="landingCandidateRow">
                <span className="landingCandidateScore" style={{ color: '#047857' }}>
                  87
                </span>
                <div className="landingCandidateInfo">
                  <b>Aarav Mehta</b>
                  <small>Resume, answers, and evidence aligned</small>
                </div>
                <span className="landingTag">Green</span>
              </div>
              <div className="landingCandidateRow">
                <span className="landingCandidateScore" style={{ color: '#b45309' }}>
                  71
                </span>
                <div className="landingCandidateInfo">
                  <b>Sofia Chen</b>
                  <small>Strong screening · follow-up recommended</small>
                </div>
                <span className="landingTag">Amber</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="landingMarquee" aria-hidden="true">
        <div className="landingMarqueeTrack">
          {[...MARQUEE, ...MARQUEE].map((label, i) => (
            <span key={`${label}-${i}`}>{label}</span>
          ))}
        </div>
      </div>

      <section className="landingSection" id="platform">
        <div className="landingSectionInner">
          <span className="landingEyebrow">The platform</span>
          <h2 className="landingH2">One score. Every signal that matters.</h2>
          <p className="landingLead">
            Xperieval unifies resume intelligence, structured screening, experience validation, and assessment
            integrity into a single advisory score recruiters can defend in every hiring conversation.
          </p>
          <div className="landingStats">
            <div className="landingStat">
              <strong>7</strong>
              <span>Scoring dimensions</span>
            </div>
            <div className="landingStat">
              <strong>0–100</strong>
              <span>Intelligence score</span>
            </div>
            <div className="landingStat">
              <strong>3</strong>
              <span>Product modes</span>
            </div>
            <div className="landingStat">
              <strong>100%</strong>
              <span>Human final decision</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landingSection landingSectionAlt" id="catalog">
        <div className="landingSectionInner">
          <span className="landingEyebrow">Capabilities</span>
          <h2 className="landingH2">Everything your hiring team needs in one portal.</h2>
          <p className="landingLead">
            From the first application to the final interview invite, Xperieval gives reviewers explainable evidence at
            every step.
          </p>
          <div className="landingFeatureGrid">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <article key={title} className="landingFeatureCard">
                <div className="landingFeatureIcon">
                  <Icon size={20} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landingSection" id="how">
        <div className="landingSectionInner">
          <span className="landingEyebrow">How it works</span>
          <h2 className="landingH2">Live in days; not quarters.</h2>
          <p className="landingLead">
            Create a workspace, configure one role, and score real applicants. Expand templates and integrations when
            your team is ready.
          </p>
          <div className="landingSteps">
            {STEPS.map((step) => (
              <article key={step.num} className="landingStep">
                <div className="landingStepNum">{step.num}</div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landingSection landingSectionAlt" id="why">
        <div className="landingSectionInner">
          <span className="landingEyebrow">Why Xperieval</span>
          <h2 className="landingH2">Fits the stack you already run. Fills what it misses.</h2>
          <p className="landingLead">
            Teams today mix an ATS, skills tests, AI screeners, and interview tools. Xperieval does not replace your
            ATS. It adds explainable evaluation, integrity, and reviewer workflow in one place.
          </p>
          <div className="landingDiffGrid">
            {DIFFERENTIATORS.map((item) => (
              <article key={item.category} className="landingDiffCard">
                <div className="landingDiffHead">
                  <h3>{item.category}</h3>
                  <p className="landingDiffExamples">{item.examples}</p>
                </div>
                <div className="landingDiffCols">
                  <div className="landingDiffCol landingDiffColTypical">
                    <span className="landingDiffLabel">What teams use today</span>
                    <p>{item.typical}</p>
                  </div>
                  <div className="landingDiffCol landingDiffColXper">
                    <span className="landingDiffLabel">With Xperieval</span>
                    <p>{item.xperieval}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landingSection" id="integrations">
        <div className="landingSectionInner">
          <span className="landingEyebrow">Integrations</span>
          <h2 className="landingH2">Connects to your ATS and your stack.</h2>
          <p className="landingLead">
            Ingest candidates from your ATS, score via API, and create Jira hiring tasks when you shortlist. All from
            one intelligence workspace.
          </p>
          <div className="landingIntegrations">
            {INTEGRATIONS.map((name) => (
              <span key={name} className="landingIntegrationChip">
                {name}
              </span>
            ))}
          </div>
          <p className="landingLead" style={{ marginTop: 28 }}>
            Run <strong>Hiring</strong> (full portal), <strong>Intelligence</strong> (API and ATS scoring only), or{' '}
            <strong>both</strong> in one workspace. Admins configure the mode that fits your team.
          </p>
        </div>
      </section>

      <section className="landingSection landingSectionAlt" id="security">
        <div className="landingSectionInner">
          <span className="landingEyebrow">Security and compliance</span>
          <h2 className="landingH2">Enterprise-ready review workflows.</h2>
          <p className="landingLead">
            Role-based access, blind review, timestamped audit logs, and configurable data retention. Compliance
            auditors get anonymized candidate views with scores and integrity data intact.
          </p>
          <div className="landingFeatureGrid" style={{ marginTop: 28 }}>
            <article className="landingFeatureCard">
              <div className="landingFeatureIcon">
                <Shield size={20} />
              </div>
              <h3>Role-based access</h3>
              <p>Admin, Recruiter, Hiring Manager, and Compliance Auditor roles with scoped permissions.</p>
            </article>
            <article className="landingFeatureCard">
              <div className="landingFeatureIcon">
                <Zap size={20} />
              </div>
              <h3>Audit trail</h3>
              <p>Every scoring run, bucket override, note, and pipeline change is logged with who and when.</p>
            </article>
            <article className="landingFeatureCard">
              <div className="landingFeatureIcon">
                <Eye size={20} />
              </div>
              <h3>DEI-safe review</h3>
              <p>Hide identity until shortlist while keeping dimension scores visible for fair comparison.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="landingSection" id="pricing">
        <div className="landingSectionInner">
          <span className="landingEyebrow">Plans</span>
          <h2 className="landingH2">Start with a pilot. Scale when you are ready.</h2>
          <p className="landingLead">
            Every new workspace begins on a 90-day pilot with real limits. Register to start, then request an upgrade
            from Settings when your team is ready for integrations and higher volume.
          </p>
          <div className="landingPricing">
            {PLANS.map((plan) => (
              <article key={plan.name} className={`landingPriceCard${plan.featured ? ' featured' : ''}`}>
                <h3>{plan.name}</h3>
                <p className="tier">{plan.tier}</p>
                <ul>
                  {plan.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {plan.href ? (
                  <Link
                    to={plan.href}
                    className={`landingBtn ${plan.primary ? 'landingBtnPrimary' : 'landingBtnOutline'}`}
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={`landingBtn ${plan.primary ? 'landingBtnPrimary' : 'landingBtnOutline'}`}
                    onClick={() => scrollTo('contact')}
                  >
                    {plan.cta}
                  </button>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landingSection landingSectionAlt" id="contact">
        <div className="landingSectionInner landingContact">
          <div>
            <span className="landingEyebrow">Contact us</span>
            <h2 className="landingH2">Talk to our team.</h2>
            <p className="landingLead">
              Book a product demo, ask about integrations, or tell us about your hiring stack. We typically respond within
              one business day.
            </p>
            <p className="landingLead" style={{ marginTop: 18 }}>
              Already have access?{' '}
              <Link to="/login" style={{ color: 'var(--lp-ink)', fontWeight: 600 }}>
                Sign in to the portal
              </Link>{' '}
              or{' '}
              <Link to="/register" style={{ color: 'var(--lp-ink)', fontWeight: 600 }}>
                create a workspace
              </Link>
              .
            </p>
          </div>

          {contactSent ? (
            <div className="landingFormSuccess">
              Thanks for reaching out. Your email client should open with your message ready to send. If it did not,
              write to hello@xperieval.com directly.
            </div>
          ) : (
            <form className="landingForm" onSubmit={submitContact}>
              <label>
                Name
                <input
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  required
                  placeholder="Your name"
                />
              </label>
              <label>
                Work email
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  required
                  placeholder="you@company.com"
                />
              </label>
              <label>
                Company
                <input
                  value={contactForm.company}
                  onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                  placeholder="Organization name"
                />
              </label>
              <label>
                I am interested in
                <select
                  required
                  value={contactForm.interest}
                  onChange={(e) => setContactForm({ ...contactForm, interest: e.target.value })}
                >
                  <option value="" disabled>
                    Select an option
                  </option>
                  {INTEREST_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Message
                <textarea
                  rows={4}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  placeholder="Tell us about your hiring workflow and team size…"
                />
              </label>
              <button type="submit" className="landingBtn landingBtnPrimary">
                Send message
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="landingCta">
        <h2>Put evidence behind every hire.</h2>
        <p>Start your 90-day pilot today, or book a demo for your hiring team.</p>
        <div className="landingHeroCtas" style={{ justifyContent: 'center' }}>
          <button type="button" className="landingBtn landingBtnPrimary" onClick={() => scrollTo('contact')}>
            Book a demo
          </button>
          <Link to="/register" className="landingBtn landingBtnOutline">
            Start pilot
          </Link>
        </div>
      </section>

      <footer className="landingFooter">
        <div className="landingFooterInner">
          <div>
            <strong>XPERIEVAL</strong>
            <small>Evidence-based candidate evaluation for modern hiring teams.</small>
            <small>© {new Date().getFullYear()} Xperieval. All rights reserved.</small>
          </div>
          <nav className="landingFooterNav" aria-label="Footer">
            <ul className="landingFooterLinks">
              {NAV.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => scrollTo(item.id)}>
                    {item.label}
                  </button>
                </li>
              ))}
              <li>
                <Link to="/login">Sign in</Link>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
