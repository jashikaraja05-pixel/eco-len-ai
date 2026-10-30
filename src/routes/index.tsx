import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Leaf, LogOut, ScanLine, LayoutDashboard, History, BookOpen, Upload, Camera, RotateCcw,
  Loader2, Sparkles, CheckCircle2, Recycle, AlertTriangle, Trash2, Cpu,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { classifyWaste, type ScanResult } from "@/lib/classify.functions";
import {
  BINS, addScan, getHistory, getSession, logIn, setSession, signUp, stats, type Scan, type User,
} from "@/lib/eco-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EcoLens AI — Smart Waste Segregation" },
      { name: "description", content: "Scan any waste item with AI and learn exactly which bin it belongs in." },
      { property: "og:title", content: "EcoLens AI — Smart Waste Segregation" },
      { property: "og:description", content: "Scan any waste item with AI and learn exactly which bin it belongs in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

type Tab = "scan" | "dashboard" | "history" | "learn";

function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<Scan[]>([]);
  const [tab, setTab] = useState<Tab>("scan");

  useEffect(() => {
    const u = getSession();
    setUser(u);
    if (u) setHistory(getHistory(u.email));
    setReady(true);
  }, []);

  const login = (u: User) => {
    setSession(u);
    setUser(u);
    setHistory(getHistory(u.email));
    setTab("scan");
    toast.success(`Welcome, ${u.name}`);
  };
  const logout = () => {
    setSession(null);
    setUser(null);
    setHistory([]);
  };

  if (!ready) return null;
  if (!user) return <AuthScreen onLogin={login} />;

  return (
    <div className="min-h-screen">
      <Nav tab={tab} setTab={setTab} user={user} onLogout={logout} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div key={tab} className="fade-up">
          {tab === "scan" && (
            <Scanner onSaved={(s) => setHistory(addScan(user.email, s))} />
          )}
          {tab === "dashboard" && <Dashboard history={history} />}
          {tab === "history" && <HistoryView history={history} />}
          {tab === "learn" && <Learn />}
        </div>
      </main>
    </div>
  );
}

/* ---------------- Nav ---------------- */
function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span className="bg-ocean grid size-9 place-items-center rounded-xl text-primary-foreground">
        <Leaf className="size-5" />
      </span>
      <span className="font-display text-lg font-bold">EcoLens <span className="text-primary">AI</span></span>
    </div>
  );
}

