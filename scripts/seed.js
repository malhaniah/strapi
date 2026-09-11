'use strict';

/**
 * Seed script: creates one entry per content type in both locales (ar, en).
 *
 * Usage:
 *   npm run seed                 # against whatever database .env points at
 *   DATABASE_CLIENT=postgres DATABASE_URL=... npm run seed   # against Railway
 *
 * Idempotent: re-running updates the same documents instead of duplicating.
 *   - case-study  -> matched by slug
 *   - experience  -> matched by startDate
 *   - global/home -> single types, one document each
 *
 * Arabic is created first because it is the default locale (CLAUDE.md), then
 * English is added as a localization of the same document. Non-localized
 * fields (slug, order, dates, booleans, URLs) are written once and Strapi
 * copies them to every locale.
 *
 * Media fields (cvFile, coverImage, gallery) are left empty: upload assets in
 * the admin and attach them there.
 */

const { createStrapi, compileStrapi } = require('@strapi/strapi');

// ---------------------------------------------------------------------------
// Helpers for the `blocks` rich-text type
// ---------------------------------------------------------------------------

const text = (t) => ({ type: 'text', text: t });
const paragraph = (t) => ({ type: 'paragraph', children: [text(t)] });
const bulletList = (items) => ({
  type: 'list',
  format: 'unordered',
  children: items.map((t) => ({ type: 'list-item', children: [text(t)] })),
});
const blocks = (...nodes) => nodes.map((n) => (typeof n === 'string' ? paragraph(n) : n));

// ---------------------------------------------------------------------------
// Placeholder decisions. Clearly marked; Mohammed writes the real ones.
// ---------------------------------------------------------------------------

