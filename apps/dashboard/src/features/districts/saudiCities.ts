import type { LocalizedText } from '../../data/types';

/**
 * Suggested Saudi cities and their best-known districts, offered when adding a city or districts.
 * It is a starting list, not the official register: anything missing is added by hand on the screen.
 */
export interface RefCity {
  name: LocalizedText;
  /** Approximate city centre — where the branch map opens when a branch has no location yet. */
  center: [number, number];
  districts: LocalizedText[];
}

const d = (ar: string, en: string): LocalizedText => ({ ar, en });

export const SAUDI_CITIES: RefCity[] = [
  {
    name: d('جدة', 'Jeddah'),
    center: [21.5433, 39.1728],
    districts: [
      d('الصفا', 'Al Safa'), d('السلامة', 'Al Salamah'), d('الروضة', 'Al Rawdah'), d('الحمراء', 'Al Hamra'), d('المروة', 'Al Marwah'),
      d('النسيم', 'Al Naseem'), d('البلد', 'Al Balad'), d('الزهراء', 'Al Zahra'), d('النعيم', 'Al Naeem'), d('الشاطئ', 'Al Shati'),
      d('الربوة', 'Al Rabwah'), d('الفيصلية', 'Al Faisaliyah'), d('الرحاب', 'Al Rehab'), d('البوادي', 'Al Bawadi'), d('الخالدية', 'Al Khalidiyah'),
      d('الأندلس', 'Al Andalus'), d('مشرفة', 'Mushrifah'), d('الفيحاء', 'Al Fayha'), d('السامر', 'Al Samer'), d('أبحر الشمالية', 'Obhur Al Shamaliyah'),
    ],
  },
  {
    name: d('مكة', 'Makkah'),
    center: [21.4225, 39.8262],
    districts: [
      d('العزيزية', 'Al Aziziyah'), d('الشوقية', 'Al Shawqiyah'), d('الزاهر', 'Al Zahir'), d('العوالي', 'Al Awali'), d('النسيم', 'Al Naseem'),
      d('الرصيفة', 'Al Rusaifah'), d('الششة', 'Al Shisha'), d('العتيبية', 'Al Utaybiyah'), d('الكعكية', 'Al Kakiyah'), d('بطحاء قريش', 'Batha Quraish'),
      d('الشرائع', 'Al Sharaie'), d('العدل', 'Al Adl'), d('الهجرة', 'Al Hijrah'), d('المسفلة', 'Al Misfalah'),
    ],
  },
  {
    name: d('الرياض', 'Riyadh'),
    center: [24.7136, 46.6753],
    districts: [
      d('الملقا', 'Al Malqa'), d('النرجس', 'Al Narjis'), d('العليا', 'Al Olaya'), d('السليمانية', 'Al Sulaimaniyah'), d('الياسمين', 'Al Yasmin'),
      d('الصحافة', 'Al Sahafah'), d('الربيع', 'Al Rabi'), d('الورود', 'Al Wurud'), d('الملز', 'Al Malaz'), d('الروضة', 'Al Rawdah'),
      d('النخيل', 'Al Nakheel'), d('حطين', 'Hittin'), d('العقيق', 'Al Aqiq'), d('الغدير', 'Al Ghadir'), d('الشفا', 'Al Shifa'),
      d('السويدي', 'Al Suwaidi'), d('قرطبة', 'Qurtubah'), d('اليرموك', 'Al Yarmuk'),
    ],
  },
  {
    name: d('الدمام', 'Dammam'),
    center: [26.4207, 50.0888],
    districts: [
      d('الفيصلية', 'Al Faisaliyah'), d('الشاطئ', 'Al Shati'), d('الريان', 'Al Rayyan'), d('النزهة', 'Al Nuzhah'), d('الفيحاء', 'Al Fayha'),
      d('المزروعية', 'Al Mazruiyah'), d('الجلوية', 'Al Jalawiyah'), d('العزيزية', 'Al Aziziyah'), d('الأنوار', 'Al Anwar'), d('الفرسان', 'Al Fursan'),
      d('طيبة', 'Taibah'), d('النخيل', 'Al Nakheel'),
    ],
  },
  {
    name: d('الخبر', 'Al Khobar'),
    center: [26.2172, 50.1971],
    districts: [d('العقربية', 'Al Aqrabiyah'), d('الثقبة', 'Al Thuqbah'), d('الراكة', 'Al Rakah'), d('الحزام الذهبي', 'Al Hizam Al Dhahabi'), d('الكورنيش', 'Al Corniche'), d('اليرموك', 'Al Yarmuk')],
  },
  {
    name: d('الطائف', 'Taif'),
    center: [21.2703, 40.4158],
    districts: [
      d('الشهداء', 'Al Shuhada'), d('الحوية', 'Al Hawiyah'), d('القمرية', 'Al Qamariyah'), d('الفيصلية', 'Al Faisaliyah'), d('شهار', 'Shihar'),
      d('الوسام', 'Al Wisam'), d('السداد', 'Al Sadad'), d('النسيم', 'Al Naseem'), d('الريان', 'Al Rayyan'), d('العزيزية', 'Al Aziziyah'),
    ],
  },
  {
    name: d('المدينة المنورة', 'Madinah'),
    center: [24.5247, 39.5692],
    districts: [d('قباء', 'Quba'), d('العزيزية', 'Al Aziziyah'), d('الإسكان', 'Al Iskan'), d('العوالي', 'Al Awali'), d('الخالدية', 'Al Khalidiyah'), d('شوران', 'Shuran'), d('الدفاع', 'Al Difa'), d('سلطانة', 'Sultanah'), d('العيون', 'Al Uyun')],
  },
  {
    name: d('تبوك', 'Tabuk'),
    center: [28.3835, 36.5662],
    districts: [d('المروج', 'Al Muruj'), d('الفيصلية', 'Al Faisaliyah'), d('الروضة', 'Al Rawdah'), d('السليمانية', 'Al Sulaimaniyah'), d('المصيف', 'Al Masif'), d('الريان', 'Al Rayyan'), d('الورود', 'Al Wurud'), d('العليا', 'Al Olaya')],
  },
  {
    name: d('أبها', 'Abha'),
    center: [18.2164, 42.5053],
    districts: [d('المنسك', 'Al Mansak'), d('الخالدية', 'Al Khalidiyah'), d('الموظفين', 'Al Muwazafin'), d('النسيم', 'Al Naseem'), d('المحالة', 'Al Mahalah'), d('شمسان', 'Shamsan')],
  },
  {
    name: d('خميس مشيط', 'Khamis Mushait'),
    center: [18.3, 42.7333],
    districts: [d('الراقي', 'Al Raqi'), d('الموسى', 'Al Musa'), d('الضيافة', 'Al Diyafah'), d('الشفاء', 'Al Shifa'), d('النسيم', 'Al Naseem'), d('ذهبان', 'Dhahban')],
  },
  {
    name: d('حائل', 'Hail'),
    center: [27.5114, 41.7208],
    districts: [d('الوسيطاء', 'Al Wusaita'), d('النقرة', 'Al Naqrah'), d('صلاح الدين', 'Salah Al Din'), d('المنتزه', 'Al Muntazah'), d('الزبارة', 'Al Zubarah')],
  },
  {
    name: d('بريدة', 'Buraydah'),
    center: [26.326, 43.975],
    districts: [d('الريان', 'Al Rayyan'), d('الخليج', 'Al Khaleej'), d('الصفراء', 'Al Safra'), d('الإسكان', 'Al Iskan'), d('النهضة', 'Al Nahdah'), d('الفايزية', 'Al Fayziyah')],
  },
];

/** Map centre for a city (by its Arabic name); the middle of the Kingdom when unknown. */
export const cityCenter = (nameAr: string): { center: [number, number]; known: boolean } => {
  const c = SAUDI_CITIES.find((x) => x.name.ar === nameAr);
  return c ? { center: c.center, known: true } : { center: [23.9, 45.1], known: false };
};
