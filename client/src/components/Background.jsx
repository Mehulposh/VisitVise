export default function Background() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-teal-50 via-sky-50 to-indigo-100 transition-colors duration-500 dark:from-slate-950 dark:via-[#06202a] dark:to-slate-900">
      <div className="absolute -left-24 -top-24 h-96 w-96 animate-blob rounded-full bg-teal-400/40 blur-3xl dark:bg-teal-600/25" />
      <div className="absolute -right-24 top-1/4 h-[28rem] w-[28rem] animate-blob rounded-full bg-sky-400/40 blur-3xl [animation-delay:-6s] dark:bg-sky-700/25" />
      <div className="absolute -bottom-32 left-1/3 h-96 w-96 animate-blob rounded-full bg-indigo-400/30 blur-3xl [animation-delay:-12s] dark:bg-indigo-700/25" />
    </div>
  );
}
