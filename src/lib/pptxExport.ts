import pptxgen from 'pptxgenjs';

export interface SlideKPIData {
  title: string;
  comparisonTitle: string;
  outletName: string;
  periodA: {
    label: string;
    subLabel: string;
    sph: number;
    gbo: number;
    dayaSerap: number;
    at: number;
    fnb: number;
    cinema: number;
    penonton: number;
    bill: number;
    achievement: number;
  };
  periodB: {
    label: string;
    subLabel: string;
    sph: number;
    gbo: number;
    dayaSerap: number;
    at: number;
    fnb: number;
    cinema: number;
    penonton: number;
    bill: number;
    achievement: number;
  };
  targetSph: number;
  rankingData: Array<{
    rank: number;
    name: number | string;
    areaName?: string;
    penonton: number;
    targetSph: number;
    sph: number;
    ach: number;
    gbo: number;
    dayaSerap: number;
    at: number;
  }>;
  selectedRankingIndicator: string;
  trendData: Array<{
    label: string;
    sphA: number;
    sphB: number;
    gboA: number;
    gboB: number;
    dsA: number;
    dsB: number;
    atA: number;
    atB: number;
  }>;
}

export const exportKPIToPPTX = async (data: SlideKPIData) => {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'Cinema XXI Management';
  pptx.company = 'Cinema XXI';
  pptx.title = `Laporan KPI Executive - ${data.comparisonTitle}`;

  const C_DARK = '0F172A';
  const C_GOLD = 'D97706';
  const C_GOLD_BG = 'FEF3C7';
  const C_BG = 'F8FAFC';
  const C_CARD = 'FFFFFF';
  const C_TEXT = '1E293B';
  const C_MUTED = '64748B';
  const C_BORDER = 'E2E8F0';
  const C_PURPLE = '7C3AED';
  const C_GREEN = '059669';
  const C_CYAN = '0284C7';
  const C_BLUE = '2563EB';

  const addHeader = (slide: pptxgen.Slide, slideNum: number, totalSlides: number, slideTitle: string) => {
    // Top banner
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.9,
      fill: { color: C_DARK },
    });

    // Brand label
    slide.addText('CINEMA XXI • KPI EXECUTIVE DECK', {
      x: 0.8,
      y: 0.15,
      w: 6.0,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: C_GOLD,
    });

    // Title
    slide.addText(slideTitle, {
      x: 0.8,
      y: 0.42,
      w: 8.5,
      h: 0.38,
      fontSize: 14,
      bold: true,
      color: 'FFFFFF',
    });

    // Filter info on right
    slide.addText(`${data.outletName}  |  ${data.comparisonTitle}  |  Slide ${slideNum}/${totalSlides}`, {
      x: 7.5,
      y: 0.28,
      w: 5.0,
      h: 0.35,
      fontSize: 10,
      color: '94A3B8',
      align: 'right',
    });

    // Background base
    slide.background = { color: C_BG };
  };

  const calcGrowthStr = (valA: number, valB: number) => {
    if (valA === 0) return valB > 0 ? '+100%' : '0%';
    const diff = ((valB - valA) / valA) * 100;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}%`;
  };

  // ==========================================
  // SLIDE 1: Ringkasan Eksekutif & 5 Indikator KPI
  // ==========================================
  {
    const slide = pptx.addSlide();
    addHeader(slide, 1, 7, 'Slide 1: Ringkasan Eksekutif & 5 Indikator KPI');

    // Subtitle
    slide.addText(`Evaluasi perbandingan pertumbuhan kinerja 5 indikator bisnis utama Cinema XXI`, {
      x: 0.8,
      y: 1.05,
      w: 11.7,
      h: 0.35,
      fontSize: 11,
      color: C_MUTED,
    });

    // 5 KPI Cards
    const kpiCards = [
      {
        title: '1. Penonton (Pax)',
        valB: `${data.periodB.penonton.toLocaleString('id-ID')} Pax`,
        valA: `${data.periodA.penonton.toLocaleString('id-ID')} Pax`,
        growth: calcGrowthStr(data.periodA.penonton, data.periodB.penonton),
        target: `Total Tiket Penonton Bioskop`,
        color: C_BLUE,
        sub: 'Penonton Tiket Cinema',
      },
      {
        title: '2. SPH (Head)',
        valB: `Rp ${data.periodB.sph.toLocaleString('id-ID')}`,
        valA: `Rp ${data.periodA.sph.toLocaleString('id-ID')}`,
        growth: calcGrowthStr(data.periodA.sph, data.periodB.sph),
        target: `Target Head: Rp ${data.targetSph.toLocaleString('id-ID')} (${data.periodB.achievement}%)`,
        color: C_GOLD,
        sub: 'Omset F&B / Penonton',
      },
      {
        title: '3. % GBO',
        valB: `${data.periodB.gbo}%`,
        valA: `${data.periodA.gbo}%`,
        growth: calcGrowthStr(data.periodA.gbo, data.periodB.gbo),
        target: `Rasio: Omset F&B / Tiket Cinema`,
        color: C_PURPLE,
        sub: 'Kontribusi F&B thdp Cinema',
      },
      {
        title: '4. Daya Serap',
        valB: `${data.periodB.dayaSerap}%`,
        valA: `${data.periodA.dayaSerap}%`,
        growth: calcGrowthStr(data.periodA.dayaSerap, data.periodB.dayaSerap),
        target: `Total Struk: ${data.periodB.bill.toLocaleString('id-ID')}`,
        color: C_GREEN,
        sub: 'Bill Kasir / Penonton',
      },
      {
        title: '5. Average Transaksi',
        valB: `Rp ${data.periodB.at.toLocaleString('id-ID')}`,
        valA: `Rp ${data.periodA.at.toLocaleString('id-ID')}`,
        growth: calcGrowthStr(data.periodA.at, data.periodB.at),
        target: `Omset F&B: Rp ${(data.periodB.fnb / 1000000).toFixed(1)} Jt`,
        color: C_CYAN,
        sub: 'Omset F&B / Bill Struk',
      },
    ];

    const cardW = 2.18;
    const cardGap = 0.2;
    const startX = 0.8;

    kpiCards.forEach((kpi, i) => {
      const cx = startX + i * (cardW + cardGap);
      slide.addShape(pptx.ShapeType.roundRect, {
        x: cx,
        y: 1.45,
        w: cardW,
        h: 2.2,
        rectRadius: 0.1,
        fill: { color: C_CARD },
        line: { color: C_BORDER, width: 1 },
      });

      slide.addText(kpi.title, {
        x: cx + 0.12,
        y: 1.55,
        w: cardW - 0.24,
        h: 0.25,
        fontSize: 9.5,
        bold: true,
        color: kpi.color,
      });

      slide.addText(kpi.valB, {
        x: cx + 0.12,
        y: 1.82,
        w: cardW - 0.24,
        h: 0.45,
        fontSize: 14,
        bold: true,
        color: C_TEXT,
      });

      slide.addText(`${data.periodA.label}: ${kpi.valA}  |  Growth: ${kpi.growth}`, {
        x: cx + 0.12,
        y: 2.3,
        w: cardW - 0.24,
        h: 0.3,
        fontSize: 8.5,
        color: C_MUTED,
      });

      slide.addText(kpi.target, {
        x: cx + 0.12,
        y: 2.65,
        w: cardW - 0.24,
        h: 0.3,
        fontSize: 8,
        bold: true,
        color: C_TEXT,
      });

      slide.addText(kpi.sub, {
        x: cx + 0.12,
        y: 3.0,
        w: cardW - 0.24,
        h: 0.3,
        fontSize: 7.5,
        color: C_MUTED,
      });
    });

    // Summary Table
    const tableData: pptxgen.TableRow[] = [
      [
        { text: 'Indikator Bisnis KPI', options: { bold: true, fill: { color: 'F1F5F9' }, color: C_TEXT, fontSize: 10 } },
        { text: data.periodA.label, options: { bold: true, fill: { color: 'F1F5F9' }, align: 'right', fontSize: 10 } },
        { text: data.periodB.label, options: { bold: true, fill: { color: 'F1F5F9' }, align: 'right', fontSize: 10 } },
        { text: 'Selisih (Delta)', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'right', fontSize: 10 } },
        { text: 'Growth (%)', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'center', fontSize: 10 } },
      ],
      [
        { text: 'Penonton (Pax Tiket)', options: { bold: true, color: C_BLUE, fontSize: 9.5 } },
        { text: `${data.periodA.penonton.toLocaleString('id-ID')} Pax`, options: { align: 'right', fontSize: 9.5 } },
        { text: `${data.periodB.penonton.toLocaleString('id-ID')} Pax`, options: { align: 'right', bold: true, fontSize: 9.5 } },
        { text: `${(data.periodB.penonton - data.periodA.penonton).toLocaleString('id-ID')} Pax`, options: { align: 'right', fontSize: 9.5 } },
        { text: calcGrowthStr(data.periodA.penonton, data.periodB.penonton), options: { align: 'center', bold: true, color: C_GREEN, fontSize: 9.5 } },
      ],
      [
        { text: 'Spending Per Head (SPH)', options: { bold: true, color: C_GOLD, fontSize: 9.5 } },
        { text: `Rp ${data.periodA.sph.toLocaleString('id-ID')}`, options: { align: 'right', fontSize: 9.5 } },
        { text: `Rp ${data.periodB.sph.toLocaleString('id-ID')}`, options: { align: 'right', bold: true, fontSize: 9.5 } },
        { text: `Rp ${(data.periodB.sph - data.periodA.sph).toLocaleString('id-ID')}`, options: { align: 'right', fontSize: 9.5 } },
        { text: calcGrowthStr(data.periodA.sph, data.periodB.sph), options: { align: 'center', bold: true, color: C_GREEN, fontSize: 9.5 } },
      ],
      [
        { text: 'Rasio % GBO (FnB vs Cinema)', options: { bold: true, color: C_PURPLE, fontSize: 9.5 } },
        { text: `${data.periodA.gbo}%`, options: { align: 'right', fontSize: 9.5 } },
        { text: `${data.periodB.gbo}%`, options: { align: 'right', bold: true, fontSize: 9.5 } },
        { text: `${(data.periodB.gbo - data.periodA.gbo).toFixed(1)}%`, options: { align: 'right', fontSize: 9.5 } },
        { text: calcGrowthStr(data.periodA.gbo, data.periodB.gbo), options: { align: 'center', bold: true, color: C_GREEN, fontSize: 9.5 } },
      ],
      [
        { text: 'Daya Serap (Bill / Penonton)', options: { bold: true, color: C_GREEN, fontSize: 9.5 } },
        { text: `${data.periodA.dayaSerap}%`, options: { align: 'right', fontSize: 9.5 } },
        { text: `${data.periodB.dayaSerap}%`, options: { align: 'right', bold: true, fontSize: 9.5 } },
        { text: `${(data.periodB.dayaSerap - data.periodA.dayaSerap).toFixed(1)}%`, options: { align: 'right', fontSize: 9.5 } },
        { text: calcGrowthStr(data.periodA.dayaSerap, data.periodB.dayaSerap), options: { align: 'center', bold: true, color: C_GREEN, fontSize: 9.5 } },
      ],
      [
        { text: 'Average Transaksi (AT)', options: { bold: true, color: C_CYAN, fontSize: 9.5 } },
        { text: `Rp ${data.periodA.at.toLocaleString('id-ID')}`, options: { align: 'right', fontSize: 9.5 } },
        { text: `Rp ${data.periodB.at.toLocaleString('id-ID')}`, options: { align: 'right', bold: true, fontSize: 9.5 } },
        { text: `Rp ${(data.periodB.at - data.periodA.at).toLocaleString('id-ID')}`, options: { align: 'right', fontSize: 9.5 } },
        { text: calcGrowthStr(data.periodA.at, data.periodB.at), options: { align: 'center', bold: true, color: C_GREEN, fontSize: 9.5 } },
      ],
    ];

    slide.addTable(tableData, {
      x: 0.8,
      y: 3.85,
      w: 11.7,
      h: 2.2,
      border: { color: C_BORDER, pt: 1 },
      rowH: 0.42,
    });

    slide.addText(`Catatan: Data diolah otomatis dari KPI Summary penjualan harian Cinema XXI.`, {
      x: 0.8,
      y: 6.7,
      w: 11.7,
      h: 0.3,
      fontSize: 8.5,
      italic: true,
      color: C_MUTED,
    });
  }

  // ==========================================
  // SLIDE 2: Analisis SPH & Target Line
  // ==========================================
  {
    const slide = pptx.addSlide();
    addHeader(slide, 2, 7, 'Slide 2: Analisis SPH (Spending Per Head) vs Target');

    slide.addText(`SPH mengukur rata-rata pengeluaran F&B dari setiap 1 penonton bioskop (Omset F&B / Penonton). Target: Rp ${data.targetSph.toLocaleString('id-ID')}`, {
      x: 0.8,
      y: 1.05,
      w: 11.7,
      h: 0.35,
      fontSize: 11,
      color: C_MUTED,
    });

    // Left Summary Box
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: 1.5,
      w: 3.5,
      h: 4.8,
      rectRadius: 0.1,
      fill: { color: C_CARD },
      line: { color: C_GOLD, width: 1.5 },
    });

    slide.addText('RINGKASAN SPH', {
      x: 1.0,
      y: 1.7,
      w: 3.1,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: C_GOLD,
    });

    slide.addText(`Rp ${data.periodB.sph.toLocaleString('id-ID')}`, {
      x: 1.0,
      y: 2.1,
      w: 3.1,
      h: 0.6,
      fontSize: 22,
      bold: true,
      color: C_TEXT,
    });

    slide.addText(`${data.periodB.label} (Current)`, {
      x: 1.0,
      y: 2.7,
      w: 3.1,
      h: 0.3,
      fontSize: 9.5,
      color: C_MUTED,
    });

    slide.addText(`Vs ${data.periodA.label}: Rp ${data.periodA.sph.toLocaleString('id-ID')}`, {
      x: 1.0,
      y: 3.1,
      w: 3.1,
      h: 0.3,
      fontSize: 10,
      color: C_TEXT,
    });

    slide.addText(`Pertumbuhan: ${calcGrowthStr(data.periodA.sph, data.periodB.sph)}`, {
      x: 1.0,
      y: 3.45,
      w: 3.1,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: C_GREEN,
    });

    slide.addText(`Target SPH: Rp ${data.targetSph.toLocaleString('id-ID')}`, {
      x: 1.0,
      y: 3.9,
      w: 3.1,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: C_GOLD,
    });

    slide.addText(`Achievement Target: ${data.periodB.achievement}%`, {
      x: 1.0,
      y: 4.25,
      w: 3.1,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: data.periodB.achievement >= 100 ? C_GREEN : 'DC2626',
    });

    slide.addText(`Status: ${data.periodB.achievement >= 100 ? 'TERCAPAI' : 'BELUM TERCAPAI'}`, {
      x: 1.0,
      y: 4.6,
      w: 3.1,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: data.periodB.achievement >= 100 ? C_GREEN : 'DC2626',
    });

    // Right Chart Area: PPTX Bar Chart
    if (data.trendData.length > 0) {
      const labels = data.trendData.map((t) => t.label);
      const valuesA = data.trendData.map((t) => t.sphA);
      const valuesB = data.trendData.map((t) => t.sphB);

      const chartData = [
        { name: data.periodA.label, labels, values: valuesA },
        { name: data.periodB.label, labels, values: valuesB },
      ];

      slide.addChart(pptx.ChartType.bar, chartData, {
        x: 4.6,
        y: 1.5,
        w: 7.9,
        h: 4.2,
        barGrouping: 'clustered',
        chartColors: ['CBD5E1', C_GOLD],
        showLegend: true,
        legendPos: 't',
        showValue: true,
        fontSize: 8,
      });

      slide.addText(`*Garis Target SPH referensi: Rp ${data.targetSph.toLocaleString('id-ID')} | Nilai angka di atas bar menunjukkan pencapaian dan growth periodik.`, {
        x: 4.6,
        y: 5.85,
        w: 7.9,
        h: 0.4,
        fontSize: 8.5,
        italic: true,
        color: C_MUTED,
      });
    }
  }

  // ==========================================
  // SLIDE 3: Analisis GBO (%)
  // ==========================================
  {
    const slide = pptx.addSlide();
    addHeader(slide, 3, 7, 'Slide 3: Analisis GBO (%) Rasio Omset F&B vs Cinema');

    slide.addText(`GBO mengukur persentase nilai penjualan F&B dibandingkan pendapatan tiket bioskop (Omset F&B / Cinema * 100%).`, {
      x: 0.8,
      y: 1.05,
      w: 11.7,
      h: 0.35,
      fontSize: 11,
      color: C_MUTED,
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: 1.5,
      w: 3.5,
      h: 4.8,
      rectRadius: 0.1,
      fill: { color: C_CARD },
      line: { color: C_PURPLE, width: 1.5 },
    });

    slide.addText('RASIO % GBO', {
      x: 1.0,
      y: 1.7,
      w: 3.1,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: C_PURPLE,
    });

    slide.addText(`${data.periodB.gbo}%`, {
      x: 1.0,
      y: 2.1,
      w: 3.1,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: C_TEXT,
    });

    slide.addText(`${data.periodB.label} (Current)`, {
      x: 1.0,
      y: 2.7,
      w: 3.1,
      h: 0.3,
      fontSize: 9.5,
      color: C_MUTED,
    });

    slide.addText(`Vs ${data.periodA.label}: ${data.periodA.gbo}%`, {
      x: 1.0,
      y: 3.1,
      w: 3.1,
      h: 0.3,
      fontSize: 10,
      color: C_TEXT,
    });

    slide.addText(`Pertumbuhan: ${calcGrowthStr(data.periodA.gbo, data.periodB.gbo)}`, {
      x: 1.0,
      y: 3.45,
      w: 3.1,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: C_GREEN,
    });

    slide.addText(`F&B: Rp ${(data.periodB.fnb / 1000000).toFixed(1)} Jt`, {
      x: 1.0,
      y: 3.9,
      w: 3.1,
      h: 0.3,
      fontSize: 9.5,
      color: C_TEXT,
    });

    slide.addText(`Cinema: Rp ${(data.periodB.cinema / 1000000).toFixed(1)} Jt`, {
      x: 1.0,
      y: 4.25,
      w: 3.1,
      h: 0.3,
      fontSize: 9.5,
      color: C_TEXT,
    });

    if (data.trendData.length > 0) {
      const labels = data.trendData.map((t) => t.label);
      const valuesA = data.trendData.map((t) => t.gboA);
      const valuesB = data.trendData.map((t) => t.gboB);

      const chartData = [
        { name: data.periodA.label, labels, values: valuesA },
        { name: data.periodB.label, labels, values: valuesB },
      ];

      slide.addChart(pptx.ChartType.bar, chartData, {
        x: 4.6,
        y: 1.5,
        w: 7.9,
        h: 4.4,
        barGrouping: 'clustered',
        chartColors: ['CBD5E1', C_PURPLE],
        showLegend: true,
        legendPos: 't',
        showValue: true,
        fontSize: 8,
      });
    }
  }

  // ==========================================
  // SLIDE 4: Analisis Daya Serap (%)
  // ==========================================
  {
    const slide = pptx.addSlide();
    addHeader(slide, 4, 7, 'Slide 4: Analisis Daya Serap (%) Penetrasi Struk Kasir');

    slide.addText(`Daya Serap mengukur rasio penonton yang bertransaksi di Cafe XXI (Bill Struk / Penonton * 100%). Target ideal: >= 25%.`, {
      x: 0.8,
      y: 1.05,
      w: 11.7,
      h: 0.35,
      fontSize: 11,
      color: C_MUTED,
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: 1.5,
      w: 3.5,
      h: 4.8,
      rectRadius: 0.1,
      fill: { color: C_CARD },
      line: { color: C_GREEN, width: 1.5 },
    });

    slide.addText('PENETRASI DAYA SERAP', {
      x: 1.0,
      y: 1.7,
      w: 3.1,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: C_GREEN,
    });

    slide.addText(`${data.periodB.dayaSerap}%`, {
      x: 1.0,
      y: 2.1,
      w: 3.1,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: C_TEXT,
    });

    slide.addText(`${data.periodB.label} (Current)`, {
      x: 1.0,
      y: 2.7,
      w: 3.1,
      h: 0.3,
      fontSize: 9.5,
      color: C_MUTED,
    });

    slide.addText(`Vs ${data.periodA.label}: ${data.periodA.dayaSerap}%`, {
      x: 1.0,
      y: 3.1,
      w: 3.1,
      h: 0.3,
      fontSize: 10,
      color: C_TEXT,
    });

    slide.addText(`Pertumbuhan: ${calcGrowthStr(data.periodA.dayaSerap, data.periodB.dayaSerap)}`, {
      x: 1.0,
      y: 3.45,
      w: 3.1,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: C_GREEN,
    });

    slide.addText(`Total Bill: ${data.periodB.bill.toLocaleString('id-ID')} struk`, {
      x: 1.0,
      y: 3.9,
      w: 3.1,
      h: 0.3,
      fontSize: 9.5,
      color: C_TEXT,
    });

    slide.addText(`Total Penonton: ${data.periodB.penonton.toLocaleString('id-ID')} penonton`, {
      x: 1.0,
      y: 4.25,
      w: 3.1,
      h: 0.3,
      fontSize: 9.5,
      color: C_TEXT,
    });

    if (data.trendData.length > 0) {
      const labels = data.trendData.map((t) => t.label);
      const valuesA = data.trendData.map((t) => t.dsA);
      const valuesB = data.trendData.map((t) => t.dsB);

      const chartData = [
        { name: data.periodA.label, labels, values: valuesA },
        { name: data.periodB.label, labels, values: valuesB },
      ];

      slide.addChart(pptx.ChartType.bar, chartData, {
        x: 4.6,
        y: 1.5,
        w: 7.9,
        h: 4.4,
        barGrouping: 'clustered',
        chartColors: ['CBD5E1', C_GREEN],
        showLegend: true,
        legendPos: 't',
        showValue: true,
        fontSize: 8,
      });
    }
  }

  // ==========================================
  // SLIDE 5: Analisis Average Transaksi (AT)
  // ==========================================
  {
    const slide = pptx.addSlide();
    addHeader(slide, 5, 7, 'Slide 5: Analisis Average Transaksi (AT) per Struk Kasir');

    slide.addText(`AT mencerminkan basket size rupiah per satu struk pembelian di kasir Cafe XXI (Omset F&B / Bill Struk).`, {
      x: 0.8,
      y: 1.05,
      w: 11.7,
      h: 0.35,
      fontSize: 11,
      color: C_MUTED,
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: 1.5,
      w: 3.5,
      h: 4.8,
      rectRadius: 0.1,
      fill: { color: C_CARD },
      line: { color: C_CYAN, width: 1.5 },
    });

    slide.addText('AVERAGE TRANSAKSI (AT)', {
      x: 1.0,
      y: 1.7,
      w: 3.1,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: C_CYAN,
    });

    slide.addText(`Rp ${data.periodB.at.toLocaleString('id-ID')}`, {
      x: 1.0,
      y: 2.1,
      w: 3.1,
      h: 0.6,
      fontSize: 22,
      bold: true,
      color: C_TEXT,
    });

    slide.addText(`${data.periodB.label} (Current)`, {
      x: 1.0,
      y: 2.7,
      w: 3.1,
      h: 0.3,
      fontSize: 9.5,
      color: C_MUTED,
    });

    slide.addText(`Vs ${data.periodA.label}: Rp ${data.periodA.at.toLocaleString('id-ID')}`, {
      x: 1.0,
      y: 3.1,
      w: 3.1,
      h: 0.3,
      fontSize: 10,
      color: C_TEXT,
    });

    slide.addText(`Pertumbuhan Basket Size: ${calcGrowthStr(data.periodA.at, data.periodB.at)}`, {
      x: 1.0,
      y: 3.45,
      w: 3.1,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: C_GREEN,
    });

    slide.addText(`Omset F&B: Rp ${data.periodB.fnb.toLocaleString('id-ID')}`, {
      x: 1.0,
      y: 3.9,
      w: 3.1,
      h: 0.3,
      fontSize: 9,
      color: C_TEXT,
    });

    slide.addText(`Total Bill: ${data.periodB.bill.toLocaleString('id-ID')} struk`, {
      x: 1.0,
      y: 4.25,
      w: 3.1,
      h: 0.3,
      fontSize: 9,
      color: C_TEXT,
    });

    if (data.trendData.length > 0) {
      const labels = data.trendData.map((t) => t.label);
      const valuesA = data.trendData.map((t) => t.atA);
      const valuesB = data.trendData.map((t) => t.atB);

      const chartData = [
        { name: data.periodA.label, labels, values: valuesA },
        { name: data.periodB.label, labels, values: valuesB },
      ];

      slide.addChart(pptx.ChartType.bar, chartData, {
        x: 4.6,
        y: 1.5,
        w: 7.9,
        h: 4.4,
        barGrouping: 'clustered',
        chartColors: ['CBD5E1', C_CYAN],
        showLegend: true,
        legendPos: 't',
        showValue: true,
        fontSize: 8,
      });
    }
  }

  // ==========================================
  // SLIDE 6 (Old Slide 7): Ranking Performa Outlet
  // ==========================================
  {
    const slide = pptx.addSlide();
    addHeader(slide, 6, 7, `Slide 6: Peringkat Performa Outlet — ${data.selectedRankingIndicator.toUpperCase()}`);

    slide.addText(`Peringkat outlet berdasarkan indikator terpilih: ${data.selectedRankingIndicator} (${data.periodB.label})`, {
      x: 0.8,
      y: 1.05,
      w: 11.7,
      h: 0.35,
      fontSize: 11,
      color: C_MUTED,
    });

    const rankTableRows: pptxgen.TableRow[] = [
      [
        { text: 'Rank', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'center', fontSize: 9 } },
        { text: 'Nama Outlet', options: { bold: true, fill: { color: 'F1F5F9' }, fontSize: 9 } },
        { text: 'Area', options: { bold: true, fill: { color: 'F1F5F9' }, fontSize: 9 } },
        { text: 'Penonton', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'right', fontSize: 9 } },
        { text: 'Target SPH', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'right', fontSize: 9 } },
        { text: 'SPH', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'right', fontSize: 9 } },
        { text: '% Ach', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'center', fontSize: 9 } },
        { text: '% GBO', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'center', fontSize: 9 } },
        { text: 'Daya Serap', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'center', fontSize: 9 } },
        { text: 'AT', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'right', fontSize: 9 } },
        { text: 'Status', options: { bold: true, fill: { color: 'F1F5F9' }, align: 'center', fontSize: 9 } },
      ],
    ];

    data.rankingData.slice(0, 10).forEach((item) => {
      const isCapai = item.ach >= 100;
      rankTableRows.push([
        { text: `#${item.rank}`, options: { align: 'center', bold: true, fontSize: 8.5 } },
        { text: String(item.name), options: { bold: true, fontSize: 8.5 } },
        { text: item.areaName || '-', options: { fontSize: 8 } },
        { text: item.penonton.toLocaleString('id-ID'), options: { align: 'right', fontSize: 8.5 } },
        { text: item.targetSph.toLocaleString('id-ID'), options: { align: 'right', fontSize: 8.5 } },
        { text: item.sph.toLocaleString('id-ID'), options: { align: 'right', bold: true, color: C_GOLD, fontSize: 8.5 } },
        { text: `${item.ach}%`, options: { align: 'center', bold: true, color: isCapai ? C_GREEN : 'DC2626', fontSize: 8.5 } },
        { text: `${item.gbo}%`, options: { align: 'center', fontSize: 8.5 } },
        { text: `${item.dayaSerap}%`, options: { align: 'center', fontSize: 8.5 } },
        { text: `Rp ${item.at.toLocaleString('id-ID')}`, options: { align: 'right', fontSize: 8.5 } },
        { text: isCapai ? 'Capai' : 'Belum', options: { align: 'center', bold: true, color: isCapai ? C_GREEN : 'DC2626', fontSize: 8 } },
      ]);
    });

    slide.addTable(rankTableRows, {
      x: 0.8,
      y: 1.45,
      w: 11.7,
      h: 4.8,
      border: { color: C_BORDER, pt: 0.5 },
      rowH: 0.38,
    });

    slide.addText(`Peringkat diurutkan berdasarkan indikator: ${data.selectedRankingIndicator.toUpperCase()}. Menampilkan top outlet performa terbaik.`, {
      x: 0.8,
      y: 6.45,
      w: 11.7,
      h: 0.3,
      fontSize: 8.5,
      italic: true,
      color: C_MUTED,
    });
  }

  // ==========================================
  // SLIDE 7 (Old Slide 8): Evaluasi Kritis & Action Plan
  // ==========================================
  {
    const slide = pptx.addSlide();
    addHeader(slide, 7, 7, 'Slide 7: Evaluasi Performa & Rencana Aksi Bisnis (Action Plan)');

    slide.addText(`Sintesis analitis 4 pilar KPI (${data.periodA.label} vs ${data.periodB.label}) untuk akselerasi pertumbuhan omset Cafe XXI`, {
      x: 0.8,
      y: 1.05,
      w: 11.7,
      h: 0.35,
      fontSize: 11,
      color: C_MUTED,
    });

    const evalCards = [
      {
        title: '1. Evaluasi Head (SPH)',
        status: data.periodB.sph >= data.targetSph ? 'Optimal' : 'Perlu Intervensi',
        ach: `Ach: ${data.periodB.achievement}%`,
        color: C_GOLD,
        desc: `Rata-rata pengeluaran penonton berada pada Rp ${data.periodB.sph.toLocaleString('id-ID')} (pertumbuhan ${calcGrowthStr(data.periodA.sph, data.periodB.sph)}).`,
        action: 'Terapkan script greeting aktif kasir untuk menawarkan upsize popcorn dan minuman film unggulan.',
      },
      {
        title: '2. Evaluasi % GBO',
        status: data.periodB.gbo >= 45 ? 'Sangat Kuat' : 'Standar',
        ach: `${data.periodB.gbo}% Kontribusi`,
        color: C_PURPLE,
        desc: `Kontribusi omset F&B thdp box office tiket mencapai ${data.periodB.gbo}%. Membuktikan keterikatan pengunjung thdp Cafe XXI.`,
        action: 'Perkuat promosi pra-tayang melalui e-banner lobby dan integrasi mobile ordering m.tix F&B.',
      },
      {
        title: '3. Evaluasi Daya Serap',
        status: data.periodB.dayaSerap >= 25 ? 'Tinggi' : 'Perlu Didorong',
        ach: `${data.periodB.dayaSerap}% Penetrasi`,
        color: C_GREEN,
        desc: `Sebanyak ${data.periodB.dayaSerap}% penonton berbelanja di kasir (${data.periodB.bill.toLocaleString('id-ID')} struk).`,
        action: 'Pastikan seluruh counter kasir aktif 20 menit sebelum show dimulai guna mencegah pembatalan antrean.',
      },
      {
        title: '4. Evaluasi Average Transaksi',
        status: 'Basket Size',
        ach: `Rp ${data.periodB.at.toLocaleString('id-ID')}`,
        color: C_CYAN,
        desc: `Nilai transaksi rata-rata berada pada level Rp ${data.periodB.at.toLocaleString('id-ID')} (pertumbuhan ${calcGrowthStr(data.periodA.at, data.periodB.at)}).`,
        action: 'Dorong penjualan paket bundling combo keluarga & sharing menu untuk menaikkan nilai struk di atas Rp 100.000.',
      },
    ];

    const cW = 5.7;
    const cH = 2.1;

    evalCards.forEach((ec, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const ex = 0.8 + col * (cW + 0.3);
      const ey = 1.45 + row * (cH + 0.25);

      slide.addShape(pptx.ShapeType.roundRect, {
        x: ex,
        y: ey,
        w: cW,
        h: cH,
        rectRadius: 0.1,
        fill: { color: C_CARD },
        line: { color: ec.color, width: 1.2 },
      });

      slide.addText(`${ec.title} • ${ec.status}`, {
        x: ex + 0.2,
        y: ey + 0.15,
        w: cW - 1.6,
        h: 0.3,
        fontSize: 10.5,
        bold: true,
        color: ec.color,
      });

      slide.addText(ec.ach, {
        x: ex + cW - 1.5,
        y: ey + 0.15,
        w: 1.3,
        h: 0.3,
        fontSize: 10,
        bold: true,
        align: 'right',
        color: C_TEXT,
      });

      slide.addText(ec.desc, {
        x: ex + 0.2,
        y: ey + 0.52,
        w: cW - 0.4,
        h: 0.5,
        fontSize: 9,
        color: C_TEXT,
      });

      slide.addText(`Rekomendasi Aksi: ${ec.action}`, {
        x: ex + 0.2,
        y: ey + 1.1,
        w: cW - 0.4,
        h: 0.8,
        fontSize: 8.5,
        italic: true,
        color: C_MUTED,
      });
    });

    // Bottom Conclusion Bar
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: 6.0,
      w: 11.7,
      h: 0.85,
      rectRadius: 0.1,
      fill: { color: C_DARK },
    });

    slide.addText('KESIMPULAN RAPAT PIMPINAN: SIAP DIEKSEKUSI', {
      x: 1.1,
      y: 6.12,
      w: 8.5,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: C_GOLD,
    });

    slide.addText('Dengan menjaga rasio Daya Serap >= 25% dan mendorong SPH melampaui target, seluruh outlet berada pada jalur pertumbuhan laba yang sehat.', {
      x: 1.1,
      y: 6.42,
      w: 11.0,
      h: 0.35,
      fontSize: 9,
      color: 'E2E8F0',
    });
  }

  // Generate and download
  const cleanTitle = data.comparisonTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
  await pptx.writeFile({ fileName: `KPI_CinemaXXI_${cleanTitle}.pptx` });
};