const PLACEHOLDER_DECISIONS = {
  en: [
    {
      heading: '[PLACEHOLDER] Decision 1 — replace with the key design decision',
      reasoning:
        '[PLACEHOLDER] Why this option was chosen over the alternatives. To be written by Mohammed; interview material.',
      rejectedAlternative: '[PLACEHOLDER] What was considered and rejected, and why it lost.',
    },
    {
      heading: '[PLACEHOLDER] Decision 2 — replace with the second decision',
      reasoning: '[PLACEHOLDER] Reasoning goes here.',
      rejectedAlternative: '[PLACEHOLDER] Rejected alternative goes here.',
    },
  ],
  ar: [
    {
      heading: '[عنصر نائب] القرار الأول — استبدله بالقرار التصميمي الأهم',
      reasoning:
        '[عنصر نائب] لماذا اختير هذا الخيار دون البدائل. يكتبه محمد؛ مادة للمقابلات.',
      rejectedAlternative: '[عنصر نائب] ما الذي دُرس ورُفض، ولماذا لم يُعتمد.',
    },
    {
      heading: '[عنصر نائب] القرار الثاني — استبدله بالقرار الثاني',
      reasoning: '[عنصر نائب] المبررات هنا.',
      rejectedAlternative: '[عنصر نائب] البديل المرفوض هنا.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const GLOBAL = {
  shared: {
    email: 'mohd.alhaniah@gmail.com',
    phone: null,
    linkedinUrl: null,
    githubUrl: null,
  },
  ar: {
    name: 'محمد الغامدي',
    roleLine: 'مصمم واجهات وتجربة مستخدم — أنظمة التصميم وتطوير الواجهات الأمامية',
    positioning:
      'أعمل عند نقطة التقاء التصميم والبرمجة: أبني أنظمة تصميم قابلة للتوسّع، وأحوّلها بنفسي إلى واجهات جاهزة للإنتاج، فلا يضيع شيء بين ملف التصميم والكود.',
    location: 'الرياض، المملكة العربية السعودية',
    navWork: 'الأعمال',
    navAbout: 'نبذة عني',
    navContact: 'تواصل',
  },
  en: {
    name: 'Mohammed Alghamdi',
    roleLine: 'UI/UX Designer — Design Systems & Front-End Development',
    positioning:
      'I work where design meets code: building scalable design systems and turning them into production-ready interfaces myself, so nothing gets lost between the design file and the codebase.',
    location: 'Riyadh, Saudi Arabia',
    navWork: 'Work',
    navAbout: 'About',
    navContact: 'Contact',
  },
};

const HOME = {
  ar: {
    heroHeading: 'أصمّم الواجهات، وأبني الأنظمة التي تقف خلفها.',
    heroSubheading:
      'مصمم واجهات وتجربة مستخدم في الرياض بخلفية في تطوير الواجهات الأمامية، متخصص في أنظمة التصميم ولوحات البيانات كثيفة المعلومات.',
    primaryCtaLabel: 'استعرض دراسات الحالة',
    secondaryCtaLabel: 'تواصل معي',
    capabilities: [
      {
        title: 'تصميم المنتجات والواجهات',
        description:
          'تصميم تجربة وواجهة المستخدم من البحث ورسم المسارات وصولاً إلى الشاشات النهائية عالية الدقة، بمحتوى حقيقي وقيود حقيقية لا بنماذج مثالية.',
        items: [
          'مسارات المستخدم والنماذج الأولية',
          'واجهات عالية الدقة في Figma',
          'النماذج الأولية واختبارات الاستخدام',
          'تصوير البيانات ولوحات المعلومات',
        ],
      },
      {
        title: 'أنظمة التصميم',
        description:
          'مكتبات مكوّنات بمتغيّرات وحالات موثّقة وقواعد تخطيط تلقائي، إلى جانب خطوط أنابيب للرموز التصميمية (Design Tokens) تُبقي Figma والكود متزامنين.',
        items: [
          'بنية المكوّنات ومتغيّراتها',
          'الرموز التصميمية عبر Tokens Studio',
          'التوثيق والحوكمة',
          'مزامنة Figma مع الكود',
        ],
      },
      {
        title: 'تطوير الواجهات الأمامية',
        description:
          'تحويل التصاميم إلى واجهات جاهزة للإنتاج: HTML دلالي وCSS وJavaScript وChart.js، ومكوّنات متجاوبة تراعي إمكانية الوصول.',
        items: [
          'HTML وCSS وJavaScript',
          'Chart.js والواجهات المعتمدة على البيانات',
          'مكوّنات متجاوبة وقابلة للوصول',
          'نسخ تعمل دون اتصال بالإنترنت',
        ],
      },
    ],
  },
  en: {
    heroHeading: 'I design interfaces and build the systems behind them.',
    heroSubheading:
      'UI/UX designer in Riyadh with a front-end background, specialising in design systems and data-heavy product interfaces.',
    primaryCtaLabel: 'View case studies',
    secondaryCtaLabel: 'Get in touch',
    capabilities: [
      {
        title: 'Product & interface design',
        description:
          'End-to-end UI/UX from research and flows to high-fidelity screens, designed around real content and real constraints rather than ideal cases.',
        items: [
          'User flows & wireframes',
          'High-fidelity UI in Figma',
          'Prototyping & usability testing',
          'Data visualisation & dashboards',
        ],
      },
      {
        title: 'Design systems',
        description:
          'Component libraries with documented variants, states, and auto layout rules, plus token pipelines that keep Figma and code in sync.',
        items: [
          'Component architecture & variants',
          'Design tokens (Tokens Studio)',
          'Documentation & governance',
          'Figma-to-code sync',
        ],
      },
      {
        title: 'Front-end development',
        description:
          'Turning designs into production interfaces: semantic HTML, CSS, JavaScript, Chart.js, and accessible, responsive components.',
        items: [
          'HTML, CSS & JavaScript',
          'Chart.js & data-driven UI',
          'Accessible, responsive components',
          'Offline-capable builds',
        ],
      },
    ],
  },
};

const EXPERIENCES = [
  {
    shared: { startDate: '2025-03-01', endDate: null, isCurrent: true, order: 1 },
    ar: {
      company: 'NSG للخدمات الجيومكانية',
      jobTitle: 'مصمم واجهات وتجربة مستخدم',
      location: 'الرياض',
      bullets: [
        {
          text: 'صمّمت لوحة مؤشرات أداء متعددة الشاشات لقطاعات وزارية (الدواجن، بيض المائدة، الثروة الحيوانية)، ونفّذتها باستخدام Chart.js مع خريطة كوروبليث لمناطق المملكة.',
        },
        {
          text: 'وثّقت نظام التصميم الخاص بتطبيق NSG Maps وأنتجت المواد التسويقية لمتاجر التطبيقات للسوق السعودي.',
        },
        {
          text: 'وضعت قواعد بناء المكوّنات (المتغيّرات، الحالات، التخطيط التلقائي) وأنشأت خط أنابيب عبر Tokens Studio لإبقاء Figma والكود متزامنين.',
        },
      ],
    },
    en: {
      company: 'NSG Geospatial Services',
      jobTitle: 'UI/UX Designer',
      location: 'Riyadh',
      bullets: [
        {
          text: 'Designed a multi-screen KPI dashboard for ministry sectors (poultry, table eggs, livestock) and built it with Chart.js and a Saudi regional choropleth.',
        },
        {
          text: 'Documented the NSG Maps design system and produced app-store marketing assets for the Saudi market.',
        },
        {
          text: 'Codified component construction rules (variants, states, auto layout) and set up a Tokens Studio pipeline that keeps Figma and code in sync.',
        },
      ],
    },
  },
  {
    shared: { startDate: '2023-02-01', endDate: '2025-02-28', isCurrent: false, order: 2 },
    ar: {
      company: 'إجادة للنظم',
      jobTitle: 'مطوّر ويب',
      location: 'جدة',
      bullets: [
        {
          text: '[للمراجعة] طوّرت وصنت واجهات ويب متجاوبة لعملاء من قطاع المؤسسات، من استلام التصاميم حتى النشر.',
        },
        {
          text: '[للمراجعة] بنيت مكوّنات واجهة أمامية قابلة لإعادة الاستخدام وعملت مع المصممين للحفاظ على اتساق الواجهة عبر الإصدارات.',
        },
      ],
    },
    en: {
      company: 'Ejada Systems LTD',
      jobTitle: 'Web Developer',
      location: 'Jeddah',
      bullets: [
        {
          text: '[REVIEW] Built and maintained responsive web interfaces for enterprise clients, from design handoff to release.',
        },
        {
          text: '[REVIEW] Implemented reusable front-end components and worked with designers to keep the UI consistent across releases.',
        },
      ],
    },
  },
];

const CASE_STUDIES = [
  {
    shared: { slug: 'ministry-sector-kpi-dashboard', year: '2025', order: 1, featured: true },
    ar: {
      title: 'لوحة مؤشرات الأداء لقطاعات الوزارة',
      summary:
        'لوحة تحليلات متعددة الشاشات لمتابعة مؤشرات الأداء الرئيسية لقطاعات الدواجن وبيض المائدة والثروة الحيوانية، مبنية بـ Chart.js مع خريطة كوروبليث لمناطق المملكة وتتبّع كامل للمتطلبات وفق وثيقة متطلبات العمل (BRD).',
      role: 'مصمم واجهات وتجربة مستخدم ومطوّر واجهات أمامية',
      platform: 'ويب (سطح المكتب)',
      team: 'NSG للخدمات الجيومكانية',
      tags: ['لوحة معلومات', 'تصوير البيانات', 'التحليلات', 'Chart.js', 'نظم المعلومات الجغرافية', 'يعمل دون اتصال'],
      context: blocks(
        'احتاج محللو القطاعات وصنّاع القرار في الوزارة إلى رؤية موحّدة لمؤشرات الإنتاج والإمداد والأسعار عبر قطاعات الدواجن وبيض المائدة والثروة الحيوانية. كانت التقارير القائمة موزّعة بين جداول بيانات وملفات مصدَّرة ثابتة، دون أي تفصيل على مستوى المناطق.',
        'طلب الموجز لوحة معلومات عربية متعددة الشاشات تضم رسوماً بيانية وجداول وخريطة لمناطق المملكة.'
      ),
      constraints: blocks(
        bulletList([
          'كان يجب أن ترتبط كل شاشة بمتطلب مرقّم في وثيقة متطلبات العمل (BRD)، فكان تتبّع المتطلبات مخرجاً أساسياً لا إضافة اختيارية.',
          'كان على النسخة النهائية أن تعمل دون اتصال بالإنترنت لأغراض العروض التقديمية وفي الشبكات المقيّدة، مما استبعد الاعتماد على شبكات توصيل المحتوى (CDN) أو بلاطات الخرائط الحية.',
          'الإعدادات الافتراضية لمكتبات الرسوم البيانية لا تناسب المحتوى العربي: اتجاه المحاور، وترتيب مفاتيح الرسم، ومحاذاة التلميحات، وتنسيق الأرقام، كلها احتاجت إلى معالجة مقصودة.',
        ])
      ),
      outcome: blocks(
        'لوحة معلومات متعددة الشاشات تغطي القطاعات الثلاثة، برسوم بيانية عبر Chart.js، وخريطة كوروبليث لمناطق المملكة للمقارنة الجغرافية، ومصفوفة تتبّع تربط كل مكوّن بمتطلبه في وثيقة BRD.',
        'نسخة قادرة على العمل دون اتصال، تُشغَّل من مجلد محلي دون الحاجة إلى الشبكة.'
      ),
      retrospective: blocks(
        'أثبتت مصفوفة التتبّع قيمتها في اجتماعات المراجعة: كل سؤال عن سبب وجود عنصر ما كان خلفه رقم متطلب. في المرة القادمة سأبني اصطلاحات الرسوم البيانية كمكتبة مشتركة قبل الشاشة الأولى، بدلاً من حلّها شاشة تلو الأخرى.'
      ),
      decisions: PLACEHOLDER_DECISIONS.ar,
    },
    en: {
      title: 'Ministry Sector KPI Dashboard',
      summary:
        'A multi-screen analytics dashboard tracking poultry, table-egg, and livestock sector KPIs, built with Chart.js, a Saudi regional choropleth, and full BRD requirement traceability.',
      role: 'UI/UX Designer & Front-End Developer',
      platform: 'Web (desktop)',
      team: 'NSG Geospatial Services',
      tags: ['Dashboard', 'Data visualisation', 'Analytics', 'Chart.js', 'GIS', 'Offline-first'],
      context: blocks(
        'Sector analysts and decision-makers at the ministry needed a single view of production, supply, and price indicators across the poultry, table-egg, and livestock sectors. Existing reporting lived in spreadsheets and static exports, with no regional breakdown.',
        'The brief called for a multi-screen Arabic dashboard with charts, tables, and a map of Saudi regions.'
      ),
      constraints: blocks(
        bulletList([
          'Every screen had to map back to a numbered requirement in the Business Requirements Document, so requirement traceability was a deliverable, not a nice-to-have.',
          'The build had to run offline for demonstrations and on restricted networks, which ruled out CDN dependencies and live map tiles.',
          'Charting defaults do not suit Arabic content: axis direction, legend order, tooltip alignment, and number formatting all had to be handled deliberately.',
        ])
      ),
      outcome: blocks(
        'A multi-screen dashboard covering the three sectors, with Chart.js visualisations, a Saudi regional choropleth for geographic comparison, and a traceability matrix linking each component to its BRD requirement.',
        'An offline-capable build that runs from a local folder with no network access.'
      ),
      retrospective: blocks(
        "The traceability matrix paid for itself in review meetings: every question about 'why is this here' had a requirement ID behind it. Next time I would build the chart conventions as a shared library before the first screen, rather than solving them screen by screen."
      ),
      decisions: PLACEHOLDER_DECISIONS.en,
    },
  },
  {
    shared: { slug: 'nsg-maps', year: '2025', order: 2, featured: true },
    ar: {
      title: 'تطبيق NSG Maps',
      summary:
        'تطبيق ملاحة واستكشاف للأماكن موجَّه للسوق السعودي. تولّيت توثيق نظام التصميم وإنتاج المواد التسويقية لمتاجر التطبيقات.',
      role: 'مصمم واجهات وتجربة مستخدم',
      platform: 'iOS وAndroid',
      team: 'NSG للخدمات الجيومكانية',
      tags: ['تطبيق جوال', 'نظام تصميم', 'توثيق', 'مواد متاجر التطبيقات', 'خرائط'],
      context: blocks(
        'NSG Maps تطبيق ملاحة واستكشاف للأماكن مصمَّم للمملكة العربية السعودية، حيث تكتسب أسماء الأماكن المحلية والبحث بالعربية ونقاط الاهتمام الخاصة بكل منطقة أهمية تفوق ما تراعيه منتجات الخرائط العالمية.',
        'مع نضج المنتج، احتاج الفريق إلى توثيق نظام التصميم ليشترك المصممون والمطورون في مرجع واحد، وإلى صفحات متاجر تعرض التطبيق بصورة لائقة للجمهور السعودي.'
      ),
      constraints: blocks(
        bulletList([
          'كانت مكتبة المكوّنات موجودة أصلاً في Figma لكنها نمت بشكل عشوائي، بتسميات غير متسقة وحالات غير موثّقة.',
          'كان على مواد متاجر التطبيقات أن تعمل بالعربية والإنجليزية وأن تلتزم بمتطلبات Apple وGoogle للقطات الشاشة والترجمة.',
        ])
      ),
      outcome: blocks(
        'نظام تصميم موثّق يغطي المكوّنات والحالات والمسافات والخطوط للعربية والإنجليزية، اعتُمد مرجعاً للشاشات الجديدة.',
        'مجموعة كاملة من لقطات الشاشة والمواد التسويقية ثنائية اللغة لمتجري App Store وGoogle Play.'
      ),
      retrospective: blocks(
        'توثيق نظام قائم بالفعل هو في معظمه تفاوض: تحديد أيٍّ من ثلاثة أشكال للزر هو الشكل المعتمد. البدء بجرد للمكوّنات وقائمة بما سيُهمل جعل تلك النقاشات أسرع.'
      ),
      decisions: PLACEHOLDER_DECISIONS.ar,
    },
    en: {
      title: 'NSG Maps',
      summary:
        'Navigation and place-discovery app for the Saudi market. I documented the design system and produced the app-store marketing assets.',
      role: 'UI/UX Designer',
      platform: 'iOS & Android',
      team: 'NSG Geospatial Services',
      tags: ['Mobile app', 'Design system', 'Documentation', 'App-store assets', 'Maps'],
      context: blocks(
        'NSG Maps is a navigation and place-discovery app built for Saudi Arabia, where local place names, Arabic search, and region-specific points of interest matter more than global map products account for.',
        'As the product matured, the team needed the design system documented so that designers and developers shared one source of truth, and needed store listings that presented the app well to a Saudi audience.'
      ),
      constraints: blocks(
        bulletList([
          'The component library already existed in Figma but had grown organically, with inconsistent naming and undocumented states.',
          "App-store assets had to work in both Arabic and English and follow Apple's and Google's screenshot and localisation requirements.",
        ])
      ),
      outcome: blocks(
        'A documented design system covering components, states, spacing, and typography for Arabic and English, adopted as the reference for new screens.',
        'A full set of bilingual app-store screenshots and marketing assets for the App Store and Google Play.'
      ),
      retrospective: blocks(
        'Documenting a system that already exists is mostly negotiation: deciding which of three button variants is the real one. Starting with an inventory and a deprecation list made those conversations faster.'
      ),
      decisions: PLACEHOLDER_DECISIONS.en,
    },
  },
  {
    shared: { slug: 'design-system-component-automation', year: '2025', order: 3, featured: false },
    ar: {
      title: 'نظام التصميم وأتمتة المكوّنات',
      summary:
        'قواعد مقنّنة لطريقة بناء المكوّنات (المتغيّرات، الحالات، التخطيط التلقائي) وخط أنابيب عبر Tokens Studio يُبقي Figma والكود متزامنين.',
      role: 'مصمم واجهات وتجربة مستخدم (أنظمة التصميم)',
      platform: 'Figma وTokens Studio وواجهات الويب الأمامية',
      team: 'NSG للخدمات الجيومكانية',
      tags: ['نظام تصميم', 'الرموز التصميمية', 'Tokens Studio', 'Figma', 'أتمتة'],
      context: blocks(
        'عبر عدة منتجات، كان الفريق يعيد بناء الأزرار وحقول الإدخال والبطاقات نفسها مع اختلافات طفيفة في كل مرة، وكانت الرموز التصميمية (Design Tokens) موزّعة في مكانين: أنماط Figma ومتغيّرات CSS تُحدَّث يدوياً، فتباعدت مع الوقت.'
      ),
      constraints: blocks(
        bulletList([
          'كان يجب أن تكون القواعد قابلة للاستخدام من مصممين لا خلفية هندسية لديهم، فكُتبت كقوائم تحقق للبناء لا كأكواد.',
          'كان على خط أنابيب الرموز أن يندمج في المستودعات القائمة دون عملية ترحيل كبيرة.',
        ])
      ),
      outcome: blocks(
        'معيار مكتوب لبناء المكوّنات: التسمية، وخصائص المتغيّرات، وتغطية الحالات (الافتراضية، التحويم، التركيز، المعطّلة، الخطأ)، وقواعد التخطيط التلقائي.',
        'خط أنابيب عبر Tokens Studio يصدّر الرموز من Figma إلى ملف JSON كمصدر وحيد للحقيقة ويولّد منها متغيّرات CSS، فيصل أي تغيير في الألوان داخل Figma إلى الكود دون خطوة يدوية.'
      ),
      retrospective: blocks(
        'كان أثر قواعد البناء أكبر من أثر الأدوات. فما إن التزم كل مكوّن بنموذج المتغيّرات والحالات نفسه حتى أصبحت الأتمتة مسألة مباشرة؛ قبل ذلك لم يكن هناك ما هو متسق بما يكفي لأتمتته.'
      ),
      decisions: PLACEHOLDER_DECISIONS.ar,
    },
    en: {
      title: 'Design System & Component Automation',
      summary:
        'Codified rules for how components are constructed (variants, states, auto layout) and a Tokens Studio pipeline that keeps Figma and code in sync.',
      role: 'UI/UX Designer (Design Systems)',
      platform: 'Figma, Tokens Studio, web front-end',
      team: 'NSG Geospatial Services',
      tags: ['Design system', 'Design tokens', 'Tokens Studio', 'Figma', 'Automation'],
      context: blocks(
        'Across several products the team was rebuilding the same buttons, inputs, and cards with small differences each time, and design tokens lived in two places: Figma styles and hand-maintained CSS variables that drifted apart.'
      ),
      constraints: blocks(
        bulletList([
          'Rules had to be usable by designers who are not engineers, so they were written as construction checklists, not code.',
          'The token pipeline had to fit into existing repositories without a large migration.',
        ])
      ),
      outcome: blocks(
        'A written standard for component construction: naming, variant properties, state coverage (default, hover, focus, disabled, error), and auto layout rules.',
        'A Tokens Studio pipeline exporting tokens from Figma to a JSON source of truth and generating CSS variables, so a colour change in Figma reaches code without a manual step.'
      ),
      retrospective: blocks(
        'The construction rules had more impact than the tooling. Once every component followed the same variant and state model, automation became straightforward; before that, there was nothing consistent enough to automate.'
      ),
      decisions: PLACEHOLDER_DECISIONS.en,
    },
  },
];

// ---------------------------------------------------------------------------
// Upsert logic
// ---------------------------------------------------------------------------

const DEFAULT_LOCALE = 'ar';
const SECONDARY_LOCALES = ['en'];

/**
 * Create-or-update one document in every locale.
 *
 * @param strapi   loaded Strapi instance
 * @param uid      content type uid
 * @param entry    { shared, ar, en } content
 * @param filters  lookup filters for collection types; null for single types
 */
async function upsertDocument(strapi, uid, entry, filters) {
  const docs = strapi.documents(uid);
  const hasDraftAndPublish = Boolean(strapi.contentType(uid).options?.draftAndPublish);
  const statusParam = hasDraftAndPublish ? { status: 'published' } : {};

  // Lookup: drafts always exist for D&P types, so search drafts.
  const existing = await docs.findFirst({
    ...(filters ? { filters } : {}),
    locale: DEFAULT_LOCALE,
    ...(hasDraftAndPublish ? { status: 'draft' } : {}),
  });

  const defaultData = { ...entry.shared, ...entry[DEFAULT_LOCALE] };
  let documentId;
  let action;

  if (existing) {
    documentId = existing.documentId;
    await docs.update({ documentId, locale: DEFAULT_LOCALE, data: defaultData, ...statusParam });
    action = 'updated';
  } else {
    const created = await docs.create({ locale: DEFAULT_LOCALE, data: defaultData, ...statusParam });
    documentId = created.documentId;
    action = 'created';
  }

  for (const locale of SECONDARY_LOCALES) {
    // update() on a locale that does not exist yet creates it. Shared
    // (non-localized) fields are sent explicitly so required ones like `slug`
    // pass validation on that first create; Strapi keeps them in sync after.
    const localeData = { ...entry.shared, ...entry[locale] };
    await docs.update({ documentId, locale, data: localeData, ...statusParam });
  }

  return { documentId, action };
}

async function seed(strapi) {
  const log = (uid, label, result) =>
    strapi.log.info(`[seed] ${uid} ${label}: ${result.action} (${result.documentId})`);

  // Single types: one document, no lookup filters.
  log('api::global.global', 'global', await upsertDocument(strapi, 'api::global.global', GLOBAL, null));
  log('api::home.home', 'home', await upsertDocument(strapi, 'api::home.home', HOME, null));

  for (const entry of EXPERIENCES) {
    const result = await upsertDocument(strapi, 'api::experience.experience', entry, {
      startDate: entry.shared.startDate,
    });
    log('api::experience.experience', entry.en.company, result);
  }

  for (const entry of CASE_STUDIES) {
    const result = await upsertDocument(strapi, 'api::case-study.case-study', entry, {
      slug: entry.shared.slug,
    });
    log('api::case-study.case-study', entry.shared.slug, result);
  }
}

async function main() {
  // compileStrapi() compiles the TypeScript project into dist/ and returns the
  // app context; createStrapi().load() boots Strapi without opening the HTTP
  // port. load() runs src/index.ts bootstrap, so locales and Public permissions
  // are guaranteed before we write content.
  const appContext = await compileStrapi();
  const strapi = await createStrapi(appContext).load();

  try {
    await seed(strapi);
    strapi.log.info('[seed] done');
  } finally {
    await strapi.destroy();
  }
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
