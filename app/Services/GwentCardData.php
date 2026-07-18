<?php

namespace App\Services;

class GwentCardData
{
    private static array $cards = [];

    public static function all(): array
    {
        if (empty(self::$cards)) {
            self::$cards = self::build();
        }
        return self::$cards;
    }

    public static function get(int $index): ?array
    {
        $all = self::all();
        return $all[$index] ?? null;
    }

    public static function getByName(string $name): array
    {
        return array_values(array_filter(self::all(), fn($c) => $c['name'] === $name));
    }

    public static function getIndicesForFaction(string $faction): array
    {
        $all = self::all();
        $result = [];
        foreach ($all as $i => $card) {
            if ($card['deck'] === $faction || $card['deck'] === 'neutral') {
                $result[] = $i;
            }
        }
        return $result;
    }

    public static function getLeadersForFaction(string $faction): array
    {
        $all = self::all();
        $result = [];
        foreach ($all as $i => $card) {
            if ($card['deck'] === $faction && $card['row'] === 'leader') {
                $result[] = array_merge(['index' => $i], $card);
            }
        }
        return $result;
    }

    public static function getDefaultDeck(string $faction): array
    {
        $defaults = self::defaultDecks();
        return $defaults[$faction] ?? $defaults['realms'];
    }

    private static function defaultDecks(): array
    {
        return [
            'realms' => [
                'faction' => 'realms',
                'leader_index' => 24,
                'cards' => [
                    [24, 1], [5, 1], [1, 3], [2, 1], [3, 1], [8, 1],
                    [33, 1], [34, 1], [39, 1], [51, 1], [29, 2], [12, 1],
                    [14, 1], [15, 1], [27, 1], [17, 1], [45, 1], [54, 1],
                    [55, 1], [30, 3], [32, 1], [41, 1], [28, 3], [19, 3],
                    [47, 1], [6, 1], [18, 1], [49, 1], [0, 1],
                ],
            ],
            'nilfgaard' => [
                'faction' => 'nilfgaard',
                'leader_index' => 59,
                'cards' => [
                    [59, 1], [5, 1], [1, 3], [10, 1], [2, 1], [4, 1],
                    [9, 1], [11, 1], [3, 1], [8, 1], [63, 1], [64, 1],
                    [70, 1], [73, 1], [75, 1], [84, 1], [81, 1], [14, 1],
                    [15, 1], [17, 1], [90, 1], [91, 1], [19, 3], [88, 1],
                    [71, 4], [6, 1], [18, 1], [67, 1], [68, 1], [0, 1], [83, 1],
                ],
            ],
            'monsters' => [
                'faction' => 'monsters',
                'leader_index' => 93,
                'cards' => [
                    [93, 1], [5, 1], [1, 3], [10, 1], [4, 1], [9, 1],
                    [11, 1], [3, 1], [8, 1], [124, 1], [125, 1], [138, 1],
                    [14, 1], [15, 1], [101, 1], [105, 1], [106, 1], [107, 1],
                    [17, 1], [135, 1], [98, 1], [99, 1], [100, 1], [102, 1],
                    [19, 3], [131, 1], [132, 1], [133, 1], [134, 1], [6, 1],
                    [18, 1], [127, 1], [128, 1], [129, 1], [0, 1],
                ],
            ],
            'scoiatael' => [
                'faction' => 'scoiatael',
                'leader_index' => 141,
                'cards' => [
                    [141, 1], [5, 1], [1, 3], [10, 1], [2, 1], [4, 1],
                    [9, 1], [11, 1], [3, 1], [8, 1], [167, 1], [173, 1],
                    [213, 1], [14, 1], [15, 1], [148, 1], [17, 1], [162, 1],
                    [163, 1], [164, 1], [19, 3], [144, 1], [151, 1], [152, 1],
                    [153, 1], [6, 1], [18, 1], [159, 1], [160, 1], [0, 1],
                ],
            ],
            'skellige' => [
                'faction' => 'skellige',
                'leader_index' => 211,
                'cards' => [
                    [211, 1], [5, 1], [202, 1], [10, 1], [2, 1], [204, 1],
                    [11, 1], [3, 1], [8, 1], [203, 1], [184, 1], [195, 1],
                    [14, 1], [15, 1], [192, 3], [186, 1], [17, 1], [187, 1],
                    [188, 1], [189, 1], [200, 3], [182, 1], [6, 1], [210, 3],
                    [199, 1], [0, 1],
                ],
            ],
        ];
    }

