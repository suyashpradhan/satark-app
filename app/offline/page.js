export const metadata = {
  title: "इंटरनेट उपलब्ध नहीं — सतर्क",
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-black text-2xl font-semibold text-white">!</div>
      <h1 className="mt-7 text-3xl font-semibold tracking-[-.025em]">इंटरनेट उपलब्ध नहीं है</h1>
      <p className="mx-auto mt-4 max-w-sm text-lg leading-8 text-[var(--muted)]">लाइव कॉल की जाँच के लिए इंटरनेट चाहिए। अभी कोई गुप्त संख्या, दस्तावेज़ या पैसा साझा न करें।</p>
      <a href="/" className="mt-8 rounded-full bg-black px-6 py-5 text-lg font-semibold text-white">फिर से कोशिश करें</a>
    </main>
  );
}
