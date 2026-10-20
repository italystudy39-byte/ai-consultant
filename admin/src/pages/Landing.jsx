import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { Parallax, ParallaxProvider } from 'react-scroll-parallax';
import {
  ArrowRight, BarChart3, BookOpen, Bot, Code2, FileText, MessageSquare, ShieldCheck, Sparkles, UserPlus, Zap,
} from 'lucide-react';
import { useAuth } from '@/auth.jsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] } }),
};

// Демо-диалог в первом экране: реплики появляются по очереди
const DEMO = [
  { role: 'user', text: 'Сколько стоит доставка в Казань?' },
  { role: 'bot', text: 'Доставка по России — 390 ₽, при заказе от 5 000 ₽ бесплатно. В Казань обычно 2–3 дня.' },
  { role: 'user', text: 'А можно вернуть товар?' },
  { role: 'bot', text: 'Да, в течение 14 дней с момента получения. Оформить возврат можно в личном кабинете.' },
];

const FEATURES = [
  { icon: BookOpen, title: 'Отвечает только по вашей базе', text: 'Загрузите FAQ, тексты, PDF или DOCX. Бот не выдумывает: если ответа нет в базе, он честно скажет об этом.' },
  { icon: Code2, title: 'Виджет одной строкой', text: 'Скопируйте код из настроек и вставьте на сайт. Работает на любой платформе, на телефоне открывается на весь экран.' },
  { icon: UserPlus, title: 'Собирает заявки', text: 'Когда бот не знает ответа, он предлагает посетителю оставить контакт. Вы получаете лида, а не потерянного клиента.' },
  { icon: BarChart3, title: 'Аналитика вопросов', text: 'Видно, о чём спрашивают чаще всего и на что бот не смог ответить. Так понятно, что добавить в базу знаний.' },
  { icon: MessageSquare, title: 'История диалогов', text: 'Все переписки сохраняются: поиск, фильтры и выгрузка в Excel в пару кликов.' },
  { icon: ShieldCheck, title: 'Данные изолированы', text: 'База знаний и диалоги каждой компании хранятся отдельно и недоступны другим клиентам.' },
];

const STEPS = [
  { icon: FileText, title: 'Загрузите знания', text: 'Вопросы и ответы, описания услуг, прайс, документы.' },
  { icon: Sparkles, title: 'Настройте бота', text: 'Имя, приветствие, цвет виджета под ваш бренд.' },
  { icon: Zap, title: 'Вставьте на сайт', text: 'Одна строка кода, и консультант отвечает клиентам 24/7.' },
];

export default function Landing() {
  return (
    <ParallaxProvider>
      <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
        <Header />
        <Hero />
        <Steps />
        <Features />
        <WidgetSection />
        <Cta />
        <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} AI-консультант
        </footer>
      </div>
    </ParallaxProvider>
  );
}

function Header() {
  const { me } = useAuth();
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/60 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-white">
          <span className="grid size-8 place-items-center rounded-lg bg-indigo-500"><Bot className="size-5" /></span>
          AI-консультант
        </Link>
        {me ? (
          <Button asChild><Link to="/">Панель управления</Link></Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="text-slate-200 hover:bg-white/10 hover:text-white">
              <Link to="/login">Войти</Link>
            </Button>
            <Button asChild className="hidden sm:inline-flex">
              <Link to="/login?mode=register">Попробовать</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const chatY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className="relative isolate overflow-hidden bg-slate-950 pb-24 pt-32 text-white sm:pt-40">
      {/* Параллакс-фон: светящиеся пятна и сетка двигаются с разной скоростью */}
      <Parallax speed={-20} className="pointer-events-none absolute -left-32 -top-24 -z-10">
        <div className="size-[28rem] rounded-full bg-indigo-600/40 blur-3xl" />
      </Parallax>
      <Parallax speed={-10} className="pointer-events-none absolute -right-24 top-40 -z-10">
        <div className="size-[22rem] rounded-full bg-fuchsia-500/30 blur-3xl" />
      </Parallax>
      <Parallax speed={-5} className="pointer-events-none absolute inset-0 -z-20">
        <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </Parallax>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2">
        <motion.div style={{ opacity: textOpacity }} initial="hidden" animate="show">
          <motion.div variants={fadeUp} custom={0}>
            <Badge variant="outline" className="border-white/20 bg-white/5 text-indigo-200">
              <Sparkles /> На базе Claude
            </Badge>
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            AI-консультант, который знает ваш бизнес
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="mt-6 max-w-xl text-lg text-slate-300">
            Загрузите базу знаний, и чат-бот на вашем сайте будет отвечать клиентам круглосуточно.
            Точно, по делу и только на основе ваших материалов.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/login?mode=register">Создать бота бесплатно <ArrowRight /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              <a href="#how">Как это работает</a>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div style={{ y: chatY }}>
          <DemoChat />
        </motion.div>
      </div>
    </section>
  );
}

function DemoChat() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setCount(DEMO.length);
      return undefined;
    }
    // показываем реплики по одной, затем начинаем заново
    const t = setTimeout(() => setCount((c) => (c >= DEMO.length ? 0 : c + 1)), count >= DEMO.length ? 4000 : 1400);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: 2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white text-slate-900 shadow-2xl shadow-indigo-900/40"
    >
      <div className="flex items-center gap-3 bg-indigo-600 px-4 py-3 text-white">
        <span className="grid size-9 place-items-center rounded-full bg-white/20"><Bot className="size-5" /></span>
        <div>
          <div className="text-sm font-semibold">Консультант магазина</div>
          <div className="text-xs text-indigo-100">онлайн · отвечает сразу</div>
        </div>
      </div>
      <div className="flex h-80 flex-col justify-end gap-3 overflow-hidden bg-slate-50 p-4">
        <Bubble role="bot" text="Здравствуйте! Чем могу помочь?" />
        <AnimatePresence initial={false}>
          {DEMO.slice(0, count).map((m, i) => <Bubble key={`${i}-${m.text}`} {...m} animated />)}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function Bubble({ role, text, animated }) {
  const mine = role === 'user';
  const cls = `max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
    mine ? 'self-end rounded-br-sm bg-indigo-600 text-white' : 'self-start rounded-bl-sm bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
  }`;
  if (!animated) return <div className={cls}>{text}</div>;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className={cls}
    >
      {text}
    </motion.div>
  );
}