function Nav({ tab, setTab, user, onLogout }: { tab: Tab; setTab: (t: Tab) => void; user: User; onLogout: () => void }) {
  const items: { id: Tab; label: string; icon: typeof Leaf }[] = [
    { id: "scan", label: "Scan Waste", icon: ScanLine },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "history", label: "History", icon: History },
    { id: "learn", label: "Learn Hub", icon: BookOpen },
  ];
  return (
    <header className="glass sticky top-0 z-40 rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <Brand />
        <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:ml-6 sm:w-auto">
          {items.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                tab === id ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground md:inline">{user.email}</span>
          <Button variant="outline" size="sm" className="rounded-full" onClick={onLogout}>
            <LogOut className="size-4" /> Log Out
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ---------------- Auth ---------------- */
const DEMO_ACCOUNTS = [
  { name: "Jashika Rajasekaran", email: "jashika.student@gmail.com" },
  { name: "Demo Reviewer", email: "eco.reviewer@gmail.com" },
];

function AuthScreen({ onLogin }: { onLogin: (u: User) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [google, setGoogle] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");
      onLogin(mode === "signup" ? signUp(name.trim() || email.split("@")[0], email.trim(), password) : logIn(email.trim(), password));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="bg-ocean relative hidden flex-col justify-between p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2 text-xl font-bold"><Leaf /> EcoLens AI</div>
        <div>
          <h1 className="text-5xl font-bold leading-tight">Point. Scan.<br />Segregate right.</h1>
          <p className="mt-4 max-w-md text-lg opacity-90">AI vision that tells you exactly which bin every piece of waste belongs in.</p>
        </div>
        <p className="text-sm opacity-75">Smart Waste Segregation · College Project</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="glass fade-up w-full max-w-md rounded-3xl p-8">
          <div className="lg:hidden"><Brand /></div>
          <h2 className="mt-4 text-2xl font-bold lg:mt-0">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Track your segregation impact over time.</p>
          <Button variant="outline" className="mt-6 h-11 w-full rounded-xl" onClick={() => setGoogle(true)}>
            <GoogleIcon /> Continue with Google
          </Button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && <Input className="h-11 rounded-xl" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />}
            <Input className="h-11 rounded-xl" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input className="h-11 rounded-xl" type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit" className="h-11 w-full rounded-xl">{mode === "login" ? "Log In" : "Create Account"}</Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button className="font-semibold text-primary" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
              {mode === "login" ? "Create account" : "Log in"}
            </button>
          </p>
        </div>
      </div>
      <Dialog open={google} onOpenChange={setGoogle}>
        <DialogContent className="rounded-3xl sm:max-w-sm">
          <DialogHeader className="items-center text-center">
            <GoogleIcon />
            <DialogTitle>Choose an account</DialogTitle>
            <DialogDescription>to continue to EcoLens AI</DialogDescription>
          </DialogHeader>
          <div className="divide-y rounded-2xl border">
            {DEMO_ACCOUNTS.map((a) => (
              <button key={a.email} onClick={() => { setGoogle(false); onLogin({ ...a, provider: "google" }); }}
                className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-secondary">
                <span className="bg-ocean grid size-9 place-items-center rounded-full text-sm font-bold text-primary-foreground">{a.name[0]}</span>
                <span><span className="block text-sm font-medium">{a.name}</span><span className="block text-xs text-muted-foreground">{a.email}</span></span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/* ---------------- Scanner ---------------- */
function shrink(src: string, max = 768): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => rej(new Error("Could not read this image."));
    img.src = src;
  });
}

function Scanner({ onSaved }: { onSaved: (s: Scan) => void }) {
  const [mode, setMode] = useState<"upload" | "camera">("upload");
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stopCam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  };
  useEffect(() => stopCam, []);

  const startCam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = s;
      setCamOn(true);
      requestAnimationFrame(() => { if (videoRef.current) { videoRef.current.srcObject = s; void videoRef.current.play(); } });
    } catch {
      toast.error("Camera access was denied or is unavailable.");
    }
  };

  const capture = async () => {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    setImage(await shrink(c.toDataURL("image/jpeg", 0.9)));
    stopCam();
  };

  const onFile = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose an image file.");
    const r = new FileReader();
    r.onload = async () => { try { setImage(await shrink(r.result as string)); setResult(null); } catch (e) { toast.error((e as Error).message); } };
    r.readAsDataURL(f);
  };

  const analyze = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const res = await classifyWaste({ data: { image } });
      setResult(res);
      onSaved({ ...res, image, id: crypto.randomUUID(), createdAt: Date.now() });
    } catch (e) {
      toast.error((e as Error).message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    stopCam();
    setImage(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const switchMode = (m: "upload" | "camera") => { reset(); setMode(m); };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">AI Waste Vision Scanner</h1>
          <p className="mt-1 text-muted-foreground">Upload or capture a photo — we'll tell you which bin it goes in.</p>
        </div>
        {result && <Button onClick={reset} size="lg" className="fade-up rounded-full"><RotateCcw className="size-4" /> New Scan</Button>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-3xl p-6">
          <div className="mb-5 grid grid-cols-2 rounded-full bg-muted p-1">
            {(["upload", "camera"] as const).map((m) => (
              <button key={m} onClick={() => switchMode(m)}
                className={`flex items-center justify-center gap-2 rounded-full py-2 text-sm font-medium transition-all ${mode === m ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}>
                {m === "upload" ? <Upload className="size-4" /> : <Camera className="size-4" />}
                {m === "upload" ? "File Upload" : "Live Camera"}
              </button>
            ))}
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted/50">
            {image ? (
              <img src={image} alt="Waste item preview" className="size-full object-cover" />
            ) : mode === "camera" && camOn ? (
              <video ref={videoRef} playsInline muted className="size-full object-cover" />
            ) : mode === "upload" ? (
              <button onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
                className="flex size-full flex-col items-center justify-center gap-3 text-muted-foreground transition-colors hover:text-primary">
                <Upload className="size-10" /><span className="font-medium">Click or drop an image</span>
              </button>
            ) : (
              <button onClick={startCam} className="flex size-full flex-col items-center justify-center gap-3 text-muted-foreground transition-colors hover:text-primary">
                <Camera className="size-10" /><span className="font-medium">Start camera</span>
              </button>
            )}
            {loading && (
              <div className="absolute inset-0 grid place-items-center bg-foreground/40 backdrop-blur-sm">
                <div className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium"><Loader2 className="size-4 animate-spin" /> Analyzing…</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

          <div className="mt-5 flex gap-3">
            {mode === "camera" && camOn && !image && <Button className="flex-1 rounded-xl" onClick={capture}><Camera className="size-4" /> Capture</Button>}
            {image && !result && (
              <Button className="h-11 flex-1 rounded-xl" onClick={analyze} disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Analyze Waste
              </Button>
            )}
            {image && !result && !loading && <Button variant="outline" className="h-11 rounded-xl" onClick={reset}>Clear</Button>}
          </div>
        </div>

        {result ? <ResultCard r={result} /> : (
          <div className="glass flex flex-col items-center justify-center rounded-3xl p-10 text-center text-muted-foreground">
            <ScanLine className="size-12 text-primary" />
            <p className="mt-4 max-w-xs">Your classification, confidence score and disposal steps will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function CategoryBadge({ c }: { c: ScanResult["category"] }) {
  const b = BINS[c];
  return <span className={`${b.tone} inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-primary-foreground`}>{b.label} · {b.bin}</span>;
}

function ResultCard({ r }: { r: ScanResult }) {
  return (
    <div className="glass fade-up rounded-3xl p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detected item</p>
      <h2 className="mt-1 text-2xl font-bold">{r.item}</h2>
      <div className="mt-3"><CategoryBadge c={r.category} /></div>
      <p className="mt-2 text-sm font-medium text-primary">{r.bin}</p>
      <div className="mt-5">
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Confidence</span><span className="font-semibold">{r.confidence}%</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="bg-ocean h-full rounded-full transition-all duration-700" style={{ width: `${r.confidence}%` }} /></div>
      </div>
      <div className="mt-5 rounded-2xl bg-secondary/70 p-4 text-sm"><p className="mb-1 font-semibold">Why this bin?</p><p className="text-secondary-foreground">{r.reasoning}</p></div>
      <p className="mt-5 font-semibold">Disposal guidance</p>
      <ol className="mt-2 space-y-2">
        {r.steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />{s}</li>
        ))}
      </ol>
    </div>
  );
}

/* ---------------- Dashboard ---------------- */
function Dashboard({ history }: { history: Scan[] }) {
  const s = stats(history);
  const cards = [
    { label: "Total Scans", value: s.total, icon: ScanLine, tone: "bg-ocean" },
    { label: "Organic", value: s.organic, icon: Leaf, tone: "bg-bin-green" },
    { label: "Recyclable", value: s.recyclable, icon: Recycle, tone: "bg-bin-blue" },
    { label: "Hazardous", value: s.hazardous, icon: AlertTriangle, tone: "bg-bin-red" },
    { label: "Residual", value: s.residual, icon: Trash2, tone: "bg-bin-black" },
  ];
  return (
    <section>
      <h1 className="text-3xl font-bold">Eco Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Your segregation impact at a glance.</p>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="glass rounded-3xl p-5 transition-transform hover:-translate-y-1">
            <span className={`${tone} grid size-10 place-items-center rounded-xl text-primary-foreground`}><Icon className="size-5" /></span>
            <p className="mt-4 text-3xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      {s.total > 0 && (
        <div className="glass mt-6 rounded-3xl p-6">
          <p className="font-semibold">Category split</p>
          <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-muted">
            {cards.slice(1).map((c) => c.value > 0 && <div key={c.label} className={c.tone} style={{ width: `${(c.value / s.total) * 100}%` }} title={c.label} />)}
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------------- History ---------------- */
function HistoryView({ history }: { history: Scan[] }) {
  return (
    <section>
      <h1 className="text-3xl font-bold">Scan History</h1>
      <p className="mt-1 text-muted-foreground">{history.length} scan{history.length === 1 ? "" : "s"} saved to your account.</p>
      {history.length === 0 ? (
        <div className="glass mt-6 rounded-3xl p-10 text-center text-muted-foreground">No scans yet — head to Scan Waste to start.</div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {history.map((h) => (
            <article key={h.id} className="glass overflow-hidden rounded-3xl">
              <img src={h.image} alt={h.item} className="aspect-video w-full object-cover" />
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge c={h.category} />
                  <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</span>
                </div>
                <h3 className="mt-3 font-semibold">{h.item}</h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {h.steps.slice(0, 3).map((s, i) => <li key={i}>• {s}</li>)}
                </ul>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------- Learn ---------------- */
function Learn() {
  const bins = [
    { tone: "bg-bin-green", icon: Leaf, title: "Green Bin", sub: "Organic / Wet Waste", items: ["Food scraps", "Fruit & vegetable peels", "Tea leaves, flowers", "Natural garden waste"] },
    { tone: "bg-bin-blue", icon: Recycle, title: "Blue Bin", sub: "Dry Recyclable Waste", items: ["Clean plastic bottles", "Paper & newspapers", "Cardboard boxes", "Rinsed metal cans"] },
    { tone: "bg-bin-red", icon: Cpu, title: "Red Bin", sub: "Hazardous & E-Waste", items: ["Aerosol spray cans", "Batteries", "Circuit boards & phones", "Chemical tins, paint"] },
    { tone: "bg-bin-black", icon: Trash2, title: "Black Bin", sub: "Residual Waste", items: ["Multi-layer wrappers", "Biscuit & chip packets", "Non-recyclable laminates", "Soiled tissues"] },
  ];
  const [open, setOpen] = useState<string | null>(bins[0].title);
  return (
    <section>
      <h1 className="text-3xl font-bold">Segregation Rules Hub</h1>
      <p className="mt-1 text-muted-foreground">Tap a bin to see what belongs inside.</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {bins.map(({ tone, icon: Icon, title, sub, items }) => {
          const active = open === title;
          return (
            <button key={title} onClick={() => setOpen(active ? null : title)} className={`glass rounded-3xl p-6 text-left transition-all hover:-translate-y-1 ${active ? "ring-2 ring-primary" : ""}`}>
              <div className="flex items-center gap-4">
                <span className={`${tone} grid size-12 place-items-center rounded-2xl text-primary-foreground`}><Icon className="size-6" /></span>
                <div><h3 className="text-lg font-bold">{title}</h3><p className="text-sm text-muted-foreground">{sub}</p></div>
              </div>
              {active && (
                <ul className="fade-up mt-5 grid grid-cols-2 gap-2">
                  {items.map((i) => <li key={i} className="rounded-xl bg-secondary/70 px-3 py-2 text-sm">{i}</li>)}
                </ul>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
