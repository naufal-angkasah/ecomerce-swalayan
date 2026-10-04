/**
 * Alvin Swalayan - Admin Order Sound & Voice Notification System
 * - Dual-engine chime: HTML5 Audio (/sounds/order-chime.wav) + Web Audio API synthesizer
 * - Indonesian voice announcement via Web Speech API (speechSynthesis)
 * - Auto-unlocks on user interaction to comply with browser autoplay policies
 */

let sharedAudioContext: AudioContext | null = null;
let sharedAudioElement: HTMLAudioElement | null = null;
let audioUnlocked = false;

export function getPaymentMethodLabel(method?: string): string {
  const m = (method || '').toUpperCase();
  if (m.includes('TRANSFER') || m.includes('BANK')) {
    return 'Transfer Bank (BSI / BAS)';
  }
  if (m.includes('QRIS') || m.includes('MIDTRANS')) {
    return 'QRIS';
  }
  return 'Bayar di Tempat (COD Tunai)';
}

/**
 * Initializes and unlocks the browser audio context and preloads chime.
 * Must be called from a user gesture (click, keydown, touch) or on page interaction.
 */
export function unlockAudio(): void {
  if (typeof window === 'undefined') return;
  audioUnlocked = true;

  // 1. Unlock Web Audio API
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      if (!sharedAudioContext) {
        sharedAudioContext = new AudioContextClass();
      }
      if (sharedAudioContext.state === 'suspended') {
        sharedAudioContext.resume().catch(() => {});
      }
    }
  } catch {}

  // 2. Preload HTML5 Audio Element
  try {
    if (!sharedAudioElement) {
      sharedAudioElement = new Audio('/sounds/order-chime.wav');
      sharedAudioElement.volume = 1.0;
      sharedAudioElement.load();
    }
  } catch {}

  // 3. Resume Speech Synthesis if paused
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  } catch {}
}

/**
 * Plays a loud, clear, unmistakable cash register order chime.
 * Uses HTML5 Audio with fallback to Web Audio oscillator synthesis.
 */
export function playOrderChime(): void {
  if (typeof window === 'undefined') return;

  // Ensure audio pipeline is prepared
  unlockAudio();

  // Engine 1: HTML5 Audio file playback (primary, high fidelity)
  try {
    const audio = new Audio('/sounds/order-chime.wav');
    audio.volume = 1.0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('HTML5 Audio play caught (browser autoplay check):', err);
      });
    }
  } catch (err) {
    console.warn('HTML5 Audio error:', err);
  }

  // Engine 2: Web Audio API Oscillator Chime (simultaneous backup)
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!sharedAudioContext) {
      sharedAudioContext = new AudioContextClass();
    }
    const ctx = sharedAudioContext;

    const playSynth = () => {
      const tones = [
        { freq: 523.25, time: 0.0, duration: 0.2 },
        { freq: 659.25, time: 0.12, duration: 0.2 },
        { freq: 783.99, time: 0.24, duration: 0.25 },
        { freq: 1046.5, time: 0.38, duration: 0.7 },
      ];

      const now = ctx.currentTime;
      tones.forEach(({ freq, time, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.exponentialRampToValueAtTime(0.45, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + duration);
      });
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(playSynth).catch(() => {});
    } else {
      playSynth();
    }
  } catch (err) {
    console.warn('Web Audio synthesis error:', err);
  }
}

/**
 * Speaks an Indonesian voice announcement announcing the incoming order and payment method.
 */
export function speakOrderAnnouncement(paymentMethod: string, isPaid: boolean = false): void {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    let paymentVoiceText = 'Bayar di Tempat C O D';
    const m = (paymentMethod || '').toUpperCase();
    if (m.includes('TRANSFER') || m.includes('BANK')) {
      paymentVoiceText = 'Transfer Bank';
    } else if (m.includes('QRIS') || m.includes('MIDTRANS')) {
      paymentVoiceText = 'Q R I S';
    }

    const text = isPaid
      ? (m.includes('COD')
          ? 'Pesanan C O D telah selesai dan pembayaran tunai telah diterima kasir.'
          : `Pembayaran via ${paymentVoiceText} telah lunas! Pesanan siap dipersiapkan toko.`)
      : `Pesanan baru masuk! Pembayaran via ${paymentVoiceText}.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    // Pick Indonesian voice if available
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find((v) => v.lang.toLowerCase().startsWith('id'));
    if (idVoice) {
      utterance.voice = idVoice;
    }

    // Wake up speech engine in case paused
    window.speechSynthesis.resume();

    // Prevent Chrome cancel bug: only cancel if actively speaking
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    // Small delay ensures previous speech teardown completes before queuing
    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('speechSynthesis.speak error:', e);
      }
    }, 60);
  } catch (err) {
    console.warn('Speech synthesis warning:', err);
  }
}

/**
 * Speaks an Indonesian batch order voice announcement when multiple orders arrive simultaneously.
 */
export function speakBatchAnnouncement(count: number): void {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const text = `Perhatian kasir! Ada ${count} pesanan baru masuk secara bersamaan. Silakan periksa daftar pesanan.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find((v) => v.lang.toLowerCase().startsWith('id'));
    if (idVoice) {
      utterance.voice = idVoice;
    }

    window.speechSynthesis.resume();

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('speechSynthesis.speak error:', e);
      }
    }, 60);
  } catch (err) {
    console.warn('Batch speech synthesis warning:', err);
  }
}

