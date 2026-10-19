import pptxgen from 'pptxgenjs';

export interface SlideDisplayOptions {
  showSlideHeaderMeta?: boolean;
  showSummaryStrip?: boolean;
  showChartGrowthPills?: boolean;
  showBarValueLabels?: boolean;
  showInsightBox?: boolean;
}

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
  displayOptions?: SlideDisplayOptions;
}

export const exportKPIToPPTX = async (data: SlideKPIData) => {
  const pptx = new pptxgen();
  // 16:9 Widescreen (13.333 x 7.5 inches)
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Cinema XXI Management';
  pptx.company = 'Cinema XXI';
  pptx.title = `Laporan KPI Executive - ${data.comparisonTitle}`;

  const opts: Required<SlideDisplayOptions> = {
    showSlideHeaderMeta: data.displayOptions?.showSlideHeaderMeta ?? false,
    showSummaryStrip: data.displayOptions?.showSummaryStrip ?? true,
    showChartGrowthPills: data.displayOptions?.showChartGrowthPills ?? false,
    showBarValueLabels: data.displayOptions?.showBarValueLabels ?? true,
    showInsightBox: data.displayOptions?.showInsightBox ?? false,
  };

  // Color Palette (Hex without #)
  const C_DARK = '0F172A';
  const C_GOLD = 'D97706';
  const C_GOLD_BORDER = 'F59E0B';
  const C_BG = 'F8FAFC';
  const C_CARD = 'FFFFFF';
  const C_TEXT = '0F172A';
  const C_SUBTEXT = '334155';
  const C_MUTED = '64748B';
  const C_BORDER = 'CBD5E1';
  const C_BORDER_LIGHT = 'E2E8F0';

  const C_BLUE = '1D4ED8';
  const C_BLUE_BG = 'EFF6FF';
  const C_BLUE_BORDER = '93C5FD';

  const C_AMBER = 'B45309';
  const C_AMBER_BG = 'FFFBEB';
  const C_AMBER_BORDER = 'FCD34D';

  const C_PURPLE = '6D28D9';
  const C_PURPLE_BG = 'F5F3FF';
  const C_PURPLE_BORDER = 'C4B5FD';

  const C_GREEN = '047857';
  const C_GREEN_BG = 'ECFDF5';
  const C_GREEN_BORDER = '6EE7B7';

  const C_CYAN = '0E7490';
  const C_CYAN_BG = 'ECFEFF';
  const C_CYAN_BORDER = '67E8F9';

  const C_RED = 'BE123C';
  const C_RED_BG = 'FFF1F2';
  const C_RED_BORDER = 'FDA4AF';

  const FONT = 'Arial';

  const calcGrowthStr = (valA: number, valB: number): string => {
    if (valA === 0) return valB > 0 ? '+100.0%' : '0.0%';
    const diff = ((valB - valA) / valA) * 100;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}%`;
  };

  const addGrowthBadge = (
    slide: pptxgen.Slide,
    x: number,
    y: number,
    w: number,
    h: number,
    valA: number,
    valB: number,
    fontSize = 8
  ) => {
    const isPos = valB >= valA;
    const txt = calcGrowthStr(valA, valB);
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w,
      h,
      rectRadius: 0.06,
      fill: { color: isPos ? C_GREEN_BG : C_RED_BG },
      line: { color: isPos ? C_GREEN_BORDER : C_RED_BORDER, width: 0.75 },
    });
    slide.addText(txt, {
      x,
      y,
      w,
      h,
      fontFace: FONT,
      fontSize,
      bold: true,
      color: isPos ? C_GREEN : C_RED,
      align: 'center',
      valign: 'middle',
      margin: 0,
    });
  };

  const totalBaseSlides = 8;

  // Clean, minimalist slide header without redundant clutter on every slide
  const addHeader = (
    slide: pptxgen.Slide,
    slideNum: number,
    totalSlides: number,
    slideTitle: string,
    subtitleText: string,
    rightBadgeText?: string
  ) => {
    slide.background = { color: C_BG };

    // Top thin gold accent line
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.333,
      h: 0.06,
      fill: { color: C_GOLD_BORDER },
    });

    // Main Slide Title (Clean & Direct)
    slide.addText(slideTitle.toUpperCase(), {
      x: 0.5,
      y: 0.22,
      w: 8.8,
      h: 0.34,
      fontFace: FONT,
      fontSize: 15,
      bold: true,
      color: C_TEXT,
      valign: 'middle',
      margin: 0,
    });

    // Subtitle below title
    slide.addText(subtitleText, {
      x: 0.5,
      y: 0.56,
      w: 8.8,
      h: 0.24,
      fontFace: FONT,
      fontSize: 9,
      color: C_MUTED,
      valign: 'middle',
      margin: 0,
    });

    // Optional right context pill or benchmark badge
    if (opts.showSlideHeaderMeta || slideNum === 1) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 9.35,
        y: 0.22,
        w: 3.48,
        h: 0.54,
        rectRadius: 0.08,
        fill: { color: C_AMBER_BG },
        line: { color: C_AMBER_BORDER, width: 0.75 },
      });
      slide.addText(data.outletName, {
        x: 9.45,
        y: 0.26,
        w: 3.28,
        h: 0.22,
        fontFace: FONT,
        fontSize: 8.5,
        bold: true,
        color: C_TEXT,
        align: 'right',
        valign: 'middle',
        margin: 0,
      });
      slide.addText(data.comparisonTitle, {
        x: 9.45,
        y: 0.48,
        w: 3.28,
        h: 0.22,
        fontFace: FONT,
        fontSize: 7.5,
        bold: true,
        color: C_AMBER,
        align: 'right',
        valign: 'middle',
        margin: 0,
      });
    } else if (rightBadgeText) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 9.83,
        y: 0.26,
        w: 3.0,
        h: 0.36,
        rectRadius: 0.06,
        fill: { color: C_CARD },
        line: { color: C_BORDER, width: 0.75 },
      });
      slide.addText(rightBadgeText, {
        x: 9.9,
        y: 0.26,
        w: 2.86,
        h: 0.36,
        fontFace: FONT,
        fontSize: 8.5,
        bold: true,
        color: C_SUBTEXT,
        align: 'center',
        valign: 'middle',
        margin: 0,
      });
    }

    // Subtle divider line under header
    slide.addShape(pptx.ShapeType.line, {
      x: 0.5,
      y: 0.88,
      w: 12.33,
      h: 0,
      line: { color: C_BORDER_LIGHT, width: 0.75 },
    });

    // Subtle page number in bottom-right corner
    slide.addText(`${slideNum} / ${totalSlides}`, {
      x: 11.8,
      y: 7.18,
      w: 1.03,
      h: 0.2,
      fontFace: FONT,
      fontSize: 7.5,
      bold: true,
      color: C_MUTED,
      align: 'right',
      valign: 'middle',
      margin: 0,
    });
  };

  // Helper to draw a clean vector comparative bar chart
  const drawVectorBarChart = (
    slide: pptxgen.Slide,
    chartOpts: {
      chartTitle: string;
      accentColor: string;
      accentBg: string;
      accentBorder: string;
      items: Array<{ label: string; valA: number; valB: number }>;
      formatVal: (v: number) => string;
      targetLineVal?: number;
      targetLineLabel?: string;
      yTop: number;
      chartH: number;
    }
  ) => {
    const boxX = 0.5;
    const boxY = chartOpts.yTop;
    const boxW = 12.33;
    const boxH = chartOpts.chartH;

    // Outer white container card
    slide.addShape(pptx.ShapeType.roundRect, {
      x: boxX,
      y: boxY,
      w: boxW,
      h: boxH,
      rectRadius: 0.1,
      fill: { color: C_CARD },
      line: { color: C_BORDER_LIGHT, width: 1 },
    });

    // Chart Header Bar
    slide.addText(chartOpts.chartTitle.toUpperCase(), {
      x: boxX + 0.22,
      y: boxY + 0.14,
      w: 7.4,
      h: 0.28,
      fontFace: FONT,
      fontSize: 9.5,
      bold: true,
      color: C_TEXT,
      valign: 'middle',
      margin: 0,
    });

    // Legend on Right of Chart Header
    const legY = boxY + 0.16;
    slide.addShape(pptx.ShapeType.rect, {
      x: 8.3,
      y: legY + 0.03,
      w: 0.16,
      h: 0.16,
      fill: { color: 'CBD5E1' },
      line: { color: '94A3B8', width: 0.5 },
    });
    slide.addText(data.periodA.label, {
      x: 8.52,
      y: legY,
      w: 1.65,
      h: 0.22,
      fontFace: FONT,
      fontSize: 8,
      bold: true,
      color: C_SUBTEXT,
      valign: 'middle',
      margin: 0,
    });

    slide.addShape(pptx.ShapeType.rect, {
      x: 10.25,
      y: legY + 0.03,
      w: 0.16,
      h: 0.16,
      fill: { color: chartOpts.accentColor },
    });
    slide.addText(data.periodB.label, {
      x: 10.47,
      y: legY,
      w: 2.1,
      h: 0.22,
      fontFace: FONT,
      fontSize: 8,
      bold: true,
      color: C_TEXT,
      valign: 'middle',
      margin: 0,
    });

    // Inner Plot Box
    const plotX = boxX + 0.22;
    const plotY = boxY + 0.48;
    const plotW = boxW - 0.44;
    const plotH = boxH - 0.94;

    slide.addShape(pptx.ShapeType.roundRect, {
      x: plotX,
      y: plotY,
      w: plotW,
      h: plotH,
      rectRadius: 0.08,
      fill: { color: C_BG },
      line: { color: C_BORDER_LIGHT, width: 0.75 },
    });

    const items = chartOpts.items.length > 0 ? chartOpts.items : [{ label: '-', valA: 0, valB: 0 }];
    const count = items.length;
    const rawMax = Math.max(
      ...items.map((it) => Math.max(it.valA, it.valB)),
      chartOpts.targetLineVal || 0,
      1
    );
    const maxVal = rawMax * 1.18;

    const topPadding = opts.showChartGrowthPills ? 0.48 : 0.28;
    const barsTopY = plotY + topPadding;
    const barsBotY = plotY + plotH - 0.06;
    const maxBarH = barsBotY - barsTopY;

    // Horizontal dashed grid lines (25%, 50%, 75%)
    [0.25, 0.5, 0.75].forEach((ratio) => {
      const gy = barsBotY - maxBarH * ratio;
      slide.addShape(pptx.ShapeType.line, {
        x: plotX + 0.1,
        y: gy,
        w: plotW - 0.2,
        h: 0,
        line: { color: 'E2E8F0', width: 0.5, dashType: 'dash' },
      });
    });

    const groupW = (plotW - 0.3) / count;
    const startGroupX = plotX + 0.15;

    items.forEach((item, idx) => {
      const gx = startGroupX + idx * groupW;

      // Optional Top Growth Pill per column
      if (opts.showChartGrowthPills) {
        const badgeW = Math.min(groupW - 0.08, 0.78);
        const badgeX = gx + (groupW - badgeW) / 2;
        addGrowthBadge(
          slide,
          badgeX,
          plotY + 0.08,
          badgeW,
          0.2,
          item.valA,
          item.valB,
          count > 8 ? 6.5 : 7.5
        );
      }

      // Bars A & B
      const singleBarW = Math.min((groupW - 0.14) / 2, 0.42);
      const pairGap = 0.04;
      const pairTotalW = singleBarW * 2 + pairGap;
      const barAX = gx + (groupW - pairTotalW) / 2;
      const barBX = barAX + singleBarW + pairGap;

      const ratioA = maxVal > 0 ? Math.min(1, Math.max(0.03, item.valA / maxVal)) : 0.03;
      const ratioB = maxVal > 0 ? Math.min(1, Math.max(0.03, item.valB / maxVal)) : 0.03;

      const hA = maxBarH * ratioA;
      const hB = maxBarH * ratioB;

      const yA = barsBotY - hA;
      const yB = barsBotY - hB;

      // Bar A shape
      slide.addShape(pptx.ShapeType.rect, {
        x: barAX,
        y: yA,
        w: singleBarW,
        h: hA,
        fill: { color: 'CBD5E1' },
        line: { color: '94A3B8', width: 0.5 },
      });

      // Bar B shape
      const barBColor =
        chartOpts.targetLineVal && item.valB >= chartOpts.targetLineVal
          ? C_GREEN
          : chartOpts.accentColor;
      slide.addShape(pptx.ShapeType.rect, {
        x: barBX,
        y: yB,
        w: singleBarW,
        h: hB,
        fill: { color: barBColor },
      });

      // Clean Value Labels above Bars (if enabled)
      if (opts.showBarValueLabels) {
        const lblFontSize = count > 8 ? 6.5 : 7.5;
        if (item.valA > 0) {
          slide.addText(chartOpts.formatVal(item.valA), {
            x: barAX - 0.05,
            y: Math.max(plotY + 0.06, yA - 0.18),
            w: singleBarW + 0.1,
            h: 0.16,
            fontFace: FONT,
            fontSize: lblFontSize,
            bold: true,
            color: C_MUTED,
            align: 'center',
            valign: 'bottom',
            margin: 0,
          });
        }

        if (item.valB > 0) {
          slide.addText(chartOpts.formatVal(item.valB), {
            x: barBX - 0.05,
            y: Math.max(plotY + 0.06, yB - 0.18),
            w: singleBarW + 0.1,
            h: 0.16,
            fontFace: FONT,
            fontSize: lblFontSize,
            bold: true,
            color: C_TEXT,
            align: 'center',
            valign: 'bottom',
            margin: 0,
          });
        }
      }

      // X-Axis Label below plot box
      slide.addText(item.label, {
        x: gx,
        y: plotY + plotH + 0.05,
        w: groupW,
        h: 0.26,
        fontFace: FONT,
        fontSize: count > 8 ? 8 : 9,
        bold: true,
        color: C_TEXT,
        align: 'center',
        valign: 'middle',
        margin: 0,
      });
    });

    // Optional Dashed Target Line across plot
    if (chartOpts.targetLineVal && chartOpts.targetLineVal > 0) {
      const targetRatio = maxVal > 0 ? Math.min(1, Math.max(0.03, chartOpts.targetLineVal / maxVal)) : 0.03;
      const targetY = barsBotY - maxBarH * targetRatio;

      slide.addShape(pptx.ShapeType.line, {
        x: plotX + 0.08,
        y: targetY,
        w: plotW - 0.16,
        h: 0,
        line: { color: C_GREEN, width: 1.5, dashType: 'dash' },
      });

      if (chartOpts.targetLineLabel) {
        const tagW = 2.6;
        slide.addShape(pptx.ShapeType.roundRect, {
          x: plotX + plotW - tagW - 0.12,
          y: targetY - 0.21,
          w: tagW,
          h: 0.21,
          rectRadius: 0.05,
          fill: { color: C_GREEN_BG },
          line: { color: C_GREEN, width: 0.75 },
        });
        slide.addText(chartOpts.targetLineLabel, {
          x: plotX + plotW - tagW - 0.12,
          y: targetY - 0.21,
          w: tagW,
          h: 0.21,
          fontFace: FONT,
          fontSize: 7.5,
          bold: true,
          color: C_GREEN,
          align: 'center',
          valign: 'middle',
          margin: 0,
        });
      }
    }
  };

  // Helper to add bottom insight banner on chart slides (when enabled)
  const addInsightBanner = (
    slide: pptxgen.Slide,
    title: string,
    body: string,
    bgColor: string,
    borderColor: string,
    textColor: string
  ) => {
    if (!opts.showInsightBox) return;
    const y = 6.52;
    const h = 0.58;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.5,
      y,
      w: 12.33,
      h,
      rectRadius: 0.08,
      fill: { color: bgColor },
      line: { color: borderColor, width: 1 },
    });
    slide.addText(
      [
        { text: `${title}: `, options: { bold: true, color: textColor } },
        { text: body, options: { color: C_SUBTEXT } },
      ],
      {
        x: 0.68,
        y: y + 0.06,
        w: 11.97,
        h: h - 0.12,
        fontFace: FONT,
        fontSize: 8.5,
        valign: 'middle',
        margin: 0,
      }
    );
  };

  // =========================================================================
  // SLIDE 1: Ringkasan Eksekutif & Komparasi 5 Pilar KPI
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addHeader(
      slide,
      1,
      totalBaseSlides,
      'Executive KPI Comparison & Growth Overview',
      `Komparasi otomatis 5 indikator utama: ${data.comparisonTitle}`
    );

    const kpiCards = [
      {
        title: '1. PENONTON (PAX)',
        valB: `${data.periodB.penonton.toLocaleString('id-ID')} Pax`,
        valA: `${data.periodA.label}: ${data.periodA.penonton.toLocaleString('id-ID')} Pax`,
        rawA: data.periodA.penonton,
        rawB: data.periodB.penonton,
        foot: 'Total Tiket Penonton Cinema XXI',
        color: C_BLUE,
        bg: C_BLUE_BG,
        border: C_BLUE_BORDER,
      },
      {
        title: '2. HEAD (SPH)',
        valB: `Rp ${data.periodB.sph.toLocaleString('id-ID')}`,
        valA: `${data.periodA.label}: Rp ${data.periodA.sph.toLocaleString('id-ID')}`,
        rawA: data.periodA.sph,
        rawB: data.periodB.sph,
        foot: `Target: Rp ${data.targetSph.toLocaleString('id-ID')} • Ach: ${data.periodB.achievement}%`,
        color: C_AMBER,
        bg: C_AMBER_BG,
        border: C_AMBER_BORDER,
      },
      {
        title: '3. % GBO (RATIO)',
        valB: `${data.periodB.gbo}%`,
        valA: `${data.periodA.label}: ${data.periodA.gbo}%`,
        rawA: data.periodA.gbo,
        rawB: data.periodB.gbo,
        foot: 'Rasio Omset F&B thdp Box Office',
        color: C_PURPLE,
        bg: C_PURPLE_BG,
        border: C_PURPLE_BORDER,
      },
      {
        title: '4. DAYA SERAP (%)',
        valB: `${data.periodB.dayaSerap}%`,
        valA: `${data.periodA.label}: ${data.periodA.dayaSerap}%`,
        rawA: data.periodA.dayaSerap,
        rawB: data.periodB.dayaSerap,
        foot: `Total Struk: ${data.periodB.bill.toLocaleString('id-ID')} Bill`,
        color: C_GREEN,
        bg: C_GREEN_BG,
        border: C_GREEN_BORDER,
      },
      {
        title: '5. AVG TRANSAKSI',
        valB: `Rp ${data.periodB.at.toLocaleString('id-ID')}`,
        valA: `${data.periodA.label}: Rp ${data.periodA.at.toLocaleString('id-ID')}`,
        rawA: data.periodA.at,
        rawB: data.periodB.at,
        foot: `Omset F&B: Rp ${(data.periodB.fnb / 1000000).toFixed(1)} Jt`,
        color: C_CYAN,
        bg: C_CYAN_BG,
        border: C_CYAN_BORDER,
      },
    ];

    const cardW = 2.35;
    const cardGap = 0.145;
    const startX = 0.5;
    const cardY = 1.05;
    const cardH = 1.95;

    kpiCards.forEach((kpi, i) => {
      const cx = startX + i * (cardW + cardGap);

      slide.addShape(pptx.ShapeType.roundRect, {
        x: cx,
        y: cardY,
        w: cardW,
        h: cardH,
        rectRadius: 0.08,
        fill: { color: C_CARD },
        line: { color: kpi.border, width: 1.5 },
      });

      slide.addText(kpi.title, {
        x: cx + 0.12,
        y: cardY + 0.12,
        w: cardW - 0.9,
        h: 0.24,
        fontFace: FONT,
        fontSize: 8,
        bold: true,
        color: kpi.color,
        valign: 'middle',
        margin: 0,
      });

      addGrowthBadge(slide, cx + cardW - 0.76, cardY + 0.11, 0.64, 0.24, kpi.rawA, kpi.rawB, 7.5);

      slide.addText(kpi.valB, {
        x: cx + 0.12,
        y: cardY + 0.46,
        w: cardW - 0.24,
        h: 0.46,
        fontFace: FONT,
        fontSize: 15,
        bold: true,
        color: kpi.color,
        valign: 'middle',
        margin: 0,
      });

      slide.addText(kpi.valA, {
        x: cx + 0.12,
        y: cardY + 0.96,
        w: cardW - 0.24,
        h: 0.26,
        fontFace: FONT,
        fontSize: 8,
        bold: true,
        color: C_MUTED,
        valign: 'middle',
        margin: 0,
      });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: cx + 0.1,
        y: cardY + 1.35,
        w: cardW - 0.2,
        h: 0.46,
        rectRadius: 0.06,
        fill: { color: kpi.bg },
        line: { color: kpi.border, width: 0.5 },
      });

      slide.addText(kpi.foot, {
        x: cx + 0.16,
        y: cardY + 1.37,
        w: cardW - 0.32,
        h: 0.42,
        fontFace: FONT,
        fontSize: 7.5,
        bold: true,
        color: C_SUBTEXT,
        valign: 'middle',
        margin: 0,
      });
    });

    // Side-by-Side Comparison Matrix Table Container
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.5,
      y: 3.2,
      w: 12.33,
      h: 3.85,
      rectRadius: 0.08,
      fill: { color: C_CARD },
      line: { color: C_BORDER_LIGHT, width: 1 },
    });

    slide.addText(
      `MATRIKS KOMPARASI PARAMETER UTAMA: ${data.periodA.label.toUpperCase()} VS ${data.periodB.label.toUpperCase()}`,
      {
        x: 0.7,
        y: 3.34,
        w: 11.9,
        h: 0.28,
        fontFace: FONT,
        fontSize: 9.5,
        bold: true,
        color: C_TEXT,
        valign: 'middle',
        margin: 0,
      }
    );

    const makeGrowthCell = (valA: number, valB: number): pptxgen.TableCell => {
      const isPos = valB >= valA;
      return {
        text: calcGrowthStr(valA, valB),
        options: {
          align: 'center',
          valign: 'middle',
          bold: true,
          fontFace: FONT,
          fontSize: 9.5,
          color: isPos ? C_GREEN : C_RED,
          fill: { color: isPos ? C_GREEN_BG : C_RED_BG },
        },
      };
    };

    const deltaPax = data.periodB.penonton - data.periodA.penonton;
    const deltaSph = data.periodB.sph - data.periodA.sph;
    const deltaGbo = data.periodB.gbo - data.periodA.gbo;
    const deltaDs = data.periodB.dayaSerap - data.periodA.dayaSerap;
    const deltaAt = data.periodB.at - data.periodA.at;

    const hdrOpts = (align: 'left' | 'right' | 'center'): pptxgen.TableCellProps => ({
      bold: true,
      fill: { color: C_DARK },
      color: 'FFFFFF',
      align,
      valign: 'middle',
      fontFace: FONT,
      fontSize: 9.5,
    });

    const tableData: pptxgen.TableRow[] = [
      [
        { text: 'INDIKATOR KPI UTAMA', options: hdrOpts('left') },
        { text: data.periodA.label.toUpperCase(), options: hdrOpts('right') },
        { text: data.periodB.label.toUpperCase(), options: hdrOpts('right') },
        { text: 'SELISIH (DELTA)', options: hdrOpts('right') },
        { text: 'PERTUMBUHAN (%)', options: hdrOpts('center') },
      ],
      [
        {
          text: '1. Penonton (Pax Tiket)',
          options: { bold: true, color: C_BLUE, fontFace: FONT, fontSize: 9.5, valign: 'middle', fill: { color: 'FFFFFF' } },
        },
        {
          text: `${data.periodA.penonton.toLocaleString('id-ID')} Pax`,
          options: { align: 'right', color: C_SUBTEXT, fontFace: FONT, fontSize: 9.5, valign: 'middle', fill: { color: 'FFFFFF' } },
        },
        {
          text: `${data.periodB.penonton.toLocaleString('id-ID')} Pax`,
          options: { align: 'right', bold: true, color: C_BLUE, fontFace: FONT, fontSize: 9.5, valign: 'middle', fill: { color: 'FFFFFF' } },
        },
        {
          text: `${deltaPax >= 0 ? '+' : ''}${deltaPax.toLocaleString('id-ID')} Pax`,
          options: { align: 'right', bold: true, color: C_TEXT, fontFace: FONT, fontSize: 9.5, valign: 'middle', fill: { color: 'FFFFFF' } },
        },
        makeGrowthCell(data.periodA.penonton, data.periodB.penonton),
      ],
      [
        {
          text: '2. Spending Per Head (SPH)',
          options: { bold: true, color: C_AMBER, fontFace: FONT, fontSize: 9.5, valign: 'middle', fill: { color: C_BG } },
        },
        {
          text: `Rp ${data.periodA.sph.toLocaleString('id-ID')}`,
          options: { align: 'right', color: C_SUBTEXT, fontFace: FONT, fontSize: 9.5, valign: 'middle', fill: { color: C_BG } },
        },
        {
          text: `Rp ${data.periodB.sph.toLocaleString('id-ID')}`,
          options: { align: 'right', bold: true, color: C_AMBER, fontFace: FONT, fontSize: 9.5, valign: 'middle', fill: { color: C_BG } },
        },
        {
          text: `${deltaSph >= 0 ? '+' : ''}Rp ${deltaSph.toLocaleString('id-ID')}`,
          options: { align: 'right', bold: true, color: C_TEXT, fontFace: FONT, fontSize: 9.5, valign: 'middle', fill: { color: C_BG } },
        },
        makeGrowthCell(data.periodA.sph, data.periodB.sph),
      ],
      [
        {
          text: '3. Rasio % GBO (F&B vs Cinema)',
          options: { bold: true, color: C_PURPLE, fontFace: FONT, fontSize: 9.5, valign: 'middle', fill: { color: 'FFFFFF' } },
        },
        {
          text: `${data.periodA.gbo}%`,
          options: { align: 'right', color: C_SUBTEXT, fontFace: FONT, fontSize: 9.5, valign: 'middle', fill: { color: 'FFFFFF' } },
        },
        {
          text: `${data.periodB.gbo}%`,
          options: { align: 'right', bold: true, color: C_PURPLE, fontFace: FONT, fontSize: 9.5, valign: 'middle', fill: { color: 'FFFFFF' } },
        },
        {
          text: `${deltaGbo >= 0 ? '+' : ''}${deltaGbo.toFixed(1)}%`,
          options: { align: 'right', bold: true, color: C_TEXT, fontFace: FONT, fontSize: 9.5, valign: 'middle', fill: { color: 'FFFFFF' } },
        },
        makeGrowthCell(data.periodA.gbo, data.periodB.gbo),
      ],
      [
        {
          text: '4. Daya Serap (Bill / Penonton)',
          options: { bold: true, color: C_GREEN, fontFace: FONT, fontSize: 9.5, valign: 'middle', fill: { color: C_BG } },
        },
        {
          text: `${data.periodA.dayaSerap}%`,
          options: { align: 'right', color: C_SUBTEXT, fontFace: FONT, fontSize: 9.5, valign: 'middle', fill: { color: C_BG } },
        },
        {
          text: `${data.periodB.dayaSerap}%`,
          options: { align: 'right', bold: true, color: C_GREEN, fontFace: FONT, fontSize: 9.5, valign: 'middle', fill: { color: C_BG } },
        },
        {
          text: `${deltaDs >= 0 ? '+' : ''}${deltaDs.toFixed(1)}%`,
          options: { align: 'right', bold: true, color: C_TEXT, fontFace: FONT, fontSize: 9.5, valign: 'middle', fill: { color: C_BG } },
        },
        makeGrowthCell(data.periodA.dayaSerap, data.periodB.dayaSerap),
      ],
      [
        {
          text: '5. Average Transaksi (AT / Basket Size)',
          options: { bold: true, color: C_CYAN, fontFace: FONT, fontSize: 9.5, valign: 'middle', fill: { color: 'FFFFFF' } },
        },
        {
          text: `Rp ${data.periodA.at.toLocaleString('id-ID')}`,
          options: { align: 'right', color: C_SUBTEXT, fontFace: FONT, fontSize: 9.5, valign: 'middle', fill: { color: 'FFFFFF' } },
        },
        {
          text: `Rp ${data.periodB.at.toLocaleString('id-ID')}`,
          options: { align: 'right', bold: true, color: C_CYAN, fontFace: FONT, fontSize: 9.5, valign: 'middle', fill: { color: 'FFFFFF' } },
        },
        {
          text: `${deltaAt >= 0 ? '+' : ''}Rp ${deltaAt.toLocaleString('id-ID')}`,
          options: { align: 'right', bold: true, color: C_TEXT, fontFace: FONT, fontSize: 9.5, valign: 'middle', fill: { color: 'FFFFFF' } },
        },
        makeGrowthCell(data.periodA.at, data.periodB.at),
      ],
    ];

    slide.addTable(tableData, {
      x: 0.7,
      y: 3.72,
      w: 11.93,
      colW: [3.53, 2.1, 2.1, 2.1, 2.1],
      rowH: 0.5,
      border: { type: 'solid', color: C_BORDER, pt: 0.75 },
    });
  }

  // Dynamic chart layout geometry for Slides 2-5 based on display options
  const chartYTop = opts.showSummaryStrip ? 2.02 : 1.05;
  const chartBottomLimit = opts.showInsightBox ? 6.38 : 7.05;
  const chartDynamicH = chartBottomLimit - chartYTop;

  // =========================================================================
  // SLIDE 2: Analisis SPH (Spending Per Head) vs Target
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addHeader(
      slide,
      2,
      totalBaseSlides,
      'Analisis SPH (Spending Per Head) Cafe vs Target',
      'Rata-rata pengeluaran F&B dari setiap 1 penonton bioskop (Omset F&B / Total Penonton Cinema).',
      `Target Head: Rp ${data.targetSph.toLocaleString('id-ID')}`
    );

    if (opts.showSummaryStrip) {
      const stripW = 2.96;
      const stripGap = 0.16;
      const stripY = 1.04;
      const stripH = 0.84;

      // Card 1: Realisasi B
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5,
        y: stripY,
        w: stripW,
        h: stripH,
        rectRadius: 0.08,
        fill: { color: C_AMBER_BG },
        line: { color: C_AMBER_BORDER, width: 1.2 },
      });
      slide.addText(`${data.periodB.label.toUpperCase()} (REALISASI)`, {
        x: 0.65,
        y: stripY + 0.1,
        w: stripW - 0.3,
        h: 0.2,
        fontFace: FONT,
        fontSize: 7.5,
        bold: true,
        color: C_MUTED,
        margin: 0,
      });
      slide.addText(`Rp ${data.periodB.sph.toLocaleString('id-ID')}`, {
        x: 0.65,
        y: stripY + 0.34,
        w: stripW - 0.3,
        h: 0.4,
        fontFace: FONT,
        fontSize: 15,
        bold: true,
        color: C_AMBER,
        valign: 'middle',
        margin: 0,
      });

      // Card 2: Pembanding A + Growth
      const c2x = 0.5 + (stripW + stripGap);
      slide.addShape(pptx.ShapeType.roundRect, {
        x: c2x,
        y: stripY,
        w: stripW,
        h: stripH,
        rectRadius: 0.08,
        fill: { color: C_CARD },
        line: { color: C_BORDER, width: 1 },
      });
      slide.addText(`${data.periodA.label.toUpperCase()} (PEMBANDING)`, {
        x: c2x + 0.15,
        y: stripY + 0.1,
        w: stripW - 0.3,
        h: 0.2,
        fontFace: FONT,
        fontSize: 7.5,
        bold: true,
        color: C_MUTED,
        margin: 0,
      });
      slide.addText(`Rp ${data.periodA.sph.toLocaleString('id-ID')}`, {
        x: c2x + 0.15,
        y: stripY + 0.34,
        w: stripW - 1.05,
        h: 0.4,
        fontFace: FONT,
        fontSize: 14,
        bold: true,
        color: C_TEXT,
        valign: 'middle',
        margin: 0,
      });
      addGrowthBadge(slide, c2x + stripW - 0.85, stripY + 0.4, 0.7, 0.26, data.periodA.sph, data.periodB.sph, 8);

      // Card 3: Pencapaian Target Head
      const c3x = 0.5 + 2 * (stripW + stripGap);
      const isSphCapai = data.periodB.sph >= data.targetSph;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: c3x,
        y: stripY,
        w: stripW,
        h: stripH,
        rectRadius: 0.08,
        fill: { color: isSphCapai ? C_GREEN_BG : C_RED_BG },
        line: { color: isSphCapai ? C_GREEN_BORDER : C_RED_BORDER, width: 1 },
      });
      slide.addText('PENCAPAIAN TARGET HEAD', {
        x: c3x + 0.15,
        y: stripY + 0.1,
        w: stripW - 0.3,
        h: 0.2,
        fontFace: FONT,
        fontSize: 7.5,
        bold: true,
        color: isSphCapai ? C_GREEN : C_RED,
        margin: 0,
      });
      slide.addText(`${data.periodB.achievement}%`, {
        x: c3x + 0.15,
        y: stripY + 0.34,
        w: 1.5,
        h: 0.4,
        fontFace: FONT,
        fontSize: 15,
        bold: true,
        color: isSphCapai ? C_GREEN : C_RED,
        valign: 'middle',
        margin: 0,
      });
      slide.addText(isSphCapai ? 'TERCAPAI' : 'BAWAH TARGET', {
        x: c3x + stripW - 1.25,
        y: stripY + 0.4,
        w: 1.1,
        h: 0.26,
        fontFace: FONT,
        fontSize: 7.5,
        bold: true,
        color: isSphCapai ? C_GREEN : C_RED,
        align: 'right',
        valign: 'middle',
        margin: 0,
      });

      // Card 4: Selisih vs Target
      const c4x = 0.5 + 3 * (stripW + stripGap);
      const diffTarget = data.periodB.sph - data.targetSph;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: c4x,
        y: stripY,
        w: stripW,
        h: stripH,
        rectRadius: 0.08,
        fill: { color: C_AMBER_BG },
        line: { color: C_AMBER_BORDER, width: 1 },
      });
      slide.addText('SELISIH VS TARGET HEAD', {
        x: c4x + 0.15,
        y: stripY + 0.1,
        w: stripW - 0.3,
        h: 0.2,
        fontFace: FONT,
        fontSize: 7.5,
        bold: true,
        color: C_AMBER,
        margin: 0,
      });
      slide.addText(`${diffTarget >= 0 ? '+' : ''}Rp ${diffTarget.toLocaleString('id-ID')}`, {
        x: c4x + 0.15,
        y: stripY + 0.34,
        w: stripW - 0.3,
        h: 0.4,
        fontFace: FONT,
        fontSize: 14,
        bold: true,
        color: diffTarget >= 0 ? C_GREEN : C_RED,
        valign: 'middle',
        margin: 0,
      });
    }

    drawVectorBarChart(slide, {
      chartTitle: `Grafik Batang Komparasi SPH (Rp / Head): ${data.periodA.label} vs ${data.periodB.label}`,
      accentColor: C_GOLD,
      accentBg: C_AMBER_BG,
      accentBorder: C_AMBER_BORDER,
      items: data.trendData.map((t) => ({ label: t.label, valA: t.sphA, valB: t.sphB })),
      formatVal: (v) => `${(v / 1000).toFixed(1)}k`,
      targetLineVal: data.targetSph,
      targetLineLabel: `Garis Target Head: Rp ${data.targetSph.toLocaleString('id-ID')}`,
      yTop: chartYTop,
      chartH: chartDynamicH,
    });

    addInsightBanner(
      slide,
      'INSIGHT PEMBANDING SPH',
      `Grafik komparatif menegaskan tren SPH antara ${data.periodA.label} dan ${data.periodB.label}. Outlet yang konsisten berada di atas garis target Rp ${data.targetSph.toLocaleString('id-ID')} terbukti aktif menawarkan upselling paket combo promo snack dan minuman.`,
      C_AMBER_BG,
      C_AMBER_BORDER,
      C_AMBER
    );
  }

  // =========================================================================
  // SLIDE 3: Analisis % GBO (Gross Box Office) Kontribusi F&B
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addHeader(
      slide,
      3,
      totalBaseSlides,
      'Analisis % GBO (Gross Box Office) Kontribusi F&B',
      'Persentase perbandingan omset F&B terhadap omset penjualan tiket cinema (Omset F&B / Omset Cinema × 100%).',
      'Benchmark Industri: 40% - 60%'
    );

    if (opts.showSummaryStrip) {
      const stripY = 1.04;
      const stripH = 0.84;
      const stripW = 3.98;
      const stripGap = 0.195;

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5,
        y: stripY,
        w: stripW,
        h: stripH,
        rectRadius: 0.08,
        fill: { color: C_PURPLE_BG },
        line: { color: C_PURPLE_BORDER, width: 1.2 },
      });
      slide.addText(`${data.periodB.label.toUpperCase()} (RASIO % GBO)`, {
        x: 0.68,
        y: stripY + 0.1,
        w: stripW - 0.36,
        h: 0.2,
        fontFace: FONT,
        fontSize: 7.5,
        bold: true,
        color: C_PURPLE,
        margin: 0,
      });
      slide.addText(`${data.periodB.gbo}%`, {
        x: 0.68,
        y: stripY + 0.34,
        w: stripW - 0.36,
        h: 0.4,
        fontFace: FONT,
        fontSize: 16,
        bold: true,
        color: C_PURPLE,
        valign: 'middle',
        margin: 0,
      });

      const c2x = 0.5 + (stripW + stripGap);
      slide.addShape(pptx.ShapeType.roundRect, {
        x: c2x,
        y: stripY,
        w: stripW,
        h: stripH,
        rectRadius: 0.08,
        fill: { color: C_CARD },
        line: { color: C_BORDER, width: 1 },
      });
      slide.addText(`${data.periodA.label.toUpperCase()} (PEMBANDING)`, {
        x: c2x + 0.18,
        y: stripY + 0.1,
        w: stripW - 0.36,
        h: 0.2,
        fontFace: FONT,
        fontSize: 7.5,
        bold: true,
        color: C_MUTED,
        margin: 0,
      });
      slide.addText(`${data.periodA.gbo}%`, {
        x: c2x + 0.18,
        y: stripY + 0.34,
        w: stripW - 1.2,
        h: 0.4,
        fontFace: FONT,
        fontSize: 15,
        bold: true,
        color: C_TEXT,
        valign: 'middle',
        margin: 0,
      });
      addGrowthBadge(slide, c2x + stripW - 0.92, stripY + 0.38, 0.74, 0.28, data.periodA.gbo, data.periodB.gbo, 8);

      const c3x = 0.5 + 2 * (stripW + stripGap);
      slide.addShape(pptx.ShapeType.roundRect, {
        x: c3x,
        y: stripY,
        w: stripW,
        h: stripH,
        rectRadius: 0.08,
        fill: { color: C_PURPLE_BG },
        line: { color: C_PURPLE_BORDER, width: 1 },
      });
      slide.addText('KOMPOSISI OMSET F&B VS CINEMA', {
        x: c3x + 0.18,
        y: stripY + 0.1,
        w: stripW - 0.36,
        h: 0.2,
        fontFace: FONT,
        fontSize: 7.5,
        bold: true,
        color: C_PURPLE,
        margin: 0,
      });
      slide.addText(
        `F&B: Rp ${(data.periodB.fnb / 1000000).toFixed(1)} Jt  |  Cinema: Rp ${(data.periodB.cinema / 1000000).toFixed(1)} Jt`,
        {
          x: c3x + 0.18,
          y: stripY + 0.36,
          w: stripW - 0.36,
          h: 0.36,
          fontFace: FONT,
          fontSize: 10.5,
          bold: true,
          color: C_TEXT,
          valign: 'middle',
          margin: 0,
        }
      );
    }

    drawVectorBarChart(slide, {
      chartTitle: `Grafik Batang Komparasi Rasio GBO (%): ${data.periodA.label} vs ${data.periodB.label}`,
      accentColor: C_PURPLE,
      accentBg: C_PURPLE_BG,
      accentBorder: C_PURPLE_BORDER,
      items: data.trendData.map((t) => ({ label: t.label, valA: t.gboA, valB: t.gboB })),
      formatVal: (v) => `${v}%`,
      yTop: chartYTop,
      chartH: chartDynamicH,
    });

    addInsightBanner(
      slide,
      'INSIGHT PEMBANDING GBO',
      'Kenaikan % GBO menandakan porsi kontribusi F&B semakin besar terhadap tiket cinema. Rasio yang stabil di atas 40% menegaskan daya tarik ragam menu F&B bioskop XXI.',
      C_PURPLE_BG,
      C_PURPLE_BORDER,
      C_PURPLE
    );
  }

  // =========================================================================
  // SLIDE 4: Analisis Daya Serap (%) Penetrasi Pembeli Struk Kasir
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addHeader(
      slide,
      4,
      totalBaseSlides,
      'Analisis Daya Serap (Penetrasi Pembeli Struk Kasir)',
      'Rasio jumlah struk transaksi Cafe dibandingkan total penonton bioskop (Bill / Total Penonton × 100%).',
      `Total Bill: ${data.periodB.bill.toLocaleString('id-ID')} Struk`
    );

    if (opts.showSummaryStrip) {
      const stripY = 1.04;
      const stripH = 0.84;
      const stripW = 3.98;
      const stripGap = 0.195;

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5,
        y: stripY,
        w: stripW,
        h: stripH,
        rectRadius: 0.08,
        fill: { color: C_GREEN_BG },
        line: { color: C_GREEN_BORDER, width: 1.2 },
      });
      slide.addText(`${data.periodB.label.toUpperCase()} (DAYA SERAP)`, {
        x: 0.68,
        y: stripY + 0.1,
        w: stripW - 0.36,
        h: 0.2,
        fontFace: FONT,
        fontSize: 7.5,
        bold: true,
        color: C_GREEN,
        margin: 0,
      });
      slide.addText(`${data.periodB.dayaSerap}%`, {
        x: 0.68,
        y: stripY + 0.34,
        w: stripW - 0.36,
        h: 0.4,
        fontFace: FONT,
        fontSize: 16,
        bold: true,
        color: C_GREEN,
        valign: 'middle',
        margin: 0,
      });

      const c2x = 0.5 + (stripW + stripGap);
      slide.addShape(pptx.ShapeType.roundRect, {
        x: c2x,
        y: stripY,
        w: stripW,
        h: stripH,
        rectRadius: 0.08,
        fill: { color: C_CARD },
        line: { color: C_BORDER, width: 1 },
      });
      slide.addText(`${data.periodA.label.toUpperCase()} (PEMBANDING)`, {
        x: c2x + 0.18,
        y: stripY + 0.1,
        w: stripW - 0.36,
        h: 0.2,
        fontFace: FONT,
        fontSize: 7.5,
        bold: true,
        color: C_MUTED,
        margin: 0,
      });
      slide.addText(`${data.periodA.dayaSerap}%`, {
        x: c2x + 0.18,
        y: stripY + 0.34,
        w: stripW - 1.2,
        h: 0.4,
        fontFace: FONT,
        fontSize: 15,
        bold: true,
        color: C_TEXT,
        valign: 'middle',
        margin: 0,
      });
      addGrowthBadge(
        slide,
        c2x + stripW - 0.92,
        stripY + 0.38,
        0.74,
        0.28,
        data.periodA.dayaSerap,
        data.periodB.dayaSerap,
        8
      );

      const c3x = 0.5 + 2 * (stripW + stripGap);
      slide.addShape(pptx.ShapeType.roundRect, {
        x: c3x,
        y: stripY,
        w: stripW,
        h: stripH,
        rectRadius: 0.08,
        fill: { color: C_GREEN_BG },
        line: { color: C_GREEN_BORDER, width: 1 },
      });
      slide.addText('KONVERSI STRUK KASIR VS PENONTON', {
        x: c3x + 0.18,
        y: stripY + 0.1,
        w: stripW - 0.36,
        h: 0.2,
        fontFace: FONT,
        fontSize: 7.5,
        bold: true,
        color: C_GREEN,
        margin: 0,
      });
      slide.addText(
        `${data.periodB.bill.toLocaleString('id-ID')} Bill  /  ${data.periodB.penonton.toLocaleString('id-ID')} Pax`,
        {
          x: c3x + 0.18,
          y: stripY + 0.36,
          w: stripW - 0.36,
          h: 0.36,
          fontFace: FONT,
          fontSize: 11,
          bold: true,
          color: C_TEXT,
          valign: 'middle',
          margin: 0,
        }
      );
    }

    drawVectorBarChart(slide, {
      chartTitle: `Grafik Batang Komparasi Daya Serap (%): ${data.periodA.label} vs ${data.periodB.label}`,
      accentColor: C_GREEN,
      accentBg: C_GREEN_BG,
      accentBorder: C_GREEN_BORDER,
      items: data.trendData.map((t) => ({ label: t.label, valA: t.dsA, valB: t.dsB })),
      formatVal: (v) => `${v}%`,
      yTop: chartYTop,
      chartH: chartDynamicH,
    });

    addInsightBanner(
      slide,
      'INSIGHT PEMBANDING DAYA SERAP',
      'Peningkatan indikator Daya Serap merefleksikan keberhasilan mendorong penonton bioskop singgah dan bertransaksi di kasir Cafe XXI, terutama sebelum jam tayang show film dimulai.',
      C_GREEN_BG,
      C_GREEN_BORDER,
      C_GREEN
    );
  }

  // =========================================================================
  // SLIDE 5: Analisis Average Transaksi (AT / Basket Size)
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addHeader(
      slide,
      5,
      totalBaseSlides,
      'Analisis Average Transaksi (AT / Basket Size) per Struk',
      'Nilai rata-rata nominal rupiah per satu struk belanja kasir Cafe (Omset F&B / Total Struk Bill).',
      'Target Basket Size: Rp 100.000+'
    );

    if (opts.showSummaryStrip) {
      const stripY = 1.04;
      const stripH = 0.84;
      const stripW = 3.98;
      const stripGap = 0.195;

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5,
        y: stripY,
        w: stripW,
        h: stripH,
        rectRadius: 0.08,
        fill: { color: C_CYAN_BG },
        line: { color: C_CYAN_BORDER, width: 1.2 },
      });
      slide.addText(`${data.periodB.label.toUpperCase()} (NILAI AT)`, {
        x: 0.68,
        y: stripY + 0.1,
        w: stripW - 0.36,
        h: 0.2,
        fontFace: FONT,
        fontSize: 7.5,
        bold: true,
        color: C_CYAN,
        margin: 0,
      });
      slide.addText(`Rp ${data.periodB.at.toLocaleString('id-ID')}`, {
        x: 0.68,
        y: stripY + 0.34,
        w: stripW - 0.36,
        h: 0.4,
        fontFace: FONT,
        fontSize: 16,
        bold: true,
        color: C_CYAN,
        valign: 'middle',
        margin: 0,
      });

      const c2x = 0.5 + (stripW + stripGap);
      slide.addShape(pptx.ShapeType.roundRect, {
        x: c2x,
        y: stripY,
        w: stripW,
        h: stripH,
        rectRadius: 0.08,
        fill: { color: C_CARD },
        line: { color: C_BORDER, width: 1 },
      });
      slide.addText(`${data.periodA.label.toUpperCase()} (PEMBANDING)`, {
        x: c2x + 0.18,
        y: stripY + 0.1,
        w: stripW - 0.36,
        h: 0.2,
        fontFace: FONT,
        fontSize: 7.5,
        bold: true,
        color: C_MUTED,
        margin: 0,
      });
      slide.addText(`Rp ${data.periodA.at.toLocaleString('id-ID')}`, {
        x: c2x + 0.18,
        y: stripY + 0.34,
        w: stripW - 1.2,
        h: 0.4,
        fontFace: FONT,
        fontSize: 15,
        bold: true,
        color: C_TEXT,
        valign: 'middle',
        margin: 0,
      });
      addGrowthBadge(slide, c2x + stripW - 0.92, stripY + 0.38, 0.74, 0.28, data.periodA.at, data.periodB.at, 8);

      const c3x = 0.5 + 2 * (stripW + stripGap);
      const diffAt = data.periodB.at - data.periodA.at;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: c3x,
        y: stripY,
        w: stripW,
        h: stripH,
        rectRadius: 0.08,
        fill: { color: C_CYAN_BG },
        line: { color: C_CYAN_BORDER, width: 1 },
      });
      slide.addText('SELISIH RUPIAH PER STRUK', {
        x: c3x + 0.18,
        y: stripY + 0.1,
        w: stripW - 0.36,
        h: 0.2,
        fontFace: FONT,
        fontSize: 7.5,
        bold: true,
        color: C_CYAN,
        margin: 0,
      });
      slide.addText(`${diffAt >= 0 ? '+' : ''}Rp ${diffAt.toLocaleString('id-ID')}`, {
        x: c3x + 0.18,
        y: stripY + 0.34,
        w: stripW - 0.36,
        h: 0.4,
        fontFace: FONT,
        fontSize: 15,
        bold: true,
        color: diffAt >= 0 ? C_CYAN : C_RED,
        valign: 'middle',
        margin: 0,
      });
    }

    drawVectorBarChart(slide, {
      chartTitle: `Grafik Batang Komparasi Nilai AT (Rp / Struk): ${data.periodA.label} vs ${data.periodB.label}`,
      accentColor: C_CYAN,
      accentBg: C_CYAN_BG,
      accentBorder: C_CYAN_BORDER,
      items: data.trendData.map((t) => ({ label: t.label, valA: t.atA, valB: t.atB })),
      formatVal: (v) => `${(v / 1000).toFixed(0)}k`,
      yTop: chartYTop,
      chartH: chartDynamicH,
    });

    addInsightBanner(
      slide,
      'INSIGHT PEMBANDING AT',
      'Kenaikan nilai transaksi per struk (Basket Size) membuktikan keberhasilan program paket bundling promo combo snack XXI, minuman berukuran jumbo, serta penawaran merchandise edisi film terbatas.',
      C_CYAN_BG,
      C_CYAN_BORDER,
      C_CYAN
    );
  }

  // =========================================================================
  // SLIDE 6: Volume Penonton & Perbandingan Omset Finansial
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addHeader(
      slide,
      6,
      totalBaseSlides,
      'Volume Penonton & Perbandingan Omset Finansial',
      'Komparasi menyeluruh volume penonton cinema, total transaksi kasir bill, dan proporsi pendapatan finansial.'
    );

    const volCards = [
      {
        label: 'PENONTON CINEMA',
        valB: `${data.periodB.penonton.toLocaleString('id-ID')} Pax`,
        valA: `Vs ${data.periodA.label}: ${data.periodA.penonton.toLocaleString('id-ID')} Pax`,
        rawA: data.periodA.penonton,
        rawB: data.periodB.penonton,
        color: C_BLUE,
        bg: C_BLUE_BG,
        border: C_BLUE_BORDER,
      },
      {
        label: 'TOTAL STRUK KASIR (BILL)',
        valB: `${data.periodB.bill.toLocaleString('id-ID')} Bill`,
        valA: `Vs ${data.periodA.label}: ${data.periodA.bill.toLocaleString('id-ID')} Bill`,
        rawA: data.periodA.bill,
        rawB: data.periodB.bill,
        color: C_GREEN,
        bg: C_GREEN_BG,
        border: C_GREEN_BORDER,
      },
      {
        label: 'OMSET F&B (CAFE XXI)',
        valB: `Rp ${(data.periodB.fnb / 1000000).toFixed(1)} Jt`,
        valA: `Vs ${data.periodA.label}: Rp ${(data.periodA.fnb / 1000000).toFixed(1)} Jt`,
        rawA: data.periodA.fnb,
        rawB: data.periodB.fnb,
        color: C_AMBER,
        bg: C_AMBER_BG,
        border: C_AMBER_BORDER,
      },
      {
        label: 'OMSET TIKET CINEMA',
        valB: `Rp ${(data.periodB.cinema / 1000000).toFixed(1)} Jt`,
        valA: `Vs ${data.periodA.label}: Rp ${(data.periodA.cinema / 1000000).toFixed(1)} Jt`,
        rawA: data.periodA.cinema,
        rawB: data.periodB.cinema,
        color: C_PURPLE,
        bg: C_PURPLE_BG,
        border: C_PURPLE_BORDER,
      },
    ];

    const cW = 2.96;
    const cGap = 0.16;
    const cY = 1.1;
    const cH = 1.65;

    volCards.forEach((vc, idx) => {
      const cx = 0.5 + idx * (cW + cGap);
      slide.addShape(pptx.ShapeType.roundRect, {
        x: cx,
        y: cY,
        w: cW,
        h: cH,
        rectRadius: 0.08,
        fill: { color: vc.bg },
        line: { color: vc.border, width: 1.2 },
      });

      slide.addText(vc.label, {
        x: cx + 0.16,
        y: cY + 0.14,
        w: cW - 0.32,
        h: 0.22,
        fontFace: FONT,
        fontSize: 8,
        bold: true,
        color: vc.color,
        margin: 0,
      });

      slide.addText(vc.valB, {
        x: cx + 0.16,
        y: cY + 0.42,
        w: cW - 0.32,
        h: 0.45,
        fontFace: FONT,
        fontSize: 16,
        bold: true,
        color: C_TEXT,
        valign: 'middle',
        margin: 0,
      });

      slide.addText(vc.valA, {
        x: cx + 0.16,
        y: cY + 0.92,
        w: cW - 0.32,
        h: 0.24,
        fontFace: FONT,
        fontSize: 8,
        color: C_SUBTEXT,
        valign: 'middle',
        margin: 0,
      });

      addGrowthBadge(slide, cx + 0.16, cY + 1.24, 0.78, 0.26, vc.rawA, vc.rawB, 8);
    });

    // Revenue Contribution Ratio Progress Bar Box
    const propBoxY = 2.98;
    const propBoxH = 1.55;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.5,
      y: propBoxY,
      w: 12.33,
      h: propBoxH,
      rectRadius: 0.08,
      fill: { color: C_CARD },
      line: { color: C_BORDER_LIGHT, width: 1 },
    });

    slide.addText(
      `PROPORSI TOTAL PENDAPATAN FINANSIAL (${data.periodB.label.toUpperCase()}): F&B CAFE VS TICKET BOX OFFICE`,
      {
        x: 0.72,
        y: propBoxY + 0.15,
        w: 11.8,
        h: 0.26,
        fontFace: FONT,
        fontSize: 9.5,
        bold: true,
        color: C_TEXT,
        margin: 0,
      }
    );

    const totalRevB = data.periodB.fnb + data.periodB.cinema || 1;
    const fnbShare = (data.periodB.fnb / totalRevB) * 100;
    const cinShare = (data.periodB.cinema / totalRevB) * 100;

    const barFullW = 11.89;
    const fnbBarW = Math.max(1.2, Math.min(barFullW - 1.2, (fnbShare / 100) * barFullW));
    const cinBarW = barFullW - fnbBarW;

    slide.addShape(pptx.ShapeType.rect, {
      x: 0.72,
      y: propBoxY + 0.52,
      w: fnbBarW,
      h: 0.45,
      fill: { color: C_GOLD_BORDER },
    });
    slide.addText(`F&B: ${fnbShare.toFixed(1)}%`, {
      x: 0.72,
      y: propBoxY + 0.52,
      w: fnbBarW,
      h: 0.45,
      fontFace: FONT,
      fontSize: 9.5,
      bold: true,
      color: C_DARK,
      align: 'center',
      valign: 'middle',
      margin: 0,
    });

    slide.addShape(pptx.ShapeType.rect, {
      x: 0.72 + fnbBarW,
      y: propBoxY + 0.52,
      w: cinBarW,
      h: 0.45,
      fill: { color: C_PURPLE },
    });
    slide.addText(`Cinema: ${cinShare.toFixed(1)}%`, {
      x: 0.72 + fnbBarW,
      y: propBoxY + 0.52,
      w: cinBarW,
      h: 0.45,
      fontFace: FONT,
      fontSize: 9.5,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      valign: 'middle',
      margin: 0,
    });

    slide.addText(`Pendapatan F&B: Rp ${data.periodB.fnb.toLocaleString('id-ID')}`, {
      x: 0.72,
      y: propBoxY + 1.08,
      w: 5.8,
      h: 0.28,
      fontFace: FONT,
      fontSize: 9,
      bold: true,
      color: C_AMBER,
      margin: 0,
    });

    slide.addText(`Pendapatan Ticket Cinema: Rp ${data.periodB.cinema.toLocaleString('id-ID')}`, {
      x: 6.7,
      y: propBoxY + 1.08,
      w: 5.9,
      h: 0.28,
      fontFace: FONT,
      fontSize: 9,
      bold: true,
      color: C_PURPLE,
      align: 'right',
      margin: 0,
    });

    const finHdr = (align: 'left' | 'right' | 'center'): pptxgen.TableCellProps => ({
      bold: true,
      fill: { color: C_DARK },
      color: 'FFFFFF',
      align,
      valign: 'middle',
      fontFace: FONT,
      fontSize: 9,
    });

    const finRows: pptxgen.TableRow[] = [
      [
        { text: 'KOMPONEN VOLUME & OMSET', options: finHdr('left') },
        { text: data.periodA.label.toUpperCase(), options: finHdr('right') },
        { text: data.periodB.label.toUpperCase(), options: finHdr('right') },
        { text: 'SELISIH NOMINAL', options: finHdr('right') },
        { text: 'GROWTH (%)', options: finHdr('center') },
      ],
      [
        { text: 'Total Penonton Cinema (Pax)', options: { bold: true, fontFace: FONT, fontSize: 9, color: C_BLUE, fill: { color: 'FFFFFF' } } },
        { text: `${data.periodA.penonton.toLocaleString('id-ID')} Pax`, options: { align: 'right', fontFace: FONT, fontSize: 9, fill: { color: 'FFFFFF' } } },
        { text: `${data.periodB.penonton.toLocaleString('id-ID')} Pax`, options: { align: 'right', bold: true, fontFace: FONT, fontSize: 9, fill: { color: 'FFFFFF' } } },
        { text: `${(data.periodB.penonton - data.periodA.penonton).toLocaleString('id-ID')} Pax`, options: { align: 'right', fontFace: FONT, fontSize: 9, fill: { color: 'FFFFFF' } } },
        { text: calcGrowthStr(data.periodA.penonton, data.periodB.penonton), options: { align: 'center', bold: true, fontFace: FONT, fontSize: 9, color: data.periodB.penonton >= data.periodA.penonton ? C_GREEN : C_RED, fill: { color: 'FFFFFF' } } },
      ],
      [
        { text: 'Total Transaksi Struk (Bill)', options: { bold: true, fontFace: FONT, fontSize: 9, color: C_GREEN, fill: { color: C_BG } } },
        { text: `${data.periodA.bill.toLocaleString('id-ID')} Bill`, options: { align: 'right', fontFace: FONT, fontSize: 9, fill: { color: C_BG } } },
        { text: `${data.periodB.bill.toLocaleString('id-ID')} Bill`, options: { align: 'right', bold: true, fontFace: FONT, fontSize: 9, fill: { color: C_BG } } },
        { text: `${(data.periodB.bill - data.periodA.bill).toLocaleString('id-ID')} Bill`, options: { align: 'right', fontFace: FONT, fontSize: 9, fill: { color: C_BG } } },
        { text: calcGrowthStr(data.periodA.bill, data.periodB.bill), options: { align: 'center', bold: true, fontFace: FONT, fontSize: 9, color: data.periodB.bill >= data.periodA.bill ? C_GREEN : C_RED, fill: { color: C_BG } } },
      ],
      [
        { text: 'Total Omset F&B Cafe XXI (Rp)', options: { bold: true, fontFace: FONT, fontSize: 9, color: C_AMBER, fill: { color: 'FFFFFF' } } },
        { text: `Rp ${data.periodA.fnb.toLocaleString('id-ID')}`, options: { align: 'right', fontFace: FONT, fontSize: 9, fill: { color: 'FFFFFF' } } },
        { text: `Rp ${data.periodB.fnb.toLocaleString('id-ID')}`, options: { align: 'right', bold: true, fontFace: FONT, fontSize: 9, fill: { color: 'FFFFFF' } } },
        { text: `Rp ${(data.periodB.fnb - data.periodA.fnb).toLocaleString('id-ID')}`, options: { align: 'right', fontFace: FONT, fontSize: 9, fill: { color: 'FFFFFF' } } },
        { text: calcGrowthStr(data.periodA.fnb, data.periodB.fnb), options: { align: 'center', bold: true, fontFace: FONT, fontSize: 9, color: data.periodB.fnb >= data.periodA.fnb ? C_GREEN : C_RED, fill: { color: 'FFFFFF' } } },
      ],
      [
        { text: 'Total Omset Tiket Cinema (Rp)', options: { bold: true, fontFace: FONT, fontSize: 9, color: C_PURPLE, fill: { color: C_BG } } },
        { text: `Rp ${data.periodA.cinema.toLocaleString('id-ID')}`, options: { align: 'right', fontFace: FONT, fontSize: 9, fill: { color: C_BG } } },
        { text: `Rp ${data.periodB.cinema.toLocaleString('id-ID')}`, options: { align: 'right', bold: true, fontFace: FONT, fontSize: 9, fill: { color: C_BG } } },
        { text: `Rp ${(data.periodB.cinema - data.periodA.cinema).toLocaleString('id-ID')}`, options: { align: 'right', fontFace: FONT, fontSize: 9, fill: { color: C_BG } } },
        { text: calcGrowthStr(data.periodA.cinema, data.periodB.cinema), options: { align: 'center', bold: true, fontFace: FONT, fontSize: 9, color: data.periodB.cinema >= data.periodA.cinema ? C_GREEN : C_RED, fill: { color: C_BG } } },
      ],
    ];

    slide.addTable(finRows, {
      x: 0.5,
      y: 4.74,
      w: 12.33,
      colW: [3.53, 2.3, 2.3, 2.4, 1.8],
      rowH: 0.43,
      border: { type: 'solid', color: C_BORDER, pt: 0.75 },
    });
  }

  // =========================================================================
  // SLIDE 7: Peringkat Performa Outlet & Pencapaian Target (Paginated if > 12 rows)
  // =========================================================================
  {
    const pageSize = 12;
    const chunks: Array<typeof data.rankingData> = [];
    for (let i = 0; i < data.rankingData.length; i += pageSize) {
      chunks.push(data.rankingData.slice(i, i + pageSize));
    }
    if (chunks.length === 0) chunks.push([]);

    chunks.forEach((chunk, pageIdx) => {
      const slide = pptx.addSlide();
      const pageSuffix = chunks.length > 1 ? ` (Hal ${pageIdx + 1}/${chunks.length})` : '';
      addHeader(
        slide,
        7,
        totalBaseSlides,
        `Peringkat Performa Outlet & Pencapaian Target (${data.periodB.label})${pageSuffix}`,
        `Pemetaan performa ${data.rankingData.length} outlet berdasarkan indikator terpilih.`,
        `Urutan: ${data.selectedRankingIndicator.toUpperCase()}`
      );

      const rHdr = (align: 'left' | 'right' | 'center'): pptxgen.TableCellProps => ({
        bold: true,
        fill: { color: C_DARK },
        color: 'FFFFFF',
        align,
        valign: 'middle',
        fontFace: FONT,
        fontSize: 8.5,
      });

      const rankTableRows: pptxgen.TableRow[] = [
        [
          { text: 'RANK', options: rHdr('center') },
          { text: 'NAMA OUTLET', options: rHdr('left') },
          { text: 'WILAYAH AREA', options: rHdr('left') },
          { text: 'PENONTON', options: rHdr('right') },
          { text: 'TARGET SPH', options: rHdr('right') },
          { text: 'SPH REALISASI', options: rHdr('right') },
          { text: '% ACH', options: rHdr('center') },
          { text: '% GBO', options: rHdr('center') },
          { text: 'DAYA SERAP', options: rHdr('center') },
          { text: 'AT (STRUK)', options: rHdr('right') },
          { text: 'STATUS', options: rHdr('center') },
        ],
      ];

      chunk.forEach((item, rIdx) => {
        const isCapai = item.ach >= 100;
        const rowBg = rIdx % 2 === 0 ? 'FFFFFF' : C_BG;
        rankTableRows.push([
          {
            text: `#${item.rank}`,
            options: { align: 'center', valign: 'middle', bold: true, fontFace: FONT, fontSize: 8.5, color: item.rank <= 3 ? C_AMBER : C_SUBTEXT, fill: { color: rowBg } },
          },
          {
            text: String(item.name),
            options: { align: 'left', valign: 'middle', bold: true, fontFace: FONT, fontSize: 8.5, color: C_TEXT, fill: { color: rowBg } },
          },
          {
            text: item.areaName || '-',
            options: { align: 'left', valign: 'middle', fontFace: FONT, fontSize: 8, color: C_MUTED, fill: { color: rowBg } },
          },
          {
            text: item.penonton.toLocaleString('id-ID'),
            options: { align: 'right', valign: 'middle', bold: true, fontFace: FONT, fontSize: 8.5, color: C_TEXT, fill: { color: rowBg } },
          },
          {
            text: `Rp ${item.targetSph.toLocaleString('id-ID')}`,
            options: { align: 'right', valign: 'middle', fontFace: FONT, fontSize: 8.5, color: C_MUTED, fill: { color: rowBg } },
          },
          {
            text: `Rp ${item.sph.toLocaleString('id-ID')}`,
            options: { align: 'right', valign: 'middle', bold: true, fontFace: FONT, fontSize: 8.5, color: C_AMBER, fill: { color: rowBg } },
          },
          {
            text: `${item.ach}%`,
            options: { align: 'center', valign: 'middle', bold: true, fontFace: FONT, fontSize: 8.5, color: isCapai ? C_GREEN : C_RED, fill: { color: rowBg } },
          },
          {
            text: `${item.gbo}%`,
            options: { align: 'center', valign: 'middle', bold: true, fontFace: FONT, fontSize: 8.5, color: C_PURPLE, fill: { color: rowBg } },
          },
          {
            text: `${item.dayaSerap}%`,
            options: { align: 'center', valign: 'middle', bold: true, fontFace: FONT, fontSize: 8.5, color: C_GREEN, fill: { color: rowBg } },
          },
          {
            text: `Rp ${item.at.toLocaleString('id-ID')}`,
            options: { align: 'right', valign: 'middle', bold: true, fontFace: FONT, fontSize: 8.5, color: C_CYAN, fill: { color: rowBg } },
          },
          {
            text: isCapai ? 'CAPAI' : 'BELUM',
            options: {
              align: 'center',
              valign: 'middle',
              bold: true,
              fontFace: FONT,
              fontSize: 7.5,
              color: isCapai ? C_GREEN : C_RED,
              fill: { color: isCapai ? C_GREEN_BG : C_RED_BG },
            },
          },
        ]);
      });

      slide.addTable(rankTableRows, {
        x: 0.5,
        y: 1.08,
        w: 12.33,
        colW: [0.6, 2.38, 1.35, 1.0, 1.15, 1.2, 0.85, 0.85, 0.95, 1.1, 0.9],
        rowH: 0.41,
        border: { type: 'solid', color: C_BORDER, pt: 0.5 },
      });
    });
  }

  // =========================================================================
  // SLIDE 8: Evaluasi Performa & Rencana Aksi Bisnis (Action Plan)
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addHeader(
      slide,
      8,
      totalBaseSlides,
      'Evaluasi Performa & Rencana Aksi Bisnis (Action Plan)',
      `Sintesis analitis 4 pilar KPI (${data.periodA.label} vs ${data.periodB.label}) untuk strategi akselerasi omset F&B Cafe XXI.`
    );

    const evalCards = [
      {
        title: `1. EVALUASI HEAD (SPH): ${data.periodB.sph >= data.targetSph ? 'OPTIMAL' : 'PERLU INTERVENSI'}`,
        badge: `Ach: ${data.periodB.achievement}%`,
        color: C_AMBER,
        bg: C_AMBER_BG,
        border: C_AMBER_BORDER,
        desc: `Rata-rata pengeluaran penonton berada di angka Rp ${data.periodB.sph.toLocaleString('id-ID')} (pertumbuhan ${calcGrowthStr(data.periodA.sph, data.periodB.sph)} dibanding ${data.periodA.label}).`,
        actionTitle: 'REKOMENDASI AKSI OPERATIONAL:',
        action:
          'Terapkan script greeting aktif di kasir untuk menawarkan upsize popcorn manis dan minuman edisi film blockbuster.',
      },
      {
        title: `2. EVALUASI % GBO: ${data.periodB.gbo >= 40 ? 'SANGAT KUAT' : 'STANDAR'}`,
        badge: `${data.periodB.gbo}% Kontribusi`,
        color: C_PURPLE,
        bg: C_PURPLE_BG,
        border: C_PURPLE_BORDER,
        desc: `Kontribusi omset F&B terhadap box office cinema mencapai ${data.periodB.gbo}%. Rasio ini membuktikan keterikatan pengunjung terhadap sajian bioskop XXI.`,
        actionTitle: 'REKOMENDASI AKSI MARKETING:',
        action:
          'Perkuat promosi pra-tayang melalui e-banner lobby dan pemesanan praktis mobile ordering m.tix F&B.',
      },
      {
        title: `3. EVALUASI DAYA SERAP: ${data.periodB.dayaSerap >= 25 ? 'TINGGI' : 'PERLU DIDORONG'}`,
        badge: `${data.periodB.dayaSerap}% Pembeli`,
        color: C_GREEN,
        bg: C_GREEN_BG,
        border: C_GREEN_BORDER,
        desc: `Sebanyak ${data.periodB.dayaSerap}% dari total penonton bertransaksi di Cafe XXI (${data.periodB.bill.toLocaleString('id-ID')} struk kasir dari ${data.periodB.penonton.toLocaleString('id-ID')} penonton).`,
        actionTitle: 'REKOMENDASI AKSI SERVICE SPEED:',
        action:
          'Pastikan kelancaran antrean kasir berjalan maksimal pada 20 menit sebelum jam tayang film dimulai.',
      },
      {
        title: '4. EVALUASI AVERAGE TRANSAKSI (AT)',
        badge: `Rp ${data.periodB.at.toLocaleString('id-ID')}`,
        color: C_CYAN,
        bg: C_CYAN_BG,
        border: C_CYAN_BORDER,
        desc: `Basket size per transaksi berada pada level Rp ${data.periodB.at.toLocaleString('id-ID')} (pertumbuhan ${calcGrowthStr(data.periodA.at, data.periodB.at)} dibanding ${data.periodA.label}).`,
        actionTitle: 'REKOMENDASI AKSI BUNDLING:',
        action:
          'Dorong penjualan paket combo keluarga atau bundle snack sharing untuk menaikkan nominal transaksi per struk.',
      },
    ];

    const cW = 6.04;
    const cH = 2.22;
    const gapX = 0.25;
    const gapY = 0.2;

    evalCards.forEach((ec, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const ex = 0.5 + col * (cW + gapX);
      const ey = 1.1 + row * (cH + gapY);

      slide.addShape(pptx.ShapeType.roundRect, {
        x: ex,
        y: ey,
        w: cW,
        h: cH,
        rectRadius: 0.08,
        fill: { color: ec.bg },
        line: { color: ec.border, width: 1.2 },
      });

      slide.addText(ec.title, {
        x: ex + 0.18,
        y: ey + 0.12,
        w: cW - 1.75,
        h: 0.28,
        fontFace: FONT,
        fontSize: 9,
        bold: true,
        color: ec.color,
        valign: 'middle',
        margin: 0,
      });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: ex + cW - 1.5,
        y: ey + 0.12,
        w: 1.32,
        h: 0.26,
        rectRadius: 0.05,
        fill: { color: C_CARD },
        line: { color: ec.border, width: 0.75 },
      });
      slide.addText(ec.badge, {
        x: ex + cW - 1.5,
        y: ey + 0.12,
        w: 1.32,
        h: 0.26,
        fontFace: FONT,
        fontSize: 8,
        bold: true,
        color: ec.color,
        align: 'center',
        valign: 'middle',
        margin: 0,
      });

      slide.addShape(pptx.ShapeType.line, {
        x: ex + 0.18,
        y: ey + 0.45,
        w: cW - 0.36,
        h: 0,
        line: { color: ec.border, width: 0.75 },
      });

      slide.addText(ec.desc, {
        x: ex + 0.18,
        y: ey + 0.52,
        w: cW - 0.36,
        h: 0.48,
        fontFace: FONT,
        fontSize: 8.5,
        color: C_TEXT,
        valign: 'middle',
        margin: 0,
      });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: ex + 0.18,
        y: ey + 1.1,
        w: cW - 0.36,
        h: 0.94,
        rectRadius: 0.06,
        fill: { color: C_CARD },
        line: { color: ec.border, width: 0.75 },
      });

      slide.addText(ec.actionTitle, {
        x: ex + 0.3,
        y: ey + 1.17,
        w: cW - 0.6,
        h: 0.22,
        fontFace: FONT,
        fontSize: 7.5,
        bold: true,
        color: ec.color,
        valign: 'middle',
        margin: 0,
      });

      slide.addText(ec.action, {
        x: ex + 0.3,
        y: ey + 1.4,
        w: cW - 0.6,
        h: 0.52,
        fontFace: FONT,
        fontSize: 8.5,
        color: C_SUBTEXT,
        valign: 'top',
        margin: 0,
      });
    });

    // Bottom Executive Conclusion Bar
    const botY = 5.88;
    const botH = 1.05;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.5,
      y: botY,
      w: 12.33,
      h: botH,
      rectRadius: 0.1,
      fill: { color: C_DARK },
    });

    slide.addText('KESIMPULAN RAPAT EXECUTIVE & DIRECTION', {
      x: 0.78,
      y: botY + 0.16,
      w: 5.5,
      h: 0.28,
      fontFace: FONT,
      fontSize: 11,
      bold: true,
      color: 'FBBF24',
      valign: 'middle',
      margin: 0,
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 5.35,
      y: botY + 0.17,
      w: 1.5,
      h: 0.26,
      rectRadius: 0.06,
      fill: { color: '10B981' },
    });
    slide.addText('SIAP DIEKSEKUSI', {
      x: 5.35,
      y: botY + 0.17,
      w: 1.5,
      h: 0.26,
      fontFace: FONT,
      fontSize: 8,
      bold: true,
      color: C_DARK,
      align: 'center',
      valign: 'middle',
      margin: 0,
    });

    slide.addText(
      'Dengan menjaga rasio Daya Serap di atas 25% dan mendorong SPH melampaui target, seluruh outlet berada pada jalur pencapaian omset F&B yang sangat optimal.',
      {
        x: 0.78,
        y: botY + 0.5,
        w: 11.75,
        h: 0.38,
        fontFace: FONT,
        fontSize: 9,
        color: 'E2E8F0',
        valign: 'middle',
        margin: 0,
      }
    );
  }

  const cleanTitle = data.comparisonTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
  await pptx.writeFile({ fileName: `KPI_CinemaXXI_${cleanTitle}.pptx` });
};
