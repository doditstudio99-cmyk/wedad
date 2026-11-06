// Starting content for a fresh install. Everything here can be edited from the admin panel.
import crypto from 'node:crypto';
const id = () => crypto.randomBytes(8).toString('hex');

export function defaultData() {
  return {
    settings: {
      studioName: 'Dodit Studio',
      tagline: {
        ar: 'استوديو تصوير ريلز وسمارت بورد',
        en: 'Reels & Smart Board Production Studio',
      },
      heroTitle: {
        ar: 'محتوى يخلّي جمهورك يوقف ويتفرج',
        en: 'Content that makes your audience stop scrolling',
      },
      heroSubtitle: {
        ar: 'بنصوّر ريلز وفيديوهات سمارت بورد احترافية للدكاترة والمحامين والمدرسين وأصحاب العقارات — من الفكرة والسكريبت لحد المونتاج النهائي.',
        en: 'Professional reels and smart board videos for doctors, lawyers, teachers and real-estate owners — from idea and script to the final edit.',
      },
      about: {
        ar: 'دوديت ستوديو استوديو متخصص في صناعة المحتوى المرئي للمهنيين وأصحاب الأعمال. بنساعدك تبني حضور قوي على السوشيال ميديا بفيديوهات قصيرة جذابة وشروحات سمارت بورد واضحة، بإضاءة وصوت وكاميرات احترافية، وفريق بيفهم جمهورك ويكتب معاك المحتوى اللي يوصل.',
        en: 'Dodit Studio is a production studio dedicated to visual content for professionals and business owners. We help you build a strong social-media presence with engaging short-form videos and clear smart board explainers — with professional lighting, sound and cameras, and a team that understands your audience and helps you write content that lands.',
      },
      address: { ar: 'القاهرة، مصر', en: 'Cairo, Egypt' },
      workingHoursNote: { ar: 'السبت – الخميس', en: 'Saturday – Thursday' },
      phone: '+20 100 000 0000',
      whatsapp: '201000000000',
      email: 'hello@doditstudio.com',
      mapQuery: 'Cairo, Egypt',
      currency: { ar: 'ج.م', en: 'EGP' },
      timezone: 'Africa/Cairo',
      heroVideo: '',
      // WhatsApp message sent after logging package usage (placeholders in {curly braces})
      packageMessage: 'أهلاً {الاسم} 👋\nمعاك {الاستوديو}.\nتم تصوير {اللي_اتصور} {الوحدة} يوم {التاريخ} ✅\n\n📦 باقتك: {الباقة}\n🎬 المستهلك: {المستهلك} من {الكلي}\n✨ المتبقي: {المتبقي} {الوحدة}\n\nمستنيينك في الجلسة الجاية 🧡',
      social: {
        instagram: 'https://instagram.com/',
        facebook: 'https://facebook.com/',
        tiktok: 'https://tiktok.com/',
        youtube: '',
        snapchat: '',
        x: '',
        linkedin: '',
      },
    },
    schedule: {
      slotMinutes: 60,
      maxDaysAhead: 60,
      minNoticeMinutes: 120,
      // 0 = Sunday … 6 = Saturday
      days: {
        0: { open: true, start: '12:00', end: '22:00' },
        1: { open: true, start: '12:00', end: '22:00' },
        2: { open: true, start: '12:00', end: '22:00' },
        3: { open: true, start: '12:00', end: '22:00' },
        4: { open: true, start: '12:00', end: '22:00' },
        5: { open: false, start: '12:00', end: '22:00' },
        6: { open: true, start: '12:00', end: '22:00' },
      },
      closedDates: [],
    },
    services: [
      {
        id: id(),
        icon: 'reels',
        title: { ar: 'باقة الريلز', en: 'Reels Package' },
        description: {
          ar: 'ريلز قصيرة جذابة مصممة للانتشار على إنستجرام وتيك توك وفيسبوك.',
          en: 'Short, engaging reels built to perform on Instagram, TikTok and Facebook.',
        },
        price: '2500',
        priceNote: { ar: '٤ ريلز', en: '4 reels' },
        features: {
          ar: ['جلسة تصوير ساعة', 'مساعدة في كتابة السكريبت', 'مونتاج احترافي + ترجمة', 'موسيقى ومؤثرات'],
          en: ['1-hour shooting session', 'Script-writing help', 'Pro editing + captions', 'Music & effects'],
        },
        featured: false,
        visible: true,
      },
      {
        id: id(),
        icon: 'combo',
        title: { ar: 'باقة المحتوى الشهرية', en: 'Monthly Content Plan' },
        description: {
          ar: 'خطة محتوى كاملة للشهر: ريلز + فيديوهات سمارت بورد بهوية موحّدة.',
          en: 'A complete monthly content plan: reels + smart board videos with one consistent look.',
        },
        price: '9000',
        priceNote: { ar: 'شهرياً', en: 'per month' },
        features: {
          ar: ['١٢ ريل', '٤ فيديوهات سمارت بورد', 'خطة محتوى وأفكار', 'غلاف (Cover) لكل فيديو', 'أولوية في المواعيد'],
          en: ['12 reels', '4 smart board videos', 'Content plan & ideas', 'Cover for every video', 'Priority booking'],
        },
        featured: true,
        visible: true,
      },
      {
        id: id(),
        icon: 'board',
        title: { ar: 'فيديو سمارت بورد', en: 'Smart Board Video' },
        description: {
          ar: 'شرح احترافي قدام شاشة السمارت بورد — مثالي للدكاترة والمدرسين والمحامين.',
          en: 'A professional explainer in front of the smart board — perfect for doctors, teachers and lawyers.',
        },
        price: '1500',
        priceNote: { ar: 'للفيديو', en: 'per video' },
        features: {
          ar: ['تجهيز الشرائح والرسومات', 'تصوير 4K', 'صوت نقي بمايك احترافي', 'مونتاج + لوجو وهوية'],
          en: ['Slides & graphics prep', '4K filming', 'Crisp pro-mic audio', 'Editing + logo & branding'],
        },
        featured: false,
        visible: true,
      },
    ],
    portfolio: [
      { id: id(), category: 'doctors', type: 'image', url: '', thumb: '', title: { ar: 'ريل توعوي لعيادة أسنان', en: 'Dental clinic awareness reel' }, visible: true },
      { id: id(), category: 'lawyers', type: 'image', url: '', thumb: '', title: { ar: 'نصيحة قانونية في دقيقة', en: 'One-minute legal tip' }, visible: true },
      { id: id(), category: 'teachers', type: 'image', url: '', thumb: '', title: { ar: 'شرح فيزياء على السمارت بورد', en: 'Physics lesson on the smart board' }, visible: true },
      { id: id(), category: 'realestate', type: 'image', url: '', thumb: '', title: { ar: 'جولة في وحدة سكنية', en: 'Apartment walkthrough' }, visible: true },
      { id: id(), category: 'doctors', type: 'image', url: '', thumb: '', title: { ar: 'سلسلة "اسأل الدكتور"', en: '"Ask the Doctor" series' }, visible: true },
      { id: id(), category: 'realestate', type: 'image', url: '', thumb: '', title: { ar: 'إطلاق مشروع عقاري', en: 'Real-estate project launch' }, visible: true },
    ],
    testimonials: [
      {
        id: id(),
        name: 'د. أحمد سمير',
        role: { ar: 'طبيب أسنان', en: 'Dentist' },
        text: {
          ar: 'الريلز اللي اتعملت زودت حجوزات العيادة بشكل واضح. الفريق محترف جداً وبيفهم المطلوب من أول مرة.',
          en: 'The reels clearly increased our clinic bookings. A very professional team that gets it right the first time.',
        },
        rating: 5,
        visible: true,
      },
      {
        id: id(),
        name: 'أ. منى خالد',
        role: { ar: 'مدرسة كيمياء', en: 'Chemistry teacher' },
        text: {
          ar: 'فيديوهات السمارت بورد خلت الشرح أوضح بكتير والطلاب بيتفاعلوا أكتر.',
          en: 'The smart board videos made my lessons much clearer and students engage far more.',
        },
        rating: 5,
        visible: true,
      },
      {
        id: id(),
        name: 'م. كريم عادل',
        role: { ar: 'مطور عقاري', en: 'Real-estate developer' },
        text: {
          ar: 'تصوير الوحدات كان احترافي وساعدنا نبيع أسرع. أكيد هنكمل معاهم.',
          en: 'The property shoots were top-notch and helped us sell faster. We will definitely keep working with them.',
        },
        rating: 5,
        visible: true,
      },
    ],
    bookings: [],
    // Client packages: what a client paid for (e.g. 10 reels) and what has been used so far
    clientPackages: [],
  };
}

