const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});
const path = require('path');

// คลังคำศัพท์ภาษาไทย - หมวดหมู่ ปาร์ตี้ / ออฟฟิศ
const CATEGORIES = {
  'ปาร์ตี้': [
   // คำอุทาน/ติดปาก
  'เฮ', 'โห', 'อุ้ย', 'โอ', 'อา', 'เอ', 'อิ', 'อี', 'อุ', 'โอ้โห',
  'ว้าว', 'โอ้ว', 'อ๊ะ', 'เอ๊ะ', 'อ๊อ', 'อุ๊บ', 'โธ่', 'โธ', 'แหน่', 'เห้อ',
  'ฮือ', 'ฮัก', 'ฉึก', 'ป๋อ', 'ปั๊ก', 'ป๊อก', 'ปุ๊ก', 'โป้ก', 'แปะ', 'ป๊าด',
  'ชะ', 'ชิ', 'ถุย', 'ทุย', 'ปุ้ย', 'โว้ย', 'หวา', 'แหม่',

  // กริยาปาร์ตี้
  'แกล้ง', 'แหย', 'ยั่ว', 'ล้อ', 'หยอก', 'เย้า', 'จูบ', 'กอด', 'โอบ', 'พยัก',
  'ผงก', 'ขยิบ', 'ขยับ', 'ยิ้ม', 'ยักไหล่', 'ชี้', 'โบก', 'ตบ', 'ตบไหล่', 'ตบหลัง',
  'ตบมือ', 'ปรบ', 'กระซิบ', 'ตะโกน', 'กรี๊ด', 'หอน', 'ฮัม', 'ผิวปาก', 'เป่า', 'เคาะ',
  'กระทืบ', 'กระโดดโลด', 'ควง', 'หมุน', 'ติ่ง', 'เตะ', 'ถีบ', 'ชก', 'ต่อย', 'ปัด',
  'โยน', 'จับ', 'ปล่อย', 'กระชาก', 'ฉวย', 'คว้า', 'หยิบ', 'วาง', 'ทิ้ง', 'เหวี่ยง',
  'สะบัด', 'ไล่', 'วิ่งหนี', 'วิ่งตาม', 'ไล่จับ', 'ซ่อนหา', 'แข่ง', 'พนัน', 'เดิมพัน',
  'เปิดเพลง', 'เปลี่ยนเพลง', 'ขอเพลง', 'ร้องคู่', 'เต้นคู่', 'จับคู่', 'เปลี่ยนคู่', 'จีบ', 'แอ้ม', 'ขอเบอร์',

  // อารมณ์/ความรู้สึก
  'ฟิน', 'เว่อร์', 'ทึ่ง', 'ตื่น', 'ตกใจ', 'หวิว', 'เสียว', 'ซึ้ง', 'ปลื้ม', 'ภูมิ',
  'หยิ่ง', 'โก้', 'เท่', 'หน่าย', 'เอียน', 'ขำ', 'ฮา', 'ตลก', 'เฮฮา', 'ขัน',
  'ขื่น', 'หืน', 'หึง', 'โมโห', 'แค้น', 'เจ็บใจ', 'น้อยใจ', 'งอน', 'คะนอง', 'ป่า',
  'เถื่อน', 'บ้าบิ่น', 'บ้าระห่ำ', 'ใจร้อน', 'ใจเย็น', 'ใจดี', 'ใจดำ', 'ใจอ่อน', 'ใจแข็ง', 'ใจหาย',
  'ใจชื้น', 'ใจพอง', 'ใจฝ่อ', 'ใจเต้น', 'หัวร้อน', 'หัวเย็น', 'หัวอ่อน', 'หัวแข็ง', 'ใจดีสู้เสือ', 'สายเย็น',

  // สภาพร่างกาย/การเคลื่อนไหว
  'คลาน', 'เอน', 'พิง', 'งอ', 'เกร็ง', 'ผ่อน', 'ตึง', 'หย่อน', 'สลบ', 'ฟื้น',
  'สะอึก', 'จาม', 'ไอ', 'เรอ', 'อ้า', 'หุบ', 'บิด', 'ยืด', 'หด', 'ส่าย',
  'แอ่ว', 'โยก', 'เอียง', 'เซ', 'โซ', 'เกลือก', 'กลิ้ง', 'พลิก',
  'คว่ำ', 'หงาย', 'นอนหมอบ', 'นอนตะแคง', 'นอนหงาย', 'นอนคว่ำ', 'นั่งพับเพียบ', 'นั่งขัดสมาธิ', 'นั่งเหยียด', 'นั่งงอ',

  // สี/ลักษณะภาพ
  'แดง', 'ส้ม', 'เหลือง', 'เขียว', 'ฟ้า', 'ม่วง', 'ชมพู', 'ขาว', 'ดำ', 'เทา',
  'น้ำตาล', 'ทอง', 'เงิน', 'ใส', 'ขุ่น', 'มัว', 'จาง', 'เข้ม', 'สด', 'หม่น',
  'โทน', 'นีออน', 'พาสเทล', 'กลิตเตอร์', 'เมทัลลิก', 'เรือง', 'วาว', 'ด้าน', 'มัน', 'ลาย',

  // คำบอกสถานะ/ตำแหน่ง
  'ข้างใน', 'ข้างนอก', 'ข้างบน', 'ข้างล่าง', 'ข้างหน้า', 'ข้างหลัง', 'ข้างซ้าย', 'ข้างขวา', 'ตรงนี้', 'ตรงนั้น',
  'ใกล้', 'ไกล', 'ชิด', 'ห่าง', 'กลาง', 'ริม', 'ขอบ', 'มุม', 'ปลาย', 'ต้น',
  'แถว', 'โต๊ะ', 'เก้าอี้', 'พื้น', 'บนโต๊ะ', 'ใต้โต๊ะ', 'หลังม่าน', 'ข้างฝา', 'ริมประตู', 'หัวมุม',

  // คำสแลงความสัมพันธ์
  'โสด', 'คู่', 'แฟน', 'กิ๊ก', 'เพื่อนแท้', 'เพื่อนลม', 'เพื่อนเมา', 'เพื่อนตาย', 'คนรัก', 'คนชอบ',
  'คนแอบชอบ', 'ชอบ', 'รัก', 'เกลียด', 'เฉยๆ', 'แอบรัก', 'ตกหลุม', 'หลงรัก', 'รักแรกพบ',
  'อกหัก', 'เลิก', 'เลิกกัน', 'เลิกแล้ว', 'ช่วง', 'ห่าง', 'คืนดี', 'ง้อ', 'ง้อกัน', 'ขอโทษ',
  'ยกโทษ', 'ให้อภัย', 'โกรธ', 'หายโกรธ', 'เย็นลง', 'ร้อนขึ้น', 'เดือด', 'ระเบิด', 'ระเบิดอารมณ์', 'ระบาย',

  // คำเกี่ยวกับโซเชียล/การสื่อสาร
  'ไลก์', 'แชร์', 'คอมเมนต์', 'แท็ก', 'เช็คอิน', 'อัพสตอรี่', 'ไลฟ์', 'บล็อก', 'แอด', 'ฟอล',
  'อันฟอล', 'มิวท์', 'ดีลีท', 'อาร์ไคฟ์', 'ซ่อน', 'รีโพสต์', 'ดูอย่างเงียบๆ', 'สตอล์ก', 'แอบดู', 'โพสต์',
  'ส่งรูป', 'ส่งคลิป', 'ส่งสติ๊กเกอร์', 'ส่งหัวใจ', 'ส่งไฟร์', 'ส่งซัด', 'รีแอค', 'ส่งต่อ', 'บันทึก', 'สกรีนช็อต',

  // คำขยาย/ระดับ
  'จริงๆ', 'เลยนะ', 'มั้ง', 'คง', 'น่า', 'อาจ', 'ต้อง', 'ควร', 'อยาก', 'ชอบ',
  'เคย', 'เพิ่ง', 'กำลัง', 'จะ', 'แล้ว', 'ยัง', 'ไม่', 'ไม่ได้', 'ไม่เคย', 'ไม่ต้อง',
  'ได้', 'ดี', 'ดีมาก', 'ดีสุด', 'แย่', 'แย่มาก', 'แย่สุด', 'แย่จริง', 'โห่', 'เฮ่',

  // คำบรรยายเสียง/ดนตรี
  'ดัง', 'เบา', 'ก้อง', 'แผ่ว', 'แหลม', 'ทุ้ม', 'กังวาน', 'แหบ', 'แห้ง', 'ชัด',
  'เพราะ', 'ไพเราะ', 'ห่วย', 'หู', 'หูแว่ว', 'หูอื้อ', 'หูตึง', 'จังหวะ', 'ท่วงทำนอง', 'บีท',
  'เบส', 'เทรเบิล', 'โน้ต', 'คอร์ด', 'ริฟ', 'โซโล', 'คอรัส', 'เวิร์ส', 'บริดจ์',

  // คำเบ็ดเตล็ดที่ใช้บ่อยในปาร์ตี้
  'ก่อน', 'หลัง', 'แรก', 'สุดท้าย', 'ต่อไป', 'ถัดไป', 'ก่อนหน้า', 'ตอนนั้น', 'ตอนนี้', 'ต่อจากนี้',
  'เมื่อกี้', 'เมื่อคืน', 'เมื่อวาน', 'พรุ่งนี้', 'คืนนี้', 'เช้านี้', 'ค่ำนี้', 'ดึกนี้', 'รุ่งนี้', 'เดี๋ยวนี้',
  ],
  'ออฟฟิศ': [
    'อ้าว', 'อ้อ', 'อ๋อ', 'โอ้', 'เออ', 'อือ', 'อ่า', 'อ่ะ', 'เอ่อ', 'อุ้ย',
  'ชัวร์', 'โอเค', 'โอเคนะ', 'ใช่', 'ใช่เลย', 'ถูกต้อง', 'ถูกแล้ว', 'ดีเลย', 'ได้เลย', 'ตกลง',
  'งั้นนะ', 'งั้นเหรอ', 'จริงๆ เหรอ', 'อ๋อแบบนั้น', 'โอ้แบบนั้น', 'อ๋อโอเค', 'เข้าใจแล้ว', 'รับทราบ', 'โนพรอบเลม',

  // กริยาในออฟฟิศ
  'รีบ', 'รอ', 'เช็ก', 'ดู', 'แก้', 'คิด', 'จด', 'จับ', 'เก็บ', 'ทิ้ง',
  'ขีด', 'ขีดฆ่า', 'ขีดเส้น', 'เน้น', 'ติ๊ก', 'ครอส', 'วงกลม', 'ใส่ดาว', 'ลูกศร', 'ไฮไลต์',
  'เลื่อน', 'ย้าย', 'โยก', 'พลิก', 'กลับ', 'สลับ', 'สับ', 'สุ่ม', 'ฟิลเตอร์', 'ค้นหา',
  'แก้เป็น', 'เปลี่ยน', 'แทน', 'เอาออก', 'ตัด', 'ปรับ', 'โอน', 'ย้ายไฟล์', 'ก็อปไฟล์', 'วางไฟล์',
  'ซิป', 'แตกไฟล์', 'อัปโหลด', 'ดาวน์โหลด', 'แชร์ลิงก์', 'ส่งลิงก์', 'คัดลอก', 'วางลิงก์', 'เปิดลิงก์', 'ปิดแท็บ',
  'รีเฟรช', 'โหลดใหม่', 'เปิดใหม่', 'ปิดเปิด', 'รีสตาร์ต', 'บูตใหม่', 'อัปเดต', 'อัปเกรด', 'แพตช์', 'ดีบัก',

  // คนในออฟฟิศ (คำสั้น)
  'พี่', 'น้อง', 'เพื่อน', 'หัวหน้า', 'ลูกน้อง', 'บอส', 'แม่บ้าน', 'รปภ', 'แอดมิน', 'ไอที',
  'บัญชี', 'กม', 'ขาย', 'การตลาด', 'ซัพพอร์ต', 'ลูกค้า', 'คู่ค้า', 'รุ่นพี่', 'รุ่นน้อง', 'คนใหม่',
  'คนเก่า', 'คนดัง', 'คนเงียบ', 'คนงาน', 'คนว่าง', 'คนยุ่ง', 'คนดี', 'คนเก่ง', 'คนขยัน', 'คนขี้เกียจ',

  // สถานที่/พื้นที่ทำงาน
  'โถง', 'ทางเดิน', 'บันได', 'ลิฟต์', 'ที่จอด', 'ห้อง', 'โซน', 'เดสก์', 'บูธ', 'คิวบิเคิล',
  'กระดาน', 'ไวท์บอร์ด', 'กระจก', 'ป้าย', 'ชั้นวาง', 'ถาดส่งงาน', 'กล่องจดหมาย', 'ตู้เมล', 'ล็อกเกอร์',
  'แพนทรี', 'ครัว', 'ที่ล้างจาน', 'ตู้เย็น', 'ไมโครเวฟ', 'เครื่องชง', 'เครื่องน้ำร้อน', 'เครื่องกด', 'เครื่องขาย', 'ตู้ขาย',
  'โรงอาหาร', 'แคนทีน', 'ร้านข้างล่าง', 'ร้านชั้น1', 'ร้านหน้าออฟฟิศ', 'ตลาดใกล้', 'เซเว่น', 'แฟมิลี่มาร์ท', 'ร้านกาแฟ', 'ร้านก๋วยเตี๋ยว',

  // อุปกรณ์/ของใช้
  'กระเป๋า', 'เป้', 'กระเป๋าสตางค์', 'บัตร', 'พาส', 'แท็ก', 'สายคล้อง', 'คลิป', 'หนีบ', 'ยาง',
  'ดินสอ', 'ยางลบ', 'ไม้บรรทัด', 'เทป', 'กาว', 'กรรไกร', 'คัตเตอร์', 'ลวดเย็บ', 'ถอนลวด', 'แม็กซ์',
  'โพสอิท', 'สมุด', 'โน้ตบุ๊ก', 'แฟ้ม', 'แฟ้มแขวน', 'แฟ้มสัน', 'ซองเอกสาร', 'กล่องเอกสาร', 'ถาดเอกสาร', 'กระดาน A4',
  'หน้าจอ', 'คีย์บอร์ด', 'เมาส์', 'แทร็กแพด', 'สายชาร์จ', 'พาวเวอร์แบงก์', 'ฮับ', 'ด็องเกิล', 'เว็บแคม',

  // อาการ/ความรู้สึกในที่ทำงาน
  'ง่วง', 'หาว', 'หิว', 'อิ่ม', 'กระหาย', 'เมื่อย', 'ล้า', 'ปวด', 'ชา', 'คัน',
  'สั่น', 'เหงื่อ', 'วิงเวียน', 'หน้ามืด', 'ใจหาย', 'เครียด', 'กลัว', 'เบื่อ', 'เซ็ง', 'ท้อ',
  'หมดไฟ', 'พัง', 'แบน', 'แห้ง', 'ตึง', 'ล้น', 'แน่น', 'หนัก', 'เบา', 'กดดัน',
  'ลน', 'ลนลาน', 'ตื่นตระหนก', 'ตื่นเต้น', 'ตื่นกลัว', 'ตื่นดีใจ', 'ฮึด', 'ฮึก', 'สู้',

  // คำบรรยายงาน/คุณภาพ
  'ยาก', 'ง่าย', 'ซับซ้อน', 'เรียบง่าย', 'ชัด', 'มัว', 'คลุม', 'กำกวม', 'แน่ชัด', 'ชัดเจน',
  'สำคัญ', 'รอง', 'หลัก', 'เสริม', 'จำเป็น', 'เร่งด่วน', 'รอได้', 'ดี', 'แย่', 'โอเค',
  'น่าพอใจ', 'น่าผิดหวัง', 'น่าทึ่ง', 'แปลก', 'ปกติ', 'ผิดปกติ', 'เกินคาด', 'ต่ำกว่าคาด', 'ตามคาด', 'ไม่คาด',
  'ผ่าน', 'ตก', 'รอด', 'พลาด', 'คลาด', 'เกือบ', 'เกือบได้', 'เกือบผ่าน', 'เกือบเสร็จ', 'เกือบทัน',

  // เวลา/กำหนดการ
  'ตรงเวลา', 'สาย', 'เร็ว', 'ช้า', 'ก่อนเวลา', 'หลังเวลา', 'เกินเวลา', 'ทันเวลา', 'พอดี', 
  'วันนี้', 'พรุ่งนี้', 'มะรืน', 'เมื่อวาน', 'เมื่อวานซืน', 'อาทิตย์นี้', 'เดือนนี้', 'ปีนี้', 'ไตรมาส', 'ครึ่งปี',
  'เช้า', 'สาย', 'เที่ยง', 'บ่าย', 'เย็น', 'ค่ำ', 'ดึก', 'คืน', 'รุ่ง', 'ตี',
  'เดี๋ยว', 'ก่อน', 'หลัง', 'แป๊บ', 'นาน', 'ชั่วคราว', 'ถาวร', 'ด่วน', 'รีบ', 'ค่อยๆ',

  // สถานการณ์งาน
  'ล่าช้า', 'ทัน', 'ไม่ทัน', 'เสร็จ', 'ค้าง', 'ติดขัด', 'แก้ไข', 'ซ่อม', 'ปรับ', 'เพิ่ม', 
  'ลด', 'ตัด', 'เสริม', 'เติม', 'รวม', 'แยก', 'จัด', 'เรียง', 'กรอง', 'ค้น', 
  'หา', 'เจอ', 'ไม่เจอ', 'หาย', 'ขาด', 'ครบ', 'น้อยไป', 'มากไป', 'พอดี', 'พอแล้ว', 
  'ยังไม่พอ', 'เกินไป', 'พอแค่นี้', 'ได้แค่นี้', 'แค่นี้พอ', 'แค่นี้ก็ดี',

  // คำเชื่อม/สำนวนติดปาก
  'งั้น', 'นะ', 'สิ', 'ดิ', 'ด้วย', 'ก็', 'แต่', 'หรือ', 'แล้ว', 'เพราะ',
  'ถ้า', 'แม้', 'ทั้งที่', 'แค่', 'เพียง', 'จน', 'ยัง', 'ดังนั้น', 'ทำให้', 'เลย',
  'จึง', 'โดย', 'ใน', 'นอก', 'ระหว่าง', 'ทั้ง', 'ทั้งหมด', 'ทุก', 'ทุกคน', 'ทุกอย่าง',
  'บาง', 'บางคน', 'บางอย่าง', 'บางที', 'บางครั้ง', 'บางทีก็', 'ส่วนใหญ่', 'ส่วนน้อย', 'ส่วนมาก', 'ส่วนหนึ่ง',

  // วลี/ประโยคสั้นติดปากในออฟฟิศ
  'ดูก่อน', 'ลองก่อน', 'คุยก่อน', 'รอก่อน', 'เดี๋ยวก่อน', 'แป๊บนึง', 'ขอแป๊บ', 'ขอโทษ', 'ขอบคุณ', 'ไม่เป็นไร',
  'ช่วยได้', 'ช่วยไม่ได้', 'ทำได้', 'ทำไม่ได้', 'รู้', 'ไม่รู้', 'ลืม', 'จำได้', 'จำไม่ได้', 'แน่ใจ',
  'ไม่แน่ใจ', 'น่าจะ', 'น่าจะได้', 'น่าจะโอเค', 'ลองดู', 'ลองดูก่อน', 'ดูก่อนนะ', 'เดี๋ยวว่า', 'เดี๋ยวดู', 'เดี๋ยวเช็ก',
  ]
};

