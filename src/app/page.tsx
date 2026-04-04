import Link from 'next/link'

const features = [
  { icon: '⚡', title: 'Visual Builder', desc: 'Drag-and-drop nodes to compose pipelines without writing a single line of ETL code.' },
  { icon: '🕐', title: 'Auto Scheduling', desc: 'Cron-based scheduling with retry logic. Set it and forget it.' },
  { icon: '🔧', title: 'Transformation Engine', desc: 'Built-in SQL and JS transforms, field mapping, and data cleansing rules.' },
  { icon: '📊', title: 'Live Monitoring', desc: 'Real-time run logs, row counts, and pipeline health dashboards.' },
  { icon: '🚨', title: 'Failure Alerts', desc: 'Instant email and Slack notifications on pipeline failures with full error context.' },
  { icon: '👥', title: 'Team Collaboration', desc: 'Role-based access control — admins, engineers, and viewers out of the box.' },
]

const plans = [
  {
    name: 'Starter',
    price: '$99',
    period: '/mo',
    features: ['5 pipelines', '1M rows / month', 'Email support', '5 connectors'],
    cta: 'Get Started',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$299',
    period: '/mo',
    features: ['Unlimited pipelines', 'Unlimited rows', 'Priority support', 'API access', 'Unlimited connectors'],
    cta: 'Start Pro',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: ['Everything in Pro', 'SSO / SAML', 'Dedicated support', 'On-premise option', 'SLA guarantees'],
    cta: 'Contact Sales',
    highlight: false,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-indigo-600">DataBridge</span>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors">Pricing</a>
            <a href="/docs" className="text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors">Docs</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 transition-colors">Log in</Link>
            <Link href="/signup" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">Start Free</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-28 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-4 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-6">
          ✨ Now with AI-assisted transform suggestions
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
          Data pipelines without<br />
          <span className="text-indigo-600">the infrastructure work.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400 mb-10">
          DataBridge lets your team build, schedule, and monitor production-grade data pipelines visually — no DevOps, no boilerplate, no downtime firefighting.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup" className="rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all">
            Get Started Free
          </Link>
          <Link href="/pipelines/demo" className="rounded-xl border border-gray-300 dark:border-gray-700 px-8 py-3.5 text-base font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
            View Demo →
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 dark:bg-gray-900 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold mb-4">Everything your data team needs</h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-14 max-w-xl mx-auto">From raw connectors to scheduled transforms and alerting — DataBridge covers the full pipeline lifecycle.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 mx-auto max-w-7xl px-6">
        <h2 className="text-center text-3xl font-bold mb-4">Simple, transparent pricing</h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-14">Start free, scale as you grow. No surprise bills.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div key={plan.name} className={`rounded-2xl p-8 border ${plan.highlight ? 'border-indigo-600 bg-indigo-600 text-white shadow-xl shadow-indigo-200 dark:shadow-none' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
              <h3 className={`text-xl font-bold mb-2 ${plan.highlight ? 'text-white' : ''}`}>{plan.name}</h3>
              <div className="flex items-end gap-1 mb-6">
                <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : ''}`}>{plan.price}</span>
                <span className={`text-sm mb-1 ${plan.highlight ? 'text-indigo-200' : 'text-gray-400'}`}>{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feat) => (
                  <li key={feat} className={`flex items-center gap-2 text-sm ${plan.highlight ? 'text-indigo-100' : 'text-gray-600 dark:text-gray-400'}`}>
                    <span>✓</span>{feat}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.name === 'Enterprise' ? 'mailto:sales@aurorarayes.com' : '/signup'}
                className={`block text-center rounded-xl px-6 py-3 font-semibold text-sm transition-all ${plan.highlight ? 'bg-white text-indigo-600 hover:bg-indigo-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span className="font-semibold text-indigo-600">DataBridge</span>
          <span>© {new Date().getFullYear()} Aurora Rayes LLC. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-indigo-600 transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-indigo-600 transition-colors">Terms</a>
            <a href="mailto:support@aurorarayes.com" className="hover:text-indigo-600 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  )
}