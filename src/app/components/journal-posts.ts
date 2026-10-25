export type JournalPost = {
  slug: string
  image: string
  titleEn: string
  titleAr: string
  altEn: string
  altAr: string
  excerptEn: string
  excerptAr: string
  bodyEn: string[]
  bodyAr: string[]
}

export const JOURNAL_POSTS: JournalPost[] = [
  {
    slug: "legacy-of-babylon",
    image: "/images/journal/toWEBP (1)/journal-1.webp",
    titleEn: "The Legacy of Babylon",
    titleAr: "إرث بابل",
    altEn: "Babylonian engravings — a legacy of civilization",
    altAr: "نقوش بابل — إرث الحضارة",
    excerptEn:
      "Between the banks of the Tigris and Euphrates, the first written stories were born. In Babylon, perfume was not luxury — it was a language that spoke to the gods.",
    excerptAr:
      "بين ضفاف دجلة والفرات، وُلدت أولى الحكايات المكتوبة. في بابل، لم يكن العطر ترفاً، بل لغة تخاطب الآلهة.",
    bodyEn: [
      "Babylon is not just a city; it is a living memory of human civilization. Through the Ishtar Gate, adorned in blue and black, merchants and priests passed laden with frankincense, myrrh, and fragrant woods from the far corners of the earth.",
      "In the temples of Babylon, incense was burned as an offering to the gods, and recipes were preserved on clay tablets in cuneiform. Those recipes are the oldest record of the art of perfume we have — the root from which all our fragrances grow today.",
      "When you wear our Babylon-inspired fragrance, you are not just wearing perfume; you are opening a gate to an age when scent was part of ritual, memory, and stature.",
    ],
    bodyAr: [
      "بابل ليست مدينة فحسب، بل ذاكرة حيّة للحضارة الإنسانية. من بوابة عشتار المزينة بالأزرق والأسود، كان التجار والكهنة يعبرون محملين باللبان والمر والخشب العطري من أقاصي الأرض.",
      "في معابد بابل، كان البخور يُحرق قرابين للآلهة، وتُحفظ الوصفات على ألواح الطين بالنقش المسماري. هذه الوصفات هي أقدم ما وصلنا من فن العطر، وهي الجذر الذي تنبت منه كل عطورنا اليوم.",
      "حين تضع عطرنا المستوحى من بابل، أنت لا تضع عطراً فقط؛ أنت تفتح بوابة إلى زمن كانت فيه الرائحة جزءاً من الطقس والذاكرة والمكانة.",
    ],
  },
  {
    slug: "symbols-through-time",
    image: "/images/journal/toWEBP (1)/journal-2.webp",
    titleEn: "Symbols Through Time",
    titleAr: "رموز عبر الزمن",
    altEn: "Symbols of civilizations through time",
    altAr: "رموز الحضارات عبر الزمن",
    excerptEn:
      "From the Egyptian lotus to the Greek laurel, every civilization carried a fragrant symbol that expressed its values and beliefs.",
    excerptAr:
      "من اللوتس المصري إلى الغار اليوناني، حملت كل حضارة رمزاً عطرياً يعبّر عن قيمها وما تؤمن به.",
    bodyEn: [
      "Symbols are a language older than words. In Egypt, the lotus was a symbol of rebirth and immortality, appearing on the walls of tombs and temples, held in the hands of the gods. In Greece, the laurel was a crown for heroes and poets.",
      "In China, sandalwood and musk were tied to wisdom and balance, while in the Gulf, amber was a symbol of the light and wealth carried by the waves.",
      "At 3WEEQ, we read these symbols anew: every fragrance is built on a symbol, and every symbol carries a human value that transcends borders.",
    ],
    bodyAr: [
      "الرموز لغة أقدم من الكلمات. في مصر، كان اللوتس رمزاً للبعث والخلود، ويظهر على جدران المقابر والمعابد محمولاً بيد الآلهة. وفي اليونان، كان الغار إكليلاً للأبطال والشعراء.",
      "في الصين، ارتبط خشب الصندل والمسك بالحكمة والتوازن، بينما كان العنبر في الخليج رمزاً للنور والثروة التي تحملها الأمواج.",
      "نحن في 3WEEQ نقرأ هذه الرموز من جديد: كل عطر مبني على رمز، وكل رمز يحمل قيمة إنسانية عابرة للحدود.",
    ],
  },
  {
    slug: "art-of-scent",
    image: "/images/journal/toWEBP (1)/journal-3.webp",
    titleEn: "The Art of Scent",
    titleAr: "فن العطر",
    altEn: "The art of fragrance making",
    altAr: "فن صناعة العطر",
    excerptEn:
      "Perfumery is not merely blending oils — it is the engineering of time: how a fragrance begins, evolves, and stays in memory.",
    excerptAr:
      "صناعة العطر ليست مزجاً للزيوت، بل هندسة للزمن: كيف يبدأ العطر، وكيف يتطور، وكيف يبقى في الذاكرة.",
    bodyEn: [
      "A fragrance is a journey in three stages: the opening that greets you, the heart that reveals its character, and the base that lingers after it is gone. Mastery of this three-part arc is what separates a true fragrance.",
      "In our laboratories, we seek more than a beautiful scent — we seek a story that unfolds over time. We use carefully chosen raw materials: oud, Taif rose, Hadrami frankincense, and orris root.",
      "Every piece we make is limited and numbered, because to us fragrance is not a product to be consumed, but a work of art to be owned and told.",
    ],
    bodyAr: [
      "العطر رحلة من ثلاث مراحل: المقدمة التي تستقبلك، والقلب الذي يعرّفك بالشخصية، والقاعدة التي تبقى بعد الرحيل. إتقان هذه المرحلة الثلاثية هو ما يميز العطر الحقيقي.",
      "في مختبراتنا، لا نبحث عن رائحة جميلة فقط، بل عن قصة تتطور مع الوقت. نستخدم مواد خاماً مختارة بعناية: دهن العود، الورد الطائفي، اللبان الحضرمي، والسوسن.",
      "كل قطعة نصنعها محدودة ومرقّمة، لأن العطر عندنا ليس منتجاً يُستهلك، بل قطعة فنية تُقتنى وتُروى.",
    ],
  },
]