// เก็บข้อมูลห้องเกม
const rooms = {};

app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  console.log('🔗 Player connected:', socket.id);

  // สร้างหรือเข้าร่วมห้อง
  socket.on('join-room', (data) => {
    const { roomId, playerName, selectedCat, timerSecs } = data;

    if (!rooms[roomId]) {
      if (selectedCat == null || timerSecs == null) {
        socket.emit('join-error', { message: 'ไม่พบห้องนี้' });
        return;
      }
      rooms[roomId] = {
        id: roomId,
        creator: socket.id,
        players: [],
        playerNames: {},
        currentWord: null,
        wordAssignments: {},
        scores: {},
        gameState: 'lobby',
        roundNum: 0,
        selectedCat: selectedCat || 'ปาร์ตี้',
        timerSecs: timerSecs || 300,
        guessResults: {}
      };
    }

    const room = rooms[roomId];
    
    // เพิ่มผู้เล่น
    if (!room.players.includes(socket.id)) {
      room.players.push(socket.id);
      room.playerNames[socket.id] = playerName;
      room.scores[socket.id] = { correct: 0, wrong: 0, total: 0 };
    }

    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerName = playerName;

    console.log(`✅ ${playerName} joined room ${roomId} (Total: ${room.players.length})`);

    room.players.forEach(pid => {
      io.to(pid).emit('room-updated', {
        roomId,
        players: room.players.map(p => ({
          id: p,
          name: room.playerNames[p],
          score: room.scores[p]?.correct || 0
        })),
        isHost: pid === room.creator,
        gameState: room.gameState,
        selectedCat: room.selectedCat,
        timerSecs: room.timerSecs,
        roundNum: room.roundNum
      });
    });
    // บอก client ว่า socket.id ของตัวเองคืออะไร (ใช้เปรียบเทียบว่าใครคือ "ฉัน")
    socket.emit('your-player-id', socket.id);
  });

  // เปลี่ยนหมวดคำ
  socket.on('change-category', (data) => {
    const room = rooms[socket.roomId];
    if (room && socket.id === room.creator) {
      room.selectedCat = data.category;
      room.players.forEach(pid => {
        io.to(pid).emit('room-updated', {
          selectedCat: room.selectedCat,
          isHost: pid === room.creator
        });
      });
    }
  });

  // เปลี่ยนเวลา
  socket.on('change-timer', (data) => {
    const room = rooms[socket.roomId];
    if (room && socket.id === room.creator) {
      room.timerSecs = data.timerSecs;
      room.players.forEach(pid => {
        io.to(pid).emit('room-updated', {
          timerSecs: room.timerSecs,
          isHost: pid === room.creator
        });
      });
    }
  });

  // สตาร์ตเกม
  socket.on('start-game', () => {
    const room = rooms[socket.roomId];
    if (!room || room.gameState === 'playing') return;
    if (socket.id !== room.creator) return;

    room.gameState = 'playing';
    room.roundNum = (room.roundNum || 0) + 1;
    room.guessResults = {};
    room.playersWhoGuessed = {}; // ใครกดทายคำของตัวเองแล้ว

    // สุ่มคำให้ผู้เล่นแต่ละคน
    assignWordsToPlayers(room);

    // ส่งให้แต่ละคนโดยไม่ส่งคำของตัวเอง (รู้แค่คำของคนอื่น)
    room.startTime = Date.now();
    room.players.forEach(playerId => {
      io.to(playerId).emit('game-started', {
        gameState: 'playing',
        roundNum: room.roundNum,
        timerSecs: room.timerSecs,
        startTime: room.startTime,
        playerWords: room.players.map(pid => ({
          playerId: pid,
          word: pid === playerId ? '' : (room.wordAssignments[pid] || ''),
          playerName: room.playerNames[pid]
        }))
      });
    });

    console.log(`🎮 Game started in room ${socket.roomId}`);
  });

  // บันทึกคำตอบ — ห้ามทายคำของคนอื่น ต้องทายแค่คำบนหัวตัวเอง (targetPlayerId ต้องเป็น socket.id)
  socket.on('submit-guess', (data) => {
    const room = rooms[socket.roomId];
    if (!room) return;

    const { targetPlayerId, guess } = data;
    if (targetPlayerId !== socket.id) return;

    const actualWord = room.wordAssignments[targetPlayerId];
    const isCorrect = guess.toLowerCase().trim() === actualWord.toLowerCase().trim();

    const resultKey = `${socket.id}_${targetPlayerId}`;
    room.guessResults[resultKey] = {
      guesserId: socket.id,
      guesserName: socket.playerName,
      targetPlayerId,
      guess,
      correct: isCorrect
    };

    if (targetPlayerId === socket.id) room.playersWhoGuessed[socket.id] = true;
    const allHaveGuessed = room.players.every(pid => room.playersWhoGuessed[pid]);

    io.to(socket.roomId).emit('guess-received', {
      resultKey,
      guessResult: room.guessResults[resultKey],
      allHaveGuessed
    });

    console.log(`💭 Guess: ${socket.playerName} -> ${actualWord} = ${isCorrect}`);
  });

  // สิ้นสุดรอบ (โฮสเรียก) — กดได้เมื่อทุกคนทายครบ หรือหมดเวลา (timeUp)
  socket.on('end-round', (data) => {
    const room = rooms[socket.roomId];
    if (!room || socket.id !== room.creator) return;
    if (room.gameState !== 'playing') return;

    room.gameState = 'guessing';

    io.to(socket.roomId).emit('round-ended', {
      gameState: 'guessing',
      guessResults: room.guessResults,
      correctAnswers: room.players.map(pid => ({
        playerId: pid,
        word: room.wordAssignments[pid],
        playerName: room.playerNames[pid]
      }))
    });

    console.log(`✋ Round ${room.roundNum} ended`);
  });

  // ต่อรอบถัดไป
  socket.on('next-round', () => {
    const room = rooms[socket.roomId];
    if (!room || socket.id !== room.creator) return;

    room.gameState = 'playing';
    room.roundNum++;
    room.guessResults = {};
    room.playersWhoGuessed = {};

    assignWordsToPlayers(room);

    room.startTime = Date.now();
    room.players.forEach(playerId => {
      io.to(playerId).emit('game-started', {
        gameState: 'playing',
        roundNum: room.roundNum,
        timerSecs: room.timerSecs,
        startTime: room.startTime,
        playerWords: room.players.map(pid => ({
          playerId: pid,
          word: pid === playerId ? '' : (room.wordAssignments[pid] || ''),
          playerName: room.playerNames[pid]
        }))
      });
    });

    console.log(`🔄 Starting round ${room.roundNum}`);
  });

  // ออกจากห้อง
  socket.on('leave-room', () => {
    const room = rooms[socket.roomId];
    if (room) {
      const wasCreator = socket.id === room.creator;
      if (wasCreator) {
        socket.to(socket.roomId).emit('host-left-room', { message: 'เจ้าของห้องออกจากห้องแล้ว' });
      }
      room.players = room.players.filter(pid => pid !== socket.id);
      delete room.playerNames[socket.id];
      delete room.scores[socket.id];
      if (room.wordAssignments) delete room.wordAssignments[socket.id];
      if (room.playersWhoGuessed) delete room.playersWhoGuessed[socket.id];
      Object.keys(room.guessResults || {}).forEach(key => {
        if (key.startsWith(socket.id + '_') || key.endsWith('_' + socket.id)) delete room.guessResults[key];
      });

      if (room.players.length === 0) {
        delete rooms[socket.roomId];
        console.log(`❌ Room ${socket.roomId} deleted (empty)`);
      } else {
        io.to(socket.roomId).emit('player-left', {
          playerId: socket.id,
          playerName: socket.playerName,
          players: room.players.map(pid => ({
            id: pid,
            name: room.playerNames[pid]
          })),
          scores: room.scores
        });
        console.log(`👋 ${socket.playerName} left room ${socket.roomId}`);
      }
    }
    socket.leave(socket.roomId);
    socket.roomId = null;
    socket.playerName = null;
  });

  // ขาดการเชื่อมต่อ
  socket.on('disconnect', () => {
    const room = rooms[socket.roomId];
    if (room) {
      const wasCreator = socket.id === room.creator;
      if (wasCreator) {
        socket.to(socket.roomId).emit('host-left-room', { message: 'เจ้าของห้องออกจากห้องแล้ว' });
      }
      room.players = room.players.filter(pid => pid !== socket.id);
      delete room.playerNames[socket.id];
      delete room.scores[socket.id];
      if (room.wordAssignments) delete room.wordAssignments[socket.id];
      if (room.playersWhoGuessed) delete room.playersWhoGuessed[socket.id];
      Object.keys(room.guessResults || {}).forEach(key => {
        if (key.startsWith(socket.id + '_') || key.endsWith('_' + socket.id)) delete room.guessResults[key];
      });

      if (room.players.length === 0) {
        delete rooms[socket.roomId];
        console.log(`❌ Room ${socket.roomId} deleted (disconnect)`);
      } else {
        io.to(socket.roomId).emit('player-disconnected', {
          playerId: socket.id,
          players: room.players.map(pid => ({
            id: pid,
            name: room.playerNames[pid]
          })),
          scores: room.scores
        });
      }
    }
    console.log(`🔌 Player disconnected: ${socket.id}`);
  });
});

// ถ้าผู้เล่นมากกว่าจำนวนคำในหมวด จะวนใช้คำซ้ำ (i % shuffled.length)
function assignWordsToPlayers(room) {
  const catWords = CATEGORIES[room.selectedCat] || CATEGORIES['ปาร์ตี้'] || [];
  const shuffled = [...catWords].sort(() => Math.random() - 0.5);

  room.wordAssignments = {};
  room.players.forEach((pid, i) => {
    room.wordAssignments[pid] = shuffled[i % shuffled.length];
  });
}

// ลบห้องที่โฮสต์ออกไปแล้ว (creator ไม่ได้อยู่ใน room.players) — แก้ memory leak
const ROOM_CLEANUP_INTERVAL_MS = 2 * 60 * 1000;
setInterval(() => {
  Object.keys(rooms).forEach(roomId => {
    const room = rooms[roomId];
    if (!room) return;
    if (room.players.length === 0) {
      delete rooms[roomId];
      return;
    }
    if (!room.players.includes(room.creator)) {
      room.players.forEach(pid => io.to(pid).emit('host-left-room', { message: 'ห้องถูกปิด' }));
      delete rooms[roomId];
    }
  });
}, ROOM_CLEANUP_INTERVAL_MS);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
