// Русские названия карт по английскому имени из API (/api/cards, GwentCardData.php)
// и переводы способностей по ключу способности (abilities.js).
// Бэкенд не трогаем: перевод выполняется на фронтенде «на лету».

export const CARD_NAMES_RU: Record<string, string> = {
  // Нейтральные и специальные
  'Mysterious Elf': 'Таинственный эльф',
  'Decoy': 'Чучело',
  'Biting Frost': 'Трескучий мороз',
  'Cirilla Fiona Elen Riannon': 'Цирилла Фиона Элен Рианнон',
  'Clear Weather': 'Ясная погода',
  "Commander's Horn": 'Командирский рог',
  'Dandelion': 'Лютик',
  'Emiel Regis Rohellec Terzieff': 'Эмиель Регис Рогеллек Терзиефф',
  'Geralt of Rivia': 'Геральт из Ривии',
  'Impenetrable Fog': 'Непроглядный туман',
  'Scorch': 'Испепеление',
  'Torrential Rain': 'Проливной дождь',
  'Triss Merigold': 'Трисс Меригольд',
  'Vesemir': 'Весемир',
  'Villentretenmerth': 'Виллентретенмерт',
  'Yennefer of Vengerberg': 'Йеннифэр из Венгерберга',
  'Zoltan Chivay': 'Золтан Хивай',
  'Olgierd von Everec': 'Ольгерд фон Эверек',
  "Gaunter O'Dimm": "Гюнтер о'Дим",
  "Gaunter O'Dimm - Darkness": "Гюнтер о'Дим - Тьма",
  'Cow': 'Корова',
  'Bovine Defense Force': 'Отряд Бурёнок Быстрого Реагирования',

  // Королевства Севера — лидеры
  'Foltest - King of Temeria': 'Фольтест - Король Темерии',
  'Foltest - Lord Commander of the North': 'Фольтест - Владыка Севера',
  'Foltest - The Siegemaster': 'Фольтест - Повелитель осады',
  'Foltest - The Steel-Forged': 'Фольтест - Закалённый в боях',
  'Foltest - Son of Medell': 'Фольтест - Сын Медела',

  // Королевства Севера
  'Ballista': 'Баллиста',
  'Blue Stripes Commando': 'Коммандос «Синие Полоски»',
  'Catapult': 'Катапульта',
  'Crinfrid Reavers Dragon Hunter': 'Головорез из Кринфрида',
  'Dethmold': 'Детмольд',
  'Dun Banner Medic': 'Медик Бурой Хоругви',
  'Esterad Thyssen': 'Эстерад Тиссен',
  'John Natalis': 'Ян Наталис',
  'Kaedweni Siege Expert': 'Каэдвенский осадный мастер',
  'Keira Metz': 'Кейра Мец',
  'Philippa Eilhart': 'Филиппа Эйльхарт',
  'Poor Fucking Infantry': 'Голожопая пехота',
  'Prince Stennis': 'Принц Стеннис',
  'Redanian Foot Soldier': 'Реданский пехотинец',
  'Sheldon Skaggs': 'Шелдон Скаггс',
  'Siege Tower': 'Осадная башня',
  'Siegfried of Denesle': 'Зигфрид из Денесле',
  'Sigismund Dijkstra': 'Сигизмунд Дийкстра',
  'Síle de Tansarville': 'Шеала де Тансервилль',
  'Thaler': 'Талер',
  'Sabrina Glevissig': 'Сабрина Глевиссиг',
  'Vernon Roche': 'Вернон Роше',
  'Ves': 'Бьянка',
  'Yarpen Zigrin': 'Ярпен Зигрин',
  'Trebuchet': 'Требушет',

  // Нильфгаард — лидеры
  'Emhyr var Emreis - His Imperial Majesty': 'Эмгыр вар Эмрейс - Его Императорское Величество',
  'Emhyr var Emreis - Emperor of Nilfgaard': 'Эмгыр вар Эмрейс - Император Нильфгаарда',
  'Emhyr var Emreis - the White Flame': 'Эмгыр вар Эмрейс - Белое Пламя',
  'Emhyr var Emreis - The Relentless': 'Эмгыр вар Эмрейс - Неумолимый',
  'Emhyr var Emreis - Invader of the North': 'Эмгыр вар Эмрейс - Завоеватель Севера',

  // Нильфгаард
  'Albrich': 'Альбрих',
  'Assire var Anahid': 'Ассирэ вар Анагыд',
  'Black Infantry Archer': 'Лучник Чёрной пехоты',
  'Cahir Mawr Dyffryn aep Ceallach': 'Кагыр Маур Дыффин аэп Кеаллах',
  'Cynthia': 'Цинтия',
  'Etolian Auxiliary Archers': 'Этолийские вспомогательные лучники',
  'Fringilla Vigo': 'Фрингилья Виго',
  'Heavy Zerrikanian Fire Scorpion': 'Тяжёлый зерриканский огненный скорпион',
  'Impera Brigade Guard': 'Гвардеец бригады «Импера»',
  'Letho of Gulet': 'Лето из Гулеты',
  'Menno Coehoorn': 'Мэнно Коегоорн',
  'Morteisen': 'Мортейсен',
  'Morvran Voorhis': 'Морвран Воорхис',
  'Nausicaa Cavalry Rider': 'Кавалерист бригады «Наузикаа»',
  'Puttkammer': 'Путткаммер',
  'Rainfarn': 'Раинфарн',
  'Renuald aep Matsen': 'Ренуальд аэп Матсен',
  'Rotten Mangonel': 'Зачумлённая катапульта',
  'Shilard Fitz-Oesterlen': 'Шилярд Фиц-Эстерлен',
  'Siege Engineer': 'Осадный инженер',
  'Siege Technician': 'Осадный техник',
  'Stefan Skellen': 'Стефан Скеллен',
  'Sweers': 'Сверс',
  'Tibor Eggebracht': 'Тибор Эггебрахт',
  'Vanhemar': 'Ванхемар',
  'Vattier de Rideaux': 'Ваттье де Ридо',
  'Vreemde': 'Вреемде',
  'Young Emissary': 'Молодой эмиссар',
  'Zerrikanian Fire Scorpion': 'Зерриканский огненный скорпион',

  // Чудовища — лидеры
  'Eredin - Commander of the Red Riders': 'Эредин - Командир Красных Всадников',
  'Eredin - Bringer of Death': 'Эредин - Предвестник смерти',
  'Eredin - Destroyer of Worlds': 'Эредин - Разрушитель миров',
  'Eredin - King of the Wild Hunt': 'Эредин - Король Дикой Охоты',
  'Eredin Bréacc Glas - The Treacherous': 'Эредин Бреакк Глас - Предатель',

  // Чудовища
  'Arachas': 'Главоглаз',
  'Arachas- Behemoth': 'Главоглаз-бегемот',
  'Botchling': 'Игоша',
  'Celaeno Harpy': 'Гарпия-келайно',
  'Cockatrice': 'Куролиск',
  'Crone - Brewess': 'Ведьма - Кухарка',
  'Crone - Weavess': 'Ведьма - Пряха',
  'Crone - Whispess': 'Ведьма - Шептуха',
  'Draug': 'Драуг',
  'Earth Elemental': 'Элементаль земли',
  'Endrega': 'Эндрега',
  'Fiend': 'Бес',
  'Fire Elemental': 'Элементаль огня',
  'Foglet': 'Туманник',
  'Forktail': 'Вилохвост',
  'Frightener': 'Ужас',
  'Gargoyle': 'Гаргулья',
  'Ghoul': 'Гуль',
  'Grave Hag': 'Кладбищенская баба',
  'Griffin': 'Грифон',
  'Harpy': 'Гарпия',
  'Ice Giant': 'Ледяной великан',
  'Imlerith': 'Имлерих',
  'Kayran': 'Кейран',
  'Leshen': 'Леший',
  'Nekker': 'Накер',
  'Plague Maiden': 'Моровая дева',
  'Vampire - Bruxa': 'Вампир - Брукса',
  'Vampire - Ekimmara': 'Вампир - Экимма',
  'Vampire - Fleder': 'Вампир - Фледер',
  'Vampire - Garkain': 'Вампир - Гаркаин',
  'Vampire - Katakan': 'Вампир - Катакан',
  'Werewolf': 'Волколак',
  'Wyvern': 'Виверна',
  'Toad': 'Жаба',

  // Скоя'таэли — лидеры
  'Francesca Findabair - Queen of Dol Blathanna': 'Францеска Финдабаир - Королева Дол Блатанны',
  'Francesca Findabair - the Beautiful': 'Францеска Финдабаир - Прекрасная',
  'Francesca Findabair - Daisy of the Valley': 'Францеска Финдабаир - Долинная Маргаритка',
  'Francesca Findabair - Pureblood Elf': 'Францеска Финдабаир - Чистокровная эльфийка',
  'Francesca Findabair - Hope of the Aen Seidhe': 'Францеска Финдабаир - Надежда Аэн Сейдхе',

  // Скоя'таэли
  'Ciaran aep Easnillien': 'Киаран аэп Эасниллен',
  'Barclay Els': 'Барклай Эльс',
  'Dennis Cranmer': 'Деннис Кранмер',
  'Dol Blathanna Archer': 'Лучник из Дол Блатанны',
  'Dol Blathanna Scout': 'Разведчик из Дол Блатанны',
  'Dwarven Skirmisher': 'Краснолюдский ополченец',
  'Eithné': 'Эитнэ',
  'Elven Skirmisher': 'Эльфийский ополченец',
  'Filavandrel aen Fidhail': 'Филавандрель аэн Фидаиль',
  'Havekar Healer': 'Хавекар-знахарь',
  'Havekar Smuggler': 'Хавекар-контрабандист',
  'Ida Emean aep Sivney': 'Ида Эмеан аэп Сивней',
  'Iorveth': 'Иорвет',
  'Isengrim Faoiltiarna': 'Исенгрим Фаоильтиарна',
  'Mahakaman Defender': 'Защитник Махакама',
  'Milva': 'Мильва',
  'Riordain': 'Риордаин',
  'Saesenthessis': 'Саэсентессис',
  'Toruviel': 'Торувьель',
  'Vrihedd Brigade Recruit': 'Новобранец бригады «Врихедд»',
  'Vrihedd Brigade Veteran': 'Ветеран бригады «Врихедд»',
  'Yaevinn': 'Яевинн',
  'Schirru': 'Ширру',

  // Скеллиге — лидеры
  'Crach an Craite': 'Крах ан Крайт',
  'King Bran': 'Король Бран',

  // Скеллиге
  'Berserker': 'Берсерк',
  'Birna Bran': 'Бирна Бран',
  'Blueboy Lugos': 'Лугос Синий',
  'Cerys': 'Керис',
  'Clan Brokva Archer': 'Лучник клана Броквар',
  'Clan Dimun Pirate': 'Пират клана Димун',
  'Cerys - Clan Drummond Shield Maiden': 'Керис - Воительница клана Друммонд',
  'Clan Heymaey Skald': 'Скальд клана Хеймай',
  'Clan Tordarroch Armorsmith': 'Бронник клана Тордаррох',
  'Clan an Craite Warrior': 'Воин клана ан Крайт',
  'Donar an Hindar': 'Донар ан Хиндар',
  'Draig Bon-Dhu': 'Драйг Бон-Дху',
  'Ermion': 'Мышовур',
  'Hemdall': 'Хемдалль',
  'Hjalmar': 'Хьялмар',
  'Holger Blackhand': 'Хольгер Чернорукий',
  'Kambi': 'Камби',
  'Light Longship': 'Лёгкий драккар',
  'Madman Lugos': 'Лугос Безумный',
  'Mardroeme': 'Мардрёме',
  'Olaf': 'Олаф',
  'Skellige Storm': 'Шторм Скеллиге',
  'Svanrige': 'Сванриге',
  'Transformed Vildkaarl': 'Преображённый вильдкаарл',
  'Transformed Young Vildkaarl': 'Преображённый молодой вильдкаарл',
  'Udalryk': 'Удальрик',
  'War Longship': 'Боевой драккар',
  'Young Berserker': 'Молодой берсерк',
}

