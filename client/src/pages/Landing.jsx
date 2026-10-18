import { Link } from 'react-router-dom';
const FEATURES = [
  ['📅', 'Pre-register or same-day', 'Hosts schedule guests ahead of time or register walk-ins in seconds.'],
  ['🔐', 'Area-based access', 'Authorise only the zones a visitor needs, within a set time window.'],
  ['🪪', 'Digital badge', 'Visitors view and download a barcode badge to show at security.'],
  ['📊', 'Admin dashboard', 'Daily visitors, expected arrivals, full history and registered users.']
];
const STEPS = [
  ['1', 'Host registers a visitor', 'Choose the date, time window and areas the guest may enter.'],
  ['2', 'Visitor gets a pass', 'An email with a pass code and badge link arrives instantly.'],
  ['3', 'Security verifies', 'The badge is scanned at the gate; the host is alerted on arrival.']
];
export default function Landing() {
  return (
    <div className="space-y-16">
      <section className="rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-6 py-16 text-center text-white shadow-lg sm:py-24">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Welcome visitors.<br />Keep your building secure.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-indigo-100">
          Pre-register guests, choose exactly which areas they can enter, and give them a scannable badge. Security sees every visit in real time.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/register" className="btn bg-white px-6 py-3 text-indigo-700 hover:bg-indigo-50">Get started</Link>
          <Link to="/pass" className="btn border border-white/40 px-6 py-3 text-white hover:bg-white/10">I'm a visitor</Link>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-center text-2xl font-bold">Everything you need at the front desk</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(([icon, t, p]) => (
            <div key={t} className="card transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-2xl">{icon}</div>
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-slate-500">{p}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-center text-2xl font-bold">How it works</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map(([n, t, p]) => (
            <div key={n} className="card flex gap-4">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-600 font-bold text-white">{n}</div>
              <div><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-slate-500">{p}</p></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}