import { TranslationFormState } from "@/app/components/resume-translation/types";

interface TranslationPreviewProps {
  state: TranslationFormState;
  translated: boolean;
  aiTranslation?: string;
}

/* ─── Types ─── */
interface SectionLabels {
  summary: string;
  experience: string;
  education: string;
  skills: string;
}

interface ExperienceEntry {
  role: string;
  company: string;
  period: string;
  bullets: string[];
}

interface LanguageTranslation {
  sections: SectionLabels;
  titleSenior: string;
  titleJunior: string;
  summary: string;
  bullets0: string[];
  bullets1: string[];
  education: string;
  skills: string[];
}

/* ─── Original (English) ─── */
const ORIGINAL_SECTIONS: SectionLabels = {
  summary:    "Summary",
  experience: "Experience",
  education:  "Education",
  skills:     "Skills",
};

const ORIGINAL_EXPERIENCE: ExperienceEntry[] = [
  {
    role: "Senior Product Designer",
    company: "Technology Company",
    period: "Mar 2022 – Present",
    bullets: [
      "Led redesign of developer dashboard, improving onboarding by 40%",
      "Built design system used across 12 product surfaces",
      "Drove 34% increase in deployment success rate through UX improvements",
    ],
  },
  {
    role: "Product Designer",
    company: "Software Startup",
    period: "Jun 2020 – Feb 2022",
    bullets: [
      "Designed core issue tracking and project management workflows",
      "Reduced onboarding time by 40% through progressive disclosure redesign",
      "Collaborated with engineering on React component library",
    ],
  },
];

const ORIGINAL_SUMMARY =
  "Senior Product Designer with 6+ years of experience building AI-powered digital products at scale. Led design systems and zero-to-one products at Vercel and Linear, driving measurable improvements in user onboarding and engagement.";

const ORIGINAL_EDUCATION =
  "Bachelor of Arts, Cognitive Science & HCI — UC Berkeley, 2016–2020";

const ORIGINAL_SKILLS = [
  "Figma", "UX Research", "Design Systems", "Prototyping", "React", "A/B Testing",
];

