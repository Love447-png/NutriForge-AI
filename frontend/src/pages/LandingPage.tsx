import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.55 },
};

export function LandingPage() {
  return (
    <div className="space-y-0 overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white">
      <section className="min-h-[82vh] bg-[linear-gradient(135deg,#0a2e1a_0%,#1A7A4A_100%)] px-6 py-12 text-white sm:px-10 lg:px-14 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <motion.div {...fadeUp}>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#F5A623]">Powered by WHO 2006 Standards</p>
            <h1 className="mt-6 whitespace-pre-line font-display text-[52px] font-bold leading-[0.94] sm:text-[64px]">
              {"Catch malnutrition\nbefore it catches\nyour child."}
            </h1>
            <p className="mt-6 max-w-2xl text-[20px] leading-8 text-white/75">
              NutriForge gives ASHA workers and parents a WHO-certified growth assessment and a ₹30/day personalized meal plan — running fully offline, no internet needed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="inline-flex h-14 items-center rounded-2xl bg-white px-6 text-sm font-semibold text-[#1A7A4A] transition hover:scale-[1.02]">
                Get Started →
              </Link>
              <button type="button" className="inline-flex h-14 items-center rounded-2xl border border-white/50 px-6 text-sm font-semibold text-white transition hover:scale-[1.02]">
                Watch 2-min Demo
              </button>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              {["🔒 Zero data collection", "📋 WHO 2006 certified", "🇮🇳 28 Indian states", "⚡ Works offline"].map((item) => (
                <span key={item} className="rounded-full bg-white/10 px-4 py-2 text-white/90">
                  {item}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeUp} className="relative">
            <div className="animate-[float_6s_ease-in-out_infinite] rounded-[28px] border border-white/15 bg-white/10 p-4 backdrop-blur-md">
              <div className="rounded-[24px] bg-white p-5 text-[#1C2B2B] shadow-2xl">
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#FF5F56]" />
                  <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
                  <span className="h-3 w-3 rounded-full bg-[#27C93F]" />
                </div>
                <div className="rounded-[20px] border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1A7A4A]">Live Growth Review</p>
                  <div className="mt-4 h-40 rounded-[20px] bg-[linear-gradient(180deg,#F0FDF4_0%,#ffffff_100%)] p-4">
                    <div className="flex h-full items-end gap-3">
                      <div className="h-16 w-10 rounded-t-2xl bg-[#D1FAE5]" />
                      <div className="h-24 w-10 rounded-t-2xl bg-[#86EFAC]" />
                      <div className="h-32 w-10 rounded-t-2xl bg-[#34D399]" />
                      <div className="h-28 w-10 rounded-t-2xl bg-[#FCD34D]" />
                    </div>
                  </div>
                  <div className="mt-4 rounded-[20px] border border-[#E5E7EB] bg-white p-4">
                    <p className="font-display text-lg font-bold">Forge Plan</p>
                    <p className="mt-2 text-sm text-slate-600">Sattu drink, khichdi, roasted chana, roti with dal.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <motion.section {...fadeUp} className="bg-white px-6 py-16 sm:px-10 lg:px-14">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#1A7A4A]">The Problem</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["150M", "children malnourished in India"],
              ["50%", "cases go undetected until severe"],
              ["₹30", "is all it takes per day to reverse mild malnutrition"],
            ].map(([value, label]) => (
              <div key={value} className="rounded-[24px] border border-[#E5E7EB] bg-[#F9FAFB] p-6">
                <p className="font-display text-5xl font-bold text-[#1A7A4A]">{value}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <BulletColumn
              title="What ASHA workers face today"
              items={[
                "Paper forms with no decision support",
                "Apps that need internet — useless in villages",
                "Generic advice that ignores local food and ₹ budgets",
              ]}
              tone="bad"
            />
            <BulletColumn
              title="What NutriForge provides"
              items={[
                "WHO-certified Z-score assessment in 60 seconds",
                "100% offline — works on any laptop or Android",
                "₹30/day forge plan using foods from local markets",
              ]}
              tone="good"
            />
          </div>
        </div>
      </motion.section>

      <motion.section {...fadeUp} className="bg-[#F0FAF4] px-6 py-16 sm:px-10 lg:px-14">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#1A7A4A]">How It Works</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-[#1C2B2B]">From measurements to meal plan in 60 seconds</h2>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <StepCard number="01" title="Enter child measurements" body="Age, weight, height, and optional MUAC. Takes 30 seconds." />
            <StepCard number="02" title="WHO engine detects risk" body="Deterministic Z-score calculation using WHO 2006 LMS tables. Not AI guesswork — actual clinical standards." />
            <StepCard number="03" title="Get your Forge Plan" body="A personalized ₹30/day meal plan using foods available in your district. In Hindi and English." />
          </div>
          <p className="mt-8 text-sm font-semibold text-[#1A7A4A]">Trusted by WHO growth standards used in 140+ countries</p>
        </div>
      </motion.section>

      <motion.section {...fadeUp} className="bg-white px-6 py-16 sm:px-10 lg:px-14">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-4xl font-bold text-[#1C2B2B]">Built for the field. Trusted by standards.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              ["🎯 Clinical Accuracy", "WHO 2006 LMS Z-score engine. Matches WHO Anthro software output."],
              ["🔒 100% Private", "All data stays on your device. Nothing is sent to any server."],
              ["🍽️ Forge Plan", "Region-specific recipes under ₹50/day. Bihar gets Bihar food."],
              ["📈 12-Month Trajectory", "See where the child is headed — and how the forge plan changes that."],
              ["🗣️ Hindi First", "Full Hindi interface. Meal names in Hindi. Messages in Hindi."],
              ["📱 Offline PWA", "Installs on Android. Works with no internet after first install."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-[24px] border border-[#E5E7EB] bg-[#F9FAFB] p-6">
                <p className="font-display text-xl font-bold text-[#1C2B2B]">{title}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section {...fadeUp} className="bg-[#F3F4F6] px-6 py-16 sm:px-10 lg:px-14">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-4xl font-bold text-[#1C2B2B]">Designed with field workers in mind</h2>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {[
              "This is exactly what we needed. Simple enough for any ASHA worker to use in 5 minutes.",
              "The forge plan uses foods my family can actually buy. Not expensive supplements.",
              "The offline mode is the game-changer. Our villages have no internet.",
            ].map((quote, index) => (
              <div key={quote} className="rounded-[24px] border border-[#E5E7EB] bg-white p-6">
                <p className="text-sm leading-7 text-slate-700">“{quote}”</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#1A7A4A]">
                  {index === 0 ? "Field Health Worker, Bihar" : index === 1 ? "Parent, Uttar Pradesh" : "Program Officer, UNICEF India"}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-5">
            {["NHM India", "UNICEF", "MoHFW", "WHO", "ICMR"].map((logo) => (
              <div key={logo} className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white px-4 py-5 text-center text-sm font-semibold text-slate-500">
                {logo}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-500">Aligned with national and international standards</p>
        </div>
      </motion.section>

      <motion.section {...fadeUp} className="bg-[linear-gradient(135deg,#0a2e1a_0%,#1A7A4A_100%)] px-6 py-16 text-white sm:px-10 lg:px-14">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="font-display text-4xl font-bold">Start protecting children today</h2>
          <p className="mt-3 text-lg text-white/75">Free for ASHA workers, parents, and NGOs</p>
          <Link to="/signup" className="mt-8 inline-flex rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-[#1A7A4A] transition hover:scale-[1.02]">
            Create Free Account →
          </Link>
          <p className="mt-4 text-sm text-white/75">Create an account, set your state and language, and start assessing immediately.</p>
        </div>
      </motion.section>

      <footer className="bg-[#0b1812] px-6 py-12 text-white sm:px-10 lg:px-14">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-4">
          <div>
            <p className="font-display text-xl font-bold">NutriForge</p>
            <p className="mt-3 text-sm text-white/70">बच्चे की सेहत, हमारी ज़िम्मेदारी</p>
          </div>
          <FooterCol title="Product" items={["Dashboard", "History", "Export Report", "Field Mode"]} />
          <FooterCol title="Standards" items={["WHO 2006", "NFHS-5", "UNICEF Joint Statement", "IMNCI"]} />
          <FooterCol title="Legal" items={["Privacy Policy", "Disclaimer", "Terms of Use"]} />
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-center text-sm text-white/65">
          © 2025 NutriForge. Not a medical device. For reference only — consult a doctor for medical decisions.
        </div>
      </footer>
    </div>
  );
}

function BulletColumn({ title, items, tone }: { title: string; items: string[]; tone: "good" | "bad" }) {
  return (
    <div className="rounded-[24px] border border-[#E5E7EB] bg-[#F9FAFB] p-6">
      <p className="font-display text-2xl font-bold text-[#1C2B2B]">{title}</p>
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex gap-3 text-sm leading-6 text-slate-600">
            <span className={tone === "good" ? "text-[#16A34A]" : "text-[#DC2626]"}>{tone === "good" ? "✓" : "✗"}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepCard({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-[#D1FAE5] bg-white p-6">
      <p className="font-display text-4xl font-bold text-[#1A7A4A]">{number}</p>
      <p className="mt-4 font-display text-2xl font-bold text-[#1C2B2B]">{title}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-semibold text-white">{title}</p>
      <div className="mt-4 space-y-2 text-sm text-white/70">
        {items.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
    </div>
  );
}
