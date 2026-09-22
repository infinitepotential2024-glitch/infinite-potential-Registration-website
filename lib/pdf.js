export function readFileAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error("Could not read that file"));
    r.readAsDataURL(file);
  });
}

export async function compressImage(file, maxW, maxH, startQ, maxBytes) {
  const url = await readFileAsDataURL(file);
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("That file is not a readable image"));
    i.src = url;
  });
  let w = img.naturalWidth, h = img.naturalHeight;
  const scale = Math.min(1, maxW / w, maxH / h);
  w = Math.max(1, Math.round(w * scale)); h = Math.max(1, Math.round(h * scale));
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
  let q = startQ, out = cv.toDataURL("image/jpeg", q);
  while (out.length > maxBytes && q > 0.35) { q -= 0.1; out = cv.toDataURL("image/jpeg", q); }
  return out;
}

async function toDataURL(url) {
  const r = await fetch(url);
  const b = await r.blob();
  return await new Promise((res) => { const rd = new FileReader(); rd.onload = () => res(rd.result); rd.readAsDataURL(b); });
}

const INSTRUCTIONS = [
  "Carry this admit card to the examination hall on all exam days.",
  "Reach the exam centre at least 30 minutes before reporting time.",
  "Carry only permitted stationery items; electronic devices are strictly prohibited.",
  "Follow the seating arrangement as per the invigilator's instructions.",
  "Misconduct or malpractice will lead to disqualification.",
  "Keep the admit card safe until the completion of all examinations.",
];
const NAVY = [15, 53, 121], YELLOW = [255, 210, 30], ORANGE = [245, 130, 31], INKC = [18, 35, 63], GREY = [120, 134, 158], LINEC = [205, 218, 238];

function dmy(iso) { if (!iso) return "—"; const p = String(iso).split("-"); return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : iso; }