/* ─── Full translation table ─── */
const TRANSLATIONS: Partial<Record<string, LanguageTranslation>> = {
  "German": {
    sections: { summary: "Profil", experience: "Berufserfahrung", education: "Ausbildung", skills: "Kenntnisse" },
    titleSenior: "Senior Product Designerin",
    titleJunior: "Product Designerin",
    summary:
      "Erfahrene Senior Product Designerin mit über 6 Jahren Berufserfahrung in der Entwicklung KI-gestützter digitaler Produkte. Aufbau von Design-Systemen und Zero-to-One-Produkten bei Vercel und Linear mit messbaren Verbesserungen im Nutzer-Onboarding.",
    bullets0: [
      "Neugestaltung des Entwickler-Dashboards geleitet – Onboarding um 40 % verbessert",
      "Design-System für 12 Produktoberflächen aufgebaut und gepflegt",
      "34 % höhere Deployment-Erfolgsrate durch UX-Verbesserungen erzielt",
    ],
    bullets1: [
      "Kern-Workflows für Issue-Tracking und Projektmanagement entwickelt",
      "Onboarding-Zeit durch progressives Disclosure-Redesign um 40 % reduziert",
      "Mit dem Engineering-Team an der React-Komponentenbibliothek mitgewirkt",
    ],
    education: "Bachelor of Arts, Kognitionswissenschaft & HCI — UC Berkeley, 2016–2020",
    skills: ["Figma", "UX-Forschung", "Design-Systeme", "Prototyping", "React", "A/B-Tests"],
  },
  "Spanish": {
    sections: { summary: "Perfil Profesional", experience: "Experiencia Laboral", education: "Educación", skills: "Habilidades" },
    titleSenior: "Diseñadora de Producto Senior",
    titleJunior: "Diseñadora de Producto",
    summary:
      "Diseñadora de producto senior con más de 6 años de experiencia creando productos digitales impulsados por IA a gran escala. Lideré sistemas de diseño y productos de cero a uno en Vercel y Linear, con mejoras medibles en el proceso de incorporación de usuarios.",
    bullets0: [
      "Lideré el rediseño del panel de desarrolladores, mejorando el onboarding en un 40%",
      "Construí el sistema de diseño utilizado en 12 superficies de producto",
      "Aumenté la tasa de éxito de despliegues en un 34% mediante mejoras de UX",
    ],
    bullets1: [
      "Diseñé los flujos principales de seguimiento de tareas y gestión de proyectos",
      "Reduje el tiempo de onboarding un 40% mediante un rediseño de divulgación progresiva",
      "Colaboré con ingeniería en la biblioteca de componentes React",
    ],
    education: "Licenciatura en Artes, Ciencia Cognitiva e HCI — UC Berkeley, 2016–2020",
    skills: ["Figma", "Investigación UX", "Sistemas de Diseño", "Prototipado", "React", "Pruebas A/B"],
  },
  "French": {
    sections: { summary: "Résumé", experience: "Expérience Professionnelle", education: "Formation", skills: "Compétences" },
    titleSenior: "Designer Produit Senior",
    titleJunior: "Designer Produit",
    summary:
      "Designer produit senior avec plus de 6 ans d'expérience dans la création de produits numériques propulsés par l'IA. J'ai dirigé des systèmes de design et des produits de zéro à un chez Vercel et Linear, avec des améliorations mesurables de l'intégration utilisateur.",
    bullets0: [
      "Dirigé la refonte du tableau de bord développeur, améliorant l'intégration de 40 %",
      "Construit le design system utilisé sur 12 surfaces produit",
      "Augmenté le taux de réussite des déploiements de 34 % grâce aux améliorations UX",
    ],
    bullets1: [
      "Conçu les workflows de suivi des tickets et de gestion de projet",
      "Réduit le temps d'intégration de 40 % grâce à une refonte par divulgation progressive",
      "Collaboré avec l'ingénierie sur la bibliothèque de composants React",
    ],
    education: "Licence en Arts, Sciences Cognitives et IHM — UC Berkeley, 2016–2020",
    skills: ["Figma", "Recherche UX", "Design Systems", "Prototypage", "React", "Tests A/B"],
  },
  "Ukrainian": {
    sections: { summary: "Профіль", experience: "Досвід роботи", education: "Освіта", skills: "Навички" },
    titleSenior: "Старший дизайнер продукту",
    titleJunior: "Дизайнер продукту",
    summary:
      "Старший дизайнер продукту з понад 6-річним досвідом створення цифрових продуктів на базі штучного інтелекту. Керувала системами дизайну та продуктами від нуля до одиниці у Vercel та Linear, досягаючи вимірних покращень у процесі онбордингу.",
    bullets0: [
      "Керувала редизайном інформаційної панелі — покращила онбординг на 40%",
      "Побудувала дизайн-систему для 12 продуктових інтерфейсів",
      "Підвищила успішність розгортання на 34% завдяки покращенню UX",
    ],
    bullets1: [
      "Розробила ключові робочі процеси відстеження задач та управління проєктами",
      "Скоротила час онбордингу на 40% через редизайн прогресивного розкриття",
      "Співпрацювала з командою розробників над бібліотекою компонентів React",
    ],
    education: "Бакалавр мистецтв, Когнітивні науки та HCI — UC Berkeley, 2016–2020",
    skills: ["Figma", "UX-дослідження", "Дизайн-системи", "Прототипування", "React", "A/B-тестування"],
  },
  "Russian": {
    sections: { summary: "Профиль", experience: "Опыт работы", education: "Образование", skills: "Навыки" },
    titleSenior: "Старший дизайнер продукта",
    titleJunior: "Дизайнер продукта",
    summary:
      "Старший дизайнер продукта с более чем 6-летним опытом создания цифровых продуктов на основе ИИ. Руководила дизайн-системами и продуктами «с нуля» в Vercel и Linear, достигая измеримых улучшений в адаптации пользователей.",
    bullets0: [
      "Руководила редизайном дашборда разработчиков — онбординг улучшился на 40%",
      "Построила дизайн-систему, применяемую на 12 поверхностях продукта",
      "Увеличила успешность деплоев на 34% за счёт улучшений UX",
    ],
    bullets1: [
      "Разработала ключевые рабочие процессы отслеживания задач и управления проектами",
      "Сократила время онбординга на 40% с помощью редизайна прогрессивного раскрытия",
      "Сотрудничала с командой разработчиков над библиотекой компонентов React",
    ],
    education: "Бакалавр искусств, Когнитивные науки и HCI — UC Berkeley, 2016–2020",
    skills: ["Figma", "UX-исследования", "Дизайн-системы", "Прототипирование", "React", "A/B-тестирование"],
  },
  "Polish": {
    sections: { summary: "Profil zawodowy", experience: "Doświadczenie zawodowe", education: "Wykształcenie", skills: "Umiejętności" },
    titleSenior: "Starszy Projektant Produktu",
    titleJunior: "Projektant Produktu",
    summary:
      "Starszy projektant produktu z ponad 6-letnim doświadczeniem w tworzeniu cyfrowych produktów opartych na AI. Kierowałam systemami projektowania i produktami od zera w Vercel i Linear, osiągając mierzalne poprawy we wdrażaniu użytkowników.",
    bullets0: [
      "Przeprowadziłam redesign panelu deweloperskiego, poprawiając onboarding o 40%",
      "Zbudowałam system projektowania używany na 12 powierzchniach produktu",
      "Zwiększyłam wskaźnik sukcesu wdrożeń o 34% poprzez ulepszenia UX",
    ],
    bullets1: [
      "Zaprojektowałam główne przepływy śledzenia zadań i zarządzania projektami",
      "Zmniejszyłam czas wdrożenia o 40% poprzez redesign stopniowego ujawniania",
      "Współpracowałam z inżynierami przy bibliotece komponentów React",
    ],
    education: "Licencjat z Nauk o Poznaniu i HCI — UC Berkeley, 2016–2020",
    skills: ["Figma", "Badania UX", "Systemy Projektowania", "Prototypowanie", "React", "Testy A/B"],
  },
  "Italian": {
    sections: { summary: "Profilo Professionale", experience: "Esperienza Lavorativa", education: "Formazione", skills: "Competenze" },
    titleSenior: "Senior Product Designer",
    titleJunior: "Product Designer",
    summary:
      "Senior Product Designer con oltre 6 anni di esperienza nella creazione di prodotti digitali basati su AI su larga scala. Ho guidato sistemi di design e prodotti da zero a uno presso Vercel e Linear, con miglioramenti misurabili nell'onboarding degli utenti.",
    bullets0: [
      "Guidato la riprogettazione della dashboard sviluppatori, migliorando l'onboarding del 40%",
      "Costruito il design system utilizzato su 12 superfici di prodotto",
      "Aumentato il tasso di successo dei deployment del 34% tramite miglioramenti UX",
    ],
    bullets1: [
      "Progettato i flussi principali di tracciamento issue e gestione progetti",
      "Ridotto il tempo di onboarding del 40% tramite un redesign a disclosure progressiva",
      "Collaborato con l'engineering sulla libreria di componenti React",
    ],
    education: "Laurea in Arti, Scienze Cognitive e HCI — UC Berkeley, 2016–2020",
    skills: ["Figma", "Ricerca UX", "Design System", "Prototipazione", "React", "Test A/B"],
  },
  "Portuguese": {
    sections: { summary: "Perfil Profissional", experience: "Experiência Profissional", education: "Formação Acadêmica", skills: "Competências" },
    titleSenior: "Designer de Produto Sênior",
    titleJunior: "Designer de Produto",
    summary:
      "Designer de produto sênior com mais de 6 anos de experiência na criação de produtos digitais baseados em IA em larga escala. Lideramos sistemas de design e produtos do zero em Vercel e Linear, com melhorias mensuráveis no onboarding de usuários.",
    bullets0: [
      "Liderou o redesign do painel do desenvolvedor, melhorando o onboarding em 40%",
      "Construiu o design system usado em 12 superfícies de produto",
      "Aumentou a taxa de sucesso de deploys em 34% com melhorias de UX",
    ],
    bullets1: [
      "Projetou os principais fluxos de rastreamento de issues e gestão de projetos",
      "Reduziu o tempo de onboarding em 40% com redesign de divulgação progressiva",
      "Colaborou com a engenharia na biblioteca de componentes React",
    ],
    education: "Bacharelado em Artes, Ciências Cognitivas e HCI — UC Berkeley, 2016–2020",
    skills: ["Figma", "Pesquisa UX", "Design Systems", "Prototipagem", "React", "Testes A/B"],
  },
  "Dutch": {
    sections: { summary: "Profiel", experience: "Werkervaring", education: "Opleiding", skills: "Vaardigheden" },
    titleSenior: "Senior Product Designer",
    titleJunior: "Product Designer",
    summary:
      "Senior Product Designer met meer dan 6 jaar ervaring in het bouwen van AI-gedreven digitale producten op schaal. Leidde design systems en zero-to-one producten bij Vercel en Linear met meetbare verbeteringen in gebruikersinrichting.",
    bullets0: [
      "Leidde herontwerp van het ontwikkelaarsdashboard, onboarding verbeterd met 40%",
      "Design system gebouwd voor gebruik op 12 productoppervlakken",
      "34% hogere deployment-succesrate gerealiseerd via UX-verbeteringen",
    ],
    bullets1: [
      "Kernworkflows ontworpen voor issue-tracking en projectbeheer",
      "Onboardingtijd met 40% verminderd via progressief onthullingsherontwerp",
      "Samengewerkt met engineering aan React-componentenbibliotheek",
    ],
    education: "Bachelor of Arts, Cognitiewetenschappen & HCI — UC Berkeley, 2016–2020",
    skills: ["Figma", "UX-onderzoek", "Designsystemen", "Prototyping", "React", "A/B-testen"],
  },
  "Chinese": {
    sections: { summary: "个人简介", experience: "工作经历", education: "教育背景", skills: "技能" },
    titleSenior: "高级产品设计师",
    titleJunior: "产品设计师",
    summary:
      "拥有6年以上经验的高级产品设计师，专注于构建AI驱动的数字产品。曾在Vercel和Linear主导设计系统建设及从零到一的产品开发，显著提升了用户引导效率和产品参与度。",
    bullets0: [
      "主导开发者仪表板重设计，将新用户引导效率提升40%",
      "构建并维护覆盖12个产品界面的设计系统",
      "通过UX优化将部署成功率提升34%",
    ],
    bullets1: [
      "设计核心问题追踪和项目管理工作流",
      "通过渐进式信息披露重设计将引导时间缩短40%",
      "与工程团队合作开发React组件库",
    ],
    education: "文学学士，认知科学与人机交互 — UC Berkeley，2016–2020",
    skills: ["Figma", "UX研究", "设计系统", "原型设计", "React", "A/B测试"],
  },
  "Japanese": {
    sections: { summary: "自己紹介", experience: "職歴", education: "学歴", skills: "スキル" },
    titleSenior: "シニアプロダクトデザイナー",
    titleJunior: "プロダクトデザイナー",
    summary:
      "AIを活用したデジタル製品の開発において6年以上の経験を持つシニアプロダクトデザイナー。VercelとLinearでデザインシステムとゼロイチプロダクトをリードし、ユーザーオンボーディングとエンゲージメントを大幅に改善。",
    bullets0: [
      "開発者ダッシュボードのリデザインを主導し、オンボーディングを40%改善",
      "12のプロダクト画面で使用されるデザインシステムを構築・維持",
      "UX改善によりデプロイ成功率を34%向上",
    ],
    bullets1: [
      "課題追跡とプロジェクト管理のコアワークフローを設計",
      "プログレッシブディスクロージャーの再設計によりオンボーディング時間を40%短縮",
      "Reactコンポーネントライブラリのエンジニアリングに協力",
    ],
    education: "文学士、認知科学・HCI — UC Berkeley、2016–2020",
    skills: ["Figma", "UXリサーチ", "デザインシステム", "プロトタイピング", "React", "A/Bテスト"],
  },
  "Korean": {
    sections: { summary: "자기소개", experience: "경력 사항", education: "학력", skills: "기술" },
    titleSenior: "시니어 프로덕트 디자이너",
    titleJunior: "프로덕트 디자이너",
    summary:
      "AI 기반 디지털 제품 개발에 6년 이상의 경험을 보유한 시니어 프로덕트 디자이너. Vercel과 Linear에서 디자인 시스템과 제로-투-원 제품을 이끌며 사용자 온보딩 및 참여도를 크게 개선했습니다.",
    bullets0: [
      "개발자 대시보드 재설계를 주도하여 온보딩을 40% 개선",
      "12개 제품 화면에 사용되는 디자인 시스템 구축 및 유지",
      "UX 개선을 통해 배포 성공률 34% 향상",
    ],
    bullets1: [
      "이슈 추적 및 프로젝트 관리 핵심 워크플로우 설계",
      "점진적 공개 재설계를 통해 온보딩 시간 40% 단축",
      "React 컴포넌트 라이브러리 구축을 위해 엔지니어링팀과 협력",
    ],
    education: "문학 학사, 인지과학 & HCI — UC Berkeley, 2016–2020",
    skills: ["Figma", "UX 리서치", "디자인 시스템", "프로토타이핑", "React", "A/B 테스트"],
  },
  "Swedish": {
    sections: { summary: "Sammanfattning", experience: "Arbetslivserfarenhet", education: "Utbildning", skills: "Kompetenser" },
    titleSenior: "Senior produktdesigner",
    titleJunior: "Produktdesigner",
    summary:
      "Senior produktdesigner med mer än 6 års erfarenhet av att bygga AI-drivna digitala produkter i stor skala. Ledde designsystem och nollpunktsprodukter på Vercel och Linear med mätbara förbättringar i användarintroduktion.",
    bullets0: [
      "Ledde omdesignen av utvecklardashboarden, förbättrade onboarding med 40%",
      "Byggde designsystem som används på 12 produktytor",
      "Ökade framgångsgraden för driftsättningar med 34% via UX-förbättringar",
    ],
    bullets1: [
      "Designade kärn-arbetsflöden för ärendehantering och projektledning",
      "Minskade onboardingtid med 40% via omdesign av progressiv avslöjning",
      "Samarbetade med ingenjörsteamet på React-komponentbibliotek",
    ],
    education: "Kandidatexamen i konst, kognitionsvetenskap & HCI — UC Berkeley, 2016–2020",
    skills: ["Figma", "UX-forskning", "Designsystem", "Prototypering", "React", "A/B-testning"],
  },
  "Norwegian": {
    sections: { summary: "Sammendrag", experience: "Arbeidserfaring", education: "Utdanning", skills: "Ferdigheter" },
    titleSenior: "Senior produktdesigner",
    titleJunior: "Produktdesigner",
    summary:
      "Senior produktdesigner med mer enn 6 års erfaring med å bygge AI-drevne digitale produkter i stor skala. Ledet designsystemer og null-til-ett-produkter hos Vercel og Linear med målbare forbedringer i brukerintroduksjon.",
    bullets0: [
      "Ledet omdesign av utviklerdashbordet, forbedret onboarding med 40%",
      "Bygget designsystem brukt på 12 produktflater",
      "Økte suksessraten for utrullinger med 34% gjennom UX-forbedringer",
    ],
    bullets1: [
      "Designet kjernearbeidsflyter for saksbehandling og prosjektledelse",
      "Reduserte onboardingtid med 40% via redesign av progressiv avsløring",
      "Samarbeidet med ingeniørteamet om React-komponentbibliotek",
    ],
    education: "Bachelor of Arts, kognitivvitenskap & HCI — UC Berkeley, 2016–2020",
    skills: ["Figma", "UX-forskning", "Designsystemer", "Prototyping", "React", "A/B-testing"],
  },
  "Danish": {
    sections: { summary: "Resumé", experience: "Erhvervserfaring", education: "Uddannelse", skills: "Kompetencer" },
    titleSenior: "Senior produktdesigner",
    titleJunior: "Produktdesigner",
    summary:
      "Senior produktdesigner med over 6 års erfaring med at bygge AI-drevne digitale produkter i stor skala. Ledede designsystemer og nul-til-et-produkter hos Vercel og Linear med målbare forbedringer i brugerintroduktion.",
    bullets0: [
      "Ledede redesign af udviklerdashboardet, forbedrede onboarding med 40%",
      "Byggede designsystem brugt på 12 produktoverflader",
      "Øgede succesraten for udrulninger med 34% via UX-forbedringer",
    ],
    bullets1: [
      "Designede kernearbejdsgange til sagssporing og projektledelse",
      "Reducerede onboardingtid med 40% via redesign af progressiv afsløring",
      "Samarbejdede med ingeniørteamet om React-komponentbibliotek",
    ],
    education: "Bachelor of Arts, kognitionsvidenskab & HCI — UC Berkeley, 2016–2020",
    skills: ["Figma", "UX-forskning", "Designsystemer", "Prototypering", "React", "A/B-testning"],
  },
  "Finnish": {
    sections: { summary: "Yhteenveto", experience: "Työkokemus", education: "Koulutus", skills: "Taidot" },
    titleSenior: "Vanhempi tuotesuunnittelija",
    titleJunior: "Tuotesuunnittelija",
    summary:
      "Vanhempi tuotesuunnittelija, jolla on yli 6 vuoden kokemus tekoälypohjaisten digitaalisten tuotteiden rakentamisesta laajassa mittakaavassa. Johdin suunnittelujärjestelmiä ja nollasta yhteen -tuotteita Vercelissä ja Linearissa mitattavilla parannuksilla käyttäjien perehdytyksessä.",
    bullets0: [
      "Johdin kehittäjien koontinäytön uudelleensuunnittelun, perehdytys parani 40%",
      "Rakensin suunnittelujärjestelmän 12 tuotepinnalle",
      "Nostin käyttöönottotoimien onnistumisastetta 34% UX-parannuksilla",
    ],
    bullets1: [
      "Suunnittelin ydintoiminnot ongelmaseurannalle ja projektinhallinnalle",
      "Vähensin perehdytysaikaa 40% progressiivisen paljastamisen uudelleensuunnittelulla",
      "Tein yhteistyötä insinööritiimin kanssa React-komponenttikirjastossa",
    ],
    education: "Taiteen kandidaatti, kognitiotiede & HCI — UC Berkeley, 2016–2020",
    skills: ["Figma", "UX-tutkimus", "Suunnittelujärjestelmät", "Prototypointi", "React", "A/B-testaus"],
  },
  "Greek": {
    sections: { summary: "Προφίλ", experience: "Επαγγελματική Εμπειρία", education: "Εκπαίδευση", skills: "Δεξιότητες" },
    titleSenior: "Ανώτερος Σχεδιαστής Προϊόντων",
    titleJunior: "Σχεδιαστής Προϊόντων",
    summary:
      "Ανώτερος σχεδιαστής προϊόντων με πάνω από 6 χρόνια εμπειρίας στη δημιουργία ψηφιακών προϊόντων AI σε κλίμακα. Ηγήθηκα συστημάτων σχεδιασμού και προϊόντων από το μηδέν σε Vercel και Linear.",
    bullets0: [
      "Ηγήθηκα ανασχεδιασμού πίνακα ελέγχου — βελτίωση εισαγωγής κατά 40%",
      "Κατασκεύασα σύστημα σχεδιασμού για 12 επιφάνειες προϊόντος",
      "Αύξησα επιτυχία ανάπτυξης κατά 34% μέσω βελτιώσεων UX",
    ],
    bullets1: [
      "Σχεδίασα βασικές ροές παρακολούθησης ζητημάτων και διαχείρισης έργων",
      "Μείωσα χρόνο εισαγωγής κατά 40% μέσω ανασχεδιασμού",
      "Συνεργάστηκα με μηχανικούς για βιβλιοθήκη React",
    ],
    education: "Πτυχίο Τεχνών, Γνωστική Επιστήμη & HCI — UC Berkeley, 2016–2020",
    skills: ["Figma", "Έρευνα UX", "Συστήματα Σχεδιασμού", "Πρωτοτυποποίηση", "React", "A/B Testing"],
  },
  "Turkish": {
    sections: { summary: "Profil", experience: "İş Deneyimi", education: "Eğitim", skills: "Beceriler" },
    titleSenior: "Kıdemli Ürün Tasarımcısı",
    titleJunior: "Ürün Tasarımcısı",
    summary:
      "Büyük ölçekte yapay zeka destekli dijital ürünler geliştirmede 6 yılı aşkın deneyime sahip kıdemli ürün tasarımcısı. Vercel ve Linear'da tasarım sistemleri ve sıfırdan-bire ürünler yöneterek kullanıcı katılımında ölçülebilir iyileştirmeler sağladı.",
    bullets0: [
      "Geliştirici gösterge tablosunu yeniden tasarladı — katılımı %40 iyileştirdi",
      "12 ürün yüzeyinde kullanılan tasarım sistemi oluşturdu",
      "UX iyileştirmeleri ile dağıtım başarı oranını %34 artırdı",
    ],
    bullets1: [
      "Sorun takibi ve proje yönetimi için temel iş akışları tasarladı",
      "Aşamalı açıklama yeniden tasarımı ile katılım süresini %40 kısalttı",
      "React bileşen kütüphanesi için mühendislik ekibiyle işbirliği yaptı",
    ],
    education: "Güzel Sanatlar Lisansı, Bilişsel Bilim & HCI — UC Berkeley, 2016–2020",
    skills: ["Figma", "UX Araştırması", "Tasarım Sistemleri", "Prototipleme", "React", "A/B Testi"],
  },
  "Romanian": {
    sections: { summary: "Profil Profesional", experience: "Experiență Profesională", education: "Educație", skills: "Abilități" },
    titleSenior: "Designer Senior de Produs",
    titleJunior: "Designer de Produs",
    summary:
      "Designer senior de produs cu peste 6 ani de experiență în construirea de produse digitale bazate pe AI la scară largă. Am condus sisteme de design și produse de la zero la unul la Vercel și Linear.",
    bullets0: [
      "Am condus reproiectarea tabloului de bord al dezvoltatorilor, îmbunătățind onboarding-ul cu 40%",
      "Am construit sistemul de design utilizat pe 12 suprafețe de produs",
      "Am crescut rata de succes a implementărilor cu 34% prin îmbunătățiri UX",
    ],
    bullets1: [
      "Am proiectat fluxurile principale de urmărire a problemelor și management de proiect",
      "Am redus timpul de onboarding cu 40% prin reproiectarea dezvăluirii progresive",
      "Am colaborat cu ingineria la biblioteca de componente React",
    ],
    education: "Licență în Arte, Știința Cognitivă & HCI — UC Berkeley, 2016–2020",
    skills: ["Figma", "Cercetare UX", "Sisteme de Design", "Prototipare", "React", "Testare A/B"],
  },
  "Czech": {
    sections: { summary: "Profesní profil", experience: "Pracovní zkušenosti", education: "Vzdělání", skills: "Dovednosti" },
    titleSenior: "Senior produktový designer",
    titleJunior: "Produktový designer",
    summary:
      "Senior produktový designer s více než 6 lety zkušeností s vývojem digitálních produktů poháněných AI ve velkém měřítku. Vedl/a designové systémy a produkty od nuly v Vercel a Linear s měřitelnými zlepšeními v onboardingu uživatelů.",
    bullets0: [
      "Vedl/a redesign vývojářského dashboardu, zlepšení onboardingu o 40%",
      "Vytvořil/a designový systém používaný na 12 produktových površích",
      "Zvýšil/a míru úspěšnosti nasazení o 34% prostřednictvím UX zlepšení",
    ],
    bullets1: [
      "Navrhl/a základní pracovní postupy pro sledování problémů a řízení projektů",
      "Zkrátil/a dobu onboardingu o 40% prostřednictvím redesignu postupného odhalování",
      "Spolupracoval/a s inženýrstvím na knihovně komponent React",
    ],
    education: "Bakalář umění, Kognitivní věda & HCI — UC Berkeley, 2016–2020",
    skills: ["Figma", "UX výzkum", "Designové systémy", "Prototypování", "React", "A/B testování"],
  },
  "Albanian": {
    sections: { summary: "Profili Profesional", experience: "Eksperienca Profesionale", education: "Arsimi", skills: "Aftësitë" },
    titleSenior: "Dizajnuese e Lartë e Produktit",
    titleJunior: "Dizajnuese e Produktit",
    summary:
      "Dizajnuese e lartë e produktit me mbi 6 vjet përvojë në ndërtimin e produkteve dixhitale të bazuara në AI në shkallë. Udhëhoqi sistemet e dizajnit dhe produktet nga zero në një te Vercel dhe Linear.",
    bullets0: [
      "Udhëhoqi rimodelimin e panelit të zhvilluesve — onboarding u përmirësua 40%",
      "Ndërtoi sistemin e dizajnit të përdorur në 12 sipërfaqe produkti",
      "Rriti normën e suksesit të shpërndarjes me 34% nëpërmjet përmirësimeve UX",
    ],
    bullets1: [
      "Projektoi rrjedhat kryesore të gjurmimit të çështjeve dhe menaxhimit të projekteve",
      "Uli kohën e onboarding-ut me 40% nëpërmjet rimodelimit progresiv",
      "Bashkëpunoi me inxhinierinë në bibliotekën e komponentëve React",
    ],
    education: "Bachelor i Arteve, Shkenca Kognitive & HCI — UC Berkeley, 2016–2020",
    skills: ["Figma", "Kërkime UX", "Sisteme Dizajni", "Prototipim", "React", "Testim A/B"],
  },
  "Arabic": {
    sections: { summary: "الملخص المهني", experience: "الخبرة العملية", education: "التعليم", skills: "المهارات" },
    titleSenior: "مصممة منتجات أولى",
    titleJunior: "مصممة منتجات",
    summary:
      "مصممة منتجات أولى تمتلك أكثر من 6 سنوات من الخبرة في بناء المنتجات الرقمية المعتمدة على الذكاء الاصطناعي. قادت أنظمة التصميم والمنتجات من الصفر في Vercel وLinear مع تحسينات ملموسة في تأهيل المستخدمين.",
    bullets0: [
      "قادت إعادة تصميم لوحة تحكم المطورين وحسّنت التأهيل بنسبة 40%",
      "بنت نظام التصميم المستخدم عبر 12 سطحاً للمنتج",
      "رفعت معدل نجاح النشر بنسبة 34% عبر تحسينات تجربة المستخدم",
    ],
    bullets1: [
      "صممت سير العمل الأساسية لتتبع المشكلات وإدارة المشاريع",
      "قلّصت وقت التأهيل بنسبة 40% عبر إعادة تصميم الإفصاح التدريجي",
      "تعاونت مع فريق الهندسة في مكتبة مكونات React",
    ],
    education: "بكالوريوس في الفنون، علم الإدراك وتفاعل الإنسان-الحاسوب — UC Berkeley، 2016–2020",
    skills: ["Figma", "أبحاث UX", "أنظمة التصميم", "النماذج الأولية", "React", "اختبار A/B"],
  },
  "Hindi": {
    sections: { summary: "परिचय", experience: "कार्य अनुभव", education: "शिक्षा", skills: "कौशल" },
    titleSenior: "वरिष्ठ उत्पाद डिज़ाइनर",
    titleJunior: "उत्पाद डिज़ाइनर",
    summary:
      "AI-संचालित डिजिटल उत्पादों के निर्माण में 6+ वर्षों के अनुभव वाली वरिष्ठ उत्पाद डिज़ाइनर। Vercel और Linear में डिज़ाइन सिस्टम और शून्य-से-एक उत्पादों का नेतृत्व किया।",
    bullets0: [
      "डेवलपर डैशबोर्ड के पुनर्डिज़ाइन का नेतृत्व — ऑनबोर्डिंग 40% बेहतर हुई",
      "12 उत्पाद सतहों पर उपयोग किया जाने वाला डिज़ाइन सिस्टम बनाया",
      "UX सुधारों के माध्यम से deployment सफलता दर 34% बढ़ाई",
    ],
    bullets1: [
      "समस्या ट्रैकिंग और प्रोजेक्ट प्रबंधन के मुख्य वर्कफ़्लो डिज़ाइन किए",
      "प्रगतिशील प्रकटीकरण पुनर्डिज़ाइन से ऑनबोर्डिंग समय 40% कम किया",
      "React कंपोनेंट लाइब्रेरी पर इंजीनियरिंग टीम के साथ सहयोग किया",
    ],
    education: "बैचलर ऑफ़ आर्ट्स, संज्ञानात्मक विज्ञान और HCI — UC Berkeley, 2016–2020",
    skills: ["Figma", "UX रिसर्च", "डिज़ाइन सिस्टम", "प्रोटोटाइपिंग", "React", "A/B परीक्षण"],
  },
  "English (UK)": {
    sections: { summary: "Profile", experience: "Work Experience", education: "Education", skills: "Skills" },
    titleSenior: "Senior Product Designer",
    titleJunior: "Product Designer",
    summary:
      "Senior Product Designer with 6+ years' experience building AI-powered digital products at scale. Led design systems and zero-to-one products at Vercel and Linear, driving measurable improvements in user onboarding and engagement.",
    bullets0: [
      "Led redesign of developer dashboard, improving onboarding by 40%",
      "Built design system used across 12 product surfaces",
      "Drove 34% increase in deployment success rate through UX improvements",
    ],
    bullets1: [
      "Designed core issue-tracking and project management workflows",
      "Reduced onboarding time by 40% through progressive disclosure redesign",
      "Collaborated with engineering on React component library",
    ],
    education: "Bachelor of Arts, Cognitive Science & HCI — UC Berkeley, 2016–2020",
    skills: ["Figma", "UX Research", "Design Systems", "Prototyping", "React", "A/B Testing"],
  },
};

