// ==========================================================================
// 芳喜蓁站手工坊 - 預設商品價目表、常用標籤、合作客戶與店家基本資料 (js/config/defaults.js)
// 日後若要修改內建預設價格、規格或新增預設品項，直接修改此檔案即可
// ==========================================================================

// --- Initial Master Price Data from 1001新估價單.xlsx ---
const DEFAULT_PRICE_LIST = [
  { name: "里肌肉", price: 300, code: "999", spec: "1300克" },
  { name: "里肌肉-正常", price: 300, code: "999-1", spec: "1300克" },
  { name: "里肌肉-1點", price: 300, code: "999-2", spec: "1300克" },
  { name: "里肌肉-2點", price: 300, code: "999-3", spec: "1300克" },
  { name: "里肌肉(23片)", price: 300, code: "998", spec: "1300克" },
  { name: "里肌肉(一公斤)", price: 220, code: "997", spec: "1000公克" },
  { name: "豬柳", price: 190, code: "996-0", spec: "1公斤" },
  { name: "豬柳(袋裝)", price: 190, code: "996", spec: "1公斤(袋裝)" },
  { name: "細豬柳(袋裝)", price: 190, code: "995", spec: "1公斤(袋裝)" },
  { name: "豬柳(盒裝)", price: 95, code: "994", spec: "420克(盒裝)" },
  { name: "炸豬排", price: 200, code: "993", spec: "12片" },
  { name: "炸豬排(14片)", price: 200, code: "992", spec: "14片" },
  { name: "蛋餅皮", price: 65, code: "991", spec: "30片" },
  { name: "漢堡肉", price: 200, code: "990", spec: "35片" },
  { name: "花枝蝦排", price: 170, code: "989", spec: "15片" },
  { name: "月亮蝦餅", price: 220, code: "988", spec: "10片" },
  { name: "咖啡粉", price: 200, code: "987", spec: "930克" },
  { name: "巧克力粉", price: 200, code: "986", spec: "910克" },
  { name: "紐奧良辣雞堡", price: 150, code: "985", spec: "15片" },
  { name: "紐奧良辣雞腿排", price: 180, code: "984", spec: "10片" },
  { name: "麥香紅茶", price: 620, code: "983", spec: "一箱（70包）" },
  { name: "錫蘭紅茶", price: 950, code: "982", spec: "一箱（150包）" },
  { name: "奶精粉", price: 90, code: "981", spec: "600克(1又2/3罐奶精)" },
  { name: "山葵醬", price: 55, code: "980", spec: "500克" },
  { name: "特調番茄醬", price: 55, code: "979", spec: "550克" },
  { name: "沙拉", price: 220, code: "978", spec: "3公斤" },
  { name: "蘿蔔糕", price: 55, code: "977", spec: "10片" },
  { name: "薯泥粉", price: 100, code: "976", spec: "500克" },
  { name: "烏醋醬", price: 40, code: "975", spec: "500克" },
  { name: "柴魚高湯粉", price: 250, code: "974", spec: "1公斤" },
  { name: "5808", price: 410, code: "973", spec: "1公斤" },
  { name: "小鬆餅", price: 330, code: "972", spec: "一箱(30個)" },
  { name: "奶酥", price: 110, code: "971", spec: "525克" },
  { name: "香蒜", price: 100, code: "970", spec: "600克" },
  { name: "海鮮配料", price: 95, code: "969", spec: "500克" },
  { name: "藍莓乳酪", price: 160, code: "968", spec: "500克" },
  { name: "千島醬", price: 55, code: "967", spec: "500克" },
  { name: "日式燒肉", price: 180, code: "966", spec: "700克" },
  { name: "陽光沙拉", price: 55, code: "965", spec: "300克" },
  { name: "丼飯醬", price: 75, code: "964", spec: "600克" },
  { name: "椒麻醬", price: 140, code: "963", spec: "500公克" },
  { name: "金匠椰香奶酥", price: 380, code: "962", spec: "1.8公斤" },
  { name: "鱈魚", price: 520, code: "961", spec: "一箱(26片/65克)" },
  { name: "牛堡醬", price: 55, code: "960", spec: "500克" },
  { name: "美式牛肉堡", price: 180, code: "959", spec: "一包(10片/80克)" },
  { name: "三杯醬", price: 150, code: "958", spec: "一包(20包*80克)" },
  { name: "熱狗", price: 135, code: "957", spec: "50支" },
  { name: "牛角(已含5％稅金)", price: 113, code: "956", spec: "6個" },
  { name: "核桃", price: 750, code: "955", spec: "" },
  { name: "烘烤蜜核桃", price: 430, code: "954", spec: "1200克" },
  { name: "原味卡拉", price: 200, code: "953", spec: "1公斤" },
  { name: "紅龍辣卡", price: 200, code: "952", spec: "1公斤" },
  { name: "富統培根", price: 240, code: "951", spec: "1公斤" },
  { name: "貝果(已含5％稅金)", price: 67, code: "950", spec: "4個" },
  { name: "丹麥(已含5％稅金)", price: 74, code: "949", spec: "" },
  { name: "佛卡夏(已含5％稅金)", price: 101, code: "948", spec: "8個" },
  { name: "法國麵包(已含5％稅金)", price: 76, code: "947", spec: "6個" },
  { name: "特級大火腿", price: 410, code: "946", spec: "3公斤" },
  { name: "金匠花生醬", price: 420, code: "945", spec: "3公斤" },
  { name: "鮪魚", price: 910, code: "944", spec: "一箱" },
  { name: "白蛋餅皮", price: 65, code: "943", spec: "30片" },
  { name: "風味瑪琪琳(奶油)", price: 480, code: "942", spec: "2.6公斤" },
  { name: "安美培根", price: 220, code: "941", spec: "1公斤" },
  { name: "特調番茄醬", price: 320, code: "940", spec: "" }
];

