# 🚀 คู่มือการ Deploy "Crowd Tug-of-War" ขึ้น Render.com (ฟรี & รองรับ WebSocket)

โปรเจกต์นี้ได้รับการตั้งค่าเป็น **All-in-One Full-Stack Service** เรียบร้อยแล้ว (Node.js Server จะทำหน้าที่ให้บริการทั้ง WebSocket และไฟล์หน้าเว็บ React ในพอร์ตเดียวกัน) ทำให้สามารถ Deploy บน **Render.com** ได้ง่ายมากในบริการเดียว (Single Web Service) โดยไม่ต้องแยกเซิร์ฟเวอร์หน้า-หลัง!

---

## 📋 ขั้นตอนการ Deploy (Step-by-Step)

### ขั้นตอนที่ 1: อัปโหลดโค้ดขึ้น GitHub
1. สร้าง Repository ใหม่บน GitHub ของคุณ (เช่น ชื่อ `crowd-tug-of-war`)
2. เปิด Terminal ในโฟลเดอร์โปรเจกต์นี้ แล้วรันคำสั่ง:
   ```bash
   git add .
   git commit -m "Ready for Render deployment"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
   git push -u origin main
   ```

---

### ขั้นตอนที่ 2: สร้าง Web Service บน Render.com
1. เข้าสู่ระบบที่ [https://render.com/](https://render.com/)
2. คลิกปุ่ม **"New +"** (มุมขวาบน) แล้วเลือก **"Web Service"**
3. เลือก **"Build and deploy from a Git repository"** แล้วกด **Next**
4. เชื่อมต่อบัญชี GitHub และเลือก Repository ที่คุณเพิ่ง Push ขึ้นไป

---

### ขั้นตอนที่ 3: ตั้งค่าการ Deploy (Configuration Settings)
กรอกข้อมูลในหน้า Create Web Service ดังนี้:

| ช่องการตั้งค่า | ค่าที่ต้องกรอก / เลือก | คำอธิบาย |
|---|---|---|
| **Name** | `crowd-tug-of-war` (หรือชื่อตามต้องการ) | ชื่อแอปของคุณบน Render |
| **Region** | `Singapore` (ใกล้ไทยที่สุด เพื่อ Ping ต่ำ) | เลือกสิงคโปร์เพื่อความหน่วงน้อยที่สุด |
| **Branch** | `main` | สาขาหลักของโค้ด |
| **Root Directory** | *(ปล่อยว่างไว้)* | รันจาก Root ของโปรเจกต์ |
| **Runtime** | `Node` | รันด้วย Node.js |
| **Build Command** | `npm run render-build` | คำสั่งติดตั้งและ Build React อัตโนมัติ |
| **Start Command** | `npm start` | รันเซิร์ฟเวอร์ Node.js |
| **Instance Type** | `Free` | ใช้งานฟรี 100% |

---

### ขั้นตอนที่ 4: เริ่มการ Deploy
1. เลื่อนลงมาด้านล่างสุด แล้วกดปุ่ม **"Create Web Service"**
2. Render จะเริ่มรันคำสั่ง Build:
   - ติดตั้ง Dependencies ของทั้ง Client และ Server
   - คอมไพล์ React Production Bundle ด้วย Vite
   - เริ่มต้นระบบ Authoritative Socket.io Server
3. เมื่อขึ้นสถานะ **"Live"** (สีเขียว) คุณจะได้ URL เว็บไซต์ เช่น:
   `https://crowd-tug-of-war.onrender.com`
4. สามารถแชร์ลิงก์นี้ หรือสร้าง QR Code ให้เพื่อนทุกคนคลิกเข้าเล่นพร้อมกันได้ทันทีจากทุกที่ในโลก!

---

## ⚡ เทคนิคที่ปรับปรุงเพื่อความหน่วงต่ำที่สุด (Ultra-Low Latency):
1. **Volatile WebSockets**: แพ็กเก็ตฟิสิกส์ 20Hz ส่งแบบ Volatile ไม่ทำให้คิวข้อมูลสะสมเมื่อเน็ตกระตุก
2. **Per-Message Deflate Disabled**: ปิดการบีบอัดข้อมูลชิ้นเล็ก ลดภาระ CPU และส่งข้อมูลได้ไวที่สุดแบบ Real-time
3. **Client-Side Lerp Interpolation**: แคนวาสสนามแข่งคำนวณการเคลื่อนที่เชือกแบบ 60fps/120fps ลื่นไหลไร้อาการกระตุก
4. **Weighted Score Average**: คำนวณแต้มเฉลี่ยตามจำนวนคน ทำให้เกมมีความยุติธรรม 100% เสมอ