function SectionTitle({ eyebrow, title, text }) {
  return (
    <motion.div
      initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}
      className="mx-auto max-w-2xl text-center"
    >
      <motion.div variants={fadeUp} className="text-sm font-semibold uppercase tracking-wider text-primary">{eyebrow}</motion.div>
      <motion.h2 variants={fadeUp} custom={1} className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</motion.h2>
      {text && <motion.p variants={fadeUp} custom={2} className="mt-4 text-muted-foreground">{text}</motion.p>}
    </motion.div>
  );
}

function Steps() {
  return (
    <section id="how" className="scroll-mt-16 py-24">
      <div className="mx-auto max-w-6xl px-4">
        <SectionTitle eyebrow="Как это работает" title="Запуск за 10 минут" text="Без программистов и сложных настроек." />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div key={s.title} variants={fadeUp} custom={i} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-lg bg-accent text-primary"><s.icon className="size-5" /></span>
                    <span className="text-sm font-medium text-muted-foreground">Шаг {i + 1}</span>
                  </div>
                  <CardTitle className="mt-3 text-lg">{s.title}</CardTitle>
                  <CardDescription>{s.text}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="relative overflow-hidden bg-slate-50 py-24">
      <Parallax speed={8} className="pointer-events-none absolute -right-40 top-10">
        <div className="size-96 rounded-full bg-indigo-200/50 blur-3xl" />
      </Parallax>
      <div className="relative mx-auto max-w-6xl px-4">
        <SectionTitle eyebrow="Возможности" title="Всё, что нужно для поддержки клиентов" />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title} variants={fadeUp} custom={i % 3} initial="hidden" whileInView="show"
              viewport={{ once: true }} whileHover={{ y: -4 }}
            >
              <Card className="h-full">
                <CardContent>
                  <f.icon className="size-6 text-primary" />
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WidgetSection() {
  return (
    <section className="py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2">
        <SectionTitleLeft />
        <Parallax speed={6} rotate={[-3, 3]}>
          <div className="overflow-hidden rounded-xl bg-slate-950 shadow-xl ring-1 ring-slate-800">
            <div className="flex gap-1.5 border-b border-slate-800 px-4 py-3">
              <span className="size-3 rounded-full bg-red-400/80" />
              <span className="size-3 rounded-full bg-amber-400/80" />
              <span className="size-3 rounded-full bg-emerald-400/80" />
            </div>
            <pre className="overflow-x-auto p-5 text-sm leading-relaxed text-slate-300"><code>
              <span className="text-slate-500">{'<!-- вставьте перед </body> -->'}</span>{'\n'}
              <span className="text-pink-400">{'<script'}</span>{' '}
              <span className="text-sky-300">src</span>=<span className="text-emerald-300">"…/widget.js"</span>{'\n        '}
              <span className="text-sky-300">data-key</span>=<span className="text-emerald-300">"pk_ваш_ключ"</span>{' '}
              <span className="text-sky-300">async</span><span className="text-pink-400">{'></script>'}</span>
            </code></pre>
          </div>
        </Parallax>
      </div>
    </section>
  );
}

function SectionTitleLeft() {
  return (
    <motion.div initial="hidden" whileInView="show" viewport={{ once: true }}>
      <motion.div variants={fadeUp} className="text-sm font-semibold uppercase tracking-wider text-primary">Установка</motion.div>
      <motion.h2 variants={fadeUp} custom={1} className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
        Одна строка кода на вашем сайте
      </motion.h2>
      <motion.p variants={fadeUp} custom={2} className="mt-4 text-muted-foreground">
        Подходит для Tilda, WordPress, Bitrix и любого другого сайта. Виджет подстраивается под ваш фирменный цвет,
        запоминает диалог при перезагрузке страницы и удобно открывается на телефоне.
      </motion.p>
    </motion.div>
  );
}

function Cta() {
  return (
    <section className="px-4 pb-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 px-6 py-16 text-center text-white"
      >
        <Parallax speed={-6} className="pointer-events-none absolute -left-10 -top-10">
          <div className="size-56 rounded-full bg-white/10 blur-2xl" />
        </Parallax>
        <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">Попробуйте на своём сайте</h2>
        <p className="relative mx-auto mt-4 max-w-xl text-indigo-100">
          Зарегистрируйтесь, добавьте пару вопросов и ответов и посмотрите, как бот общается с клиентами.
        </p>
        <Button asChild size="lg" variant="secondary" className="relative mt-8">
          <Link to="/login?mode=register">Начать бесплатно <ArrowRight /></Link>
        </Button>
      </motion.div>
    </section>
  );
}
