import { useState } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun, PageBreak, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import axios from "axios";
import { FaUniversity, FaChalkboardTeacher, FaBook, FaCalendarAlt, FaClock, FaStickyNote, FaFilePdf } from "react-icons/fa";

const Spinner = () => (
  <svg className="animate-spin h-4 w-4 text-white inline-block" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-5 border-b pb-3">
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-600 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const PhysicalPaperModal = ({ isOpen, onClose, assessmentId, assessmentTitle }) => {
  const [form, setForm] = useState({
    instituteName: "",
    teacherName: "",
    subjectName: "",
    paperDate: "",
    paperTime: "",
    notes: "",
    pageSize: "A4",
    headerFontSize: 18,
    questionFontSize: 12,
    optionFontSize: 11,
    format: "pdf",
  });

  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const getPageDims = (size) => {
    const dims = { A4: [595.28, 841.89], A5: [420.94, 595.28], Letter: [612, 792] };
    return dims[size] || dims.A4;
  };

  const generatePDF = async () => {
    const pdfDoc = await PDFDocument.create();
    const [w, h] = getPageDims(form.pageSize);
    let page = pdfDoc.addPage([w, h]);

    let font, bold;
    try {
      font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    } catch (err) {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }

    let y = h - 80;
    const margin = 60;
    const lineHeight = 1.5;
    const headerSize = Number(form.headerFontSize) || 18;
    const questionSize = Number(form.questionFontSize) || 12;
    const optionSize = Number(form.optionFontSize) || 11;

    const draw = (txt, size, isBold = false, color = rgb(0, 0, 0), align = "left") => {
      const f = isBold ? bold : font;
      const x = align === "center" ? w / 2 : margin;
      const maxWidth = w - 2 * margin;

      // Split long text into lines
      const words = txt.split(" ");
      let line = "";
      const lines = [];

      words.forEach(word => {
        const testLine = line + word + " ";
        const width = f.widthOfTextAtSize(testLine, size);
        if (width > maxWidth && line) {
          lines.push(line.trim());
          line = word + " ";
        } else {
          line = testLine;
        }
      });
      if (line) lines.push(line.trim());

      lines.forEach(l => {
        if (y < 120) {
          page = pdfDoc.addPage([w, h]);
          y = h - 80;
          drawHeaderBorder();
        }
        page.drawText(l, { x, y, size: Number(size), font: f, color, maxWidth });
        y -= Number(size) * lineHeight;
      });
    };

    const drawHeaderBorder = () => {
      page.drawLine({
        start: { x: margin, y: y + 15 },
        end: { x: w - margin, y: y + 15 },
        thickness: 1.5,
        color: rgb(0, 0, 0),
      });
    };

    // HEADER — NO DURATION/TOTAL
    if (form.instituteName) {
      draw(`University: ${form.instituteName}`, headerSize, true, rgb(0, 0, 0), "center");
      y -= 20;
    }

    const leftX = margin + 20;
    const rightX = w / 2 + 30;
    let tempY = y;

    if (form.teacherName) {
      page.drawText("Teacher:", { x: leftX, y: tempY, size: 12, font: bold });
      page.drawText(form.teacherName, { x: leftX + 55, y: tempY, size: 12, font });
      tempY -= 18;
    }
    if (form.subjectName) {
      page.drawText("Subject:", { x: leftX, y: tempY, size: 12, font: bold });
      page.drawText(form.subjectName, { x: leftX + 55, y: tempY, size: 12, font });
      tempY -= 18;
    }

    tempY = y;
    if (form.paperDate) {
      page.drawText("Date:", { x: rightX, y: tempY, size: 12, font: bold });
      page.drawText(form.paperDate, { x: rightX + 45, y: tempY, size: 12, font });
      tempY -= 18;
    }
    if (form.paperTime) {
      page.drawText("Time:", { x: rightX, y: tempY, size: 12, font: bold });
      page.drawText(form.paperTime, { x: rightX + 45, y: tempY, size: 12, font });
    }

    // NOTES IN HEADER
    if (form.notes.trim()) {
      y -= 20;
      page.drawText("Notes:", { x: margin, y: y, size: 12, font: bold });
      y -= 18;
      const noteLines = form.notes.split("\n").filter(l => l.trim());
      noteLines.forEach(line => {
        draw(line.trim(), 11, false, rgb(0, 0, 0));
      });
    }

    y -= 20;
    drawHeaderBorder();
    y -= 30;

    // QUESTIONS — FIXED: Always print
    if (!questions || questions.length === 0) {
      draw("No questions available.", 12, false, rgb(0.5, 0, 0));
    } else {
      questions.forEach((q, i) => {
        if (y < 200) {
          page = pdfDoc.addPage([w, h]);
          y = h - 80;
          drawHeaderBorder();
          y -= 30;
        }

        draw(`Q${i + 1}. ${q.question_text}`, questionSize, true);
        y -= 10;

        if (q.options && Array.isArray(q.options)) {
          q.options.forEach((opt, oi) => {
            if (y < 80) {
              page = pdfDoc.addPage([w, h]);
              y = h - 80;
              drawHeaderBorder();
              y -= 30;
            }
            draw(`${String.fromCharCode(65 + oi)}. ${opt}`, optionSize);
          });
        }
        y -= 20;
      });
    }

    // ANSWER KEY — NEW PAGE
    page = pdfDoc.addPage([w, h]);
    y = h - 80;
    drawHeaderBorder();
    y -= 30;
    draw("ANSWER KEY", 20, true, rgb(0, 0, 0), "center");
    y -= 25;

    questions.forEach((q, i) => {
      if (y < 80) {
        page = pdfDoc.addPage([w, h]);
        y = h - 80;
        drawHeaderBorder();
        y -= 30;
      }
      const answer = q.correct_answer || "Not specified";
      draw(`Q${i + 1}: ${answer}`, 12, false, rgb(0, 0, 0));
      y -= 12;
    });

    const bytes = await pdfDoc.save();
    return new Blob([bytes], { type: "application/pdf" });
  };

  const generateDOCX = async () => {
    const children = [];
    const headerSize = Number(form.headerFontSize) || 18;
    const questionSize = Number(form.questionFontSize) || 12;
    const optionSize = Number(form.optionFontSize) || 11;

    // HEADER
    if (form.instituteName) {
      children.push(new Paragraph({ 
        children: [new TextRun({ text: `University: ${form.instituteName}`, bold: true, size: headerSize * 2 })], 
        alignment: AlignmentType.CENTER, 
        spacing: { after: 200 } 
      }));
    }

    const leftLines = [];
    if (form.teacherName) leftLines.push(`Teacher: ${form.teacherName}`);
    if (form.subjectName) leftLines.push(`Subject: ${form.subjectName}`);

    const rightLines = [];
    if (form.paperDate) rightLines.push(`Date: ${form.paperDate}`);
    if (form.paperTime) rightLines.push(`Time: ${form.paperTime}`);

    const maxLines = Math.max(leftLines.length, rightLines.length);
    for (let i = 0; i < maxLines; i++) {
      const left = leftLines[i] || "";
      const right = rightLines[i] || "";
      const [lLabel, lValue] = left.split(": ");
      const [rLabel, rValue] = right.split(": ");

      children.push(new Paragraph({
        children: [
          new TextRun({ text: (lLabel ? `${lLabel}: ` : ""), bold: true, size: 24 }),
          new TextRun({ text: (lValue || ""), size: 24 }),
          new TextRun({ text: " ".repeat(40), size: 24 }),
          new TextRun({ text: (rLabel ? `${rLabel}: ` : ""), bold: true, size: 24 }),
          new TextRun({ text: (rValue || ""), size: 24 })
        ]
      }));
    }

    if (form.notes.trim()) {
      children.push(new Paragraph({ children: [new TextRun({ text: "Notes:", bold: true, size: 24 })] }));
      form.notes.split("\n").filter(l => l.trim()).forEach(line => {
        children.push(new Paragraph({ children: [new TextRun({ text: line.trim(), size: 22 })] }));
      });
    }

    children.push(new Paragraph({ 
      children: [new TextRun({ text: "______________________________________________________________", size: 24 })], 
      alignment: AlignmentType.CENTER, 
      spacing: { after: 300 } 
    }));

    // QUESTIONS
    if (!questions || questions.length === 0) {
      children.push(new Paragraph({ children: [new TextRun({ text: "No questions available.", italic: true })] }));
    } else {
      questions.forEach((q, i) => {
        children.push(new Paragraph({ 
          children: [new TextRun({ text: `Q${i + 1}. ${q.question_text}`, bold: true, size: questionSize * 2 })], 
          spacing: { after: 160 } 
        }));

        if (q.options && Array.isArray(q.options)) {
          q.options.forEach((opt, oi) => {
            children.push(new Paragraph({ 
              children: [new TextRun({ text: `${String.fromCharCode(65 + oi)}. ${opt}`, size: optionSize * 2 })], 
              indent: { left: 800 } 
            }));
          });
        }
        children.push(new Paragraph({ children: [new TextRun("")] }));
      });
    }

    // ANSWER KEY
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(new Paragraph({ 
      children: [new TextRun({ text: "______________________________________________________________", size: 24 })], 
      alignment: AlignmentType.CENTER, 
      spacing: { after: 300 } 
    }));
    children.push(new Paragraph({ 
      children: [new TextRun({ text: "ANSWER KEY", bold: true, size: 40 })], 
      alignment: AlignmentType.CENTER, 
      spacing: { after: 400 } 
    }));

    questions.forEach((q, i) => {
      const answer = q.correct_answer || "Not specified";
      children.push(new Paragraph({ 
        children: [new TextRun({ text: `Q${i + 1}: ${answer}`, size: 26 })] 
      }));
    });

    const doc = new Document({ sections: [{ children }], defaultFont: "Times New Roman" });
    return await Packer.toBlob(doc);
  };

  const handleSubmit = async () => {
    if (!assessmentId) return toast.error("No assessment selected");

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

      const { data } = await axios.get(
        `${API_URL}/taking/assessments/${assessmentId}/print`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("API Response:", data); // DEBUG

      const { questions: q } = data;
      if (!q || !Array.isArray(q) || q.length === 0) {
        toast.error("No questions received.");
        setLoading(false);
        return;
      }

      setQuestions(q);

      const blob = form.format === "pdf" ? await generatePDF() : await generateDOCX();
      const ext = form.format === "pdf" ? "pdf" : "docx";
      saveAs(blob, `${assessmentTitle.replace(/\s+/g, "_")}_paper.${ext}`);

      toast.success("Paper generated successfully!");
      onClose();
    } catch (err) {
      console.error("Error:", err);
      toast.error("Failed to generate paper.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Physical Paper">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <FaUniversity className="text-blue-600 text-xl" />
            <input type="text" name="instituteName" placeholder="Institute Name" value={form.instituteName} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <FaChalkboardTeacher className="text-green-600 text-xl" />
            <input type="text" name="teacherName" placeholder="Teacher Name" value={form.teacherName} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <FaBook className="text-purple-600 text-xl" />
            <input type="text" name="subjectName" placeholder="Subject Name" value={form.subjectName} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-orange-600 text-xl" />
            <input type="date" name="paperDate" value={form.paperDate} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <FaClock className="text-red-600 text-xl" />
            <input type="time" name="paperTime" value={form.paperTime} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <FaStickyNote className="text-yellow-600 text-xl" />
            <textarea name="notes" placeholder="Notes (in header)" rows={2} value={form.notes} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Page Size</label>
            <select name="pageSize" value={form.pageSize} onChange={handleChange} className="w-full px-3 py-2 border rounded-md">
              <option value="A4">A4</option>
              <option value="A5">A5</option>
              <option value="Letter">Letter</option>
            </select>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Header Font</label><input type="number" name="headerFontSize" min={14} max={28} value={form.headerFontSize} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Question Font</label><input type="number" name="questionFontSize" min={10} max={18} value={form.questionFontSize} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Option Font</label><input type="number" name="optionFontSize" min={9} max={14} value={form.optionFontSize} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" /></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <FaFilePdf className="text-red-600 text-xl" />
            <select name="format" value={form.format} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button onClick={onClose} disabled={loading} className="px-5 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            {loading ? <><Spinner /> Generating…</> : "Generate & Download"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PhysicalPaperModal;