const DEFAULT_QUICK_TAG_NAMES = [
  "里肌肉", "炸豬排", "豬柳", "漢堡肉", "蛋餅皮", "花枝蝦排", "月亮蝦餅", 
  "紐奧良辣雞堡", "蘿蔔糕", "日式燒肉", "特調番茄醬", "千島醬", "沙拉", 
  "奶酥", "香蒜", "錫蘭紅茶", "麥香紅茶", "咖啡粉", "小鬆餅", "5808", "柴魚高湯粉"
];


const DEFAULT_CUSTOMER_LIST = [
  { name: "早安美而美（安平店）", taxId: "88812345", contact: "林志豪", phone: "0912-345-678", address: "台南市安平區華平路123號", remark: "每週二、五早上 07:30 前送達", createdAt: "2026-10-01", weekdays: ["星期二", "星期五"] },
  { name: "弘爺漢堡（健康店）", taxId: "77765432", contact: "陳店長", phone: "0928-111-222", address: "台南市中西區健康路二段45號", remark: "固定週三進貨，款項月底結清", createdAt: "2026-10-05", weekdays: ["星期三"] },
  { name: "美芝城早午餐（永華店）", taxId: "66698765", contact: "張小姐", phone: "0933-888-999", address: "台南市安平區永華路二段88號", remark: "假日生意好，週五需加量出貨", createdAt: "2026-10-10", weekdays: ["星期五", "星期六", "星期日"] },
  { name: "拉亞漢堡（文平店）", taxId: "55543210", contact: "郭店長", phone: "0975-666-777", address: "台南市安平區文平路200號", remark: "送貨前請先電話聯絡", createdAt: "2026-10-15", weekdays: ["星期一", "星期三", "星期五"] },
  { name: "麥味登早午餐（慶平店）", taxId: "44432198", contact: "謝老闆", phone: "0955-444-333", address: "台南市安平區慶平路350號", remark: "漢堡肉與蛋餅皮固定每週補貨", createdAt: "2026-10-20", weekdays: ["星期二", "星期四", "星期六"] }
];

const DEFAULT_STORE_CONFIG = {
  storeName: "芳喜蓁站手工坊",
  taxId: "40713530",
  address: "台南市安平區安平路446巷27弄23號1樓",
  contact1Name: "許芳瑜",
  contact1Phone: "0931-310-660",
  contact2Name: "許銥庭",
  contact2Phone: "0989-730-103",
};
