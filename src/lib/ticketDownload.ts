import { BRAND_NAME, BUS_NAME, CURRENCY_SYMBOL } from '@/config/busConfig';
import { formatDisplayDate } from '@/lib/dateUtils';
import type { BookingRecord } from '@/types/booking';

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 2);
}

export async function downloadTicketPng(
  booking: BookingRecord,
  qrCanvas: HTMLCanvasElement | null
): Promise<void> {
  const W = 960;
  const H = 1320;
  const PAD = 40;
  const CARD_X = PAD;
  const CARD_Y = PAD;
  const CARD_W = W - PAD * 2;
  const CARD_H = H - PAD * 2;
  const HEADER_H = 176;
  const TEAR_Y = 890;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to create image canvas on this browser.');
  }

  const fontStack =
    '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  // Background
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(0, 0, W, H);

  // Drop shadow behind card
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.14)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 14;
  drawRoundedRectPath(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, 36);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.restore();

  // Clip card contents inside rounded corners
  ctx.save();
  drawRoundedRectPath(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, 36);
  ctx.clip();

  // Top Crimson Header
  const headerGrad = ctx.createLinearGradient(CARD_X, CARD_Y, CARD_X + CARD_W, CARD_Y + HEADER_H);
  headerGrad.addColorStop(0, '#D84E55');
  headerGrad.addColorStop(1, '#B91C1C');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(CARD_X, CARD_Y, CARD_W, HEADER_H);

  // Header left title
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = `700 22px ${fontStack}`;
  ctx.fillText(BUS_NAME.toUpperCase(), CARD_X + 44, CARD_Y + 66);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 38px ${fontStack}`;
  ctx.fillText(`${BRAND_NAME} Boarding Pass`, CARD_X + 44, CARD_Y + 120);

  // Booking ID badge on top right
  drawRoundedRectPath(ctx, CARD_X + CARD_W - 260, CARD_Y + 42, 216, 92, 20);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = `700 18px ${fontStack}`;
  ctx.textAlign = 'center';
  ctx.fillText('BOOKING ID', CARD_X + CARD_W - 152, CARD_Y + 76);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 30px ${fontStack}`;
  ctx.fillText(booking.bookingId, CARD_X + CARD_W - 152, CARD_Y + 116);
  ctx.textAlign = 'left';

  // Route & Paid badge row
  const bodyX = CARD_X + 44;
  const bodyW = CARD_W - 88;
  let cursorY = CARD_Y + HEADER_H + 54;

  ctx.fillStyle = '#64748B';
  ctx.font = `700 20px ${fontStack}`;
  ctx.fillText('ROUTE', bodyX, cursorY);

  cursorY += 42;
  ctx.fillStyle = '#0F172A';
  ctx.font = `800 36px ${fontStack}`;
  ctx.fillText(booking.routeLabel, bodyX, cursorY);

  // Paid Pill right-aligned
  const paidText = `PAID • ${CURRENCY_SYMBOL}${booking.amountPaid}`;
  ctx.font = `800 22px ${fontStack}`;
  const paidW = ctx.measureText(paidText).width + 40;
  drawRoundedRectPath(ctx, bodyX + bodyW - paidW, cursorY - 34, paidW, 44, 22);
  ctx.fillStyle = '#ECFDF5';
  ctx.fill();
  ctx.strokeStyle = '#A7F3D0';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#047857';
  ctx.textAlign = 'center';
  ctx.fillText(paidText, bodyX + bodyW - paidW / 2, cursorY - 5);
  ctx.textAlign = 'left';

  // Passenger Count & Seats Hero Highlight Box
  cursorY += 36;
  const seatCount = booking.seats.length;
  const countLabel = `${seatCount} ${seatCount === 1 ? 'Ticket' : 'Tickets'} • ${
    seatCount === 1 ? 'Seat' : 'Seats'
  }: ${booking.seats.join(', ')}`;

  drawRoundedRectPath(ctx, bodyX, cursorY, bodyW, 92, 22);
  ctx.fillStyle = '#FFF1F2';
  ctx.fill();
  ctx.strokeStyle = '#FECDD3';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#B91C1C';
  ctx.font = `700 18px ${fontStack}`;
  ctx.fillText('CONFIRMED SEATS', bodyX + 26, cursorY + 34);

  ctx.fillStyle = '#0F172A';
  ctx.font = `800 32px ${fontStack}`;
  ctx.fillText(countLabel, bodyX + 26, cursorY + 72);

  // Boarding & Dropping cards (2 columns)
  cursorY += 120;
  const colGap = 20;
  const colW = (bodyW - colGap) / 2;
  const stopBoxH = 152;

  // Boarding
  drawRoundedRectPath(ctx, bodyX, cursorY, colW, stopBoxH, 22);
  ctx.fillStyle = '#F8FAFC';
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#64748B';
  ctx.font = `700 18px ${fontStack}`;
  ctx.fillText('BOARDING POINT', bodyX + 22, cursorY + 36);

  ctx.fillStyle = '#0F172A';
  ctx.font = `700 24px ${fontStack}`;
  const originLines = wrapText(ctx, booking.originStop, colW - 44);
  originLines.forEach((line, idx) => {
    ctx.fillText(line, bodyX + 22, cursorY + 72 + idx * 30);
  });

  ctx.fillStyle = '#B91C1C';
  ctx.font = `800 22px ${fontStack}`;
  ctx.fillText(`Departs ${booking.departureTime}`, bodyX + 22, cursorY + 132);

  // Dropping
  const col2X = bodyX + colW + colGap;
  drawRoundedRectPath(ctx, col2X, cursorY, colW, stopBoxH, 22);
  ctx.fillStyle = '#F8FAFC';
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#64748B';
  ctx.font = `700 18px ${fontStack}`;
  ctx.fillText('DROPPING POINT', col2X + 22, cursorY + 36);

  ctx.fillStyle = '#0F172A';
  ctx.font = `700 24px ${fontStack}`;
  const destLines = wrapText(ctx, booking.destinationStop, colW - 44);
  destLines.forEach((line, idx) => {
    ctx.fillText(line, col2X + 22, cursorY + 72 + idx * 30);
  });

  ctx.fillStyle = '#475569';
  ctx.font = `700 22px ${fontStack}`;
  ctx.fillText(`Arrives ${booking.arrivalTime}`, col2X + 22, cursorY + 132);

  // Passenger, Date & Mobile grid
  cursorY += stopBoxH + 24;
  drawRoundedRectPath(ctx, bodyX, cursorY, bodyW, 132, 22);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.stroke();

  const thirdW = bodyW / 3;
  const metaItems = [
    { label: 'JOURNEY DATE', value: formatDisplayDate(booking.date) },
    { label: 'PASSENGER NAME', value: booking.passengerName },
    { label: 'MOBILE NUMBER', value: `+91 ${booking.passengerPhone}` },
  ];

  metaItems.forEach((item, idx) => {
    const mx = bodyX + 24 + idx * thirdW;
    ctx.fillStyle = '#64748B';
    ctx.font = `700 17px ${fontStack}`;
    ctx.fillText(item.label, mx, cursorY + 46);

    ctx.fillStyle = '#0F172A';
    ctx.font = `800 24px ${fontStack}`;
    ctx.fillText(item.value.slice(0, 22), mx, cursorY + 88);
  });

  // Bottom QR band background
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(CARD_X, TEAR_Y, CARD_W, CARD_Y + CARD_H - TEAR_Y);

  // Dashed tear line
  ctx.save();
  ctx.setLineDash([12, 10]);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CARD_X + 28, TEAR_Y);
  ctx.lineTo(CARD_X + CARD_W - 28, TEAR_Y);
  ctx.stroke();
  ctx.restore();

  // Left & Right ticket punch notches
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.arc(CARD_X, TEAR_Y, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(CARD_X + CARD_W, TEAR_Y, 24, 0, Math.PI * 2);
  ctx.fill();

  // QR Box on bottom left
  const qrBoxSize = 280;
  const qrBoxX = bodyX;
  const qrBoxY = TEAR_Y + 46;

  drawRoundedRectPath(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 26);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 3;
  ctx.stroke();

  if (qrCanvas) {
    ctx.drawImage(qrCanvas, qrBoxX + 20, qrBoxY + 20, qrBoxSize - 40, qrBoxSize - 40);
  }

  // Conductor instructions beside QR
  const infoX = qrBoxX + qrBoxSize + 40;
  ctx.fillStyle = '#0F172A';
  ctx.font = `800 32px ${fontStack}`;
  ctx.fillText('Show QR when boarding', infoX, qrBoxY + 64);

  ctx.fillStyle = '#475569';
  ctx.font = `600 23px ${fontStack}`;
  ctx.fillText('Bus conductor will scan this pass', infoX, qrBoxY + 110);
  ctx.fillText('using their phone camera.', infoX, qrBoxY + 144);

  ctx.fillStyle = '#B91C1C';
  ctx.font = `800 26px ${fontStack}`;
  ctx.fillText(
    `${seatCount} ${seatCount === 1 ? 'Passenger' : 'Passengers'} • ${booking.seats.join(', ')}`,
    infoX,
    qrBoxY + 204
  );

  ctx.fillStyle = '#64748B';
  ctx.font = `600 20px ${fontStack}`;
  ctx.fillText(`Ticket ID: ${booking.bookingId}`, infoX, qrBoxY + 246);

  ctx.restore(); // end rounded clip

  // Border outline
  drawRoundedRectPath(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, 36);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.stroke();

  const filename = `MajidBus-Ticket-${booking.bookingId}.png`;

  await new Promise<void>((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          link.remove();
          resolve();
          return;
        }

        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        resolve();
      },
      'image/png',
      1.0
    );
  });
}