export interface AbilityTranslation {
  name?: string
  description: string
}

export const ABILITIES_RU: Record<string, AbilityTranslation> = {
  clear: {
    name: 'Ясная погода',
    description: 'Убирает все эффекты погодных карт (Трескучий мороз, Непроглядный туман и Проливной дождь).',
  },
  frost: {
    name: 'Трескучий мороз',
    description: 'Устанавливает силу всех карт ближнего боя равной 1 у обоих игроков.',
  },
  fog: {
    name: 'Непроглядный туман',
    description: 'Устанавливает силу всех карт дальнего боя равной 1 у обоих игроков.',
  },
  rain: {
    name: 'Проливной дождь',
    description: 'Устанавливает силу всех осадных карт равной 1 у обоих игроков.',
  },
  storm: {
    name: 'Шторм Скеллиге',
    description: 'Уменьшает силу всех отрядов дальнего боя и осады до 1.',
  },
  hero: {
    name: 'Герой',
    description: 'Не подвержен действию специальных карт и способностей.',
  },
  decoy: {
    name: 'Чучело',
    description: 'Поменяйте местами с картой на поле, чтобы вернуть её в руку.',
  },
  horn: {
    name: 'Командирский рог',
    description: 'Удваивает силу всех отрядов в ряду. Не более одного на ряд.',
  },
  mardroeme: {
    name: 'Мардрёме',
    description: 'Запускает превращение всех карт берсерков в этом ряду.',
  },
  berserker: {
    name: 'Берсерк',
    description: 'Превращается в медведя, когда в его ряду находится карта «Мардрёме».',
  },
  scorch: {
    name: 'Испепеление',
    description: 'Сбрасывается после розыгрыша. Уничтожает самые сильные карты на поле.',
  },
  scorch_c: {
    name: 'Испепеление - ближний бой',
    description: 'Уничтожает сильнейшие отряды ближнего боя противника, если их суммарная сила равна 10 или больше.',
  },
  scorch_r: {
    name: 'Испепеление - дальний бой',
    description: 'Уничтожает сильнейшие отряды дальнего боя противника, если их суммарная сила равна 10 или больше.',
  },
  scorch_s: {
    name: 'Испепеление - осада',
    description: 'Уничтожает сильнейшие осадные отряды противника, если их суммарная сила равна 10 или больше.',
  },
  agile: {
    name: 'Манёвренность',
    description: 'Можно разместить в ряду ближнего или дальнего боя. Нельзя переместить после размещения.',
  },
  muster: {
    name: 'Сбор',
    description: 'Найдите в колоде все карты с таким же именем и сразу разыграйте их.',
  },
  spy: {
    name: 'Шпион',
    description: 'Размещается на половине противника (сила идёт в его счёт); вы берёте 2 карты из своей колоды.',
  },
  medic: {
    name: 'Медик',
    description: 'Выберите одну карту из своего сброса и сразу разыграйте её (кроме героев и специальных карт).',
  },
  morale: {
    name: 'Боевой дух',
    description: 'Прибавляет +1 к силе всех отрядов в ряду (кроме себя).',
  },
  bond: {
    name: 'Крепкие узы',
    description: 'Разместите рядом с картой с таким же именем, чтобы удвоить силу обеих карт.',
  },
  avenger: {
    name: 'Мститель',
    description: 'Когда эту карту убирают с поля, она призывает на своё место новый мощный отряд.',
  },
  avenger_kambi: {
    name: 'Мститель',
    description: 'Когда эту карту убирают с поля, она призывает на своё место новый мощный отряд.',
  },

  // Способности лидеров
  foltest_king: {
    description: 'Возьмите из своей колоды карту «Непроглядный туман» и сразу разыграйте её.',
  },
  foltest_lord: {
    description: 'Убирает с поля все эффекты погоды (Трескучий мороз, Проливной дождь и Непроглядный туман).',
  },
  foltest_siegemaster: {
    description: 'Удваивает силу всех ваших осадных отрядов (если в ряду нет Командирского рога).',
  },
  foltest_steelforged: {
    description: 'Уничтожает сильнейшие осадные отряды противника, если их суммарная сила равна 10 или больше.',
  },
  foltest_son: {
    description: 'Уничтожает сильнейшие отряды дальнего боя противника, если их суммарная сила равна 10 или больше.',
  },
  emhyr_imperial: {
    description: 'Возьмите из своей колоды карту «Проливной дождь» и сразу разыграйте её.',
  },
  emhyr_emperor: {
    description: 'Посмотрите 3 случайные карты из руки противника.',
  },
  emhyr_whiteflame: {
    description: 'Отменяет способность лидера противника.',
  },
  emhyr_relentless: {
    description: 'Возьмите карту из сброса противника.',
  },
  emhyr_invader: {
    description: 'Способности, возвращающие отряд на поле, возвращают случайный отряд. Действует на обоих игроков.',
  },
  eredin_commander: {
    description: 'Удваивает силу всех ваших отрядов ближнего боя (если в ряду нет Командирского рога).',
  },
  eredin_bringer_of_death: {
    name: 'Эредин: Предвестник смерти',
    description: 'Верните карту из своего сброса в руку.',
  },
  eredin_destroyer: {
    description: 'Сбросьте 2 карты и возьмите 1 карту на выбор из своей колоды.',
  },
  eredin_king: {
    description: 'Возьмите из своей колоды любую погодную карту и сразу разыграйте её.',
  },
  eredin_treacherous: {
    description: 'Удваивает силу всех карт-шпионов (действует на обоих игроков).',
  },
  francesca_queen: {
    description: 'Уничтожает сильнейшие отряды ближнего боя противника, если их суммарная сила равна 10 или больше.',
  },
  francesca_beautiful: {
    description: 'Удваивает силу всех ваших отрядов дальнего боя (если в ряду нет Командирского рога).',
  },
  francesca_daisy: {
    description: 'Возьмите дополнительную карту в начале битвы.',
  },
  francesca_pureblood: {
    description: 'Возьмите из своей колоды карту «Трескучий мороз» и сразу разыграйте её.',
  },
  francesca_hope: {
    description: 'Переместите манёвренные отряды в тот ряд, где их сила максимальна (отряды в оптимальном ряду не перемещаются).',
  },
  crach_an_craite: {
    description: 'Замешайте все карты из сброса обоих игроков обратно в их колоды.',
  },
  king_bran: {
    description: 'Отряды теряют лишь половину силы при плохой погоде.',
  },
}