export async function buildAdmitPDF(student, EXAM) {
  const { jsPDF } = await import("jspdf");
  const QRCode = (await import("qrcode")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const W = 210, M = 12, IW = W - 2 * M;
  const logo = await toDataURL("/logo.png").catch(() => null);
  const photo = student.photo_url ? await toDataURL(student.photo_url).catch(() => null) : null;

  doc.setDrawColor(...LINEC); doc.setLineWidth(0.6);
  doc.roundedRect(M - 2, M - 2, IW + 4, 273, 4, 4);

  doc.setFillColor(...NAVY); doc.rect(M, M, IW, 26, "F");
  doc.setFillColor(255, 255, 255); doc.roundedRect(M + 3, M + 3, 22, 20, 2, 2, "F");
  if (logo) { try { doc.addImage(logo, "PNG", M + 4.5, M + 4.5, 19, 17); } catch (e) {} }
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(19);
  doc.text("INFINITE POTENTIAL", W / 2 + 8, M + 11, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  doc.text("An Ideal Science Coaching Centre", W / 2 + 8, M + 17, { align: "center" });
  doc.setFontSize(8); doc.text("Contact: " + EXAM.phone, W / 2 + 8, M + 22.5, { align: "center" });

  doc.setFillColor(...YELLOW); doc.rect(M, M + 26, IW, 12, "F");
  doc.setTextColor(...NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text("MADHYAMIK 2027  |  MOCK TEST ADMIT CARD", W / 2, M + 34.2, { align: "center" });

  let y = M + 46;
  const px = W - M - 38, py = y;
  doc.setDrawColor(...LINEC); doc.setLineWidth(0.4); doc.rect(px, py, 34, 43);
  if (photo) { try { doc.addImage(photo, "JPEG", px + 0.6, py + 0.6, 32.8, 41.8); } catch (e) {} }
  else { doc.setFontSize(8); doc.setTextColor(...GREY); doc.text("Photo", px + 17, py + 22, { align: "center" }); }
  doc.setFontSize(7.5); doc.setTextColor(...GREY); doc.text("Candidate photograph", px + 17, py + 47, { align: "center" });

  doc.setFillColor(236, 243, 255); doc.roundedRect(M, y, IW - 42, 16, 2, 2, "F");
  doc.setTextColor(...GREY); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text("ROLL NUMBER", M + 5, y + 5.5); doc.text("REGISTRATION NUMBER", M + 58, y + 5.5);
  doc.setTextColor(...NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text(String(student.roll_no || "—"), M + 5, y + 12.5);
  doc.text(String(student.reg_no), M + 58, y + 12.5);

  y += 22;
  const rows = [
    ["Name of the candidate", student.name], ["Date of birth", dmy(student.dob)],
    ["Father's name", student.father], ["Mother's name", student.mother],
    ["Contact number", student.contact], ["Email ID", student.email],
  ];
  doc.setFontSize(9.5);
  rows.forEach((r) => {
    doc.setFont("helvetica", "normal"); doc.setTextColor(...GREY); doc.text(r[0], M + 3, y);
    doc.setFont("helvetica", "bold"); doc.setTextColor(...INKC);
    doc.text(String(r[1] || "—"), M + 45, y, { maxWidth: IW - 90 });
    y += 7.2;
  });
  doc.setFont("helvetica", "normal"); doc.setTextColor(...GREY); doc.text("Address", M + 3, y);
  doc.setFont("helvetica", "bold"); doc.setTextColor(...INKC);
  const addr = doc.splitTextToSize(String(student.address || "—"), IW - 90);
  doc.text(addr, M + 45, y); y += Math.max(7.2, addr.length * 5);

  y = Math.max(y + 4, py + 52);
  doc.setFillColor(255, 244, 222); doc.roundedRect(M, y, IW, 32, 3, 3, "F");
  doc.setTextColor(...ORANGE); doc.setFont("helvetica", "bold"); doc.setFontSize(10.5);
  doc.text("EXAMINATION DETAILS", M + 5, y + 7);
  doc.setFontSize(9.5); doc.setTextColor(...GREY); doc.setFont("helvetica", "normal");
  doc.text("Examination", M + 5, y + 14); doc.text("Exam date", M + 5, y + 20.5); doc.text("Test centre", M + 5, y + 27);
  doc.setFont("helvetica", "bold"); doc.setTextColor(...INKC);
  doc.text(EXAM.name, M + 38, y + 14);
  doc.text(EXAM.date + "  (Mock Test 1 & Mock Test 2)", M + 38, y + 20.5);
  doc.text(doc.splitTextToSize(EXAM.centre, 92), M + 38, y + 27);

  try {
    const vid = `${student.reg_no}|${student.roll_no || ""}|${student.contact}`;
    const qr = await QRCode.toDataURL("IP-MOCK-2027 " + vid, { margin: 0, width: 300 });
    doc.addImage(qr, "PNG", W - M - 30, y + 3, 26, 26);
  } catch (e) {}
  doc.setFontSize(6.5); doc.setTextColor(...GREY);
  doc.text("Verification ID", W - M - 17, y + 31.5, { align: "center" });

  y += 39;
  doc.setTextColor(...NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("Instructions for Students", M + 3, y); y += 6;
  doc.setFont("helvetica", "normal"); doc.setTextColor(...INKC); doc.setFontSize(9.2);
  INSTRUCTIONS.forEach((t, i) => {
    const lines = doc.splitTextToSize(`${i + 1}. ${t}`, IW - 8);
    doc.text(lines, M + 3, y); y += lines.length * 5 + 1.4;
  });

  y = Math.max(y + 8, 252);
  doc.setDrawColor(...LINEC); doc.setLineWidth(0.4);
  doc.line(M + 6, y, M + 56, y); doc.line(W - M - 56, y, W - M - 6, y);
  doc.setFontSize(8.2); doc.setTextColor(...GREY);
  doc.text("Signature of the candidate", M + 31, y + 4.5, { align: "center" });
  doc.text("Signature of the authority", W - M - 31, y + 4.5, { align: "center" });

  doc.setFillColor(...NAVY); doc.rect(M, 271, IW, 14, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8.6);
  doc.text("Organizer: " + EXAM.org, W / 2, 277, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.2);
  doc.text(`Contact: ${EXAM.phone}   |   ${EXAM.centre}`, W / 2, 282, { align: "center" });

  return doc;
}

export async function buildReceiptPDF(student, EXAM) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const W = 210, M = 14, IW = W - 2 * M;
  const logo = await toDataURL("/logo.png").catch(() => null);

  doc.setFillColor(...NAVY); doc.rect(0, 0, W, 30, "F");
  doc.setFillColor(255, 255, 255); doc.roundedRect(M, 5, 20, 20, 2, 2, "F");
  if (logo) { try { doc.addImage(logo, "PNG", M + 1.5, 6.5, 17, 17); } catch (e) {} }
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text("INFINITE POTENTIAL", M + 26, 14);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  doc.text(`An Ideal Science Coaching Centre  ·  ${EXAM.phone}`, M + 26, 20);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text("REGISTRATION RECEIPT", W - M, 14, { align: "right" });

  let y = 46;
  doc.setTextColor(...INKC); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text(EXAM.name, M, y); y += 10;
  const rows = [
    ["Registration number", student.reg_no], ["Roll number", student.roll_no || "—"],
    ["Candidate name", student.name], ["Date of birth", dmy(student.dob)],
    ["Contact number", student.contact], ["Email ID", student.email],
    ["Exam date", EXAM.date], ["Test centre", EXAM.centre],
  ];
  doc.setFontSize(10);
  rows.forEach((r) => {
    doc.setFont("helvetica", "normal"); doc.setTextColor(...GREY); doc.text(r[0], M, y);
    doc.setFont("helvetica", "bold"); doc.setTextColor(...INKC);
    const lines = doc.splitTextToSize(String(r[1] || "—"), IW - 52);
    doc.text(lines, M + 52, y); y += lines.length * 5.2 + 2.6;
  });
  y += 4;
  doc.setFillColor(236, 243, 255); doc.roundedRect(M, y, IW, 22, 3, 3, "F");
  doc.setTextColor(...GREY); doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  doc.text("Amount paid", M + 6, y + 9); doc.text("Payment status", M + 6, y + 17);
  doc.setFont("helvetica", "bold"); doc.setTextColor(...INKC); doc.setFontSize(11);
  doc.text("Rs. " + EXAM.fee + ".00", M + 58, y + 9);
  doc.setFontSize(10); doc.text(student.payment_status, M + 58, y + 17);

  doc.setFont("helvetica", "normal"); doc.setTextColor(...GREY); doc.setFontSize(8.6);
  doc.text(`Organizer: ${EXAM.org}   |   Contact: ${EXAM.phone}`, M, 285);
  return doc;
}

export function downloadPdf(doc, filename) {
  doc.save(filename);
}
