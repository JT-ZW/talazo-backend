// Codes from the Farmonaut crop reference. Exact aliases only: varieties and
// ambiguous names remain unclassified until an administrator reviews them.
const commonCrops=[
 ['6','Maize',['corn','maize corn','chibage']],['11','Soybean',['soybeans','soya','soya bean','soya beans','soy bean','soy beans']],
 ['19','Tobacco',[]],['2','Wheat',[]],['4','Sorghum',['jowar']],['5','Pearl millet',['bajra','mhunga']],
 ['89','Finger millet',['ragi','rapoko']],['20','Groundnut',['groundnuts','peanut','peanuts']],['32','Tomato',['tomatoes']],
 ['16','Potato',['potatoes','irish potato','irish potatoes']],['13','Sugarcane',['sugar cane']],['14','Cotton',[]],
 ['12','Sunflower',['sunflowers']],['101','Cassava',['tapioca']],['26','Banana',['bananas']],['54','Coffee',[]],
 ['25','Tea',[]],['56','Cowpea',['cowpeas','cow pea','cow peas']],['40','French bean',['french beans']],
 ['62','Kidney bean',['kidney beans']],['17','Onion',['onions']],['27','Cauliflower',[]],['29','Cucumber',['cucumbers']],
 ['30','Okra',[]],['23','Chili',['chilli','chilies','chillies']],['129','Spinach',[]],['130','Lettuce',[]],
 ['127','Carrot',['carrots']],['132','Pumpkin',['pumpkins']],['139','Watermelon',['watermelons']],
 ['24','Grape',['grapes']],['69','Mango',['mangoes','mangos']],['136','Avocado',['avocados']],
 ['1','Rice',[]],['77','Paddy',[]],['117','Alfalfa',['lucerne']],['95','Sesame',[]],['123','Oats',[]]
].map(([code,name,aliases])=>({code:String(code),name:String(name),aliases:/** @type {string[]} */(aliases)}));
const otherCrops=[
 {
  "code": "117",
  "name": "Alfalfa",
  "aliases": []
 },
 {
  "code": "122",
  "name": "Almonds",
  "aliases": []
 },
 {
  "code": "35",
  "name": "Apple",
  "aliases": []
 },
 {
  "code": "36",
  "name": "Apricot",
  "aliases": []
 },
 {
  "code": "37",
  "name": "Areca Nut",
  "aliases": []
 },
 {
  "code": "156",
  "name": "Artichoke",
  "aliases": []
 },
 {
  "code": "157",
  "name": "Asparagus",
  "aliases": []
 },
 {
  "code": "136",
  "name": "Avocado",
  "aliases": []
 },
 {
  "code": "5",
  "name": "Pearl millet",
  "aliases": []
 },
 {
  "code": "38",
  "name": "Bamboo",
  "aliases": []
 },
 {
  "code": "26",
  "name": "Banana",
  "aliases": []
 },
 {
  "code": "39",
  "name": "Barley",
  "aliases": []
 },
 {
  "code": "128",
  "name": "Beetroot",
  "aliases": []
 },
 {
  "code": "34",
  "name": "Bell pepper",
  "aliases": []
 },
 {
  "code": "41",
  "name": "Bengal Gram",
  "aliases": []
 },
 {
  "code": "42",
  "name": "Ber",
  "aliases": []
 },
 {
  "code": "43",
  "name": "Betel Leaf",
  "aliases": []
 },
 {
  "code": "44",
  "name": "Bitter Gourd",
  "aliases": []
 },
 {
  "code": "45",
  "name": "Black Gram",
  "aliases": []
 },
 {
  "code": "144",
  "name": "Black pepper",
  "aliases": []
 },
 {
  "code": "137",
  "name": "Blueberry",
  "aliases": []
 },
 {
  "code": "46",
  "name": "Bottle Gourd",
  "aliases": []
 },
 {
  "code": "131",
  "name": "Broccoli",
  "aliases": []
 },
 {
  "code": "155",
  "name": "Buckwheat",
  "aliases": []
 },
 {
  "code": "28",
  "name": "Cabbage",
  "aliases": []
 },
 {
  "code": "140",
  "name": "Cantaloupe",
  "aliases": []
 },
 {
  "code": "47",
  "name": "Cardamom",
  "aliases": []
 },
 {
  "code": "127",
  "name": "Carrot",
  "aliases": []
 },
 {
  "code": "48",
  "name": "Cashew",
  "aliases": []
 },
 {
  "code": "101",
  "name": "Cassava",
  "aliases": []
 },
 {
  "code": "49",
  "name": "Castor",
  "aliases": []
 },
 {
  "code": "27",
  "name": "Cauliflower",
  "aliases": []
 },
 {
  "code": "158",
  "name": "Celery",
  "aliases": []
 },
 {
  "code": "51",
  "name": "Cherry",
  "aliases": []
 },
 {
  "code": "8",
  "name": "Chickpea",
  "aliases": []
 },
 {
  "code": "23",
  "name": "Chili",
  "aliases": []
 },
 {
  "code": "146",
  "name": "Cinnamon",
  "aliases": []
 },
 {
  "code": "152",
  "name": "Clover",
  "aliases": []
 },
 {
  "code": "145",
  "name": "Cloves",
  "aliases": []
 },
 {
  "code": "150",
  "name": "Cocoa",
  "aliases": []
 },
 {
  "code": "18",
  "name": "Coconut",
  "aliases": []
 },
 {
  "code": "54",
  "name": "Coffee",
  "aliases": []
 },
 {
  "code": "55",
  "name": "Coriander",
  "aliases": []
 },
 {
  "code": "14",
  "name": "Cotton",
  "aliases": []
 },
 {
  "code": "56",
  "name": "Cowpea",
  "aliases": []
 },
 {
  "code": "29",
  "name": "Cucumber",
  "aliases": []
 },
 {
  "code": "58",
  "name": "Cumin",
  "aliases": []
 },
 {
  "code": "111",
  "name": "Custard apple",
  "aliases": []
 },
 {
  "code": "121",
  "name": "Date palm",
  "aliases": []
 },
 {
  "code": "115",
  "name": "Dragon fruit",
  "aliases": []
 },
 {
  "code": "33",
  "name": "Eggplant",
  "aliases": []
 },
 {
  "code": "116",
  "name": "Elephant foot yam",
  "aliases": []
 },
 {
  "code": "149",
  "name": "Fennel",
  "aliases": []
 },
 {
  "code": "60",
  "name": "Fig",
  "aliases": []
 },
 {
  "code": "40",
  "name": "French bean",
  "aliases": []
 },
 {
  "code": "134",
  "name": "Garlic",
  "aliases": []
 },
 {
  "code": "135",
  "name": "Ginger",
  "aliases": []
 },
 {
  "code": "162",
  "name": "Ginseng",
  "aliases": []
 },
 {
  "code": "24",
  "name": "Grape",
  "aliases": []
 },
 {
  "code": "63",
  "name": "Grapefruit",
  "aliases": []
 },
 {
  "code": "64",
  "name": "Green gram",
  "aliases": []
 },
 {
  "code": "66",
  "name": "Guar",
  "aliases": []
 },
 {
  "code": "67",
  "name": "Guava",
  "aliases": []
 },
 {
  "code": "120",
  "name": "Hemp",
  "aliases": []
 },
 {
  "code": "165",
  "name": "Hops",
  "aliases": []
 },
 {
  "code": "114",
  "name": "Horse gram",
  "aliases": []
 },
 {
  "code": "164",
  "name": "Indigo",
  "aliases": []
 },
 {
  "code": "110",
  "name": "Jackfruit",
  "aliases": []
 },
 {
  "code": "4",
  "name": "Sorghum",
  "aliases": []
 },
 {
  "code": "15",
  "name": "Jute",
  "aliases": []
 },
 {
  "code": "62",
  "name": "Kidney bean",
  "aliases": []
 },
 {
  "code": "108",
  "name": "Kiwi",
  "aliases": []
 },
 {
  "code": "159",
  "name": "Leek",
  "aliases": []
 },
 {
  "code": "141",
  "name": "Lemon",
  "aliases": []
 },
 {
  "code": "125",
  "name": "Lentils",
  "aliases": []
 },
 {
  "code": "130",
  "name": "Lettuce",
  "aliases": []
 },
 {
  "code": "169",
  "name": "Lima bean",
  "aliases": []
 },
 {
  "code": "142",
  "name": "Lime",
  "aliases": []
 },
 {
  "code": "126",
  "name": "Linseed",
  "aliases": []
 },
 {
  "code": "68",
  "name": "Litchi",
  "aliases": []
 },
 {
  "code": "6",
  "name": "Maize",
  "aliases": []
 },
 {
  "code": "143",
  "name": "Mandarin",
  "aliases": []
 },
 {
  "code": "69",
  "name": "Mango",
  "aliases": []
 },
 {
  "code": "119",
  "name": "Marigold",
  "aliases": []
 },
 {
  "code": "153",
  "name": "Mint",
  "aliases": []
 },
 {
  "code": "72",
  "name": "Mulberry",
  "aliases": []
 },
 {
  "code": "161",
  "name": "Mushroom",
  "aliases": []
 },
 {
  "code": "73",
  "name": "Mustard",
  "aliases": []
 },
 {
  "code": "147",
  "name": "Nutmeg",
  "aliases": []
 },
 {
  "code": "123",
  "name": "Oats",
  "aliases": []
 },
 {
  "code": "107",
  "name": "Oil palm",
  "aliases": []
 },
 {
  "code": "30",
  "name": "Okra",
  "aliases": []
 },
 {
  "code": "160",
  "name": "Olive",
  "aliases": []
 },
 {
  "code": "17",
  "name": "Onion",
  "aliases": []
 },
 {
  "code": "75",
  "name": "Opium poppy",
  "aliases": []
 },
 {
  "code": "76",
  "name": "Orange",
  "aliases": []
 },
 {
  "code": "77",
  "name": "Paddy",
  "aliases": []
 },
 {
  "code": "78",
  "name": "Papaya",
  "aliases": []
 },
 {
  "code": "79",
  "name": "Pea",
  "aliases": []
 },
 {
  "code": "80",
  "name": "Peach",
  "aliases": []
 },
 {
  "code": "20",
  "name": "Groundnut",
  "aliases": []
 },
 {
  "code": "81",
  "name": "Pear",
  "aliases": []
 },
 {
  "code": "9",
  "name": "Pigeon pea",
  "aliases": []
 },
 {
  "code": "112",
  "name": "Pine tree",
  "aliases": []
 },
 {
  "code": "84",
  "name": "Pineapple",
  "aliases": []
 },
 {
  "code": "166",
  "name": "Pistachio",
  "aliases": []
 },
 {
  "code": "85",
  "name": "Plum",
  "aliases": []
 },
 {
  "code": "86",
  "name": "Pomegranate",
  "aliases": []
 },
 {
  "code": "16",
  "name": "Potato",
  "aliases": []
 },
 {
  "code": "132",
  "name": "Pumpkin",
  "aliases": []
 },
 {
  "code": "154",
  "name": "Quinoa",
  "aliases": []
 },
 {
  "code": "88",
  "name": "Radish",
  "aliases": []
 },
 {
  "code": "89",
  "name": "Finger millet",
  "aliases": []
 },
 {
  "code": "10",
  "name": "Rapeseed",
  "aliases": []
 },
 {
  "code": "138",
  "name": "Raspberry",
  "aliases": []
 },
 {
  "code": "1",
  "name": "Rice",
  "aliases": []
 },
 {
  "code": "91",
  "name": "Rose",
  "aliases": []
 },
 {
  "code": "92",
  "name": "Rubber",
  "aliases": []
 },
 {
  "code": "124",
  "name": "Rye",
  "aliases": []
 },
 {
  "code": "93",
  "name": "Safflower",
  "aliases": []
 },
 {
  "code": "167",
  "name": "Saffron",
  "aliases": []
 },
 {
  "code": "95",
  "name": "Sesame",
  "aliases": []
 },
 {
  "code": "151",
  "name": "Sisal",
  "aliases": []
 },
 {
  "code": "11",
  "name": "Soybean",
  "aliases": []
 },
 {
  "code": "129",
  "name": "Spinach",
  "aliases": []
 },
 {
  "code": "133",
  "name": "Squash",
  "aliases": []
 },
 {
  "code": "168",
  "name": "Star anise",
  "aliases": []
 },
 {
  "code": "163",
  "name": "Stevia",
  "aliases": []
 },
 {
  "code": "113",
  "name": "Strawberry",
  "aliases": []
 },
 {
  "code": "99",
  "name": "Sugar beet",
  "aliases": []
 },
 {
  "code": "13",
  "name": "Sugarcane",
  "aliases": []
 },
 {
  "code": "12",
  "name": "Sunflower",
  "aliases": []
 },
 {
  "code": "100",
  "name": "Sweet cherry",
  "aliases": []
 },
 {
  "code": "25",
  "name": "Tea",
  "aliases": []
 },
 {
  "code": "102",
  "name": "Teak",
  "aliases": []
 },
 {
  "code": "19",
  "name": "Tobacco",
  "aliases": []
 },
 {
  "code": "32",
  "name": "Tomato",
  "aliases": []
 },
 {
  "code": "21",
  "name": "Turmeric",
  "aliases": []
 },
 {
  "code": "103",
  "name": "Turnip",
  "aliases": []
 },
 {
  "code": "148",
  "name": "Vanilla",
  "aliases": []
 },
 {
  "code": "106",
  "name": "Walnut",
  "aliases": []
 },
 {
  "code": "139",
  "name": "Watermelon",
  "aliases": []
 },
 {
  "code": "2",
  "name": "Wheat",
  "aliases": []
 }
];
export const cropCatalog=[...commonCrops,...otherCrops.filter(c=>!commonCrops.some(known=>known.code===c.code))];
/** @param {unknown} value */
export const cropKey=value=>String(value??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
/** @param {unknown} value @param {Array<{code:string,name:string,aliases:string[]}>} [catalog] */
export function standardCrop(value,catalog=cropCatalog) {
 const entered=String(value??'').trim().replace(/\s+/g,' ');
 const key=cropKey(entered);
 const match=catalog.find(c=>cropKey(c.name)===key||c.aliases.some(a=>cropKey(a)===key));
 return {entered,code:match?.code||'999',name:match?.name||'Other',review:!match};
}
