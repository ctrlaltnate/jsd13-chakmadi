# 🚀 คู่มือ Deploy แยก Frontend (Vercel) + Backend (Render)

วิธีนี้เป็นมาตรฐานที่ดีที่สุด:
- **Frontend บน Vercel**: โหลดหน้าเว็บเร็วระดับ CDN ทั่วโลก, ฟรี, ไม่มีวันหลับ (Always Awake)
- **Backend บน Render**: รัน Node.js + WebSocket Socket.io รองรับการกดดึงเชือกแบบ Real-time

---

## 📌 ขั้นตอนที่ 1: Deploy Backend ขึ้น Render ก่อน (เพื่อให้ได้ URL เซิร์ฟเวอร์)

1. เข้าไปที่ [https://render.com/](https://render.com/)
2. กดปุ่ม **"New +"** $\rightarrow$ เลือก **"Web Service"**
3. เลือกเชื่อมต่อกับ Repository GitHub ของคุณ
4. ตั้งค่าตามนี้:
   - **Name**: `tug-of-war-backend` (หรือชื่อตามชอบ)
   - **Region**: **`Singapore`** (ใกล้ไทยที่สุด เพื่อให้ Real-time ไม่ดีเลย์)
   - **Branch**: `main`
   - **Root Directory**: *(ปล่อยว่างไว้)*
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm run render-build
     ```
   - **Start Command**:
     ```bash
     node server/index.js
     ```
   - **Instance Type**: `Free`
5. กดปุ่ม **"Create Web Service"**
6. รอจนขึ้นสถานะสีเขียว **"Live"** แล้ว **ก๊อปปี้ URL ของ Render เก็บไว้** 
   - เช่น: `https://tug-of-war-backend.onrender.com`

---

## 📌 ขั้นตอนที่ 2: Deploy Frontend ขึ้น Vercel

1. เข้าไปที่ [https://vercel.com/](https://vercel.com/) และเข้าสู่ระบบ
2. กดปุ่ม **"Add New..."** $\rightarrow$ เลือก **"Project"**
3. เลือก Import Repository เดียวกันนี้จาก GitHub
4. ในหน้าตั้งค่าโปรเจกต์ (Configure Project):
   - **Framework Preset**: เลือก **`Vite`**
   - **Root Directory**: คลิก Edit แล้วเลือกโฟลเดอร์ **`client`** (หรือพิมพ์ `client`)
5. **สำคัญที่สุด!** เลื่อนลงมาที่หัวข้อ **"Environment Variables"**:
   - **Key (ชื่อตัวแปร)**:
     ```text
     VITE_SERVER_URL
     ```
   - **Value (ค่า)**: ใส่ URL ของ Render ที่ได้จากขั้นตอนที่ 1 (เช่น `https://tug-of-war-backend.onrender.com`)
   - กดปุ่ม **"Add"**
6. กดปุ่ม **"Deploy"**
7. รอประมาณ 30-45 วินาที คุณจะได้ลิงก์หน้าเว็บ Vercel เช่น:
   `https://crowd-tug-of-war.vercel.app`

---

## 🎮 เสร็จสมบูรณ์!
ผู้เล่นทุกคนจะเข้าใช้งานผ่านลิงก์ของ Vercel และเชื่อมต่อส่งข้อมูลสดผ่าน WebSocket ไปยัง Render ทันที!
