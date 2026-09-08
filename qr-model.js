/* QR payloads are generated locally. Shared with the browser verification suite. */
((root, factory) => {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.ZpropQr = model;
})(typeof window === 'object' ? window : globalThis, () => {
  'use strict';
  const fail = (field, key) => { throw Object.assign(new Error(key), { field, key }); };
  const clean = value => String(value ?? '').trim();
  const escapeText = value => clean(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  const fold = lines => lines.map(line => {
    let result = '', bytes = 0;
    for (const char of line) {
      const size = new TextEncoder().encode(char).length;
      if (bytes + size > 75) { result += '\r\n '; bytes = 1; }
      result += char; bytes += size;
    }
    return result;
  }).join('\r\n') + '\r\n';
  function url(value, field) {
    const text = clean(value);
    try {
      const parsed = new URL(text);
      if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password || /[\r\n]/.test(text)) throw new Error();
      return parsed.href;
    } catch { fail(field, 'invalidUrl'); }
  }
  function required(data, field) {
    const value = clean(data[field]);
    if (!value) fail(field, 'required');
    return value;
  }
  function localDate(value, field, timeZone) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) fail(field, 'invalidDate');
    const parts = value.split(/[-T:]/).map(Number);
    if (timeZone) {
      const target=Date.UTC(parts[0],parts[1]-1,parts[2],parts[3],parts[4]);
      const formatter=new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
      const wallTime=instant=>{
        const p=Object.fromEntries(formatter.formatToParts(new Date(instant)).map(part=>[part.type,part.value]));
        return {text:`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`,instant:Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute)};
      };
      let instant=target;
      for(let i=0;i<4;i++) {const wall=wallTime(instant);if(wall.text===value)return new Date(instant);instant+=target-wall.instant;}
      fail(field,'invalidDate');
    }
    const date = new Date(value);
    if (!Number.isFinite(+date) || date.getFullYear() !== parts[0] || date.getMonth() + 1 !== parts[1] || date.getDate() !== parts[2] || date.getHours() !== parts[3] || date.getMinutes() !== parts[4]) fail(field, 'invalidDate');
    return date;
  }
  const utc = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  function payload(type, data, event = {}) {
    switch (type) {
      case 'url': return url(required(data, 'url'), 'url');
      case 'whatsapp': {
        const raw = required(data, 'phone');
        const phone = raw.replace(/[\s()+-]/g, '');
        if (!/^\+?[\d\s()-]+$/.test(raw) || !/^[1-9]\d{6,14}$/.test(phone)) fail('phone', 'invalidPhone');
        return 'https://wa.me/' + phone + (clean(data.message) ? '?text=' + encodeURIComponent(clean(data.message)) : '');
      }
      case 'location': {
        const lat = Number(required(data, 'latitude')), lng = Number(required(data, 'longitude'));
        if (!Number.isFinite(lat) || Math.abs(lat) > 90) fail('latitude', 'invalidCoordinates');
        if (!Number.isFinite(lng) || Math.abs(lng) > 180) fail('longitude', 'invalidCoordinates');
        return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${lat},${lng}`);
      }
      case 'event': {
        const title = required(data, 'eventTitle');
        const start = localDate(required(data, 'start'), 'start', event.timeZone), end = localDate(required(data, 'end'), 'end', event.timeZone);
        if (end <= start) fail('end', 'invalidEnd');
        return fold(['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ZPROP//QR Codes//EN', 'BEGIN:VEVENT',
          'UID:' + escapeText(event.uid || crypto.randomUUID() + '@zprop.tech'), 'DTSTAMP:' + utc(event.created || new Date()),
          'DTSTART:' + utc(start), 'DTEND:' + utc(end), 'SUMMARY:' + escapeText(title),
          ...(clean(data.eventLocation) ? ['LOCATION:' + escapeText(data.eventLocation)] : []),
          ...(clean(data.description) ? ['DESCRIPTION:' + escapeText(data.description)] : []), 'END:VEVENT', 'END:VCALENDAR']);
      }
      case 'vcard': {
        const first = required(data, 'firstName'), last = clean(data.lastName);
        const email = clean(data.email);
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('email', 'invalidEmail');
        return fold(['BEGIN:VCARD', 'VERSION:3.0', 'N:' + escapeText(last) + ';' + escapeText(first) + ';;;',
          'FN:' + escapeText([first, last].filter(Boolean).join(' ')),
          ...(clean(data.company) ? ['ORG:' + escapeText(data.company)] : []),
          ...(clean(data.jobTitle) ? ['TITLE:' + escapeText(data.jobTitle)] : []),
          ...(clean(data.contactPhone) ? ['TEL;TYPE=CELL:' + escapeText(data.contactPhone)] : []),
          ...(email ? ['EMAIL;TYPE=INTERNET:' + escapeText(email)] : []),
          ...(clean(data.website) ? ['URL:' + url(data.website, 'website')] : []),
          ...(clean(data.address) ? ['ADR;TYPE=WORK:;;' + escapeText(data.address) + ';;;;'] : []), 'END:VCARD']);
      }
      default: throw new Error('Unknown QR type');
    }
  }
  function colors(foreground, background) {
    const luminance = color => {
      if (!/^#[\da-f]{6}$/i.test(color)) fail('foreground', 'invalidColors');
      const channels = color.slice(1).match(/../g).map(hex => {
        const value = parseInt(hex, 16) / 255;
        return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
      });
      return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    };
    const dark = luminance(foreground), light = luminance(background);
    if (dark >= light || (light + .05) / (dark + .05) < 4.5) fail('foreground', 'invalidColors');
  }
  return { payload, colors };
});
