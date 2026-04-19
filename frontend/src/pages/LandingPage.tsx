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
    <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-[#F7F9F7]">
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_76%_18%,rgba(245,166,35,0.34),transparent_25%),radial-gradient(circle_at_16%_78%,rgba(34,197,94,0.26),transparent_28%),linear-gradient(135deg,#061b12_0%,#0f3d2e_48%,#1A7A4A_100%)] px-6 py-16 text-white sm:px-10 lg:px-14 lg:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:72px_72px] opacity-35" />
        <div className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-[#F5A623]/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-10 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />

        <div className="relative mx-auto grid min-h-[calc(100svh-130px)] max-w-7xl gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <motion.div {...fadeUp}>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#F5A623] backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#F5A623] shadow-[0_0_18px_rgba(245,166,35,0.9)]" />
              Trusted child growth screening
            </div>
            <h1 className="mt-7 max-w-4xl whitespace-pre-line font-display text-[52px] font-extrabold leading-[0.9] tracking-[-0.06em] sm:text-[76px]">
              {"Catch malnutrition\nbefore it catches\nyour child."}
            </h1>
            <p className="mt-7 max-w-2xl text-[20px] leading-8 text-white/78">
              A calm, offline-first growth assessment for ASHA workers and parents: enter measurements, see risk clearly, and get a practical ₹30/day food plan families can follow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="inline-flex h-14 items-center rounded-2xl bg-white px-7 text-sm font-bold text-[#0f3d2e] shadow-[0_20px_40px_rgba(0,0,0,0.22)] transition hover:scale-[1.02]">
                Get Started →
              </Link>
              <button type="button" className="inline-flex h-14 items-center rounded-2xl border border-white/35 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-md transition hover:scale-[1.02]">
                Watch 2-min Demo
              </button>
            </div>
            <div className="mt-8 grid max-w-2xl gap-3 text-sm sm:grid-cols-4">
              {["🔒 Private by default", "📋 Standard growth references", "🇮🇳 Built for India", "⚡ Works offline"].map((item) => (
                <span key={item} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white/90 backdrop-blur-md">
                  {item}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeUp} className="relative min-h-[540px]">
            <HeroVisual />
          </motion.div>
        </div>
      </section>

      <motion.section {...fadeUp} className="bg-[#F7F9F7] px-6 py-8 sm:px-10 lg:px-14">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {[
            ["60 sec", "from profile to action plan"],
            ["₹30/day", "plans built around real budgets"],
            ["0–5 yrs", "made for early growth monitoring"],
          ].map(([value, label]) => (
            <div key={value} className="rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
              <p className="font-display text-4xl font-extrabold tracking-[-0.04em] text-[#1A7A4A]">{value}</p>
              <p className="mt-2 text-sm font-medium text-[#6B7280]">{label}</p>
            </div>
          ))}
        </div>
      </motion.section>

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
                "Clear growth assessment in 60 seconds",
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
            <StepCard number="02" title="NutriForge detects risk" body="The app compares the child’s measurements with recognized growth references and gives a clear risk status." />
            <StepCard number="03" title="Get your Forge Plan" body="A personalized ₹30/day meal plan using foods available in your district. In Hindi and English." />
          </div>
          <p className="mt-8 text-sm font-semibold text-[#1A7A4A]">Built around child growth standards used by public health teams worldwide</p>
        </div>
      </motion.section>

      <motion.section {...fadeUp} className="bg-white px-6 py-16 sm:px-10 lg:px-14">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-4xl font-bold text-[#1C2B2B]">Built for the field. Trusted by standards.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              ["🎯 Clear Growth Screening", "Compares age, height, weight, and MUAC to recognized child growth references."],
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

function HeroVisual() {
  return (
    <div className="absolute inset-0">
      <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/5 shadow-[0_30px_120px_rgba(7,35,20,0.28)] backdrop-blur-sm">
        <div className="absolute inset-12 rounded-full border border-dashed border-white/20" />
        <div className="absolute inset-24 rounded-full border border-white/10 bg-emerald-300/10" />
        <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#F5A623_0%,#22c55e_48%,rgba(34,197,94,0)_70%)] opacity-70 blur-2xl" />
      </div>

      <div className="absolute left-10 top-4 animate-[float_7s_ease-in-out_infinite] rounded-[30px] border border-white/20 bg-white/95 p-5 text-[#1C2B2B] shadow-[0_30px_90px_rgba(15,23,42,0.20)]">
        <div className="flex items-center justify-between gap-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#1A7A4A]">Live Review</p>
            <p className="mt-2 font-display text-2xl font-extrabold tracking-[-0.04em]">Needs Attention</p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl">!</div>
        </div>
        <div className="mt-5 h-3 rounded-full bg-gradient-to-r from-[#22c55e] via-[#fbbf24] to-[#ef4444]">
          <div className="ml-[62%] h-5 w-5 -translate-y-1 rounded-full border-4 border-white bg-[#F5A623] shadow-md" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {["Weight", "Height", "MUAC"].map((label, index) => (
            <div key={label} className="rounded-2xl bg-[#F7F9F7] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
              <p className="mt-2 font-display text-xl font-bold text-[#1A7A4A]">{index === 0 ? "7.5" : index === 1 ? "72" : "125"}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-10 right-4 animate-[float_8s_ease-in-out_infinite] rounded-[34px] border border-white/20 bg-white p-5 text-[#1C2B2B] shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-xl font-extrabold">Forge Plan</p>
          <span className="rounded-2xl bg-[#1A7A4A] px-3 py-1 text-xs font-bold text-white">₹35/day</span>
        </div>
        <div className="space-y-3">
          {[
            ["सुबह", "Sattu drink", "₹8"],
            ["दोपहर", "Khichdi", "₹12"],
            ["रात", "Roti + dal", "₹10"],
          ].map(([time, meal, cost]) => (
            <div key={time} className="flex items-center justify-between gap-10 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
              <div>
                <p className="text-xs font-bold text-[#1A7A4A]">{time}</p>
                <p className="text-sm font-semibold">{meal}</p>
              </div>
              <p className="text-xs font-bold text-slate-500">{cost}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute right-20 top-24 animate-[float_9s_ease-in-out_infinite] rounded-[28px] border border-white/20 bg-[#0b1812]/75 p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,0.25)] backdrop-blur-xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#F5A623]">12 month outlook</p>
        <div className="mt-5 flex h-32 items-end gap-3">
          {[42, 56, 70, 86].map((height, index) => (
            <div key={height} className="w-10 rounded-t-2xl bg-gradient-to-t from-[#22c55e] to-[#F5A623]" style={{ height }} />
          ))}
        </div>
        <p className="mt-4 text-sm text-white/75">Without action vs with plan</p>
      </div>

      <div className="absolute bottom-16 left-4 rounded-3xl border border-white/15 bg-white/10 px-5 py-4 text-white backdrop-blur-md">
        <p className="text-xs uppercase tracking-[0.22em] text-white/60">Offline engine</p>
        <p className="mt-1 font-display text-2xl font-bold">Ready</p>
      </div>
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