/* ─── Build translated experience entries ─── */
function buildTranslatedExperience(t: LanguageTranslation): ExperienceEntry[] {
  return [
    { role: t.titleSenior, company: "Vercel", period: "Mär. 2022 – jetzt".includes("jetzt") ? ORIGINAL_EXPERIENCE[0].period : ORIGINAL_EXPERIENCE[0].period, bullets: t.bullets0 },
    { role: t.titleJunior, company: "Linear",  period: ORIGINAL_EXPERIENCE[1].period, bullets: t.bullets1 },
  ];
}

/* ─── ResumeCard ─── */
function ResumeCard({
  label,
  accentColor,
  name,
  jobTitle,
  contact,
  sections,
  summary,
  experience,
  education,
  skills,
  dimmed,
}: {
  label: string;
  accentColor: string;
  name: string;
  jobTitle: string;
  contact: string;
  sections: SectionLabels;
  summary: string;
  experience: ExperienceEntry[];
  education: string;
  skills: string[];
  dimmed?: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full" style={{ background: accentColor }} />
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      </div>

      <div
        className="relative rounded-xl overflow-hidden flex-1"
        style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.06)" }}
      >
        <div
          style={{
            background: "#ffffff",
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            opacity: dimmed ? 0.45 : 1,
            transition: "opacity 0.3s ease",
            maxHeight: "520px",
            overflowY: "auto",
          }}
        >
          {/* Accent bar */}
          <div style={{ height: "5px", background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)` }} />

          {/* Header */}
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#111827", marginBottom: "3px" }}>{name}</div>
            <div style={{ fontSize: "12px", color: accentColor, fontWeight: 600, marginBottom: "6px" }}>{jobTitle}</div>
            <div style={{ fontSize: "10px", color: "#6b7280" }}>{contact}</div>
          </div>

          <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column" as const, gap: "14px" }}>
            {/* Summary */}
            <div>
              <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: accentColor, marginBottom: "5px", paddingBottom: "3px", borderBottom: `1px solid ${accentColor}33` }}>
                {sections.summary}
              </div>
              <p style={{ fontSize: "10.5px", color: "#374151", lineHeight: 1.65 }}>{summary}</p>
            </div>

            {/* Experience */}
            <div>
              <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: accentColor, marginBottom: "8px", paddingBottom: "3px", borderBottom: `1px solid ${accentColor}33` }}>
                {sections.experience}
              </div>
              {experience.map((exp, i) => (
                <div key={i} style={{ marginBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2px" }}>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#111827" }}>{exp.role}</span>
                      <span style={{ fontSize: "10.5px", color: accentColor }}> · {exp.company}</span>
                    </div>
                    <span style={{ fontSize: "9px", color: "#9ca3af", whiteSpace: "nowrap" as const, marginLeft: "8px" }}>{exp.period}</span>
                  </div>
                  {exp.bullets.map((b, j) => (
                    <div key={j} style={{ fontSize: "10px", color: "#4b5563", lineHeight: 1.55 }}>· {b}</div>
                  ))}
                </div>
              ))}
            </div>

            {/* Education */}
            <div>
              <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: accentColor, marginBottom: "5px", paddingBottom: "3px", borderBottom: `1px solid ${accentColor}33` }}>
                {sections.education}
              </div>
              <p style={{ fontSize: "10.5px", color: "#374151" }}>{education}</p>
            </div>

            {/* Skills */}
            <div>
              <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: accentColor, marginBottom: "6px", paddingBottom: "3px", borderBottom: `1px solid ${accentColor}33` }}>
                {sections.skills}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "4px" }}>
                {skills.map((s) => (
                  <span key={s} style={{ fontSize: "9px", background: `${accentColor}15`, color: accentColor, padding: "2px 7px", borderRadius: "4px", fontWeight: 500 }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Overlay while not yet translated */}
        {dimmed && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(3px)",
            }}
          >
            <div style={{ textAlign: "center", padding: "20px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10" cy="10" r="9" />
                  <path d="M3 10h5.5M3 7h3.5M3 13h3.5" />
                  <path d="M10 6l4 4-4 4" />
                </svg>
              </div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>Translation will appear here</div>
              <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "3px" }}>Click Translate Resume</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main export ─── */
export default function TranslationPreview({ state, translated, aiTranslation }: TranslationPreviewProps) {
  const langKey = state.targetLanguage.replace(" (US)", "").replace(" (UK)", "");
  const t = TRANSLATIONS[state.targetLanguage] ?? TRANSLATIONS[langKey];

  const translatedSections = t?.sections ?? ORIGINAL_SECTIONS;
  const translatedTitle     = t?.titleSenior ?? ORIGINAL_EXPERIENCE[0].role;
  const translatedSummary   = t?.summary ?? ORIGINAL_SUMMARY;
  const translatedEdu       = t?.education ?? ORIGINAL_EDUCATION;
  const translatedSkills    = t?.skills ?? ORIGINAL_SKILLS;
  const translatedExp       = t ? buildTranslatedExperience(t) : ORIGINAL_EXPERIENCE;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: "rgba(255,255,255,0.07)" }}
    >
      {/* Chrome bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ background: "rgba(13,13,22,0.85)", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Side-by-side preview</p>
        <div className="flex items-center gap-3">
          {translated && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              Translated
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500/50" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
            <div className="w-2 h-2 rounded-full bg-green-500/50" />
          </div>
        </div>
      </div>

      {/* Split panels */}
      <div style={{ background: "#e5e7eb", padding: "12px" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Original */}
          <ResumeCard
            label={`Original · ${state.sourceLanguage}`}
            accentColor="#374151"
            name="Your Name"
            jobTitle={ORIGINAL_EXPERIENCE[0].role}
            contact="you@email.com  ·  +1 (555) 000-0000  ·  Your City"
            sections={ORIGINAL_SECTIONS}
            summary={ORIGINAL_SUMMARY}
            experience={ORIGINAL_EXPERIENCE}
            education={ORIGINAL_EDUCATION}
            skills={ORIGINAL_SKILLS}
          />

          {/* Translated */}
          {aiTranslation ? (
            <div
              style={{
                background: "#ffffff",
                borderRadius: "6px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column" as const,
              }}
            >
              <div style={{ padding: "8px 12px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#059669" }}>
                  Translated · {state.targetLanguage}
                </span>
              </div>
              {/* RTL layout for Arabic and other RTL languages */}
              <div
                dir={state.targetLanguage === "Arabic" ? "rtl" : "ltr"}
                style={{
                  padding:     "14px 16px",
                  fontSize:    "10.5px",
                  color:       "#374151",
                  lineHeight:  1.7,
                  whiteSpace:  "pre-wrap" as const,
                  maxHeight:   "480px",
                  overflowY:   "auto" as const,
                  textAlign:   state.targetLanguage === "Arabic" ? "right" : "left",
                  fontFamily:  state.targetLanguage === "Arabic"
                    ? "'Segoe UI', 'Noto Sans Arabic', Arial, sans-serif"
                    : "inherit",
                }}
              >
                {aiTranslation}
              </div>
            </div>
          ) : (
            <ResumeCard
              label={`Translated · ${state.targetLanguage}`}
              accentColor="#059669"
              name="Your Name"
              jobTitle={translated ? translatedTitle : ORIGINAL_EXPERIENCE[0].role}
              contact="you@email.com  ·  +1 (555) 000-0000  ·  Your City"
              sections={translated ? translatedSections : ORIGINAL_SECTIONS}
              summary={translated ? translatedSummary : ORIGINAL_SUMMARY}
              experience={translated ? translatedExp : ORIGINAL_EXPERIENCE}
              education={translated ? translatedEdu : ORIGINAL_EDUCATION}
              skills={translated ? translatedSkills : ORIGINAL_SKILLS}
              dimmed={!translated}
            />
          )}
        </div>
      </div>
    </div>
  );
}