/**
 * Speaks an Indonesian voice announcement when a customer uploads/submits payment proof.
 */
export function speakPaymentProofAnnouncement(orderNumber?: string, customerName?: string): void {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const namePart = customerName ? `dari ${customerName} ` : '';
    const orderPart = orderNumber ? `untuk pesanan ${orderNumber}` : '';
    const text = `Perhatian kasir! Bukti transfer baru ${namePart}${orderPart} telah diterima. Silakan segera periksa dan verifikasi pembayaran.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find((v) => v.lang.toLowerCase().startsWith('id'));
    if (idVoice) {
      utterance.voice = idVoice;
    }

    window.speechSynthesis.resume();

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('speechSynthesis.speak error:', e);
      }
    }, 60);
  } catch (err) {
    console.warn('Payment proof speech synthesis warning:', err);
  }
}

export type AudioAlertItem =
  | {
      type: 'SINGLE';
      order: {
        order_number: string;
        customer_name?: string;
        customer_phone?: string;
        payment_method?: string;
        total_amount?: number;
        is_paid?: boolean;
      };
    }
  | {
      type: 'BATCH';
      count: number;
    }
  | {
      type: 'PROOF';
      order: {
        order_number: string;
        customer_name?: string;
        total_amount?: number;
      };
    };

const alertQueue: AudioAlertItem[] = [];
let isQueueRunning = false;
let queueTimeoutId: NodeJS.Timeout | null = null;

function processNextAlert(): void {
  if (alertQueue.length === 0) {
    isQueueRunning = false;
    return;
  }

  isQueueRunning = true;
  const item = alertQueue.shift();
  if (!item) {
    isQueueRunning = false;
    return;
  }

  // 1. Play ringing chime
  playOrderChime();

  // 2. Announce speech voice after chime starts
  setTimeout(() => {
    if (item.type === 'BATCH') {
      speakBatchAnnouncement(item.count);
    } else if (item.type === 'PROOF') {
      speakPaymentProofAnnouncement(item.order.order_number, item.order.customer_name);
    } else {
      speakOrderAnnouncement(
        item.order.payment_method || 'COD',
        item.order.is_paid || false
      );
    }
  }, 450);

  // 3. Clear timeout and wait for current announcement (~4.0s) before playing next item in sequence
  if (queueTimeoutId) clearTimeout(queueTimeoutId);
  queueTimeoutId = setTimeout(() => {
    processNextAlert();
  }, 4000);
}

/**
 * Pushes an audio alert into the FIFO queue.
 * Ensures notifications play sequentially without overlapping, stuttering, or cutting off speech.
 */
export function queueAudioAlert(item: AudioAlertItem): void {
  if (item.type === 'BATCH') {
    // If there's an existing BATCH in queue, replace with newer count
    const existingBatchIndex = alertQueue.findIndex((i) => i.type === 'BATCH');
    if (existingBatchIndex >= 0) {
      alertQueue[existingBatchIndex] = item;
    } else {
      // Prioritize batch alert: clear pending single alerts so cashier isn't spammed with N announcements
      alertQueue.length = 0;
      alertQueue.push(item);
    }
  } else {
    // Single alert: cap queue length to 5 to prevent infinite backlog
    if (alertQueue.length < 5) {
      alertQueue.push(item);
    }
  }

  if (!isQueueRunning) {
    processNextAlert();
  }
}

/**
 * Triggers full new order audio alert (Chime + Spoken Voice) via the sequential queue.
 */
export function triggerNewOrderAlert(order: {
  order_number: string;
  customer_name?: string;
  customer_phone?: string;
  payment_method?: string;
  total_amount?: number;
  is_paid?: boolean;
}): void {
  queueAudioAlert({
    type: 'SINGLE',
    order,
  });
}

/**
 * Triggers consolidated batch order alert (Single Chime + Batch Spoken Voice).
 */
export function triggerBatchOrderAlert(count: number): void {
  queueAudioAlert({
    type: 'BATCH',
    count,
  });
}

/**
 * Triggers payment proof audio alert (Chime + Spoken Voice announcement) via the sequential queue.
 */
export function triggerPaymentProofAlert(order: {
  order_number: string;
  customer_name?: string;
  total_amount?: number;
}): void {
  queueAudioAlert({
    type: 'PROOF',
    order,
  });
}

/**
 * Clears any pending queued alerts and cancels speech synthesis.
 */
export function clearAudioQueue(): void {
  alertQueue.length = 0;
  if (queueTimeoutId) {
    clearTimeout(queueTimeoutId);
    queueTimeoutId = null;
  }
  isQueueRunning = false;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}
