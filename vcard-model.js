(() => {
  const fields={name:100,company:100,phone:30,email:254};
  function validate(value) {
    if(!value || typeof value!=='object')throw new Error('request');
    const state={};
    for(const [key,max] of Object.entries(fields)) {
      if(typeof value[key]!=='string'||!value[key].trim()||value[key].length>max)throw new Error('request');
      state[key]=value[key].trim();
    }
    if(!/^[+0-9() .-]{5,30}$/.test(state.phone)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email))throw new Error('request');
    return state;
  }
  function format(state) {
    const escape=value=>String(value).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
    const text=`BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${escape(state.name)}\r\nN:;${escape(state.name)};;;\r\nORG:${escape(state.company)}\r\nTEL;TYPE=CELL:${escape(state.phone)}\r\nEMAIL:${escape(state.email)}\r\nEND:VCARD\r\n`;
    return text.split('\r\n').map(line=>{let result='',bytes=0;for(const ch of line){const size=new TextEncoder().encode(ch).length;if(bytes+size>75){result+='\r\n ';bytes=1;}result+=ch;bytes+=size;}return result;}).join('\r\n');
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={validate,format};
  else window.ZpropVcard={validate,format};
})();
