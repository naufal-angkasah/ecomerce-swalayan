export interface SubCategoryItem {
  name: string;
  query?: string;
}

export interface SubCategoryGroup {
  title: string;
  items: SubCategoryItem[];
}

export interface MegaCategoryItem {
  id: string;
  name: string;
  slug: string;
  subtitle?: string;
  thumbnail: string;
  cardImage: string;
  badge?: string;
  themeGradient?: string;
  borderColor?: string;
  textColor?: string;
  groups: SubCategoryGroup[];
}

export const MEGA_CATEGORIES: MegaCategoryItem[] = [
  {
    id: 'sembako',
    name: 'Dapur & Bahan Masakan',
    subtitle: 'Beras, Minyak & Bumbu',
    slug: 'sembako',
    thumbnail: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=160&q=80',
    cardImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
    badge: 'Kebutuhan Pokok',
    themeGradient: 'from-amber-500/10 via-orange-500/5 to-white',
    borderColor: 'border-amber-200/80 hover:border-amber-500 hover:shadow-amber-100',
    textColor: 'text-amber-800',
    groups: [
      {
        title: 'Beras & Biji-Bijian',
        items: [
          { name: 'Beras Ramos' },
          { name: 'Beras Premium' },
          { name: 'Beras Ketan' },
          { name: 'Kacang Hijau' },
        ],
      },
      {
        title: 'Minyak Goreng',
        items: [
          { name: 'Minyak Sawit' },
          { name: 'Minyak Kelapa' },
          { name: 'Minyak Jagung' },
          { name: 'Minyak Wijen' },
        ],
      },
      {
        title: 'Tepung & Gula',
        items: [
          { name: 'Tepung Terigu' },
          { name: 'Tepung Beras' },
          { name: 'Tepung Bumbu' },
          { name: 'Gula Pasir' },
          { name: 'Gula Merah' },
        ],
      },
      {
        title: 'Bahan Masakan',
        items: [
          { name: 'Bumbu Instan' },
          { name: 'Kecap Manis' },
          { name: 'Saus Sambal & Tomat' },
          { name: 'Santan Kelapa' },
          { name: 'Penyedap Rasa' },
        ],
      },
      {
        title: 'Telur & Pelengkap',
        items: [
          { name: 'Telur Ayam Ras' },
          { name: 'Garam Dapur' },
          { name: 'Margarin & Mentega' },
        ],
      },
    ],
  },
  {
    id: 'makanan',
    name: 'Makanan',
    subtitle: 'Mie Instan & Kaleng',
    slug: 'makanan',
    thumbnail: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=160&q=80',
    cardImage: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80',
    themeGradient: 'from-rose-500/10 via-red-500/5 to-white',
    borderColor: 'border-rose-200/80 hover:border-rose-500 hover:shadow-rose-100',
    textColor: 'text-rose-800',
    groups: [
      {
        title: 'Mie & Pasta',
        items: [
          { name: 'Mie Goreng' },
          { name: 'Mie Kuah' },
          { name: 'Bihun & Soun' },
          { name: 'Spaghetti & Makaroni' },
        ],
      },
      {
        title: 'Makanan Kaleng',
        items: [
          { name: 'Ikan Sarden' },
          { name: 'Kornet Sapi' },
          { name: 'Tuna Kaleng' },
          { name: 'Kacang Polong' },
        ],
      },
      {
        title: 'Cemilan & Biskuit',
        items: [
          { name: 'Biskuit Roma' },
          { name: 'Wafer Coklat' },
          { name: 'Cookies' },
          { name: 'Keripik Kentang' },
          { name: 'Kacang Kulit' },
        ],
      },
      {
        title: 'Aneka Roti & Selai',
        items: [
          { name: 'Roti Tawar' },
          { name: 'Roti Manis' },
          { name: 'Selai Coklat' },
          { name: 'Selai Kacang' },
        ],
      },
      {
        title: 'Coklat & Permen',
        items: [
          { name: 'Coklat Batang' },
          { name: 'Permen Mint' },
          { name: 'Permen Karet' },
        ],
      },
    ],
  },
  {
    id: 'minuman',
    name: 'Minuman',
    subtitle: 'Kopi Aceh & Sirup',
    slug: 'minuman',
    thumbnail: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=160&q=80',
    cardImage: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=400&q=80',
    themeGradient: 'from-sky-500/10 via-blue-500/5 to-white',
    borderColor: 'border-sky-200/80 hover:border-sky-500 hover:shadow-sky-100',
    textColor: 'text-sky-800',
    groups: [
      {
        title: 'Kopi Khas Aceh',
        items: [
          { name: 'Kopi Ulee Kareng' },
          { name: 'Kopi Gayo Arabika' },
          { name: 'Kopi Robusta Aceh' },
          { name: 'Kopi Sachet Instan' },
        ],
      },
      {
        title: 'Teh & Coklat',
        items: [
          { name: 'Teh Celup Sariwangi' },
          { name: 'Teh Botol Sosro' },
          { name: 'Minuman Coklat' },
          { name: 'Teh Hijau' },
        ],
      },
      {
        title: 'Air Mineral',
        items: [
          { name: 'Air Galon Aqua' },
          { name: 'Air Botol 600ml' },
          { name: 'Air Gelas Dus' },
          { name: 'Air Mineral Le Minerale' },
        ],
      },
      {
        title: 'Sirup & Jus',
        items: [
          { name: 'Sirup Patung Kurnia' },
          { name: 'Sirup Marjan Boudoin' },
          { name: 'Jus Buah Segar' },
          { name: 'Sari Kelapa Nata de Coco' },
        ],
      },
      {
        title: 'Susu & Minuman Rasa',
        items: [
          { name: 'Susu Kotak UHT' },
          { name: 'Susu Steril Bear Brand' },
          { name: 'Isotonik Pocari' },
          { name: 'Minuman Soda' },
        ],
      },
    ],
  },
  {
    id: 'susu-sarapan',
    name: 'Susu & Sarapan',
    subtitle: 'Susu UHT & Sereal',
    slug: 'susu-sarapan',
    thumbnail: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=160&q=80',
    cardImage: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
    themeGradient: 'from-yellow-500/10 via-amber-500/5 to-white',
    borderColor: 'border-yellow-200/80 hover:border-yellow-500 hover:shadow-yellow-100',
    textColor: 'text-yellow-800',
    groups: [
      {
        title: 'Susu Keluarga',
        items: [
          { name: 'Susu Bubuk Dancow' },
          { name: 'Kental Manis Frisian Flag' },
          { name: 'Susu Ultra Milk' },
          { name: 'Susu Kedelai' },
        ],
      },
      {
        title: 'Sereal & Havermut',
        items: [
          { name: 'Koko Krunch' },
          { name: 'Milo Cereal' },
          { name: 'Quaker Oats' },
          { name: 'Granola Sehat' },
        ],
      },
      {
        title: 'Selai & Olesan',
        items: [
          { name: 'Nutella Coklat' },
          { name: 'Selai Nanas & Stroberi' },
          { name: 'Madu Asli Hutan Aceh' },
        ],
      },
    ],
  },
  {
    id: 'personal-care',
    name: 'Perawatan Diri',
    subtitle: 'Sabun, Sampo & Gigi',
    slug: 'personal-care',
    thumbnail: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=160&q=80',
    cardImage: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
    themeGradient: 'from-pink-500/10 via-rose-500/5 to-white',
    borderColor: 'border-pink-200/80 hover:border-pink-500 hover:shadow-pink-100',
    textColor: 'text-pink-800',
    groups: [
      {
        title: 'Mandi & Sabun',
        items: [
          { name: 'Sabun Mandi Cair Lifebuoy' },
          { name: 'Sabun Batang Biore' },
          { name: 'Lulur & Scrub' },
          { name: 'Spons Mandi' },
        ],
      },
      {
        title: 'Perawatan Rambut',
        items: [
          { name: 'Sampo Pantene & Sunsilk' },
          { name: 'Kondisioner' },
          { name: 'Minyak Rambut Pomade' },
        ],
      },
      {
        title: 'Gigi & Mulut',
        items: [
          { name: 'Pasta Gigi Pepsodent' },
          { name: 'Sikat Gigi Formula' },
          { name: 'Obat Kumur Listerine' },
        ],
      },
      {
        title: 'Wajah & Kulit',
        items: [
          { name: 'Facial Wash Men & Women' },
          { name: 'Body Lotion Vaseline' },
          { name: 'Deodorant Rexona' },
        ],
      },
    ],
  },
  {
    id: 'rumah-tangga',
    name: 'Kebutuhan Rumah',
    subtitle: 'Deterjen & Pembersih',
    slug: 'rumah-tangga',
    thumbnail: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=160&q=80',
    cardImage: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=400&q=80',
    themeGradient: 'from-emerald-500/10 via-teal-500/5 to-white',
    borderColor: 'border-emerald-200/80 hover:border-emerald-500 hover:shadow-emerald-100',
    textColor: 'text-emerald-800',
    groups: [
      {
        title: 'Cuci Pakaian',
        items: [
          { name: 'Deterjen Rinso' },
          { name: 'Deterjen Daia' },
          { name: 'Pewangi Molto' },
          { name: 'Pemutih Bayclin' },
        ],
      },
      {
        title: 'Cuci Piring',
        items: [
          { name: 'Sunlight Jeruk Nipis' },
          { name: 'Mama Lemon' },
          { name: 'Sabun Colek Ekonomi' },
        ],
      },
      {
        title: 'Pembersih Rumah',
        items: [
          { name: 'Wipol Karbol Wangi' },
          { name: 'Super Pel Lantai' },
          { name: 'Pembersih Kaca Cling' },
          { name: 'Vixal Pembersih Porselen' },
        ],
      },
      {
        title: 'Tissue & Perlengkapan',
        items: [
          { name: 'Tissue Wajah Paseo' },
          { name: 'Tissue Gulung Toilet' },
          { name: 'Obat Nyamuk Baygon' },
          { name: 'Kantong Plastik Sampah' },
        ],
      },
    ],
  },
  {
    id: 'bayi-anak',
    name: 'Ibu & Bayi',
    subtitle: 'Popok & Minyak Telon',
    slug: 'bayi-anak',
    thumbnail: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=160&q=80',
    cardImage: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=400&q=80',
    themeGradient: 'from-purple-500/10 via-indigo-500/5 to-white',
    borderColor: 'border-purple-200/80 hover:border-purple-500 hover:shadow-purple-100',
    textColor: 'text-purple-800',
    groups: [
      {
        title: 'Popok Bayi',
        items: [
          { name: 'MamyPoko Pants' },
          { name: 'Sweety Silver & Gold' },
          { name: 'Merries Pants' },
          { name: 'Popok Perekat Newborn' },
        ],
      },
      {
        title: 'Susu Formula',
        items: [
          { name: 'SGM Eksplor' },
          { name: 'Chil Kid Morinaga' },
          { name: 'Bebelac 3 & 4' },
          { name: 'Dancow Balita' },
        ],
      },
      {
        title: 'Perawatan Bayi',
        items: [
          { name: 'Minyak Telon My Baby' },
          { name: 'Baby Bath 2in1' },
          { name: 'Baby Wipes Basah' },
          { name: 'Bedak Bayi Cussons' },
        ],
      },
      {
        title: 'Makanan Bayi',
        items: [
          { name: 'Bubur Bayi Cerelac' },
          { name: 'Biskuit Bayi Milna' },
          { name: 'Puding Bayi' },
        ],
      },
    ],
  },
  {
    id: 'produk-segar',
    name: 'Produk Segar',
    subtitle: 'Buah & Sayur Segar',
    slug: 'produk-segar',
    thumbnail: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=160&q=80',
    cardImage: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=400&q=80',
    themeGradient: 'from-green-500/10 via-emerald-500/5 to-white',
    borderColor: 'border-green-200/80 hover:border-green-500 hover:shadow-green-100',
    textColor: 'text-green-800',
    groups: [
      {
        title: 'Buah-Buahan',
        items: [
          { name: 'Apel Fuji Segar' },
          { name: 'Jeruk Medan Manis' },
          { name: 'Pisang Barangan' },
          { name: 'Semangka Merah' },
        ],
      },
      {
        title: 'Sayur & Bumbu Basah',
        items: [
          { name: 'Bawang Merah & Putih' },
          { name: 'Cabai Merah Aceh' },
          { name: 'Tomat Segar' },
          { name: 'Kentang & Wortel' },
        ],
      },
    ],
  },
  {
    id: 'frozen-food',
    name: 'Frozen Food',
    subtitle: 'Nugget & Sosis',
    slug: 'frozen-food',
    thumbnail: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=160&q=80',
    cardImage: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=400&q=80',
    themeGradient: 'from-cyan-500/10 via-blue-500/5 to-white',
    borderColor: 'border-cyan-200/80 hover:border-cyan-500 hover:shadow-cyan-100',
    textColor: 'text-cyan-800',
    groups: [
      {
        title: 'Olahan Ayam & Daging',
        items: [
          { name: 'Nugget Fiesta & So Good' },
          { name: 'Sosis Sapi Kanzler' },
          { name: 'Bakso Sapi Sumber Selera' },
          { name: 'Chicken Wings' },
        ],
      },
      {
        title: 'Kentang & Camilan Beku',
        items: [
          { name: 'French Fries Shoestring' },
          { name: 'Dimsum & Siomay' },
          { name: 'Piscok Lumer Beku' },
        ],
      },
    ],
  },
  {
    id: 'kesehatan',
    name: 'Kesehatan & P3K',
    subtitle: 'Minyak Angin & Vitamin',
    slug: 'kesehatan',
    thumbnail: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=160&q=80',
    cardImage: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=400&q=80',
    themeGradient: 'from-teal-500/10 via-cyan-500/5 to-white',
    borderColor: 'border-teal-200/80 hover:border-teal-500 hover:shadow-teal-100',
    textColor: 'text-teal-800',
    groups: [
      {
        title: 'Minyak Angin & Obat Luar',
        items: [
          { name: 'Minyak Kayu Putih Cap Lang' },
          { name: 'Freshcare Roll On' },
          { name: 'Balsem Geliga' },
          { name: 'Koyo Hansaplast' },
        ],
      },
      {
        title: 'Herbal & Vitamin',
        items: [
          { name: 'Tolak Angin Sido Muncul' },
          { name: 'Vitamin C Enervon C' },
          { name: 'Madu TJ Murni' },
          { name: 'Imboost Force' },
        ],
      },
    ],
  },
];