    private static function build(): array
    {
        return [
            0  => ['name' => 'Mysterious Elf', 'id' => '142', 'deck' => 'neutral', 'row' => 'close', 'strength' => 0, 'abilities' => ['hero', 'spy'], 'filename' => 'mysterious_elf', 'count' => 1],
            1  => ['name' => 'Decoy', 'id' => '1', 'deck' => 'special', 'row' => '', 'strength' => 0, 'abilities' => ['decoy'], 'filename' => 'decoy', 'count' => 3],
            2  => ['name' => 'Biting Frost', 'id' => '4', 'deck' => 'weather', 'row' => '', 'strength' => 0, 'abilities' => ['frost'], 'filename' => 'frost', 'count' => 3],
            3  => ['name' => 'Cirilla Fiona Elen Riannon', 'id' => '139', 'deck' => 'neutral', 'row' => 'close', 'strength' => 15, 'abilities' => ['hero'], 'filename' => 'ciri', 'count' => 1],
            4  => ['name' => 'Clear Weather', 'id' => '7', 'deck' => 'weather', 'row' => '', 'strength' => 0, 'abilities' => ['clear'], 'filename' => 'clear', 'count' => 2],
            5  => ['name' => 'Commander\'s Horn', 'id' => '2', 'deck' => 'special', 'row' => '', 'strength' => 0, 'abilities' => ['horn'], 'filename' => 'horn', 'count' => 3],
            6  => ['name' => 'Dandelion', 'id' => '11', 'deck' => 'neutral', 'row' => 'close', 'strength' => 2, 'abilities' => ['horn'], 'filename' => 'dandelion', 'count' => 1],
            7  => ['name' => 'Emiel Regis Rohellec Terzieff', 'id' => '', 'deck' => 'neutral', 'row' => 'close', 'strength' => 5, 'abilities' => [], 'filename' => 'emiel', 'count' => 1],
            8  => ['name' => 'Geralt of Rivia', 'id' => '138', 'deck' => 'neutral', 'row' => 'close', 'strength' => 15, 'abilities' => ['hero'], 'filename' => 'geralt', 'count' => 1],
            9  => ['name' => 'Impenetrable Fog', 'id' => '5', 'deck' => 'weather', 'row' => '', 'strength' => 0, 'abilities' => ['fog'], 'filename' => 'fog', 'count' => 3],
            10  => ['name' => 'Scorch', 'id' => '3', 'deck' => 'special', 'row' => '', 'strength' => 0, 'abilities' => ['scorch'], 'filename' => 'scorch', 'count' => 3],
            11  => ['name' => 'Torrential Rain', 'id' => '6', 'deck' => 'weather', 'row' => '', 'strength' => 0, 'abilities' => ['rain'], 'filename' => 'rain', 'count' => 2],
            12  => ['name' => 'Triss Merigold', 'id' => '141', 'deck' => 'neutral', 'row' => 'close', 'strength' => 7, 'abilities' => ['hero'], 'filename' => 'triss', 'count' => 1],
            13  => ['name' => 'Vesemir', 'id' => '9', 'deck' => 'neutral', 'row' => 'close', 'strength' => 6, 'abilities' => [], 'filename' => 'vesemir', 'count' => 1],
            14  => ['name' => 'Villentretenmerth', 'id' => '8', 'deck' => 'neutral', 'row' => 'close', 'strength' => 7, 'abilities' => ['scorch_c'], 'filename' => 'villen', 'count' => 1],
            15  => ['name' => 'Yennefer of Vengerberg', 'id' => '140', 'deck' => 'neutral', 'row' => 'ranged', 'strength' => 7, 'abilities' => ['hero', 'medic'], 'filename' => 'yennefer', 'count' => 1],
            16  => ['name' => 'Zoltan Chivay', 'id' => '10', 'deck' => 'neutral', 'row' => 'close', 'strength' => 5, 'abilities' => [], 'filename' => 'zoltan', 'count' => 1],
            17  => ['name' => 'Olgierd von Everec', 'id' => '', 'deck' => 'neutral', 'row' => 'agile', 'strength' => 6, 'abilities' => ['morale'], 'filename' => 'olgierd', 'count' => 1],
            18  => ['name' => 'Gaunter O\'Dimm', 'id' => '', 'deck' => 'neutral', 'row' => 'siege', 'strength' => 2, 'abilities' => ['muster'], 'filename' => 'gaunter_odimm', 'count' => 1],
            19  => ['name' => 'Gaunter O\'Dimm - Darkness', 'id' => '', 'deck' => 'neutral', 'row' => 'ranged', 'strength' => 4, 'abilities' => ['muster'], 'filename' => 'gaunter_odimm_darkness', 'count' => 3],
            20  => ['name' => 'Cow', 'id' => '', 'deck' => 'neutral', 'row' => 'ranged', 'strength' => 0, 'abilities' => ['avenger'], 'filename' => 'cow', 'count' => 1],
            21  => ['name' => 'Bovine Defense Force', 'id' => '', 'deck' => 'neutral', 'row' => 'close', 'strength' => 8, 'abilities' => [], 'filename' => 'chort', 'count' => 0],
            22  => ['name' => 'Foltest - King of Temeria', 'id' => '5', 'deck' => 'realms', 'row' => 'leader', 'strength' => 0, 'abilities' => ['foltest_king'], 'filename' => 'foltest_silver', 'count' => 1],
            23  => ['name' => 'Foltest - Lord Commander of the North', 'id' => '8', 'deck' => 'realms', 'row' => 'leader', 'strength' => 0, 'abilities' => ['foltest_lord'], 'filename' => 'foltest_gold', 'count' => 1],
            24  => ['name' => 'Foltest - The Siegemaster', 'id' => '6', 'deck' => 'realms', 'row' => 'leader', 'strength' => 0, 'abilities' => ['foltest_siegemaster'], 'filename' => 'foltest_copper', 'count' => 1],
            25  => ['name' => 'Foltest - The Steel-Forged', 'id' => '7', 'deck' => 'realms', 'row' => 'leader', 'strength' => 0, 'abilities' => ['foltest_steelforged'], 'filename' => 'foltest_bronze', 'count' => 1],
            26  => ['name' => 'Foltest - Son of Medell', 'id' => '', 'deck' => 'realms', 'row' => 'leader', 'strength' => 0, 'abilities' => ['foltest_son'], 'filename' => 'foltest_son_of_medell', 'count' => 1],
            27  => ['name' => 'Ballista', 'id' => '79', 'deck' => 'realms', 'row' => 'siege', 'strength' => 6, 'abilities' => [], 'filename' => 'ballista', 'count' => 1],
            28  => ['name' => 'Blue Stripes Commando', 'id' => '92', 'deck' => 'realms', 'row' => 'close', 'strength' => 4, 'abilities' => ['bond'], 'filename' => 'blue_stripes', 'count' => 3],
            29  => ['name' => 'Catapult', 'id' => '75', 'deck' => 'realms', 'row' => 'siege', 'strength' => 8, 'abilities' => ['bond'], 'filename' => 'catapult_1', 'count' => 2],
            30  => ['name' => 'Crinfrid Reavers Dragon Hunter', 'id' => '87', 'deck' => 'realms', 'row' => 'ranged', 'strength' => 5, 'abilities' => ['bond'], 'filename' => 'crinfrid', 'count' => 3],
            31  => ['name' => 'Dethmold', 'id' => '76', 'deck' => 'realms', 'row' => 'ranged', 'strength' => 6, 'abilities' => [], 'filename' => 'dethmold', 'count' => 1],
            32  => ['name' => 'Dun Banner Medic', 'id' => '88', 'deck' => 'realms', 'row' => 'siege', 'strength' => 5, 'abilities' => ['medic'], 'filename' => 'banner_nurse', 'count' => 1],
            33  => ['name' => 'Esterad Thyssen', 'id' => '11', 'deck' => 'realms', 'row' => 'close', 'strength' => 10, 'abilities' => ['hero'], 'filename' => 'esterad', 'count' => 1],
            34  => ['name' => 'John Natalis', 'id' => '10', 'deck' => 'realms', 'row' => 'close', 'strength' => 10, 'abilities' => ['hero'], 'filename' => 'natalis', 'count' => 1],
            35  => ['name' => 'Kaedweni Siege Expert', 'id' => '98', 'deck' => 'realms', 'row' => 'siege', 'strength' => 1, 'abilities' => ['morale'], 'filename' => 'kaedwen_siege', 'count' => 1],
            36  => ['name' => 'Kaedweni Siege Expert', 'id' => '99', 'deck' => 'realms', 'row' => 'siege', 'strength' => 1, 'abilities' => ['morale'], 'filename' => 'kaedwen_siege_1', 'count' => 1],
            37  => ['name' => 'Kaedweni Siege Expert', 'id' => '100', 'deck' => 'realms', 'row' => 'siege', 'strength' => 1, 'abilities' => ['morale'], 'filename' => 'kaedwen_siege_2', 'count' => 1],
            38  => ['name' => 'Keira Metz', 'id' => '84', 'deck' => 'realms', 'row' => 'ranged', 'strength' => 5, 'abilities' => [], 'filename' => 'keira', 'count' => 1],
            39  => ['name' => 'Philippa Eilhart', 'id' => '12', 'deck' => 'realms', 'row' => 'ranged', 'strength' => 10, 'abilities' => ['hero'], 'filename' => 'philippa', 'count' => 1],
            40  => ['name' => 'Poor Fucking Infantry', 'id' => '95', 'deck' => 'realms', 'row' => 'close', 'strength' => 1, 'abilities' => ['bond'], 'filename' => 'poor_infantry', 'count' => 4],
            41  => ['name' => 'Prince Stennis', 'id' => '86', 'deck' => 'realms', 'row' => 'close', 'strength' => 5, 'abilities' => ['spy'], 'filename' => 'stennis', 'count' => 1],
            42  => ['name' => 'Redanian Foot Soldier', 'id' => '96', 'deck' => 'realms', 'row' => 'close', 'strength' => 1, 'abilities' => [], 'filename' => 'redania', 'count' => 1],
            43  => ['name' => 'Redanian Foot Soldier', 'id' => '97', 'deck' => 'realms', 'row' => 'close', 'strength' => 1, 'abilities' => [], 'filename' => 'redania_1', 'count' => 1],
            44  => ['name' => 'Sheldon Skaggs', 'id' => '91', 'deck' => 'realms', 'row' => 'ranged', 'strength' => 4, 'abilities' => [], 'filename' => 'sheldon', 'count' => 1],
            45  => ['name' => 'Siege Tower', 'id' => '81', 'deck' => 'realms', 'row' => 'siege', 'strength' => 6, 'abilities' => [], 'filename' => 'siege_tower', 'count' => 1],
            46  => ['name' => 'Siegfried of Denesle', 'id' => '83', 'deck' => 'realms', 'row' => 'close', 'strength' => 5, 'abilities' => [], 'filename' => 'siegfried', 'count' => 1],
            47  => ['name' => 'Sigismund Dijkstra', 'id' => '89', 'deck' => 'realms', 'row' => 'close', 'strength' => 4, 'abilities' => ['spy'], 'filename' => 'dijkstra', 'count' => 1],
            48  => ['name' => 'Síle de Tansarville', 'id' => '85', 'deck' => 'realms', 'row' => 'ranged', 'strength' => 5, 'abilities' => [], 'filename' => 'sheala', 'count' => 1],
            49  => ['name' => 'Thaler', 'id' => '94', 'deck' => 'realms', 'row' => 'siege', 'strength' => 1, 'abilities' => ['spy'], 'filename' => 'thaler', 'count' => 1],
            50  => ['name' => 'Sabrina Glevissig', 'id' => '90', 'deck' => 'realms', 'row' => 'ranged', 'strength' => 4, 'abilities' => [], 'filename' => 'sabrina', 'count' => 1],
            51  => ['name' => 'Vernon Roche', 'id' => '9', 'deck' => 'realms', 'row' => 'close', 'strength' => 10, 'abilities' => ['hero'], 'filename' => 'vernon', 'count' => 1],
            52  => ['name' => 'Ves', 'id' => '82', 'deck' => 'realms', 'row' => 'close', 'strength' => 5, 'abilities' => [], 'filename' => 'ves', 'count' => 1],
            53  => ['name' => 'Yarpen Zigrin', 'id' => '93', 'deck' => 'realms', 'row' => 'close', 'strength' => 2, 'abilities' => [], 'filename' => 'yarpen', 'count' => 1],
            54  => ['name' => 'Trebuchet', 'id' => '77', 'deck' => 'realms', 'row' => 'siege', 'strength' => 6, 'abilities' => [], 'filename' => 'trebuchet', 'count' => 1],
            55  => ['name' => 'Trebuchet', 'id' => '78', 'deck' => 'realms', 'row' => 'siege', 'strength' => 6, 'abilities' => [], 'filename' => 'trebuchet_1', 'count' => 1],
            56  => ['name' => 'Emhyr var Emreis - His Imperial Majesty', 'id' => '1', 'deck' => 'nilfgaard', 'row' => 'leader', 'strength' => 0, 'abilities' => ['emhyr_imperial'], 'filename' => 'emhyr_silver', 'count' => 1],
            57  => ['name' => 'Emhyr var Emreis - Emperor of Nilfgaard', 'id' => '2', 'deck' => 'nilfgaard', 'row' => 'leader', 'strength' => 0, 'abilities' => ['emhyr_emperor'], 'filename' => 'emhyr_copper', 'count' => 1],
            58  => ['name' => 'Emhyr var Emreis - the White Flame', 'id' => '3', 'deck' => 'nilfgaard', 'row' => 'leader', 'strength' => 0, 'abilities' => ['emhyr_whiteflame'], 'filename' => 'emhyr_bronze', 'count' => 1],
            59  => ['name' => 'Emhyr var Emreis - The Relentless', 'id' => '4', 'deck' => 'nilfgaard', 'row' => 'leader', 'strength' => 0, 'abilities' => ['emhyr_relentless'], 'filename' => 'emhyr_gold', 'count' => 1],
            60  => ['name' => 'Emhyr var Emreis - Invader of the North', 'id' => '', 'deck' => 'nilfgaard', 'row' => 'leader', 'strength' => 0, 'abilities' => ['emhyr_invader'], 'filename' => 'emhyr_invader_of_the_north', 'count' => 1],
            61  => ['name' => 'Albrich', 'id' => '68', 'deck' => 'nilfgaard', 'row' => 'ranged', 'strength' => 2, 'abilities' => [], 'filename' => 'albrich', 'count' => 1],
            62  => ['name' => 'Assire var Anahid', 'id' => '52', 'deck' => 'nilfgaard', 'row' => 'ranged', 'strength' => 6, 'abilities' => [], 'filename' => 'assire', 'count' => 1],
            63  => ['name' => 'Black Infantry Archer', 'id' => '47', 'deck' => 'nilfgaard', 'row' => 'ranged', 'strength' => 10, 'abilities' => [], 'filename' => 'black_archer', 'count' => 1],
            64  => ['name' => 'Black Infantry Archer', 'id' => '48', 'deck' => 'nilfgaard', 'row' => 'ranged', 'strength' => 10, 'abilities' => [], 'filename' => 'black_archer_1', 'count' => 1],
            65  => ['name' => 'Cahir Mawr Dyffryn aep Ceallach', 'id' => '54', 'deck' => 'nilfgaard', 'row' => 'close', 'strength' => 6, 'abilities' => [], 'filename' => 'cahir', 'count' => 1],
            66  => ['name' => 'Cynthia', 'id' => '60', 'deck' => 'nilfgaard', 'row' => 'ranged', 'strength' => 4, 'abilities' => [], 'filename' => 'cynthia', 'count' => 1],
            67  => ['name' => 'Etolian Auxiliary Archers', 'id' => '72', 'deck' => 'nilfgaard', 'row' => 'ranged', 'strength' => 1, 'abilities' => ['medic'], 'filename' => 'archer_support', 'count' => 1],
            68  => ['name' => 'Etolian Auxiliary Archers', 'id' => '73', 'deck' => 'nilfgaard', 'row' => 'ranged', 'strength' => 1, 'abilities' => ['medic'], 'filename' => 'archer_support_1', 'count' => 1],
            69  => ['name' => 'Fringilla Vigo', 'id' => '53', 'deck' => 'nilfgaard', 'row' => 'ranged', 'strength' => 6, 'abilities' => [], 'filename' => 'fringilla', 'count' => 1],
            70  => ['name' => 'Heavy Zerrikanian Fire Scorpion', 'id' => '49', 'deck' => 'nilfgaard', 'row' => 'siege', 'strength' => 10, 'abilities' => [], 'filename' => 'heavy_zerri', 'count' => 1],
            71  => ['name' => 'Impera Brigade Guard', 'id' => '67', 'deck' => 'nilfgaard', 'row' => 'close', 'strength' => 3, 'abilities' => ['bond'], 'filename' => 'imperal_brigade', 'count' => 4],
            72  => ['name' => 'Letho of Gulet', 'id' => '147', 'deck' => 'nilfgaard', 'row' => 'close', 'strength' => 10, 'abilities' => ['hero'], 'filename' => 'letho', 'count' => 1],
            73  => ['name' => 'Menno Coehoorn', 'id' => '148', 'deck' => 'nilfgaard', 'row' => 'close', 'strength' => 10, 'abilities' => ['hero', 'medic'], 'filename' => 'menno', 'count' => 1],
            74  => ['name' => 'Morteisen', 'id' => '64', 'deck' => 'nilfgaard', 'row' => 'close', 'strength' => 3, 'abilities' => [], 'filename' => 'morteisen', 'count' => 1],
            75  => ['name' => 'Morvran Voorhis', 'id' => '149', 'deck' => 'nilfgaard', 'row' => 'siege', 'strength' => 10, 'abilities' => ['hero'], 'filename' => 'moorvran', 'count' => 1],
            76  => ['name' => 'Nausicaa Cavalry Rider', 'id' => '71', 'deck' => 'nilfgaard', 'row' => 'close', 'strength' => 2, 'abilities' => ['bond'], 'filename' => 'nauzicaa_2', 'count' => 3],
            77  => ['name' => 'Puttkammer', 'id' => '66', 'deck' => 'nilfgaard', 'row' => 'ranged', 'strength' => 3, 'abilities' => [], 'filename' => 'puttkammer', 'count' => 1],
            78  => ['name' => 'Rainfarn', 'id' => '61', 'deck' => 'nilfgaard', 'row' => 'close', 'strength' => 4, 'abilities' => [], 'filename' => 'rainfarn', 'count' => 1],
            79  => ['name' => 'Renuald aep Matsen', 'id' => '56', 'deck' => 'nilfgaard', 'row' => 'ranged', 'strength' => 5, 'abilities' => [], 'filename' => 'renuald', 'count' => 1],
            80  => ['name' => 'Rotten Mangonel', 'id' => '65', 'deck' => 'nilfgaard', 'row' => 'siege', 'strength' => 3, 'abilities' => [], 'filename' => 'rotten', 'count' => 1],
            81  => ['name' => 'Shilard Fitz-Oesterlen', 'id' => '51', 'deck' => 'nilfgaard', 'row' => 'close', 'strength' => 7, 'abilities' => ['spy'], 'filename' => 'shilard', 'count' => 1],
            82  => ['name' => 'Siege Engineer', 'id' => '55', 'deck' => 'nilfgaard', 'row' => 'siege', 'strength' => 6, 'abilities' => [], 'filename' => 'siege_engineer', 'count' => 1],
            83  => ['name' => 'Siege Technician', 'id' => '74', 'deck' => 'nilfgaard', 'row' => 'siege', 'strength' => 0, 'abilities' => ['medic'], 'filename' => 'siege_support', 'count' => 1],
            84  => ['name' => 'Stefan Skellen', 'id' => '50', 'deck' => 'nilfgaard', 'row' => 'close', 'strength' => 9, 'abilities' => ['spy'], 'filename' => 'stefan', 'count' => 1],
            85  => ['name' => 'Sweers', 'id' => '69', 'deck' => 'nilfgaard', 'row' => 'ranged', 'strength' => 2, 'abilities' => [], 'filename' => 'sweers', 'count' => 1],
            86  => ['name' => 'Tibor Eggebracht', 'id' => '150', 'deck' => 'nilfgaard', 'row' => 'ranged', 'strength' => 10, 'abilities' => ['hero'], 'filename' => 'tibor', 'count' => 1],
            87  => ['name' => 'Vanhemar', 'id' => '62', 'deck' => 'nilfgaard', 'row' => 'ranged', 'strength' => 4, 'abilities' => [], 'filename' => 'vanhemar', 'count' => 1],
            88  => ['name' => 'Vattier de Rideaux', 'id' => '63', 'deck' => 'nilfgaard', 'row' => 'close', 'strength' => 4, 'abilities' => ['spy'], 'filename' => 'vattier', 'count' => 1],
            89  => ['name' => 'Vreemde', 'id' => '70', 'deck' => 'nilfgaard', 'row' => 'close', 'strength' => 2, 'abilities' => [], 'filename' => 'vreemde', 'count' => 1],
            90  => ['name' => 'Young Emissary', 'id' => '58', 'deck' => 'nilfgaard', 'row' => 'close', 'strength' => 5, 'abilities' => ['bond'], 'filename' => 'young_emissary', 'count' => 1],
            91  => ['name' => 'Young Emissary', 'id' => '59', 'deck' => 'nilfgaard', 'row' => 'close', 'strength' => 5, 'abilities' => ['bond'], 'filename' => 'young_emissary_1', 'count' => 1],
            92  => ['name' => 'Zerrikanian Fire Scorpion', 'id' => '57', 'deck' => 'nilfgaard', 'row' => 'siege', 'strength' => 5, 'abilities' => [], 'filename' => 'zerri', 'count' => 1],
            93  => ['name' => 'Eredin - Commander of the Red Riders', 'id' => '134', 'deck' => 'monsters', 'row' => 'leader', 'strength' => 0, 'abilities' => ['eredin_commander'], 'filename' => 'eredin_silver', 'count' => 1],
            94  => ['name' => 'Eredin - Bringer of Death', 'id' => '136', 'deck' => 'monsters', 'row' => 'leader', 'strength' => 0, 'abilities' => ['eredin_bringer_of_death'], 'filename' => 'eredin_bronze', 'count' => 1],
            95  => ['name' => 'Eredin - Destroyer of Worlds', 'id' => '137', 'deck' => 'monsters', 'row' => 'leader', 'strength' => 0, 'abilities' => ['eredin_destroyer'], 'filename' => 'eredin_gold', 'count' => 1],
            96  => ['name' => 'Eredin - King of the Wild Hunt', 'id' => '135', 'deck' => 'monsters', 'row' => 'leader', 'strength' => 0, 'abilities' => ['eredin_king'], 'filename' => 'eredin_copper', 'count' => 1],
            97  => ['name' => 'Eredin Bréacc Glas - The Treacherous', 'id' => '', 'deck' => 'monsters', 'row' => 'leader', 'strength' => 0, 'abilities' => ['eredin_treacherous'], 'filename' => 'eredin_the_treacherous', 'count' => 1],
            98  => ['name' => 'Arachas ', 'id' => '27', 'deck' => 'monsters', 'row' => 'close', 'strength' => 4, 'abilities' => ['muster'], 'filename' => 'arachas', 'count' => 1],
            99  => ['name' => 'Arachas ', 'id' => '28', 'deck' => 'monsters', 'row' => 'close', 'strength' => 4, 'abilities' => ['muster'], 'filename' => 'arachas_1', 'count' => 1],
            100  => ['name' => 'Arachas ', 'id' => '29', 'deck' => 'monsters', 'row' => 'close', 'strength' => 4, 'abilities' => ['muster'], 'filename' => 'arachas_2', 'count' => 1],
            101  => ['name' => 'Arachas- Behemoth', 'id' => '15', 'deck' => 'monsters', 'row' => 'siege', 'strength' => 6, 'abilities' => ['muster'], 'filename' => 'arachas_behemoth', 'count' => 1],
            102  => ['name' => 'Botchling', 'id' => '26', 'deck' => 'monsters', 'row' => 'close', 'strength' => 4, 'abilities' => [], 'filename' => 'poroniec', 'count' => 1],
            103  => ['name' => 'Celaeno Harpy', 'id' => '38', 'deck' => 'monsters', 'row' => 'agile', 'strength' => 2, 'abilities' => [], 'filename' => 'celaeno_harpy', 'count' => 1],
            104  => ['name' => 'Cockatrice', 'id' => '36', 'deck' => 'monsters', 'row' => 'ranged', 'strength' => 2, 'abilities' => [], 'filename' => 'cockatrice', 'count' => 1],
            105  => ['name' => 'Crone - Brewess', 'id' => '16', 'deck' => 'monsters', 'row' => 'close', 'strength' => 6, 'abilities' => ['muster'], 'filename' => 'witch_velen', 'count' => 1],
            106  => ['name' => 'Crone - Weavess', 'id' => '17', 'deck' => 'monsters', 'row' => 'close', 'strength' => 6, 'abilities' => ['muster'], 'filename' => 'witch_velen_1', 'count' => 1],
            107  => ['name' => 'Crone - Whispess', 'id' => '18', 'deck' => 'monsters', 'row' => 'close', 'strength' => 6, 'abilities' => ['muster'], 'filename' => 'witch_velen_2', 'count' => 1],
            108  => ['name' => 'Draug', 'id' => '143', 'deck' => 'monsters', 'row' => 'close', 'strength' => 10, 'abilities' => ['hero'], 'filename' => 'draug', 'count' => 1],
            109  => ['name' => 'Earth Elemental', 'id' => '12', 'deck' => 'monsters', 'row' => 'siege', 'strength' => 6, 'abilities' => [], 'filename' => 'earth_elemental', 'count' => 1],
            110  => ['name' => 'Endrega', 'id' => '34', 'deck' => 'monsters', 'row' => 'ranged', 'strength' => 2, 'abilities' => [], 'filename' => 'endrega', 'count' => 1],
            111  => ['name' => 'Fiend', 'id' => '13', 'deck' => 'monsters', 'row' => 'close', 'strength' => 6, 'abilities' => [], 'filename' => 'fiend', 'count' => 1],
            112  => ['name' => 'Fire Elemental', 'id' => '14', 'deck' => 'monsters', 'row' => 'siege', 'strength' => 6, 'abilities' => [], 'filename' => 'fire_elemental', 'count' => 1],
            113  => ['name' => 'Foglet', 'id' => '39', 'deck' => 'monsters', 'row' => 'close', 'strength' => 2, 'abilities' => [], 'filename' => 'fogling', 'count' => 1],
            114  => ['name' => 'Forktail', 'id' => '19', 'deck' => 'monsters', 'row' => 'close', 'strength' => 5, 'abilities' => [], 'filename' => 'forktail', 'count' => 1],
            115  => ['name' => 'Frightener', 'id' => '23', 'deck' => 'monsters', 'row' => 'close', 'strength' => 5, 'abilities' => [], 'filename' => 'frightener', 'count' => 1],
            116  => ['name' => 'Gargoyle', 'id' => '37', 'deck' => 'monsters', 'row' => 'ranged', 'strength' => 2, 'abilities' => [], 'filename' => 'gargoyle', 'count' => 1],
            117  => ['name' => 'Ghoul', 'id' => '44', 'deck' => 'monsters', 'row' => 'close', 'strength' => 1, 'abilities' => ['muster'], 'filename' => 'ghoul', 'count' => 1],
            118  => ['name' => 'Ghoul', 'id' => '45', 'deck' => 'monsters', 'row' => 'close', 'strength' => 1, 'abilities' => ['muster'], 'filename' => 'ghoul_1', 'count' => 1],
            119  => ['name' => 'Ghoul', 'id' => '46', 'deck' => 'monsters', 'row' => 'close', 'strength' => 1, 'abilities' => ['muster'], 'filename' => 'ghoul_2', 'count' => 1],
            120  => ['name' => 'Grave Hag', 'id' => '25', 'deck' => 'monsters', 'row' => 'ranged', 'strength' => 5, 'abilities' => [], 'filename' => 'gravehag', 'count' => 1],
            121  => ['name' => 'Griffin', 'id' => '21', 'deck' => 'monsters', 'row' => 'close', 'strength' => 5, 'abilities' => [], 'filename' => 'gryffin', 'count' => 1],
            122  => ['name' => 'Harpy', 'id' => '35', 'deck' => 'monsters', 'row' => 'agile', 'strength' => 2, 'abilities' => [], 'filename' => 'harpy', 'count' => 1],
            123  => ['name' => 'Ice Giant', 'id' => '24', 'deck' => 'monsters', 'row' => 'siege', 'strength' => 5, 'abilities' => [], 'filename' => 'frost_giant', 'count' => 1],
            124  => ['name' => 'Imlerith', 'id' => '144', 'deck' => 'monsters', 'row' => 'close', 'strength' => 10, 'abilities' => ['hero'], 'filename' => 'imlerith', 'count' => 1],
            125  => ['name' => 'Kayran', 'id' => '146', 'deck' => 'monsters', 'row' => 'agile', 'strength' => 8, 'abilities' => ['hero', 'morale'], 'filename' => 'kayran', 'count' => 1],
            126  => ['name' => 'Leshen', 'id' => '145', 'deck' => 'monsters', 'row' => 'ranged', 'strength' => 10, 'abilities' => ['hero'], 'filename' => 'leshen', 'count' => 1],
            127  => ['name' => 'Nekker', 'id' => '41', 'deck' => 'monsters', 'row' => 'close', 'strength' => 2, 'abilities' => ['muster'], 'filename' => 'nekker', 'count' => 1],
            128  => ['name' => 'Nekker', 'id' => '42', 'deck' => 'monsters', 'row' => 'close', 'strength' => 2, 'abilities' => ['muster'], 'filename' => 'nekker_1', 'count' => 1],
            129  => ['name' => 'Nekker', 'id' => '43', 'deck' => 'monsters', 'row' => 'close', 'strength' => 2, 'abilities' => ['muster'], 'filename' => 'nekker_2', 'count' => 1],
            130  => ['name' => 'Plague Maiden', 'id' => '20', 'deck' => 'monsters', 'row' => 'close', 'strength' => 5, 'abilities' => [], 'filename' => 'mighty_maiden', 'count' => 1],
            131  => ['name' => 'Vampire - Bruxa', 'id' => '33', 'deck' => 'monsters', 'row' => 'close', 'strength' => 4, 'abilities' => ['muster'], 'filename' => 'bruxa', 'count' => 1],
            132  => ['name' => 'Vampire - Ekimmara', 'id' => '30', 'deck' => 'monsters', 'row' => 'close', 'strength' => 4, 'abilities' => ['muster'], 'filename' => 'ekkima', 'count' => 1],
            133  => ['name' => 'Vampire - Fleder', 'id' => '31', 'deck' => 'monsters', 'row' => 'close', 'strength' => 4, 'abilities' => ['muster'], 'filename' => 'fleder', 'count' => 1],
            134  => ['name' => 'Vampire - Garkain', 'id' => '32', 'deck' => 'monsters', 'row' => 'close', 'strength' => 4, 'abilities' => ['muster'], 'filename' => 'garkain', 'count' => 1],
            135  => ['name' => 'Vampire - Katakan', 'id' => '', 'deck' => 'monsters', 'row' => 'close', 'strength' => 5, 'abilities' => ['muster'], 'filename' => 'katakan', 'count' => 1],
            136  => ['name' => 'Werewolf', 'id' => '22', 'deck' => 'monsters', 'row' => 'close', 'strength' => 5, 'abilities' => [], 'filename' => 'werewolf', 'count' => 1],
            137  => ['name' => 'Wyvern', 'id' => '40', 'deck' => 'monsters', 'row' => 'ranged', 'strength' => 2, 'abilities' => [], 'filename' => 'wyvern', 'count' => 1],
            138  => ['name' => 'Toad', 'id' => '', 'deck' => 'monsters', 'row' => 'ranged', 'strength' => 7, 'abilities' => ['scorch_r'], 'filename' => 'toad', 'count' => 1],
            139  => ['name' => 'Francesca Findabair - Queen of Dol Blathanna', 'id' => '13', 'deck' => 'scoiatael', 'row' => 'leader', 'strength' => 0, 'abilities' => ['francesca_queen'], 'filename' => 'francesca_silver', 'count' => 1],
            140  => ['name' => 'Francesca Findabair - the Beautiful', 'id' => '14', 'deck' => 'scoiatael', 'row' => 'leader', 'strength' => 0, 'abilities' => ['francesca_beautiful'], 'filename' => 'francesca_gold', 'count' => 1],
            141  => ['name' => 'Francesca Findabair - Daisy of the Valley', 'id' => '15', 'deck' => 'scoiatael', 'row' => 'leader', 'strength' => 0, 'abilities' => ['francesca_daisy'], 'filename' => 'francesca_copper', 'count' => 1],
            142  => ['name' => 'Francesca Findabair - Pureblood Elf', 'id' => '16', 'deck' => 'scoiatael', 'row' => 'leader', 'strength' => 0, 'abilities' => ['francesca_pureblood'], 'filename' => 'francesca_bronze', 'count' => 1],
            143  => ['name' => 'Francesca Findabair - Hope of the Aen Seidhe', 'id' => '', 'deck' => 'scoiatael', 'row' => 'leader', 'strength' => 0, 'abilities' => ['francesca_hope'], 'filename' => 'francesca_hope_of_the_aen_seidhe', 'count' => 1],
            144  => ['name' => 'Ciaran aep Easnillien', 'id' => '122', 'deck' => 'scoiatael', 'row' => 'agile', 'strength' => 3, 'abilities' => [], 'filename' => 'ciaran', 'count' => 1],
            145  => ['name' => 'Barclay Els', 'id' => '106', 'deck' => 'scoiatael', 'row' => 'agile', 'strength' => 6, 'abilities' => [], 'filename' => 'barclay', 'count' => 1],
            146  => ['name' => 'Dennis Cranmer', 'id' => '102', 'deck' => 'scoiatael', 'row' => 'close', 'strength' => 6, 'abilities' => [], 'filename' => 'dennis', 'count' => 1],
            147  => ['name' => 'Dol Blathanna Archer', 'id' => '121', 'deck' => 'scoiatael', 'row' => 'ranged', 'strength' => 4, 'abilities' => [], 'filename' => 'dol_archer', 'count' => 1],
            148  => ['name' => 'Dol Blathanna Scout', 'id' => '107', 'deck' => 'scoiatael', 'row' => 'agile', 'strength' => 6, 'abilities' => [], 'filename' => 'dol_infantry', 'count' => 1],
            149  => ['name' => 'Dol Blathanna Scout', 'id' => '108', 'deck' => 'scoiatael', 'row' => 'agile', 'strength' => 6, 'abilities' => [], 'filename' => 'dol_infantry_1', 'count' => 1],
            150  => ['name' => 'Dol Blathanna Scout', 'id' => '109', 'deck' => 'scoiatael', 'row' => 'agile', 'strength' => 6, 'abilities' => [], 'filename' => 'dol_infantry_2', 'count' => 1],
            151  => ['name' => 'Dwarven Skirmisher', 'id' => '123', 'deck' => 'scoiatael', 'row' => 'close', 'strength' => 3, 'abilities' => ['muster'], 'filename' => 'dwarf', 'count' => 1],
            152  => ['name' => 'Dwarven Skirmisher', 'id' => '124', 'deck' => 'scoiatael', 'row' => 'close', 'strength' => 3, 'abilities' => ['muster'], 'filename' => 'dwarf_1', 'count' => 1],
            153  => ['name' => 'Dwarven Skirmisher', 'id' => '125', 'deck' => 'scoiatael', 'row' => 'close', 'strength' => 3, 'abilities' => ['muster'], 'filename' => 'dwarf_2', 'count' => 1],
            154  => ['name' => 'Eithné', 'id' => '17', 'deck' => 'scoiatael', 'row' => 'ranged', 'strength' => 10, 'abilities' => ['hero'], 'filename' => 'eithne', 'count' => 1],
            155  => ['name' => 'Elven Skirmisher', 'id' => '127', 'deck' => 'scoiatael', 'row' => 'ranged', 'strength' => 2, 'abilities' => ['muster'], 'filename' => 'elf_skirmisher', 'count' => 1],
            156  => ['name' => 'Elven Skirmisher', 'id' => '128', 'deck' => 'scoiatael', 'row' => 'ranged', 'strength' => 2, 'abilities' => ['muster'], 'filename' => 'elf_skirmisher_1', 'count' => 1],
            157  => ['name' => 'Elven Skirmisher', 'id' => '129', 'deck' => 'scoiatael', 'row' => 'ranged', 'strength' => 2, 'abilities' => ['muster'], 'filename' => 'elf_skirmisher_2', 'count' => 1],
            158  => ['name' => 'Filavandrel aen Fidhail', 'id' => '104', 'deck' => 'scoiatael', 'row' => 'agile', 'strength' => 6, 'abilities' => [], 'filename' => 'filavandrel', 'count' => 1],
            159  => ['name' => 'Havekar Healer', 'id' => '131', 'deck' => 'scoiatael', 'row' => 'ranged', 'strength' => 0, 'abilities' => ['medic'], 'filename' => 'havekar_nurse', 'count' => 1],
            160  => ['name' => 'Havekar Healer', 'id' => '132', 'deck' => 'scoiatael', 'row' => 'ranged', 'strength' => 0, 'abilities' => ['medic'], 'filename' => 'havekar_nurse_1', 'count' => 1],
            161  => ['name' => 'Havekar Healer', 'id' => '133', 'deck' => 'scoiatael', 'row' => 'ranged', 'strength' => 0, 'abilities' => ['medic'], 'filename' => 'havekar_nurse_2', 'count' => 1],
            162  => ['name' => 'Havekar Smuggler', 'id' => '110', 'deck' => 'scoiatael', 'row' => 'close', 'strength' => 5, 'abilities' => ['muster'], 'filename' => 'havekar_support', 'count' => 1],
            163  => ['name' => 'Havekar Smuggler', 'id' => '111', 'deck' => 'scoiatael', 'row' => 'close', 'strength' => 5, 'abilities' => ['muster'], 'filename' => 'havekar_support_1', 'count' => 1],
            164  => ['name' => 'Havekar Smuggler', 'id' => '112', 'deck' => 'scoiatael', 'row' => 'close', 'strength' => 5, 'abilities' => ['muster'], 'filename' => 'havekar_support_2', 'count' => 1],
            165  => ['name' => 'Ida Emean aep Sivney', 'id' => '103', 'deck' => 'scoiatael', 'row' => 'ranged', 'strength' => 6, 'abilities' => [], 'filename' => 'ida', 'count' => 1],
            166  => ['name' => 'Iorveth', 'id' => '20', 'deck' => 'scoiatael', 'row' => 'ranged', 'strength' => 10, 'abilities' => ['hero'], 'filename' => 'iorveth', 'count' => 1],
            167  => ['name' => 'Isengrim Faoiltiarna', 'id' => '19', 'deck' => 'scoiatael', 'row' => 'close', 'strength' => 10, 'abilities' => ['hero', 'morale'], 'filename' => 'isengrim', 'count' => 1],
            168  => ['name' => 'Mahakaman Defender', 'id' => '115', 'deck' => 'scoiatael', 'row' => 'close', 'strength' => 5, 'abilities' => [], 'filename' => 'mahakam', 'count' => 1],
            169  => ['name' => 'Mahakaman Defender', 'id' => '116', 'deck' => 'scoiatael', 'row' => 'close', 'strength' => 5, 'abilities' => [], 'filename' => 'mahakam_1', 'count' => 1],
            170  => ['name' => 'Mahakaman Defender', 'id' => '117', 'deck' => 'scoiatael', 'row' => 'close', 'strength' => 5, 'abilities' => [], 'filename' => 'mahakam_2', 'count' => 1],
            171  => ['name' => 'Mahakaman Defender', 'id' => '118', 'deck' => 'scoiatael', 'row' => 'close', 'strength' => 5, 'abilities' => [], 'filename' => 'mahakam_3', 'count' => 1],
            172  => ['name' => 'Mahakaman Defender', 'id' => '119', 'deck' => 'scoiatael', 'row' => 'close', 'strength' => 5, 'abilities' => [], 'filename' => 'mahakam_4', 'count' => 1],
            173  => ['name' => 'Milva', 'id' => '101', 'deck' => 'scoiatael', 'row' => 'ranged', 'strength' => 10, 'abilities' => ['morale'], 'filename' => 'milva', 'count' => 1],
            174  => ['name' => 'Riordain', 'id' => '130', 'deck' => 'scoiatael', 'row' => 'ranged', 'strength' => 1, 'abilities' => [], 'filename' => 'riordain', 'count' => 1],
            175  => ['name' => 'Saesenthessis', 'id' => '18', 'deck' => 'scoiatael', 'row' => 'ranged', 'strength' => 10, 'abilities' => ['hero'], 'filename' => 'saskia', 'count' => 1],
            176  => ['name' => 'Toruviel', 'id' => '126', 'deck' => 'scoiatael', 'row' => 'ranged', 'strength' => 2, 'abilities' => [], 'filename' => 'toruviel', 'count' => 1],
            177  => ['name' => 'Vrihedd Brigade Recruit', 'id' => '120', 'deck' => 'scoiatael', 'row' => 'ranged', 'strength' => 4, 'abilities' => [], 'filename' => 'vrihedd_cadet', 'count' => 1],
            178  => ['name' => 'Vrihedd Brigade Veteran', 'id' => '113', 'deck' => 'scoiatael', 'row' => 'agile', 'strength' => 5, 'abilities' => [], 'filename' => 'vrihedd_brigade', 'count' => 1],
            179  => ['name' => 'Vrihedd Brigade Veteran', 'id' => '114', 'deck' => 'scoiatael', 'row' => 'agile', 'strength' => 5, 'abilities' => [], 'filename' => 'vrihedd_brigade_1', 'count' => 1],
            180  => ['name' => 'Yaevinn', 'id' => '105', 'deck' => 'scoiatael', 'row' => 'agile', 'strength' => 6, 'abilities' => [], 'filename' => 'yaevinn', 'count' => 1],
            181  => ['name' => 'Berserker', 'id' => '', 'deck' => 'skellige', 'row' => 'close', 'strength' => 4, 'abilities' => ['berserker'], 'filename' => 'berserker', 'count' => 1],
            182  => ['name' => 'Birna Bran', 'id' => '', 'deck' => 'skellige', 'row' => 'close', 'strength' => 2, 'abilities' => ['medic'], 'filename' => 'birna', 'count' => 1],
            183  => ['name' => 'Blueboy Lugos', 'id' => '', 'deck' => 'skellige', 'row' => 'close', 'strength' => 6, 'abilities' => [], 'filename' => 'blueboy', 'count' => 1],
            184  => ['name' => 'Cerys', 'id' => '', 'deck' => 'skellige', 'row' => 'close', 'strength' => 10, 'abilities' => ['hero', 'muster'], 'filename' => 'cerys', 'count' => 1],
            185  => ['name' => 'Clan Brokva Archer', 'id' => '', 'deck' => 'skellige', 'row' => 'ranged', 'strength' => 6, 'abilities' => [], 'filename' => 'brokva_archer', 'count' => 2],
            186  => ['name' => 'Clan Dimun Pirate', 'id' => '', 'deck' => 'skellige', 'row' => 'ranged', 'strength' => 6, 'abilities' => ['scorch'], 'filename' => 'dimun_pirate', 'count' => 1],
            187  => ['name' => 'Cerys - Clan Drummond Shield Maiden', 'id' => '', 'deck' => 'skellige', 'row' => 'close', 'strength' => 4, 'abilities' => ['bond'], 'filename' => 'shield_maiden', 'count' => 1],
            188  => ['name' => 'Cerys - Clan Drummond Shield Maiden', 'id' => '', 'deck' => 'skellige', 'row' => 'close', 'strength' => 4, 'abilities' => ['bond'], 'filename' => 'shield_maiden_1', 'count' => 1],
            189  => ['name' => 'Cerys - Clan Drummond Shield Maiden', 'id' => '', 'deck' => 'skellige', 'row' => 'close', 'strength' => 4, 'abilities' => ['bond'], 'filename' => 'shield_maiden_2', 'count' => 1],
            190  => ['name' => 'Clan Heymaey Skald', 'id' => '', 'deck' => 'skellige', 'row' => 'close', 'strength' => 4, 'abilities' => [], 'filename' => 'heymaey', 'count' => 1],
            191  => ['name' => 'Clan Tordarroch Armorsmith', 'id' => '', 'deck' => 'skellige', 'row' => 'close', 'strength' => 4, 'abilities' => [], 'filename' => 'tordarroch', 'count' => 1],
            192  => ['name' => 'Clan an Craite Warrior', 'id' => '', 'deck' => 'skellige', 'row' => 'close', 'strength' => 6, 'abilities' => ['bond'], 'filename' => 'craite_warrior', 'count' => 3],
            193  => ['name' => 'Donar an Hindar', 'id' => '', 'deck' => 'skellige', 'row' => 'close', 'strength' => 4, 'abilities' => [], 'filename' => 'donar', 'count' => 1],
            194  => ['name' => 'Draig Bon-Dhu', 'id' => '', 'deck' => 'skellige', 'row' => 'siege', 'strength' => 2, 'abilities' => ['horn'], 'filename' => 'draig', 'count' => 1],
            195  => ['name' => 'Ermion', 'id' => '', 'deck' => 'skellige', 'row' => 'ranged', 'strength' => 8, 'abilities' => ['hero', 'mardroeme'], 'filename' => 'ermion', 'count' => 1],
            196  => ['name' => 'Hemdall', 'id' => '', 'deck' => 'skellige', 'row' => 'close', 'strength' => 11, 'abilities' => ['hero'], 'filename' => 'hemdall', 'count' => 0],
            197  => ['name' => 'Hjalmar', 'id' => '', 'deck' => 'skellige', 'row' => 'ranged', 'strength' => 10, 'abilities' => ['hero'], 'filename' => 'hjalmar', 'count' => 1],
            198  => ['name' => 'Holger Blackhand', 'id' => '', 'deck' => 'skellige', 'row' => 'siege', 'strength' => 4, 'abilities' => [], 'filename' => 'holger', 'count' => 1],
            199  => ['name' => 'Kambi', 'id' => '', 'deck' => 'skellige', 'row' => 'close', 'strength' => 0, 'abilities' => ['avenger_kambi'], 'filename' => 'kambi', 'count' => 1],
            200  => ['name' => 'Light Longship', 'id' => '', 'deck' => 'skellige', 'row' => 'ranged', 'strength' => 4, 'abilities' => ['muster'], 'filename' => 'light_longship', 'count' => 3],
            201  => ['name' => 'Madman Lugos', 'id' => '', 'deck' => 'skellige', 'row' => 'close', 'strength' => 6, 'abilities' => [], 'filename' => 'madmad_lugos', 'count' => 1],
            202  => ['name' => 'Mardroeme', 'id' => '', 'deck' => 'special', 'row' => '', 'strength' => 0, 'abilities' => ['mardroeme'], 'filename' => 'mardroeme', 'count' => 3],
            203  => ['name' => 'Olaf', 'id' => '', 'deck' => 'skellige', 'row' => 'agile', 'strength' => 12, 'abilities' => ['morale'], 'filename' => 'olaf', 'count' => 1],
            204  => ['name' => 'Skellige Storm', 'id' => '', 'deck' => 'weather', 'row' => '', 'strength' => 0, 'abilities' => ['rain', 'fog'], 'filename' => 'storm', 'count' => 3],
            205  => ['name' => 'Svanrige', 'id' => '', 'deck' => 'skellige', 'row' => 'close', 'strength' => 4, 'abilities' => [], 'filename' => 'svanrige', 'count' => 1],
            206  => ['name' => 'Transformed Vildkaarl', 'id' => '', 'deck' => 'skellige', 'row' => 'close', 'strength' => 14, 'abilities' => ['morale'], 'filename' => 'vildkaarl', 'count' => 0],
            207  => ['name' => 'Transformed Young Vildkaarl', 'id' => '', 'deck' => 'skellige', 'row' => 'ranged', 'strength' => 8, 'abilities' => ['bond'], 'filename' => 'young_vildkaarl', 'count' => 0],
            208  => ['name' => 'Udalryk', 'id' => '', 'deck' => 'skellige', 'row' => 'close', 'strength' => 4, 'abilities' => [], 'filename' => 'udalryk', 'count' => 1],
            209  => ['name' => 'War Longship', 'id' => '', 'deck' => 'skellige', 'row' => 'siege', 'strength' => 6, 'abilities' => ['bond'], 'filename' => 'war_longship', 'count' => 2],
            210  => ['name' => 'Young Berserker', 'id' => '', 'deck' => 'skellige', 'row' => 'ranged', 'strength' => 2, 'abilities' => ['berserker'], 'filename' => 'young_berserker', 'count' => 3],
            211  => ['name' => 'Crach an Craite', 'id' => '', 'deck' => 'skellige', 'row' => 'leader', 'strength' => 0, 'abilities' => ['crach_an_craite'], 'filename' => 'crach_an_craite', 'count' => 0],
            212  => ['name' => 'King Bran', 'id' => '', 'deck' => 'skellige', 'row' => 'leader', 'strength' => 0, 'abilities' => ['king_bran'], 'filename' => 'king_bran', 'count' => 0],
            213  => ['name' => 'Schirru', 'id' => '', 'deck' => 'scoiatael', 'row' => 'siege', 'strength' => 8, 'abilities' => ['scorch_s'], 'filename' => 'schirru', 'count' => 1],
        ];
    }
}
